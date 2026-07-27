# SquadFinder — Spec Amendment 10
> Simplifies comms scoring to language-only, moves chat/voice to info display on match card. Apply after all previous spec files.

---

## FIX 1 — Comms Score: Language Only

### New Rule
The Comms score is determined **solely by shared languages**.

```
Comms score = 100%  if the two players share at least one language
Comms score = 0%    if the two players share zero languages
```

No gradation. No partial scores. If you can communicate, it's 100%. If you can't, it's 0%. This is a binary gate — language is the only thing that determines whether two people can play together.

### Update matching.ts

Replace the entire `commsScore()` function in `/lib/matching.ts`:

```ts
/**
 * commsScore
 *
 * Binary: 100 if at least one shared language, 0 if none.
 * willingToChat and willingToSpeak are informational only — not scored.
 */
function commsScore(me: Profile, them: Profile): number {
  const shared = intersection(me.languages, them.languages);
  return shared.length > 0 ? 100 : 0;
}
```

Remove `chatScore()` and `voiceScore()` functions from `matching.ts` entirely — they are no longer used in scoring.

### Update types.ts

`willingToChat` and `willingToSpeak` remain on the Profile type — they are still collected on `/build-profile` and displayed on match cards. They just no longer affect scoring.

```ts
// Profile interface — no changes to fields, just documenting intent
export interface Profile {
  // ...
  willingToChat: boolean;    // informational only — not scored
  willingToSpeak: boolean;   // informational only — not scored
  languages: string[];       // this is the only comms scoring input
  // ...
}
```

---

## FIX 2 — Match Card: Comms Info Display

`willingToChat` and `willingToSpeak` are shown as simple info badges on the match card, below the sub-score bars. They are not scores, not bars, not percentages — just plain readable info.

### Display Format

```
┌─────────────────────────────────────────┐
│  MATCH 01                    ● Searching │
├─────────────────────────────────────────┤
│  Overall        ████████████████░  87%  │
├─────────────────────────────────────────┤
│  Gamesmanship   ████████████████░  92%  │
│  Vibe Check     █████████████░░░░  78%  │
│  Comms          ████████████████░  100% │  ← language match only
├─────────────────────────────────────────┤
│  🎙 Mic on   💬 Types                   │  ← info only, no bar
├─────────────────────────────────────────┤
│  [Request to Squad]                     │
└─────────────────────────────────────────┘
```

### Info Badge Variants

**Mic (willingToSpeak):**
- `true`  → `🎙 Mic on`   — colour: `rgba(255,255,255,0.7)`
- `false` → `🎙 Mic off`  — colour: `rgba(255,255,255,0.3)`, muted

**Chat (willingToChat):**
- `true`  → `💬 Types`    — colour: `rgba(255,255,255,0.7)`
- `false` → `💬 No text`  — colour: `rgba(255,255,255,0.3)`, muted

Both badges sit on the same line, separated by a small gap. No border, no background — just icon + text, inline.

```css
.comms-info-row {
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 4px 0;
  border-top: 1px solid rgba(255,255,255,0.06);
  margin-top: 4px;
}

.comms-badge {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.comms-badge.active {
  color: rgba(255,255,255,0.75);
}

.comms-badge.inactive {
  color: rgba(255,255,255,0.28);
}
```

---

## FIX 3 — Build Profile: Comms Section Label Update

The Comms question group on `/build-profile` stays the same — all three questions (chat, voice, languages) are still asked and collected. But the section description under the label should be updated to reflect that only language affects matching:

Add a small muted note below the `Comms` section label:

```
Languages determine your match score. Chat and mic preferences are shown to potential squadmates.
```

Style: `font-size: 11px`, `color: rgba(255,255,255,0.35)`, `font-family: 'Inter'`, no animation.

---

## FIX 4 — Update Mock Opponent Profiles

Since comms score is now binary (100 or 0), update `MOCK_OPPONENT_PROFILES` in `mockData.ts` so that opponents have realistic language combinations that produce varied comms scores:

```ts
// Ensure a mix of:
// - opponents who share English (comms = 100) — most common
// - at least 1–2 opponents who share no language with the default user (comms = 0)
// This demonstrates the binary scoring visually in the prototype
```

---

## Summary

| Area | Change |
|------|--------|
| Comms score | Binary: 100 if ≥1 shared language, 0 if none |
| chatScore() | Removed from scoring entirely |
| voiceScore() | Removed from scoring entirely |
| willingToChat | Still collected, displayed as info badge on match card |
| willingToSpeak | Still collected, displayed as info badge on match card |
| Match card | New comms info row with mic/chat badges below score bars |
| Build profile | Small note added under Comms label explaining what is scored |
| Mock data | Updated to include at least 1–2 zero-comms opponents for demo |
