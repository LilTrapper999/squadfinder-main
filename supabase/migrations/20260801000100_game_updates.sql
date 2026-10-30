-- Audit log for the daily catalogue-update job (app/api/cron/update-games).
-- Service role only: RLS is enabled with deliberately NO policies, so anon and
-- authenticated clients cannot read or write it. The service role bypasses RLS.

create table public.game_updates (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  kind text not null check (kind in ('version', 'weapon', 'map', 'role')),
  old_value text,
  new_value text not null,
  source_summary text,
  applied boolean not null default false,
  created_at timestamptz not null default now()
);

create index game_updates_game_id_idx on public.game_updates (game_id, created_at desc);

-- Additions are recorded at most once per game/kind/value, so re-running the job
-- the same day cannot duplicate audit rows. (Version changes may legitimately repeat.)
create unique index game_updates_addition_unique
  on public.game_updates (game_id, kind, lower(new_value))
  where kind <> 'version';

alter table public.game_updates enable row level security;
