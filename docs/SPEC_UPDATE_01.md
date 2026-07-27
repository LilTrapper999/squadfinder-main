# SquadFinder — Spec Update 01
> Amends `SQUADFINDER_SPEC.md`. Apply these changes on top of the original spec.

---

## SECTION A — SELECT GAME: Layout Changes

### A1. Sidebar (Category Panel) — Width

The sidebar must be **content-width snug**: wide enough for the longest label (`Extraction Shooters`) plus fixed horizontal padding of `12px` each side. No wider. No flexible grow.

Implementation note:
```css
/* Sidebar must NOT use a fixed fractional width like w-1/6 */
/* Instead: */
width: fit-content;
min-width: 0;
padding: 0 12px;
white-space: nowrap;
```

Claude Code must measure the rendered width of "Extraction Shooters" at the chosen font size and use that as the sidebar width. If using Tailwind, use `w-max` with `px-3`.

---

### A2. Game Grid (Main Panel) — Responsive Column Count

The game grid must calculate how many columns to render based on the **remaining available width** after the sidebar and version panel have taken their space.

**Column count formula:**
1. Compute `gridWidth = viewportWidth - sidebarWidth - versionPanelWidth`
2. Compute `rawCols = gridWidth / minTileWidth` (where `minTileWidth` = minimum acceptable tile width, recommended `160px`)
3. Apply rounding rule:
   - Fractional part `< 0.6` → round **down**, use larger tiles to fill
   - Fractional part `>= 0.6` → round **up**, use smaller tiles to fill
   - Examples: `3.5 cols → 3 cols (larger)`, `3.6 cols → 4 cols (smaller)`, `4.5 → 4`, `4.6 → 5`
4. Recompute tile width as `gridWidth / colCount` so tiles always fill the full grid width with no gaps

This logic must run on mount and on every window resize event.

```js
// Pseudocode
const rawCols = gridWidth / MIN_TILE_WIDTH;
const floor = Math.floor(rawCols);
const frac = rawCols - floor;
const colCount = frac >= 0.6 ? floor + 1 : floor;
const tileWidth = gridWidth / colCount;
```

Minimum column count: `2`. Maximum: `6`.

---

### A3. Game Logos / Images

Each game tile must display a logo image. Implementation:

- Use a `160×160px` (or square, dynamic) image area per tile
- Source: attempt to load from official press kit URLs if freely available and non-copyrighted (e.g. Steam CDN, official game sites). If unavailable or unclear, use a **styled dark placeholder tile** (`background: #1a1d26`) with the game name in Rajdhani bold, centred — this is the safe default for all tiles in the prototype
- Do NOT hotlink images from sites that prohibit it. When in doubt, use the placeholder
- Copyright/trademark marks: render as a superscript `©` or `™` in a small muted font (11px, `color: rgba(255,255,255,0.4)`) immediately after the game name below the tile. Use the mark listed in the game table in the original spec

---

### A4. Version Panel — Width

The version panel must also be **content-width snug**, dynamically sized to fit the longest version string for the **currently selected game**.

- On game selection, measure the longest version label string
- Set panel width to that string's rendered width + `24px` horizontal padding each side
- Panel width **changes as the user switches games** — it should animate with a CSS `transition: width 200ms ease`
- Minimum width: `180px`

```css
.version-panel {
  width: fit-content;
  min-width: 180px;
  padding: 0 24px;
  transition: width 200ms ease;
  white-space: nowrap;
}
```

---

### A5. Platform Selector

Add a **platform selector above the version list** when a selected game is available on multiple platforms with divergent version histories.

- Render as a segmented button group (e.g. `[PC] [Mobile]`)
- Only show platforms that are actually available for the selected game
- Switching platform refreshes the version list below it
- Games with a single platform: hide the selector entirely

Games in the list that require a platform selector (at minimum):
- Arena Breakout: Infinite (PC / Mobile — these are separate games with different seasons)
- Arena Breakout (Mobile-only, no selector needed)
- Call of Duty: Warzone (PC / Console)
- Any other game Claude Code identifies during data entry as having divergent platform versions

---

## SECTION B — SELECT GAME: Version Accuracy

### B1. Core Rule

**Only list versions the player can currently download and actively play on live servers.** A version is disqualified if:
- A mandatory update has superseded it and the old client is rejected by servers
- The servers for that version are shut down
- It is a legacy/archive build not accessible through normal install

Cosmetic events, skin seasons, or battle passes from a prior patch that are still "technically running" do NOT qualify as a playable version. The test is: **can I physically download this client and connect to live servers and play a full match right now?**

---

### B2. Accurate Version Data by Game

Use the following researched data. For games not listed here, Claude Code must research and apply the same standard. If unsure, list only the current live version.

---

#### Arena Breakout: Infinite (PC)
Mandatory-update game. Only the current season is playable.
- Season 5: Distortion (current, May 2026)
- Season 4: Dusk to Dawn (Jan 2026) — **disqualified**, mandatory update to S5

**List:** `Season 5: Distortion`

#### Arena Breakout (Mobile — separate entry)
Research current mobile season and list only live season(s).
- List whatever the current live mobile season is at time of implementation

---

#### Escape from Tarkov
EFT uses wipes — after a wipe, old progression is gone but the game client is the same live build. There are no separately downloadable versions. Only one live version exists at any time.

Current live versions (as of May 2026):
- Version 1.0.5.0 (current PvP + PvE, post-full-release patch)

EFT also has **PvE mode** (introduced at 1.0 full release, Nov 2025) as a distinct play mode, not a separate version.

**List:**
- `v1.0 — PvP (Live Wipe)`
- `v1.0 — PvE (Persistent)`

These are not different downloads but represent meaningfully different play experiences a squadmate would need to match on.

---

#### Escape from Tarkov: Arena
Separate game, currently in ongoing development.
- `v0.4.2.5` (current, Feb 2026)

**List:** `v0.4 — Current Live Build`

---

#### Hunt: Showdown 1896
Event-based seasonal model. One live client, always updated. No legacy versions downloadable.

Current event/season as of May 2026: research the active event from huntshowdown.com at implementation time.

**List:** `Current Season (live)` — Claude Code should fetch the actual event name at implementation

---

#### Counter-Strike 2 (CS2)
Single mandatory-update live game. No operations exist yet in CS2 (as of May 2026). Uses a Premier Season model.

Current: Premier Season 4 (started Jan 20, 2026, expected end ~June 21, 2026 after IEM Cologne Major)

**List:**
- `Premier Season 4 (Current)`

There is no legacy CS2 version a player can download and play separately.

---

#### CS:GO
CS:GO was sunset and replaced by CS2 in September 2023. **Players cannot download and play CS:GO on live servers.** Remove CS:GO from the game list entirely — it does not meet the playable version requirement.

> **Action for Claude Code:** Remove `Counter-Strike: Global Offensive (CS:GO)` from the Competitive FPS game list. It is not currently playable.

---

#### VALORANT
VALORANT uses a Season/Act model. One mandatory live client. Current as of May 2026:
- Season 2026, Act 3 (started Apr 29, 2026, ends ~Jun 24, 2026) — `Skirmish: Ascension`
- Season 2026, Act 2 (ended Apr 29) — **disqualified**, mandatory update
- No legacy acts are separately playable

**List:** `Season 2026 — Act 3 (Skirmish: Ascension)`

---

#### For all other games
At implementation time, Claude Code must:
1. Check the game's official site or Steam page for the current version
2. Check whether a mandatory update prevents playing prior versions
3. List only currently playable versions
4. If a game has been shut down or is no longer playable (e.g. Hyper Scape — shut down Jan 2023), **remove it from the list entirely** and replace it with a currently active game of the same category

Games to verify for shutdown status before including:
- Hyper Scape (shut down 2023 — **remove**)
- The Cycle: Frontier (shut down 2023 — **remove**)
- Rogue Company (verify current status)
- Diabotical (verify server status)
- Any others Claude Code flags as potentially defunct

---

## SECTION C — SELECT GAME: Visual & Copy Treatment

### C1. Main Headings — Full Treatment
All primary screen headings (the biggest text on each screen) must have ALL THREE of:
1. **All-caps punchy copy** — rewrite passively-named headings as aggressive imperatives
2. **Animated text** — use a CSS keyframe animation (e.g. letter-spacing pulse, slight Y-axis float, or glitch shimmer — pick one and apply consistently across all main headings)
3. **Pulsing amber/gold glow** — `text-shadow` cycling between low and high intensity via `@keyframes`

```css
@keyframes headingPulse {
  0%, 100% { text-shadow: 0 0 8px rgba(232, 160, 32, 0.4); }
  50%       { text-shadow: 0 0 24px rgba(232, 160, 32, 0.9), 0 0 48px rgba(232, 160, 32, 0.3); }
}

@keyframes headingFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-3px); }
}

.main-heading {
  animation: headingPulse 2.5s ease-in-out infinite, headingFloat 3s ease-in-out infinite;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #e8a020;
}
```

**Heading copy rewrites:**

| Screen | Old (passive) | New (punchy) |
|--------|--------------|--------------|
| Select Game — main | `Select your main game` | `CHOOSE YOUR BATTLEFIELD` |
| Select Game — sidebar header | `Categories` | `YOUR ARENA` |
| Select Game — version panel header | `Select Version` | `LOCK YOUR PATCH` |
| Build Profile — main | `Build My Profile` | `BUILD YOUR LEGEND` |
| Squad Matches — main | `Your Squad Matches` | `YOUR SQUAD AWAITS` |
| Login — main | `Find Your Squad` | `FIND YOUR SQUAD` (already good — keep, add treatment) |

---

### C2. Subheadings — Pulsing Glow Only
All subheadings and supporting labels (section labels, panel headers, question group titles) get a **pulsing glow only** — no animation on the text itself, no all-caps rewrite.

```css
@keyframes subPulse {
  0%, 100% { text-shadow: 0 0 4px rgba(232, 160, 32, 0.2); }
  50%       { text-shadow: 0 0 12px rgba(232, 160, 32, 0.6); }
}

.sub-heading {
  animation: subPulse 3s ease-in-out infinite;
  color: rgba(255, 255, 255, 0.85);
}
```

---

### C3. Body / Labels / Options
No glow, no animation. Plain `color: rgba(255,255,255,0.7)` or white depending on context.

---

## SECTION D — BUILD MY PROFILE: Layout

### D1. Landscape Single Page, No Scroll (default)

Replace the current portrait scroll layout with a **3-column landscape layout** that fits entirely within one viewport height (no vertical scroll required, except for games with very large option lists — see D3).

- Use CSS Grid: `grid-template-columns: repeat(3, 1fr)`
- Questions flow left-to-right, top-to-bottom, filling columns evenly using CSS `column-count: 3` or a JS-driven flow algorithm
- Claude Code should use `column-count` and `column-fill: balance` on the question container for simplest implementation
- No explicit grouping or section labels separating the columns — questions just flow
- Page heading (`BUILD YOUR LEGEND`) sits above the 3-column grid, full width
- `Find My Squad →` CTA button is pinned to **bottom-right of the viewport** (`position: fixed; bottom: 24px; right: 24px`) — enabled/disabled based on completion state

---

### D2. Decimal Sliders

All range/slider inputs must use this spec:

- **Range:** `0.0` to `10.0`
- **Step:** `0.1` (snappable at every 0.1 increment)
- **Visual tick marks:** 11 major ticks at `0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10` rendered below the slider track using a `<datalist>` or absolutely-positioned tick divs
- **Minor ticks:** 9 minor ticks between each major tick (at each 0.1 step) — rendered smaller/shorter than major ticks
- **Value display:** A read-only text input below the slider always showing current value to exactly 1 decimal place (e.g. `4.4`, never `4` or `4.40`)
- The value display updates live as the slider moves
- **Label mapping** (shown at major tick positions or as end-cap labels):
  - For Experience slider: `0.0 = Beginner`, `2.5 = Casual`, `5.0 = Experienced`, `7.5 = Veteran`, `10.0 = Elite`
  - For Rage Meter slider: `0.0 = Zen Monk`, `2.5 = Chill`, `5.0 = Occasionally Tilted`, `7.5 = Rage Mode`, `10.0 = Full Toxic`
  - Other sliders: label only the endpoints

```html
<!-- Example implementation -->
<input type="range" min="0" max="100" step="1" id="expSlider" />
<!-- Store as value/10 internally, display as (value/10).toFixed(1) -->
<input type="text" readonly id="expDisplay" value="0.0" />
```

> Note: Use `min=0 max=100 step=1` internally and divide by 10 for display, to avoid floating-point precision issues with `step=0.1`.

---

### D3. Scroll Exception

If a game has a very large operator/agent list (e.g. VALORANT agents 25+, R6 Siege operators 60+), the column containing that question may scroll independently (`overflow-y: auto`) while the rest of the page remains fixed. Do not let this break the overall no-scroll layout illusion — use a constrained max-height on that question block only.

---

## SECTION E — BUILD MY PROFILE: Questions

### E1. Removed Questions

**Remove entirely** — do not include in any game's question set:
- Age group
- Play schedule / availability
- Any question asking for personal information

---

### E2. All Questions Must Be Game-Specific

Every question on the Build Profile page must be researched and tailored to the selected game. Generic fallback questions are not acceptable.

**Roles / Playstyle:** Must have a minimum of 10 options per game. Each option has:
- A **primary label** (the role name, can be humorous/flavourful)
- A **subtitle** below it (straight descriptor, 3–6 words)

If no community-established humour exists for a role in a particular game, omit the subtitle humour — do not invent it. Simple, accurate subtitles are fine.

---

### E3. Game-Specific Question Sets (Researched)

Below are the question sets for key games. Claude Code must research and replicate this level of detail for ALL 90 games in the list. Where a game has been shut down or is not playable, skip it (see Section B2).

---

#### ESCAPE FROM TARKOV

**Roles (min 10):**
| Primary Label | Subtitle |
|--------------|---------|
| The Rat | Extract with gear, never fight |
| Chad Rusher | First through the door, always |
| Loot Goblin | Every loose round goes in the bag |
| Quest Grinder | Wipe? Doesn't matter, tasks first |
| Sniper Scav | 500m shots, zero bullets left |
| Thermals Guy | Pay-to-win energy, zero remorse |
| Factory Psycho | 6-minute maps, 200 kills |
| Camp & Count | That bush has been there 20 mins |
| Solo Hunter | Squad is a liability, thanks |
| Friendly Scav | Scav karma maxed, vibes only |
| PvE Enjoyer | Kill AI, avoid humans |
| Finance Bro | Flea market manipulation artist |

**Game-specific questions:**
- Preferred map (dropdown: Customs, Interchange, Reserve, Shoreline, Woods, Streets of Tarkov, Lighthouse, Ground Zero, Factory, Labs)
- Preferred faction: PMC / Scav
- Raid budget (slider 0.0–10.0): `0.0 = Budget Chad (naked)` → `10.0 = Full Meta Slav`
- Risk tolerance (slider): `0.0 = Extract at first sound` → `10.0 = Fight until dead`
- Loot priority (multi-select): High-value items / Quest items / Player kills / PvE kills / Mixed / Whatever spawns

---

#### ARENA BREAKOUT: INFINITE

**Roles (min 10):**
| Primary Label | Subtitle |
|--------------|---------|
| Loot or be Looted | Long-range marksman, sniper main |
| The Accountant | Tracks every Koen in the raid |
| Wall Bandit | Every wall is see-through to me |
| Door Kicker | First in, always first in |
| Drone Operator | Recon before stepping anywhere |
| Budget Warrior | Full raid on vendor gear only |
| Orange Zone Degen | Forbidden Zone or nothing |
| Grenade Diplomat | Resolves disputes via frag |
| Extraction Artist | Gets out, gets paid, logs off |
| Ambush Architect | Sets up, waits, wins |
| Solo Cowboy | No squad, no problem |
| Gear Fear Connoisseur | Too scared to use the good kit |

**Game-specific questions:**
- Platform (PC / Mobile — if not already selected via platform toggle)
- Preferred zone tier (dropdown): Green / Yellow / Orange / Red (Forbidden)
- Koen budget per raid (slider 0.0–10.0): `0.0 = Naked & Afraid` → `10.0 = Full Loadout Flex`
- Preferred map (dropdown: Armory, Valley, — research current map pool at implementation)
- Extraction priority (slider): `0.0 = Always extract clean` → `10.0 = Die with the loot`

---

#### COUNTER-STRIKE 2

**Roles (min 10):**
| Primary Label | Subtitle |
|--------------|---------|
| Entry Fragger | First peek, first blood, first death |
| AWPer | One shot, one kill, one whiff |
| Lurker | Flanking while team dies out front |
| IGL | Calls strats, gets blamed for losses |
| Support | Flashes for others, never for self |
| Rifler | AK spray at 5hp around corner |
| Nade Spammer | Throws smokes into wall every round |
| Eco Round Despot | Buys Deagle on eco, top frags |
| Anchor CT | Locked in B site all game |
| Fake Executor | Fakes A, B team doesn't rotate |
| Clutch Merchant | 1vX or nothing — always nothing |
| Trade Bot | Traded every round, 0 net value |

**Game-specific questions:**
- Premier rating / rank (dropdown: Unranked, Grey 1–5k, Blue 5–10k, Purple 10–15k, Pink 15–20k, Red 20–25k, Gold 25k+)
- Preferred side: CT / T / No preference
- Preferred map pool (multi-select: Mirage, Inferno, Dust2, Anubis, Nuke, Vertigo, Ancient, Overpass — research current active pool)
- Preferred role weapon: AWP / Rifle / SMG / Pistol / Utility-focused
- Communication: IGL / Caller / Info-only / Silent

---

#### VALORANT

**Roles — by agent class, show actual agents:**

> Display the role question as: "Preferred agent class" (dropdown by class) + "Preferred agents" (multi-select of actual agent names within that class). Research the full current agent roster at implementation time.

Agent classes as of Season 2026 Act 3:
- **Duelist:** Jett, Reyna, Phoenix, Neon, Yoru, Iso, Waylay
- **Initiator:** Sova, Breach, Skye, KAY/O, Fade, Gekko, Tejo
- **Controller:** Omen, Brimstone, Viper, Astra, Harbor, Clove
- **Sentinel:** Sage, Cypher, Killjoy, Chamber, Deadlock, Vyse
- **New (S2026):** Miks (Controller) — include if confirmed at implementation

*Note: Miks was released in Season 2026 Act 2. Include in Controller list.*

**Game-specific questions:**
- Preferred agent class (single-select: Duelist / Initiator / Controller / Sentinel)
- Preferred agents (multi-select from that class)
- Current rank (dropdown: Iron 1–3, Bronze 1–3, Silver 1–3, Gold 1–3, Platinum 1–3, Diamond 1–3, Ascendant 1–3, Immortal 1–3, Radiant)
- Preferred map pool (multi-select — research current active ranked map pool at implementation)
- Attack/Defence preference (slider 0.0–10.0): `0.0 = Full Attacker` → `10.0 = Full Defender`
- Comms style: Full IGL / Caller / Info only / Silent / Muted (no mic)

---

#### HUNT: SHOWDOWN 1896

**Roles (min 10):**
| Primary Label | Subtitle |
|--------------|---------|
| Bounty Bandit | Steals your extract, waves bye |
| Sniper on the Tower | 500m Mosin, no conscience |
| Trait Hoarder | 50 traits, still dies to a Romero |
| Consumable Connoisseur | Inventory of bandages, dies to fire |
| Solo vs Trios Guy | Deliberately queues against teams |
| Ambush Innkeeper | Campfire, lantern, shotgun, waits |
| Bounty Rusher | Cares about K/D, not the hunt |
| Butcher Farmer | Only here for the big boss |
| Poison Trail Poisoner | Sticky bombs on every doorway |
| Dark Sight Spammer | Watches orbs, won't move |
| Lore Appreciator | Reads every clue, dies to a crows |
| Crossbow Purist | Won't touch gunpowder |

**Game-specific questions:**
- Hunter tier preference: Tier 1 / Tier 2 / Tier 3 (when available)
- Preferred map: Bayou / Mammon's Gulch / No preference
- Preferred target: Butcher / Assassin / Spider / Scrapbeak / No preference
- Team size: Solo / Duo / Trio
- Preferred loadout style (slider 0.0–10.0): `0.0 = Budget Iron` → `10.0 = Legendary Everything`

---

#### RAINBOW SIX SIEGE

> Show actual operators, grouped by attack/defence and faction/unit. Research full current operator roster at implementation time — Siege has 60+ operators as of 2026.

**Question format:**
- Attack or Defence main (single-select)
- Preferred attack operators (multi-select, show icons + names)
- Preferred defence operators (multi-select)
- Rank (dropdown: Copper 1–5, Bronze 1–3, Silver 1–3, Gold 1–3, Platinum 1–3, Diamond 1–3, Champion)
- Preferred map pool (multi-select — research current ranked maps)
- Roam or Anchor (for defence): Roamer / Anchor / 3-speed flex / Hard breacher
- Fragging or utility focus (slider 0.0–10.0): `0.0 = Full Utility Bot` → `10.0 = Pure Fragger`

---

#### CALL OF DUTY: WARZONE

**Roles (min 10):**
| Primary Label | Subtitle |
|--------------|---------|
| Drop Hot Merchant | Lands Stadium, dies in 10 seconds |
| Zone Rat | Plays final circle from minute one |
| Sniper Nest Architect | Finds a hill, lives there forever |
| Vehicle Menace | Runs squads over, calls it strategy |
| Revive Bot | Dies, gets revived, dies again |
| Gulag God | 1v1 locked in, drops back clutch |
| Contract Runner | Ignores fights, stacks cash |
| UAV Spammer | Buys UAVs, still dies |
| Loadout Rusher | Won't fight until loadout drop |
| Shield Turtle | Deploys riot shield, crouches, vibes |
| Wall Runner | Horizontal movement IQ off the charts |
| Final Circle Gambler | Ignores zone until too late |

**Game-specific questions:**
- Preferred movement style (slider 0.0–10.0): `0.0 = Slow & Methodical` → `10.0 = Slide-Cancel Maniac`
- Preferred squad size: Solo / Duos / Trios / Quads
- Gulag record (slider 0.0–10.0): `0.0 = Zero gulag wins` → `10.0 = Undefeated`
- Preferred loadout class: AR / Sniper / SMG / Shotgun / LMG / Pistol

---

### E4. Claude Code Research Requirement

For every game not detailed above, Claude Code must:

1. Search for the game's current community-established role/playstyle taxonomy (Reddit, official wiki, tier list sites)
2. Find at least 10 roles with community-known nicknames or humorous labels where they exist
3. Find game-specific questions that make sense (weapons, maps, mechanics unique to that game)
4. If a game has fewer than 10 community-established roles, list as many as genuinely exist — do not pad with generic ones
5. If no community humour exists for a role, use a plain accurate subtitle with no flavour text — do not invent humour

**Do not proceed to UI rendering until the mock data for all included games is complete.**

---

## SECTION F — Summary of Changes to Original Spec

| Area | Change |
|------|--------|
| Sidebar width | Fixed → content-snug (`fit-content`) |
| Game grid columns | Fixed fraction → dynamic responsive formula with 0.6 rounding rule |
| Game tile images | Added — official logos where free, styled placeholder otherwise |
| Version panel width | Fixed → content-snug, animates on game switch |
| Platform selector | Added above version list for multi-platform games |
| CS:GO | Removed — not playable on live servers |
| Hyper Scape | Removed — shut down 2023 |
| The Cycle: Frontier | Removed — shut down 2023 |
| Version data | Must be currently playable only — mandatory update rule enforced |
| Main headings | Punchy all-caps copy + float animation + pulsing amber glow |
| Subheadings | Pulsing amber glow only |
| Build Profile layout | Portrait scroll → 3-column landscape, CSS column-count flow |
| Sliders | 0.0–10.0, step 0.1, snappable, tick marks, live decimal display |
| Removed questions | Age group and play schedule removed entirely |
| Game-specific roles | Minimum 10 per game, humour where community-established |
| Role format | Primary label + straight subtitle |
| Large operator lists | In-column scroll for that block only (VALORANT, R6) |
