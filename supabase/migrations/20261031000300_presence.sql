-- SPEC_DB_CHANGES.md §3.8 (and D6): presence.
--
-- user_presence: global "this account has SF open"           -> status 'online'
-- lfg_presence:  per VERSION tile, one at a time (D9)         -> status 'searching'
-- Both are RPC-only; every timestamp is the database's now(). Reads always filter
-- on freshness, so correctness never depends on a purge job.

create function public.presence_window()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '3 minutes' $$;

create table public.user_presence (
  user_id uuid primary key references public.users (id) on delete cascade,
  last_seen_at timestamptz not null default now()
) with (fillfactor = 70);

create table public.lfg_presence (
  user_id uuid primary key references public.users (id) on delete cascade,   -- one search at a time (D9)
  game_id uuid not null references public.games (id) on delete cascade,      -- the VERSION tile, not the base game
  last_seen_at timestamptz not null default now()
) with (fillfactor = 70);

create index user_presence_last_seen_idx on public.user_presence (last_seen_at);
create index lfg_presence_game_fresh_idx on public.lfg_presence (game_id, last_seen_at);

alter table public.user_presence enable row level security;
alter table public.lfg_presence enable row level security;
revoke all on public.user_presence, public.lfg_presence from anon, authenticated;

-- heartbeat(): bumps "online", and bumps "searching" ONLY while that row is still fresh,
-- so a tab reopened hours later cannot silently revive a stale search.
create function public.heartbeat()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_presence (user_id, last_seen_at)
  values (uid, now())
  on conflict (user_id) do update set last_seen_at = now();

  update public.lfg_presence
     set last_seen_at = now()
   where user_id = uid
     and last_seen_at > now() - public.presence_window();
end;
$$;

create function public.start_searching(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.games where id = p_game_id and is_selectable) then
    raise exception 'This game is not available';
  end if;

  if not exists (
    select 1 from public.game_profiles
     where user_id = uid and game_id = public.base_game_id(p_game_id)
  ) then
    raise exception 'Complete your profile for this game first';
  end if;

  insert into public.user_presence (user_id, last_seen_at)
  values (uid, now())
  on conflict (user_id) do update set last_seen_at = now();

  insert into public.lfg_presence (user_id, game_id, last_seen_at)
  values (uid, p_game_id, now())
  on conflict (user_id) do update set game_id = excluded.game_id, last_seen_at = now();
end;
$$;

create function public.stop_searching()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.lfg_presence where user_id = (select auth.uid());
$$;

-- One call for every tile. "Players searching" - not "players you could match".
create function public.count_searching_by_game()
returns table (game_id uuid, n bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.game_id, count(*)
    from public.lfg_presence p
   where p.last_seen_at > now() - public.presence_window()
   group by p.game_id
$$;

-- Internal: another user's status for a version tile. Never exposed to clients
-- directly; callers (definer functions) have already applied the visibility rules.
create function public.presence_status(p_user_id uuid, p_game_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.lfg_presence l
                  where l.user_id = p_user_id and l.game_id = p_game_id
                    and l.last_seen_at > now() - public.presence_window()) then 'searching'
    when exists (select 1 from public.user_presence u
                  where u.user_id = p_user_id
                    and u.last_seen_at > now() - public.presence_window()) then 'online'
    else 'offline'
  end
$$;

revoke all on function public.presence_window() from public, anon, authenticated;
revoke all on function public.heartbeat() from public, anon, authenticated;
revoke all on function public.start_searching(uuid) from public, anon, authenticated;
revoke all on function public.stop_searching() from public, anon, authenticated;
revoke all on function public.count_searching_by_game() from public, anon, authenticated;
revoke all on function public.presence_status(uuid, uuid) from public, anon, authenticated;

grant execute on function public.heartbeat() to authenticated;
grant execute on function public.start_searching(uuid) to authenticated;
grant execute on function public.stop_searching() to authenticated;
grant execute on function public.count_searching_by_game() to authenticated;

-- ---------------------------------------------------------------------------
-- D6: the toggle becomes "also show players who are online but not searching".
-- ---------------------------------------------------------------------------
alter table public.users rename column notifications_enabled to show_online_players;
alter table public.users alter column show_online_players set default false;
-- The old flag meant something else (notifications); start everyone from the new default.
update public.users set show_online_players = false;
