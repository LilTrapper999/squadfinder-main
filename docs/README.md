# Documentation index

**Start here:** the repository [README](../README.md) (run it, test it, configure it), then [ARCHITECTURE](ARCHITECTURE.md), [SECURITY_NOTES](SECURITY_NOTES.md) and [RUNBOOK](RUNBOOK.md). The files below that start with `SPEC_` or `MATCHING_` are the historical build specs. They are not edited; this table says where each stands today.

Legend: **Implemented** means the code does what it describes. **Superseded** means a later decision replaced it, so the text no longer describes the product. **Open** means part of it is still to do.

## Current

| Document | What it is |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Data model, RPC API, request lifecycle, discovery, server routes |
| [SECURITY_NOTES.md](SECURITY_NOTES.md) | Threat model, access inventory, no-signal rules, dependency audit, known limits |
| [RUNBOOK.md](RUNBOOK.md) | Setup checklist, cron jobs and how to stop them, reverting updates, reports and bans, rollback |
| [GAME_UPDATES.md](GAME_UPDATES.md) | The daily catalogue update job |
| [SPEC_LAUNCH_READINESS.md](SPEC_LAUNCH_READINESS.md) | The launch-readiness plan and its changelog (section 5). **Implemented**, with the open items listed below |

## Historical specs

| Spec | Status | Notes |
|---|---|---|
| [SQUADFINDER_SPEC.md](SQUADFINDER_SPEC.md) | **Implemented**, parts **superseded** | The original product spec. Mock data, the "Enter Without Login" bypass and chat no longer exist |
| [MATCHING_LOGIC_SPEC.md](MATCHING_LOGIC_SPEC.md) | **Implemented** | Scoring lives in `lib/matching.ts` and, identically, in the SQL `calculate_match`; shared test vectors keep them equal |
| [SPEC_DB_CHANGES.md](SPEC_DB_CHANGES.md) | **Implemented** | Its own header says so; decisions D1 to D10 are still the reference. D8 and D10 mention chat, which was later removed |
| [SPEC_UPDATE_01.md](SPEC_UPDATE_01.md) to [SPEC_UPDATE_05.md](SPEC_UPDATE_05.md) | **Implemented**, parts **superseded** | Select-game, squad-matches and allies layout, background animation. Anything about chat, mock requests or the 20-second popup was replaced by a toast and the notification bell |
| [SPEC_AMENDMENT_01a.md](SPEC_AMENDMENT_01a.md), [03](SPEC_AMENDMENT_03.md), [06](SPEC_AMENDMENT_06.md), [09_REVISED](SPEC_AMENDMENT_09_REVISED.md) | **Implemented** | Logo sourcing, weapon-name accuracy and source reliability for game data. Logo URLs are still hot-linked (see open items) |
| [SPEC_AMENDMENT_02.md](SPEC_AMENDMENT_02.md), [05](SPEC_AMENDMENT_05.md), [07](SPEC_AMENDMENT_07.md), [08](SPEC_AMENDMENT_08.md) | **Implemented** | Slider labels, UX sounds, profile-page fixes, CSS rewrite |
| [SPEC_AMENDMENT_04.md](SPEC_AMENDMENT_04.md) | **Superseded** | Status filtering on matches; discovery now works from presence in the database (D4, D6) |
| [SPEC_AMENDMENT_10.md](SPEC_AMENDMENT_10.md) | **Implemented** | Comms score is language only |
| [SPEC_AMENDMENT_11.md](SPEC_AMENDMENT_11.md) | **Implemented**, chat part **superseded** | Accepting a request creates the ally automatically; the chat described there was removed (D-05) |

Statuses were assigned during the launch-readiness work from the shipped code and the later specs; the old specs were not re-audited line by line.

## Open items after launch readiness

Each is recorded with its reason in [SPEC_LAUNCH_READINESS.md](SPEC_LAUNCH_READINESS.md) section 5.

- Next 16 and React 19 upgrade (the audit findings are not reachable from this app; see SECURITY_NOTES).
- Error monitoring (Sentry), together with the matching line in the privacy policy.
- Playwright suites and the accessibility and performance audits (axe, Lighthouse) have not been run; signed-in flows need a Supabase test project.
- Translations of the per-game role subtitles and question labels (game titles and in-game names are never translated by design).
- Game logos are hot-linked from Steam and publisher sites; `npm run check:images` lists the dead ones (the tile shows a labelled placeholder meanwhile).
