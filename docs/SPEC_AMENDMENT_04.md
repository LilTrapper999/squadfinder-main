# SquadFinder — Spec Amendment 04
> Covers: status filtering, multiple requests, weapon categories, map accuracy, animated background fix, subheading animation fix, login button fix, homepage Find Squad button. Apply after all previous spec files.

---

## FIX 1 — Status Filtering on Matches Page

### Rule
The matches list on `/squad-matches` must only show players whose status is `searching`. All other statuses are hidden entirely — no dimming, no greying out, no offline cards.

| Status | Show in matches list? |
|--------|----------------------|
| `searching` | ✅ Yes |
| `ingame` | ❌ No — hidden unless notifications enabled (Phase 2) |
| `offline` | ❌ No — hidden always |

### Notification Gate (prototype mock)
In the prototype, simulate the notification permission state with a toggle in `AppContext`:

```ts
notificationsEnabled: boolean  // default: false
```

- If `false`: only `searching` players show in the matches list
- If `true`: `searching` AND `ingame` players show. `offline` still hidden always

Add a small visible toggle on the matches page for demo purposes:
```
[ ] Show players currently in-game (notifications on)
```
- Unstyled dev toggle, bottom of page, small and muted
- Toggling it live-filters the matches list
- Label it with a comment in code: `// Prototype only — replace with real Web Notifications permission in Phase 2`

### Mock Data Update
Update `MOCK_MATCHES` in `mockData.ts` so that the default view (notifications off) shows at least 4 visible cards. Ensure at least 4 mock matches have `status: 'searching'`.

```ts
export const MOCK_MATCHES = [
  { id: 'match-01', label: 'MATCH 01', overall: 94, gamesmanship: 96, vibe: 91, roleCompat: 95, comms: 93, status: 'searching', statusGame: null },
  { id: 'match-02', label: 'MATCH 02', overall: 88, gamesmanship: 90, vibe: 85, roleCompat: 88, comms: 89, status: 'searching', statusGame: null },
  { id: 'match-03', label: 'MATCH 03', overall: 83, gamesmanship: 80, vibe: 88, roleCompat: 82, comms: 84, status: 'searching', statusGame: null },
  { id: 'match-04', label: 'MATCH 04', overall: 79, gamesmanship: 75, vibe: 82, roleCompat: 80, comms: 78, status: 'searching', statusGame: null },
  { id: 'match-05', label: 'MATCH 05', overall: 74, gamesmanship: 78, vibe: 70, roleCompat: 76, comms: 71, status: 'ingame', statusGame: 'Escape from Tarkov' },
  { id: 'match-06', label: 'MATCH 06', overall: 68, gamesmanship: 65, vibe: 72, roleCompat: 67, comms: 70, status: 'ingame', statusGame: 'Arena Breakout: Infinite' },
  { id: 'match-07', label: 'MATCH 07', overall: 61, gamesmanship: 63, vibe: 58, roleCompat: 62, comms: 60, status: 'offline', statusGame: null },
  { id: 'match-08', label: 'MATCH 08', overall: 55, gamesmanship: 52, vibe: 58, roleCompat: 54, comms: 57, status: 'offline', statusGame: null },
];
```

With notifications off: matches 01–04 visible (all `searching`)
With notifications on: matches 01–06 visible (searching + ingame)
Matches 07–08 always hidden (offline)

---

## FIX 2 — Multiple Simultaneous Requests

### Rule
The user can send `Request to Squad` to as many visible match cards as they want at the same time. There is no limit.

### First-Come-First-Served
- Each card independently fires the 50/50 mechanic with its own 2–4s random delay
- Whichever card resolves as `accepted` first locks all other cards immediately
- Cards that were still in `Waiting...` state when another card accepts → instantly change to `Already Squadded Up`
- Cards that had already shown `✗ Declined` before another card accepts → remain as `✗ Declined` (hidden for session)

### Implementation
Use a shared `squadAccepted` boolean in `AppContext`. The moment any card sets it to `true`, all other cards read it and lock.

```ts
// AppContext
squadAccepted: boolean  // default false
acceptedMatchId: string | null  // which card was accepted
```

```ts
// In each card's response handler:
if (appContext.squadAccepted && cardId !== appContext.acceptedMatchId) {
  setCardState('locked');  // Already Squadded Up
  return;
}
```

### Button State Per Card
Each card independently tracks its own request state:

| Card State | Button Label | Button Enabled |
|------------|-------------|----------------|
| Default | `Request to Squad` | ✅ |
| Waiting | `Waiting... ⟳` (pulsing) | ❌ |
| Accepted | `✓ Squad Accepted` | ❌ |
| Declined | `✗ Declined` (hidden for session) | N/A |
| Locked | `Already Squadded Up` | ❌ |

---

## FIX 3 — Weapon Categories

### Rule
In the Build Profile weapons question (`GAME_QUESTIONS[gameId].weapons`), weapons must be grouped under category subtitles. The weapons checkbox list is not a flat list — it is a categorised list with a visible subtitle above each group.

### Display Format
```
ASSAULT RIFLES
☐ AK-74M
☐ M4A1
☐ HK 416A5

MARKSMAN RIFLES
☐ RSASS
☐ DVL-10
☐ MK-18

SNIPER RIFLES
☐ SV-98
☐ Mosin-Nagant

SUBMACHINE GUNS
☐ MP5
☐ PP-19 Bizon
...
```

### Category Subtitle Style
- Text: all-caps, `font-size: 11px`, `letter-spacing: 0.1em`
- Colour: amber `#e8a020`
- Subheading animation treatment: pulsing glow + float (per SPEC_UPDATE_05 Section B1)
- `margin-top: 16px` above each subtitle (except the first), `margin-bottom: 6px` below

### Data Structure in mockData.ts
Replace the flat `weapons: string[]` array with a categorised structure:

```ts
interface WeaponCategory {
  category: string;      // e.g. 'Assault Rifles'
  weapons: string[];     // exact in-game names
}

// Per game:
weapons: WeaponCategory[]

// Example for EFT:
weapons: [
  {
    category: 'Assault Rifles',
    weapons: ['AK-74M', 'AK-101', 'M4A1', 'HK 416A5', ...]
  },
  {
    category: 'Marksman Rifles',
    weapons: ['RSASS', 'DVL-10', 'MK-18', ...]
  },
  // ...
]
```

### Standard Category Names
Use these category names consistently across all games where applicable. Only include a category if the game actually has weapons of that type:

- Assault Rifles
- Marksman Rifles
- Sniper Rifles (Bolt-Action)
- Sniper Rifles (Semi-Auto)
- Submachine Guns
- Light Machine Guns
- Shotguns
- Pistols
- Revolvers
- Carbines
- Battle Rifles
- Melee
- Bows & Crossbows
- Launchers
- Special / Exotic

Game-specific categories are allowed where the above don't fit (e.g. EFT has `Grenade Launchers` as a standalone category).

---

## FIX 4 — Map Accuracy: Deep Research Requirement

### Rule
Every map name in `GAME_QUESTIONS[gameId].maps` must be a real, currently playable, standalone map — not a sub-area, landmark, named location, or point of interest within a larger map.

### Research Standard
For every game, Claude Code must:

1. Visit the game's official wiki map list page
2. For each map name found, verify it by asking: **"Is this a selectable map from the game's map/match lobby screen?"**
3. If yes → include it
4. If no (it is a named area within a map, e.g. "Port" is part of Customs in EFT, not a standalone map) → exclude it
5. Cross-reference with the game's official site or patch notes to confirm the map is currently available in the active game mode (ranked, casual, or equivalent)

### Specific Traps to Avoid

**Escape from Tarkov:**
- ✅ Correct maps: Customs, Interchange, Reserve, Shoreline, Woods, Streets of Tarkov, Lighthouse, Ground Zero, Factory (Day), Factory (Night), The Lab
- ❌ Not maps: Port (area of Customs), Dorms (area of Customs), Ultra Medical (area of Interchange), Black Bishop (area of Reserve)

**Counter-Strike 2:**
- ✅ Correct: Mirage, Inferno, Dust2, Anubis, Nuke, Vertigo, Ancient, Overpass, Train, Cache (verify current active pool at implementation)
- ❌ Not maps: Long A, B site, Mid, Pit — these are callouts within maps

**VALORANT:**
- ✅ Correct: Abyss, Ascent, Bind, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset (verify current active ranked pool)
- ❌ Not maps: A site, B Lobby, Attacker Spawn — these are callouts

**Hunt: Showdown 1896:**
- ✅ Correct: Bayou, Mammon's Gulch (verify any new maps added at implementation)
- ❌ Not maps: Stillwater Bayou, Lawson Delta — these are the old names superseded by the 1896 update. Use current names only

**Rainbow Six Siege:**
- Only include maps currently in the ranked/standard rotation
- Do not include maps that are in the pool but marked as "in rework" and temporarily removed
- Source: official Ubisoft seasonal patch notes

### Search Instruction for Claude Code
For every map name before adding it to the list, run an internal check:
> *"Search: [map name] [game name] — is this a selectable map from the match lobby?"*

If the search result suggests it is a sub-area or callout, discard it. Only add it if confirmed as a full selectable map.

### Data Structure
```ts
maps: string[]  // flat list, exact in-game names as shown in the map selection screen
```

Maps do not need categories (unlike weapons) — a flat alphabetical list is correct.

---

## FIX 5 — Animated Background Not Visible

### Root Cause Prevention
The animated geometric background specified in SPEC_UPDATE_05 Section A was likely not rendering due to z-index stacking or the SVG not being mounted at root level. Apply the following fixes explicitly:

### Fix A — Mount at Root Layout
The background component must be the **first child** inside the root layout's body, before any page content:

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AnimatedBackground />  {/* MUST be first, always */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
```

### Fix B — Z-Index Enforcement
```css
/* AnimatedBackground component root element */
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
}

/* Every page wrapper must sit above it */
.page-wrapper {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}
```

Every page component must wrap its content in a `<div className="page-wrapper">`. Without `position: relative` and `z-index: 1`, the background will render on top of or behind content incorrectly.

### Fix C — Background Must Not Be Transparent on Body
Ensure the `<body>` background is set to the app's base dark colour so the SVG lines are visible against it:

```css
body {
  background-color: #0a0b0f;
  margin: 0;
  padding: 0;
}
```

If `body` has no background colour, the SVG lines may render against a white default background and be invisible.

### Fix D — SVG Line Opacity
Ensure the SVG lines have sufficient opacity to be visible. If lines were set too low, increase:

```css
/* Minimum visible opacity for lines */
stroke: rgba(232, 160, 32, 0.15);  /* at rest */
/* Pulsing up to: */
stroke: rgba(232, 160, 32, 0.30);  /* at peak of animation */
```

If lines were previously at `0.08` or lower, they may have been invisible on dark backgrounds. `0.15` minimum at rest.

---

## FIX 6 — Subheading Animation: Global CSS Fix

### Root Cause Prevention
Subheading animation was not applying globally because the `.sub-heading` class was not being applied consistently. Fix this at the CSS/component level:

### Fix A — Global CSS Class in globals.css
Add the following to `globals.css` (or equivalent global stylesheet). This ensures ANY element with `.sub-heading` class gets the animation automatically, regardless of which component renders it:

```css
/* globals.css */

@keyframes subPulse {
  0%, 100% { text-shadow: 0 0 4px rgba(232, 160, 32, 0.25); }
  50%       { text-shadow: 0 0 14px rgba(232, 160, 32, 0.7), 0 0 28px rgba(232, 160, 32, 0.2); }
}

@keyframes subFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-2px); }
}

.sub-heading {
  animation: subPulse 3s ease-in-out infinite,
             subFloat 4s ease-in-out infinite;
  display: inline-block; /* required for transform to work on inline elements */
}

/* Main heading — stronger, faster */
@keyframes headingPulse {
  0%, 100% { text-shadow: 0 0 8px rgba(232, 160, 32, 0.4); }
  50%       { text-shadow: 0 0 24px rgba(232, 160, 32, 0.9), 0 0 48px rgba(232, 160, 32, 0.3); }
}

@keyframes headingFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-3px); }
}

.main-heading {
  animation: headingPulse 2.5s ease-in-out infinite,
             headingFloat 3s ease-in-out infinite;
  display: inline-block;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e8a020;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
}
```

### Fix B — Audit Every Component
Claude Code must do a full pass of every component file and ensure:
- Every section label, panel header, question label, card label, group title, and descriptive heading has `className="sub-heading"` (or equivalent Tailwind + CSS module equivalent)
- Every primary page heading has `className="main-heading"`
- No heading or label anywhere in the app is plain unstyled text

**Checklist of elements that must have `.sub-heading`:**
- Sidebar category labels (`Extraction Shooters`, `Competitive FPS`, `FPS`)
- Version panel header (`LOCK YOUR PATCH`)
- Game grid header (`CHOOSE YOUR BATTLEFIELD` — actually `.main-heading`)
- Build profile question labels (all of them)
- Weapon category subtitles
- Squad matches sub-score labels (`Gamesmanship`, `Vibe Check` etc.)
- Allies panel header (`YOUR ALLIES` — `.main-heading`)
- Squad/Allies section divider labels (`YOUR SQUAD`, `ALLIES`)
- Homepage sidebar section labels
- Any label above a checkbox group, slider, or toggle
- Card field labels (`Overall Match`, `Status` etc.)

---

## FIX 7 — Login Button Fix

### Rule
The Google login button on `/` must always navigate the user to the correct next page. It must never be a dead button.

### Implementation

```tsx
// Login page component
const [isReturningUser, setIsReturningUser] = useState(false);

const handleLogin = () => {
  if (isReturningUser) {
    router.push('/home');
  } else {
    router.push('/select-game');
  }
};
```

The button must call `handleLogin` via `onClick`. It must not be a `<form>` submit, an `<a>` tag without an href, or a button with no handler.

### Demo Toggle
The returning user toggle below the button:

```tsx
<label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
  <input
    type="checkbox"
    checked={isReturningUser}
    onChange={(e) => setIsReturningUser(e.target.checked)}
    style={{ marginRight: '6px' }}
  />
  Returning user (demo)
</label>
```

- Unchecked (default) → login goes to `/select-game`
- Checked → login goes to `/home`

Add a code comment: `// Demo only — replace with real OAuth + DB user lookup in Phase 2`

### Button Must Always Be Clickable
Ensure the Google login button has:
- `onClick={handleLogin}` — not `onSubmit`, not `href`
- No `disabled` attribute
- No CSS `pointer-events: none`
- `cursor: pointer` on hover

---

## FIX 8 — Homepage: Find Your Squad Button

### Placement
Below the `ALLIES` section in the left sidebar on `/home`, add a `FIND YOUR SQUAD` button.

- Position: below the last ally card, `margin-top: 16px`, centred in the sidebar (`margin: 16px auto 0`)
- Width: `90%` of sidebar width (same as cards)

### Style
Full main heading button treatment:
- Label: `FIND YOUR SQUAD`
- Font: Rajdhani bold, 16px, all-caps
- Border: `2px solid #e8a020`
- Background: transparent
- Text colour: `#e8a020`
- Animation: pulsing amber glow + float (`.main-heading` treatment applied to button text)
- Hover: background fills to `rgba(232,160,32,0.12)`, glow intensifies
- Transition: `all 0.2s ease`
- `cursor: pointer`

### Behaviour
On click: navigates to `/squad-matches`

```tsx
<button
  className="find-squad-btn"
  onClick={() => router.push('/squad-matches')}
>
  FIND YOUR SQUAD
</button>
```

---

## Summary of All Fixes

| Fix | Area | Change |
|-----|------|--------|
| 1 | Matches page | Hide offline + in-game players. Show searching only. Notification toggle for demo |
| 2 | Matches page | Unlimited simultaneous requests. First acceptance wins, locks all others |
| 3 | Build profile | Weapons organised under animated category subtitles. New WeaponCategory data structure |
| 4 | Build profile | Maps deep research — must be selectable lobby maps only, not sub-areas or callouts |
| 5 | Global | Animated background mounted at root, z-index fixed, opacity increased, body bg set |
| 6 | Global CSS | Subheading animation in globals.css, full component audit, every label gets class |
| 7 | Login page | Google button always navigates. Demo toggle works. No dead buttons |
| 8 | Homepage | FIND YOUR SQUAD button below allies section, navigates to /squad-matches |
