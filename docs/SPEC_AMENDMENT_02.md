# SquadFinder — Spec Amendment 02
> Targeted fixes. Apply after all previous spec files.

---

## FIX 1 — Slider Labels: 3 Anchors Only

Replaces the 11-label slider spec in SPEC_UPDATE_04 Sections B2 (skill) and B3 (rage).

Every slider across the entire site has **exactly 3 labels** — one at each end and one in the middle. No labels at any other tick mark.

| Position | Skill Label | Rage Label |
|----------|------------|------------|
| 0.0 | Noob | Zen Monk |
| 5.0 | Mid (Respectfully) | Full Blame Rotation |
| 10.0 | We Don't Deserve You | Keyboard Through Wall |

All other tick marks (every 0.1 step) remain as visual indents on the track with no label attached.

Label display:
- Font size: 11px, `color: rgba(255,255,255,0.45)`, centred under their respective tick
- Only rendered at `0.0`, `5.0`, and `10.0` — no other positions

---

## FIX 2 — Home Button: Present on Squad Matches Page

The home button (top-right, glows amber on hover, scales up) defined in SPEC_UPDATE_05 Section D2 must appear on **every page in the app**, not only on `/home`.

Add it to the global top navigation bar that is present on all routes. The nav bar must be part of the root layout component so it renders on every page automatically.

**Pages that must show the nav bar with the home button:**
- `/` (Login) — home button not needed here, hide it on this page only
- `/select-game` — show home button
- `/build-profile` — show home button
- `/squad-matches` — **show home button** — this is where it was reported missing
- `/home` — show home button (clicking it refreshes the page)

The settings icon (top-left, not clickable) also appears on all pages except `/` (login).

**Root layout implementation:**
```tsx
// app/layout.tsx or equivalent root layout
// Render <TopNav /> on every page
// <TopNav /> conditionally hides home button on '/' route
```

The `TopNav` component must check the current route and hide the home button only on the login page (`/`).

---

## FIX 3 — Game Grid Ordering: Prominent Hard Rule

This rule must be treated as a hard constraint, not a suggestion. Add the following comment at the top of `mockData.ts` and at the top of the game grid component:

```ts
// ⚠️ HARD RULE: Games with a real logoUrl MUST render before games without one.
// Within each group, sort A→Z by name.
// This sort must be applied to the data array itself, not in the render layer.
// DO NOT render games in any other order.
```

The sort must happen in `mockData.ts` at the point the array is defined — not in the component, not at render time. The exported array must already be in the correct order when the component imports it.

```ts
// At the bottom of each category array definition in mockData.ts:
const rawExtractionGames = [ ...all 30 games unsorted... ];

export const EXTRACTION_GAMES = [
  ...rawExtractionGames.filter(g => !!g.logoUrl).sort((a, b) => a.name.localeCompare(b.name)),
  ...rawExtractionGames.filter(g => !g.logoUrl).sort((a, b) => a.name.localeCompare(b.name)),
];

// Repeat for COMPETITIVE_GAMES and FPS_GAMES
```

Apply this pattern to all three category arrays. The game grid component must import and render these pre-sorted arrays directly with no additional sorting logic.

---

## Summary

| Fix | Change |
|-----|--------|
| Slider labels | 11 labels removed → 3 only (0.0, 5.0, 10.0) |
| Home button | Now in global root layout nav bar, visible on all pages except login |
| Game ordering | Elevated to hard rule with enforced comment, sort applied in mockData.ts not component |
