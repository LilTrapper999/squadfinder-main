-- SPEC_DB_CHANGES.md §0 (rule 3), §3.1, §3.2.
-- games.slug, profiles keyed by BASE game, tightened profile visibility,
-- array/text hygiene, and anon/table-privilege cleanup on the existing tables.

-- ---------------------------------------------------------------------------
-- §3.1 games.slug
-- ---------------------------------------------------------------------------
-- Existing rows get a placeholder; re-running the regenerated supabase/seed.sql
-- (scripts/generate-seed.mjs now emits slug) overwrites it with the catalogue key.
alter table public.games add column slug text;
update public.games set slug = 'legacy-' || id::text where slug is null;
alter table public.games alter column slug set not null;
create unique index games_slug_key on public.games (slug);

-- ---------------------------------------------------------------------------
-- §3.2 base game helper
-- ---------------------------------------------------------------------------
create function public.base_game_id(p_game_id uuid)
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(g.base_game_id, g.id) from public.games g where g.id = p_game_id
$$;

revoke all on function public.base_game_id(uuid) from public, anon, authenticated;
grant execute on function public.base_game_id(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Array / text hygiene helpers (a CHECK cannot contain a subquery)
-- ---------------------------------------------------------------------------
create function public.text_array_is_clean(a text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select a is not null
     and cardinality(a) <= 100
     and cardinality(a) = (select count(distinct x) from unnest(a) x)
$$;

create function public.dedupe_text_array(a text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (select array_agg(d.x order by d.o)
       from (select t.x, min(t.o) as o
               from unnest(a) with ordinality as t(x, o)
              where t.x is not null
              group by t.x
              order by min(t.o)
              limit 100) d),
    '{}'::text[])
$$;

revoke all on function public.text_array_is_clean(text[]) from public, anon, authenticated;
revoke all on function public.dedupe_text_array(text[]) from public, anon, authenticated;
-- CHECK constraints run as the inserting role, so the check helper must be callable.
grant execute on function public.text_array_is_clean(text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles move to the BASE game. Fix any existing data first.
-- ---------------------------------------------------------------------------
-- (a) one profile per user per base game: keep the most recently updated.
with ranked as (
  select gp.id,
         row_number() over (
           partition by gp.user_id, coalesce(g.base_game_id, g.id)
           order by gp.updated_at desc, gp.id
         ) as rn
    from public.game_profiles gp
    join public.games g on g.id = gp.game_id
)
delete from public.game_profiles where id in (select id from ranked where rn > 1);

-- (b) re-point version-row profiles at the base row.
update public.game_profiles gp
   set game_id = g.base_game_id
  from public.games g
 where g.id = gp.game_id and g.base_game_id is not null;

-- (c) clean values the new constraints reject.
update public.game_profiles set
  weapons     = public.dedupe_text_array(weapons),
  maps        = public.dedupe_text_array(maps),
  roles       = public.dedupe_text_array(roles),
  personality = public.dedupe_text_array(personality),
  languages   = public.dedupe_text_array(languages),
  in_game_username = coalesce(
    nullif(left(regexp_replace(in_game_username, '[[:cntrl:]]', '', 'g'), 40), ''),
    'player');

create function public.enforce_profile_on_base_game()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.games where id = new.game_id and base_game_id is not null
  ) then
    raise exception 'game_profiles.game_id must reference a base game (base_game_id is null), not a version-tile';
  end if;
  return new;
end;
$$;

create trigger enforce_profile_on_base_game
  before insert or update of game_id on public.game_profiles
  for each row execute function public.enforce_profile_on_base_game();

revoke all on function public.enforce_profile_on_base_game() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- New columns + limits
-- ---------------------------------------------------------------------------
alter table public.game_profiles
  add column no_maps boolean not null default false,
  add column specific_answers jsonb not null default '{}'::jsonb;

alter table public.game_profiles
  add constraint game_profiles_arrays_clean check (
    public.text_array_is_clean(weapons)
    and public.text_array_is_clean(maps)
    and public.text_array_is_clean(roles)
    and public.text_array_is_clean(personality)
    and public.text_array_is_clean(languages)
  ),
  add constraint game_profiles_username_valid check (
    char_length(in_game_username) between 1 and 40
    and in_game_username !~ '[[:cntrl:]]'
  ),
  add constraint game_profiles_specific_answers_object check (
    jsonb_typeof(specific_answers) = 'object' and pg_column_size(specific_answers) <= 8192
  );

-- ---------------------------------------------------------------------------
-- Profile visibility: own row, or an ally's row for that base game (not blocked).
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER because the policy must not depend on how Postgres checks
-- privileges inside a policy subquery. It takes the OWNER id and base game and
-- uses auth.uid() as the reader, so it can only describe the caller's own allies.
create function public.is_ally_for_profile(p_owner uuid, p_base_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.allies a
     where a.user_id = (select auth.uid())
       and a.ally_user_id = p_owner
       and public.base_game_id(a.game_id) = p_base_game_id
  ) and not public.is_blocked((select auth.uid()), p_owner)
$$;

revoke all on function public.is_ally_for_profile(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_ally_for_profile(uuid, uuid) to authenticated;

drop policy game_profiles_select on public.game_profiles;
create policy game_profiles_select on public.game_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_ally_for_profile(user_id, game_id)
  );

-- ---------------------------------------------------------------------------
-- §0 rule 3 on the EXISTING tables
-- ---------------------------------------------------------------------------
-- Signed-out visitors get nothing (games_select_all / reference_data_select_all
-- have no `to` clause), and TRUNCATE/REFERENCES/TRIGGER are not covered by RLS.
revoke all on
  public.users, public.games, public.game_reference_data, public.game_profiles,
  public.squad_requests, public.allies, public.ally_chats, public.chat_messages,
  public.game_updates
from anon;

revoke truncate, references, trigger on all tables in schema public from authenticated;
revoke insert, update, delete on public.games, public.game_reference_data from authenticated;
revoke all on public.game_updates from authenticated;

-- New objects created later should not be handed to anon by default either.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
