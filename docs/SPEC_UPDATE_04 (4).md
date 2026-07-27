# SquadFinder — Spec Update 04
> Amends Select Game (Screen 2) and Build My Profile (Screen 3). Apply after all previous spec files.

---

## SECTION A — SELECT GAME: Game Grid Ordering & Image Treatment

### A1. Tile Sort Order

Games within each category must be sorted in the following two-tier order:

**Tier 1 — Games with real images** (Steam CDN or confirmed press CDN URL available)
- Sorted A→Z by game name
- Displayed first, left-to-right, top-to-bottom

**Tier 2 — Games without a real image** (genuinely no sourceable image after all attempts)
- Sorted A→Z by game name
- Displayed after all Tier 1 games, left-to-right continuing from where Tier 1 ended

This ordering must be computed at data initialisation time in `mockData.ts` — sort the array before rendering, do not sort in the component.

```ts
// Pseudocode for sort
const sorted = [
  ...games.filter(g => g.logoUrl).sort((a, b) => a.name.localeCompare(b.name)),
  ...games.filter(g => !g.logoUrl).sort((a, b) => a.name.localeCompare(b.name)),
];
```

---

### A2. Image Sourcing — All Games Must Have Real Images

**Every game tile must display a real image.** There are no acceptable placeholder tiles in the final prototype. Claude Code must source a real image for every game using the priority order below.

#### Priority 1 — Steam CDN Header Image
For every game available on Steam:
```
https://cdn.cloudflare.steamstatic.com/steam/apps/{STEAM_APP_ID}/header.jpg
```
This returns a `460×215px` rectangular header image. Apply `object-fit: contain` so the full image is always visible with dark bars filling unused space (no cropping).

#### Priority 2 — Steam CDN Capsule Image (square fallback)
If the header image returns a broken or low-quality result, try the vertical capsule:
```
https://cdn.cloudflare.steamstatic.com/steam/apps/{STEAM_APP_ID}/library_600x900.jpg
```

#### Priority 3 — Official Press Kit / Publisher CDN
For non-Steam games (VALORANT, Overwatch 2, CoD titles etc.), Claude Code must:
1. Visit the game's official website or press kit page
2. Identify a publicly accessible, non-authenticated image URL
3. Confirm the URL loads without a login wall
4. Use that URL as `logoUrl` in `mockData.ts`

Known non-Steam sources:
| Game | Source |
|------|--------|
| VALORANT | Riot Games press kit: `https://playvalorant.com` — find press assets |
| Overwatch 2 | Blizzard press CDN — find at `https://blizzard.gamespress.com` |
| Call of Duty: Warzone | Activision press CDN |
| Call of Duty: MW3 | Activision press CDN |
| Call of Duty: Black Ops 6 | Activision press CDN |
| Arena Breakout (Mobile) | MoreFun Studios / App Store featured image |
| XDefiant | Ubisoft press CDN |

#### Priority 4 — IGDB / Twitch Game Image API
If no official press URL is found, use the IGDB cover image endpoint (publicly accessible without auth for cover art):
```
https://images.igdb.com/igdb/image/upload/t_cover_big/{image_id}.jpg
```
Claude Code must look up the IGDB image ID for any game not covered by the above priorities.

#### Priority 5 — Wikipedia Featured Image
As a last resort, use the game's Wikipedia page featured image if it is a high-quality box art or logo. Confirm it is freely licensed before using.

> **No game may ship as a placeholder.** If after exhausting all 5 priorities a real image still cannot be sourced, flag that game explicitly in a comment in `mockData.ts` with `// IMAGE_NEEDED` so it is easy to find and fix.

---

### A3. Image Display Treatment

All tile images must use `object-fit: contain` — the full image is always visible.

```css
.game-tile-image {
  width: 100%;
  height: 70%; /* top 70% of tile */
  object-fit: contain;
  object-position: center;
  background: #0a0b0f; /* dark bars fill any unused space */
  padding: 8px; /* small breathing room around the image */
}
```

- Rectangular images (e.g. Steam 460×215 headers) will show with dark bars above and below inside the square tile — this is intentional and correct
- Do NOT stretch, crop, or distort any image to fill the tile
- On hover: `filter: brightness(1.1)` on the image only, not the whole tile

---

## SECTION B — BUILD MY PROFILE: Question Structure

### B1. Three Question Groups

All profile questions are divided into exactly three groups, each contributing equally to one of the three match scores:

| Group | Match Score It Drives |
|-------|-----------------------|
| Gamesmanship | Gamesmanship score |
| Vibe Check | Vibe Check score |
| Comms | Comms Style score |

Each question within a group contributes an equal share to that group's score. Scoring logic is future phase — spec the questions and their data structure now.

Questions still flow across the 3-column landscape layout (per SPEC_UPDATE_01 Section D1) without explicit group headers separating columns. The grouping is logical (for scoring), not visual.

---

### B2. GAMESMANSHIP Questions

These three questions are game-specific and must be researched per game (see Section B5).

---

#### Question G1 — Weapons You Like
- **Type:** Multiple choice checkbox (multi-select)
- **Options:** Full weapon list for the selected game — researched per game (see Section B5)
- **Display:** Checkbox grid, 2–3 columns depending on available space
- **Label:** `Weapons you roll with` (subheading glow treatment)
- **Minimum selections:** 1
- **Data key:** `gamesmanship.weapons: string[]`

---

#### Question G2 — Maps You Like
- **Type:** Multiple choice checkbox (multi-select)
- **Options:** Full map pool for the selected game — researched per game (see Section B5)
- **Display:** Checkbox grid, 2–3 columns
- **Label:** `Your stomping grounds` (subheading glow treatment)
- **Minimum selections:** 1
- **Data key:** `gamesmanship.maps: string[]`

---

#### Question G3 — Roles Preferred
- **Type:** Multiple choice checkbox (multi-select)
- **Options:** Full role list for the selected game — from the roles already specced in SPEC_UPDATE_01 Section E3, plus any additional roles researched per game
- **Display:** Checkbox grid, each option shows primary label + humorous subtitle below (where it exists)
- **Label:** `How you run it` (subheading glow treatment)
- **Minimum selections:** 1
- **Data key:** `gamesmanship.roles: string[]`

---

#### Question G4 — Skill Level
- **Type:** Decimal slider (per SPEC_UPDATE_01 Section D2 — 0.0 to 10.0, step 0.1, snappable, tick marks, live decimal display)
- **Label:** `Skill level` (subheading glow treatment)
- **At every +1.0 major tick, show a description label:**

| Value | Label |
|-------|-------|
| 0.0 | Noob |
| 1.0 | Rookie |
| 2.0 | Getting There |
| 3.0 | Decent Honestly |
| 4.0 | Clip-Worthy Occasionally |
| 5.0 | Mid (Respectfully) |
| 6.0 | Actually Pretty Good |
| 7.0 | The Team Carries You Less |
| 8.0 | Certified Menace |
| 9.0 | Cracked |
| 10.0 | We Don't Deserve You |

- Labels appear directly below their corresponding major tick mark on the slider
- Font size: 10px, muted (`rgba(255,255,255,0.45)`), centred under tick
- **Data key:** `gamesmanship.skill: number` (one decimal place)

---

### B3. VIBE CHECK Questions

---

#### Question V1 — Rage Level
- **Type:** Decimal slider (same spec as G4)
- **Label:** `Rage level` (subheading glow treatment)
- **At every +1.0 major tick, show a description label:**

| Value | Label |
|-------|-------|
| 0.0 | Zen Monk |
| 1.0 | Light Crash Out |
| 2.0 | Audible Sigh |
| 3.0 | Passive Aggressive Pings |
| 4.0 | Muttering Under Breath |
| 5.0 | Full Blame Rotation |
| 6.0 | Voice Crack Incoming |
| 7.0 | Rage Quit Curious |
| 8.0 | Keyboard Is Trembling |
| 9.0 | Neighbours Have Concerns |
| 10.0 | Keyboard Through Wall |

- Same label display treatment as skill slider (10px, muted, centred under tick)
- **Data key:** `vibeCheck.rageLevel: number`

---

#### Question V2 — Personality
- **Type:** Multiple choice checkbox (multi-select)
- **Label:** `Your vibe` (subheading glow treatment)
- **Options:**
  - Calls out every enemy (the intel guy)
  - Teaches newer players (patience unlocked)
  - Hypes the team (resident cheerleader)
  - Quiet but deadly (says nothing, does everything)
  - Comedian / banter merchant (one-liners mid-firefight)
  - Strategist / over-thinker (has a plan, shares it loudly)
  - Results-only focused (no chat, just W or L)
  - Blames the game, never themselves (classic)
  - Goes full detective on the killcam (always reviewing evidence)
  - Apologises for everything (even their own deaths)
- **Display:** Checkbox list, full label shown, subtitle in smaller muted text
- **Minimum selections:** 1
- **Data key:** `vibeCheck.personality: string[]`

---

### B4. COMMS Questions

---

#### Question C1 — Willing to Chat (Text)
- **Type:** Yes / No toggle (styled as two large pill buttons, one selectable at a time)
- **Label:** `Down to type?` (subheading glow treatment)
- **Options:** `Yes` / `No`
- **Data key:** `comms.willingToChat: boolean`

---

#### Question C2 — Willing to Speak (Voice)
- **Type:** Yes / No toggle (same style as C1)
- **Label:** `Mic on?` (subheading glow treatment)
- **Options:** `Yes` / `No`
- **Data key:** `comms.willingToSpeak: boolean`

---

#### Question C3 — Languages Spoken
- **Type:** Multiple choice checkbox (multi-select) + one typeable "Other" field
- **Label:** `Languages you speak` (subheading glow treatment)
- **Predefined options (top 30 by total global speakers, 2025):**

| # | Language |
|---|----------|
| 1 | English |
| 2 | Mandarin Chinese |
| 3 | Hindi |
| 4 | Spanish |
| 5 | Arabic |
| 6 | French |
| 7 | Bengali |
| 8 | Portuguese |
| 9 | Russian |
| 10 | Indonesian |
| 11 | Urdu |
| 12 | German |
| 13 | Japanese |
| 14 | Swahili |
| 15 | Marathi |
| 16 | Telugu |
| 17 | Turkish |
| 18 | Tamil |
| 19 | Punjabi |
| 20 | Vietnamese |
| 21 | Wu Chinese (Shanghainese) |
| 22 | Korean |
| 23 | Italian |
| 24 | Hausa |
| 25 | Thai |
| 26 | Gujarati |
| 27 | Kannada |
| 28 | Polish |
| 29 | Ukrainian |
| 30 | Dutch |
| 31 | Other (type below) |

- **Option 31 — "Other":**
  - Checkbox labelled `Other`
  - When checked, a text input appears directly below it
  - Placeholder text: `Type your language exactly as others would type it`
  - Input is case-normalised on blur: first letter capitalised, rest lowercase (e.g. `klingon` → `Klingon`) so spelling variants don't prevent matching
  - Input is required if "Other" is checked — cannot proceed without filling it
  - **Data key:** `comms.languages: string[]` — the "Other" value is appended as a string to the same array as the predefined selections

- **Display:** Checkbox grid, 3 columns, options 1–30 in order, option 31 ("Other") always last and full-width spanning all 3 columns
- **Minimum selections:** 1
- **Data key:** `comms.languages: string[]`

---

### B5. Game-Specific Data Research Requirements

For Questions G1 (weapons) and G2 (maps), Claude Code must research and hardcode the full current data for every game in the list. The standard is the same as roles in SPEC_UPDATE_01 Section E4 — real data only, no invented placeholders.

**Key examples to follow:**

#### Escape from Tarkov — Weapons (abbreviated, Claude Code must complete)
Research full weapon list from the EFT wiki. Categories to include:
Assault rifles, DMRs, SMGs, shotguns, bolt-action rifles, pistols, machine guns, melee.
Examples: AK-74M, M4A1, HK 416A5, RSASS, MP5, Remington 870, Mosin-Nagant, Glock 17, Red Rebel Ice Pick (melee)

#### Escape from Tarkov — Maps
Customs, Interchange, Reserve, Shoreline, Woods, Streets of Tarkov, Lighthouse, Ground Zero, Factory (Day), Factory (Night), The Lab

#### Counter-Strike 2 — Weapons
Rifles: AK-47, M4A4, M4A1-S, FAMAS, Galil AR, SG 553, AUG
Snipers: AWP, SSG 08, SCAR-20, G3SG1
SMGs: MP9, MAC-10, MP5-SD, UMP-45, P90, PP-Bizon
Pistols: Desert Eagle, Glock-18, USP-S, P250, Five-SeveN, Tec-9, CZ75-Auto, Dual Berettas, R8 Revolver
Heavy: Nova, XM1014, MAG-7, Sawed-Off, M249, Negev
Knife: (all knife types as single option)

#### Counter-Strike 2 — Maps (current active pool, Premier + Competitive)
Research current map pool at implementation time. As of May 2026 likely includes: Mirage, Inferno, Dust2, Anubis, Nuke, Vertigo, Ancient, Overpass — verify at implementation.

#### VALORANT — Weapons
Research full current weapon roster. As of 2026:
Sidearms: Classic, Shorty, Frenzy, Ghost, Sheriff
SMGs: Stinger, Spectre
Rifles: Bulldog, Guardian, Phantom, Vandal
Shotguns: Bucky, Judge
Snipers: Marshal, Outlaw, Operator
Machine guns: Ares, Odin
Melee: (knife, counts as one option)

#### VALORANT — Maps (current active ranked pool)
Research at implementation time. As of Season 2026 Act 3, likely includes: Abyss, Ascent, Bind, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset — verify at implementation.

#### Arena Breakout: Infinite — Weapons
Research full weapon list from official wiki/patch notes.
Known categories: Assault rifles (e.g. AK series, M4 series), DMRs, Sniper rifles, SMGs, Shotguns, Pistols, Melee

#### Arena Breakout: Infinite — Maps
Research current map pool. Known: Armory, Valley — verify full current pool at implementation.

> For all other games: Claude Code must follow the same research standard. Real weapon names, real map names, no invented data. If a game (e.g. Ultrakill, Devil Daggers) has no traditional map pool or weapon selection mechanics, omit those questions for that game and replace with whatever game-specific mechanic is most relevant to playstyle matching.

---

### B6. Conditional Question Rendering

Since questions G1 and G2 are game-specific, the Build Profile page must read the selected game from `AppContext` and render the correct weapon and map options accordingly.

```ts
// AppContext provides:
const { selectedGame, selectedVersion, selectedPlatform } = useAppContext();

// Questions component reads this and renders the correct options:
const questions = getQuestionsForGame(selectedGame.id);
```

All question configs must be stored in `mockData.ts` under `GAME_QUESTIONS`:
```ts
export const GAME_QUESTIONS: Record<string, GameQuestions> = {
  'eft': {
    weapons: ['AK-74M', 'M4A1', ...],
    maps: ['Customs', 'Interchange', ...],
    roles: [...], // from SPEC_UPDATE_01
  },
  'cs2': { ... },
  // etc for all games
}
```

---

## SECTION C — Summary of Changes

| Area | Change |
|------|--------|
| Game grid sort order | Images first (A→Z), then no-image (A→Z) |
| Image display | `object-fit: contain` — full image visible, dark bars fill gaps |
| Placeholder tiles | Not acceptable — every game must have a real image |
| Image sourcing priority | Steam CDN → Steam capsule → Press CDN → IGDB → Wikipedia |
| Build profile structure | Questions grouped into Gamesmanship / Vibe Check / Comms |
| Gamesmanship questions | Weapons (checkbox), Maps (checkbox), Roles (checkbox), Skill (slider) |
| Vibe Check questions | Rage level (slider), Personality (checkbox) |
| Comms questions | Chat yes/no, Voice yes/no, Languages (checkbox + Other text input) |
| Skill slider labels | 11 humorous labels at every 1.0 increment |
| Rage slider labels | 11 humorous labels at every 1.0 increment |
| Language list | Top 30 global languages + Other (typeable, case-normalised) |
| Game-specific data | Weapons and maps researched per game, stored in GAME_QUESTIONS |
| Conditional rendering | Build profile reads selected game and renders correct options |
