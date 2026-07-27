# SquadFinder — Matching Logic Spec
> Implements the scoring algorithm that calculates compatibility between two players based on their /build-profile answers. This is Phase 1 logic — runs on the frontend using mock profiles. Phase 2 moves this to the backend.

---

## Overview

Every match score is composed of three sub-scores, each weighted equally:

```
Overall = (Gamesmanship + VibeCheck + Comms) / 3
```

All scores are expressed as integers from 0–100.

The three sub-scores map directly to the three question groups on `/build-profile`:
- **Gamesmanship** — weapons, maps, roles, skill
- **Vibe Check** — rage level, personality
- **Comms** — chat, voice, languages

---

## Data Types

Create `/lib/types.ts` (or add to existing types file):

```ts
// /lib/types.ts

export interface Profile {
  // Gamesmanship
  weapons: string[];        // e.g. ['AK-74M', 'MP5']
  maps: string[];           // e.g. ['Customs', 'Factory (Day)']
  roles: string[];          // e.g. ['The Rat', 'Loot Goblin']
  skill: number;            // 0.0 – 10.0, one decimal place

  // Vibe Check
  rage: number;             // 0.0 – 10.0, one decimal place
  personality: string[];    // e.g. ['Quiet but deadly', 'Hypes the team']

  // Comms
  willingToChat: boolean;
  willingToSpeak: boolean;
  languages: string[];      // e.g. ['English', 'French']

  // Meta
  gameId: string;           // must match selected game
  platform?: string;        // 'PC' | 'Mobile' where applicable
}

export interface MatchScores {
  overall: number;          // 0–100
  gamesmanship: number;     // 0–100
  vibeCheck: number;        // 0–100
  comms: number;            // 0–100
}

export interface MatchResult {
  matchId: string;          // 'match-01', 'match-02' etc.
  scores: MatchScores;
  profile: Partial<Profile>; // their answers — only shown after accept
}
```

---

## Core Utility Functions

Create `/lib/matching.ts`:

```ts
// /lib/matching.ts

import { Profile, MatchScores } from './types';

// ── Utility ──────────────────────────────────────────────

function intersection<T>(a: T[], b: T[]): T[] {
  return a.filter(x => b.includes(x));
}

function union<T>(a: T[], b: T[]): T[] {
  return [...new Set([...a, ...b])];
}

/**
 * Jaccard similarity — measures overlap between two arrays.
 * Returns 0–100. Returns 0 if both arrays are empty.
 */
function jaccardScore<T>(a: T[], b: T[]): number {
  const u = union(a, b);
  if (u.length === 0) return 0;
  return (intersection(a, b).length / u.length) * 100;
}

/**
 * Proximity score — measures how close two numbers are on a scale.
 * maxGap defines the distance at which score reaches 0.
 * Returns 0–100.
 */
function proximityScore(a: number, b: number, maxGap: number = 5): number {
  return Math.max(0, 100 - (Math.abs(a - b) / maxGap) * 100);
}

// ── Gamesmanship (4 components × 25% each) ───────────────

/**
 * Weapons: Jaccard similarity.
 * More shared weapon preferences = higher score.
 * Two players who both love the AK-74M are more compatible.
 */
function weaponScore(me: Profile, them: Profile): number {
  return jaccardScore(me.weapons, them.weapons);
}

/**
 * Maps: Jaccard similarity.
 * More shared map preferences = higher score.
 * No point matching with someone who hates your favourite map.
 */
function mapScore(me: Profile, them: Profile): number {
  return jaccardScore(me.maps, them.maps);
}

/**
 * Roles: DIVERSITY score, not similarity.
 * A good squad needs different roles. Two snipers = bad team.
 * Higher score when roles complement (differ) rather than duplicate.
 * 
 * Formula: 1 - jaccard similarity
 * Full overlap (identical roles) → 0%
 * No overlap (completely different roles) → 100%
 */
function roleScore(me: Profile, them: Profile): number {
  const u = union(me.roles, them.roles);
  if (u.length === 0) return 50; // no data = neutral
  const overlap = intersection(me.roles, them.roles).length / u.length;
  return (1 - overlap) * 100;
}

/**
 * Skill: Proximity score on 0–10 scale.
 * Players of similar skill level match better.
 * Gap of 0 = 100%, gap of 5.0 = 0%.
 * 
 * maxGap = 5.0 (half the scale). Beyond 5 points apart = incompatible.
 */
function skillScore(me: Profile, them: Profile): number {
  return proximityScore(me.skill, them.skill, 5);
}

function gamesmanshipScore(me: Profile, them: Profile): number {
  return (
    weaponScore(me, them) +
    mapScore(me, them) +
    roleScore(me, them) +
    skillScore(me, them)
  ) / 4;
}

// ── Vibe Check (2 components × 50% each) ─────────────────

/**
 * Rage: Proximity score on 0–10 scale.
 * Similar rage levels = better vibe match.
 * A zen monk (0.0) with a keyboard-thrower (10.0) is a bad time.
 * 
 * maxGap = 5.0. Beyond 5 points apart = incompatible vibe.
 */
function rageScore(me: Profile, them: Profile): number {
  return proximityScore(me.rage, them.rage, 5);
}

/**
 * Personality: Jaccard similarity.
 * Shared personality traits = better vibe.
 * Both being 'Quiet but deadly' is a match.
 */
function personalityScore(me: Profile, them: Profile): number {
  return jaccardScore(me.personality, them.personality);
}

function vibeCheckScore(me: Profile, them: Profile): number {
  return (rageScore(me, them) + personalityScore(me, them)) / 2;
}

// ── Comms (3 components × ~33% each) ─────────────────────

/**
 * Chat (text): Binary match.
 * Both willing or both not willing = 100%. Mismatch = 0%.
 * No point matching a text-only player with someone who never types.
 */
function chatScore(me: Profile, them: Profile): number {
  return me.willingToChat === them.willingToChat ? 100 : 0;
}

/**
 * Voice: Binary match.
 * Both on mic or both off mic = 100%. Mismatch = 0%.
 */
function voiceScore(me: Profile, them: Profile): number {
  return me.willingToSpeak === them.willingToSpeak ? 100 : 0;
}

/**
 * Languages: Shared language required.
 * 0 shared languages = 0% (cannot communicate at all).
 * 1 shared language = 50%.
 * 2+ shared languages = 100%.
 * 
 * A single shared language is enough to play together,
 * but more shared languages = stronger connection.
 */
function languageScore(me: Profile, them: Profile): number {
  const shared = intersection(me.languages, them.languages).length;
  if (shared === 0) return 0;
  return Math.min(100, shared * 50);
}

function commsScore(me: Profile, them: Profile): number {
  return (chatScore(me, them) + voiceScore(me, them) + languageScore(me, them)) / 3;
}

// ── Main Export ───────────────────────────────────────────

/**
 * calculateMatch
 * 
 * Takes two player profiles and returns their compatibility scores.
 * All scores are rounded integers 0–100.
 * 
 * Usage:
 *   const scores = calculateMatch(myProfile, theirProfile);
 *   // scores.overall, scores.gamesmanship, scores.vibeCheck, scores.comms
 */
export function calculateMatch(me: Profile, them: Profile): MatchScores {
  const gamesmanship = gamesmanshipScore(me, them);
  const vibeCheck = vibeCheckScore(me, them);
  const comms = commsScore(me, them);
  const overall = (gamesmanship + vibeCheck + comms) / 3;

  return {
    overall:      Math.round(overall),
    gamesmanship: Math.round(gamesmanship),
    vibeCheck:    Math.round(vibeCheck),
    comms:        Math.round(comms),
  };
}

/**
 * rankMatches
 * 
 * Takes the current user's profile and an array of mock opponent profiles,
 * calculates match scores for each, and returns them sorted by overall
 * score descending (best match first).
 * 
 * Usage:
 *   const ranked = rankMatches(myProfile, MOCK_OPPONENT_PROFILES);
 *   // ranked[0] = MATCH 01 (best), ranked[1] = MATCH 02, etc.
 */
export function rankMatches(
  me: Profile,
  opponents: Array<{ id: string; profile: Profile; status: string; statusGame: string | null }>
): MatchResult[] {
  return opponents
    .map((opponent, index) => ({
      matchId: `match-${String(index + 1).padStart(2, '0')}`,
      scores: calculateMatch(me, opponent.profile),
      status: opponent.status,
      statusGame: opponent.statusGame,
    }))
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .map((result, index) => ({
      ...result,
      matchId: `match-${String(index + 1).padStart(2, '0')}`, // re-label after sort
    }));
}
```

---

## Mock Opponent Profiles

Add to `/lib/mockData.ts`. These are the profiles that the matching algorithm runs against. They should represent a diverse range of playstyles to produce varied match scores:

```ts
// /lib/mockData.ts — add MOCK_OPPONENT_PROFILES

import { Profile } from './types';

// These profiles are for EFT as the example game.
// In Phase 2, these come from the database filtered by selected game.
export const MOCK_OPPONENT_PROFILES: Array<{
  id: string;
  status: 'searching' | 'ingame' | 'offline';
  statusGame: string | null;
  profile: Profile;
}> = [
  {
    id: 'opponent-01',
    status: 'searching',
    statusGame: null,
    profile: {
      gameId: 'eft',
      weapons: ['AK-74M', 'MP5', 'Mosin-Nagant'],
      maps: ['Customs', 'Factory (Day)', 'Ground Zero'],
      roles: ['The Rat', 'Loot Goblin'],
      skill: 6.5,
      rage: 2.0,
      personality: ['Quiet but deadly', 'Results-only focused'],
      willingToChat: true,
      willingToSpeak: true,
      languages: ['English'],
    },
  },
  {
    id: 'opponent-02',
    status: 'searching',
    statusGame: null,
    profile: {
      gameId: 'eft',
      weapons: ['HK 416A5', 'RSASS', 'Glock 17'],
      maps: ['Interchange', 'Reserve', 'Streets of Tarkov'],
      roles: ['Chad Rusher', 'Factory Psycho'],
      skill: 8.0,
      rage: 6.0,
      personality: ['Calls out every enemy', 'Hypes the team'],
      willingToChat: true,
      willingToSpeak: true,
      languages: ['English', 'German'],
    },
  },
  {
    id: 'opponent-03',
    status: 'searching',
    statusGame: null,
    profile: {
      gameId: 'eft',
      weapons: ['DVL-10', 'SV-98', 'Glock 17'],
      maps: ['Woods', 'Lighthouse', 'Shoreline'],
      roles: ['Sniper Scav', 'Camp & Count'],
      skill: 5.5,
      rage: 1.0,
      personality: ['Strategist / over-thinker', 'Goes full detective on the killcam'],
      willingToChat: false,
      willingToSpeak: false,
      languages: ['English', 'French'],
    },
  },
  {
    id: 'opponent-04',
    status: 'searching',
    statusGame: null,
    profile: {
      gameId: 'eft',
      weapons: ['AK-74M', 'PP-19 Bizon', 'Red Rebel Ice Pick'],
      maps: ['Customs', 'Interchange', 'The Lab'],
      roles: ['PvE Enjoyer', 'Friendly Scav'],
      skill: 3.5,
      rage: 0.5,
      personality: ['Teaches newer players', 'Apologises for everything'],
      willingToChat: true,
      willingToSpeak: true,
      languages: ['English', 'Spanish'],
    },
  },
  {
    id: 'opponent-05',
    status: 'ingame',
    statusGame: 'Escape from Tarkov',
    profile: {
      gameId: 'eft',
      weapons: ['M4A1', 'HK 416A5', 'Desert Eagle'],
      maps: ['Streets of Tarkov', 'Reserve', 'The Lab'],
      roles: ['Finance Bro', 'Thermals Guy'],
      skill: 9.0,
      rage: 4.0,
      personality: ['Results-only focused', 'Comedian / banter merchant'],
      willingToChat: true,
      willingToSpeak: true,
      languages: ['English'],
    },
  },
  {
    id: 'opponent-06',
    status: 'ingame',
    statusGame: 'Escape from Tarkov',
    profile: {
      gameId: 'eft',
      weapons: ['Remington 870', 'MP5', 'Glock 17'],
      maps: ['Factory (Day)', 'Factory (Night)', 'Ground Zero'],
      roles: ['Factory Psycho', 'Chad Rusher'],
      skill: 7.0,
      rage: 8.5,
      personality: ['Blames the game, never themselves', 'Rage quit curious'],
      willingToChat: false,
      willingToSpeak: true,
      languages: ['English', 'Polish'],
    },
  },
  {
    id: 'opponent-07',
    status: 'offline',
    statusGame: null,
    profile: {
      gameId: 'eft',
      weapons: ['Mosin-Nagant', 'SV-98'],
      maps: ['Woods', 'Customs'],
      roles: ['Sniper Scav', 'Solo Hunter'],
      skill: 4.0,
      rage: 3.0,
      personality: ['Quiet but deadly'],
      willingToChat: false,
      willingToSpeak: false,
      languages: ['French'],
    },
  },
  {
    id: 'opponent-08',
    status: 'offline',
    statusGame: null,
    profile: {
      gameId: 'eft',
      weapons: ['AK-74M', 'RSASS', 'Glock 17'],
      maps: ['Lighthouse', 'Shoreline', 'Woods'],
      roles: ['Quest Grinder', 'Loot Goblin'],
      skill: 2.0,
      rage: 5.0,
      personality: ['Hypes the team', 'Teaches newer players'],
      willingToChat: true,
      willingToSpeak: false,
      languages: ['English', 'Hindi'],
    },
  },
];
```

---

## Integration with /squad-matches

In `/app/squad-matches/page.tsx`, replace hardcoded mock scores with live calculated scores:

```tsx
import { calculateMatch, rankMatches } from '@/lib/matching';
import { MOCK_OPPONENT_PROFILES } from '@/lib/mockData';
import { useAppContext } from '@/context/AppContext';

export default function SquadMatchesPage() {
  const { userProfile, notificationsEnabled } = useAppContext();

  // Filter opponents by status (per SPEC_AMENDMENT_04 Fix 1)
  const visibleOpponents = MOCK_OPPONENT_PROFILES.filter(o => {
    if (o.status === 'offline') return false;
    if (o.status === 'ingame' && !notificationsEnabled) return false;
    return true;
  });

  // Calculate and rank matches
  const rankedMatches = rankMatches(userProfile, visibleOpponents);

  return (
    // ... render rankedMatches
  );
}
```

---

## Score Display Rules

These rules connect the matching scores to the visual display on `/squad-matches`. They are already specced in SPEC_UPDATE_02 but repeated here for completeness:

```ts
// /lib/matchColour.ts

export function scoreToColour(score: number): string {
  if (score >= 90) return '#22c55e';  // bright green
  if (score >= 80) return '#86efac';  // soft green
  if (score >= 70) return '#facc15';  // yellow
  if (score >= 60) return '#f97316';  // amber
  return '#ef4444';                   // red
}
```

---

## Phase 2 Notes (Do Not Implement Now)

When moving to a real backend:

1. `calculateMatch` moves to a serverless function or backend API route
2. `MOCK_OPPONENT_PROFILES` is replaced by a DB query:
   ```sql
   SELECT * FROM profiles
   WHERE game_id = $1
   AND status = 'searching'
   AND user_id != $2
   ORDER BY created_at DESC
   LIMIT 50
   ```
3. The top 50 results are scored server-side and the top 8 returned to the client
4. Scores are cached per user session to avoid re-calculating on every page load
5. The `roleScore` diversity logic may need tuning based on real user feedback — the 0.6 threshold for rounding (from the column logic) is a good analogy for how to think about this

---

## Testing the Algorithm (Prototype)

To verify the algorithm is working correctly before Claude Code integrates it, run these test cases in the browser console or a test file:

```ts
import { calculateMatch } from '@/lib/matching';

// Test 1: Perfect match (identical profiles)
const identical = calculateMatch(profile1, profile1);
// Expected: overall ~83 (not 100 — because roleScore rewards diversity,
//           so identical roles score 0%, pulling gamesmanship down)

// Test 2: Zero comms match (no shared language)
const noLang = calculateMatch(
  { ...profile1, languages: ['English'] },
  { ...profile1, languages: ['Mandarin Chinese'] }
);
// Expected: comms score = ~33 (chat + voice match, language = 0)

// Test 3: Complete opposites
const opposite = calculateMatch(
  { ...profile1, rage: 0, skill: 10, willingToSpeak: true },
  { ...profile1, rage: 10, skill: 0, willingToSpeak: false }
);
// Expected: overall very low, likely sub-30
```

Add these as console logs during development and confirm outputs match expectations before considering the matching logic complete.
