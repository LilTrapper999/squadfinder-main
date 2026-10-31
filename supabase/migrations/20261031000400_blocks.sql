-- SPEC_DB_CHANGES.md §3.3 (and D2): blocks live in their own table, which the
-- blocked party can never reach. The block ACTIONS (decline_and_block_squad_request,
-- block_ally, the pending-request cleanup) need declined_at and the new request
-- statuses, so they ship with 20261031000500_request_state_machine.sql.

create table public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users (id) on delete cascade,
  blocked_id uuid not null references public.users (id) on delete cascade,
  label text,                       -- snapshot of the blocked player's in-game name, for the blocker's own list
  created_at timestamptz not null default now(),
  constraint user_blocks_no_self check (blocker_id <> blocked_id),
  unique (blocker_id, blocked_id)
);

create index user_blocks_blocked_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon, authenticated;   -- definer RPCs only

-- ---------------------------------------------------------------------------
-- Carry over blocks recorded the old way (request status / ally rating).
-- ---------------------------------------------------------------------------
insert into public.user_blocks (blocker_id, blocked_id, label)
select sr.recipient_id, sr.sender_id,
       (select gp.in_game_username from public.game_profiles gp
         where gp.user_id = sr.sender_id and gp.game_id = public.base_game_id(sr.game_id))
  from public.squad_requests sr
 where sr.status = 'blocked'
on conflict (blocker_id, blocked_id) do nothing;

insert into public.user_blocks (blocker_id, blocked_id, label)
select a.user_id, a.ally_user_id, a.ally_gaming_user_id
  from public.allies a
 where a.rating = 'blocked'
on conflict (blocker_id, blocked_id) do nothing;

-- ally_rating loses 'blocked' (a block is a user_blocks row and nowhere else).
alter type public.ally_rating rename to ally_rating_old;
create type public.ally_rating as enum ('favorite', 'meh');
alter table public.allies
  alter column rating type public.ally_rating
  using (case when rating::text = 'blocked' then null else rating::text end)::public.ally_rating;
drop type public.ally_rating_old;

-- ---------------------------------------------------------------------------
-- is_blocked: symmetric, for ELIGIBILITY ("may these two contact each other?").
-- No client grant: it used to be an oracle for any pair of user ids.
-- ---------------------------------------------------------------------------
create or replace function public.is_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
     where (b.blocker_id = user_a and b.blocked_id = user_b)
        or (b.blocker_id = user_b and b.blocked_id = user_a)
  )
$$;

-- has_blocked: directional, for VISIBILITY ("does this reader see that sender?").
create function public.has_blocked(p_blocker uuid, p_blocked uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
     where b.blocker_id = p_blocker and b.blocked_id = p_blocked
  )
$$;

create function public.get_my_blocks()
returns table (block_id uuid, label text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.label, b.created_at
    from public.user_blocks b
   where b.blocker_id = (select auth.uid())
   order by b.created_at desc
$$;

create function public.unblock_user(p_block_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_blocks
   where id = p_block_id and blocker_id = (select auth.uid());
  if not found then
    raise exception 'block not found';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- §0 rule 2: no PUBLIC/anon EXECUTE; clients only where meant.
-- ---------------------------------------------------------------------------
revoke all on function public.is_blocked(uuid, uuid) from public, anon, authenticated;
revoke all on function public.has_blocked(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_my_blocks() from public, anon, authenticated;
revoke all on function public.unblock_user(uuid) from public, anon, authenticated;
grant execute on function public.get_my_blocks() to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

-- is_ally_for_profile (policy helper) calls is_blocked as its owner, not as the caller.

-- Pre-existing functions: trigger functions are checked for EXECUTE at CREATE TRIGGER
-- time only, so revoking is safe; accept_squad_request is replaced in the next migration.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_reference_data_on_base_game() from public, anon, authenticated;
revoke all on function public.guard_squad_request_insert() from public, anon, authenticated;
revoke all on function public.guard_squad_request_immutable() from public, anon, authenticated;
revoke all on function public.guard_allies_immutable() from public, anon, authenticated;
revoke all on function public.guard_chat_message_insert() from public, anon, authenticated;
revoke all on function public.accept_squad_request(uuid, numeric) from public, anon, authenticated;
