-- SPEC_LAUNCH_READINESS.md D-15 (username bans) and D-03 (abuse reports).
--
-- A ban targets the in-game username STRING, not the account: the account keeps working (it can
-- still sign in, export its data and delete itself) but cannot use that name, and a profile
-- carrying a banned name is absent for everyone else. banned_usernames holds no user id, so it
-- survives account deletion by design (D-01).
--
-- Reports are reviewed in SQL through the open_reports view; acting on one means ban_username().

-- ---------------------------------------------------------------------------
-- Normalisation and the generated column used for matching
-- ---------------------------------------------------------------------------
-- NFKC, lower-case, strip whitespace and zero-width characters. Look-alike (homoglyph)
-- evasion is out of scope.
create function public.normalize_username(p_username text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(normalize(coalesce(p_username, ''), NFKC), '[\s\u200b-\u200d\u2060\ufeff]', '', 'g'))
$$;

-- Pure and immutable. Clients need EXECUTE because the generated game_profiles.username_norm
-- column is computed as the inserting user.
revoke all on function public.normalize_username(text) from public, anon;
grant execute on function public.normalize_username(text) to authenticated;

alter table public.game_profiles
  add column username_norm text generated always as (public.normalize_username(in_game_username)) stored;

create index game_profiles_username_norm_idx on public.game_profiles (username_norm);

-- ---------------------------------------------------------------------------
-- banned_usernames
-- ---------------------------------------------------------------------------
create table public.banned_usernames (
  id uuid primary key default gen_random_uuid(),
  username_norm text not null check (username_norm <> ''),
  game_id uuid references public.games (id) on delete cascade,   -- BASE game; null = every game
  reason text,
  created_at timestamptz not null default now()
);

create unique index banned_usernames_unique_idx
  on public.banned_usernames (username_norm, coalesce(game_id, '00000000-0000-0000-0000-000000000000'::uuid));

alter table public.banned_usernames enable row level security;
revoke all on public.banned_usernames from anon, authenticated;

create function public.username_is_banned(p_norm text, p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.banned_usernames b
     where b.username_norm = p_norm
       and (b.game_id is null or b.game_id = p_game_id)
  )
$$;

-- Is this user's profile for the game (any version tile) carrying a banned name?
create function public.profile_is_banned(p_user_id uuid, p_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.game_profiles gp
      join public.banned_usernames b
        on b.username_norm = gp.username_norm and (b.game_id is null or b.game_id = gp.game_id)
     where gp.user_id = p_user_id and gp.game_id = public.base_game_id(p_game_id)
  )
$$;

create function public.guard_banned_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.username_is_banned(public.normalize_username(new.in_game_username), new.game_id) then
    raise exception 'That username isn''t available';
  end if;
  return new;
end;
$$;

create trigger guard_banned_username
  before insert or update of in_game_username on public.game_profiles
  for each row execute function public.guard_banned_username();

-- Operator functions (postgres / service role only; never granted to clients).
create function public.ban_username(p_username text, p_game_id uuid default null, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_norm text := public.normalize_username(p_username);
  v_base uuid := case when p_game_id is null then null else public.base_game_id(p_game_id) end;
  v_id uuid;
begin
  if v_norm = '' then
    raise exception 'username is empty';
  end if;

  select b.id into v_id from public.banned_usernames b
   where b.username_norm = v_norm
     and coalesce(b.game_id, '00000000-0000-0000-0000-000000000000'::uuid)
       = coalesce(v_base, '00000000-0000-0000-0000-000000000000'::uuid);
  if v_id is null then
    insert into public.banned_usernames (username_norm, game_id, reason)
    values (v_norm, v_base, p_reason)
    returning id into v_id;
  end if;

  -- Pending requests involving a matching profile stop existing, and its presence goes away.
  update public.squad_requests sr
     set status = 'withdrawn'
   where sr.status = 'pending'
     and exists (
       select 1 from public.game_profiles gp
        where gp.username_norm = v_norm
          and (v_base is null or gp.game_id = v_base)
          and gp.user_id in (sr.sender_id, sr.recipient_id)
          and gp.game_id = public.base_game_id(sr.game_id));

  delete from public.lfg_presence lp
   using public.game_profiles gp
   where gp.user_id = lp.user_id
     and gp.username_norm = v_norm
     and (v_base is null or gp.game_id = v_base)
     and gp.game_id = public.base_game_id(lp.game_id);

  return v_id;
end;
$$;

create function public.unban_username(p_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.banned_usernames where id = p_id
$$;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create type public.report_reason as enum
  ('harassment', 'hate', 'inappropriate_username', 'impersonation', 'spam', 'cheating', 'other');
create type public.report_target as enum ('ally', 'request');
create type public.report_status as enum ('open', 'reviewed', 'actioned', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users (id) on delete set null,       -- reports stay when a reporter leaves
  reported_user_id uuid not null references public.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,    -- BASE game
  reported_username text not null,                                          -- snapshot at report time
  target_kind public.report_target not null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (reporter_id, reported_user_id, game_id)
);

create index reports_open_idx on public.reports (status, created_at) where status = 'open';

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

create function public.file_report(
  p_reporter uuid, p_reported uuid, p_game_id uuid, p_username text,
  p_kind public.report_target, p_reason public.report_reason, p_details text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_details text := nullif(btrim(coalesce(p_details, '')), '');
begin
  if v_details is not null and char_length(v_details) > 1000 then
    raise exception 'Details are too long';
  end if;
  perform public.consume_rate_limit(p_reporter, 'report', 10, interval '1 day');
  -- Reporting the same player twice is silently a no-op, so nothing differs on a repeat.
  insert into public.reports (reporter_id, reported_user_id, game_id, reported_username, target_kind, reason, details)
  values (p_reporter, p_reported, public.base_game_id(p_game_id), p_username, p_kind, p_reason, v_details)
  on conflict (reporter_id, reported_user_id, game_id) do nothing;
end;
$$;

create function public.report_ally(p_ally_id uuid, p_reason public.report_reason, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  a public.allies%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into a from public.allies where id = p_ally_id and user_id = uid;
  if not found then
    raise exception 'ally not found';
  end if;
  perform public.file_report(uid, a.ally_user_id, a.game_id, a.ally_gaming_user_id, 'ally', p_reason, p_details);
end;
$$;

create function public.report_request(p_request_id uuid, p_reason public.report_reason, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sr public.squad_requests%rowtype;
  v_name text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  select * into sr from public.squad_requests where id = p_request_id and recipient_id = uid;
  if not found then
    raise exception 'squad request not found';
  end if;
  select gp.in_game_username into v_name from public.game_profiles gp
   where gp.user_id = sr.sender_id and gp.game_id = public.base_game_id(sr.game_id);
  perform public.file_report(uid, sr.sender_id, sr.game_id, coalesce(v_name, ''), 'request', p_reason, p_details);
end;
$$;

-- Review surface: SQL only (postgres / service role). One row per reported player and game.
create view public.open_reports as
  select r.reported_username,
         g.slug as game,
         count(*) as reports,
         count(distinct r.reporter_id) as reporters,
         array_agg(distinct r.reason::text) as reasons,
         max(r.created_at) as latest,
         (array_agg(r.details order by r.created_at desc) filter (where r.details is not null))[1:3] as recent_details
    from public.reports r
    join public.games g on g.id = r.game_id
   where r.status = 'open'
   group by r.reported_username, g.slug;

revoke all on public.open_reports from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Existing functions that must treat a banned profile as absent
-- ---------------------------------------------------------------------------
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
     and not public.username_is_banned(c.username_norm, c.game_id)
     and (s.status = 'searching' or (p_include_online and s.status = 'online'))
   order by m.overall desc, c.id
   limit v_limit;
end;
$$;

create or replace function public.send_squad_request(p_game_id uuid, p_match_ref uuid)
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

  -- A banned username is absent for everyone, including its own owner.
  if public.profile_is_banned(uid, v_base) then
    raise exception '%', v_unavailable;
  end if;

  -- match_ref is the candidate's game_profiles.id for the BASE game.
  select gp.user_id into v_cand from public.game_profiles gp
   where gp.id = p_match_ref and gp.game_id = v_base
     and not public.username_is_banned(gp.username_norm, gp.game_id);
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

create or replace function public.get_my_pending_request_cards()
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
     and not public.username_is_banned(gp.username_norm, gp.game_id)
     and not public.profile_is_banned(sr.recipient_id, sr.game_id)
   order by sr.last_sent_at desc
$$;

create or replace function public.get_my_outbound_requests()
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
     and not public.profile_is_banned(sr.recipient_id, sr.game_id)
     and not public.profile_is_banned(sr.sender_id, sr.game_id)
   order by sr.created_at desc
$$;

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

  if public.username_is_banned(sp.username_norm, sp.game_id) or public.username_is_banned(rp.username_norm, rp.game_id) then
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

create or replace function public.get_my_allies()
returns table (
  ally_id uuid, ally_user_id uuid, game_id uuid, game_slug text,
  ally_gaming_user_id text, match_score_at_acceptance numeric,
  rating public.ally_rating, created_at timestamptz,
  status text, block_id uuid, request_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.ally_user_id, a.game_id, g.slug,
         a.ally_gaming_user_id, a.match_score_at_acceptance,
         a.rating, a.created_at,
         -- A block in either direction reads as plain 'offline' (D8).
         case when public.is_blocked(a.user_id, a.ally_user_id) then 'offline'
              else public.presence_status(a.ally_user_id, a.game_id) end,
         (select b.id from public.user_blocks b
           where b.blocker_id = a.user_id and b.blocked_id = a.ally_user_id),
         a.squad_request_id
    from public.allies a
    join public.games g on g.id = a.game_id
   where a.user_id = (select auth.uid())
     and not public.username_is_banned(public.normalize_username(a.ally_gaming_user_id), public.base_game_id(a.game_id))
     and not public.profile_is_banned(a.ally_user_id, a.game_id)
     and not public.profile_is_banned(a.user_id, a.game_id)
   order by a.created_at desc
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
revoke all on function public.username_is_banned(text, uuid) from public, anon, authenticated;
revoke all on function public.profile_is_banned(uuid, uuid) from public, anon, authenticated;
revoke all on function public.guard_banned_username() from public, anon, authenticated;
revoke all on function public.ban_username(text, uuid, text) from public, anon, authenticated;
revoke all on function public.unban_username(uuid) from public, anon, authenticated;
revoke all on function public.file_report(uuid, uuid, uuid, text, public.report_target, public.report_reason, text) from public, anon, authenticated;
revoke all on function public.report_ally(uuid, public.report_reason, text) from public, anon, authenticated;
revoke all on function public.report_request(uuid, public.report_reason, text) from public, anon, authenticated;

grant execute on function public.report_ally(uuid, public.report_reason, text) to authenticated;
grant execute on function public.report_request(uuid, public.report_reason, text) to authenticated;
