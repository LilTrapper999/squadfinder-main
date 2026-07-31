-- SquadFinder core schema
-- Tables only. Functions/triggers live in 20260731000200_functions_triggers.sql
-- RLS policies live in 20260731000300_policies.sql

create extension if not exists "pgcrypto";

create type game_category as enum ('extraction', 'competitive', 'fps');
create type request_status as enum ('pending', 'accepted', 'declined', 'blocked');
create type ally_rating as enum ('favorite', 'meh', 'blocked');

-- One row per account. Auto-populated from auth.users by a trigger (see next migration).
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game catalogue. Every playable version of a game (e.g. "Tarkov PvP", "Tarkov PvE")
-- is its own row here, not a child table. base_game_id lets a version-tile point back
-- to the "base" game whose game_reference_data (maps/weapons/roles) it shares.
create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category game_category not null,
  mark text,
  logo_url text,
  steam_app_id text,
  platforms text[] not null default '{}',
  is_mobile boolean not null default false,
  has_team_feature boolean not null default false,
  base_game_id uuid references public.games (id) on delete set null,
  version_label text,
  -- Free-text, not a real calendar date: catalogue values are inconsistent
  -- ("2026", "June 30, 2026", "v1.10 – Prison Zone & Boss Fight") — display
  -- labels, not parseable dates.
  version_date text,
  -- False only for a synthetic "family" row that exists purely to anchor
  -- game_reference_data for a multi-version game (e.g. Tarkov PvP/PvE share
  -- one weapons/maps/roles set) — never shown as a pickable tile in the UI.
  is_selectable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint games_no_self_base check (base_game_id is null or base_game_id <> id)
);

create index games_base_game_id_idx on public.games (base_game_id);

-- Reference/catalogue data per game: exactly one row per base game.
-- maps: JSON array of map names, e.g. ["Customs", "Shoreline"].
-- weapons: nested JSON, e.g. {"Assault Rifles": {"Standard": [...], "Marksman": [...]}, "Carbines": {...}}.
-- roles: JSON array of {value, label, subtitle}.
-- game_id must always point at a *base* game (base_game_id is null) — enforced by trigger.
-- Version-tiles look up their reference data via coalesce(games.base_game_id, games.id).
create table public.game_reference_data (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references public.games (id) on delete cascade,
  maps jsonb not null default '[]'::jsonb,
  weapons jsonb not null default '{}'::jsonb,
  roles jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A user's questionnaire answers for one specific game.
create table public.game_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  in_game_username text not null,
  platform text,
  weapons text[] not null default '{}',
  maps text[] not null default '{}',
  roles text[] not null default '{}',
  skill numeric(3, 1) not null check (skill between 0 and 10),
  role_match_preference numeric(3, 1) check (role_match_preference between 0 and 10),
  rage numeric(3, 1) not null check (rage between 0 and 10),
  personality text[] not null default '{}',
  willing_to_chat boolean not null default false,
  willing_to_speak boolean not null default false,
  languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);

create index game_profiles_game_id_idx on public.game_profiles (game_id);

-- A squad invite between two users for one game. Same row serves as both
-- the sender's "outbound" view and the recipient's "inbound" view.
-- status = 'blocked' means the recipient blocked the sender; enforced account-wide
-- via the is_blocked() function (next migration), not scoped back down to this game_id.
create table public.squad_requests (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  recipient_id uuid not null references public.users (id) on delete cascade,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint squad_requests_no_self check (sender_id <> recipient_id),
  constraint squad_requests_unique_pair unique (sender_id, recipient_id, game_id)
);

create index squad_requests_sender_idx on public.squad_requests (sender_id);
create index squad_requests_recipient_idx on public.squad_requests (recipient_id);
create index squad_requests_game_idx on public.squad_requests (game_id);
create index squad_requests_status_idx on public.squad_requests (status);

-- One row per (owner, other person, game) — i.e. two rows per accepted request,
-- one for each side's perspective, since rating (favorite/meh/blocked) is personal.
create table public.allies (
  id uuid primary key default gen_random_uuid(),
  squad_request_id uuid references public.squad_requests (id) on delete set null,
  user_id uuid not null references public.users (id) on delete cascade,
  ally_user_id uuid not null references public.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,
  ally_gaming_user_id text not null,
  match_score_at_acceptance numeric(5, 2),
  rating ally_rating,
  created_at timestamptz not null default now(),
  constraint allies_no_self check (user_id <> ally_user_id),
  constraint allies_unique_pair unique (user_id, ally_user_id, game_id)
);

create index allies_user_idx on public.allies (user_id);
create index allies_ally_user_idx on public.allies (ally_user_id);
create index allies_game_idx on public.allies (game_id);

-- One chat thread per accepted squad request.
create table public.ally_chats (
  id uuid primary key default gen_random_uuid(),
  squad_request_id uuid not null references public.squad_requests (id) on delete cascade,
  disappearing_messages boolean not null default false,
  created_at timestamptz not null default now(),
  unique (squad_request_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  ally_chat_id uuid not null references public.ally_chats (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  content text not null,
  sent_at timestamptz not null default now(),
  expires_at timestamptz
);

create index chat_messages_ally_chat_idx on public.chat_messages (ally_chat_id);
create index chat_messages_sender_idx on public.chat_messages (sender_id);
