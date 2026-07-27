# SquadFinder — Spec Update 03
> Amends Screen 4 (`/squad-matches`) from `SPEC_UPDATE_02.md`. Apply after all previous spec files.

---

## SECTION A — Page Layout Overhaul

The Squad Matches page is now a **two-panel layout**:

```
┌─────────────────┬───────────────────────────────┐
│                 │                               │
│   ALLIES        │   SQUAD MATCHES               │
│   (2/5 width)   │   (3/5 width)                 │
│                 │                               │
│   independent   │   3-column match grid         │
│   scroll        │   (col count uses 0.6 rule    │
│                 │    calculated on 3/5 width)   │
└─────────────────┴───────────────────────────────┘
```

- Left panel: `width: 40%` — Allies tab
- Right panel: `width: 60%` — Match cards grid
- Both panels are full viewport height
- Left panel scrolls independently (`overflow-y: auto`)
- Right panel scrolls independently (`overflow-y: auto`)
- A `1px solid rgba(255,255,255,0.08)` divider separates the two panels

---

## SECTION B — Allies Panel (Left, 2/5)

### B1. Panel Header
- Label: `YOUR ALLIES` — subheading treatment (pulsing glow, per SPEC_UPDATE_01 Section C2)
- Ally count shown next to header: e.g. `YOUR ALLIES (3)` — updates dynamically

### B2. Ally Card Dimensions
- Width: `90%` of the allies panel width, centred horizontally (`margin: 0 auto`)
- Height: `calc(100vh / 7)` — exactly 1/7 of total screen height
- `border-radius: var(--border-radius-lg)` or `8px`
- `background: #1a1d26`
- `border: 1px solid rgba(255,255,255,0.08)`
- `margin-bottom: 8px`

### B3. Ally Card Content
Each ally card contains (left to right):

```
┌──────────────────────────────────────────────┐
│  [PFP]  Username          ● Live — EFT       │
│         Overall: 87%                         │
└──────────────────────────────────────────────┘
```

- **PFP (avatar):** Dark square (`background: #0a0b0f`, `border: 1px solid rgba(255,255,255,0.1)`), containing the letters `PFP` centred in Rajdhani, muted (`color: rgba(255,255,255,0.2)`). Fixed size: `40×40px`
- **Username:** Visible in full — allies have accepted so identity is revealed. Rajdhani, white, 14px
- **Overall match %:** Below username, small (12px), coloured per traffic light scheme
- **Status badge:** Top-right of card — same three states as match cards (Live / Searching / Offline), same colours

### B4. Empty State
If no allies yet:
```
No allies yet.
Accept a squad request and add them as an ally to see them here.
```
Centred, muted text, `opacity: 0.4`

### B5. Mock Ally Data
Pre-populate 3 mock allies in prototype:
```ts
export const MOCK_ALLIES = [
  { id: 'ally-01', username: 'ShadowRook', overall: 94, status: 'ingame', statusGame: 'Escape from Tarkov' },
  { id: 'ally-02', username: 'GhostDelta7', overall: 88, status: 'searching', statusGame: null },
  { id: 'ally-03', username: 'IronVeil', overall: 76, status: 'offline', statusGame: null },
];
```

---

## SECTION C — Match Cards (Right Panel, 3/5) — Changes

### C1. Request Button Always Active
Remove the previous two-step interaction (click card to select → then enable button).

- `Request to Squad` button is **always enabled** on every card (except offline cards and locked states)
- Clicking the button directly sends the request — no card selection step required
- Remove all selected card state styling (amber border on click, background tint on click)
- Hover state on the button itself is sufficient affordance

### C2. Username Revealed on Accept
Once a match accepts a request:
- The card's `MATCH 01` label is **replaced** with the player's actual username
- Username style: Rajdhani, amber `#e8a020`, same size as the match label
- The `✓ Squad Accepted` badge remains below

### C3. Add as Ally Button
After a request is accepted, a second button appears below `✓ Squad Accepted`:
- Label: `+ Add as Ally`
- Style: secondary button — transparent background, `1px solid #e8a020`, amber text
- On click: player is added to the Allies panel (left side updates immediately)
- Button changes to `✓ Added as Ally` (disabled, muted) after clicking — cannot add twice

---

## SECTION D — Incoming Request Popup

### D1. Trigger
When another player sends a squad request to the current user, a popup appears. If multiple requests arrive, they queue — dismiss one and the next appears automatically.

### D2. Popup Layout

```
         ┌───────────────────────────────┐
         │                               │
         │  MATCH REQUEST                │  ← heading, pulsing amber glow
         │                               │
         │  [PFP]  Username              │
         │         ● Live — EFT          │
         │         Overall Match: 87%    │
         │                               │
         │  ┌─────────┐ ┌─────────────┐ │
         │  │ Decline │ │Decline+Block│ │
         │  └─────────┘ └─────────────┘ │
         │  ┌─────────┐ ┌─────────────┐ │
         │  │ Accept  │ │Accept+Ally  │ │
         │  └─────────┘ └─────────────┘ │
         │                               │
         │  ████████████████░░  18s      │  ← auto-expire countdown bar
         └───────────────────────────────┘
```

### D3. Popup Dimensions
- Width: `1/3 of viewport width` (`width: 33vw`, min `320px`)
- Height: `1/6 of viewport height` minimum (`min-height: calc(100vh / 6)`) — expands to fit content if needed
- Centred horizontally and vertically on screen
- `position: fixed`, `z-index: 1000`

### D4. Backdrop
- Full-screen dark overlay behind popup: `background: rgba(0,0,0,0.75)`
- Overlay covers entire page — rest of screen is non-interactive while popup is open
- Popup has an amber glow: `box-shadow: 0 0 40px rgba(232,160,32,0.4), 0 0 80px rgba(232,160,32,0.15)`
- Glow pulses using the same `@keyframes` as subheadings (SPEC_UPDATE_01 Section C2) but applied to `box-shadow` instead of `text-shadow`

### D5. Popup Content
- **Heading:** `MATCH REQUEST` — main heading treatment (pulsing glow + all-caps)
- **PFP:** Same `40×40px` dark square with `PFP` letters as ally cards
- **Username:** Sender's username — visible to recipient
- **Status:** Live status badge (same three states)
- **Overall match %:** Traffic light coloured percentage

### D6. Four Action Buttons

| Button | Style | Outcome |
|--------|-------|---------|
| `Decline` | Outlined, muted white | Request rejected. Sender sees `✗ Declined` + 60s cooldown. Popup dismisses. |
| `Decline & Block` | Outlined, red `#ef4444` | Request rejected. Sender's card disappears permanently from recipient's matches. Popup dismisses. |
| `Accept` | Filled, amber `#e8a020` | Request accepted. Sender's card shows `✓ Squad Accepted` + username revealed. Popup dismisses. |
| `Accept & Add as Ally` | Filled, bright green `#22c55e` | Same as Accept, plus sender is immediately added to recipient's Allies panel. Popup dismisses. |

Buttons arranged in a 2×2 grid at the bottom of the popup.

### D7. Auto-Expire Countdown
- A progress bar at the bottom of the popup counts down 20 seconds
- Bar starts full width, drains left-to-right over 20 seconds
- Bar colour transitions from amber → red as it drains:
  - 20s–10s: amber `#e8a020`
  - 10s–0s: red `#ef4444`
- Text next to bar shows remaining seconds: `18s`, `17s` etc.
- At `0s`: popup auto-dismisses, request expires, next queued request appears (if any)
- Expired requests: sender sees no state change — request simply never gets a response (no `Declined` badge, no cooldown). Treat as ignored.

### D8. Queue Behaviour
- Requests queue in order received (FIFO)
- After dismissing (any action or auto-expire), next request in queue appears immediately with a fresh 20s countdown
- Queue length indicator shown in popup header if queue > 1: `MATCH REQUEST (2 more waiting)`

### D9. Prototype Mock
Simulate the popup in the prototype with a trigger button somewhere on the page:
- Add a small dev-only button: `[ Simulate Incoming Request ]` — bottom of page, muted, small
- Clicking it fires a mock popup with a fake sender using mock data
- This button does not appear in production

---

## SECTION E — Block Behaviour

When a user selects `Decline & Block`:
- The blocked player's card is **removed immediately and permanently** from the matches grid
- No `Blocked` label shown — the card simply no longer exists
- The blocked player has no indication they have been blocked
- This is stored in user state for future DB phase: `blockedUsers: string[]`

---

## SECTION F — Updated Mock Data

Add request queue state and ally state to `AppContext`:

```ts
interface AppState {
  // ... existing state
  allies: Ally[];
  incomingRequests: IncomingRequest[];  // queue, FIFO
  blockedUsers: string[];               // permanently hidden
  squadStatus: 'searching' | 'in-squad' | null;
}

interface IncomingRequest {
  id: string;
  senderUsername: string;
  senderStatus: 'ingame' | 'searching' | 'offline';
  senderStatusGame: string | null;
  overallMatch: number;
  expiresAt: number;  // timestamp, Date.now() + 20000
}

interface Ally {
  id: string;
  username: string;
  overall: number;
  status: 'ingame' | 'searching' | 'offline';
  statusGame: string | null;
}
```

---

## SECTION G — Summary of Changes from SPEC_UPDATE_02

| Area | Change |
|------|--------|
| Page layout | Single panel → two-panel (allies left 2/5, matches right 3/5) |
| Allies panel | New — independent scroll, ally cards at 1/7 screen height, 90% panel width |
| Ally card | PFP letters placeholder, username, overall %, status badge |
| Request button | Two-step (select then click) → always active, single click |
| Username on accept | Added — MATCH label replaced with real username on acceptance |
| Add as Ally button | Added — appears after acceptance, one-time action |
| Incoming request | New popup — 1/3 width, 1/6 height, centred, amber glow, darkened backdrop |
| Popup actions | Decline / Decline & Block / Accept / Accept & Add as Ally |
| Auto-expire | 20s countdown bar, amber → red, FIFO queue for multiple requests |
| Block behaviour | Card disappears permanently, no indication to blocked user |
| Dev simulate button | Added for prototype testing of incoming request popup |
