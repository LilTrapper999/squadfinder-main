# SquadFinder — Spec Update 02
> Amends `SQUADFINDER_SPEC.md` Screen 4 (Squad Matches). Apply after all previous spec files.

---

## SCREEN 4 — Squad Matches (`/squad-matches`) — Full Replacement

Replace the entire Screen 4 section in `SQUADFINDER_SPEC.md` with the following.

---

### Layout

- 3-column grid, full viewport width, max content width ~1200px centred
- Cards ordered **strictly by overall match percentage, descending, left-to-right, top-to-bottom** — best match is always top-left
- Card order: `MATCH 01` (top-left) → `MATCH 02` (top-centre) → `MATCH 03` (top-right) → `MATCH 04` (second row left) → etc.
- Page heading: `YOUR SQUAD AWAITS` — full main heading treatment (pulsing amber glow + float animation + all-caps, per Section C1 of SPEC_UPDATE_01)
- Selected game + version shown as a badge top-right of the heading row

---

### Match Card Naming

Cards are named `MATCH 01`, `MATCH 02`, etc. — no usernames, no real names.

- Style: Rajdhani, bold, large — treat as a subheading with pulsing glow treatment (per Section C2 of SPEC_UPDATE_01)
- Format: `MATCH 01` not `Match #1` — zero-padded two digits, no hash symbol
- The number reflects rank order by match percentage — `MATCH 01` is always the highest overall score

---

### Player Status Badge

Every card shows a live status indicator below the match name. Three possible states:

**State 1 — In-game (currently playing):**
```
● Live — Battlefield 6
```
- Dot colour: bright green `#22c55e`
- Text: `Live — {Game Name}` in green
- This state shows when the player's client is actively running a game session

**State 2 — On the website (searching):**
```
● Searching for a squad
```
- Dot colour: amber `#e8a020`
- Text: `Searching for a squad` in amber
- This state shows when the player is on SquadFinder but not in-game

**State 3 — Offline / not active:**
```
● Offline
```
- Dot colour: muted grey `rgba(255,255,255,0.3)`
- Text: `Offline` in muted grey
- Card is visually dimmed: `opacity: 0.5`
- All interaction buttons disabled on offline cards
- Offline cards still show in the list — they are not hidden

> **Prototype mock:** Hardcode a mix of statuses across the 8 mock cards. Suggested: 3 in-game, 2 searching, 3 offline. The in-game status should show a plausible game name matching the selected game category.

> **Future logic note (do not implement in prototype):** Real status detection uses a presence system similar to Discord's Game SDK or a WebSocket heartbeat. When the user is active on the site, their status is set to `searching`. When their connected game client is detected as running, status updates to `in-game + game name`. This requires a desktop companion app or browser extension in a future phase.

---

### Match Card — Full Anatomy

```
┌─────────────────────────────────┐
│  MATCH 01              [status] │  ← card header: name left, status badge right
├─────────────────────────────────┤
│  Overall Match                  │
│  ████████████████░░░  87%       │  ← overall bar, traffic light colour
├─────────────────────────────────┤
│  Gamesmanship    ██████████ 92% │
│  Vibe Check      ████████░░ 78% │
│  Role Compat.    █████████░ 91% │
│  Schedule Match  ████████░░ 85% │  ← removed per E1 (no schedule questions)
│  Comms Style     ███████░░░ 70% │
├─────────────────────────────────┤
│  [Request to Squad]             │  ← CTA, disabled by default
└─────────────────────────────────┘
```

> Note: Remove "Schedule Match" as a sub-score since schedule questions were removed from the profile (per SPEC_UPDATE_01 Section E1). Sub-scores should only reflect questions that were actually answered.

**Sub-score categories (revised):**
- Overall Match
- Gamesmanship (playstyle alignment)
- Vibe Check (personality / rage meter alignment)
- Role Compatibility (complementary roles)
- Comms Style (communication preference alignment)

---

### Traffic Light Colour Scheme

Apply to ALL bars (overall and sub-scores):

| Score | Colour | Hex |
|-------|--------|-----|
| 90–100% | Bright green | `#22c55e` |
| 80–89% | Soft green | `#86efac` |
| 70–79% | Yellow | `#facc15` |
| 60–69% | Amber | `#f97316` |
| Below 60% | Red | `#ef4444` |

Bar background (unfilled portion): `rgba(255,255,255,0.08)`
Bar height: `6px`, border-radius: `3px`
Score percentage shown as text to the right of each bar, coloured to match the bar.

---

### Card Interaction States

#### State 1 — Default (unselected)
- Normal card style: `background: #1a1d26`, `border: 1px solid rgba(255,255,255,0.08)`
- `Request to Squad` button: **disabled**, greyed out

#### State 2 — Selected (clicked)
- Card border changes to: `2px solid #e8a020`
- Subtle amber background tint: `rgba(232,160,32,0.05)`
- `Request to Squad` button: **enabled**, full amber style
- Only one card can be selected at a time — clicking a new card deselects the previous

#### State 3 — Request Sent
- Button replaced with a status badge: `✓ Request Sent`
- Badge style: muted, non-interactive
- Small note appears below badge:
  > `They can see your username. You won't see theirs until they accept.`
- Card border returns to normal (deselected) — request sent state is indicated by the badge only

#### State 4 — Accepted
- Badge changes to: `✓ Squad Accepted`
- Badge colour: bright green `#22c55e`
- All other cards on the page enter a locked state with overlay text: `Already Squadded Up`
- Page-level banner appears at top (full width, amber): `YOU'RE IN A SQUAD!` — placeholder for now, full squad screen comes in a later phase
- No further requests can be sent while in this state

#### State 5 — Declined
- Badge changes to: `✗ Declined`
- Badge colour: red `#ef4444`
- A countdown timer appears below the badge, counting down 60 seconds:
  ```
  Try again in 0:47
  ```
  - Timer text: muted white, small (12px)
  - Updates every second via `setInterval`
  - Once timer hits `0:00`, the badge resets to `Request to Squad` (re-enabled) and the card returns to the default unselected state
  - Timer is per-card — declining from MATCH 03 starts a 60s cooldown only on MATCH 03

#### State 6 — Already Squadded Up (locked)
- Applied to all non-accepted cards once any acceptance occurs
- Cards dimmed: `opacity: 0.4`
- Button replaced with static text: `Already Squadded Up`
- No interaction possible

---

### Recipient View (Future Logic — Document Now, Implement Later)

> Do not implement in prototype. Spec here for reference during DB design phase.

When a request is sent to a match:
- The recipient sees the **sender's username** in their notifications/requests panel
- The sender sees only `MATCH 02` — never the recipient's username
- If the recipient **accepts**: both players can now see each other's usernames
- If the recipient **declines**: sender sees `✗ Declined` + 60s cooldown. Recipient's identity remains hidden
- Once a player is in an accepted squad, their profile is locked from receiving or sending further requests until they leave the squad

---

### Privacy Footer

Persistent footer at the bottom of the page (below all cards):

> `Usernames are hidden until both players accept. Declined requests expire after 60 seconds.`

Style: muted, small (12px), centred, `color: rgba(255,255,255,0.3)`

---

### Mock Data for Prototype

Update `mockData.ts` with the following 8 mock match objects, ordered by `overall` score descending:

```ts
export const MOCK_MATCHES = [
  { id: 'match-01', label: 'MATCH 01', overall: 94, gamesmanship: 96, vibe: 91, roleCompat: 95, comms: 93, status: 'ingame', statusGame: 'Escape from Tarkov' },
  { id: 'match-02', label: 'MATCH 02', overall: 88, gamesmanship: 90, vibe: 85, roleCompat: 88, comms: 89, status: 'searching', statusGame: null },
  { id: 'match-03', label: 'MATCH 03', overall: 83, gamesmanship: 80, vibe: 88, roleCompat: 82, comms: 84, status: 'ingame', statusGame: 'Escape from Tarkov' },
  { id: 'match-04', label: 'MATCH 04', overall: 79, gamesmanship: 75, vibe: 82, roleCompat: 80, comms: 78, status: 'offline', statusGame: null },
  { id: 'match-05', label: 'MATCH 05', overall: 74, gamesmanship: 78, vibe: 70, roleCompat: 76, comms: 71, status: 'searching', statusGame: null },
  { id: 'match-06', label: 'MATCH 06', overall: 68, gamesmanship: 65, vibe: 72, roleCompat: 67, comms: 70, status: 'offline', statusGame: null },
  { id: 'match-07', label: 'MATCH 07', overall: 61, gamesmanship: 63, vibe: 58, roleCompat: 62, comms: 60, status: 'ingame', statusGame: 'Arena Breakout: Infinite' },
  { id: 'match-08', label: 'MATCH 08', overall: 55, gamesmanship: 52, vibe: 58, roleCompat: 54, comms: 57, status: 'offline', statusGame: null },
];
```

---

## Summary of Changes to Original Spec (Screen 4)

| Area | Change |
|------|--------|
| Card naming | Anonymous usernames → `MATCH 01`, `MATCH 02` etc. |
| Card order | Fixed → sorted descending by overall match %, left-to-right |
| Grid | 2-column → 3-column |
| Status badge | Added — Live (in-game), Searching, Offline |
| Offline cards | Dimmed but visible, buttons disabled |
| Sub-scores | Removed Schedule Match (no schedule questions in profile) |
| Request sent note | Added — "They can see your username, you can't see theirs" |
| Declined state | Added — `✗ Declined` badge + 60s visual countdown per card |
| Accepted state | Added — all other cards lock with `Already Squadded Up` |
| Squad state | Added — `YOU'RE IN A SQUAD!` banner placeholder |
| Recipient visibility | Documented for future phase — sender username shown to recipient only on accept |
| Privacy footer | Added |
