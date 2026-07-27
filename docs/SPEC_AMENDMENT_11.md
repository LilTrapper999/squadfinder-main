# SquadFinder — Spec Amendment 11
> Covers: auto-ally on squad accept, private chat system, disappearing messages toggle, mobile games as separate catalogue entries, minimal UI input principle. Apply after all previous spec files.

---

## FIX 1 — Auto-Ally on Squad Request Accept

### Rule
When a squad request is accepted by the recipient, both players are **automatically added to each other's allies list**. There is no separate "Add as Ally" button after acceptance.

### Changes

**Remove** the `+ Add as Ally` button from the match card accepted state entirely. It no longer exists.

**Update AppContext** — on acceptance, immediately add the accepted player to `allies[]`:

```ts
// On acceptance (either side):
const handleAccept = (matchId: string, username: string) => {
  setSquadAccepted(true);
  setAcceptedMatchId(matchId);
  setAllies(prev => [...prev, {
    id: matchId,
    username,
    overall: matchScores[matchId].overall,
    status: 'searching',
    statusGame: null,
    chatHistory: [],
    disappearingMessages: false,
  }]);
};
```

**Match card accepted state** now shows:
```
✓ Squad Accepted
You are now allies.
[Go to chat →]
```

The `Go to chat →` button opens the private chat with that ally (see FIX 2).

**Ally cards** on the homepage sidebar and squad matches allies panel now appear immediately on acceptance — no extra step.

---

## FIX 2 — Private Ally Chat System

### Overview
Every ally relationship has a private 1-to-1 chat. Chats are accessible from:
- The ally card on the homepage sidebar (click the card → opens chat)
- The ally card on the `/squad-matches` allies panel
- The accepted match card (`Go to chat →` button)

### Chat UI

Claude Code must design the chat UI using best-practice messaging patterns. Guidelines:

- Dark theme consistent with the rest of the app (`#0a0b0f` background, `#1a1d26` message bubbles)
- Own messages right-aligned, ally messages left-aligned
- Timestamps shown in small muted text below each message
- Input field pinned to bottom, send on Enter or send button
- No read receipts in this phase
- No typing indicators in this phase
- If disappearing messages is on, show a small amber clock icon `⏱` next to each message in that conversation
- Chat opens as a panel or modal — Claude Code picks whichever fits the layout better and is more conventional

### Route
Add `/chat/[allyId]` as a new route, or implement as a slide-in panel — Claude Code decides based on what works best with the existing layout.

### Prototype Implementation
In the prototype, messages are stored in `AppContext` in memory only. No persistence between sessions.

```ts
interface ChatMessage {
  id: string;
  senderId: 'me' | 'them';
  content: string;
  sentAt: number;        // timestamp ms
  expiresAt: number | null;  // null if disappearing off, sentAt + 86400000 if on
}

interface AllyChat {
  allyId: string;
  disappearingMessages: boolean;  // default false
  messages: ChatMessage[];
}
```

Add `chats: AllyChat[]` to `AppContext`.

---

## FIX 3 — Disappearing Messages Toggle

### Rule
Each chat has an independent disappearing messages toggle. When enabled, messages in that chat disappear 24 hours after they were sent. When disabled, messages stay forever.

### Behaviour
- **Default:** off (messages persist)
- **Toggle location:** inside the chat — top bar of the chat panel/page, clearly visible
- **Label:** `⏱ Disappearing messages` with a toggle switch next to it
- **When toggled on:** all future messages in this chat have `expiresAt = sentAt + 86400000` (24hrs in ms)
- **When toggled off:** future messages have `expiresAt = null`. Messages already sent with an expiry are NOT retroactively kept — they still expire at their original time
- **Expiry check:** run a check every time the chat is opened. Remove any messages where `Date.now() > expiresAt`. In Phase 2 this moves to the backend

### Visual indicator
- When disappearing is ON: a small amber banner at the top of the message list: `⏱ Messages disappear after 24 hours`
- When OFF: no banner

### Toggle Style
Claude Code picks the most appropriate toggle component — a standard iOS-style switch is conventional and recognisable. Style it in amber when active.

---

## FIX 4 — Mobile Games as Separate Catalogue Entries

### Rule
Any game that has a mobile version with a distinct name, separate download, or divergent content from the PC version must be listed as a **completely separate game entry** in the catalogue.

This applies immediately to:

**Arena Breakout (Mobile)**
- Separate entry from Arena Breakout: Infinite (PC)
- Different game name: `Arena Breakout` (not "Arena Breakout: Infinite")
- Different weapon pool, different maps, different seasons
- Platform selector not needed — it is its own game entry, always Mobile
- Must be researched independently using Tier 1/2 sources
- Add to the Extraction Shooters category as a separate tile

**Any other game in the catalogue** where a mobile version exists with separate content — apply the same rule. Claude Code must check every game for a mobile counterpart and add separate entries where applicable.

### Game Entry Format for Mobile Games
```ts
{
  id: 'arena-breakout-mobile',
  name: 'Arena Breakout',
  platform: 'Mobile',
  category: 'extraction',
  steamAppId: null,  // not on Steam
  logoUrl: '',       // source from official press kit or app store
  hasTeamFeature: true,
  weapons: [...],    // researched independently from mobile version
  maps: [...],       // mobile map pool — separate from PC
  versions: [...],   // mobile seasons — separate from PC
}
```

Mobile game tiles should show a small `📱` or `MOBILE` badge on the tile so users can instantly distinguish them from PC versions.

---

## FIX 5 — Minimal UI Input Principle

### Rule
Claude Code must make all UI decisions independently. The product owner should not be asked to choose between UI options — Claude Code picks the best one and implements it.

### What this means in practice

**Claude Code must decide:**
- Layout patterns (panel vs modal, slide-in vs new page)
- Component choices (which type of toggle, button style, input style)
- Spacing, sizing, and visual hierarchy within the constraints already specced
- Icon choices (use a consistent, recognisable icon library — Lucide or Heroicons recommended)
- Animation timing and easing
- How to handle edge cases (empty states, loading states, error states)

**Claude Code must NOT:**
- Ask "should this be a modal or a page?"
- Ask "which icon should I use?"
- Ask "should the button be on the left or right?"
- Present multiple options and wait for a choice

**The standard:** implement what a senior product designer with experience in gaming apps would consider the most conventional, recognisable, and usable choice. If in doubt, follow established patterns from Discord, Steam, or similar gaming platforms.

**The only exception:** if a decision would have significant product implications (e.g. a fundamental change to how a feature works), flag it in a code comment and implement the most reasonable default. Do not stop and ask.

---

## Phase 2 Notes (Do Not Implement Now)

**Chat persistence:** In Phase 2, chat messages are stored in the database. The `chats` table stores messages with `expires_at` timestamps. A daily cron job deletes expired messages server-side.

**Real-time chat:** Phase 2 uses WebSockets (via Supabase Realtime or Pusher) for live message delivery. In the prototype, messages are local state only — no real sending.

**Notification on new message:** When an ally sends a message and the user is not in the chat, show a badge count on the ally card. Phase 2 only.

```sql
-- Phase 2 DB schema for chat
CREATE TABLE ally_chats (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a                UUID REFERENCES users(id),
  user_b                UUID REFERENCES users(id),
  disappearing_enabled  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a, user_b)
);

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID REFERENCES ally_chats(id),
  sender_id   UUID REFERENCES users(id),
  content     TEXT NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ  -- NULL if disappearing off
);

CREATE INDEX ON chat_messages(chat_id, sent_at);
CREATE INDEX ON chat_messages(expires_at) WHERE expires_at IS NOT NULL;
```

---

## Summary

| Area | Change |
|------|--------|
| Auto-ally | Squad accept automatically adds both players as allies — no separate button |
| Add as Ally button | Removed entirely |
| Accepted card | Shows `✓ Squad Accepted · You are now allies · [Go to chat →]` |
| Private chat | New chat system per ally pair, accessible from ally cards and accepted match card |
| Chat route | `/chat/[allyId]` or slide-in panel — Claude Code decides |
| Disappearing messages | Per-chat toggle, 24hr expiry, amber indicator, default off |
| Mobile games | Separate catalogue entries with own weapons, maps, versions, and Mobile badge |
| Arena Breakout (Mobile) | Added as separate entry from ABI PC |
| UI decisions | Claude Code makes all UI choices independently — no options presented to product owner |
