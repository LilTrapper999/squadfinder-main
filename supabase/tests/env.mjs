// The slice of a Supabase project the migrations rely on: roles, default privileges,
// auth.uid(), and realtime.send / realtime.messages stubs. Shared by run.mjs and upgrade.mjs.
export const ENV_SQL = `
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    -- what a stock Supabase project does to every new object in public
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

    create schema auth;
    grant usage on schema auth to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb, aud text, role text, email text);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant execute on function auth.uid() to anon, authenticated, service_role;

    create schema realtime;
    grant usage on schema realtime to anon, authenticated, service_role;
    create table realtime.sent_log (id bigint generated always as identity, topic text, event text, payload jsonb);
    create function realtime.send(payload jsonb, event text, topic text, private boolean default true)
      returns void language sql as $$ insert into realtime.sent_log (topic, event, payload) values (topic, event, payload) $$;
    create table realtime.messages (id uuid primary key default gen_random_uuid());
    alter table realtime.messages enable row level security;
    grant select on realtime.messages to authenticated;
    create function realtime.topic() returns text language sql stable
      as $$ select current_setting('realtime.topic', true) $$;
    grant execute on function realtime.topic() to authenticated;
`
