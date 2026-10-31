-- SPEC_DB_CHANGES.md §3.9: live updates without shipping squad_requests rows.
--
-- squad_requests is NOT added to the supabase_realtime publication (row payloads
-- would carry both user ids). Instead a trigger sends a minimal broadcast
--   { kind: 'request_received' | 'request_updated', request_id }
-- to a private per-user topic 'user:<uid>'. Clients re-call the read functions.

create index squad_requests_inbound_pending_idx
  on public.squad_requests (recipient_id, game_id) where status = 'pending';

create function public.broadcast_request_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_blocked boolean := public.is_blocked(new.sender_id, new.recipient_id);
begin
  begin
    -- Recipient: a new or re-sent pending request. Never for a blocked pair.
    if new.status = 'pending' and not v_blocked
       and (tg_op = 'INSERT'
            or old.status is distinct from 'pending'
            or old.last_sent_at is distinct from new.last_sent_at) then
      perform realtime.send(
        jsonb_build_object('kind', 'request_received', 'request_id', new.id),
        'request_received', 'user:' || new.recipient_id::text, true);
    end if;

    if tg_op = 'UPDATE' and old.status is distinct from new.status then
      -- Recipient: the sender took it back / the relationship ended.
      if new.status in ('withdrawn', 'ended') and not v_blocked then
        perform realtime.send(
          jsonb_build_object('kind', 'request_updated', 'request_id', new.id),
          'request_updated', 'user:' || new.recipient_id::text, true);
      end if;

      -- Sender: the outcome. A decline-and-block produces exactly the event a plain
      -- decline does. A shadow-decline (declined_at in the future) tells nobody.
      if new.status in ('accepted', 'declined', 'ended')
         and not (new.status = 'declined' and new.declined_at > now()) then
        perform realtime.send(
          jsonb_build_object('kind', 'request_updated', 'request_id', new.id),
          'request_updated', 'user:' || new.sender_id::text, true);
      end if;
    end if;
  exception when others then
    -- A Realtime failure must never roll back the request transaction.
    null;
  end;
  return new;
end;
$$;

revoke all on function public.broadcast_request_event() from public, anon, authenticated;

create trigger broadcast_request_event
  after insert or update on public.squad_requests
  for each row execute function public.broadcast_request_event();

-- Each user may RECEIVE on their own topic only; there is no insert policy, so a client
-- cannot broadcast to anyone's topic. (realtime.messages exists on Supabase projects.)
do $$
begin
  if to_regclass('realtime.messages') is not null then
    execute $p$
      create policy "users receive on own topic" on realtime.messages
        for select to authenticated
        using (realtime.topic() = 'user:' || (select auth.uid())::text)
    $p$;
  end if;
end
$$;
