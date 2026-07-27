# SquadFinder — Spec Amendment 09 (Revised)
> Replaces the original SPEC_AMENDMENT_09.md entirely. Covers weapon/map accuracy, reliable source requirements, and ABI corrections confirmed by a player. Apply after all previous spec files.

---

## CRITICAL: SOURCE RELIABILITY STANDARD

This is a hard requirement that applies to every single game in the catalogue. Claude Code must follow this source hierarchy strictly. Do not use unreliable sources.

### Source Hierarchy (use the highest available for each game)

**Tier 1 — Official Sources Only (preferred)**
- The game's official website (e.g. `playvalorant.com`, `counter-strike.net`)
- The game's official patch notes published by the developer
- The game's official Steam store page (patch notes / update history)
- The developer's official social channels where patch notes are published (e.g. official Reddit, official Discord announcements)

**Tier 2 — Official Community Wikis (acceptable)**
- Fandom wikis that are officially partnered with the developer (e.g. the Escape from Tarkov Wiki at `escapefromtarkov.fandom.com` — this is the community's primary reference and is kept current by active players)
- Wikis linked directly from the game's official site

**Tier 3 — Last Resort Only**
- Third-party guides and tier list sites (e.g. theguidehall.com, overgear.com, skycoach.gg) — these are often outdated, may not include the latest patch additions, and can contain errors
- Use Tier 3 sources ONLY if no Tier 1 or Tier 2 source exists for that game
- If using a Tier 3 source, note it explicitly in the source comment as `// WARNING: Tier 3 source — verify manually`

### What Claude Code Must NEVER Do
- Trust a single source without cross-referencing at least one other
- Use a guide site as the primary source when official patch notes exist
- Copy weapon lists from tier list sites (these only list meta weapons, not the full weapon pool)
- Assume a list is complete without checking the publication date against the game's latest update
- Use any source that does not include a clear "last updated" date
- Trust a source last updated more than one major patch ago

### Verification Step (mandatory for every game)
After compiling a weapon list from sources:
1. Check the source's last-updated date
2. Check when the game's most recent major update was
3. If the source predates the most recent update → find a newer source or check official patch notes for additions
4. Count the weapons. If the count seems low compared to community knowledge, re-research
5. Write the source URL and verification date in a comment above the data block

---

## ABI CORRECTIONS — Player-Confirmed (July 2026)

The following corrections were confirmed by an active Arena Breakout: Infinite player. These override any website source.

### Weapon Category Corrections

**T191** → Assault Rifles (NOT Marksman Rifles)
**T192** → Assault Rifles (NOT Marksman Rifles)
**U191** → Marksman Rifles (NOT Pistols)

### Corrected ABI PC Weapon List

Use this as the definitive reference. Categories use ABI's in-game names.

```ts
// Arena Breakout: Infinite (PC)
// Corrections confirmed by active player, July 2026
// Cross-reference against official patch notes for Season 6: White Nights (June 30, 2026)
// Source: Official ABI patch notes + player confirmation
// WARNING: theguidehall.com list (Sept 2025) is outdated — do not use as primary source

weapons: [
  {
    category: 'Assault Rifles',
    weapons: [
      'AKM', 'M4A1', 'FAL', 'H416', 'MDR', 'AK-102', 'AK-74N', 'AKS-74U',
      'AUG', 'F2000', 'AR-57', 'ACE31', 'AEK', 'AN-94', 'SCAR-L', 'T951',
      'T03', 'SG550', 'G3', 'AK12', 'MCX', 'PCC-9', 'ZC807', 'T191', 'T192'
    ]
  },
  {
    category: 'Submachine Guns',
    weapons: [
      'MP5', 'MPX', 'P90', 'Uzi', 'UMP 45', 'MAC-10', 'M3A1', 'T79',
      'MP 40', 'QC61', 'MPF45', 'T85', 'Vector 45', 'Vector 9', 'PP19', 'Banshee'
    ]
  },
  {
    category: 'Carbines',
    weapons: ['SA85M', 'SKS', 'M14', 'M96', 'Mini 14', 'BM59', 'SVTU', 'M16']
  },
  {
    category: 'Marksman Rifles',
    weapons: ['SVDS', 'VSS', 'Mk 14', 'M110', 'ML Rifle', 'T88', 'U191']
  },
  {
    category: 'Bolt-Action Rifles',
    weapons: ['Mosin-Nagant', 'SJ16', 'M24']
  },
  {
    category: 'Shotguns',
    weapons: ['M870', 'MP-133', 'S12K', 'USAS-12', 'SPR310']
  },
  {
    category: 'Light Machine Guns',
    weapons: ['RPK-16']
  },
  {
    category: 'Pistols',
    weapons: [
      'G17', 'M9A3', 'G18C', 'Deagle', 'T54', 'M1911',
      'MP9', 'G-Deagle', 'T05', 'M45A1', 'CZ 52', 'F57'
    ]
  }
]
```

### ABI PC Maps (player-confirmed, 6 maps)
```ts
maps: ['Farm', 'Valley', 'Armory', 'Northridge', 'TV Station', 'Airport']
```

### ABI PC Version
```ts
versions: [
  { id: 's6', label: 'Season 6: White Nights (ABI 2.0)', date: 'June 30, 2026' }
]
```

---

## FULL AUDIT — Every Other Game

Apply the same correction standard to every game in the catalogue. The ABI fix above is the example of what "accurate" means.

### Research Process Per Game

1. Go to the game's **official website or official patch notes** first (Tier 1)
2. Cross-reference with the **community wiki** (Tier 2)
3. Check when the game's **most recent major update** was released
4. Confirm the source is **newer than that update**
5. Compile the **full weapon list** — not just meta weapons
6. Categorise using the **game's own category names**
7. Compile the **full map list** — selectable lobby maps only, no sub-areas
8. Write a **source comment** with URL, tier, and verification date
9. **Count weapons** and flag if count seems low

### Priority Order

Fix these games first — highest player base, most likely to have errors:

1. **Arena Breakout: Infinite (PC)** — use player-confirmed data above
2. **Escape from Tarkov** — official wiki: `escapefromtarkov.fandom.com/wiki/Weapons`
3. **Counter-Strike 2** — official: `counter-strike.net`, or CS wiki
4. **VALORANT** — official: `playvalorant.com/en-gb/arsenal/`
5. **Hunt: Showdown 1896** — official wiki or official site
6. **Rainbow Six Siege** — official Ubisoft operators page
7. **Apex Legends** — official patch notes for current season loot pool
8. **Call of Duty: Warzone** — official COD site, current season weapons
9. **Call of Duty: Black Ops 6** — separate from Warzone, official COD site
10. **Hell Let Loose** — official wiki or official site
11. **Squad** — official Squad wiki
12. **All remaining games** — same standard applied

### Source Comment Template
```ts
// [Game Name]
// Tier 1 source: [URL] — [date checked]
// Tier 2 cross-ref: [URL] — [date checked]
// Latest game update: [patch name/date]
// Source newer than latest update: YES / NO (if NO, flag for manual review)
// Weapon count: [N] across [N] categories
// Map count: [N]
```

---

## WHAT TO DO WHEN NO RELIABLE SOURCE EXISTS

Some obscure games in the catalogue may not have up-to-date official sources. In that case:

1. Use the most recent Tier 2 source available and flag it as potentially outdated
2. Add `// NEEDS MANUAL REVIEW — no Tier 1 source found` above the data block
3. Do not invent or approximate weapon names
4. If genuinely cannot find a reliable weapon list → leave the weapons array empty with a comment: `// weapons: [] — no reliable source found, populate manually`
5. Never populate with guessed or approximated data

---

## Summary

| Area | Change |
|------|--------|
| Source standard | Tier 1 (official) → Tier 2 (community wiki) → Tier 3 (guides, last resort only) |
| Cross-referencing | Mandatory — never trust a single source |
| Date checking | Mandatory — source must postdate the game's latest major update |
| ABI T191, T192 | Moved from Marksman Rifles → Assault Rifles (player-confirmed) |
| ABI U191 | Moved from Pistols → Marksman Rifles (player-confirmed) |
| ABI Banshee | Added to SMGs (Season 6 addition) |
| ABI T88 | Added to Marksman Rifles (Season 6 addition) |
| ABI maps | Farm, Valley, Armory, Northridge, TV Station, Airport (6 total) |
| ABI version | Season 6: White Nights (ABI 2.0), June 30, 2026 |
| All other games | Full audit using same standard — Tier 1 sources first, verify against latest patch |
