# SquadFinder — Spec Amendment 05
> Targeted fixes and additions for `/select-game`. Apply after all previous spec files.

---

## FIX 1 — UX Sounds on Game Tiles

### Hover Sound
- **Character:** Subtle, soft whoosh — like a card sliding into place or a light interface sweep
- **Suggested free asset:** `ui_hover_soft.mp3` — source from [Mixkit](https://mixkit.co/free-sound-effects/click/) or [Freesound.org](https://freesound.org) under CC0 licence
- Search terms: "soft whoosh UI", "subtle hover click", "interface sweep soft"
- Duration: 80–120ms max — very short
- Volume: 30% of master volume by default — should never overpower the background music
- Trigger: `onMouseEnter` on each game tile

### Selection Sound (clicking a tile)
- **Character:** Deeply satisfying ASMR-style click — like a mechanical keyboard switch, a solid snap, or a heavy tactile press. Should feel rewarding and deliberate
- **Suggested free asset:** search Freesound.org for "mechanical keyboard click", "ASMR click snap", or "satisfying UI select"
- Duration: 100–200ms
- Volume: 50% of master volume — noticeably more present than the hover sound
- Trigger: `onClick` on each game tile

### Implementation
Store both audio files in `/public/sounds/`:
```
/public/sounds/tile_hover.mp3
/public/sounds/tile_select.mp3
```

Use the Web Audio API or simple HTML5 Audio for playback:
```ts
// Reusable sound utility: /lib/sounds.ts
const hoverSound = new Audio('/sounds/tile_hover.mp3');
const selectSound = new Audio('/sounds/tile_select.mp3');

export const playHover = () => {
  hoverSound.currentTime = 0;
  hoverSound.volume = 0.3;
  hoverSound.play().catch(() => {}); // suppress autoplay errors
};

export const playSelect = () => {
  selectSound.currentTime = 0;
  selectSound.volume = 0.5;
  selectSound.play().catch(() => {});
};
```

Reset `currentTime = 0` before each play so rapid hovering does not queue up sounds.

Both sounds must respect the master volume slider (see FIX 4). Multiply the base volume by the current master volume scalar:
```ts
hoverSound.volume = 0.3 * masterVolume;  // masterVolume is 0.0–1.0
selectSound.volume = 0.5 * masterVolume;
```

If the user has muted via the toggle, set `masterVolume = 0` and no sounds play.

---

## FIX 2 — Prominent Glow on Hover and Selected Tiles

### Current Problem
The existing glow on hover and selection is too subtle. It needs to be visually striking — the player should immediately feel the feedback.

### Hover State (replace existing)
```css
.game-tile:hover {
  border: 2px solid rgba(232, 160, 32, 0.9);
  box-shadow:
    0 0 12px rgba(232, 160, 32, 0.6),
    0 0 24px rgba(232, 160, 32, 0.3),
    0 0 48px rgba(232, 160, 32, 0.1);
  transform: translateY(-2px) scale(1.02);
  transition: all 0.15s ease;
}
```

### Selected State (replace existing)
```css
.game-tile.selected {
  border: 2px solid #e8a020;
  box-shadow:
    0 0 16px rgba(232, 160, 32, 0.8),
    0 0 32px rgba(232, 160, 32, 0.4),
    0 0 64px rgba(232, 160, 32, 0.15),
    inset 0 0 20px rgba(232, 160, 32, 0.08);
  background: rgba(232, 160, 32, 0.1);
}
```

The selected state must persist (not animate away) until a different tile is selected. The inset shadow gives a subtle interior glow that reinforces the selection clearly.

### Transition
All tile state transitions must use:
```css
transition: box-shadow 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
```

Fast enough to feel responsive, not so fast it feels cheap.

---

## FIX 3 — Image vs No-Image Tile Separation (Hard Enforcement)

### Problem
The separation between image tiles and no-image tiles is still not visually clear or consistently implemented. This fix enforces it at both the data and render level.

### Data Level — mockData.ts
This rule was stated in SPEC_AMENDMENT_02 Fix 3. It is repeated here as a hard block because it has not been working.

Claude Code must verify the following is true in `mockData.ts` before any other work on this file:

```ts
// ⚠️ HARD RULE — DO NOT SKIP
// The exported array for each category MUST be sorted as follows:
// GROUP 1: All games with a real logoUrl, sorted A→Z by name
// GROUP 2: All games without a logoUrl (null or undefined), sorted A→Z by name
// This sort MUST be applied at the point of array export, not in the component.
// Verify by console.log of the exported array before rendering.

export const EXTRACTION_GAMES = [
  ...rawExtractionGames
    .filter(g => !!g.logoUrl)
    .sort((a, b) => a.name.localeCompare(b.name)),
  ...rawExtractionGames
    .filter(g => !g.logoUrl)
    .sort((a, b) => a.name.localeCompare(b.name)),
];
// Repeat identically for COMPETITIVE_GAMES and FPS_GAMES
```

### Render Level — Visual Divider
Add a visible divider between the two groups in the game grid. This makes the separation unmistakable to the user:

```
[image tile] [image tile] [image tile]
[image tile] [image tile] [image tile]
────────────────────────────────────────  ← divider
             NO LOGO YET
────────────────────────────────────────
[text tile]  [text tile]  [text tile]
```

Divider implementation:
```tsx
// In the game grid render, after the last image tile and before the first no-image tile:
{hasNoImageGames && (
  <div className="grid-divider" style={{ gridColumn: '1 / -1' }}>
    <div className="divider-line" />
    <span className="divider-label">NO LOGO YET</span>
    <div className="divider-line" />
  </div>
)}
```

```css
.grid-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  grid-column: 1 / -1;  /* spans full grid width */
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.divider-label {
  font-family: 'Rajdhani', sans-serif;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.25);
  white-space: nowrap;
  text-transform: uppercase;
}
```

The divider only renders if there is at least one game in the no-image group. If all games have images, no divider is shown.

### Verification Step
Claude Code must log the first 5 and last 5 games of each category array to the console during development and confirm Group 1 (image games) all have `logoUrl` set and Group 2 (no-image games) all have `logoUrl` as null/undefined. Do not proceed until this is confirmed.

---

## FIX 4 — Background Music

### Track Selection
Use a royalty-free war/military atmospheric track. Recommended source: [Pixabay Music](https://pixabay.com/music/) — free for commercial use, no attribution required.

**Recommended search terms on Pixabay:**
- "military epic atmospheric"
- "war ambient dark"
- "battlefield cinematic"
- "tactical military theme"

**Specific suggested track:** Search Pixabay for `"Epic Military"` or `"Dark Military Ambient"` — pick the track that best matches: deep drums, orchestral tension, low brass, no lyrics. Aim for a track that loops cleanly (i.e. the end fades back into the beginning naturally).

Download as `.mp3` and save to:
```
/public/music/background_theme.mp3
```

### Playback Behaviour
- Music starts playing when the user arrives on `/select-game`
- Loops continuously (`loop={true}`)
- Does NOT autoplay silently on page load — browser autoplay policies block this. Instead:
  - On first user interaction (any click or hover on the page), start the music
  - This satisfies browser autoplay requirements
- Music persists across the session — if the user navigates away and returns, it resumes
- Use a single shared `Audio` instance stored in `AppContext` or a dedicated `MusicContext` so it does not restart on re-renders

```ts
// MusicContext or AppContext addition
const bgMusic = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  bgMusic.current = new Audio('/music/background_theme.mp3');
  bgMusic.current.loop = true;
  bgMusic.current.volume = 0.4;  // default 40% volume
}, []);

const startMusic = () => {
  bgMusic.current?.play().catch(() => {});
};

// Attach startMusic to first user interaction
useEffect(() => {
  window.addEventListener('click', startMusic, { once: true });
  window.addEventListener('mousemove', startMusic, { once: true });
  return () => {
    window.removeEventListener('click', startMusic);
    window.removeEventListener('mousemove', startMusic);
  };
}, []);
```

### Volume Controls
A persistent music control widget must appear on `/select-game`, pinned to the **bottom-right corner** of the page.

```
┌────────────────────────┐
│  ♪  [████████░░]  80%  │
│     [🔇 Mute]          │
└────────────────────────┘
```

**Components:**
- **Music icon** (♪ or equivalent SVG) — amber colour
- **Volume slider:** horizontal range input, `min=0 max=100 step=1`, default `40`
  - Slider track: dark background with amber fill
  - Thumb: amber circle
  - Updates `bgMusic.current.volume` in real time as slider moves
- **Mute toggle button:**
  - Label: `♪ On` when unmuted, `✕ Off` when muted
  - On click: toggles between `volume = 0` (muted) and restoring previous volume
  - Style: small outlined amber button

**Widget style:**
```css
.music-controls {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  background: rgba(10, 11, 15, 0.85);
  border: 1px solid rgba(232, 160, 32, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  backdrop-filter: blur(8px);
}
```

The widget must not overlap the `Find My Squad →` button. If both are in the bottom-right, offset the music widget to the left or above the squad button.

---

## FIX 5 — Geometric Background: Explicit Implementation for /select-game

### Problem
The animated geometric background has not been rendering visibly. This fix provides an explicit, self-contained implementation that must be added directly to the `/select-game` page component if the global root layout version is still not working.

### Self-Contained SVG Component
Create `/components/ui/AnimatedBackground.tsx`:

```tsx
export default function AnimatedBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: '#0a0b0f',  // fallback base colour
      }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <style>{`
            @keyframes lineFade1 {
              0%   { stroke-dashoffset: 800; opacity: 0; }
              15%  { opacity: 1; }
              85%  { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes lineFade2 {
              0%   { stroke-dashoffset: 600; opacity: 0; }
              20%  { opacity: 0.8; }
              80%  { opacity: 0.8; }
              100% { stroke-dashoffset: 0; opacity: 0; }
            }
            @keyframes nodePulse {
              0%, 100% { opacity: 0.2; r: 2; }
              50%       { opacity: 0.6; r: 3; }
            }
            .geo-line-1 {
              stroke: rgba(232,160,32,0.18);
              stroke-width: 1;
              fill: none;
              stroke-dasharray: 800;
              animation: lineFade1 8s ease-in-out infinite;
            }
            .geo-line-2 {
              stroke: rgba(232,160,32,0.12);
              stroke-width: 1;
              fill: none;
              stroke-dasharray: 600;
              animation: lineFade2 10s ease-in-out infinite;
            }
            .geo-line-3 {
              stroke: rgba(232,160,32,0.08);
              stroke-width: 1;
              fill: none;
              stroke-dasharray: 400;
              animation: lineFade1 12s ease-in-out infinite 2s;
            }
            .geo-node {
              fill: rgba(232,160,32,0.4);
              animation: nodePulse 4s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* Horizontal lines with 90° turns — circuit board style */}
        <path className="geo-line-1" d="M 0 120 L 200 120 L 200 80 L 500 80" style={{ animationDelay: '0s' }} />
        <path className="geo-line-1" d="M 100 300 L 100 400 L 350 400 L 350 350 L 600 350" style={{ animationDelay: '1.5s' }} />
        <path className="geo-line-2" d="M 700 0 L 700 150 L 900 150 L 900 200" style={{ animationDelay: '3s' }} />
        <path className="geo-line-2" d="M 1200 100 L 1000 100 L 1000 250 L 1100 250 L 1100 400" style={{ animationDelay: '0.8s' }} />
        <path className="geo-line-3" d="M 0 500 L 300 500 L 300 550 L 500 550 L 500 600 L 800 600" style={{ animationDelay: '2s' }} />
        <path className="geo-line-3" d="M 1400 300 L 1200 300 L 1200 450 L 1400 450" style={{ animationDelay: '4s' }} />
        <path className="geo-line-1" d="M 400 700 L 400 800 L 600 800 L 600 750 L 900 750" style={{ animationDelay: '1s' }} />
        <path className="geo-line-2" d="M 800 900 L 1000 900 L 1000 850 L 1300 850" style={{ animationDelay: '5s' }} />
        <path className="geo-line-3" d="M 200 950 L 200 1000 L 500 1000" style={{ animationDelay: '3.5s' }} />
        <path className="geo-line-1" d="M 1500 600 L 1300 600 L 1300 700 L 1100 700 L 1100 750" style={{ animationDelay: '2.5s' }} />
        <path className="geo-line-2" d="M 600 200 L 800 200 L 800 100 L 1000 100" style={{ animationDelay: '6s' }} />
        <path className="geo-line-3" d="M 0 750 L 150 750 L 150 850 L 300 850" style={{ animationDelay: '1.2s' }} />

        {/* Node dots at intersections */}
        <circle className="geo-node" cx="200" cy="120" r="2.5" style={{ animationDelay: '0s' }} />
        <circle className="geo-node" cx="100" cy="400" r="2.5" style={{ animationDelay: '1.5s' }} />
        <circle className="geo-node" cx="350" cy="400" r="2.5" style={{ animationDelay: '0.5s' }} />
        <circle className="geo-node" cx="700" cy="150" r="2.5" style={{ animationDelay: '3s' }} />
        <circle className="geo-node" cx="1000" cy="250" r="2.5" style={{ animationDelay: '2s' }} />
        <circle className="geo-node" cx="500" cy="550" r="2.5" style={{ animationDelay: '4s' }} />
        <circle className="geo-node" cx="600" cy="800" r="2.5" style={{ animationDelay: '1s' }} />
        <circle className="geo-node" cx="1000" cy="900" r="2.5" style={{ animationDelay: '5s' }} />
        <circle className="geo-node" cx="800" cy="200" r="2.5" style={{ animationDelay: '6s' }} />
        <circle className="geo-node" cx="1300" cy="600" r="2.5" style={{ animationDelay: '2.5s' }} />
      </svg>
    </div>
  );
}
```

### Usage
Import and place `<AnimatedBackground />` as the **first element** inside the `/select-game` page component, before all other content:

```tsx
// app/select-game/page.tsx
export default function SelectGamePage() {
  return (
    <>
      <AnimatedBackground />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        {/* all page content here */}
      </div>
    </>
  );
}
```

The same `<AnimatedBackground />` component must also be placed on every other page in the same way — `/`, `/build-profile`, `/squad-matches`, `/home` — if the root layout version is still not rendering correctly.

### Critical: Body Background
Ensure `globals.css` has:
```css
html, body {
  background-color: #0a0b0f;
  margin: 0;
  padding: 0;
}
```
Without this, the SVG lines render against a white background and appear invisible.

---

## FIX 6 — Subheadings: Explicit Global Enforcement

### Problem
Subheadings are still not visibly glowing and animated across the site. This is a global CSS issue.

### Step 1 — globals.css (Full Replacement of Heading Styles)
Replace any existing heading animation CSS in `globals.css` with the following complete block. This is the single source of truth for all heading animation across the entire app:

```css
/* ============================================
   SQUADFINDER — HEADING ANIMATION SYSTEM
   ALL headings and subheadings use these classes
   DO NOT override these in component-level CSS
   ============================================ */

@keyframes mainPulse {
  0%, 100% {
    text-shadow:
      0 0 8px rgba(232, 160, 32, 0.5),
      0 0 16px rgba(232, 160, 32, 0.3);
  }
  50% {
    text-shadow:
      0 0 20px rgba(232, 160, 32, 1),
      0 0 40px rgba(232, 160, 32, 0.6),
      0 0 80px rgba(232, 160, 32, 0.2);
  }
}

@keyframes mainFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-3px); }
}

@keyframes subPulse {
  0%, 100% {
    text-shadow:
      0 0 5px rgba(232, 160, 32, 0.35),
      0 0 10px rgba(232, 160, 32, 0.15);
  }
  50% {
    text-shadow:
      0 0 12px rgba(232, 160, 32, 0.8),
      0 0 24px rgba(232, 160, 32, 0.35);
  }
}

@keyframes subFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-2px); }
}

/* MAIN HEADINGS — primary page titles */
.main-heading {
  display: inline-block;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e8a020;
  animation:
    mainPulse 2.5s ease-in-out infinite,
    mainFloat 3s ease-in-out infinite;
}

/* SUB HEADINGS — section labels, panel headers,
   question labels, card labels, group titles,
   category names, divider labels, field labels,
   nav labels, status labels, score labels,
   ANY text that is not body/paragraph text */
.sub-heading {
  display: inline-block;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  animation:
    subPulse 3s ease-in-out infinite,
    subFloat 4s ease-in-out infinite;
}
```

### Step 2 — Full Component Audit
Claude Code must open every single component file and apply `.sub-heading` to every text element that is not body/paragraph text. This is a mandatory blocking step — do not skip any component.

**Definition of what gets `.sub-heading`:**
> Any text element that is NOT a paragraph, sentence, description, or body copy. If it is a label, title, heading, category name, section name, field name, card title, score name, status indicator text, button label, nav item, divider label, or any other non-body text — it gets `.sub-heading`.

**Complete list of components to audit:**
- `Sidebar.tsx` — category labels
- `GameGrid.tsx` — grid header, divider label
- `GameTile.tsx` — game name below logo
- `VersionSelector.tsx` — panel header, version item labels, platform selector labels
- `ProfileForm.tsx` — all question labels
- `QuestionBlock.tsx` — question titles, option labels
- `MatchCard.tsx` — match label, sub-score labels, status label
- `MatchBar.tsx` — bar label
- `OverallScore.tsx` — score label
- `LoginCard.tsx` — subheading below main title
- `TopNav.tsx` — nav item labels
- `AlliesPanel.tsx` — section headers, card labels
- `HomeSidebar.tsx` — all labels
- Any other component containing non-body text

### Step 3 — Verify Visually
After applying, Claude Code must confirm by description that on each page:
- Every section label, panel header, and question label has a visible amber glow
- The glow pulses (brightens and dims) on a cycle
- Text floats up and down subtly

If any element is not animating after the class is applied, check:
1. Is `display: inline-block` set? (Required for `transform` to work on inline elements)
2. Is there a conflicting `animation: none` anywhere in component CSS?
3. Is the element inside a container with `overflow: hidden` clipping the glow?
