-- Least privilege for signed-in clients (defence in depth; nothing here changes behaviour).
--
-- The original policies migration granted every table privilege to `authenticated` and relied on row
-- level security to say no. Row-level security still does, but two grants had no legitimate use and no
-- policy that would allow them, so they are removed rather than left to a missing policy:
--   * allies:  rows are created only by accept_squad_request() (a definer function), never by a client.
--   * users:   rows are created by the sign-up trigger and removed by the account-deletion route (the
--              auth admin API cascades); a client never inserts or deletes its own row.
-- What clients still have on tables: read games and reference data; read, write and delete their own
-- profile rows; read their own user row and update show_online_players; read and favourite their own
-- allies (removing one goes through remove_ally).

revoke insert on public.allies from authenticated;
revoke insert, delete on public.users from authenticated;
