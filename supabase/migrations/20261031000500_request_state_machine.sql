-- SPEC_DB_CHANGES.md §3.3 (block actions), §3.4, §3.5, §3.2 (profile-delete trigger).
--
-- squad_requests becomes unreachable to clients. Every read and write goes through
-- SECURITY DEFINER functions that never return the other party's user id before
-- acceptance. UI WIRING MUST SHIP WITH THIS MIGRATION: direct select/insert/update/
-- delete on squad_requests (and the my_*_squad_requests views) stop working here, and
-- accept_squad_request changes signature.

-- ---------------------------------------------------------------------------
-- 1. Remove the old client surface
-- ---------------------------------------------------------------------------
drop view public.my_inbound_squad_requests;
drop view public.my_outbound_squad_requests;

drop policy squad_requests_select on public.squad_requests;
drop policy squad_requests_insert on public.squad_requests;
drop policy squad_requests_update_recipient on public.squad_requests;
drop policy squad_requests_delete_sender on public.squad_requests;

-- The chat policies below subquery squad_requests; with that table locked they must
-- call a definer helper instead (spec §0 rule 4), so they are rewritten in this migration.
drop policy ally_chats_select on public.ally_chats;
drop policy ally_chats_update on public.ally_chats;
drop policy chat_messages_select on public.chat_messages;
drop policy chat_messages_insert on public.chat_messages;

drop function public.accept_squad_request(uuid, numeric);

-- ---------------------------------------------------------------------------
-- 2. Statuses: pending | accepted | declined | withdrawn | ended   (no 'blocked')
-- ---------------------------------------------------------------------------
alter table public.squad_requests alter column status drop default;
alter type public.request_status rename to request_status_old;
create type public.request_status as enum ('pending', 'accepted', 'declined', 'withdrawn', 'ended');
alter table public.squad_requests
  alter column status type public.request_status
  using (case when status::text = 'blocked' then 'declined' else status::text end)::public.request_status;
alter table public.squad_requests alter column status set default 'pending';
drop type public.request_status_old;

-- declined_at starts the 1-hour re-request cooldown (also set by remove_ally, and
-- future-dated by the shadow-decline). last_sent_at drives the 14-day expiry.
alter table public.squad_requests
  add column declined_at timestamptz,
  add column last_sent_at timestamptz not null default now();

update public.squad_requests set declined_at = updated_at where status = 'declined';
update public.squad_requests set last_sent_at = created_at;

-- Two simultaneous opposite-direction sends must not both succeed.
update public.squad_requests sr
   set status = 'withdrawn'
 where sr.status = 'pending'
   and exists (
     select 1 from public.squad_requests o
      where o.id <> sr.id
        and o.game_id = sr.game_id
        and least(o.sender_id, o.recipient_id) = least(sr.sender_id, sr.recipient_id)
        and greatest(o.sender_id, o.recipient_id) = greatest(sr.sender_id, sr.recipient_id)
        and (o.status = 'accepted'
             or (o.status = 'pending' and (o.created_at, o.id) > (sr.created_at, sr.id)))
   );

create unique index squad_requests_active_pair_idx
  on public.squad_requests (least(sender_id, recipient_id), greatest(sender_id, recipient_id), game_id)
  where status in ('pending', 'accepted');

-- Log of every send and every re-open; the rate limits count from here.
create table public.squad_request_events (
  id bigint generated always as identity primary key,
  request_id uuid references public.squad_requests (id) on delete set null,
  sender_id uuid not null references public.users (id) on delete cascade,
  recipient_id uuid not null references public.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  sent_at timestamptz not null default now()
);
create index squad_request_events_sender_idx on public.squad_request_events (sender_id, sent_at desc);
create index squad_request_events_pair_idx
  on public.squad_request_events (sender_id, recipient_id, game_id, sent_at desc);

alter table public.squad_request_events enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Lock the tables
-- ---------------------------------------------------------------------------
revoke all on public.squad_requests, public.squad_request_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Constants and guards
-- ---------------------------------------------------------------------------
create function public.request_expiry()
returns interval language sql immutable set search_path = ''
as $$ select interval '14 days' $$;

create function public.decline_cooldown()
returns interval language sql immutable set search_path = ''
as $$ select interval '1 hour' $$;

-- Second layer behind the RPCs (clients have no DML any more).
create or replace function public.guard_squad_request_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sender_id <> old.sender_id
     or new.recipient_id <> old.recipient_id
     or new.game_id <> old.game_id then
    raise exception 'sender_id, recipient_id, and game_id cannot be changed on a squad request';
  end if;

  if new.status is distinct from old.status and not (
       (old.status = 'pending' and new.status in ('accepted', 'declined', 'withdrawn'))
    or (old.status = 'accepted' and new.status = 'ended')
    or (old.status in ('declined', 'withdrawn', 'ended') and new.status = 'pending')       -- re-open
    or (old.status in ('withdrawn', 'ended') and new.status = 'declined')                   -- shadow-decline
  ) then
    raise exception 'invalid squad request status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;

-- A blocked pair may only ever get a (shadow-)declined row. Generic text: it must not
-- say "block".
create or replace function public.guard_squad_request_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'declined' and public.is_blocked(new.sender_id, new.recipient_id) then
    raise exception 'This player is no longer available';
  end if;
  return new;
end;
$$;

revoke all on function public.request_expiry() from public, anon, authenticated;
revoke all on function public.decline_cooldown() from public, anon, authenticated;
revoke all on function public.guard_squad_request_immutable() from public, anon, authenticated;
revoke all on function public.guard_squad_request_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Eligibility shared by send_squad_request and find_squad_matches (block excluded:
--    callers decide what a block means for them)
-- ---------------------------------------------------------------------------
create function public.can_contact(p_me uuid, p_them uuid, p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1 from public.allies a
       where a.user_id = p_me and a.ally_user_id = p_them and a.game_id = p_game_id)
    and not exists (
      select 1 from public.squad_requests sr
       where sr.game_id = p_game_id
         and ((sr.sender_id = p_me and sr.recipient_id = p_them)
           or (sr.sender_id = p_them and sr.recipient_id = p_me))
         and (sr.status = 'accepted'
              or (sr.status = 'pending' and sr.last_sent_at > now() - public.request_expiry())))
    and not exists (
      select 1 from public.squad_requests sr
       where sr.game_id = p_game_id
         and sr.sender_id = p_me and sr.recipient_id = p_them
         and sr.status in ('declined', 'ended')
         and sr.declined_at > now() - public.decline_cooldown())
$$;

revoke all on function public.can_contact(uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Block actions (spec §3.3)
-- ---------------------------------------------------------------------------
-- Internal. Idempotent. Resolves the pair's pending requests so none lingers:
-- those the blocker RECEIVED read as declined (what a plain decline produces),
-- those the blocker SENT are withdrawn.
create function public.apply_block(p_blocker uuid, p_blocked uuid, p_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_blocks (blocker_id, blocked_id, label)
  values (p_blocker, p_blocked, p_label)
  on conflict (blocker_id, blocked_id) do nothing;

  update public.squad_requests
     set status = 'declined', declined_at = now()
   where recipient_id = p_blocker and sender_id = p_blocked and status = 'pending';

  update public.squad_requests
     set status = 'withdrawn'
   where sender_id = p_blocker and recipient_id = p_blocked and status = 'pending';
end;
$$;

create function public.block_ally(p_ally_id uuid)
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
  perform public.apply_block(a.user_id, a.ally_user_id, a.ally_gaming_user_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Recipient actions
-- ---------------------------------------------------------------------------
create function public.accept_squad_request(p_request_id uuid)
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

  insert into public.ally_chats (squad_request_id)
  values (req.id)
  on conflict (squad_request_id) do nothing;
end;
$$;

create function public.decline_squad_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.squad_requests%rowtype;
begin
  select * into req from public.squad_requests
   where id = p_request_id and recipient_id = (select auth.uid()) and status = 'pending'
   for update;
  if not found then
    raise exception 'squad request not found';
  end if;

  update public.squad_requests set status = 'declined', declined_at = now() where id = req.id;
end;
$$;

create function public.decline_and_block_squad_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.squad_requests%rowtype;
  v_label text;
begin
  select * into req from public.squad_requests
   where id = p_request_id and recipient_id = (select auth.uid()) and status = 'pending'
   for update;
  if not found then
    raise exception 'squad request not found';
  end if;

  select gp.in_game_username into v_label
    from public.game_profiles gp
   where gp.user_id = req.sender_id and gp.game_id = public.base_game_id(req.game_id);

  update public.squad_requests set status = 'declined', declined_at = now() where id = req.id;
  perform public.apply_block(req.recipient_id, req.sender_id, v_label);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Sender actions
-- ---------------------------------------------------------------------------
-- Never deletes: deleting would reset the per-pair counters and allow
-- send -> withdraw -> send loops that re-notify the recipient each time.
create function public.withdraw_squad_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.squad_requests%rowtype;
begin
  select * into req from public.squad_requests
   where id = p_request_id and sender_id = (select auth.uid()) and status = 'pending'
   for update;
  if not found then
    raise exception 'squad request not found';
  end if;

  update public.squad_requests set status = 'withdrawn' where id = req.id;
end;
$$;

-- The ONLY way to create a request. See spec §3.4 for the rules; in particular every
-- "can't" below returns the same generic error, and a blocked pair is shadow-declined
-- instead of rejected so that replaying a match_ref is not a block oracle (D7).
create function public.send_squad_request(p_game_id uuid, p_match_ref uuid)
returns table (request_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := (select auth.uid());
  v_unavailable constant text := 'This player is no longer available';
  v_base uuid;
  v_cand uuid;
  v_blocked boolean;
  v_exists boolean;
  existing public.squad_requests%rowtype;
  v_id uuid;
  v_shadow_at timestamptz;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Serialise this sender so the caps below cannot be raced (spec §0 rule 8).
  perform pg_advisory_xact_lock(hashtextextended('send_squad_request:' || uid::text, 0));

  if not exists (select 1 from public.games g where g.id = p_game_id and g.is_selectable) then
    raise exception '%', v_unavailable;
  end if;
  v_base := public.base_game_id(p_game_id);

  if not exists (select 1 from public.game_profiles where user_id = uid and game_id = v_base) then
    raise exception 'Complete your profile for this game first';
  end if;

  -- match_ref is the candidate's game_profiles.id for the BASE game.
  select gp.user_id into v_cand from public.game_profiles gp
   where gp.id = p_match_ref and gp.game_id = v_base;
  if v_cand is null or v_cand = uid then
    raise exception '%', v_unavailable;
  end if;

  if public.presence_status(v_cand, p_game_id) = 'offline' then
    raise exception '%', v_unavailable;
  end if;

  -- allies / active request either way / decline cooldown. Block is deliberately NOT
  -- in here: it is handled below so the visible outcome is identical.
  if not public.can_contact(uid, v_cand, p_game_id) then
    raise exception '%', v_unavailable;
  end if;

  v_blocked := public.is_blocked(uid, v_cand);

  -- Abuse limits (D9). They depend only on the caller's own activity.
  if (select count(*) from public.squad_requests sr
       where sr.sender_id = uid and sr.status = 'pending'
         and sr.last_sent_at > now() - public.request_expiry()) >= 20 then
    raise exception 'You have too many pending requests. Withdraw some or wait for replies.';
  end if;
  if (select count(*) from public.squad_request_events e
       where e.sender_id = uid and e.sent_at > now() - interval '24 hours') >= 50 then
    raise exception 'Daily request limit reached. Try again tomorrow.';
  end if;
  if (select count(*) from public.squad_request_events e
       where e.sender_id = uid and e.recipient_id = v_cand and e.game_id = p_game_id
         and e.sent_at > now() - interval '30 days') >= 4 then
    raise exception 'You have contacted this player too many times recently.';
  end if;

  select * into existing from public.squad_requests sr
   where sr.sender_id = uid and sr.recipient_id = v_cand and sr.game_id = p_game_id
   for update;
  v_exists := found;

  begin
    if v_blocked then
      -- Looks like a send that the recipient declines a little later: the outbound
      -- function shows it as 'pending' until declined_at passes. No notification, no card.
      v_shadow_at := now() + (1 + floor(random() * 29)) * interval '1 minute';
      if v_exists then
        update public.squad_requests sr
           set status = 'declined', declined_at = v_shadow_at, last_sent_at = now()
         where sr.id = existing.id;
        v_id := existing.id;
      else
        insert into public.squad_requests (game_id, sender_id, recipient_id, status, declined_at, last_sent_at)
        values (p_game_id, uid, v_cand, 'declined', v_shadow_at, now())
        returning id into v_id;
      end if;
    else
      if v_exists then
        update public.squad_requests sr
           set status = 'pending', declined_at = null, last_sent_at = now()
         where sr.id = existing.id;
        v_id := existing.id;
      else
        insert into public.squad_requests (game_id, sender_id, recipient_id, status, last_sent_at)
        values (p_game_id, uid, v_cand, 'pending', now())
        returning id into v_id;
      end if;
    end if;
  exception when unique_violation then
    raise exception '%', v_unavailable;
  end;

  insert into public.squad_request_events (request_id, sender_id, recipient_id, game_id)
  values (v_id, uid, v_cand, p_game_id);

  return query select v_id, 'pending'::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Read functions (never return the other party's user id)
-- ---------------------------------------------------------------------------
create function public.get_my_pending_request_cards()
returns table (
  request_id uuid, created_at timestamptz,
  game_id uuid, game_slug text, game_name text, category public.game_category,
  sender_username text,
  weapons text[], maps text[], roles text[], skill numeric, role_match_preference numeric,
  rage numeric, personality text[], willing_to_chat boolean, willing_to_speak boolean, languages text[],
  sender_status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select sr.id, sr.last_sent_at,
         g.id, g.slug, g.name, g.category,
         gp.in_game_username,
         gp.weapons, gp.maps, gp.roles, gp.skill, gp.role_match_preference,
         gp.rage, gp.personality, gp.willing_to_chat, gp.willing_to_speak, gp.languages,
         public.presence_status(sr.sender_id, sr.game_id)
    from public.squad_requests sr
    join public.games g on g.id = sr.game_id
    join public.game_profiles gp
      on gp.user_id = sr.sender_id and gp.game_id = public.base_game_id(sr.game_id)
   where sr.recipient_id = (select auth.uid())
     and sr.status = 'pending'
     and sr.last_sent_at > now() - public.request_expiry()
     and not public.is_blocked(sr.sender_id, sr.recipient_id)
   order by sr.last_sent_at desc
$$;

create function public.count_my_pending_requests()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.get_my_pending_request_cards()
$$;

create function public.get_my_outbound_requests()
returns table (
  request_id uuid, game_id uuid, game_slug text, status text,
  created_at timestamptz, match_ref uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select sr.id, sr.game_id, g.slug,
         case
           when sr.status = 'pending' and sr.last_sent_at <= now() - public.request_expiry() then 'expired'
           -- a shadow-decline stays 'pending' until its (future) declined_at passes
           when sr.status = 'declined' and sr.declined_at > now() then 'pending'
           else sr.status::text
         end,
         sr.created_at,
         rp.id
    from public.squad_requests sr
    join public.games g on g.id = sr.game_id
    left join public.game_profiles rp
      on rp.user_id = sr.recipient_id and rp.game_id = public.base_game_id(sr.game_id)
   where sr.sender_id = (select auth.uid())
     and sr.status in ('pending', 'accepted', 'declined')
   order by sr.created_at desc
$$;

-- ---------------------------------------------------------------------------
-- 10. Profile deletion cancels that user's pending outbound requests (no ghost requests)
-- ---------------------------------------------------------------------------
create function public.cancel_requests_on_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.squad_requests
     set status = 'withdrawn'
   where sender_id = old.user_id
     and status = 'pending'
     and public.base_game_id(game_id) = old.game_id;
  return old;
end;
$$;

create trigger cancel_requests_on_profile_delete
  after delete on public.game_profiles
  for each row execute function public.cancel_requests_on_profile_delete();

-- ---------------------------------------------------------------------------
-- 11. Chat access without touching squad_requests (spec §0 rule 4, §3.11)
-- ---------------------------------------------------------------------------
-- Uses auth.uid() as the reader so it can only answer for the caller.
create function public.is_chat_participant(p_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.ally_chats ac
      join public.squad_requests sr on sr.id = ac.squad_request_id
     where ac.id = p_chat_id
       and sr.status = 'accepted'
       and (select auth.uid()) in (sr.sender_id, sr.recipient_id)
  )
$$;

create policy ally_chats_select on public.ally_chats
  for select to authenticated
  using (public.is_chat_participant(id));

create policy ally_chats_update on public.ally_chats
  for update to authenticated
  using (public.is_chat_participant(id))
  with check (public.is_chat_participant(id));

create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (public.is_chat_participant(ally_chat_id));

create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_chat_participant(ally_chat_id));

-- ---------------------------------------------------------------------------
-- 12. Privileges
-- ---------------------------------------------------------------------------
revoke all on function public.apply_block(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_requests_on_profile_delete() from public, anon, authenticated;

revoke all on function public.block_ally(uuid) from public, anon, authenticated;
revoke all on function public.accept_squad_request(uuid) from public, anon, authenticated;
revoke all on function public.decline_squad_request(uuid) from public, anon, authenticated;
revoke all on function public.decline_and_block_squad_request(uuid) from public, anon, authenticated;
revoke all on function public.withdraw_squad_request(uuid) from public, anon, authenticated;
revoke all on function public.send_squad_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_my_pending_request_cards() from public, anon, authenticated;
revoke all on function public.count_my_pending_requests() from public, anon, authenticated;
revoke all on function public.get_my_outbound_requests() from public, anon, authenticated;
revoke all on function public.is_chat_participant(uuid) from public, anon, authenticated;

grant execute on function public.block_ally(uuid) to authenticated;
grant execute on function public.accept_squad_request(uuid) to authenticated;
grant execute on function public.decline_squad_request(uuid) to authenticated;
grant execute on function public.decline_and_block_squad_request(uuid) to authenticated;
grant execute on function public.withdraw_squad_request(uuid) to authenticated;
grant execute on function public.send_squad_request(uuid, uuid) to authenticated;
grant execute on function public.get_my_pending_request_cards() to authenticated;
grant execute on function public.count_my_pending_requests() to authenticated;
grant execute on function public.get_my_outbound_requests() to authenticated;
grant execute on function public.is_chat_participant(uuid) to authenticated;
