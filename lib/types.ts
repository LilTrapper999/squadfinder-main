export type GameCategory = 'extraction' | 'competitive' | 'fps'

export interface GameVersion {
  id: string
  label: string
  date: string
}

export interface Game {
  id: string
  name: string
  category: GameCategory
  mark: string
  logoUrl?: string
  steamAppId?: number
  platforms?: string[]
  versions: GameVersion[]
  platformVersions?: Record<string, GameVersion[]>
  /** Audit trail — true once verified to have a team/squad/party invite feature (SPEC_AMENDMENT_06 FIX 1) */
  hasTeamFeature?: boolean
  /** Set only on games that are their own separate mobile catalogue entry (SPEC_AMENDMENT_11 FIX 4) — distinct from `platforms`, which lists version tabs on a single shared entry like ABI */
  platform?: 'Mobile'
  /**
   * Original catalogue id before each version became its own selectable entry — every version
   * of a game is now its own tile (e.g. "Escape from Tarkov: Patch 1.0.6 — PvP"), but weapons/
   * maps/roles are still keyed by the base game in GAME_QUESTIONS, not per version.
   */
  baseId?: string
}

export type MatchStatus = 'ingame' | 'searching' | 'offline'

export interface MatchPlayer {
  id: string
  label: string
  /** Hidden until accepted. TODO: fetch from DB once auth is wired up. */
  revealedUsername: string
  overall: number
  gamesmanship: number
  vibe: number
  comms: number
  /** Info badge only — not scored (SPEC_AMENDMENT_10) */
  willingToChat: boolean
  /** Info badge only — not scored (SPEC_AMENDMENT_10) */
  willingToSpeak: boolean
  status: MatchStatus
  statusGame: string | null
}

export interface Ally {
  id: string
  username: string
  overall: number
  status: MatchStatus
  statusGame: string | null
  /** Which selected game/version tile this ally relationship was formed under — scopes the
   *  per-game "Your Allies" panel on select-game. */
  gameId?: string
  /** Favourited via the pin button — pinned allies sort to the top of every allies list */
  pinned?: boolean
  /**
   * Blocked via the dislike button. Deliberately NOT the same as removing them: the ally stays
   * on the list so you can see you already decided against them, and can be unblocked.
   */
  blocked?: boolean
  /** They blocked you — surfaced on the card so the dead chat isn't a mystery */
  blockedYou?: boolean
}

// ─── Private ally chat (SPEC_AMENDMENT_11 FIX 2/3) ───────────────────────────
// Prototype only — in-memory in AppContext, no persistence between sessions.

export interface ChatMessage {
  id: string
  senderId: 'me' | 'them'
  content: string
  sentAt: number
  /** null if disappearing messages was off when sent; sentAt + 86400000 if on */
  expiresAt: number | null
}

export interface AllyChat {
  allyId: string
  /** Default false — messages persist until toggled on */
  disappearingMessages: boolean
  messages: ChatMessage[]
}

/**
 * A squad request another player has sent to the current user (SPEC_AMENDMENT_12).
 * Surfaced behind the bell icon and listed on /notifications. Unlike IncomingRequest —
 * the 20-second popup — these persist until the user answers them, and they carry the
 * sender's full profile so the notification card can show live match scores plus the
 * per-category answer breakdown.
 */
export interface SquadRequest {
  id: string
  /** Catalogue id of the game this request is for — groups the /notifications game cards */
  gameId: string
  senderUsername: string
  senderStatus: MatchStatus
  senderStatusGame: string | null
  /** Sender's build-profile answers — drives both the match scores and the answers popup */
  profile: Profile
}

export interface IncomingRequest {
  id: string
  /** Which MOCK_MATCHES entry to remove on Decline & Block */
  matchId: string | null
  senderUsername: string
  senderStatus: MatchStatus
  senderStatusGame: string | null
  overallMatch: number
  /** Unix timestamp: Date.now() + 20000 */
  expiresAt: number
}

export interface QuestionOption {
  value: string
  label: string
}

export interface RoleOption {
  value: string
  label: string
  subtitle?: string
}

export interface Question {
  id: string
  label: string
  type: 'radio' | 'multiselect' | 'slider' | 'select' | 'chips' | 'roles'
  options?: QuestionOption[]
  roleOptions?: RoleOption[]
  sliderMinLabel?: string
  sliderMaxLabel?: string
  labelMapping?: Record<number, string>
}

export type ProfileAnswers = Record<string, string | string[] | number | Record<string, unknown>>

// ─── Matching engine (MATCHING_LOGIC_SPEC.md / SPEC_AMENDMENT_08 FIX 2) ──────

export interface Profile {
  // Gamesmanship
  weapons: string[]
  maps: string[]
  roles: string[]
  skill: number             // 0.0 – 10.0, one decimal place
  /** 0.0 = complement (favour different roles), 5.0 = neutral, 10.0 = match (favour same roles) */
  roleMatchPreference?: number

  // Vibe Check
  rage: number              // 0.0 – 10.0, one decimal place
  personality: string[]

  // Comms
  willingToChat: boolean
  willingToSpeak: boolean
  languages: string[]

  // Meta
  gameId: string
  platform?: string
}

export interface MatchScores {
  overall: number
  gamesmanship: number
  vibeCheck: number
  comms: number
}

export interface MatchResult {
  matchId: string
  scores: MatchScores
  profile: Partial<Profile>
}

/** A named group of weapons shown under a category subtitle in the profile form */
export interface WeaponCategory {
  category: string   // e.g. 'Assault Rifles', 'Submachine Guns'
  weapons: string[]  // exact in-game names
}

export interface GameQuestions {
  /** Categorised weapon list — rendered with animated category subtitles */
  weapons: WeaponCategory[]
  /** Selectable lobby maps only (not sub-areas or callouts) */
  maps: string[]
  /** Role options for the game */
  roles: RoleOption[]
}

export interface AppState {
  selectedGame: Game | null
  selectedVersion: GameVersion | null
  isReturningUser: boolean
  profileAnswers: ProfileAnswers
  allies: Ally[]
  incomingRequests: IncomingRequest[]
  blockedUsers: string[]
  squadStatus: 'searching' | 'in-squad' | null
}
