-- SPEC_LAUNCH_READINESS D-04 (housekeeping) and D-13 (game_updates can be reverted).
-- Both are service-role only: no client grant. Nothing here changes what a signed-in user can see.

-- ---------------------------------------------------------------------------
-- D-04. run_housekeeping()
-- Reads already ignore stale presence and expired requests, so correctness never depends on
-- this; it only keeps the small hot tables small. Called daily by /api/cron/housekeeping.
-- ---------------------------------------------------------------------------
create function public.run_housekeeping()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_online integer;
  n_searching integer;
  n_events integer;
  n_limits integer;
begin
  delete from public.user_presence where last_seen_at < now() - interval '1 day';
  get diagnostics n_online = row_count;

  delete from public.lfg_presence where last_seen_at < now() - interval '1 day';
  get diagnostics n_searching = row_count;

  -- The per-pair cap looks back 30 days and the daily cap 1 day; 90 days is far past both.
  delete from public.squad_request_events where sent_at < now() - interval '90 days';
  get diagnostics n_events = row_count;

  delete from public.api_rate_limits where window_start < now() - interval '2 days';
  get diagnostics n_limits = row_count;

  return jsonb_build_object(
    'user_presence', n_online,
    'lfg_presence', n_searching,
    'squad_request_events', n_events,
    'api_rate_limits', n_limits
  );
end;
$$;

revoke all on function public.run_housekeeping() from public, anon, authenticated;
grant execute on function public.run_housekeeping() to service_role;

-- ---------------------------------------------------------------------------
-- D-13. game_updates status + revert_game_update(id)
-- ---------------------------------------------------------------------------
alter table public.game_updates
  add column if not exists status text not null default 'applied',
  add column if not exists reverted_at timestamptz;

alter table public.game_updates
  drop constraint if exists game_updates_status_check;
alter table public.game_updates
  add constraint game_updates_status_check check (status in ('applied', 'reverted'));

-- The additions index must stop blocking a re-add after a revert, so it only covers live rows.
drop index if exists public.game_updates_addition_unique;
create unique index game_updates_addition_unique
  on public.game_updates (game_id, kind, lower(new_value))
  where kind <> 'version' and status = 'applied';

-- Undo one audit row:
--   version -> put the previous label back on the tile
--   map     -> remove that map from the game's list
--   role    -> remove the role with that label
--   weapon  -> remove "<category>: <name>" from its category (an emptied category is dropped)
-- Returns true when something was reverted, false when the row was already reverted or the
-- value is no longer there (it is still marked reverted so it cannot be applied twice).
create function public.revert_game_update(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  u public.game_updates%rowtype;
  v_cat text;
  v_name text;
  v_changed boolean := false;
begin
  select * into u from public.game_updates where id = p_id for update;
  if not found then
    raise exception 'unknown game update';
  end if;
  if u.status = 'reverted' then
    return false;
  end if;

  if u.kind = 'version' then
    update public.games set version_label = u.old_value, updated_at = now() where id = u.game_id;
    v_changed := found;

  elsif u.kind = 'map' then
    update public.game_reference_data r
       set maps = coalesce((select jsonb_agg(m) from jsonb_array_elements(r.maps) m
                             where lower(m #>> '{}') <> lower(u.new_value)), '[]'::jsonb),
           updated_at = now()
     where r.game_id = u.game_id and exists (
       select 1 from jsonb_array_elements(r.maps) m where lower(m #>> '{}') = lower(u.new_value));
    v_changed := found;

  elsif u.kind = 'role' then
    update public.game_reference_data r
       set roles = coalesce((select jsonb_agg(x) from jsonb_array_elements(r.roles) x
                              where lower(x ->> 'label') <> lower(u.new_value)), '[]'::jsonb),
           updated_at = now()
     where r.game_id = u.game_id and exists (
       select 1 from jsonb_array_elements(r.roles) x where lower(x ->> 'label') = lower(u.new_value));
    v_changed := found;

  elsif u.kind = 'weapon' then
    v_cat := split_part(u.new_value, ': ', 1);
    v_name := substr(u.new_value, length(v_cat) + 3);
    update public.game_reference_data r
       set weapons = (
             select coalesce(jsonb_object_agg(e.key, e.new_val), '{}'::jsonb)
               from (
                 select e0.key,
                        case when jsonb_typeof(e0.value) = 'array' and lower(e0.key) = lower(v_cat)
                             then (select coalesce(jsonb_agg(w), '[]'::jsonb)
                                     from jsonb_array_elements(e0.value) w
                                    where lower(w #>> '{}') <> lower(v_name))
                             else e0.value end as new_val
                   from jsonb_each(r.weapons) e0
               ) e
              where not (lower(e.key) = lower(v_cat) and e.new_val = '[]'::jsonb)
           ),
           updated_at = now()
     where r.game_id = u.game_id and exists (
       select 1 from jsonb_each(r.weapons) e, jsonb_array_elements(
              case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end) w
        where lower(e.key) = lower(v_cat) and lower(w #>> '{}') = lower(v_name));
    v_changed := found;
  end if;

  update public.game_updates set status = 'reverted', applied = false, reverted_at = now() where id = p_id;
  return v_changed;
end;
$$;

revoke all on function public.revert_game_update(uuid) from public, anon, authenticated;
grant execute on function public.revert_game_update(uuid) to service_role;
