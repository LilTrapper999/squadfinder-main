# SquadFinder — Spec Amendment 01a
> Amends Section A3 of `SPEC_UPDATE_01.md`. Apply after SPEC_UPDATE_01.

---

## SECTION A3a — Game Logo Sourcing (Steam CDN First)

Replace the logo sourcing guidance in Section A3 with the following:

### Priority Order for Logo Sources

**1. Steam CDN (primary — use for all Steam games)**

Every game on Steam has a publicly accessible header image at a predictable URL:

```
https://cdn.cloudflare.steamstatic.com/steam/apps/{STEAM_APP_ID}/header.jpg
```

This is the standard `460×215px` Steam capsule/header image. Use it as the tile image, cropped or fitted to the square tile area with `object-fit: cover` and `object-position: center`.

Claude Code must:
1. Look up the Steam App ID for every game in the list that is on Steam
2. Hardcode the URL into `mockData.ts` as the `logoUrl` field for each game object
3. Use `<img src={game.logoUrl} alt={game.name} />` in the tile component

Example entries in `mockData.ts`:
```ts
{
  id: 'eft',
  name: 'Escape from Tarkov',
  steamAppId: 1868140,
  logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1868140/header.jpg',
  // ...
},
{
  id: 'abi',
  name: 'Arena Breakout: Infinite',
  steamAppId: 2073620,
  logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2073620/header.jpg',
  // ...
},
{
  id: 'cs2',
  name: 'Counter-Strike 2',
  steamAppId: 730,
  logoUrl: 'https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg',
  // ...
},
```

**Known Steam App IDs to include in mockData.ts (Claude Code must verify and complete this list):**

| Game | Steam App ID |
|------|-------------|
| Escape from Tarkov | 1868140 |
| Hunt: Showdown 1896 | 594650 |
| Arena Breakout: Infinite | 2073620 |
| Gray Zone Warfare | 2479810 |
| Dark and Darker | 2016590 |
| Marauders | 1929010 |
| DayZ | 221100 |
| Rust | 252490 |
| SCUM | 513710 |
| The Forever Winter | 2688250 |
| Deadside | 895400 |
| Once Human | 2139460 |
| STALKER 2 | 1643320 |
| Delta Force | 2507540 |
| Counter-Strike 2 | 730 |
| VALORANT | N/A — not on Steam (see below) |
| Rainbow Six Siege | 359550 |
| Apex Legends | 1172470 |
| Team Fortress 2 | 440 |
| Halo Infinite | 1240440 |
| Battlefield 2042 | 1517290 |
| Battlefield V | 1238810 |
| Enlisted | 1176470 |
| BattleBit Remastered | 671860 |
| Deep Rock Galactic | 548430 |
| Helldivers 2 | 553850 |
| Ready or Not | 1144200 |
| Insurgency: Sandstorm | 581320 |
| Ground Branch | 16900 |
| Squad | 393380 |
| Hell Let Loose | 686810 |
| Post Scriptum | 736220 |
| Arma Reforger | 1874880 |
| Payday 3 | 1272080 |
| Back 4 Blood | 924970 |
| Vermintide 2 | 552500 |
| Remnant II | 1282100 |
| Doom Eternal | 782330 |
| Metro Exodus | 412020 |
| Splitgate 2 | N/A — verify at implementation |
| Quake Champions | 611500 |
| Ultrakill | 1229490 |
| Turbo Overkill | 1328350 |
| Severed Steel | 1474990 |
| Prodeus | 1229070 |
| Gunfire Reborn | 1217060 |
| Risk of Rain 2 | 632360 |

> Claude Code must look up any missing Steam App IDs via `https://store.steampowered.com/search/?term={game+name}` and add them to `mockData.ts`.

---

**2. Official press kit / publisher CDN (fallback for non-Steam games)**

For games NOT on Steam (VALORANT, Overwatch 2, Call of Duty titles, etc.), use the official press kit or publisher CDN image if freely and publicly accessible:

| Game | Logo / Header Image Source |
|------|---------------------------|
| VALORANT | `https://www.riotgames.com/darkroom/1440/playvalorant_feed_moodpiece_082020.jpg` — or fetch from Riot's press kit |
| Overwatch 2 | `https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt2e9ebbde56ae18ef/overwatch_2_key_art.jpg` — verify URL at implementation |
| Call of Duty titles | Use Activision press CDN or Battle.net store images |
| Halo Infinite | Use Xbox/Microsoft store image (also on Steam — prefer Steam) |
| XDefiant | Ubisoft press CDN |

If a non-Steam URL cannot be confirmed as publicly accessible without hotlinking restrictions, fall back to placeholder (step 3).

---

**3. Styled placeholder (final fallback only)**

Only use the dark placeholder tile if:
- The game is not on Steam, AND
- No confirmed public press CDN URL is available

Placeholder style:
```css
background: #1a1d26;
border: 1px solid rgba(255,255,255,0.1);
display: flex;
align-items: center;
justify-content: center;
font-family: 'Rajdhani', sans-serif;
font-weight: 700;
font-size: 14px;
color: rgba(255,255,255,0.6);
text-align: center;
padding: 8px;
```

---

### Image Error Handling

Every `<img>` tile must have an `onError` handler that swaps to the placeholder if the CDN image fails to load:

```tsx
<img
  src={game.logoUrl}
  alt={game.name}
  onError={(e) => {
    e.currentTarget.style.display = 'none';
    e.currentTarget.nextElementSibling?.classList.remove('hidden');
  }}
/>
<div className="placeholder-tile hidden">{game.name}</div>
```

---

### Tile Layout

```
┌─────────────────────┐
│                     │
│    [logo image]     │  ← object-fit: cover, full tile width, ~70% of tile height
│                     │
├─────────────────────┤
│  Game Name  ©/™     │  ← Rajdhani, 13px, centred, mark superscripted
└─────────────────────┘
```

- Tile aspect ratio: `1:1` (square) — logo image takes top ~70%, name takes bottom ~30%
- On hover: amber border `2px solid #e8a020`, slight brightness increase on image (`filter: brightness(1.1)`)
- Selected: amber border + `rgba(232, 160, 32, 0.15)` background overlay
