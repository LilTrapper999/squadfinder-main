# SquadFinder — Claude Code Implementation Spec

## ⚠️ MANDATORY FIRST STEP: Codebase Review

Before writing a single line of code, Claude Code MUST:

1. **Explore the repo root** — list all files and directories
2. **Read the existing stack** — identify framework, package manager, existing deps (package.json / requirements.txt / pyproject.toml etc.)
3. **Read all existing source files** — understand current folder structure, routing approach, auth setup, component patterns, state management, styling system
4. **Check for any existing auth, DB, or API config** — `.env.example`, config files, existing DB schemas
5. **Read any existing README** — understand the project's stated intent and any prior decisions
6. **Summarise findings before proceeding** — write a short summary of what exists and state any assumptions before touching any file

Only after completing the above review should Claude Code begin implementing.

---

## Project Overview

**App name:** SquadFinder  
**Purpose:** Match FPS / extraction shooter gamers with compatible squadmates based on playstyle, role preference, and game version.  
**Delivery:** Click-through UI prototype first (no real DB wiring yet). All data is mocked/hardcoded. Database schema design comes in a later phase once UI is approved.

---

## Tech Stack Guidance

Adopt whatever stack already exists in the repo. If the repo is empty or has no strong opinion, default to:

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Auth:** NextAuth.js with Google OAuth provider
- **State:** React Context or Zustand (lightweight)
- **Data:** Mocked JSON / hardcoded arrays (no DB this phase)
- **Fonts:** Rajdhani (headings) + Inter (body) via Google Fonts

**Aesthetic:** Dark gaming UI — deep navy/charcoal backgrounds (`#0a0b0f`, `#111318`), amber/gold accent (`#e8a020`), tight borders at 1px with low-opacity white. Think tactical HUD, not neon cyberpunk.

---

## Screen-by-Screen Specification

---

### SCREEN 1 — Login / Signup (Single Page, `/`)

**Layout:** Centred card on full-screen dark background. Subtle noise texture or diagonal grid pattern behind it.

**Logic (mocked for prototype):**
- Show a single **"Continue with Google"** button (styled, not functional in prototype — clicking it advances to the correct next screen based on mock user state)
- Add a **"Remember me"** checkbox below the button
- If mock state = `returningUser` → clicking Google button goes to **Screen 3** (Homepage/Game Select)
- If mock state = `newUser` → clicking Google button goes to **Screen 2** (this is the default for prototype)
- Add a small toggle at bottom: `[ ] Returning user (demo)` — lets reviewer switch between both flows during click-through

**Copy:**
- Heading: `Find Your Squad`
- Subheading: `Connect with players who match your style, game, and version.`
- Button label: `Continue with Google`

**UI elements:**
- Google "G" logo on the button (SVG inline or img)
- SquadFinder logo / wordmark at top (text-based is fine, styled with Rajdhani)
- Subtle animated background (CSS only — slow diagonal scan line or grid pulse)

---

### SCREEN 2 — Game Select (First-Time User Journey, `/select-game`)

**Layout:** Three vertical columns, full viewport height, no scroll on outer shell.

#### 2a — Sidebar (1/6 width, leftmost)

- Dark background (`#111318`), 1px right border
- Three category items, vertically stacked:
  1. **Extraction Shooters**
  2. **Competitive FPS**
  3. **FPS**
- Active category highlighted with amber left-bar accent and slightly lighter background
- Clicking a category updates the game grid (2b)
- Default active: Extraction Shooters

#### 2b — Game Grid (1/2 width, centre)

- Header: `Select your main game` (small, muted, uppercase tracking)
- 2-column grid of game tiles
- Each tile:
  - Large game logo image (see logo list below — use official logo URLs or placeholder images named correctly)
  - Game name below logo in Rajdhani
  - Copyright symbol © or ™ where applicable (see list)
  - Hover: amber border glow
  - Selected: solid amber border, subtle amber tint overlay
  - Only ONE tile selectable at a time
- Show 30 games per category (lists below)
- Tiles are scrollable within this column if they exceed viewport height

**Game lists and logos:**

*Extraction Shooters:*
| Game | Mark | Logo source hint |
|------|------|-----------------|
| Escape from Tarkov | © | Battlestate Games |
| Hunt: Showdown 1896 | © | Crytek |
| Gray Zone Warfare | © | Madfinger |
| Delta Force | © | Team Jade |
| The Cycle: Frontier | © | YAGER |
| Marauders | © | Small Impact |
| Dark and Darker | © | Ironmace |
| Arena Breakout | © | MoreFun Studios |
| Arena Breakout: Infinite | © | MoreFun Studios |
| Scum | © | Gamepires |
| Vigor | © | Bohemia Interactive |
| Hyenas | © | Creative Assembly |
| Hawked | © | MY.GAMES |
| Miscreated | © | Entrada Interactive |
| Once Human | © | Starry Studio |
| STALKER 2 | © | GSC Game World |
| Deadside | © | Bad Pixel |
| Syndrome | © | Camel 101 |
| Incursion Red River | © | Rocketbirds |
| Project Zomboid | © | The Indie Stone |
| Rust | © | Facepunch |
| DayZ | © | Bohemia Interactive |
| The Division 2 | © | Ubisoft |
| Warzone | © | Activision |
| Dying Light 2 | © | Techland |
| Risk of Rain 2 | © | Hopoo Games |
| Vampire: The Masquerade — Bloodhunt | © | Sharkmob |
| Fractured Online | © | Dynamight Studios |
| Survarium | © | Vostok Games |
| Forever Winter | © | Fun Dog Studios |

*Competitive FPS:*
| Game | Mark |
|------|------|
| Counter-Strike 2 (CS2) | © Valve |
| Counter-Strike: Global Offensive (CS:GO) | © Valve |
| VALORANT | © Riot Games |
| Rainbow Six Siege | © Ubisoft |
| Rainbow Six Extraction | © Ubisoft |
| Overwatch 2 | © Blizzard |
| Apex Legends | © EA/Respawn |
| Splitgate 2 | © 1047 Games |
| Quake Champions | © id Software |
| Team Fortress 2 | © Valve |
| Halo Infinite | © Microsoft |
| Battlefield 2042 | © EA DICE |
| Battlefield V | © EA DICE |
| Enlisted | © Gaijin |
| Rogue Company | © Hi-Rez |
| XDefiant | © Ubisoft |
| Hyper Scape | © Ubisoft |
| Diabotical | © GD Studio |
| Bloodhunt | © Sharkmob |
| FragPunk | © Bad Guitar Studio |
| Tribes 3: Rivals | © Prophecy Games |
| Void Bastards | © Blue Manchu |
| Gunfire Reborn | © Duoyi Games |
| BattleBit Remastered | © SgtOkiDoki |
| Prodeus | © Bounding Box Software |
| Turbo Overkill | © Trigger Happy Interactive |
| Devil Daggers | © Sorath |
| Boomerang X | © DANG! |
| Severed Steel | © Greylock Studio |
| Ultrakill | © Arsi "Hakita" Patala |

*FPS (general):*
| Game | Mark |
|------|------|
| Call of Duty: Modern Warfare III | © Activision |
| Call of Duty: Warzone | © Activision |
| Call of Duty: Black Ops 6 | © Activision |
| Destiny 2 | © Bungie |
| Far Cry 6 | © Ubisoft |
| Borderlands 3 | © 2K/Gearbox |
| Tiny Tina's Wonderlands | © 2K/Gearbox |
| Doom Eternal | © id Software |
| Doom: The Dark Ages | © id Software |
| Wolfenstein: Youngblood | © Bethesda |
| Bioshock Infinite | © 2K |
| Metro Exodus | © 4A Games |
| Deep Rock Galactic | © Ghost Ship |
| Payday 3 | © Starbreeze |
| Back 4 Blood | © Turtle Rock |
| Vermintide 2 | © Fatshark |
| Helldivers 2 | © Arrowhead |
| Remnant II | © Gunfire Games |
| Outriders | © People Can Fly |
| Insurgency: Sandstorm | © New World Interactive |
| Ground Branch | © BlackFoot Studios |
| Ready or Not | © VOID Interactive |
| SWAT 4 | © Sierra/Vivendi |
| Brothers in Arms: Road to Hill 30 | © Gearbox |
| Medal of Honor (2010) | © EA |
| Arma Reforger | © Bohemia Interactive |
| Squad | © Offworld Industries |
| Post Scriptum | © Periscope Games |
| Hell Let Loose | © Team17 |
| Escape from Tarkov: Arena | © Battlestate Games |

> **Logo implementation:** For the prototype, use high-quality placeholder images with the game name. Use a consistent dark tile background (`#1a1d26`) with the game name in Rajdhani. If any logos are freely available as PNGs via official press kits, link them. Do not hot-link copyrighted assets without confirming licence.

#### 2c — Version Selector (1/3 width, rightmost)

- Appears when a game tile is selected in 2b
- Header: `{Game Name} — Select version`
- Shows the **5 most recent versions / seasons / major updates** for the selected game as a selectable vertical list
- Each version item: version number or season name + release date (mocked)
- Selected version: amber highlight
- "Find my squad" button pinned to **bottom-right of this panel** — disabled (greyed) until a version is selected, enabled once selected
- Button label: `Find My Squad →`

**Mocked version data example (Escape from Tarkov):**
1. Patch 0.15 — Streets of Tarkov Expansion (2024)
2. Patch 0.14 — Ground Zero (2024)
3. Patch 0.13.5 — The Unheard Edition (2023)
4. Patch 0.13 — Lighthouse (2022)
5. Patch 0.12.12 — Christmas (2021)

Create similarly plausible mocked version lists for all 90 games.

---

### SCREEN 3 — Build My Profile (`/build-profile`)

Reached after clicking "Find My Squad" from Screen 2.

**Layout:** Single centred column, max-width ~700px, dark card on dark bg.

**Sections:**

#### 3a — Welcome message
```
Welcome, [Username]
Let's build your player profile for {Selected Game} ({Selected Version}).
This helps us find squadmates who actually match your style.
```

#### 3b — Generic questions (apply to all games)

**1. Preferred role**
Radio or styled button group. Options vary by game type (see below), but always show at least:
- Assaulter
- Sniper / Marksman
- Support
- Rusher / Entry fragger
- Recon / Scout
- Flexible

**2. Play schedule**
Multi-select chips:
- Weekday mornings, Weekday evenings, Weekend daytimes, Weekend nights, Late night / graveyard

**3. Communication style**
Single select:
- Voice comms always on
- Voice when needed
- Text / pings only
- Silent runner

**4. Experience level**
Slider: Beginner → Casual → Experienced → Veteran → Elite

**5. Squad size preference**
Chips: Solo, Duo, Trio, Full squad

#### 3c — Game-specific questions

These change depending on selected game. Use the selected game from Screen 2 to conditionally render the right set.

**If Extraction Shooter selected:**
- In-game currency / money willing to spend per raid (slider: 0 → 500k roubles / equivalent)
- Preferred loot focus: High-value items / Quest items / Player kills / Mixed
- Extraction priority: Always extract / Extract when loaded / YOLO / Depends on situation
- Primary weapon class: Assault rifle / DMR / SMG / Shotgun / Pistol build / Knife/melee run
- Preferred map (dropdown populated with maps for selected game)
- PMC or Scav main (if Tarkov) / equivalent faction mechanic
- Risk tolerance: Ultra-cautious / Methodical / Balanced / Aggressive / Full send

**If Competitive FPS selected:**
- Preferred weapon / agent / operator (dropdown specific to game, e.g. VALORANT agents, R6 operators, CS2 weapon preference)
- Rank / MMR (dropdown: Unranked, Bronze, Silver, Gold, Platinum, Diamond, Master, Radiant / equivalent)
- Preferred map pool (multi-select of that game's map pool)
- Attack or Defence preference
- IGL (In-Game Leader) willing: Yes / No / Sometimes

**If FPS (general) selected:**
- Primary weapon class
- Co-op role: Damage / Tank / Healer / Support / Utility
- Campaign or multiplayer focus
- Difficulty preference: Story / Normal / Hard / Max difficulty

#### 3d — Vibe / personality questions (all games)

**6. Rage meter**
Slider: Zen monk → Occasional outburst → Rages but cools down → Often tilted → Full toxic

**7. Age group**
Chips: Under 18 / 18–24 / 25–34 / 35–44 / 45+

**8. Personality vibe**
Multi-select:
- Calls out every enemy
- Teaches newer players
- Hypes the team
- Quiet but deadly
- Comedian / Banter
- Strategist / Over-thinker
- Results-only focused

**CTA:** `Find My Squad →` button, bottom right, enabled after at minimum: role + 2 game-specific answers filled.

---

### SCREEN 4 — Best Matching Squad (`/squad-matches`)

**Layout:** Full-width dark page. Max content width ~1100px centred.

**Header section:**
- `Your Squad Matches` — large Rajdhani heading
- Selected game + version shown as a badge top right

**Overall match score (top of page):**
- Large percentage number (e.g. `87%`) in the matching colour
- Below it: a full-width horizontal bar showing that percentage
- Bar colour scheme (traffic light):
  - 90–100%: bright green (`#22c55e`)
  - 80–89%: softer green (`#86efac`)
  - 70–79%: yellow (`#facc15`)
  - 60–69%: amber (`#f97316`)
  - Below 60%: red (`#ef4444`)
- Label: `Overall squad compatibility`

**Match cards (below overall score):**

Show 5–8 mocked match cards in a 2-column grid.

Each card contains:
- Anonymous username (e.g. `Ghost_Delta`, `ShadowRook_7` — no real names or IDs)
- Avatar: geometric shape / initial only, no photos
- **Sub-scores with individual bars:**
  - Gamesmanship match (e.g. 92%)
  - Vibe check (e.g. 78%)
  - Schedule overlap (e.g. 85%)
  - Role compatibility (e.g. 91%)
  - Communication style (e.g. 70%)
- Each sub-score bar uses the same traffic light colour scheme
- A `Request to Squad` button at the bottom of each card — **disabled by default**

**Card selection:**
- Clicking anywhere on a card selects it (highlighted amber border)
- Once selected, `Request to Squad` button on that card becomes **enabled**
- Only one card can have an active request at a time (or allow multiple — designer's call, note it)

**Request sent state:**
- After clicking `Request to Squad`, that card's button changes to a badge: `Request Sent ✓` (muted, non-clickable)
- Card gets a subtle amber top-border pulse then settles
- A small note on the card: `They'll see your username. You won't see theirs until they accept.`

**Privacy note (footer of page):**
> Usernames are anonymised until both players accept. No real names or IDs are ever shown.

---

## Navigation & Flow Summary

```
/ (Login)
  │
  ├─ New user ──► /select-game (Screen 2)
  │                 │
  │                 └─► /build-profile (Screen 3)
  │                       │
  │                       └─► /squad-matches (Screen 4)
  │
  └─ Returning user ──► /select-game (or /home — TBD in later phase)
```

For the prototype, a persistent top bar showing current screen + a `← Back` nav link is sufficient. No hamburger menu needed yet.

---

## Mocked Data Requirements

Create a `/lib/mockData.ts` (or `.js`) file containing:

- `GAMES_BY_CATEGORY` — object with three arrays (extraction, competitive, fps), each with 30 game objects: `{ id, name, category, mark, versions: [{id, label, date}] }`
- `MOCK_MATCHES` — array of 8 match objects: `{ id, username, avatar_initial, overall, gamesmanship, vibe, schedule, role_compat, comms }`
- `GAME_SPECIFIC_QUESTIONS` — keyed by category, each with an array of question configs (label, type, options)

---

## File / Folder Structure to Create

```
/app
  /page.tsx                  ← Screen 1: Login
  /select-game/page.tsx      ← Screen 2: Game Select
  /build-profile/page.tsx    ← Screen 3: Build Profile
  /squad-matches/page.tsx    ← Screen 4: Squad Matches

/components
  /auth/LoginCard.tsx
  /game-select/Sidebar.tsx
  /game-select/GameGrid.tsx
  /game-select/GameTile.tsx
  /game-select/VersionSelector.tsx
  /profile/ProfileForm.tsx
  /profile/QuestionBlock.tsx
  /matches/MatchCard.tsx
  /matches/MatchBar.tsx
  /matches/OverallScore.tsx
  /ui/Button.tsx
  /ui/Chip.tsx
  /ui/Slider.tsx

/lib
  /mockData.ts
  /types.ts

/context
  /AppContext.tsx             ← holds selected game, version, profile answers, flow state
```

---

## Prototype Constraints (Phase 1)

- **No real auth** — simulate Google OAuth with a button click
- **No database** — all data from `mockData.ts`
- **No API calls** — matching scores are hardcoded in mock data
- **No email / notification system** — "Request Sent" is UI state only
- **Responsive:** Desktop-first. Must work at 1280px+. Mobile layout is a later phase.

---

## Phase 2 (Do NOT implement yet — for context only)

- Supabase or PlanetScale DB integration
- Real Google OAuth via NextAuth
- Matching algorithm (weighted scoring across profile fields)
- Real-time notifications for squad requests
- User dashboard / homepage for returning users
- In-app messaging once both players accept

---

## Review Protocol

Once the click-through prototype is complete, the product owner will:
1. Click through all screens
2. Leave comments on UI (layout, copy, colours, interactions)
3. Sign off on the flow
4. Only then does Phase 2 (DB + real auth) begin

**Do not merge any DB schema or auth wiring until explicit sign-off.**
