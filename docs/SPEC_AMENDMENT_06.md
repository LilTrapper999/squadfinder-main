# SquadFinder — Spec Amendment 06
> Covers: game team feature audit and image sourcing, /select-game invisible UI fix, LYP panel formatting, deselect behaviour. Apply after all previous spec files.

---

## FIX 1 — Game Team Feature Audit & Image Sourcing

### Rule
Every game in the SquadFinder catalogue must have an active, functional team/squad invite feature where players can invite specific individuals to play together. If a game does not have this feature, it must be removed from `mockData.ts` permanently.

**Do NOT replace removed games with other games under any circumstances.**

### Audit Process
For every game in all three category arrays (`EXTRACTION_GAMES`, `COMPETITIVE_GAMES`, `FPS_GAMES`), Claude Code must:

1. Research whether the game has a team/party/squad invite system where you can invite a specific player by username, friend list, or invite link
2. If YES → keep the game, source an image (see below)
3. If NO → remove it from the array entirely. Add a comment above the array:

```ts
// REMOVED GAMES (no team invite feature):
// - [Game Name] — reason: no squad/party invite system
// DO NOT replace these with other games
```

### Known Games Likely to Fail the Audit
Claude Code must verify each of these carefully — they are single-player focused or have limited/no multiplayer squad invite:
- Devil Daggers (wave survival, no multiplayer)
- Boomerang X (single-player)
- Ultrakill (single-player)
- Turbo Overkill (primarily single-player)
- Severed Steel (single-player)
- Prodeus (verify co-op status)
- Void Bastards (verify multiplayer)
- Project Zomboid (has multiplayer — verify invite system)
- Miscreated (verify current server status and invite system)

---

### Image Sourcing — Squad/Team UI Screenshots

For every game that passes the team feature audit, source an image that players will **instantly recognise** — ideally showing the game's squad lobby, team invite screen, or iconic gameplay moment.

**Reference example: Arena Breakout Infinite**
The image used for ABI should be the kind players immediately associate with the game — the pre-raid lobby, the signature inventory UI, or a recognisable in-game moment. That is the standard for all games.

**Image sourcing priority for each game:**

#### Priority 1 — Steam CDN Header (already specced in SPEC_AMENDMENT_01a)
```
https://cdn.cloudflare.steamstatic.com/steam/apps/{STEAM_APP_ID}/header.jpg
```
This is the default. The header image is what players see on the Steam store and will instantly recognise.

#### Priority 2 — Steam CDN Library Hero Image
A wider, more cinematic image:
```
https://cdn.cloudflare.steamstatic.com/steam/apps/{STEAM_APP_ID}/library_hero.jpg
```
Use this if the header image is low quality or unrecognisable.

#### Priority 3 — Steam CDN Capsule (vertical)
```
https://cdn.cloudflare.steamstatic.com/steam/apps/{STEAM_APP_ID}/library_600x900.jpg
```

#### Priority 4 — Official Press Kit Screenshot
For non-Steam games, visit the official press kit page and download a freely available screenshot or key art image. Store it in `/public/games/{game-id}.jpg`.

#### Priority 5 — IGDB Cover Art
```
https://images.igdb.com/igdb/image/upload/t_cover_big/{igdb_image_id}.jpg
```

### Copyright Safety
All Steam CDN URLs (`cdn.cloudflare.steamstatic.com`) are publicly accessible and widely used for game discovery purposes. IGDB images are licensed for fan/community use. Official press kit images are provided explicitly for media use.

Do NOT:
- Screenshot the game yourself and hotlink
- Use images from fan wikis without confirming licence
- Use images from gaming news sites (IGN, Kotaku etc.) — these are copyrighted editorial photos

### mockData.ts Image Field
Each game object must have:
```ts
{
  id: 'eft',
  name: 'Escape from Tarkov',
  steamAppId: 1868140,
  logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1868140/header.jpg',
  hasTeamFeature: true,  // add this field for audit trail
}
```

---

## FIX 2 — /select-game Invisible UI

### Problem
The entire page content is invisible — tiles, sidebar, version panel. Only the background is visible. This is a z-index and/or CSS colour issue causing content to render as transparent or same-colour-as-background.

### Fix A — Page Wrapper Z-Index
Every page must wrap its content above the `AnimatedBackground` component:

```tsx
// app/select-game/page.tsx
export default function SelectGamePage() {
  return (
    <>
      <AnimatedBackground />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Sidebar />
        <GameGrid />
        <VersionPanel />  {/* only renders when game is selected */}
      </div>
    </>
  );
}
```

### Fix B — Sidebar Explicit Styles
The sidebar must have explicit background and text colours. Do not rely on inherited or assumed styles:

```css
.sidebar {
  background-color: #111318;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
  width: fit-content;
  min-width: 0;
  padding: 24px 12px;
  white-space: nowrap;
  flex-shrink: 0;
  height: 100vh;
  overflow-y: auto;
  position: relative;
  z-index: 2;
}

.sidebar-category {
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Rajdhani', sans-serif;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 4px;
  border-left: 3px solid transparent;
  white-space: nowrap;
}

.sidebar-category.active {
  color: #e8a020;
  border-left-color: #e8a020;
  background: rgba(232, 160, 32, 0.08);
}

.sidebar-category:hover {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.05);
}
```

### Fix C — Game Grid Explicit Styles
```css
.game-grid-panel {
  background-color: #0d0f14;
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  padding: 24px;
  position: relative;
  z-index: 2;
}

.game-tile {
  background-color: #1a1d26;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.game-tile-name {
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  padding: 8px 4px;
  width: 100%;
}
```

### Fix D — Version Panel Explicit Styles
```css
.version-panel {
  background-color: #111318;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  height: 100vh;
  overflow-y: auto;
  padding: 24px 16px;
  width: fit-content;
  min-width: 180px;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  transition: width 200ms ease;
  white-space: nowrap;
}

.version-item {
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Rajdhani', sans-serif;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.version-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.95);
}

.version-item.selected {
  background: rgba(232, 160, 32, 0.1);
  border-color: #e8a020;
  color: #e8a020;
}
```

### Fix E — Three-Panel Layout
The three panels (sidebar, game grid, version panel) must use flexbox with no panel able to collapse to zero width or overflow off-screen:

```tsx
<div style={{
  display: 'flex',
  flexDirection: 'row',
  height: '100vh',
  width: '100vw',
  overflow: 'hidden',
  position: 'relative',
  zIndex: 1,
}}>
  <Sidebar />          {/* fit-content width, snug */}
  <GameGrid />         {/* flex: 1, takes remaining space */}
  {selectedGame && <VersionPanel />}  {/* fit-content, only when game selected */}
</div>
```

---

## FIX 3 — LYP Panel Formatting

### Fix A — Header Format
The version panel header must follow this exact format:

```
LOCK YOUR PATCH — {GAME NAME}
```

- Em dash (`—`) with a space on each side between "LOCK YOUR PATCH" and the game name
- Both parts on the same line
- Game name in the same style as the rest of the heading — amber, uppercase, Rajdhani bold
- Full `.main-heading` animation treatment on the entire string

```tsx
<h2 className="main-heading">
  LOCK YOUR PATCH — {selectedGame.name.toUpperCase()}
</h2>
```

### Fix B — Width Expansion Issue
When a game is selected and the version panel appears, it must NOT push the game grid to shrink below its minimum usable width.

Rules:
- Version panel: `width: fit-content`, `min-width: 180px`, `max-width: 320px`
- Game grid: `flex: 1`, `min-width: 0` — it shrinks to accommodate the version panel but never below a point where tiles become unusable
- If the combined width of sidebar + version panel would leave the game grid below `400px`, cap the version panel at whatever width keeps the grid at `400px` minimum

```ts
// Version panel max-width calculation
const versionPanelMaxWidth = Math.min(
  longestVersionStringWidth + 48,  // snug to content
  viewportWidth - sidebarWidth - 400  // never squash grid below 400px
);
```

### Fix C — Version Panel Only Appears on Game Selection
The version panel must have `display: none` (or not be mounted) when no game is selected. It must not occupy any space or affect the layout of the sidebar and game grid when not shown.

```tsx
{selectedGame !== null && (
  <VersionPanel game={selectedGame} />
)}
```

---

## FIX 4 — Game Tile Deselect

### Rule
Clicking an already-selected game tile deselects it. The version panel disappears and the game grid expands back to fill the full available width.

### Implementation
```tsx
const handleTileClick = (game: Game) => {
  if (selectedGame?.id === game.id) {
    // Deselect
    setSelectedGame(null);
    setSelectedVersion(null);
  } else {
    // Select new game
    setSelectedGame(game);
    setSelectedVersion(null);  // reset version when switching games
  }
};
```

### Visual Feedback on Deselect
- Selected amber glow/border is removed immediately
- Version panel slides out with `transition: width 200ms ease` shrinking to `0` then unmounting
- Game grid smoothly expands to fill the space using the same transition timing

### Version Panel Slide-Out Animation
```css
.version-panel {
  transition: width 200ms ease, opacity 200ms ease;
}

.version-panel.closing {
  width: 0 !important;
  opacity: 0;
  padding: 0;
  overflow: hidden;
}
```

Use a brief `closing` state before unmounting to allow the CSS transition to complete:
```tsx
const [panelClosing, setPanelClosing] = useState(false);

const handleDeselect = () => {
  setPanelClosing(true);
  setTimeout(() => {
    setSelectedGame(null);
    setPanelClosing(false);
  }, 200);  // matches CSS transition duration
};
```

---

## Summary of Changes

| Fix | Area | Change |
|-----|------|--------|
| 1 | mockData.ts | Audit all games for team invite feature. Remove non-qualifying games. No replacements. Source recognisable images for all remaining games. Add `hasTeamFeature` field |
| 2A | /select-game | Page wrapper z-index above AnimatedBackground |
| 2B | Sidebar | Explicit background, text colour, active/hover states |
| 2C | Game grid | Explicit tile background, text colour, border |
| 2D | Version panel | Explicit background, text colour, version item styles |
| 2E | Layout | Flexrow three-panel, no panel collapses to zero |
| 3A | LYP header | Format: `LOCK YOUR PATCH — {GAME NAME}`, em dash, same line |
| 3B | LYP width | Version panel capped so game grid never shrinks below 400px |
| 3C | LYP visibility | Version panel not mounted when no game selected |
| 4 | Deselect | Click selected tile again to deselect. Panel slides out, grid expands |
