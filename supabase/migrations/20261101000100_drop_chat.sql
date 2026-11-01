-- SPEC_LAUNCH_READINESS.md D-05: chat is removed from the product (decision r2).
--
-- !! THIS MIGRATION DROPS TABLES: public.chat_messages and public.ally_chats (and every message
-- !! in them). Apply it only after the app version that no longer references them is deployed,
-- !! and only with the owner's go-ahead.
--
-- After acceptance the ally's in-game username (get_my_allies) is the hand-off. Allies,
-- requests, blocks, presence and the user:<uid> request broadcasts are unchanged.

-- Dropping the tables also drops their policies, triggers and indexes.
drop table if exists public.chat_messages;
drop table if exists public.ally_chats;

drop function if exists public.purge_expired_chat_messages();
drop function if exists public.chat_message_visible(uuid, timestamptz);
drop function if exists public.before_chat_message_insert();
drop function if exists public.guard_ally_chats_update();
drop function if exists public.guard_chat_message_insert();
drop function if exists public.is_chat_participant(uuid);

-- accept_squad_request: identical to the previous definition minus the chat-thread insert.
create or replace function public.accept_squad_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  req public.squad_requests%rowtype;
  v_base uuid;
  sp public.game_profiles%rowtype;
  rp public.game_profiles%rowtype;
  v_score int;
begin
  select * into req from public.squad_requests
   where id = p_request_id and recipient_id = uid
   for update;
  if not found then
    raise exception 'squad request not found';
  end if;

  if req.status <> 'pending' or req.last_sent_at <= now() - public.request_expiry() then
    raise exception 'squad request is no longer available';
  end if;

  -- The recipient may have blocked the sender through another request since.
  if public.is_blocked(req.sender_id, req.recipient_id) then
    raise exception 'This player is no longer available';
  end if;

  v_base := public.base_game_id(req.game_id);

  select * into rp from public.game_profiles where user_id = req.recipient_id and game_id = v_base;
  if not found then
    raise exception 'Complete your profile for this game before accepting';
  end if;

  select * into sp from public.game_profiles where user_id = req.sender_id and game_id = v_base;
  if not found then
    raise exception 'This player is no longer available';
  end if;

  select m.overall into v_score from public.calculate_match(sp, rp) m;

  update public.squad_requests set status = 'accepted' where id = req.id;

  insert into public.allies (squad_request_id, user_id, ally_user_id, game_id, ally_gaming_user_id, match_score_at_acceptance)
  values
    (req.id, req.sender_id, req.recipient_id, req.game_id, rp.in_game_username, v_score),
    (req.id, req.recipient_id, req.sender_id, req.game_id, sp.in_game_username, v_score)
  on conflict (user_id, ally_user_id, game_id) do nothing;
end;
$$;

-- remove_ally: identical to the previous definition minus the ally_chats delete.
create or replace function public.remove_ally(p_ally_id uuid)
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
