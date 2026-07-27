# SquadFinder — Spec Update 05
> Covers: 50/50 request mechanic, post-acceptance flow, animated background, homepage (Page 4), subheading animation upgrade, ally invite flow. Apply after all previous spec files.

---

## SECTION A — Animated Background (Global — All Pages)

### A1. Apply To
Every page in the app must have the animated background. It applies to all areas where there is no interactive content — it sits behind everything as a fixed full-screen layer.

### A2. Style — Geometric Glowing Lines
- **Colour:** Dark amber/gold lines — `rgba(232, 160, 32, 0.12)` at rest, pulsing up to `rgba(232, 160, 32, 0.25)` — subtle enough to never compete with foreground content
- **Style:** Circuit-board / geometric aesthetic — straight lines with 90° turns, occasional node dots at intersections, sparse not dense
- **Animation:** Lines slowly draw themselves and fade in a loop. Use SVG `stroke-dashoffset` animation or CSS `@keyframes` on opacity + transform
- **All page content sits above this layer** — the background is purely decorative, `pointer-events: none`, `z-index: 0`. All content is `z-index: 1` or higher
- **Performance:** Use a single fixed SVG or Canvas element for the background, not per-component. Attach it once in the root layout file so it persists across all pages without re-mounting

```css
.animated-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}
```

```css
@keyframes lineDraw {
  0%   { stroke-dashoffset: 1000; opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
```

- Each line animates independently with staggered `animation-delay` values so they don't all pulse in sync
- Node dots at intersections pulse with a separate `@keyframes` at slower speed
- Total number of lines: 12–18 across the full viewport — sparse, not a full grid

---

## SECTION B — Subheading Animation Upgrade (Global — All Pages)

### B1. Revised Rule — Subheadings Now Animated AND Glowing

Replaces Section C2 of SPEC_UPDATE_01. Every subheading across the entire site now receives both:
1. **Pulsing amber glow** (text-shadow, as before)
2. **Float animation** (same `translateY` keyframe as main headings, but smaller range: `-2px` instead of `-3px`, slower: `4s` instead of `3s`)

```css
@keyframes subFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-2px); }
}

.sub-heading {
  animation: subPulse 3s ease-in-out infinite,
             subFloat 4s ease-in-out infinite;
  color: rgba(255, 255, 255, 0.85);
}
```

This applies to every element previously classed as `.sub-heading` across all pages. Main headings retain their existing stronger, faster animation. The visual hierarchy is maintained by:
- Main headings: larger text, stronger glow, faster float (`3s`), all-caps punchy copy
- Subheadings: smaller text, softer glow, slower float (`4s`), sentence case

---

## SECTION C — Squad Matches Page: 50/50 Request Mechanic

### C1. Remove Simulate Button
Remove the `[ Simulate Incoming Request ]` dev button added in SPEC_UPDATE_03 Section D9. It is no longer needed.

### C2. 50/50 Auto-Response on Request Sent
When the user clicks `Request to Squad` on any match card, the outcome is determined automatically by a random coin flip:

```ts
const accepted = Math.random() >= 0.5;
```

- **Response delay:** 2–4 seconds after clicking (randomised with `setTimeout`) — simulates a real person responding
- During the delay: button shows a pulsing `Waiting...` state with an amber spinner

**If accepted (50%):**
- Card shows `✓ Squad Accepted`
- Username is revealed (replaces `MATCH 0X` label)
- `+ Add as Ally` button appears below
- All other cards enter `Already Squadded Up` locked state
- `YOU'RE IN A SQUAD!` banner appears at top of page
- A new button appears at the bottom of the page (see Section C3)

**If declined (50%):**
- Card shows `✗ Declined`
- Card is **completely hidden** for 1 hour — remove it from the DOM, not just dimmed
- Since this is a prototype with no persistent timer, simulate the 1-hour hide by removing the card from state entirely for the session. Add a comment: `// TODO: persist 1hr cooldown in DB`
- No countdown timer shown (unlike the previous 60s cooldown — this is a full hide)
- User may click `Request to Squad` on any other visible card

### C3. 50/50 on Add as Ally
When the user clicks `+ Add as Ally` after being accepted into a squad:

```ts
const alliedAccepted = Math.random() >= 0.5;
```

- **Response delay:** 1–3 seconds (randomised)
- During delay: button shows `Sending...` pulsing state

**If accepted:**
- Button changes to `✓ Added as Ally`
- Ally immediately appears in the Allies panel (left side)
- Ally also appears in the homepage sidebar when user navigates there

**If declined:**
- Button changes to `✗ Ally Request Declined`
- Muted, non-interactive — no retry in this session
- No cooldown shown — just a final state

### C4. Return to Homepage Button
After a squad acceptance (regardless of ally outcome), a `Return to Homepage` button appears pinned to the bottom-centre of the page.

- **Label:** `RETURN TO HOMEPAGE`
- **Style:** Full main heading treatment — pulsing amber glow + float animation + all-caps
- **Size:** Large, prominent — `padding: 16px 48px`, Rajdhani bold, 20px
- **Border:** `2px solid #e8a020`, background transparent, text amber
- **Hover:** Background fills to `rgba(232,160,32,0.15)`, glow intensifies
- **On click:** Navigate to `/home` (Page 4)

---

## SECTION D — Homepage (Page 4, `/home`)

This is the returning user landing page. New users arrive here after their first squad acceptance. Returning users land here automatically after login.

---

### D1. Overall Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ⚙  [settings icon, top-left, not clickable]   [🏠 HOME]    │  ← top nav bar
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│   SIDEBAR     │   FEED (main area)                          │
│   (1/4 width) │   (3/4 width)                               │
│               │                                              │
│   permanent   │   placeholder: "Feed coming soon"           │
│   scrollable  │   centred, muted, small text                │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

- Full viewport height, no outer scroll
- Sidebar: `width: 25%`, fixed, independent scroll (`overflow-y: auto`)
- Feed area: `width: 75%`, placeholder content for this phase
- Animated geometric background (Section A) behind everything

---

### D2. Top Navigation Bar

- Height: `48px`
- Background: `#0a0b0f` with `1px solid rgba(255,255,255,0.08)` bottom border
- Full viewport width

**Settings icon (top-left):**
- Position: left-aligned, vertically centred in the nav bar
- Icon: gear/cog SVG icon
- Size: `20px`
- Colour: `rgba(255,255,255,0.4)`
- **Not clickable** — `cursor: default`, no hover state, no onClick handler
- Add a comment in code: `// Settings — not implemented in this phase`

**Home button (top-right):**
- Position: right-aligned, vertically centred in the nav bar
- Icon: house/home SVG icon OR text `HOME` in Rajdhani
- Size: `20px` icon or `14px` text
- Colour: `rgba(255,255,255,0.6)` at rest
- **Hover state:**
  - Scales up slightly: `transform: scale(1.15)`
  - Glows amber: `filter: drop-shadow(0 0 8px rgba(232,160,32,0.8))`
  - Colour shifts to amber `#e8a020`
  - Transition: `all 0.2s ease`
- **On click:** Navigates to `/home` (refreshes current page — it IS the homepage)

---

### D3. Left Sidebar — `YOUR BATTLE BUDDIES`

#### D3a. Sidebar Header
- Text: `YOUR BATTLE BUDDIES`
- Style: main heading treatment — pulsing amber glow + float animation + all-caps (per SPEC_UPDATE_01 Section C1)
- Font size: slightly smaller than page main headings — `18px` Rajdhani bold — but same animation
- Pinned to top of sidebar, does not scroll with content

#### D3b. Two Sections: Squad + Allies

After the header, the sidebar contains two vertically stacked sections, each with its own label:

**Section label style:**
- `YOUR SQUAD` and `ALLIES` — subheading treatment (pulsing glow + float animation, per Section B1 of this update)
- `1px solid rgba(255,255,255,0.08)` divider line above each label

---

#### D3c. Squad Member Cards

- One card per squad member
- Height: `calc(100vh / 8)` — exactly 1/8 of screen height
- Width: `90%` of sidebar width, centred (`margin: 0 auto`)
- `background: #1a1d26`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 8px`
- `margin-bottom: 6px`

**Card content:**
```
┌─────────────────────────────┐
│  [PFP]  Username            │
│         Overall: 94%  ████  │
└─────────────────────────────┘
```
- PFP: `36×36px` dark square, `PFP` letters in Rajdhani muted (prototype placeholder)
- Username: Rajdhani, white, 13px
- Overall match %: traffic light coloured percentage + mini bar
- **No status shown for squad members**

---

#### D3d. Ally Cards

- Same dimensions and style as squad cards
- **Additional field: Status** shown below the overall match bar

**Status states:**
| Status | Display | Colour |
|--------|---------|--------|
| Searching for squad | `● Searching for a squad` | Green `#22c55e` |
| In squad | `● In squad` | Yellow `#facc15` |
| Offline | `● Offline` | Grey `rgba(255,255,255,0.3)` |

**Invite to Squad button:**
- Shown **only** when ally status is `Searching for a squad`
- Position: above the overall match percentage, right-aligned within the card
- Label: `Invite to Squad`
- Style: small, outlined amber button — `font-size: 11px`, `padding: 4px 10px`, `border: 1px solid #e8a020`, amber text, transparent background
- **On click:** Fires the 50/50 ally-invite mechanic (see Section D3e)
- If squad is already full (max 4 players including self): button is hidden entirely, replaced with muted text `Squad Full`

---

#### D3e. Invite to Squad — 50/50 Mechanic

When `Invite to Squad` is clicked on an ally card:

```ts
const inviteAccepted = Math.random() >= 0.5;
```

- **Delay:** 1–3 seconds, button shows `Inviting...` pulsing state during delay

**If accepted:**
- Ally card moves from the `ALLIES` section up into the `YOUR SQUAD` section
- Card loses the status field (squad cards don't show status)
- Card gains a subtle amber top-border to indicate newly joined: `border-top: 2px solid #e8a020` — fades back to normal border after 3 seconds

**If declined:**
- Button changes to `✗ Invite Declined` — muted, non-interactive
- Ally card remains in `ALLIES` section with status unchanged
- No retry in this session

---

### D4. Feed Area (3/4 width)

Placeholder for this phase. Display:

```
COMING SOON
Your feed will show clips, highlights, and updates from your squad and allies.
```

- Centred vertically and horizontally in the feed area
- `COMING SOON` in main heading style (pulsing glow + float + all-caps)
- Subtitle in subheading style (pulsing glow + float, smaller text)
- Animated background lines visible behind this area

---

### D5. Mock Data for Homepage

Pre-populate the sidebar with mock data so the prototype is demonstrable:

```ts
export const MOCK_SQUAD = [
  { id: 'squad-01', username: 'NovaTrigger', overall: 94 },
  { id: 'squad-02', username: 'IronVeil', overall: 88 },
];

export const MOCK_HOMEPAGE_ALLIES = [
  { id: 'ally-01', username: 'ShadowRook', overall: 91, status: 'searching' },
  { id: 'ally-02', username: 'GhostDelta7', overall: 85, status: 'in-squad' },
  { id: 'ally-03', username: 'CopperEdge', overall: 76, status: 'offline' },
];
```

---

## SECTION E — Navigation & Routing Update

Add `/home` to the route map:

```
/ (Login)
  │
  ├─ New user ──► /select-game
  │                 └─► /build-profile
  │                       └─► /squad-matches
  │                             └─► [accepted] ──► /home
  │
  └─ Returning user ──► /home (automatic after login)
```

The `AppContext` must persist selected game, profile answers, squad, and allies across navigation so the sidebar on `/home` reflects what was built during the new user journey.

---

## SECTION F — Summary of All Changes

| Area | Change |
|------|--------|
| Animated background | Added globally — geometric amber circuit lines, all pages, fixed layer |
| Subheadings (global) | Now animated (float) AND glowing — applies everywhere |
| Request mechanic | 50/50 auto-response, 2–4s delay, no simulate button |
| Declined cards | Hidden for full session (1hr in production) — no cooldown timer |
| Add as Ally | 50/50 auto-response, 1–3s delay |
| Ally declined | Final state, no retry — no cooldown shown |
| Return to Homepage | Amber glowing animated button, appears after squad acceptance |
| `/home` route | New page — Instagram-style layout |
| Settings icon | Top-left, not clickable, gear icon |
| Home button | Top-right, glows amber on hover, scales up |
| Sidebar header | `YOUR BATTLE BUDDIES` — full main heading animation |
| Squad section | Cards at 1/8 screen height, no status shown |
| Allies section | Same cards + status badge + Invite to Squad button |
| Invite to Squad | 50/50 mechanic, accepted = moves to squad section |
| Squad full | Invite button hidden, replaced with `Squad Full` text |
| Feed area | Placeholder — `COMING SOON` with full heading treatment |
| Routing | `/home` added, returning users land here automatically |
