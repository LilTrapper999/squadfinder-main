-- SPEC_LAUNCH_READINESS D-08: discovery at scale.
--
-- find_squad_matches used to score EVERY profile of the base game (presence lookup + calculate_match
-- per row) and only then keep the searching ones, so one call cost O(all profiles). It now starts
-- from the people who are actually present (an index range on lfg_presence / user_presence), joins
-- their profile by key, and scores only those. Results are identical to the old function whenever
-- fewer than 1500 people are present; beyond that the freshest searchers win the candidate slots.
-- (The previous function body is in 20261101000400_reports_and_bans.sql.)

-- Housekeeping deletes by last_seen_at and the counts aggregate over fresh rows.
create index lfg_presence_last_seen_idx on public.lfg_presence (last_seen_at);

create or replace function public.find_squad_matches(
  p_game_id uuid,                       -- the VERSION tile being browsed
  p_include_online boolean default false,
  p_limit integer default 50)
returns table (
  match_ref uuid,                       -- candidate's game_profiles.id: random, per base game, NOT the user id
  weapons text[], maps text[], roles text[], skill numeric, role_match_preference numeric,
  rage numeric, personality text[], willing_to_chat boolean, willing_to_speak boolean,
  languages text[], platform text,
  status text,                          -- 'searching' | 'online'
  score integer)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := (select auth.uid());
  v_base uuid;
  me public.game_profiles%rowtype;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if not exists (select 1 from public.games g where g.id = p_game_id and g.is_selectable) then
    return;
  end if;
  v_base := public.base_game_id(p_game_id);

  -- Needs a complete profile (nothing to score against otherwise) ...
  select * into me from public.game_profiles gp where gp.user_id = uid and gp.game_id = v_base;
  if not found then
    return;
  end if;

  if public.profile_is_banned(uid, v_base) then
    return;
  end if;

  -- ... and must itself be searching this version (stops non-participants scraping answers).
  if not exists (
    select 1 from public.lfg_presence l
     where l.user_id = uid and l.game_id = p_game_id
       and l.last_seen_at > now() - public.presence_window()
  ) then
    return;
  end if;

  perform public.consume_rate_limit(uid, 'find_squad_matches', 20, interval '1 minute');

  return query
  with present as (
    -- Searching this tile right now.
    (select l.user_id as pid, l.last_seen_at as seen, true as is_searching
       from public.lfg_presence l
      where l.game_id = p_game_id
        and l.user_id <> uid
        and l.last_seen_at > now() - public.presence_window())
    union all
    -- Online but not searching this tile (only when the caller asked to see them).
    (select u.user_id, u.last_seen_at, false
       from public.user_presence u
      where p_include_online
        and u.user_id <> uid
        and u.last_seen_at > now() - public.presence_window()
        and not exists (
          select 1 from public.lfg_presence l2
           where l2.user_id = u.user_id and l2.game_id = p_game_id
             and l2.last_seen_at > now() - public.presence_window()))
  ), capped as (
    select pid, is_searching from present order by is_searching desc, seen desc, pid limit 1500
  )
  select c.id, c.weapons, c.maps, c.roles, c.skill, c.role_match_preference,
         c.rage, c.personality, c.willing_to_chat, c.willing_to_speak,
         c.languages, c.platform,
         case when cp.is_searching then 'searching' else 'online' end,
         m.overall
    from capped cp
    join public.game_profiles c on c.user_id = cp.pid and c.game_id = v_base
    cross join lateral public.calculate_match(me, c) m
   where not public.is_blocked(uid, c.user_id)
     and public.can_contact(uid, c.user_id, p_game_id)
     and not public.username_is_banned(c.username_norm, c.game_id)
   order by m.overall desc, c.id
   limit v_limit;
end;
$$;

revoke all on function public.find_squad_matches(uuid, boolean, integer) from public, anon, authenticated;
grant execute on function public.find_squad_matches(uuid, boolean, integer) to authenticated;
