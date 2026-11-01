# SquadFinder

Find players who match your style for the game you are about to play. You answer a short questionnaire per game, the database scores you against everyone who is searching the same game right now, and you see them **anonymously** (answers and a match percentage, no name). Send a squad request; if they accept, you both get each other's in-game username and continue **off-platform**. The app stores no messages.

Next.js 14 (App Router) · React 18 · TypeScript · Supabase (Postgres, Auth, Realtime) · deployed on Vercel.

## How it fits together

```
 Browser (Next.js client)                         Vercel                         Supabase
┌───────────────────────────┐                ┌───────────────────┐        ┌──────────────────────────┐
│ pages, context, i18n      │── RPC / REST ─▶│ (static pages,    │        │ Postgres + RLS           │
│ lib/db/*  (typed RPCs)    │   (anon key +  │  security headers,│        │  definer RPCs = the API  │
│ Realtime: user:<uid>      │◀─ user JWT) ───┼─ maintenance mw)  │        │  presence, requests,     │
└───────────────────────────┘                │                   │        │  allies, blocks, reports │
                                             │ /api/account/delete ──────▶│ Auth admin (service key) │
                                             │ /api/cron/housekeeping ───▶│ run_housekeeping()       │
                                             │ /api/cron/update-games ───▶│ catalogue + game_updates │
                                             │ /api/health               │        └──────────────────────────┘
                                             └───────────────────┘
```

Every rule about who can see or do what lives in the database (row-level security and `security definer` functions). The UI only reflects it. Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/SECURITY_NOTES.md](docs/SECURITY_NOTES.md).

## Run it locally

Requirements: Node 20 or newer (CI uses 22) and a Supabase project (free tier is fine).

```bash
npm ci
cp .env.example .env.local     # at least the Supabase URL and anon key; see "Environment" below
npm run dev                    # http://localhost:3000
```

A fresh Supabase project needs its schema once: open the SQL editor and run **`supabase/bundle/all_migrations.sql`** (every migration plus the seed in one file; safe to run twice). Existing projects apply the individual files in `supabase/migrations/` with the Supabase CLI instead. Then enable the Google provider and add your site URL (and `/reset-password`, `/settings`) to the redirect allow-list under Authentication. [docs/RUNBOOK.md](docs/RUNBOOK.md) has the full checklist.

## Check your work

Nothing below needs a database or network; the database tests run on an in-process Postgres (PGlite).

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # zero warnings allowed
npm test               # unit + client/RPC contract tests (vitest)
npm run test:db        # migrations, RLS, RPCs, upgrade path, SQL bundle, query plans at scale
npm run check:secrets  # secret-shaped strings in files and git history
npm run check:seed     # supabase/seed.sql matches lib/mockData.ts
npm run build          # production build
```

CI (`.github/workflows/ci.yml`) runs exactly these, then scans the browser bundle for server-only variable names. `.github/workflows/e2e.yml` runs the Playwright specs in `e2e/` against a production build; Playwright is installed by that job only (`npm i --no-save @playwright/test`), it is not a dependency of the project.

Extras: `npm run test:scale` (`SCALE_USERS=50000` for a bigger run), `npm run check:images` (HEAD-requests every game logo, needs network), `npm run bundle:sql` (rebuild the SQL bundle after changing a migration), `npm run seed:generate` (rebuild `supabase/seed.sql`).

## Environment

Names only; values never go in the repo. `.env.example` lists them with comments.

| Variable | Where | What |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Project URL and public (anon/publishable) key |
| `NEXT_PUBLIC_SITE_URL` | client | Canonical origin for metadata, sitemap and auth redirects |
| `NEXT_PUBLIC_MAINTENANCE_MODE` | client | `true` = back-soon page everywhere except `/privacy` and `/terms` |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Account deletion and the cron jobs. Never prefix with `NEXT_PUBLIC_` |
| `CRON_SECRET` | server | Bearer secret the cron routes require; they refuse everything when it is unset |
| `ANTHROPIC_API_KEY` | server | `/api/cron/update-games` only |
| `GAME_UPDATES_ENABLED`, `GAME_UPDATES_MAX_GAMES`, `GAME_UPDATES_MAX_TOKENS` | server | Stop switch and per-run caps for the game update |
| `CSP_MODE` | server | `enforce` turns the Content-Security-Policy on (default is report-only) |

## How the database is layered

`supabase/migrations/` holds the original five files and then one new, dated file per change; applied files are never edited. Each layer ends with the behaviour it introduced, and `supabase/tests/run.mjs` exercises all of it (`upgrade.mjs` proves an existing database upgrades without losing data; `bundle.mjs` proves the one-file bundle equals the files applied one by one). Reference data (games, weapons, maps, roles) comes from `lib/mockData.ts` through `scripts/generate-seed.mjs`; the daily update job can add to it afterwards, and the app overlays those additions at runtime.

## Where things are

| Path | Contents |
|---|---|
| `app/` | Pages, API routes (`app/api`), metadata files, error pages, `middleware.ts` is at the repo root |
| `components/` | UI; `components/ui` holds shared pieces (dialog, error banner, footer) |
| `context/` | App state (session, requests, allies), i18n, catalogue |
| `lib/db/` | Typed wrappers around the RPCs; the only place the client talks to the database |
| `lib/server/` | Server-only code (cron auth, admin client, account deletion, game updates) |
| `lib/i18n/` | Ten languages; strings are keyed by their English source text |
| `supabase/` | Migrations, seed, SQL bundle, database tests |
| `e2e/` | Playwright specs (not run by `npm test`) |
| `docs/` | Architecture, security notes, runbook, and the historical specs (see `docs/README.md`) |

## Translations

Write user-visible text as `t('English source')` or `<T>English source</T>`. `tests/unit/i18n.test.ts` fails when a literal has no entry in all ten languages; add them to a file under `lib/i18n/dict/` (registered in `lib/i18n/dict/index.ts`). Game titles and in-game names are never translated.

## Operating it

[docs/RUNBOOK.md](docs/RUNBOOK.md): what each cron does and how to stop it, reverting a game update, reviewing reports and banning a username, rolling back a deploy, the maintenance switch.
