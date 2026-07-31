-- Row Level Security. This is the enforcement layer that holds even if the
-- UI has a bug or a client is bypassed entirely (curl, devtools, a modified
-- request) — no access rule here should depend on the app behaving.

alter table public.users enable row level security;
alter table public.games enable row level security;
alter table public.game_reference_data enable row level security;
alter table public.game_profiles enable row level security;
alter table public.squad_requests enable row level security;
alter table public.allies enable row level security;
alter table public.ally_chats enable row level security;
alter table public.chat_messages enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- users: only your own row. Row is created by the handle_new_user trigger, not
-- by direct client insert, so there is no insert policy for authenticated.
create policy users_select_own on public.users
  for select using (auth.uid() = id);

create policy users_update_own on public.users
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- games / game_reference_data: read-only catalogue, visible to any signed-in user.
-- No insert/update/delete policy for authenticated — only the service role (which
-- bypasses RLS) can edit the catalogue, e.g. from an admin tool or the SQL editor.
create policy games_select_all on public.games
  for select using (true);

create policy reference_data_select_all on public.game_reference_data
  for select using (true);

-- game_profiles: you can always see your own. You can see someone else's for a
-- game if: you're already allies for that game, OR they sent you a request for
-- that game (any status — inbound senders are always visible to the recipient),
-- OR you sent them a request for that game that they've accepted (outbound
-- recipients stay hidden until acceptance).
create policy game_profiles_select on public.game_profiles
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.allies a
      where a.user_id = auth.uid()
        and a.ally_user_id = game_profiles.user_id
        and a.game_id = game_profiles.game_id
    )
    or exists (
      select 1 from public.squad_requests sr
      where sr.recipient_id = auth.uid()
        and sr.sender_id = game_profiles.user_id
        and sr.game_id = game_profiles.game_id
    )
    or exists (
      select 1 from public.squad_requests sr
      where sr.sender_id = auth.uid()
        and sr.recipient_id = game_profiles.user_id
        and sr.game_id = game_profiles.game_id
        and sr.status = 'accepted'
    )
  );

create policy game_profiles_insert_own on public.game_profiles
  for insert with check (user_id = auth.uid());

create policy game_profiles_update_own on public.game_profiles
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy game_profiles_delete_own on public.game_profiles
  for delete using (user_id = auth.uid());

-- squad_requests: visible to either party. Only the sender can create one (and
-- the guard_squad_request_insert trigger blocks it if either side has blocked
-- the other). Only the recipient can change status (accept/decline/block, or
-- unblock later). The sender can withdraw their own request while still pending.
create policy squad_requests_select on public.squad_requests
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy squad_requests_insert on public.squad_requests
  for insert with check (auth.uid() = sender_id);

create policy squad_requests_update_recipient on public.squad_requests
  for update using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create policy squad_requests_delete_sender on public.squad_requests
  for delete using (auth.uid() = sender_id and status = 'pending');

-- allies: only visible to the row's owner (each side of a relationship has its
-- own row with its own rating). No insert policy — rows are only ever created by
-- accept_squad_request(), which runs as security definer. Rating is the only
-- column a client can change (enforced by guard_allies_immutable).
create policy allies_select_own on public.allies
  for select using (user_id = auth.uid());

create policy allies_update_rating_own on public.allies
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy allies_delete_own on public.allies
  for delete using (user_id = auth.uid());

-- ally_chats: visible/editable only to the two people on the underlying squad
-- request. No insert policy — created only by accept_squad_request().
create policy ally_chats_select on public.ally_chats
  for select using (
    exists (
      select 1 from public.squad_requests sr
      where sr.id = ally_chats.squad_request_id
        and (sr.sender_id = auth.uid() or sr.recipient_id = auth.uid())
    )
  );

create policy ally_chats_update on public.ally_chats
  for update using (
    exists (
      select 1 from public.squad_requests sr
      where sr.id = ally_chats.squad_request_id
        and (sr.sender_id = auth.uid() or sr.recipient_id = auth.uid())
    )
  );

-- chat_messages: visible only to the two chat participants. Insert requires you
-- to be the sender AND a participant (the guard_chat_message_insert trigger
-- additionally blocks it if the two are blocked).
create policy chat_messages_select on public.chat_messages
  for select using (
    exists (
      select 1 from public.ally_chats ac
      join public.squad_requests sr on sr.id = ac.squad_request_id
      where ac.id = chat_messages.ally_chat_id
        and (sr.sender_id = auth.uid() or sr.recipient_id = auth.uid())
    )
  );

create policy chat_messages_insert on public.chat_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.ally_chats ac
      join public.squad_requests sr on sr.id = ac.squad_request_id
      where ac.id = chat_messages.ally_chat_id
        and (sr.sender_id = auth.uid() or sr.recipient_id = auth.uid())
    )
  );
