# SPEC — Launch readiness (everything Claude can do before release)

**Status: not started. Revision r2 (2026-10-31):** chat removed from the product (U-04, D-05), username bans added (D-15), scheduling gaps closed, review fixes applied. This is a new spec. It does not edit or supersede any earlier spec; it collects what is still open in them (mainly `SPEC_DB_CHANGES.md` step 5, `GAME_UPDATES.md`, `SPEC_AMENDMENT_11.md` "Phase 2") and adds what a read-through of the chats and a code audit (2026-10-31) turned up.

**Contract.** If every item below is done to its "Done when", the app is ready to release. Nothing here depends on a dashboard, console, account, DNS or third-party setting — those are deliberately not in this spec (they are listed separately on request).

**Working rules (standing, from earlier chats and memory)**
1. Never `git commit` / `git push` without an explicit go-ahead.
2. Every access/visibility rule is enforced in the database (RLS, constraints, definer RPCs), never only in a component.
3. "Launch" means the dev code is **deleted**, not hidden (`lib/launch.ts`) — see §O-16, which runs last.
4. Database work = new layered migration files + tests. Nothing is applied by this spec. Applied migration files are not rewritten (the one exception, §D-12, is guard-clause-only).
5. No secrets in code, docs, logs, commits or chat. Env var *names* only.
6. Anything that downloads a binary or an asset (browser binaries, images) is announced first and waits for a go-ahead.

**Priority.** `P0` = a signed-in stranger cannot use the product without it, or it is a security/legal hole. `P1` = must ship at launch. `P2` = in scope, last to cut if time runs out.

---

## 0. Where the app really is (audit, 2026-10-31)

| Area | State |
|---|---|
| Google + email sign-in, sign-out, password reset | **Real.** |
| Profile save / load (`game_profiles`) | **Real.** |
| Bell, `/notifications`, accept / decline / decline & block, allies (pin / block / remove), heartbeat, realtime refresh | **Real** (via `lib/db/requests.ts`). |
| **`/squad-matches` discovery** | **Mock.** `MOCK_MATCHES` + `MOCK_OPPONENT_PROFILES`; sending a request is a `Math.random() >= 0.5` coin flip after 2–4 s. `find_squad_matches`, `start_searching`, `send_squad_request` are never called. |
| **Chat** | Mock UI over unused DB tables. **Decision r2: chat is removed from the product** (U-04, D-05). After acceptance the ally's in-game username is the hand-off; players talk in-game or anywhere they choose. |
| Tile "N looking" counts | **Mock path.** Supabase Realtime presence channel; `count_searching_by_game()` unused. |
| **Game catalogue** | UI reads `lib/mockData.ts` (3,278 lines, shipped to every browser). The daily cron updates the **database**, which the UI never reads — so the cron has no visible effect. |
| `ingame` / `statusGame` / `blockedYou` | Still in types, mock data, `lib/matching.ts` and ~11 files in all (`SPEC_DB_CHANGES.md` §4 follow-ups not done). |
| Auth guard | **None.** No `middleware.ts`, no client guard. Signed-out visitors can open `/select-game`, `/notifications`. |
| Privacy / Terms pages | Exist, but **nothing links to them** (not the login page, not the footer). |
| Settings | The TopNav gear is a decorative, non-clickable icon. |
| Tests | DB tests only (`npm run test:db`). **No app tests, no CI.** |
| Error / 404 / loading pages, robots, sitemap, OG image, favicon from the logo | **None.** `squadfinder-logo.svg` is untracked in `docs/`. |
| Sentry | Env vars exist; **SDK not installed**. |
| Dependencies | `npm audit --omit=dev`: 4 vulnerabilities (1 critical, 3 high) in `next`, its bundled `postcss`, `source-map-js`. |
| Lint | 4 warnings (3 hook-deps, 1 `<img>`). `tsc` clean. |
| `README.md` | Unmodified create-next-app boilerplate. |
| Account deletion / data export / abuse reports | **None** (privacy page says "email us"). |

---

## 1. Execution order

| Phase | Items | Why this order |
|---|---|---|
| A. Foundations | O-12, O-04, O-10 (scaffold: Vitest, unit + DB-contract suites, a smoke e2e), O-11 (CI with the commands that already exist), then O-01 (so a Next upgrade has a safety net) | Tests + CI + env validation first, so everything after is checked as it lands. |
| B. Core loop becomes real | U-01, U-02, U-03, U-05, U-07, U-04 (remove chat UI), then D-05 (drop chat tables) | Without these there is no product. The tables are dropped only after no code references them. |
| C. Trust & safety | D-01, D-14, D-02, D-03, D-15, U-08, U-09, U-10, U-11, O-02, O-03, O-15 | Required before strangers can find each other. |
| D. Catalogue & cron | U-06, D-07, D-13, O-05, D-04, D-09, D-10 | Makes the daily update real and safe. |
| E. Polish | U-12 … U-19, U-20, O-06 … O-09, O-13, O-14, O-17; finish O-10 (e2e flows) and add the e2e CI job | |
| F. Cut-over | D-08 (scale plans, after the last feature migration), D-11, D-12 (need the final migration set), **O-16**, then the **§3 release gate** | Dev code is removed last because earlier phases need it for testing. |

---

## 2. Work items

## UI

### U-01 · Real discovery on `/squad-matches` `P0`
**Now:** cards come from `MOCK_MATCHES`; `useAnnounceLooking` uses a Realtime channel.
**Do:**
- On mount call `start_searching(version.id)`; on unmount / tab hide-then-leave call `stop_searching()`. The 45 s heartbeat already keeps the row fresh; a reopened page calls `start_searching` again (no stale revival).
- Load cards with `find_squad_matches(p_game_id, p_include_online, 50)`. Card = `match_ref`, answers, `status`, server `score`. **Never** show or request a user id / username (D3).
- Per-card breakdown stays client-side: `explainMatch(myProfile, candidateProfileFromRow)`. Overall / sub-scores shown come from `calculate_match` parity (`match_vectors.json`), not a second formula.
- Refresh on a 20 s timer while visible plus on realtime events; respect the function's 20 calls/min limit (back off on the rate-limit error rather than hammering).
- States: loading skeleton, "nobody is searching this game right now" empty state (with "also show players who are online" hint), error with Retry, "finish your profile first" (routes to `/build-profile`), rate-limited.
- Delete `MOCK_MATCHES`, `MOCK_OPPONENT_PROFILES`, `blockedMatchIds`, `knownAllies` snapshot (the DB already excludes allies, blocked, pending and cooldown pairs).
**Done when:** with two real test sessions' worth of rows (or a mocked RPC layer in the e2e suite) the page lists exactly what `find_squad_matches` returns, no mock import remains in the file, and nothing in the network log or DOM contains another player's user id or username.

### U-02 · Real "Request squad" flow `P0`
**Now:** `MatchCard.handleRequest` is a coin flip that calls `addAlly` locally.
**Do:**
- Button → `send_squad_request(version.id, match_ref)`. Card then follows `get_my_outbound_requests()` (`pending | accepted | declined | expired`), refreshed on realtime `request_updated` and by polling.
- `pending`: "Waiting…" with a **Withdraw** action (`withdraw_squad_request`).
- `accepted`: card reveals the username from `get_my_allies()` (copy-to-clipboard icon, as built) — this is the hand-off; there is no in-app chat. `declined`: red state, shows the UI-owned "try again in 1 hour" text (the RPC itself returns the generic error inside the cooldown). `expired`: offer "Send again".
- Generic "This player is no longer available" is a **normal** state (card greys out), not a crash. Limit errors (20 pending / 50 per day / 3 per pair per 30 days) show friendly, translated messages.
- Sending one request never blocks sending others (existing product rule).
**Done when:** the coin flip and local `addAlly` path are gone from `MatchCard`; replaying a stale `match_ref` shows the same UI for a decline and for a block (D2 — covered by an e2e test).

### U-03 · Replace the 20-second mock request popup `P1`
**Now:** `IncomingRequestPopup` + `pushIncomingRequest` are driven by nothing real; real requests live 14 days and are read in `/notifications`.
**Do:** remove the popup, `incomingRequests`, `pushIncomingRequest`, `shiftIncomingRequest`. On realtime `request_received` show a small toast ("New squad request · View") that routes to `/notifications`; the bell badge is already live.
*Decision baked in (veto if wanted):* a timed popup cannot represent a 14-day pending request.
**Done when:** no code references `IncomingRequest` / `IncomingRequestPopup`; the toast appears within 2 s of the broadcast in the e2e suite.

### U-04 · Remove chat entirely `P0`
**Why (decision r2):** in-app messaging between strangers is the largest safety, moderation and privacy surface in the product. Removing it also removes the need for message reports, retention, unread counts and chat realtime. After acceptance the ally's in-game username (already shown with a copy icon) is the hand-off.
**Now:** `app/chat/[allyId]/page.tsx`, `AppContext.chats` and the chat entry points are in-memory mocks; the DB tables are unused.
**Do:**
- Delete `app/chat/`, `getChat`, `sendMessage`, `toggleDisappearingMessages`, `pruneExpiredMessages`, the `chats` state, and the chat types / mock data (`lib/types.ts`, `lib/mockData.ts`).
- Remove every chat entry point: chat buttons/links in `AlliesPanel`, `MatchCard`, `RequestCard`, `TopNav` (and any unread badge), the disappearing-messages toggle, and all chat i18n keys in the 10 dictionaries.
- Next to a revealed username, show a short translated safety line ("Only share what you're comfortable with. You can block or report any player.").
- Drop `/chat/*` from the guard list (U-10), the Playwright flow (O-10) and the privacy/terms text (O-15).
**Done when:** no `/chat` route exists in the `next build` output; `grep -rniE "chat" app components context lib` finds only the unrelated voice-chat questionnaire answers used by matching; accepted requests still show the ally username with copy.

### U-05 · Tile counts from the database `P1`
**Now:** `useLookingCounts()` subscribes to a Realtime presence channel; `useAnnounceLooking` tracks on it.
**Do:** one `count_searching_by_game()` call on `/select-game` (refresh every 30–45 s while visible), keyed by version slug/id. Label "N searching" — never "N matches". Delete `lib/useLookingPresence.ts` and the `lfg-presence` channel.
**Done when:** no Realtime *presence* channel remains in the codebase; the catalogue page makes exactly one count request per refresh.

### U-06 · Catalogue served from the database `P1`
**Now:** `GAMES_BY_CATEGORY`, `GAME_QUESTIONS`, `GAME_SPECIFIC_QUESTIONS` (`lib/mockData.ts`) drive `GameGrid`, `ProfileForm`, notifications and the cron route itself.
**Do:**
1. Audit what `games` / `game_reference_data` can already express vs what the UI needs (version label/date, weapons by category, maps, roles + subtitles, `hasTeamFeature`, `logoUrl`, platforms, game-specific questions, translations).
2. Recommended split: **dynamic** data (versions + labels, weapons, maps, role names) is read from the database; **presentation** data that is not dynamic (game-specific question definitions, role subtitles, translations, image fallbacks) stays in code keyed by `games.slug`. A single `getCatalogue()` loader merges the two, caches in memory for the session, and revalidates on focus.
3. If the DB fetch fails, fall back to a static snapshot generated at build time from the seed (not the hand-edited `mockData.ts`), with a "showing cached game list" notice.
4. Rename/trim `mockData.ts` to what remains (presentation metadata); delete every `MOCK_*` export (see O-16).
**Done when:** changing a map name in `game_reference_data` shows in the UI after refresh with no code change; the client bundle no longer contains the full weapon/map lists as literals (verified by bundle analysis); the cron route reads its own game list from the database or the same loader.

### U-07 · Finish the status model cleanup (`SPEC_DB_CHANGES.md` §4 follow-ups) `P1`
**Do:**
- `MatchStatus = 'searching' | 'online' | 'offline'`. Remove `ingame`, `statusGame`, `resolvedStatusGame`, "Live — {game}" (becomes "Online").
- Remove `Ally.blockedYou`, `MOCK_BLOCKED_BY`, any "User has blocked you" copy, any `blocked` request status in UI types.
- Replace the toggle "Show players currently in-game (notifications on)" with "Also show players who are online" bound to `users.show_online_players` (persisted, default off). Update all 10 translations.
- `AppContext.blockUser/blockedUsers` mock state removed; blocking goes only through `block_ally` / `decline_and_block_squad_request` / `unblock_user`.
- Accept without a profile for that game routes to the questionnaire (RPC refuses).
**Done when:** `grep -rn "ingame\|statusGame\|blockedYou" app components context lib` returns nothing outside tests/migrations.

### U-08 · Settings page (replaces the decorative gear) `P1`
**Do:** `/settings`, linked from the gear in every header: language, "Also show players who are online", **Blocked players** (`get_my_blocks` → `unblock_user`), **Download my data** (D-02), **Delete my account** (U-09), Sign out, links to Privacy / Terms / Contact. Mobile-first layout, same visual language as `/notifications`.
**Done when:** every control works against the real RPCs/tables and is covered by an e2e test; the gear is a real link on every authenticated page.

### U-09 · Self-serve account deletion `P0`
**Do:** Settings → "Delete my account" → modal explaining what is removed (profiles, allies, blocks, requests) and that it is permanent → type `DELETE` to confirm → `POST /api/account/delete` (O-03; needs a sign-in within the last 10 minutes — otherwise the modal first asks the user to sign in again) → sign out → `/` with a confirmation message. Wire the privacy page text to point here.
**Done when:** after deletion, signing in with the same identity yields a brand-new empty account; the DB test in D-01 shows zero residual rows.

### U-10 · Auth guard on every app route `P0`
**Do:** one `RequireAuth` wrapper (client) used by `/select-game`, `/build-profile`, `/squad-matches`, `/notifications`, `/settings`. While `authReady` is false render a neutral splash (no flash of protected UI); with no session `router.replace('/')`. Public: `/`, `/privacy`, `/terms`, `/reset-password`. Also: when `userId` changes (sign-out, account switch, token revoked) clear `profileAnswers`, `selectedGame`, `allies`, `squadRequests`, `requestError` so nothing from the previous account survives in memory. A 401/JWT-expired RPC error triggers re-auth, not a console error.
*(The database is already the real gate — this is about not showing broken empty pages and not leaking stale in-memory state.)*
**Done when:** signed-out visits to each protected path land on `/` in the e2e suite; switching accounts in one tab shows no previous data.

### U-11 · Legal links, consent and age line `P0`
**Do:** footer on the login page and every app page: Privacy · Terms · Contact (mailto). Email sign-up shows "By creating an account you agree to the Terms and Privacy Policy" (links, translated) and the minimum-age line from the privacy page. Google's verification looks for the privacy link on the app's home page — the login page *is* the home page.
**Done when:** `/privacy` and `/terms` are one click from `/` with no JavaScript required to find the link (plain `<a>` in server-rendered markup).

### U-12 · Branding: logo as favicon, login header, share image `P1`
**Do:** move `docs/squadfinder-logo.svg` into the app (`app/icon.svg`, a generated `apple-icon`, header mark on the login card and top bars), replace the default `favicon.ico`, add an Open Graph / Twitter card image, theme colour. (Assets already exist; no downloads.)
**Done when:** tab icon, shared-link preview and login page all show the logo.

### U-13 · Error, empty, loading and offline states `P1`
**Do:** `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `loading.tsx` skeletons for notifications / settings / discovery; a small offline banner; every `catch` that currently only `console.error`s (`refreshRequests`, `refreshAllies`, profile load) shows a visible, translated message with Retry. RPC error strings never reach the user raw — map known codes/messages to translated keys and fall back to "Something went wrong. Try again."
**Done when:** forcing each RPC to fail (mocked in e2e) shows a user-readable message and a working retry; unknown routes show the 404 page.

### U-14 · Profile flow correctness `P1`
**Do:** verify end-to-end that "Find my squad" blocks until mandatory questions are answered, saves via `saveProfile`, surfaces save errors (not just throws), and that a returning user's saved profile pre-fills and skips `/build-profile` only when complete for *that* game. Cover per-game mandatory-criteria logic for **every** catalogue game with a generated test (the 2026-07-29 "logic is broken for some games" request was never confirmed closed): for each game, a profile missing any required answer must be rejected by the same function the button uses.
**Done when:** the generated test iterates the whole catalogue and passes; saving offline shows an error and keeps the form state.

### U-15 · Accessibility `P1`
**Do:** visible `:focus-visible` outline globally; keyboard-operable game tiles, cards and score chips (real `<button>`s, `Enter`/`Space`); dialogs (`ScoreBreakdownModal`, delete-account, toasts) get `aria-modal`, focus trap, focus return, `Esc`; icon-only buttons get `aria-label`; text contrast ≥ 4.5:1 (the `#4a5568` / low-opacity white greys on `#0a0b0f` fail — raise them); `prefers-reduced-motion` disables the background animations and glow; form fields have labels/`aria-describedby` for errors; `aria-live` for toasts and status changes.
**Done when:** axe-core reports **zero serious/critical** on every page at 390 px and 1440 px, and every flow is completable with keyboard only.

### U-16 · Internationalisation completion `P1`
**Do:** translate the ~180 game-specific role subtitles and ~100 `GAME_SPECIFIC_QUESTIONS` labels flagged as missing; all strings introduced by this spec in all 10 languages; set `<html lang>` from the active language and `dir="rtl"` for Arabic with logical CSS properties (`margin-inline-*`, `inset-inline-*`) so layouts mirror; map RPC errors to translated keys (U-13). **Game titles, map/weapon/faction names and usernames stay as proper nouns.** Add a script/test that fails when any `t('…')` literal lacks an entry in any of the 10 dictionaries.
**Done when:** the dictionary test passes; Arabic screenshots of login, select-game, build-profile, matches, notifications, settings show no overlap or off-screen text.

### U-17 · Responsive re-verification `P1`
**Do:** after U-01…U-09, re-check all pages at 360, 390, 768, 1024, 1440 px (the 2026-07-28 "no overlapping words, nothing off screen" rule): no horizontal scroll, no overlap, tap targets ≥ 44 px, safe-area padding for notched phones, no hydration mismatch from `useWindowWidth` (render a stable first paint, then adapt).
**Done when:** scripted screenshot sweep shows no overflow (`document.documentElement.scrollWidth <= innerWidth`) on every route/width, and the console has no hydration warnings.

### U-18 · Game images: resilient and not hot-link-fragile `P1`
**Now:** tiles hot-link Steam CDN / publisher URLs through a raw `<img>`.
**Do:** `onError` fallback to a styled placeholder (name + category colour), `referrerPolicy="no-referrer"`, `loading="lazy"`, explicit width/height (no layout shift); add `scripts/check-images.mjs` (HEAD-requests every `logoUrl`, reports dead ones) as an on-demand check; add a trademark disclaimer in the footer and Terms ("Game names and logos belong to their owners; SquadFinder is not affiliated…"). Self-hosting images is optional and needs a go-ahead per §Working rule 6.
**Done when:** blocking all image hosts in the browser still leaves a usable, nicely-labelled grid; lint's `no-img-element` warning is resolved or deliberately waived with a comment.

### U-19 · Zero lint warnings, dead code removed `P2`
**Do:** fix the 3 `react-hooks/exhaustive-deps` warnings (`GameGrid` ×2, `IncomingRequestPopup` — the latter disappears with U-03) and the `<img>` one; delete dead code: the duplicate `components/AnimatedBackground.tsx` vs `components/ui/AnimatedBackground.tsx` (the root layout *and* each page both mount one), unused mock exports, and any other export a dead-code scan (`ts-prune` or equivalent) shows is never imported.
**Done when:** `npm run lint` prints no warnings; one background animation instance is mounted per page.

### U-20 · Notifications page completeness `P2`
**Do:** show "expires in N days" on each request card (14-day expiry), a cap/"Load more" if > 50 pending, empty states per tab, and a "request is no longer available" state when accept/decline races with a withdraw/expiry (generic error → card removed with a quiet message).

---

## DB (new layered migrations + tests; nothing applied by this spec)

### D-01 · Account deletion is complete `P0`
**Do:** keep deletion in the server route (O-03, uses the admin API) but make the *database* guarantee completeness: FK `on delete cascade` audit for every table referencing `public.users` / `auth.users` — `game_profiles`, `squad_requests` (sender / recipient), `allies` (both columns), `squad_request_events` (`request_id` is `set null`; `sender_id` / `recipient_id` already cascade in migration 0500), `api_rate_limits`, `user_blocks` (both columns), `user_presence`, `lfg_presence`, reports (D-03; reporter column set null so reports stay anonymised, reported-side rows cascade). **Exception by design:** `banned_usernames` (D-15) holds no user id and survives deletion. Add a PGlite test that creates a fully-populated user (profiles, requests both ways, allies, blocks both ways, presence, events, rate-limit rows, reports), deletes it, and asserts **zero** rows reference its id anywhere, that counterparties' lists simply lose the entry, and that no counterparty is left with a dangling ally.
**Done when:** the test passes and is part of `npm run test:db`.

### D-02 · Data export `P1`
**Do:** `export_my_data()` — definer, authenticated only, returns jsonb of the caller's own rows: account fields, `game_profiles`, outbound requests (via `get_my_outbound_requests` shape, **no recipient ids**), allies (ally game username + score), blocks (label only). Added to the exact-list privilege test. Settings → "Download my data" saves it as JSON.
**Done when:** output contains no other user's id and no pre-acceptance username (asserted).

### D-03 · Abuse reports `P0`
**Why:** strangers see free-text in-game usernames; today the only recourse is block (`SPEC_DB_CHANGES.md` §4 flagged "worth a ticket").
**Do:** `reports` table (reporter id, `target_kind` enum `ally | request`, target reference, `reason` enum, `details` ≤ 1000 chars, status `open | reviewed | actioned | dismissed`, timestamps), RLS on, **no client privileges**. `report_ally(p_ally_id uuid, p_reason, p_details)` and `report_request(p_request_id, …)` definer RPCs that resolve the reported profile server-side (never exposing their user id to the reporter), rate-limited via `consume_rate_limit` (e.g. 10/day), de-duplicated per (reporter, target). View `open_reports` (reported in-game username + game, number of distinct reporters, reasons, latest details) readable only by `postgres` / service role for review in SQL. Acting on a report means `ban_username` (D-15). Reporting does **not** reveal to the reported user that a report exists (no-signal rule, §0.6). UI: "Report" in the ally card menu and on the request card, with reason picker + optional details + "also block" checkbox (calls the existing block RPC).
**Done when:** RPC tests cover privileges, rate limit, de-dupe, and that the reporter never receives a user id; UI path works in e2e.

### D-04 · Housekeeping function `P1`
**Do:** `run_housekeeping()` (definer, service-role only, no client grant) that: deletes `user_presence` / `lfg_presence` rows older than 1 day; deletes `squad_request_events` older than 90 days (caps only look back 30); deletes `api_rate_limits` windows older than 2 days; marks nothing else (reads already ignore expired rows). Returns counts as jsonb. Invoked daily by a Vercel cron route (O-13). Correctness never depends on it (reads filter on freshness/expiry).
**Done when:** test seeds old/new rows, runs it, and asserts exactly the old ones are gone and no live data is touched.

### D-05 · Drop chat from the database `P0`
**Do:** one new migration file, written so it is safe to apply only once U-04's code is deployed (no deployed code may reference the tables): drop `chat_messages` and `ally_chats` and everything that depends on them — `purge_expired_chat_messages()`, `chat_message_visible()`, their triggers, RLS policies, realtime topic policies and grants. `create or replace` every function that touches them (audit with grep; known: the accept path that creates the chat row, `remove_ally`, the block flows) and update the exact-list privilege test. Allies, requests, blocks, presence and the `user:<uid>` request broadcasts are unchanged. The migration header states that it drops tables; applying it needs the owner's go-ahead like any other migration.
**Done when:** the schema contains no chat objects; accept → ally, `remove_ally` and block tests pass unchanged apart from chat assertions; `upgrade.mjs` passes from the previous schema.

### D-06 · ~~Unread counts~~ — removed (r2)
Not needed without chat. The ID is kept so numbering stays stable.

### D-07 · Catalogue read model + drift check `P1`
**Do:** whatever U-06's audit says is missing (columns/tables for dynamic lists, `select` grants for `authenticated` only). Add `npm run check:seed`: regenerates the seed in memory from the presentation source and diffs against `supabase/seed.sql`; fails on drift. Seed must be idempotent (upserts keyed by deterministic UUIDv5 + slug) and contain **no users, profiles, requests or other demo data** (single Supabase for dev and prod).
**Done when:** running the seed twice yields identical row counts; seeding after real users exist breaks no FK; test asserts `users`, `game_profiles`, `squad_requests`, `allies`, `banned_usernames` are empty after migrations + seed.

### D-08 · Query plans and indexes at scale `P1`
**Do:** `supabase/tests/scale.mjs` generates e.g. 50k users / 50k profiles / 200k requests / 500k events in PGlite and runs `EXPLAIN` on `find_squad_matches`, `get_my_pending_request_cards`, `get_my_allies`, `count_searching_by_game`, `get_my_outbound_requests`. Fail if any plan seq-scans `game_profiles`, `squad_requests`, `squad_request_events` or `lfg_presence` for a selective filter; add the missing indexes in a new migration. Record before/after timings in the spec's changelog.
**Done when:** every listed plan uses an index and the relative timings are written down.

### D-09 · PII minimisation `P1`
**Now:** `handle_new_user` copies Google `full_name` and `avatar_url` into `public.users`; the UI shows neither.
**Do:** if nothing reads them, stop copying them and null the existing values in a migration (and drop the columns if unused). Confirm no function or view returns `display_name` / `avatar_url` to another user. Keep only what the product needs.
**Done when:** a test signs up a user with metadata and asserts those fields are not persisted; privacy text (O-15) matches.

### D-10 · Moderation-friendly `show_online_players` and defaults `P2`
**Do:** verify the column exists with default `false`, is updatable only by its owner via a column-restricted policy/RPC, and add it to the export (D-02). Add a CHECK/trigger that `display_name` (if kept) is length-limited.

### D-11 · Squash for fresh projects `P1`
**Do:** `scripts/build-sql-bundle.mjs` → `supabase/bundle/all_migrations.sql` (concatenated in order + seed, with a header comment). Test: applying the bundle to an empty PGlite yields a schema identical (tables, columns, policies, grants, functions) to applying the files one by one. (Today a fresh project needs one run per migration file, 14 and growing — and the dashboard flags several as "destructive".)
**Done when:** schema-equality test passes; bundle regenerates deterministically.

### D-12 · Safe to re-run `P1`
**Why:** re-running a file already applied fails (`policy "users_select_own" … already exists`, 2026-10-31).
**Do:** guard clauses only — `drop policy if exists`, `create or replace`, `if not exists`, `do $$ … exception when duplicate_object` for types — in every migration that lacks them. **Behaviour-identical**; no logic changes to applied files. Test: run the full migration set twice on one database; second pass must succeed and `pg_dump`-style schema comparison must be unchanged.
**Done when:** double-run test passes.

### D-13 · Cron audit trail can be undone `P2`
**Do:** add `status` (`applied | reverted`) to `game_updates` and a service-role-only `revert_game_update(id)` that removes the added weapon/map/role or restores the previous label. Pairs with the cron dry-run (O-05).
**Done when:** test applies an update, reverts it, and the catalogue equals its prior state.

### D-14 · Auth-trigger resilience `P1`
**Do:** test that `handle_new_user` is idempotent (`on conflict do nothing` already) and that a failure inside it cannot block sign-up (wrap non-essential work in an exception handler); test duplicate sign-ups for the same identity.

### D-15 · Username bans `P0`
**Decision r2:** a ban targets the *in-game username string*, not the account. The account keeps working (it can still sign in, delete itself, export its data); it simply cannot use that name.
**Do:**
- `normalize_username(text)`: NFKC, lower-case, strip whitespace and zero-width characters. Look-alike (homoglyph) evasion is out of scope.
- `banned_usernames (id, username_norm, game_id null, reason, created_at)` — `game_id` null = all games; unique on (`username_norm`, `game_id`). RLS on, **no client privileges**, holds **no user id** (so it survives account deletion by design, D-01).
- `ban_username(p_username, p_game_id default null, p_reason)` and `unban_username(id)` — definer, `postgres` / service role only. `ban_username` also expires pending requests involving a matching profile and clears its presence rows.
- Enforcement in the database: a trigger on `game_profiles` rejects a banned name with the generic "That username isn't available" error; `find_squad_matches`, `send_squad_request`, `accept_squad_request`, `get_my_allies` and the request-card RPCs treat a banned profile as absent, whether it is the sender or the recipient ("no longer available", no signal that a ban exists).
- Privacy text (O-15) discloses the list; the runbook (O-14) documents ban / unban.
**Done when:** tests cover: ban hides the profile from discovery, requests and ally lists for everyone else; the banned user cannot save the name (case and spacing variants included); per-game scope works; unban restores; the row survives deleting the account that held the name.

---

## Everything else (security, ops, quality, docs, cut-over)

### O-01 · Dependency security `P0`
**Do:** get `npm audit --omit=dev` to zero high/critical. `npm audit fix` for `source-map-js`; for `next` / bundled `postcss` upgrade to the newest patched 14.2.x if one exists, otherwise assess exploitability (advisories are about attacker-controlled CSS/source maps — build-time) and, if still flagged, plan the upgrade to the current supported Next major with a full regression (App Router, React 19, the unit, DB-contract and smoke-e2e suites from the O-10 scaffold as the safety net). Also upgrade the deprecated ESLint 8 toolchain flagged in every Vercel build log. Add Dependabot config (O-11).
**Done when:** audit clean (or each remaining finding documented as not reachable in `docs/SECURITY_NOTES.md`); `tsc`, lint, build, all tests green.

### O-02 · Security headers and CSP `P0`
**Do:** `headers()` in `next.config.mjs`: `Content-Security-Policy` (default-src 'self'; connect-src the Supabase URL + its websocket; img-src 'self' data: plus the image hosts actually used; script-src `'self' 'unsafe-inline'` (decision r2: no nonces, so `/privacy` and `/terms` stay statically rendered and the O-08 targets stay reachable); the Sentry ingest host in `connect-src` when `NEXT_PUBLIC_SENTRY_DSN` is set; frame-ancestors 'none'; form-action 'self'; base-uri 'self'), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation off), `Cross-Origin-Opener-Policy`. Report-only for one full test pass first, then enforce.
**Done when:** a sweep of every page and flow (including Google OAuth redirect, email links, realtime, images) produces zero CSP violations in the console, and the headers are asserted in a test.

### O-03 · Server routes: account delete, health, hardened cron `P0`
**Do:** 
- `POST /api/account/delete`: verify the caller's access token with Supabase (never trust a body user id), require that the token's latest sign-in (`amr` timestamp) is ≤ 10 minutes old, else 401 `reauth_required`; call the admin delete for *that* user only, rate-limit via DB, return JSON; service-role key only on the server (O-04 guards this).
- `GET /api/health`: 200 + `{ok, db}` using a cheap anon read; no secrets, no version leakage.
- Cron routes: compare `Authorization` with `crypto.timingSafeEqual`, fail closed when the secret is missing, reject non-GET, return no internal detail on error.
**Done when:** tests for: no token → 401; stale sign-in → 401 `reauth_required`; token for user A cannot delete user B; cron with wrong/missing secret → 401; health works with Supabase unreachable (reports `db:false`, still 200/503 as specified).

### O-04 · Secrets hygiene `P0`
**Do:** `.env.example` (names only, with comments); `scripts/check-secrets.mjs` scanning tracked files **and** git history for key shapes (service-role / secret keys, `GOCSPX-`, `sk-`, `sbp_`, JWT-looking blobs, tokens in URLs) wired into CI; a test that greps the production build output (`.next/static`) and fails if any server-only env *value* appears; untrack `tsconfig.tsbuildinfo` and add it to `.gitignore` (it is tracked and churns every commit); add `import 'server-only'` to every server-only module.
**Done when:** scanner is clean on the working tree and history (or each hit is listed for rotation in the report to the owner); build-bundle test passes.

### O-05 · Make the daily game-update cron safe and fair `P1`
**Now:** never run against the real API; `web_search_20250305` tool type untested; "the same games are always the ones skipped" when time runs out; writes AI output to the live catalogue.
**Do:** rotate the processing order (start at `dayOfYear % n`; no new column needed) so every game gets a turn; `?dry=1` mode that validates and returns the diff without writing; `GAME_UPDATES_ENABLED` kill switch; per-run caps (additions per kind already 25; add total token/cost ceiling and per-run game cap); log token usage; verify model id, tool type and response shape against the current API docs (claude-api reference) and cover with unit tests using a recorded-fixture mock client; keep "additions + label changes only, never deletes"; never send user data to the model (game names only — state this in the privacy text).
**Done when:** mocked-client tests pass for happy path, malformed JSON, injection-looking content in search results (must be rejected by the existing validators), timeout/partial progress, and rotation fairness across 3 consecutive simulated days.

### O-06 · Error monitoring (Sentry) `P1`
**Do:** install `@sentry/nextjs`; `instrumentation.ts`, client/server/edge configs, `global-error` hook, source-map upload at build **only when the auth env vars exist**; everything no-ops cleanly when `NEXT_PUBLIC_SENTRY_DSN` is absent (local dev, tests). Privacy: no session replay, `sendDefaultPii: false`, `beforeSend` strips usernames, emails, request bodies and RPC arguments; sample rate 0.1 for traces. Cron and API routes report failures with a tag.
**Done when:** a thrown test error in each runtime is captured by a mocked transport with the PII filter proven by a unit test; build succeeds with and without the env vars.

### O-07 · SEO and metadata `P1`
**Do:** root `metadata` (title template, description, `metadataBase` from env, Open Graph, Twitter card, icons, theme colour); `app/robots.ts` (allow `/`, `/privacy`, `/terms`; disallow `/api` and app routes), `app/sitemap.ts`, `app/manifest.ts` (name, icons, standalone display); per-page titles for `/privacy`, `/terms`. App routes get `noindex`.
**Done when:** `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` serve; page `<title>`s are distinct; the share image renders at the expected size.

### O-08 · Performance budget `P1`
**Do:** bundle analysis (`@next/bundle-analyzer`, on-demand); after U-06 confirm the catalogue literals leave the client bundle; code-split `ScoreBreakdownModal` and settings; remove duplicate animated backgrounds (U-19) and pause animations when the tab is hidden; avoid re-rendering the whole `AppContext` tree on every heartbeat (split context or memoise the value); measure with Lighthouse on `/` and `/select-game` (mobile profile).
**Done when:** Lighthouse mobile ≥ 90 for Performance on `/`, ≥ 85 on `/select-game`; Accessibility, Best Practices, SEO ≥ 95 on public pages; first-load JS per route recorded in the report.

### O-09 · Auth hardening in code `P1`
**Do:** map Supabase auth errors (rate-limited email sends, unconfirmed email, wrong credentials, expired link, weak password) to friendly translated messages and never reveal whether an email is registered on reset/sign-in; keep the 30 s resend cooldown; password min 8 (already) plus a client-side common-password check and a visible show/hide toggle; OAuth/email redirect targets built from a single allow-listed origin helper (no user-controlled `next` params); evaluate `flowType: 'pkce'` for the OAuth return and, if adopted, show a clear message when an email-confirmation link is opened in a different browser than the one that signed up.
**Done when:** a table-driven test maps each Supabase error code to the expected message; no message differs between "unknown email" and "known email" on reset.

### O-10 · App test suite `P1` *(prerequisite — scaffold in Phase A, flows finished in Phase E)*
**Do:** 
- **Unit (Vitest):** `lib/matching.ts` against the shared `match_vectors.json` (the SQL side already runs those vectors — this closes the parity loop in CI); `profileAnswers` ⇄ `saveProfile` / `loadProfileAnswers` round-trip; every `lib/db/*` wrapper with a mocked client (row→model mapping, error mapping); i18n completeness; generated "required answers" test for every game (U-14).
- **DB contract (Vitest + PGlite):** a small adapter exposes `rpc()` and the few `.from().select/insert/update` shapes the wrappers use over the PGlite test database, so every `lib/db/*` wrapper runs against the real migrations (catches column / return-shape drift that mocked clients cannot).
- **Component (Testing Library):** `RequestCard` (accept / decline / decline & block), `ScoreBreakdownModal` (focus trap, Esc), `ProfileForm` gating, `RequireAuth`, `EmailAuthForm` error mapping.
- **End-to-end (Playwright) with network interception** of Supabase REST/RPC/auth so no real accounts or data are used: login renders, dev-bypass absent when the flag is unset, guard redirects, onboarding → discovery → send request → pending → accepted (username revealed) → report → block → settings → delete account (incl. the re-sign-in prompt) → sign out; plus the failure and empty states from U-13. *Installing browser binaries needs a go-ahead (Working rule 6).*
**Done when:** `npm test` (unit + component + DB contract) and `npm run test:e2e` pass locally and in CI; coverage of `lib/matching.ts`, `lib/db/*`, `lib/profileAnswers.ts` ≥ 90 % lines.

### O-11 · CI and dependency automation `P1` *(prerequisite)*
**Do:** `.github/workflows/ci.yml` on pull requests and pushes to `main`: install (cached), `tsc --noEmit`, `next lint` (warnings = failure), `npm run test:db`, `npm test`, `npm run check:seed`, `npm run check:secrets`, `next build`, `npm audit --omit=dev --audit-level=high`; e2e job (headless) on PRs. `dependabot.yml` for npm (weekly, grouped) and GitHub Actions. Required-status wiring is a repo setting and is not part of this spec. Each step is added in the phase where its command first exists (`check:seed` with D-07, e2e with O-10's flows); the workflow never references a missing script.
**Done when:** workflow runs green on a clean checkout (validated locally with `act` or an equivalent dry run) and every command in it exists in `package.json`.

### O-12 · Env validation and config `P1` *(prerequisite)*
**Do:** `lib/env.ts` validates required variables at boot (client: the two public Supabase values; server: service-role, cron secret, Anthropic key where used) and throws one readable error naming the missing variable, replacing today's `process.env.X!` assertions in `lib/supabase/client.ts`. `NEXT_PUBLIC_SITE_URL` used for metadata and redirects. Document every variable in `.env.example` and the README.
**Done when:** starting the app with a variable missing prints which one; a unit test covers each branch.

### O-13 · Vercel config `P1`
**Do:** add the housekeeping cron (daily) next to `update-games` in `vercel.json` (stay within Hobby-plan limits: daily frequency, `maxDuration ≤ 300`, two cron jobs); a `GET /api/cron/housekeeping` that calls `run_housekeeping()` and returns the counts; both guarded per O-03.
**Done when:** `vercel.json` validates against the schema and a local invocation with the secret returns the counts.

### O-14 · Documentation `P1`
**Do:** rewrite `README.md` (what it is, architecture diagram of UI ⇄ Supabase RPCs ⇄ cron, env vars by name, scripts, how to run the DB tests, how migrations are layered, local dev flags); add `docs/ARCHITECTURE.md`, `docs/SECURITY_NOTES.md` (threat model in brief: D1–D10 decisions, RLS/RPC inventory, no-signal rules), `docs/RUNBOOK.md` (what each cron does and how to disable it, how to revert a game update, how to review reports and ban a username, how to roll back a bad deploy), and `docs/README.md` — an index that marks every older spec **Implemented / Superseded / Open** (old specs themselves are not edited).
**Done when:** a new contributor can go from clone to green tests using only the README.

### O-15 · Privacy Policy and Terms match the shipped product `P0`
**Do:** update `app/privacy` and `app/terms` text to describe what the app really does: answers shown anonymously to players searching the same game (D1); username shown only after acceptance, after which players communicate off-platform (the app stores no messages); 14-day request expiry, presence rows and their lifetime; blocks, reports (reviewed by a person) and the banned-username list (D-15: a username string with no link to any account, kept for safety even after account deletion); sub-processors (hosting, database/auth, Google sign-in, error monitoring; cron sends only game names to an AI provider and no user data); account deletion in-app and data export; minimum age; trademark disclaimer (U-18); "Last updated" date; contact address already in the file. Keep both pages server-rendered, readable without JavaScript, translated headings.
**Done when:** every data practice in the code is mentioned and every claim in the text is true of the code (checked item-by-item in the PR).

### O-17 · Maintenance switch `P2`
**Do:** `NEXT_PUBLIC_MAINTENANCE_MODE=true` renders a static "back soon" page for all routes except `/privacy` and `/terms`, so a bad release can be neutralised without a rollback. Absent = off.
**Done when:** unit test of both states.

### O-16 · LAUNCH CUT-OVER — delete all dev features `P0` *(do last)*
Required by the standing rule: *launch = delete, not hide.*
**Do:**
1. Delete `lib/launch.ts` and every `SHOW_DEV_FEATURES` block: login "Enter Without Login (Dev)" bypass, "Returning user (demo)" toggle, AppContext demo-seeding effect.
2. Delete `app/db-smoke-test/`.
3. Delete every `MOCK_*` export and import (`MOCK_SQUAD_REQUESTS`, `MOCK_BLOCKED_BY`, `MOCK_MATCHES`, `MOCK_OPPONENT_PROFILES`, `MOCK_ALLIES`, …) and the "no `userId` → in-memory behaviour" branches in `AppContext` (`addAlly`, local `removeAlly`/pin/block, local accept/decline, `setIsReturningUser` demo path).
4. Remove `NEXT_PUBLIC_SHOW_DEV_FEATURES` from `.env.example` and docs.
5. Keep test-only helpers under `supabase/tests/` and the e2e mocks under `tests/` (they never ship).
**Done when:** `grep -rniE "SHOW_DEV_FEATURES|MOCK_|db-smoke|Enter Without Login|Returning user \(demo\)|dev bypass" app components context lib` returns nothing; the same grep over `.next/static` after `next build` returns nothing; the login page in a production build with every env var set to its most permissive value shows no developer controls.

---

## 3. Release gate (all must pass, in this order, on the final tree)

| # | Check | Command / method |
|---|---|---|
| 1 | Types | `npx tsc --noEmit` → 0 errors |
| 2 | Lint | `npm run lint` → 0 errors, **0 warnings** |
| 3 | DB | `npm run test:db` (existing + D-01…D-15 tests, double-run, bundle equality, scale plans) |
| 4 | App | `npm test` → all green (unit, component, DB contract), coverage thresholds met |
| 5 | Seed / secrets | `npm run check:seed`, `npm run check:secrets` → clean |
| 6 | Dependencies | `npm audit --omit=dev --audit-level=high` → clean |
| 7 | Build | `next build` succeeds with the Sentry vars present **and** absent |
| 8 | Bundle | no server-only env value in `.next/static`; no `MOCK_`/dev strings (O-16 grep) |
| 9 | E2E | `npm run test:e2e` → all flows green (mocked network) |
| 10 | A11y | axe-core: zero serious/critical on every page, 390 px and 1440 px; keyboard-only run of the main flow |
| 11 | Responsive | overflow sweep at 360 / 390 / 768 / 1024 / 1440 px clean; RTL (Arabic) sweep clean |
| 12 | CSP | zero violations across all flows with enforcing CSP |
| 13 | Performance | Lighthouse targets from O-08 recorded |
| 14 | Docs | README, ARCHITECTURE, SECURITY_NOTES, RUNBOOK, docs index present and accurate |
| 15 | Working tree | nothing uncommitted that should be; **no commit or push happens without the owner's go-ahead** |

When rows 1–15 are green, this spec is complete.

---

## 4. Decisions baked in (flag any you want changed before work starts)

1. The 20 s mock request popup is replaced by a toast + the existing bell (U-03).
2. Catalogue: dynamic lists from the database, presentation metadata in code, static build-time snapshot as fallback (U-06).
3. Game titles and in-game names are never translated (U-16).
4. No analytics and no third-party trackers → no cookie banner is needed; Sentry runs without replay or PII (O-06).
5. Reports are reviewed through a SQL view, not an admin UI (D-03).
6. Hosting assumptions are the Vercel Hobby limits (daily crons, 300 s functions).
7. Account deletion hard-deletes everything, including the other side's copy of an ally relationship (consistent with D10).
8. Minimum age stays at the 13 already stated on the privacy page. Removing chat is the mitigation for the stranger-safety concern; worth a legal read before launch.
9. Chat is removed entirely (U-04, D-05). After acceptance players continue off-platform using the revealed in-game username.
10. Bans are at the username level, not the account (D-15). Known limitation: a banned player can choose a different username.
11. Account deletion requires a sign-in within the last 10 minutes (O-03).
12. The client ⇄ RPC contract is tested by running the `lib/db/*` wrappers against PGlite (O-10).
13. CSP uses `'unsafe-inline'` for scripts rather than nonces, to keep legal pages static (O-02).
