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
  status: MatchStatus
  statusGame: string | null
}

export interface Ally {
  id: string
  username: string
  overall: number
  status: MatchStatus
  statusGame: string | null
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
