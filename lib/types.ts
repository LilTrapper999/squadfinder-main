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

/** 'online' = in SquadFinder but not searching (the database cannot know if someone is in a game). */
export type MatchStatus = 'searching' | 'online' | 'offline'

/**
 * One row of find_squad_matches(): an anonymous candidate. `matchRef` is an opaque id the server
 * resolves back to a user when a request is sent; the client never sees a user id or username.
 */
export interface MatchCandidate {
  matchRef: string
  profile: Profile
  status: MatchStatus
  /** Server-computed overall score (calculate_match); the same number explainMatch derives. */
  score: number
}

/** A request the current user sent. 'accepted' ones reveal the ally's username via allies. */
export type OutboundStatus = 'pending' | 'accepted' | 'declined' | 'expired'

export interface OutboundRequest {
  id: string
  gameSlug: string
  status: OutboundStatus
  createdAt: string
  /** The candidate this request was sent to (their game_profiles.id), or null once it's gone. */
  matchRef: string | null
}

export interface Ally {
  id: string
  username: string
  overall: number
  status: MatchStatus
  /** Which selected game/version tile this ally relationship was formed under — scopes the
   *  per-game "Your Allies" panel on select-game. */
  gameId?: string
  /** The squad request that created this relationship */
  requestId?: string
  /** Favourited via the pin button — pinned allies sort to the top of every allies list */
  pinned?: boolean
  /**
   * Blocked via the dislike button. Deliberately NOT the same as removing them: the ally stays
   * on the list so you can see you already decided against them, and can be unblocked.
   */
  blocked?: boolean
  /** DB only: the caller's own user_blocks row for this ally, needed to unblock */
  blockId?: string
}

/**
 * A squad request another player has sent to the current user (SPEC_AMENDMENT_12).
 * Surfaced behind the bell icon and listed on /notifications. These persist until the user answers them (14 days), and they carry the
 * sender's full profile so the notification card can show live match scores plus the
 * per-category answer breakdown.
 */
export interface SquadRequest {
  id: string
  /** Catalogue id of the game this request is for — groups the /notifications game cards */
  gameId: string
  senderUsername: string
  senderStatus: MatchStatus
  /** ISO time the request was last sent; the 14-day expiry counts from here */
  sentAt?: string
  /** Sender's build-profile answers — drives both the match scores and the answers popup */
  profile: Profile
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

// ─── Score breakdown (the "how did we get this number" popup on /notifications) ──────────────

export type MatchFactorId = 'weapons' | 'maps' | 'roles' | 'skill' | 'rage' | 'personality' | 'languages'

export type MatchFactorDetail =
  /** List answers (weapons, maps, roles, personality, languages): who picked what */
  | {
      kind: 'overlap'
      shared: string[]
      onlyYou: string[]
      onlyThem: string[]
      /** Roles only — 0–1, how far both players' role-matching styles lean toward *similar* roles */
      similarityLean?: number
    }
  /** Slider answers (skill, rage): both values on the 0–10 scale and the gap between them */
  | { kind: 'scale'; you: number; them: number; gap: number; maxGap: number }

export interface MatchFactor {
  id: MatchFactorId
  /** 0–100 */
  score: number
  /** This factor's share of its category score, 0–1 */
  weight: number
  detail: MatchFactorDetail
}

export interface MatchCategoryBreakdown {
  /** Same rounded value calculateMatch returns for this category */
  score: number
  factors: MatchFactor[]
}

export interface MatchBreakdown {
  scores: MatchScores
  gamesmanship: MatchCategoryBreakdown
  vibe: MatchCategoryBreakdown
  comms: MatchCategoryBreakdown
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
  squadStatus: 'searching' | 'in-squad' | null
}
