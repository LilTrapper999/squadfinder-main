-- SPEC_DB_CHANGES.md §3.7: anonymous discovery for /squad-matches (+ rate limiting).
-- Answers but NEVER user_id or in_game_username. send_squad_request (previous
-- migration) resolves the opaque match_ref back to a user internally.

-- Small fixed-window limiter used by discovery and chat. Definer-only.
create table public.api_rate_limits (
  user_id uuid not null references public.users (id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  n integer not null default 0,
  primary key (user_id, bucket)
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create function public.consume_rate_limit(p_user_id uuid, p_bucket text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  insert into public.api_rate_limits as r (user_id, bucket, window_start, n)
  values (p_user_id, p_bucket, now(), 1)
  on conflict (user_id, bucket) do update
    set window_start = case when r.window_start <= now() - p_window then now() else r.window_start end,
        n            = case when r.window_start <= now() - p_window then 1 else r.n + 1 end
  returning n into v_n;

  if v_n > p_max then
    raise exception 'Too many requests. Please slow down.';
  end if;
end;
$$;

revoke all on function public.consume_rate_limit(uuid, text, integer, interval) from public, anon, authenticated;

create function public.find_squad_matches(
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
  select c.id, c.weapons, c.maps, c.roles, c.skill, c.role_match_preference,
         c.rage, c.personality, c.willing_to_chat, c.willing_to_speak,
         c.languages, c.platform,
         s.status, m.overall
    from public.game_profiles c
    cross join lateral (select public.presence_status(c.user_id, p_game_id) as status) s
    cross join lateral public.calculate_match(me, c) m
   where c.game_id = v_base
     and c.user_id <> uid
     and not public.is_blocked(uid, c.user_id)
     and public.can_contact(uid, c.user_id, p_game_id)
     and (s.status = 'searching' or (p_include_online and s.status = 'online'))
   order by m.overall desc, c.id
   limit v_limit;
end;
$$;

revoke all on function public.find_squad_matches(uuid, boolean, integer) from public, anon, authenticated;
grant execute on function public.find_squad_matches(uuid, boolean, integer) to authenticated;
