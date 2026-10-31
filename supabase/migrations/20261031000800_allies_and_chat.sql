-- SPEC_DB_CHANGES.md §3.10, §3.11, D8, D10.

-- ---------------------------------------------------------------------------
-- Allies
-- ---------------------------------------------------------------------------
-- allies_delete_own cleared only the caller's own row: the other side kept a live ally
-- row (profile + chat access) and the request stayed 'accepted' forever. Removal goes
-- through remove_ally() instead.
drop policy allies_delete_own on public.allies;
revoke delete on public.allies from authenticated;

create function public.get_my_allies()
returns table (
  ally_id uuid, ally_user_id uuid, game_id uuid, game_slug text,
  ally_gaming_user_id text, match_score_at_acceptance numeric,
  rating public.ally_rating, created_at timestamptz,
  status text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.ally_user_id, a.game_id, g.slug,
         a.ally_gaming_user_id, a.match_score_at_acceptance,
         a.rating, a.created_at,
         -- A block in either direction reads as plain 'offline' (D8).
         case when public.is_blocked(a.user_id, a.ally_user_id) then 'offline'
              else public.presence_status(a.ally_user_id, a.game_id) end
    from public.allies a
    join public.games g on g.id = a.game_id
   where a.user_id = (select auth.uid())
   order by a.created_at desc
$$;

-- D10: removing an ally ends the relationship for BOTH sides.
create function public.remove_ally(p_ally_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.allies%rowtype;
begin
  select * into a from public.allies
   where id = p_ally_id and user_id = (select auth.uid());
  if not found then
    raise exception 'ally not found';
  end if;

  if a.squad_request_id is not null then
    delete from public.allies where squad_request_id = a.squad_request_id;
    delete from public.ally_chats where squad_request_id = a.squad_request_id;   -- cascades messages
    update public.squad_requests
       set status = 'ended', declined_at = now()        -- starts the re-request cooldown
     where id = a.squad_request_id and status = 'accepted';
  else
    -- request row was deleted (allies.squad_request_id is on delete set null)
    delete from public.allies
     where game_id = a.game_id
       and ((user_id = a.user_id and ally_user_id = a.ally_user_id)
         or (user_id = a.ally_user_id and ally_user_id = a.user_id));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------
-- Only disappearing_messages may change on a chat.
create function public.guard_ally_chats_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
     or new.squad_request_id <> old.squad_request_id
     or new.created_at <> old.created_at then
    raise exception 'only disappearing_messages can be changed on a chat';
  end if;
  return new;
end;
$$;

create trigger guard_ally_chats_update
  before update on public.ally_chats
  for each row execute function public.guard_ally_chats_update();

-- Server decides expires_at (and sent_at), and rate-limits senders.
-- Replaces guard_chat_message_insert, which errored on a block and so revealed it.
drop trigger guard_chat_message_insert on public.chat_messages;
drop function public.guard_chat_message_insert();

create function public.before_chat_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_disappearing boolean;
begin
  perform public.consume_rate_limit(new.sender_id, 'chat_send', 30, interval '1 minute');

  select ac.disappearing_messages into v_disappearing
    from public.ally_chats ac where ac.id = new.ally_chat_id;

  new.sent_at := now();
  new.expires_at := case when coalesce(v_disappearing, false) then now() + interval '24 hours' else null end;
  return new;
end;
$$;

create trigger before_chat_message_insert
  before insert on public.chat_messages
  for each row execute function public.before_chat_message_insert();

alter table public.chat_messages
  add constraint chat_messages_content_len check (char_length(content) between 1 and 2000) not valid;

-- D8 shadow delivery. A message is hidden from reader R when R has blocked its sender
-- (directional has_blocked). The blocked player's own view of the thread is unchanged,
-- and their sends succeed, so nothing they can see reveals the block.
-- The wrapper uses auth.uid() as the reader so clients can only ask about themselves.
create function public.chat_message_visible(p_sender_id uuid, p_expires_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (p_expires_at is null or p_expires_at > now())
     and not public.has_blocked((select auth.uid()), p_sender_id)
$$;

drop policy chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (public.is_chat_participant(ally_chat_id)
         and public.chat_message_visible(sender_id, expires_at));

-- Housekeeping only: reads already filter on expires_at. Schedule with pg_cron or a cron route.
create function public.purge_expired_chat_messages()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n bigint;
begin
  delete from public.chat_messages where expires_at is not null and expires_at <= now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on function public.get_my_allies() from public, anon, authenticated;
revoke all on function public.remove_ally(uuid) from public, anon, authenticated;
revoke all on function public.guard_ally_chats_update() from public, anon, authenticated;
revoke all on function public.before_chat_message_insert() from public, anon, authenticated;
revoke all on function public.chat_message_visible(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.purge_expired_chat_messages() from public, anon, authenticated;

grant execute on function public.get_my_allies() to authenticated;
grant execute on function public.remove_ally(uuid) to authenticated;
grant execute on function public.chat_message_visible(uuid, timestamptz) to authenticated;
