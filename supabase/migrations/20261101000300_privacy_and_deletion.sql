-- SPEC_LAUNCH_READINESS.md D-09 (PII minimisation), D-10 (column-restricted updates),
-- D-14 (sign-up cannot be blocked by the profile trigger), D-02 (data export).
--
-- !! This migration drops two columns (users.display_name, users.avatar_url). Nothing in the
-- !! app reads them. Apply only with the owner's go-ahead.

-- ---------------------------------------------------------------------------
-- D-09: stop copying Google profile data; drop what is already there
-- ---------------------------------------------------------------------------
alter table public.users drop column if exists display_name;
alter table public.users drop column if exists avatar_url;

-- D-14: idempotent, and a failure here must never block sign-up. The row can be created
-- later (an upsert from the app's first write would also work), but the account must exist.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.users (id) values (new.id) on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- D-10: the only column a client may change on its own users row
-- ---------------------------------------------------------------------------
revoke update on public.users from authenticated;
grant update (show_online_players) on public.users to authenticated;

-- ---------------------------------------------------------------------------
-- D-02: export_my_data() — the caller's own rows, nothing about anyone else
-- ---------------------------------------------------------------------------
create function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'account', (select jsonb_build_object('created_at', u.created_at, 'show_online_players', u.show_online_players)
                  from public.users u where u.id = (select auth.uid())),
    'profiles', coalesce((
      select jsonb_agg((to_jsonb(gp) - 'id' - 'user_id' - 'game_id') || jsonb_build_object('game', g.slug))
        from public.game_profiles gp join public.games g on g.id = gp.game_id
       where gp.user_id = (select auth.uid())), '[]'::jsonb),
    'sent_requests', coalesce((
      select jsonb_agg(jsonb_build_object('game', r.game_slug, 'status', r.status, 'sent_at', r.created_at))
        from public.get_my_outbound_requests() r), '[]'::jsonb),
    'allies', coalesce((
      select jsonb_agg(jsonb_build_object('game', a.game_slug, 'username', a.ally_gaming_user_id,
                                          'match_score', a.match_score_at_acceptance, 'since', a.created_at))
        from public.get_my_allies() a), '[]'::jsonb),
    'blocks', coalesce((
      select jsonb_agg(jsonb_build_object('label', b.label, 'blocked_at', b.created_at))
        from public.get_my_blocks() b), '[]'::jsonb)
  )
$$;

revoke all on function public.export_my_data() from public, anon, authenticated;
grant execute on function public.export_my_data() to authenticated;
