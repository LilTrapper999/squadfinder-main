-- MANUAL TEST HELPER — run in the Supabase SQL editor of a SCRATCH project only.
--
-- Sends YOU a fake squad request (from an invented player) so you can try the bell,
-- /notifications, Accept / Decline / Decline & Block against the real database without a
-- second account.
--
--   1. Sign in to the app with your own account and save a profile for Escape from Tarkov
--      (select-game -> a Tarkov tile -> fill the form -> FIND MY SQUAD). Accepting needs it.
--   2. In the select near the top of the script, replace the placeholder email with the email of
--      the account you signed in with.
--   3. Run this file. Within a minute (instantly if realtime works) the bell shows 1.
--
-- To run it again after you have accepted or blocked the fake player, first run:
--   delete from auth.users where email = 'demo-sender@example.invalid';
-- (that cascades to the fake player's profile, presence, requests, allies and blocks).

do $$
declare
  me uuid;
  sender uuid := '00000000-0000-4000-8000-00000000d3a0';
  tarkov uuid;
  pvp uuid;
begin
  select id into me from auth.users where email = 'YOUR_EMAIL_HERE';
  if me is null then
    raise exception 'No account with that email. Sign in to the app once first, then fix the email above.';
  end if;

  select id into tarkov from public.games where slug = 'tarkov';          -- base (anchor) row
  select id into pvp    from public.games where slug = 'tarkov-eft-pvp';  -- the tile the request is for
  if tarkov is null or pvp is null then
    raise exception 'Tarkov is missing from public.games. Run supabase/seed.sql first.';
  end if;

  insert into auth.users (id, aud, role, email)
  values (sender, 'authenticated', 'authenticated', 'demo-sender@example.invalid')
  on conflict (id) do nothing;

  -- (public.users is created by the on_auth_user_created trigger)
  insert into public.game_profiles
    (user_id, game_id, in_game_username, platform, weapons, maps, roles, skill, role_match_preference,
     rage, personality, willing_to_chat, willing_to_speak, languages)
  values
    (sender, tarkov, 'DemoSender', 'PC', array['AK-74N','M4A1'], array['Customs','Woods'], array[]::text[],
     6.5, 5, 3, array['Chill'], true, false, array['English'])
  on conflict (user_id, game_id) do update set updated_at = now();

  insert into public.user_presence (user_id, last_seen_at) values (sender, now())
  on conflict (user_id) do update set last_seen_at = now();
  insert into public.lfg_presence (user_id, game_id, last_seen_at) values (sender, pvp, now())
  on conflict (user_id) do update set game_id = excluded.game_id, last_seen_at = now();

  insert into public.squad_requests (game_id, sender_id, recipient_id, status, last_sent_at)
  values (pvp, sender, me, 'pending', now())
  on conflict (sender_id, recipient_id, game_id)
    do update set status = 'pending', declined_at = null, last_sent_at = now();
end
$$;
