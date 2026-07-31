-- squad_requests has no "direction" column on purpose: sender_id/recipient_id
-- already encode both inbound and outbound, direction is just "which side is
-- auth.uid()". These views make that explicit for the querying user so the app
-- doesn't need to remember which column means what.
--
-- security_invoker = true is required here: Supabase migrations run as the
-- `postgres` role, which has BYPASSRLS, so a view created without this option
-- would silently ignore squad_requests' row level security. With it, the view
-- re-checks RLS as the querying user, same as querying the table directly.

create view public.my_inbound_squad_requests
with (security_invoker = true)
as
select *
from public.squad_requests
where recipient_id = auth.uid();

create view public.my_outbound_squad_requests
with (security_invoker = true)
as
select *
from public.squad_requests
where sender_id = auth.uid();

grant select on public.my_inbound_squad_requests to authenticated;
grant select on public.my_outbound_squad_requests to authenticated;
