# SquadFinder — Spec Amendment 03
> Weapon name accuracy mandate. Apply after all previous spec files.

---

## WEAPON NAME ACCURACY — HARD REQUIREMENT

This is a non-negotiable quality standard. Every weapon name across every game must be the exact, official, in-game name as it appears in that game's UI. No exceptions.

---

### The Rule

Claude Code must research every single game's weapon list **individually and separately**. Do not:
- Copy weapon names from one game to another
- Use generic names like "Assault Rifle 1" or "Sniper Rifle"
- Invent or approximate weapon names
- Reuse a weapon list from a similar game
- Use community nicknames unless the game itself uses that name in its UI (e.g. "the Kraber" is acceptable in Apex Legends because that is its in-game name)

Every weapon name in `mockData.ts` under `GAME_QUESTIONS[gameId].weapons` must be the **exact string a player would see when hovering over or equipping that weapon inside the game**.

---

### Research Method — Per Game

For each game, Claude Code must follow this exact research process:

1. **Search the game's official wiki** (e.g. the Escape from Tarkov Wiki at escapefromtarkov.fandom.com, the CS2 wiki, the VALORANT wiki etc.)
2. **Cross-reference with the game's official patch notes or weapon list page** on the developer's site
3. **Check for weapons added or removed in the most recent update** — do not include weapons that have been vaulted, removed, or are not currently obtainable in normal gameplay
4. **Use the exact capitalisation and punctuation** the game uses (e.g. `AK-74M` not `ak74m`, `R-301 Carbine` not `R301`, `MP5-SD` not `MP5 SD`)
5. **Include all weapon categories** relevant to that game — do not omit categories because they seem minor

---

### What Counts as a Weapon

Include anything a player can equip as a primary or secondary damage-dealing item. This includes:
- Firearms of all categories
- Bows and crossbows where applicable
- Throwables (grenades, molotovs) **only if the game lists them in a weapon/loadout selection screen**
- Melee weapons **only if they are named and selectable** (e.g. knives in CS2 count as a category; the Red Rebel Ice Pick in EFT is a named item)
- Special/exotic weapons unique to that game

Do NOT include:
- Equipment items that deal no direct damage (medkits, armour)
- Generic throwables not listed by name in-game
- Weapons that are not currently available on live servers

---

### Specific Games Requiring Extra Care

The following games have large, complex, or frequently updated weapon pools. Claude Code must take extra care to be complete and accurate:

**Escape from Tarkov**
- EFT has 70+ firearms. Research the full list from the EFT Wiki
- Weapons must include full official names with calibre where the game shows it (e.g. `AK-74M 5.45x39` vs just `AK-74M` — use whichever the game displays as the primary item name)
- Include modded weapon platforms as separate entries only if EFT treats them as separate base weapons
- Source: https://escapefromtarkov.fandom.com/wiki/Weapons

**Counter-Strike 2**
- All 34 purchasable weapons plus knife (as a category)
- Use exact names from the in-game buy menu (e.g. `AK-47`, `M4A1-S`, `Desert Eagle`, `AWP`)
- Source: https://www.counter-strike.net or CS2 wiki

**VALORANT**
- All weapons from the in-game Arsenal
- Use exact names (e.g. `Vandal`, `Phantom`, `Operator`, `Sheriff`, `Odin`)
- Source: https://playvalorant.com/en-gb/arsenal/

**Apex Legends**
- Weapons change with seasons — only include weapons currently in the battle royale loot pool
- Do not include Care Package weapons unless they are currently floor loot
- Source: official Apex Legends site + patch notes for current season

**Rainbow Six Siege**
- Each operator has specific weapons — list the weapons available across all operators as a unified selectable list (players pick weapons they prefer, not per-operator)
- Source: https://www.ubisoft.com/en-gb/game/rainbow-six/siege/operators

**Hunt: Showdown 1896**
- Large weapon roster with historical firearms — exact names matter (e.g. `Winfield M1873C` not `Winchester`)
- Source: Hunt Showdown wiki

**Arena Breakout: Infinite**
- Weapon names differ between PC and Mobile versions — research both separately and store under separate platform keys if names differ
- Source: official Arena Breakout wiki and in-game

**Call of Duty titles (MW3, Warzone, Black Ops 6)**
- Each title has its own weapon pool — do not mix between titles
- Warzone's weapon pool is a subset of MW3/BO6 — research the current Warzone-available weapons specifically
- Source: official CoD site + COD tracker / patch notes

**Hell Let Loose / Post Scriptum / Squad / Arma Reforger**
- These games use real-world military designations — use the exact in-game name, which may differ from the real-world name (e.g. a game may call it `M1 Garand` or just `Garand` — use what appears in the game's UI)

---

### Verification Step

After completing the weapon list for each game, Claude Code must:

1. Count the number of weapons listed
2. Compare against the known approximate weapon count for that game (e.g. EFT has 70+, CS2 has 34, VALORANT has ~18)
3. If the count seems low, re-research before proceeding
4. Add a comment above each game's weapon array in `mockData.ts` showing the source and date researched:

```ts
// Weapons: Escape from Tarkov
// Source: escapefromtarkov.fandom.com/wiki/Weapons
// Researched: [date of implementation]
// Count: 74 weapons
weapons: [
  'AK-74M',
  'AK-101',
  // ...
],
```

---

### Do Not Proceed Until Complete

Claude Code must not move on to rendering, styling, or any other task until the weapon list for every included game is fully researched, verified, and written into `mockData.ts`. This is the same standard as the mandatory codebase review — it is a blocking step, not optional.

If researching weapon lists for all 90 games takes many steps, continue without stopping until every game is done. Do not summarise, do not skip, do not approximate.
