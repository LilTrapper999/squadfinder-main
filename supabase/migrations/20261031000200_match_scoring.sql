-- SPEC_DB_CHANGES.md §3.6: server-side match score.
--
-- Port of lib/matching.ts. Parity rules (see supabase/tests/match_vectors.json):
--  * float8 arithmetic in the SAME operation order as the TypeScript, so both sides
--    do identical IEEE-754 math. (numeric would be exact and could disagree with JS
--    at .5 ties; round(float8) would round half to even where Math.round rounds up.)
--  * Math.round(x) is emulated as floor(x + 0.5).
--  * `overall` is computed from the UNROUNDED sub-scores.
--  * JS intersection() does not de-duplicate; neither does the count below
--    (the unique-elements CHECK on game_profiles makes the case unreachable in
--    practice, but the vectors cover it).

create function public.sf_jaccard(a text[], b text[])
returns float8
language sql
immutable
set search_path = ''
as $$
  select case when s.u = 0 then 0::float8
              else (s.i::float8 / s.u::float8) * 100 end
    from (select
            (select count(*) from unnest(a) x where x = any (b)) as i,
            (select count(distinct x) from unnest(a || b) x)      as u) s
$$;

create function public.sf_proximity(a float8, b float8, max_gap float8 default 5)
returns float8
language sql
immutable
set search_path = ''
as $$
  select greatest(0::float8, 100 - (abs(a - b) / max_gap) * 100)
$$;

create function public.calculate_match(a public.game_profiles, b public.game_profiles)
returns table (overall int, gamesmanship int, vibe_check int, comms int)
language plpgsql
immutable
set search_path = ''
as $$
declare
  u_roles   int;
  overlap   float8;
  lean      float8;
  s_weapons float8;
  s_maps    float8;
  s_roles   float8;
  s_skill   float8;
  g float8;
  v float8;
  c float8;
  o float8;
begin
  s_weapons := public.sf_jaccard(a.weapons, b.weapons);
  s_maps    := public.sf_jaccard(a.maps, b.maps);

  select count(distinct x) into u_roles from unnest(a.roles || b.roles) x;
  if u_roles = 0 then
    s_roles := 50;
  else
    overlap := (select count(*) from unnest(a.roles) x where x = any (b.roles))::float8 / u_roles::float8;
    lean := (coalesce(a.role_match_preference, 5)::float8 + coalesce(b.role_match_preference, 5)::float8) / 20;
    s_roles := ((1 - overlap) * 100) * (1 - lean) + (overlap * 100) * lean;
  end if;

  s_skill := public.sf_proximity(a.skill::float8, b.skill::float8, 5);
  g := (s_weapons + s_maps + s_roles + s_skill) / 4;

  v := (public.sf_proximity(a.rage::float8, b.rage::float8, 5)
        + public.sf_jaccard(a.personality, b.personality)) / 2;

  c := case when exists (select 1 from unnest(a.languages) x where x = any (b.languages))
            then 100::float8 else 0::float8 end;

  o := (g + v + c) / 3;

  overall := floor(o + 0.5)::int;
  gamesmanship := floor(g + 0.5)::int;
  vibe_check := floor(v + 0.5)::int;
  comms := floor(c + 0.5)::int;
  return next;
end;
$$;

-- Internal: called only by definer functions (accept_squad_request, discovery).
revoke all on function public.sf_jaccard(text[], text[]) from public, anon, authenticated;
revoke all on function public.sf_proximity(float8, float8, float8) from public, anon, authenticated;
revoke all on function public.calculate_match(public.game_profiles, public.game_profiles) from public, anon, authenticated;
