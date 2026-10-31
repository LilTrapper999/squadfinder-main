-- get_my_allies() gains block_id: the caller's OWN block row for that ally (null if none).
-- The ally card needs it to offer "unblock", and get_my_blocks() deliberately never returns
-- user ids, so there is no other way to map a block back to an ally. It only ever describes
-- blocks the caller made themselves; nothing about blocks made against them.

drop function public.get_my_allies();

create function public.get_my_allies()
returns table (
  ally_id uuid, ally_user_id uuid, game_id uuid, game_slug text,
  ally_gaming_user_id text, match_score_at_acceptance numeric,
  rating public.ally_rating, created_at timestamptz,
  status text, block_id uuid)
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
           where b.blocker_id = a.user_id and b.blocked_id = a.ally_user_id)
    from public.allies a
    join public.games g on g.id = a.game_id
   where a.user_id = (select auth.uid())
   order by a.created_at desc
$$;

revoke all on function public.get_my_allies() from public, anon, authenticated;
grant execute on function public.get_my_allies() to authenticated;
