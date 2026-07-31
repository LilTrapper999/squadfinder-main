-- Functions and triggers: business rules that must hold no matter what the
-- client sends, not just what the UI happens to allow.

-- Generic updated_at bump, reused across tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.games
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.game_reference_data
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.game_profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.squad_requests
  for each row execute function public.set_updated_at();

-- Auto-create the public.users row whenever someone signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- game_reference_data must always attach to a *base* game (base_game_id is null),
-- so version-tiles look it up via coalesce(base_game_id, id) rather than duplicating rows.
create or replace function public.enforce_reference_data_on_base_game()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.games
    where id = new.game_id and base_game_id is not null
  ) then
    raise exception 'game_reference_data.game_id must reference a base game (base_game_id is null), not a version-tile';
  end if;
  return new;
end;
$$;

create trigger enforce_reference_data_on_base_game
  before insert or update on public.game_reference_data
  for each row execute function public.enforce_reference_data_on_base_game();

-- Account-wide block check: true if either user has blocked the other, in ANY game,
-- via a declined-and-blocked squad request or a blocked ally rating. This is the single
-- source of truth both squad_requests and allies check against — no separate blocked_users table.
create or replace function public.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.squad_requests
    where status = 'blocked'
      and ((sender_id = user_a and recipient_id = user_b)
        or (sender_id = user_b and recipient_id = user_a))
  )
  or exists (
    select 1 from public.allies
    where rating = 'blocked'
      and ((user_id = user_a and ally_user_id = user_b)
        or (user_id = user_b and ally_user_id = user_a))
  );
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- Refuse a new squad request if either party has blocked the other, anywhere.
create or replace function public.guard_squad_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_blocked(new.sender_id, new.recipient_id) then
    raise exception 'cannot send squad request: sender and recipient have a block between them';
  end if;
  return new;
end;
$$;

create trigger guard_squad_request_insert
  before insert on public.squad_requests
  for each row execute function public.guard_squad_request_insert();

-- sender_id / recipient_id / game_id are immutable once a request exists.
-- Only status may change (recipient accepts/declines/blocks, or unblocks later).
create or replace function public.guard_squad_request_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.sender_id <> old.sender_id
     or new.recipient_id <> old.recipient_id
     or new.game_id <> old.game_id then
    raise exception 'sender_id, recipient_id, and game_id cannot be changed on a squad request';
  end if;
  return new;
end;
$$;

create trigger guard_squad_request_immutable
  before update on public.squad_requests
  for each row execute function public.guard_squad_request_immutable();

-- Only rating may change on an ally row once created.
create or replace function public.guard_allies_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id
     or new.ally_user_id <> old.ally_user_id
     or new.game_id <> old.game_id
     or new.ally_gaming_user_id <> old.ally_gaming_user_id
     or new.match_score_at_acceptance is distinct from old.match_score_at_acceptance
     or new.squad_request_id is distinct from old.squad_request_id then
    raise exception 'only rating can be updated on an ally row';
  end if;
  return new;
end;
$$;

create trigger guard_allies_immutable
  before update on public.allies
  for each row execute function public.guard_allies_immutable();

-- Accept a squad request: only callable by the recipient, only from 'pending'.
-- Atomically flips status, snapshots each side's gaming username + the match score
-- into two allies rows (one per perspective), and opens the chat thread.
-- match_score is computed client-side (lib/matching.ts) and passed in — this function's
-- job is to enforce WHO can accept and WHAT gets persisted, not to recompute the score.
create or replace function public.accept_squad_request(p_request_id uuid, p_match_score numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.squad_requests%rowtype;
  sender_username text;
  recipient_username text;
begin
  select * into req from public.squad_requests where id = p_request_id for update;

  if not found then
    raise exception 'squad request not found';
  end if;

  if req.recipient_id <> auth.uid() then
    raise exception 'only the recipient can accept a squad request';
  end if;

  if req.status <> 'pending' then
    raise exception 'squad request is not pending';
  end if;

  update public.squad_requests
    set status = 'accepted', updated_at = now()
    where id = p_request_id;

  select in_game_username into sender_username
    from public.game_profiles where user_id = req.sender_id and game_id = req.game_id;
  select in_game_username into recipient_username
    from public.game_profiles where user_id = req.recipient_id and game_id = req.game_id;

  insert into public.allies (squad_request_id, user_id, ally_user_id, game_id, ally_gaming_user_id, match_score_at_acceptance)
  values
    (req.id, req.sender_id, req.recipient_id, req.game_id, recipient_username, p_match_score),
    (req.id, req.recipient_id, req.sender_id, req.game_id, sender_username, p_match_score)
  on conflict (user_id, ally_user_id, game_id) do nothing;

  insert into public.ally_chats (squad_request_id)
  values (req.id)
  on conflict (squad_request_id) do nothing;
end;
$$;

grant execute on function public.accept_squad_request(uuid, numeric) to authenticated;

-- Refuse a new chat message if the two participants have a block between them
-- (e.g. they were allies, then one side blocked the other after the fact).
create or replace function public.guard_chat_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.squad_requests%rowtype;
begin
  select sr.* into req
    from public.squad_requests sr
    join public.ally_chats ac on ac.squad_request_id = sr.id
    where ac.id = new.ally_chat_id;

  if public.is_blocked(req.sender_id, req.recipient_id) then
    raise exception 'cannot send message: sender and recipient have a block between them';
  end if;

  return new;
end;
$$;

create trigger guard_chat_message_insert
  before insert on public.chat_messages
  for each row execute function public.guard_chat_message_insert();
