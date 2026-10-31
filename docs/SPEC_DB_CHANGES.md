# SPEC — Database changes needed for the notifications + score-breakdown UI

**Status: proposal only. No database, migration or seed file has been changed or run.** SQL below is illustrative, to be reviewed before anyone writes a real migration.

**Baseline compared against:** the five existing migrations in `supabase/migrations/` (`schema`, `functions_triggers`, `policies`, `convenience_views`, `game_updates`) and the UI as of commit `5d764f2` on `Open_Beta`.

**Ground rule (standing project rule):** every access/visibility rule below must be enforced in the database (RLS, constraints, security-definer functions), never only in a React component.

---

## 1. What the new UI does, and what it needs from the DB

| UI behaviour | Where | DB needs |
|---|---|---|
| Bell shows count of pending requests sent *to me* | `NotificationBell`, `AppContext.squadRequests` | Count of my inbound `pending` requests; live updates when a new one arrives |
| `/notifications`: 3 tabs (extraction / competitive / fps), each with a count; games with requests; one card per sender | `app/notifications/page.tsx` | Inbound pending requests joined to game (name, category, logo) |
| Card shows the sender's **username**, their status (searching / online), mic/text badges | `RequestCard` | Sender's `in_game_username` for that game, presence, `willing_to_*` |
| Click any % → popup listing picks you share, picks only one side made, slider gaps | `ScoreBreakdownModal`, `explainMatch()` | The sender's **full answers** for that game (weapons, maps, roles, skill, role style, rage, personality, languages) plus **mine** for the same game |
| Accept / Decline / Decline & Block | `RequestCard` → `AppContext` | State transitions enforced server-side (see §3.4) |
| `/squad-matches` cards: same clickable % + popup, but the other player stays **anonymous** ("Match 02") | `ScoreBars`, `MatchCard` | Anonymous candidate answers (no username, no user id) for a game; see §3.6 |
| Demo requests seeded on localhost | `AppContext` effect, `MOCK_SQUAD_REQUESTS` | **Nothing.** Dev-only, deleted at launch (flagged in `lib/launch.ts`) |

The breakdown itself needs **no new table**: it is computed in the browser by `explainMatch()` from the two players' answers. What the DB must supply is the *answers*, to exactly the people allowed to see them.

---

## 2. Summary of changes

| # | Change | Type | Why it is needed | Blocks |
|---|---|---|---|---|
| 3.1 | `games.slug` (catalogue key) | column | UI identifies games by string id (`'tarkov-eft-pvp'`, `'cs2'`); DB uses uuids | Everything |
| 3.2 | Key `game_profiles` by **base** game; add `no_maps`, `specific_answers` | column + policy/RPC fix | UI shares one answer set across versions of a game; DB would split them and policies would mismatch | Notifications, accept |
| 3.3 | Inbound-notifications view | view | One query for tabs, cards and breakdown | Notifications |
| 3.4 | Harden request state machine; add `decline_*`, `send_squad_request` RPCs | trigger + functions | Recipient can currently bypass the accept RPC; sender can never re-request | Accept / decline / block |
| 3.5 | Compute match score server-side | function | Accept currently stores a client-supplied score | Accept |
| 3.6 | Anonymous discovery RPC `find_squad_matches` | function | `/squad-matches` breakdown needs strangers' answers without their identity; current RLS forbids it | Squad-matches |
| 3.7 | Presence storage | table + functions | Status dots, "searching" filter, notification card status | Notifications, squad-matches |
| 3.8 | Realtime + indexes | publication + index | Bell/page update live; fast pending counts | Notifications |
| 3.9 | Allies view with `blocked_you` | view | Existing ally card shows "they blocked you" | Allies |
| 3.10 | Chat hardening | trigger/policy | Adjacent gaps found while reading | Chat |

---

## 3. Required changes

### 3.1 `games.slug`

**Why.** `SquadRequest.gameId` and every tile use catalogue ids; `games.id` is a uuid (the seed uses deterministic UUIDv5 of the catalogue key, but the client has no clean way to know it).

```sql
alter table public.games add column slug text;
-- backfill from the catalogue key in scripts/generate-seed.mjs, then:
alter table public.games alter column slug set not null;
create unique index games_slug_key on public.games (slug);
```
`scripts/generate-seed.mjs` must emit `slug` (it already knows the key it hashes).

### 3.2 Profiles keyed by base game

**The mismatch.** In the UI, answers are stored under `gameKey(game) = game.baseId ?? game.id` — "Tarkov PvP" and "Tarkov PvE" share **one** profile and one in-game username. In the DB, `game_profiles.unique (user_id, game_id)` points at `games.id`, which is the per-version row, so PvP and PvE would get separate profiles. Worse, the RLS policy `game_profiles_select` and `accept_squad_request` compare `squad_requests.game_id` to `game_profiles.game_id`; if profiles live on the base/anchor row but requests on the version row, **no inbound sender profile is ever visible** and acceptance records a null username.

**Recommendation.** `game_profiles.game_id` always references the *base* game (`coalesce(base_game_id, id)`), matching the UI. Add a helper and use it everywhere requests are matched to profiles:

```sql
create function public.base_game_id(p_game_id uuid) returns uuid
language sql stable as $$
  select coalesce(base_game_id, id) from public.games where id = p_game_id
$$;
```
Then in `game_profiles_select` and `accept_squad_request`, compare against `public.base_game_id(sr.game_id)` instead of `sr.game_id`. Add a trigger (like `enforce_reference_data_on_base_game`) rejecting a `game_profiles` row whose game is not a base game. Allies/requests keep the version row (they are "for this version tile").

**New columns the UI already collects but `game_profiles` cannot store:**

```sql
alter table public.game_profiles
  add column no_maps boolean not null default false,        -- "None — I don't know any maps yet" (gamesmanship.noMaps)
  add column specific_answers jsonb not null default '{}';  -- game-specific extras, keyed by question id (faction, raidBudget, riskTolerance, lootPriority, …)
```
Neither is used in scoring or the breakdown today, but a profile saved without them loses data the form shows. `specific_answers` is intentionally jsonb: the question set differs per game and per category (`GAME_SPECIFIC_QUESTIONS`).

Column ↔ UI mapping (all other columns already exist and fit): `skill`, `rage` stored 0–10 (UI keeps 0–100 internally and divides by 10); `role_match_preference` ↔ `roleMatchPreference`; `willing_to_chat/speak` ↔ the comms slider; `languages`, `personality`, `weapons`, `maps`, `roles`, `platform`, `in_game_username` unchanged.

### 3.3 Inbound-notifications view

One security-invoker view so the page needs a single query and RLS decides what appears. It relies on the existing `game_profiles_select` clause "they sent you a request for that game".

```sql
create view public.my_pending_request_cards with (security_invoker = true) as
select
  sr.id            as request_id,
  sr.created_at,
  g.id             as game_id,
  g.slug           as game_slug,
  g.name           as game_name,
  g.category,
  gp.in_game_username as sender_username,
  gp.weapons, gp.maps, gp.roles, gp.skill, gp.role_match_preference,
  gp.rage, gp.personality, gp.willing_to_chat, gp.willing_to_speak, gp.languages
from public.squad_requests sr
join public.games g on g.id = sr.game_id
join public.game_profiles gp
  on gp.user_id = sr.sender_id
 and gp.game_id = public.base_game_id(sr.game_id)
where sr.recipient_id = auth.uid() and sr.status = 'pending';
```
Sender status (searching / online) comes from §3.7. The per-tab and per-game counts are derived client-side from this list (volumes are small); a counts view is optional.

The **recipient's own** profile for the same base game (needed for scoring) is a plain `select` on `game_profiles` (own row — already allowed).

### 3.4 Request state machine

Found while reading the policies against the new Accept / Decline / Decline & Block buttons:

1. **Accept can be bypassed.** `squad_requests_update_recipient` lets the recipient `UPDATE` *any* column value, and `guard_squad_request_immutable` only protects the three id columns. A recipient can set `status = 'accepted'` directly, skipping `accept_squad_request` — no ally rows, no chat — or flip `declined → pending`. The rule "accepting happens only via the RPC" exists in comments but is not enforced.
2. **No re-request path.** `unique (sender_id, recipient_id, game_id)` plus no update path for the sender means a declined request can never be sent again, but the UI promises "Declined requests are hidden for 1 hour."

**Changes.**
- Tighten the transition trigger: allow only `pending → accepted | declined | blocked`, and make `accepted` reachable only from inside `accept_squad_request` (e.g. a transaction-local flag it sets via `set_config`, checked by the trigger). Everything else raises.
- Add `decline_squad_request(p_request_id)` and `decline_and_block_squad_request(p_request_id)` as security-definer functions (recipient-only, pending-only), and **revoke direct `UPDATE` on `squad_requests` from `authenticated`**. The UI's three buttons map 1:1 to the three RPCs.
- Add `send_squad_request(p_match_ref uuid)` (see §3.6) as the **only** way to create a request, and drop the `squad_requests_insert` policy. It must: reject self, require the caller to have a complete profile for the game, enforce `is_blocked`, and handle the cooldown — re-open a `declined` row to `pending` only if `updated_at < now() - interval '1 hour'`, otherwise raise a friendly error. (`blocked` never re-opens.)
- Optional: `squad_requests.declined_at timestamptz` instead of reusing `updated_at`, so a later unrelated update can't reset the 1-hour clock.

*UI note (not DB):* `AppContext.declineAndBlockSquadRequest` currently calls `blockUser(id)` with the **request** id, not a user id. When wired to the RPC this disappears — blocking is `status = 'blocked'`, as designed.

### 3.5 Server-side match score

**Why.** Both Accept paths pass `calculateMatch(...)` from the browser into `accept_squad_request(p_match_score)`. The value is stored on **both** ally rows and shown to the *other* player as their match %; a recipient could pass `100`. The function also has no range check.

**Recommended.** Port `lib/matching.ts` to a SQL function and make it the source of truth for anything stored or ranked:

```sql
create function public.calculate_match(a public.game_profiles, b public.game_profiles)
returns table (overall int, gamesmanship int, vibe_check int, comms int)
language sql immutable ...;
```
- `accept_squad_request(p_request_id)` drops the `p_match_score` parameter and computes the score from the two profiles.
- Keep `lib/matching.ts` for the on-screen breakdown. Add **parity test vectors** (a shared JSON of profile pairs → expected scores) run against both implementations; the formulas are small (Jaccard, proximity over 5, role blend, binary languages) but rounding must match.
- *Minimum fallback if porting is deferred:* keep the parameter but `check (match_score between 0 and 100)` and document that the stored score is client-asserted.

### 3.6 Anonymous discovery for `/squad-matches`

**Problem.** The squad-matches popup shows a stranger's answers. Current RLS makes that impossible, correctly: `game_profiles_select` only exposes your own, your allies', inbound senders' and *accepted* outbound recipients' rows. And widening that policy is **not** an option — it returns whole rows, including `in_game_username`, which must stay hidden until acceptance.

**Change.** A security-definer function returns candidates with **answers but no identity**, and the client can only act on a candidate through an opaque per-game reference:

```sql
create function public.find_squad_matches(
  p_game_id uuid, p_include_online boolean default false, p_limit int default 50)
returns table (
  match_ref uuid,                 -- candidate's game_profiles.id: random, per game, NOT the user id
  weapons text[], maps text[], roles text[], skill numeric, role_match_preference numeric,
  rage numeric, personality text[], willing_to_chat boolean, willing_to_speak boolean,
  languages text[], platform text,
  status text,                    -- 'searching' | 'online' (§3.7)
  score int)                      -- calculate_match(me, candidate), for ordering
language sql stable security definer set search_path = public ...;
```
It must **never** return `user_id` or `in_game_username`, and must exclude: yourself; anyone for whom `is_blocked(me, them)`; people you are already allies with for the game; pairs with a `pending` or `accepted` request either way; people who declined you within the cooldown; offline players always; and players who are `online` but not `searching` unless `p_include_online` is true (the renamed "also show players who are online" toggle, see D6). **Block exclusion is symmetric and permanent (D2):** if either side blocked the other, neither ever appears in the other's results, so a blocked user never sees the player who blocked them.

`send_squad_request(p_match_ref)` (§3.4) resolves `match_ref → user_id, game` internally.

**Why `match_ref` and not the user id.** `squad_requests.recipient_id` is readable by the sender through the table (policy `squad_requests_select`) and through `my_outbound_squad_requests` (`select *`). That lets a sender correlate "Match 03 in game A" with "Match 07 in game B" as the same account. See open decision D3.

### 3.7 Presence

Today presence is **only** Supabase Realtime (`lib/useLookingPresence.ts`): ephemeral, per tab, readable by anyone on the channel, and invisible to SQL. That cannot drive server-side filtering (§3.6), the sender status on notification cards, or ally status dots.

**SF cannot know whether someone is in a game (D6).** The only things it can observe are whether the player is in SF and whether they are actively looking for a squad. So there are exactly three statuses: `searching` (actively looking for a squad in this game), `online` (in SF, not searching), and `offline` (no fresh heartbeat; no row needed). The old `ingame` status and `statusGame` field go away.

**Player count (D4):** the "N looking" number on a game tile is the number of players who are `searching` for that game with a fresh heartbeat. Online-but-idle and offline players are not counted. The same table drives discovery, so the tile count and the squad-matches list cannot disagree.

```sql
create table public.lfg_presence (
  user_id uuid not null references public.users (id) on delete cascade,
  game_id uuid not null references public.games (id) on delete cascade,  -- base game
  status text not null check (status in ('searching', 'online')),
  last_seen_at timestamptz not null default now(),
  primary key (user_id, game_id)
);
alter table public.lfg_presence enable row level security;
create policy lfg_presence_own on public.lfg_presence
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```
- The client upserts a heartbeat every ~30–60 s (`set_presence(game, status)` RPC); a row counts as online if `last_seen_at > now() - interval '2 minutes'`; a scheduled job deletes stale rows.
- **Other people's presence is never read from the table directly.** It is exposed only through security-definer functions that apply the same visibility rules as profiles (inbound senders, allies, discovery candidates), returning status — not identity.
- Tile counts come from a security-definer `count_searching(game_id)` (or a counts view) over this table. Realtime presence is retired for counting (D4: table only). If the count feels laggy, a Realtime broadcast can be layered on top later.
- A player is `searching` in at most one game at a time unless product decides otherwise; `set_presence` should clear that user's other `searching` rows (open question for implementation, not a blocker).

### 3.8 Realtime and indexes

- Add `squad_requests` (and later `allies`, `chat_messages`) to the `supabase_realtime` publication so the bell badge and `/notifications` update the moment a request arrives, and a sender learns of accept/decline. Realtime respects RLS, so each user only receives their own rows.
- The badge query is "my pending inbound count"; replace the two single-column indexes' role for that query with a partial composite:
  ```sql
  create index squad_requests_inbound_pending_idx
    on public.squad_requests (recipient_id, game_id) where status = 'pending';
  ```

### 3.9 Allies view

The ally card already shows a "they blocked you" state (`Ally.blockedYou`) and pin/block toggles. The DB can't express those yet:
- `allies_select_own` hides the other side's row, so `blocked_you` is not readable. Provide a view/function over `allies` returning `blocked_you` (does the counterpart row have `rating = 'blocked'`) via a security-definer helper, plus presence from §3.7. (Whether blocked users should learn this at all is D2.)
- UI `pinned` ↔ `rating = 'favorite'`; UI `blocked` ↔ `rating = 'blocked'`. They are two independent booleans in the UI but one enum in the DB, so a card can't be both pinned and blocked. Either make the UI mutually exclusive (simplest) or split into `is_favorite boolean` + `rating`. The `'meh'` value is unused in the UI.

### 3.10 Chat hardening (adjacent, found while reading)

- `ally_chats_update` has no column restriction: any participant can change `squad_request_id`, not just `disappearing_messages`. Add a trigger allowing only that column to change.
- `chat_messages.expires_at` is supplied by the client (the UI sets `sentAt + 24 h` when disappearing is on). Set it in a `before insert` trigger from the chat's current `disappearing_messages`, and ignore the client value.
- Expired messages are not hidden or deleted. Add `expires_at is null or expires_at > now()` to `chat_messages_select` and a scheduled purge (`pg_cron` or the existing cron route).

---

## 4. Decisions (all six resolved)

| # | Question | Decision | What it means for the DB |
|---|---|---|---|
| D1 | Are a player's answers visible, anonymously, to everyone searching the same game (as the squad-matches popup does)? | **Yes, as built.** | `find_squad_matches` returns answers but never user id or username. Add a profile-visibility opt-out column later if wanted. |
| D2 | Does a blocked sender learn they were blocked? | **No. The sender sees the request as "declined". The blocked user must also never be able to send a request to that player, because that player will not appear on their screen.** | (a) A sender-facing view/function maps `blocked → declined`, and no sender-readable surface (including `select *` views) exposes the raw `blocked` status. (b) `find_squad_matches` and `send_squad_request` reject any pair where either side blocked the other, in both directions, permanently, with no cooldown. (c) The ally-card `blockedYou` flag stays a separate question for the allies list (§3.9) and should follow the same no-reveal principle unless product says otherwise. |
| D3 | Can the sender read the recipient's user id on outbound requests? | **Hide it.** | Column-level privileges (or a sender-facing view that omits `recipient_id`) so neither side can read the other's user id from `squad_requests`. Verify that the RLS policy expressions and security-definer functions still work once the column grants are removed, before relying on this. |
| D4 | Presence storage: table only, or table plus Realtime? | **Table only.** The player count is the number of players actively searching. | `lfg_presence` is the single source of truth for counts, discovery and card status (§3.7). Count = `status = 'searching'` with a fresh heartbeat. |
| D5 | Live sender profile or a snapshot at send time? | **Live.** | No `profile_snapshot` column. Revisit if score-gaming appears. |
| D6 | `notifications_enabled` default vs the UI toggle; what does "in-game" mean? | **SF cannot detect in-game.** Statuses are `searching`, `online` and `offline`. The toggle becomes "also show players who are online but not searching", default off. | `users.notifications_enabled` is replaced in meaning by a persisted `show_online_players boolean not null default false` (rename the column, or add it and retire the old one). Drop `ingame` and `status_game` everywhere. |

### UI follow-ups implied by these decisions (not DB work, listed so they are not missed)

- Remove the `ingame` status and `statusGame` from `MatchStatus`, `MatchPlayer`, `Ally`, `SquadRequest` and `IncomingRequest` (`lib/types.ts`), and from the mock data (`lib/mockData.ts`) and the ally, chat, incoming-request, notification and match components that render them.
- `MatchCard` / `AlliesPanel`: the green "Live — {game}" label becomes "Online"; "Searching" stays.
- `/squad-matches`: change the toggle text "Show players currently in-game (notifications on)" to match the new meaning, and update all 10 translations.
- The tile "N looking" count must count only `searching` players (already the intended meaning; confirm `useLookingPresence` semantics when it is moved to the table).
- `declineAndBlockSquadRequest` should pass the sender, not the request id, until it is wired to the RPC.

---

## 5. Suggested migration order

1. `…_slug_and_profile_base_game.sql` — §3.1, §3.2 (+ seed generator update)
2. `…_request_state_machine.sql` — §3.4 transition guard, decline RPCs, revoke direct update
3. `…_match_scoring.sql` — §3.5 (`calculate_match`, new `accept_squad_request`) with parity tests
4. `…_presence.sql` — §3.7
5. `…_discovery.sql` — §3.6 (`find_squad_matches`, `send_squad_request`, drop insert policy)
6. `…_notification_views_realtime.sql` — §3.3, §3.8, §3.9
7. `…_chat_hardening.sql` — §3.10

**Tests to write alongside (not just happy-path):**
- RLS: user B can never read user A's `in_game_username` before acceptance; `find_squad_matches` output contains no user id or username; a blocked pair appears in neither direction of discovery.
- A recipient cannot reach `accepted` except through the RPC; a declined request re-opens only after the cooldown; a `blocked` one never does.
- Score parity: the same fixture pairs give identical results in SQL and `lib/matching.ts`.
- Stored match score cannot be set by the client.

## 6. Explicitly *not* changing

- No new `notifications` table: a notification **is** an inbound pending `squad_requests` row.
- No table for score breakdowns: derived on demand from the two profiles.
- No DB support for the localhost demo seed (`MOCK_SQUAD_REQUESTS`); it is client-only and removed at launch.
