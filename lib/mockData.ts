// ⚠️ HARD RULE: Games with a real logoUrl MUST render before games without one.
// Within each group, sort A→Z by name.
// This sort must be applied to the data array itself, not in the render layer.
// DO NOT render games in any other order.

import { Game, MatchPlayer, Question, RoleOption, GameCategory, Ally, IncomingRequest, GameQuestions, WeaponCategory, Profile } from './types'

const STEAM = (id: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`

// Fallback for apps whose header.jpg isn't populated on the CDN yet (Priority 2 per SPEC_AMENDMENT_06 FIX 1)
const STEAM_HERO = (id: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/library_hero.jpg`

// ─── GENERIC FALLBACK ROLES (6 options, used for non-specced games) ─────────

const GENERIC_ROLES: RoleOption[] = [
  { value: 'assaulter',  label: 'Assaulter',            subtitle: 'Front line aggressor' },
  { value: 'sniper',     label: 'Sniper / Marksman',    subtitle: 'Long-range precision' },
  { value: 'support',    label: 'Support',              subtitle: 'Team utility and backup' },
  { value: 'rusher',     label: 'Rusher / Entry Fragger', subtitle: 'First in, fastest push' },
  { value: 'recon',      label: 'Recon / Scout',        subtitle: 'Intel gathering, flanking' },
  { value: 'flexible',   label: 'Flexible',             subtitle: 'Adapts to team needs' },
]

// ─── GAME-SPECIFIC QUESTION SETS ────────────────────────────────────────────

// Helper to build role question
const roleQ = (opts: RoleOption[]): Question => ({
  id: 'role',
  label: 'Your Playstyle',
  type: 'roles',
  roleOptions: opts,
})

// ── Escape from Tarkov ──────────────────────────────────────────────────────
const TARKOV_QUESTIONS: Question[] = [
  roleQ([
    { value: 'rat',          label: 'The Rat',           subtitle: 'Extract with gear, never fight' },
    { value: 'chad',         label: 'Chad Rusher',       subtitle: 'First through the door, always' },
    { value: 'lootgoblin',   label: 'Loot Goblin',       subtitle: 'Every loose round goes in the bag' },
    { value: 'questgrinder', label: 'Quest Grinder',     subtitle: "Wipe? Doesn't matter, tasks first" },
    { value: 'sniperscav',   label: 'Sniper Scav',       subtitle: '500m shots, zero bullets left' },
    { value: 'thermals',     label: 'Thermals Guy',      subtitle: 'Pay-to-win energy, zero remorse' },
    { value: 'factory',      label: 'Factory Psycho',    subtitle: '6-minute maps, 200 kills' },
    { value: 'camp',         label: 'Camp & Count',      subtitle: 'That bush has been there 20 mins' },
    { value: 'solohunter',   label: 'Solo Hunter',       subtitle: 'Squad is a liability, thanks' },
    { value: 'friendlyscav', label: 'Friendly Scav',     subtitle: 'Scav karma maxed, vibes only' },
    { value: 'pveenjoyer',   label: 'PvE Enjoyer',       subtitle: 'Kill AI, avoid humans' },
    { value: 'financebro',   label: 'Finance Bro',       subtitle: 'Flea market manipulation artist' },
  ]),
  {
    id: 'map',
    label: 'Preferred map',
    type: 'select',
    options: [
      { value: 'customs',     label: 'Customs' },
      { value: 'interchange', label: 'Interchange' },
      { value: 'reserve',     label: 'Reserve' },
      { value: 'shoreline',   label: 'Shoreline' },
      { value: 'woods',       label: 'Woods' },
      { value: 'streets',     label: 'Streets of Tarkov' },
      { value: 'lighthouse',  label: 'Lighthouse' },
      { value: 'groundzero',  label: 'Ground Zero' },
      { value: 'factory',     label: 'Factory' },
      { value: 'labs',        label: 'Labs' },
    ],
  },
  {
    id: 'faction',
    label: 'Preferred faction',
    type: 'radio',
    options: [
      { value: 'pmc',  label: 'PMC' },
      { value: 'scav', label: 'Scav' },
    ],
  },
  {
    id: 'raidBudget',
    label: 'Raid budget',
    type: 'slider',
    sliderMinLabel: 'Budget Chad (naked)',
    sliderMaxLabel: 'Full Meta Slav',
  },
  {
    id: 'riskTolerance',
    label: 'Risk tolerance',
    type: 'slider',
    sliderMinLabel: 'Extract at first sound',
    sliderMaxLabel: 'Fight until dead',
  },
  {
    id: 'lootPriority',
    label: 'Loot priority',
    type: 'chips',
    options: [
      { value: 'highvalue', label: 'High-value items' },
      { value: 'quest',     label: 'Quest items' },
      { value: 'pvpkills',  label: 'Player kills' },
      { value: 'pvekills',  label: 'PvE kills' },
      { value: 'mixed',     label: 'Mixed' },
      { value: 'whatever',  label: 'Whatever spawns' },
    ],
  },
]

// ── Arena Breakout: Infinite ─────────────────────────────────────────────────
const ABI_QUESTIONS: Question[] = [
  roleQ([
    { value: 'marksman',   label: 'Loot or be Looted',       subtitle: 'Long-range marksman, sniper main' },
    { value: 'accountant', label: 'The Accountant',           subtitle: 'Tracks every Koen in the raid' },
    { value: 'wallbang',   label: 'Wall Bandit',              subtitle: 'Every wall is see-through to me' },
    { value: 'doorkick',   label: 'Door Kicker',              subtitle: 'First in, always first in' },
    { value: 'drone',      label: 'Drone Operator',           subtitle: 'Recon before stepping anywhere' },
    { value: 'budget',     label: 'Budget Warrior',           subtitle: 'Full raid on vendor gear only' },
    { value: 'orangezone', label: 'Orange Zone Degen',        subtitle: 'Forbidden Zone or nothing' },
    { value: 'grenade',    label: 'Grenade Diplomat',         subtitle: 'Resolves disputes via frag' },
    { value: 'extract',    label: 'Extraction Artist',        subtitle: 'Gets out, gets paid, logs off' },
    { value: 'ambush',     label: 'Ambush Architect',         subtitle: 'Sets up, waits, wins' },
    { value: 'solo',       label: 'Solo Cowboy',              subtitle: 'No squad, no problem' },
    { value: 'gearfear',   label: 'Gear Fear Connoisseur',    subtitle: 'Too scared to use the good kit' },
  ]),
  {
    id: 'zoneTier',
    label: 'Preferred zone tier',
    type: 'select',
    options: [
      { value: 'green',    label: 'Green Zone' },
      { value: 'yellow',   label: 'Yellow Zone' },
      { value: 'orange',   label: 'Orange Zone' },
      { value: 'red',      label: 'Red Zone (Forbidden)' },
    ],
  },
  {
    id: 'koenBudget',
    label: 'Koen budget per raid',
    type: 'slider',
    sliderMinLabel: 'Naked & Afraid',
    sliderMaxLabel: 'Full Loadout Flex',
  },
  {
    id: 'extractPriority',
    label: 'Extraction priority',
    type: 'slider',
    sliderMinLabel: 'Always extract clean',
    sliderMaxLabel: 'Die with the loot',
  },
]

// ── Counter-Strike 2 ─────────────────────────────────────────────────────────
const CS2_QUESTIONS: Question[] = [
  roleQ([
    { value: 'entry',    label: 'Entry Fragger',      subtitle: 'First peek, first blood, first death' },
    { value: 'awper',    label: 'AWPer',              subtitle: 'One shot, one kill, one whiff' },
    { value: 'lurk',     label: 'Lurker',             subtitle: 'Flanking while team dies out front' },
    { value: 'igl',      label: 'IGL',                subtitle: 'Calls strats, gets blamed for losses' },
    { value: 'support',  label: 'Support',            subtitle: 'Flashes for others, never for self' },
    { value: 'rifler',   label: 'Rifler',             subtitle: 'AK spray at 5hp around corner' },
    { value: 'nade',     label: 'Nade Spammer',       subtitle: 'Throws smokes into wall every round' },
    { value: 'ecoking',  label: 'Eco Round Despot',   subtitle: 'Buys Deagle on eco, top frags' },
    { value: 'anchor',   label: 'Anchor CT',          subtitle: 'Locked in B site all game' },
    { value: 'fake',     label: 'Fake Executor',      subtitle: "Fakes A, B team doesn't rotate" },
    { value: 'clutch',   label: 'Clutch Merchant',    subtitle: '1vX or nothing — always nothing' },
    { value: 'trade',    label: 'Trade Bot',          subtitle: 'Traded every round, 0 net value' },
  ]),
  {
    id: 'rank',
    label: 'Premier rating',
    type: 'select',
    options: [
      { value: 'unranked', label: 'Unranked' },
      { value: 'grey',     label: 'Grey (1–5k)' },
      { value: 'blue',     label: 'Blue (5–10k)' },
      { value: 'purple',   label: 'Purple (10–15k)' },
      { value: 'pink',     label: 'Pink (15–20k)' },
      { value: 'red',      label: 'Red (20–25k)' },
      { value: 'gold',     label: 'Gold (25k+)' },
    ],
  },
  {
    id: 'side',
    label: 'Preferred side',
    type: 'radio',
    options: [
      { value: 'ct',  label: 'CT' },
      { value: 't',   label: 'T' },
      { value: 'flex', label: 'No preference' },
    ],
  },
  {
    id: 'mapPool',
    label: 'Preferred map pool',
    type: 'chips',
    options: [
      { value: 'mirage',   label: 'Mirage' },
      { value: 'inferno',  label: 'Inferno' },
      { value: 'dust2',    label: 'Dust2' },
      { value: 'anubis',   label: 'Anubis' },
      { value: 'nuke',     label: 'Nuke' },
      { value: 'vertigo',  label: 'Vertigo' },
      { value: 'ancient',  label: 'Ancient' },
    ],
  },
  {
    id: 'commsRole',
    label: 'Communication role',
    type: 'radio',
    options: [
      { value: 'igl',      label: 'IGL / Caller' },
      { value: 'caller',   label: 'Info caller' },
      { value: 'infoonly', label: 'Info only' },
      { value: 'silent',   label: 'Silent' },
    ],
  },
]

// ── VALORANT ─────────────────────────────────────────────────────────────────
const VALORANT_QUESTIONS: Question[] = [
  {
    id: 'agentClass',
    label: 'Preferred agent class',
    type: 'radio',
    options: [
      { value: 'duelist',    label: 'Duelist' },
      { value: 'initiator',  label: 'Initiator' },
      { value: 'controller', label: 'Controller' },
      { value: 'sentinel',   label: 'Sentinel' },
    ],
  },
  {
    id: 'agents',
    label: 'Preferred agents',
    type: 'chips',
    options: [
      // Duelists
      { value: 'jett',     label: 'Jett' },
      { value: 'reyna',    label: 'Reyna' },
      { value: 'phoenix',  label: 'Phoenix' },
      { value: 'neon',     label: 'Neon' },
      { value: 'yoru',     label: 'Yoru' },
      { value: 'iso',      label: 'Iso' },
      { value: 'waylay',   label: 'Waylay' },
      // Initiators
      { value: 'sova',     label: 'Sova' },
      { value: 'breach',   label: 'Breach' },
      { value: 'skye',     label: 'Skye' },
      { value: 'kayo',     label: 'KAY/O' },
      { value: 'fade',     label: 'Fade' },
      { value: 'gekko',    label: 'Gekko' },
      { value: 'tejo',     label: 'Tejo' },
      // Controllers
      { value: 'omen',     label: 'Omen' },
      { value: 'brim',     label: 'Brimstone' },
      { value: 'viper',    label: 'Viper' },
      { value: 'astra',    label: 'Astra' },
      { value: 'harbor',   label: 'Harbor' },
      { value: 'clove',    label: 'Clove' },
      { value: 'miks',     label: 'Miks' },
      // Sentinels
      { value: 'sage',     label: 'Sage' },
      { value: 'cypher',   label: 'Cypher' },
      { value: 'killjoy',  label: 'Killjoy' },
      { value: 'chamber',  label: 'Chamber' },
      { value: 'deadlock', label: 'Deadlock' },
      { value: 'vyse',     label: 'Vyse' },
    ],
  },
  {
    id: 'rank',
    label: 'Current rank',
    type: 'select',
    options: [
      { value: 'iron1',       label: 'Iron 1–3' },
      { value: 'bronze1',     label: 'Bronze 1–3' },
      { value: 'silver1',     label: 'Silver 1–3' },
      { value: 'gold1',       label: 'Gold 1–3' },
      { value: 'platinum1',   label: 'Platinum 1–3' },
      { value: 'diamond1',    label: 'Diamond 1–3' },
      { value: 'ascendant1',  label: 'Ascendant 1–3' },
      { value: 'immortal1',   label: 'Immortal 1–3' },
      { value: 'radiant',     label: 'Radiant' },
    ],
  },
  {
    id: 'mapPool',
    label: 'Preferred map pool',
    type: 'chips',
    options: [
      { value: 'bind',      label: 'Bind' },
      { value: 'haven',     label: 'Haven' },
      { value: 'split',     label: 'Split' },
      { value: 'ascent',    label: 'Ascent' },
      { value: 'icebox',    label: 'Icebox' },
      { value: 'breeze',    label: 'Breeze' },
      { value: 'fracture',  label: 'Fracture' },
      { value: 'pearl',     label: 'Pearl' },
      { value: 'lotus',     label: 'Lotus' },
      { value: 'sunset',    label: 'Sunset' },
      { value: 'abyss',     label: 'Abyss' },
    ],
  },
  {
    id: 'atkDef',
    label: 'Attack / Defence preference',
    type: 'slider',
    sliderMinLabel: 'Full Attacker',
    sliderMaxLabel: 'Full Defender',
  },
]

// ── Hunt: Showdown 1896 ──────────────────────────────────────────────────────
const HUNT_QUESTIONS: Question[] = [
  roleQ([
    { value: 'bountybandit',   label: 'Bounty Bandit',           subtitle: 'Steals your extract, waves bye' },
    { value: 'snipertower',    label: 'Sniper on the Tower',      subtitle: '500m Mosin, no conscience' },
    { value: 'traithoarder',   label: 'Trait Hoarder',            subtitle: '50 traits, still dies to a Romero' },
    { value: 'consumable',     label: 'Consumable Connoisseur',   subtitle: 'Inventory of bandages, dies to fire' },
    { value: 'solovstrios',    label: 'Solo vs Trios Guy',        subtitle: 'Deliberately queues against teams' },
    { value: 'ambushinn',      label: 'Ambush Innkeeper',         subtitle: 'Campfire, lantern, shotgun, waits' },
    { value: 'bountyrusher',   label: 'Bounty Rusher',            subtitle: 'Cares about K/D, not the hunt' },
    { value: 'butcherfarmer',  label: 'Butcher Farmer',           subtitle: 'Only here for the big boss' },
    { value: 'poisoner',       label: 'Poison Trail Poisoner',    subtitle: 'Sticky bombs on every doorway' },
    { value: 'darksight',      label: 'Dark Sight Spammer',       subtitle: "Watches orbs, won't move" },
    { value: 'loreread',       label: 'Lore Appreciator',         subtitle: 'Reads every clue, dies to a crows' },
    { value: 'crossbow',       label: 'Crossbow Purist',          subtitle: "Won't touch gunpowder" },
  ]),
  {
    id: 'hunterTier',
    label: 'Hunter tier preference',
    type: 'radio',
    options: [
      { value: 't1', label: 'Tier 1' },
      { value: 't2', label: 'Tier 2' },
      { value: 't3', label: 'Tier 3 (when available)' },
    ],
  },
  {
    id: 'map',
    label: 'Preferred map',
    type: 'radio',
    options: [
      { value: 'bayou',   label: 'Bayou' },
      { value: 'mammons', label: "Mammon's Gulch" },
      { value: 'any',     label: 'No preference' },
    ],
  },
  {
    id: 'target',
    label: 'Preferred target',
    type: 'radio',
    options: [
      { value: 'butcher',    label: 'Butcher' },
      { value: 'assassin',   label: 'Assassin' },
      { value: 'spider',     label: 'Spider' },
      { value: 'scrapbeak',  label: 'Scrapbeak' },
      { value: 'any',        label: 'No preference' },
    ],
  },
  {
    id: 'teamSize',
    label: 'Team size',
    type: 'radio',
    options: [
      { value: 'solo', label: 'Solo' },
      { value: 'duo',  label: 'Duo' },
      { value: 'trio', label: 'Trio' },
    ],
  },
  {
    id: 'loadout',
    label: 'Loadout style',
    type: 'slider',
    sliderMinLabel: 'Budget Iron',
    sliderMaxLabel: 'Legendary Everything',
  },
]

// ── Rainbow Six Siege ────────────────────────────────────────────────────────
const R6SIEGE_QUESTIONS: Question[] = [
  {
    id: 'side',
    label: 'Attack or Defence main',
    type: 'radio',
    options: [
      { value: 'attack',  label: 'Attack' },
      { value: 'defence', label: 'Defence' },
      { value: 'flex',    label: 'Flex' },
    ],
  },
  {
    id: 'atkOperators',
    label: 'Preferred attack operators',
    type: 'chips',
    options: [
      { value: 'ash',        label: 'Ash' },
      { value: 'thermite',   label: 'Thermite' },
      { value: 'sledge',     label: 'Sledge' },
      { value: 'hibana',     label: 'Hibana' },
      { value: 'zofia',      label: 'Zofia' },
      { value: 'iana',       label: 'Iana' },
      { value: 'twitch',     label: 'Twitch' },
      { value: 'lion',       label: 'Lion' },
      { value: 'zero',       label: 'Zero' },
      { value: 'nomad',      label: 'Nomad' },
      { value: 'gridlock',   label: 'Gridlock' },
      { value: 'montagne',   label: 'Montagne' },
    ],
  },
  {
    id: 'defOperators',
    label: 'Preferred defence operators',
    type: 'chips',
    options: [
      { value: 'jager',    label: 'Jäger' },
      { value: 'bandit',   label: 'Bandit' },
      { value: 'vigil',    label: 'Vigil' },
      { value: 'rook',     label: 'Rook' },
      { value: 'doc',      label: 'Doc' },
      { value: 'echo',     label: 'Echo' },
      { value: 'pulse',    label: 'Pulse' },
      { value: 'maestro',  label: 'Maestro' },
      { value: 'kaid',     label: 'Kaid' },
      { value: 'lesion',   label: 'Lesion' },
      { value: 'mozzie',   label: 'Mozzie' },
      { value: 'caveira',  label: 'Caveira' },
    ],
  },
  {
    id: 'rank',
    label: 'Rank',
    type: 'select',
    options: [
      { value: 'copper',   label: 'Copper 1–5' },
      { value: 'bronze',   label: 'Bronze 1–3' },
      { value: 'silver',   label: 'Silver 1–3' },
      { value: 'gold',     label: 'Gold 1–3' },
      { value: 'platinum', label: 'Platinum 1–3' },
      { value: 'diamond',  label: 'Diamond 1–3' },
      { value: 'champion', label: 'Champion' },
    ],
  },
  {
    id: 'defStyle',
    label: 'Defence style',
    type: 'radio',
    options: [
      { value: 'roamer',  label: 'Roamer' },
      { value: 'anchor',  label: 'Anchor' },
      { value: 'flex3',   label: '3-speed flex' },
      { value: 'breacher', label: 'Hard breacher' },
    ],
  },
  {
    id: 'fragUtil',
    label: 'Fragging vs utility focus',
    type: 'slider',
    sliderMinLabel: 'Full Utility Bot',
    sliderMaxLabel: 'Pure Fragger',
  },
]

// ── Call of Duty: Warzone ────────────────────────────────────────────────────
const WARZONE_QUESTIONS: Question[] = [
  roleQ([
    { value: 'dropher',    label: 'Drop Hot Merchant',    subtitle: 'Lands Stadium, dies in 10 seconds' },
    { value: 'zonerat',    label: 'Zone Rat',             subtitle: 'Plays final circle from minute one' },
    { value: 'sniperarch', label: 'Sniper Nest Architect', subtitle: 'Finds a hill, lives there forever' },
    { value: 'vehicle',    label: 'Vehicle Menace',        subtitle: 'Runs squads over, calls it strategy' },
    { value: 'revivebot',  label: 'Revive Bot',            subtitle: 'Dies, gets revived, dies again' },
    { value: 'gulaggod',   label: 'Gulag God',             subtitle: '1v1 locked in, drops back clutch' },
    { value: 'contract',   label: 'Contract Runner',       subtitle: 'Ignores fights, stacks cash' },
    { value: 'uav',        label: 'UAV Spammer',           subtitle: 'Buys UAVs, still dies' },
    { value: 'loadout',    label: 'Loadout Rusher',        subtitle: "Won't fight until loadout drop" },
    { value: 'shield',     label: 'Shield Turtle',         subtitle: 'Deploys riot shield, crouches, vibes' },
    { value: 'wall',       label: 'Wall Runner',           subtitle: 'Horizontal movement IQ off the charts' },
    { value: 'zonegamble', label: 'Final Circle Gambler',  subtitle: 'Ignores zone until too late' },
  ]),
  {
    id: 'movement',
    label: 'Movement style',
    type: 'slider',
    sliderMinLabel: 'Slow & Methodical',
    sliderMaxLabel: 'Slide-Cancel Maniac',
  },
  {
    id: 'squadSize',
    label: 'Preferred squad size',
    type: 'radio',
    options: [
      { value: 'solo',  label: 'Solo' },
      { value: 'duos',  label: 'Duos' },
      { value: 'trios', label: 'Trios' },
      { value: 'quads', label: 'Quads' },
    ],
  },
  {
    id: 'loadoutClass',
    label: 'Preferred loadout class',
    type: 'radio',
    options: [
      { value: 'ar',      label: 'AR' },
      { value: 'sniper',  label: 'Sniper' },
      { value: 'smg',     label: 'SMG' },
      { value: 'shotgun', label: 'Shotgun' },
      { value: 'lmg',     label: 'LMG' },
    ],
  },
]

// ── Category fallback question sets (non-specced games) ─────────────────────

const FALLBACK_EXTRACTION: Question[] = [
  roleQ(GENERIC_ROLES),
  {
    id: 'lootFocus',
    label: 'Loot focus',
    type: 'radio',
    options: [
      { value: 'highvalue', label: 'High-value items' },
      { value: 'quest',     label: 'Quest items' },
      { value: 'kills',     label: 'Player kills' },
      { value: 'mixed',     label: 'Mixed' },
    ],
  },
  {
    id: 'riskTolerance',
    label: 'Risk tolerance',
    type: 'slider',
    sliderMinLabel: 'Ultra-cautious',
    sliderMaxLabel: 'Full send',
  },
  {
    id: 'extractPriority',
    label: 'Extraction priority',
    type: 'radio',
    options: [
      { value: 'always',    label: 'Always extract' },
      { value: 'whenloaded', label: 'Extract when loaded' },
      { value: 'yolo',      label: 'YOLO' },
      { value: 'depends',   label: 'Depends on situation' },
    ],
  },
]

const FALLBACK_COMPETITIVE: Question[] = [
  roleQ(GENERIC_ROLES),
  {
    id: 'rank',
    label: 'Rank / MMR',
    type: 'select',
    options: [
      { value: 'unranked', label: 'Unranked' },
      { value: 'bronze',   label: 'Bronze' },
      { value: 'silver',   label: 'Silver' },
      { value: 'gold',     label: 'Gold' },
      { value: 'platinum', label: 'Platinum' },
      { value: 'diamond',  label: 'Diamond' },
      { value: 'master',   label: 'Master' },
      { value: 'top',      label: 'Radiant / Top 500' },
    ],
  },
  {
    id: 'side',
    label: 'Attack or Defence preference',
    type: 'radio',
    options: [
      { value: 'attack',  label: 'Attack' },
      { value: 'defence', label: 'Defence' },
      { value: 'flex',    label: 'Flexible' },
    ],
  },
  {
    id: 'igl',
    label: 'Willing to IGL?',
    type: 'radio',
    options: [
      { value: 'yes',       label: 'Yes' },
      { value: 'no',        label: 'No' },
      { value: 'sometimes', label: 'Sometimes' },
    ],
  },
]

const FALLBACK_FPS: Question[] = [
  roleQ(GENERIC_ROLES),
  {
    id: 'coopRole',
    label: 'Co-op role',
    type: 'chips',
    options: [
      { value: 'damage',  label: 'Damage' },
      { value: 'tank',    label: 'Tank' },
      { value: 'healer',  label: 'Healer' },
      { value: 'support', label: 'Support' },
      { value: 'utility', label: 'Utility' },
    ],
  },
  {
    id: 'focus',
    label: 'Campaign or multiplayer focus',
    type: 'radio',
    options: [
      { value: 'campaign',     label: 'Campaign / story' },
      { value: 'multiplayer',  label: 'Multiplayer' },
      { value: 'both',         label: 'Both' },
    ],
  },
  {
    id: 'difficulty',
    label: 'Difficulty preference',
    type: 'radio',
    options: [
      { value: 'story',  label: 'Story mode' },
      { value: 'normal', label: 'Normal' },
      { value: 'hard',   label: 'Hard' },
      { value: 'max',    label: 'Max difficulty' },
    ],
  },
]

export const GAME_SPECIFIC_QUESTIONS: Record<string, Question[]> = {
  // Specced games
  tarkov:        TARKOV_QUESTIONS,
  abi:           ABI_QUESTIONS,
  cs2:           CS2_QUESTIONS,
  valorant:      VALORANT_QUESTIONS,
  hunt:          HUNT_QUESTIONS,
  r6siege:       R6SIEGE_QUESTIONS,
  'warzone-ext': WARZONE_QUESTIONS,
  'wz-fps':      WARZONE_QUESTIONS,

  // Category fallbacks
  _extraction:   FALLBACK_EXTRACTION,
  _competitive:  FALLBACK_COMPETITIVE,
  _fps:          FALLBACK_FPS,
}

// ─── GAMES BY CATEGORY ───────────────────────────────────────────────────────

export const GAMES_BY_CATEGORY: Record<GameCategory, Game[]> = {
  extraction: [
    // REMOVED GAMES (no team invite feature):
    // - Hawked — reason: MY.GAMES shutting down all services (PC servers offline Jun 9 2026, already past)
    // - Miscreated — reason: official server infrastructure shut down Oct 2022, no active supported multiplayer/squad system remains
    // - STALKER 2 — reason: single-player only, GSC confirmed no co-op campaign; PvP multiplayer still unreleased
    // - Vampire: The Masquerade — Bloodhunt — reason: Sharkmob shut servers down permanently (offline Apr 28 2026, already past)
    // - Fractured Online — reason: servers taken fully offline Jun 2025 for a ground-up rebuild ("Fractured Conquest"); no live servers currently
    // - Survarium — reason: shut down permanently in May 2022, no revival
    // - Syndrome — reason: single-player survival horror, no active multiplayer despite a long-abandoned "multiplayer beta" label
    // DO NOT replace these with other games
    {
      id: 'tarkov', name: 'Escape from Tarkov', category: 'extraction', mark: '©',
      steamAppId: 3932890, logoUrl: STEAM_HERO(3932890), hasTeamFeature: true,
      versions: [
        { id: 'eft-pvp', label: 'Patch 1.0.6 — PvP (Live Wipe)', date: '2026' },
        { id: 'eft-pve', label: 'Patch 1.0.6 — PvE (Persistent)', date: '2026' },
      ],
    },
    {
      id: 'hunt', name: 'Hunt: Showdown 1896', category: 'extraction', mark: '©',
      steamAppId: 594650, logoUrl: STEAM(594650), hasTeamFeature: true,
      versions: [
        { id: 'hunt-rth', label: 'Current Live Build — Road to Hell Event', date: '2026' },
      ],
    },
    {
      id: 'gzw', name: 'Gray Zone Warfare', category: 'extraction', mark: '©',
      steamAppId: 2479810, logoUrl: STEAM(2479810), hasTeamFeature: true,
      versions: [
        { id: 'gzw-046', label: 'Patch 0.4.6 – Current Live Build', date: '2026' },
      ],
    },
    {
      id: 'deltaforce', name: 'Delta Force', category: 'extraction', mark: '©',
      steamAppId: 2507540, logoUrl: STEAM(2507540), hasTeamFeature: true,
      versions: [
        { id: 'df-s10', label: 'Season 10: Meltdown', date: '2026' },
      ],
    },
    {
      id: 'marauders', name: 'Marauders', category: 'extraction', mark: '©',
      steamAppId: 1789480, logoUrl: STEAM(1789480), hasTeamFeature: true,
      versions: [
        { id: 'mar-retribution', label: 'Retribution Update (Current Live Build; core overhaul in progress)', date: '2024' },
      ],
    },
    {
      id: 'dad', name: 'Dark and Darker', category: 'extraction', mark: '©',
      steamAppId: 2016590, logoUrl: STEAM(2016590), hasTeamFeature: true,
      versions: [
        { id: 'dad-s10', label: 'Early Access Season 10: Firedeep', date: '2026' },
      ],
    },
    {
      id: 'ab', name: 'Arena Breakout', category: 'extraction', mark: '©', hasTeamFeature: true,
      versions: [
        { id: 'ab-s13', label: 'Season 13: Liminal Space (Mobile)', date: '2026' },
      ],
    },
    {
      id: 'abi', name: 'Arena Breakout: Infinite', category: 'extraction', mark: '©',
      steamAppId: 2073620, logoUrl: STEAM(2073620), hasTeamFeature: true,
      platforms: ['PC', 'Mobile'],
      versions: [
        { id: 'abi-s6', label: 'Season 6: White Nights', date: '2026' },
      ],
      platformVersions: {
        PC:     [{ id: 'abi-s6-pc',     label: 'Season 6: White Nights (PC)', date: '2026' }],
        Mobile: [{ id: 'abi-s6-mobile', label: 'Season 6: White Nights (Mobile)', date: '2026' }],
      },
    },
    {
      id: 'scum', name: 'Scum', category: 'extraction', mark: '©',
      steamAppId: 513710, logoUrl: STEAM(513710), hasTeamFeature: true,
      versions: [
        { id: 'scum-itw', label: 'Into the Wild — July 2026 Update', date: '2026' },
      ],
    },
    {
      id: 'vigor', name: 'Vigor', category: 'extraction', mark: '©',
      steamAppId: 2818260, logoUrl: STEAM(2818260), hasTeamFeature: true,
      versions: [
        { id: 'vigor-s22', label: 'Season 22: Meltdown', date: '2026' },
      ],
    },
    {
      id: 'oncehuman', name: 'Once Human', category: 'extraction', mark: '©',
      steamAppId: 2139460, logoUrl: STEAM(2139460), hasTeamFeature: true,
      versions: [
        { id: 'oh-isles', label: 'Scenario: Isles of the Abyss (v2.4.4)', date: '2026' },
      ],
    },
    {
      id: 'deadside', name: 'Deadside', category: 'extraction', mark: '©',
      steamAppId: 895400, logoUrl: STEAM(895400), hasTeamFeature: true,
      versions: [
        { id: 'ds-110', label: 'v1.10 – Prison Zone & Boss Fight', date: '2026' },
      ],
    },
    {
      id: 'incursion', name: 'Incursion Red River', category: 'extraction', mark: '©',
      steamAppId: 2116120, logoUrl: STEAM(2116120), hasTeamFeature: true,
      versions: [
        { id: 'irr-13', label: 'Update 1.3 – Campaign Act 1 & Delta Map', date: '2026' },
      ],
    },
    {
      id: 'pz', name: 'Project Zomboid', category: 'extraction', mark: '©',
      steamAppId: 108600, logoUrl: STEAM(108600), hasTeamFeature: true,
      versions: [
        { id: 'pz-b42', label: 'Build 42 (Stable — arriving Jul 29, 2026)', date: '2026' },
      ],
    },
    {
      id: 'rust', name: 'Rust', category: 'extraction', mark: '©',
      steamAppId: 252490, logoUrl: STEAM(252490), hasTeamFeature: true,
      versions: [
        { id: 'rust-jul26', label: 'Forced Wipe – Common Ground Update (Jul 2026)', date: '2026' },
      ],
    },
    {
      id: 'dayz', name: 'DayZ', category: 'extraction', mark: '©',
      steamAppId: 221100, logoUrl: STEAM(221100), hasTeamFeature: true,
      versions: [
        { id: 'dayz-129', label: '1.29 – Frostline Expansion', date: '2026' },
      ],
    },
    {
      id: 'div2', name: 'The Division 2', category: 'extraction', mark: '©',
      steamAppId: 2221490, logoUrl: STEAM(2221490), hasTeamFeature: true,
      versions: [
        { id: 'div2-y6s3', label: 'Year 6 Season 3: Vanguard', date: '2025' },
        { id: 'div2-y6s2', label: 'Year 6 Season 2: Descent', date: '2024' },
        { id: 'div2-y6s1', label: 'Year 6 Season 1: Emergence', date: '2024' },
        { id: 'div2-y5e4', label: 'Year 5 Episode 4', date: '2023' },
        { id: 'div2-y5s2', label: 'Year 5 Season 2', date: '2022' },
      ],
    },
    {
      id: 'warzone-ext', name: 'Warzone', category: 'extraction', mark: '©',
      steamAppId: 1962663, logoUrl: STEAM(1962663), hasTeamFeature: true,
      platforms: ['PC', 'Console'],
      versions: [
        { id: 'wz-s4', label: 'Season 4: Reloaded', date: '2025' },
        { id: 'wz-s3', label: 'Season 3: Operation Payback', date: '2025' },
        { id: 'wz-s2', label: 'Season 2: Underworld', date: '2025' },
        { id: 'wz-s1', label: 'Season 1: Urzikstan Launch', date: '2024' },
        { id: 'wz-s6mw3', label: 'Season 6 MW3', date: '2023' },
      ],
    },
    {
      id: 'dl2', name: 'Dying Light 2', category: 'extraction', mark: '©',
      steamAppId: 534380, logoUrl: STEAM(534380), hasTeamFeature: true,
      versions: [
        { id: 'dl2-ch8', label: 'Chapter 8: Legacy', date: '2025' },
        { id: 'dl2-ch7', label: 'Chapter 7: Carnage Hall', date: '2024' },
        { id: 'dl2-ch6', label: 'Chapter 6: Warriors of Chaos', date: '2024' },
        { id: 'dl2-bt',  label: 'Bloody Ties DLC', date: '2022' },
        { id: 'dl2-v1',  label: 'Launch v1.0', date: '2022' },
      ],
    },
    {
      id: 'ror2', name: 'Risk of Rain 2', category: 'extraction', mark: '©',
      steamAppId: 632360, logoUrl: STEAM(632360), hasTeamFeature: true,
      versions: [
        { id: 'ror2-sots', label: 'Seekers of the Storm', date: '2024' },
        { id: 'ror2-sotv', label: 'Survivors of the Void DLC', date: '2022' },
        { id: 'ror2-ann',  label: 'Anniversary Update', date: '2021' },
        { id: 'ror2-hr',   label: 'Hidden Realms Update', date: '2020' },
        { id: 'ror2-ea',   label: 'Early Access v1.0', date: '2019' },
      ],
    },
    {
      id: 'foreverwinter', name: 'Forever Winter', category: 'extraction', mark: '©',
      steamAppId: 2828860, logoUrl: STEAM(2828860), hasTeamFeature: true,
      versions: [
        { id: 'fw-03',   label: 'Early Access 0.3 – New Biome', date: '2025' },
        { id: 'fw-02',   label: 'Early Access 0.2 – Factions', date: '2024' },
        { id: 'fw-015',  label: 'Early Access 0.1.5 – AI Update', date: '2024' },
        { id: 'fw-01',   label: 'Early Access Launch 0.1', date: '2024' },
        { id: 'fw-demo', label: 'Pre-Alpha Demo', date: '2023' },
      ],
    },
    // Note: The Cycle: Frontier removed (shut down 2023)
    // Note: Hyenas was never released — removed
  ],

  competitive: [
    // REMOVED GAMES (no team invite feature):
    // - XDefiant — reason: Ubisoft shut servers down permanently on Jun 4 2025
    // - Bloodhunt — reason: Sharkmob shut servers down permanently (offline Apr 28 2026, already past); duplicate of the removed extraction-category Bloodhunt entry
    // - Tribes 3: Rivals — reason: developer publicly abandoned live-ops in 2024, concurrent player count collapsed to single digits, no functional matchmaking/squad experience remains
    // - Devil Daggers — reason: single-player wave-survival arena game, no multiplayer or co-op ever shipped
    // - Severed Steel — reason: single-player only, confirmed no co-op/multiplayer modes
    // - Ultrakill — reason: single-player by design; only unofficial fan mod ("Jaket") adds multiplayer, not an active in-game feature
    // - Boomerang X — reason: single-player only, no multiplayer
    // DO NOT replace these with other games
    {
      id: 'cs2', name: 'Counter-Strike 2 (CS2)', category: 'competitive', mark: '© Valve',
      steamAppId: 730, logoUrl: STEAM(730), hasTeamFeature: true,
      versions: [
        { id: 'cs2-prem4', label: 'Premier Season 4 (Current)', date: '2026' },
      ],
    },
    // CS:GO removed — not playable on live servers (sunset Sep 2023)
    {
      id: 'valorant', name: 'VALORANT', category: 'competitive', mark: '© Riot Games',
      logoUrl: 'https://www.riotgames.com/darkroom/1440/playvalorant_feed_moodpiece_082020.jpg', hasTeamFeature: true,
      versions: [
        { id: 'val-2026a3', label: 'Season 2026 — Act 3 (Skirmish: Ascension)', date: '2026' },
      ],
    },
    {
      id: 'r6siege', name: 'Rainbow Six Siege', category: 'competitive', mark: '© Ubisoft',
      steamAppId: 359550, logoUrl: STEAM(359550), hasTeamFeature: true,
      versions: [
        { id: 'r6-y10s1', label: 'Year 10 Season 1', date: '2025' },
        { id: 'r6-y9s4',  label: 'Year 9 Season 4', date: '2024' },
        { id: 'r6-y9s3',  label: 'Year 9 Season 3', date: '2024' },
        { id: 'r6-y9s2',  label: 'Year 9 Season 2', date: '2024' },
        { id: 'r6-y9s1',  label: 'Year 9 Season 1', date: '2024' },
      ],
    },
    {
      id: 'r6ext', name: 'Rainbow Six Extraction', category: 'competitive', mark: '© Ubisoft',
      steamAppId: 2379390, logoUrl: STEAM(2379390), hasTeamFeature: true,
      versions: [
        { id: 'r6e-p4', label: 'Maelstrom Protocol: Phase 4', date: '2024' },
        { id: 'r6e-p3', label: 'Maelstrom Protocol: Phase 3', date: '2023' },
        { id: 'r6e-sp', label: 'Spillover Protocol', date: '2023' },
        { id: 'r6e-y1s2', label: 'Year 1 Season 2', date: '2022' },
        { id: 'r6e-v1',  label: 'Launch v1.0', date: '2022' },
      ],
    },
    {
      id: 'ow2', name: 'Overwatch 2', category: 'competitive', mark: '© Blizzard', hasTeamFeature: true,
      versions: [
        { id: 'ow2-s15', label: 'Season 15', date: '2025' },
        { id: 'ow2-s14', label: 'Season 14', date: '2025' },
        { id: 'ow2-s13', label: 'Season 13', date: '2024' },
        { id: 'ow2-s12', label: 'Season 12', date: '2024' },
        { id: 'ow2-s11', label: 'Season 11', date: '2024' },
      ],
    },
    {
      id: 'apex', name: 'Apex Legends', category: 'competitive', mark: '© EA/Respawn',
      steamAppId: 1172470, logoUrl: STEAM(1172470), hasTeamFeature: true,
      versions: [
        { id: 'apex-s24', label: 'Season 24: Overtime', date: '2025' },
        { id: 'apex-s23', label: 'Season 23: Shockwave', date: '2025' },
        { id: 'apex-s22', label: 'Season 22: Feral Fury', date: '2024' },
        { id: 'apex-s21', label: 'Season 21: Upheaval', date: '2024' },
        { id: 'apex-s20', label: 'Season 20: Breakout', date: '2024' },
      ],
    },
    {
      id: 'splitgate2', name: 'Splitgate 2', category: 'competitive', mark: '© 1047 Games',
      steamAppId: 2918300, logoUrl: STEAM(2918300), hasTeamFeature: true,
      versions: [
        { id: 'sg2-obs2', label: 'Open Beta Season 2', date: '2025' },
        { id: 'sg2-obs1', label: 'Open Beta Season 1', date: '2025' },
        { id: 'sg2-cb2',  label: 'Closed Beta Phase 2', date: '2024' },
        { id: 'sg2-cb1',  label: 'Closed Beta Phase 1', date: '2024' },
        { id: 'sg2-demo', label: 'Pre-Alpha Demo', date: '2023' },
      ],
    },
    {
      id: 'quakechamps', name: 'Quake Champions', category: 'competitive', mark: '© id Software',
      steamAppId: 611500, logoUrl: STEAM(611500), hasTeamFeature: true,
      versions: [
        { id: 'qc-spr25',   label: '2025 Spring Update', date: '2025' },
        { id: 'qc-champs',  label: 'Champions Update', date: '2024' },
        { id: 'qc-anticheat', label: 'Anti-Cheat Overhaul', date: '2023' },
        { id: 'qc-doom',    label: 'Doom Slayer Season', date: '2022' },
        { id: 'qc-strogg',  label: 'Strogg & Penek Update', date: '2021' },
      ],
    },
    {
      id: 'tf2', name: 'Team Fortress 2', category: 'competitive', mark: '© Valve',
      steamAppId: 440, logoUrl: STEAM(440), hasTeamFeature: true,
      versions: [
        { id: 'tf2-mvm24', label: 'MvM Mecha Update', date: '2024' },
        { id: 'tf2-sf24',  label: 'Scream Fortress XVI', date: '2024' },
        { id: 'tf2-sum23', label: 'Summer 2023 Update', date: '2023' },
        { id: 'tf2-sf23',  label: 'Scream Fortress XV', date: '2023' },
        { id: 'tf2-sf22',  label: 'Scream Fortress XIV', date: '2022' },
      ],
    },
    {
      id: 'haloinfinite', name: 'Halo Infinite', category: 'competitive', mark: '© Microsoft',
      steamAppId: 1240440, logoUrl: STEAM(1240440), hasTeamFeature: true,
      versions: [
        { id: 'hi-s5', label: 'Season 5: Reckoning', date: '2024' },
        { id: 'hi-s4', label: 'Season 4: Infection', date: '2023' },
        { id: 'hi-s3', label: 'Season 3: Echoes Within', date: '2023' },
        { id: 'hi-s2', label: 'Season 2: Lone Wolves', date: '2022' },
        { id: 'hi-s1', label: 'Launch Season 1', date: '2021' },
      ],
    },
    {
      id: 'bf2042', name: 'Battlefield 2042', category: 'competitive', mark: '© EA DICE',
      steamAppId: 1517290, logoUrl: STEAM(1517290), hasTeamFeature: true,
      versions: [
        { id: 'bf42-s7', label: 'Season 7: Turning Point', date: '2024' },
        { id: 'bf42-s6', label: 'Season 6: Dark Creations', date: '2023' },
        { id: 'bf42-s5', label: 'Season 5: New Dawn', date: '2023' },
        { id: 'bf42-s4', label: 'Season 4: Eleventh Hour', date: '2023' },
        { id: 'bf42-s3', label: 'Season 3: Escalation', date: '2022' },
      ],
    },
    {
      id: 'bfv', name: 'Battlefield V', category: 'competitive', mark: '© EA DICE',
      steamAppId: 1238810, logoUrl: STEAM(1238810), hasTeamFeature: true,
      versions: [
        { id: 'bfv-74', label: 'Final Update v7.4', date: '2020' },
        { id: 'bfv-72', label: 'v7.2 – Pacific', date: '2020' },
        { id: 'bfv-66', label: 'v6.6 – Squad Innovation', date: '2019' },
        { id: 'bfv-62', label: 'v6.2 – Tides of War Ch. 5', date: '2019' },
        { id: 'bfv-52', label: 'v5.2 – Lightning Strikes', date: '2019' },
      ],
    },
    {
      id: 'enlisted', name: 'Enlisted', category: 'competitive', mark: '© Gaijin',
      steamAppId: 1176470, logoUrl: STEAM(1176470), hasTeamFeature: true,
      versions: [
        { id: 'enl-endgame', label: 'Endgame', date: '2025' },
        { id: 'enl-aachen',  label: 'Battle for Aachen', date: '2024' },
        { id: 'enl-remaster', label: 'Remaster Update', date: '2024' },
        { id: 'enl-pacific', label: 'Pacific Theater', date: '2023' },
        { id: 'enl-kursk',   label: 'Battle of Kursk', date: '2022' },
      ],
    },
    {
      id: 'roguecompany', name: 'Rogue Company', category: 'competitive', mark: '© Hi-Rez',
      steamAppId: 872200, logoUrl: STEAM(872200), hasTeamFeature: true,
      versions: [
        { id: 'rc-s7', label: 'Season 7: Payback', date: '2024' },
        { id: 'rc-s6', label: 'Season 6: Ambitions', date: '2023' },
        { id: 'rc-s5', label: 'Season 5: Might', date: '2023' },
        { id: 'rc-s4', label: "Season 4: Viper's Call", date: '2022' },
        { id: 'rc-s3', label: "Season 3: Vivienne's War", date: '2022' },
      ],
    },
    // Hyper Scape removed — shut down Jan 2023
    {
      id: 'diabotical', name: 'Diabotical', category: 'competitive', mark: '© GD Studio',
      // logoUrl intentionally omitted — original Diabotical delisted from Steam; CDN art no longer served
      steamAppId: 749500, hasTeamFeature: true,
      versions: [
        { id: 'dia-25', label: 'v2.5 – Ranked Season 4', date: '2024' },
        { id: 'dia-23', label: 'v2.3 – Team Modes', date: '2023' },
        { id: 'dia-20', label: 'v2.0 – Esports Update', date: '2022' },
        { id: 'dia-15', label: 'v1.5 – Arenas', date: '2021' },
        { id: 'dia-10', label: 'Launch v1.0', date: '2020' },
      ],
    },
    {
      id: 'fragpunk', name: 'FragPunk', category: 'competitive', mark: '© Bad Guitar Studio',
      steamAppId: 2943650, logoUrl: STEAM(2943650), hasTeamFeature: true,
      versions: [
        { id: 'fp-s2',  label: 'Season 2', date: '2025' },
        { id: 'fp-s1',  label: 'Season 1', date: '2025' },
        { id: 'fp-ob',  label: 'Open Beta', date: '2024' },
        { id: 'fp-cb',  label: 'Closed Beta', date: '2024' },
        { id: 'fp-pre', label: 'Pre-Alpha', date: '2023' },
      ],
    },
    {
      id: 'battlebit', name: 'BattleBit Remastered', category: 'competitive', mark: '© SgtOkiDoki',
      steamAppId: 671860, logoUrl: STEAM(671860), hasTeamFeature: true,
      versions: [
        { id: 'bb-240', label: 'v2.4.0 – Night Maps', date: '2025' },
        { id: 'bb-230', label: 'v2.3.0 – Conquest Overhaul', date: '2024' },
        { id: 'bb-220', label: 'v2.2.0 – Anti-Cheat', date: '2024' },
        { id: 'bb-210', label: 'v2.1.0 – New Factions', date: '2024' },
        { id: 'bb-200', label: 'Launch v2.0 Early Access', date: '2023' },
      ],
    },
    {
      id: 'prodeus', name: 'Prodeus', category: 'competitive', mark: '© Bounding Box Software',
      steamAppId: 964800, logoUrl: STEAM(964800), hasTeamFeature: true,
      versions: [
        { id: 'prod-11',   label: 'v1.1 – Community Maps', date: '2024' },
        { id: 'prod-10',   label: 'v1.0 Launch', date: '2023' },
        { id: 'prod-ea07', label: 'Early Access v0.7', date: '2022' },
        { id: 'prod-ea05', label: 'Early Access v0.5', date: '2021' },
        { id: 'prod-ea03', label: 'Early Access Launch v0.3', date: '2020' },
      ],
    },
    {
      id: 'turbooverkill', name: 'Turbo Overkill', category: 'competitive', mark: '© Trigger Happy Interactive',
      steamAppId: 1328350, logoUrl: STEAM(1328350), hasTeamFeature: true,
      versions: [
        { id: 'to-13', label: 'v1.3 – New Episode', date: '2024' },
        { id: 'to-12', label: 'v1.2 – Challenge Runs', date: '2024' },
        { id: 'to-11', label: 'v1.1 – New Weapons', date: '2023' },
        { id: 'to-10', label: 'Launch v1.0', date: '2023' },
        { id: 'to-ea', label: 'Early Access', date: '2022' },
      ],
    },
    {
      id: 'gunfirereborn', name: 'Gunfire Reborn', category: 'competitive', mark: '© Duoyi Games',
      steamAppId: 1217060, logoUrl: STEAM(1217060), hasTeamFeature: true,
      versions: [
        { id: 'gfr-s5', label: 'Season 5', date: '2025' },
        { id: 'gfr-sn', label: 'Spiritual Nexus DLC', date: '2024' },
        { id: 'gfr-s4', label: 'Season 4', date: '2024' },
        { id: 'gfr-s3', label: 'Season 3', date: '2023' },
        { id: 'gfr-10', label: 'v1.0 Launch', date: '2021' },
      ],
    },
  ],

  fps: [
    // REMOVED GAMES (no team invite feature):
    // - Doom: The Dark Ages — reason: campaign-only, id Software confirmed no multiplayer/co-op; allied fighters are NPCs only
    // - BioShock Infinite — reason: no multiplayer; planned "Spec Ops" co-op mode was cut before launch and never shipped
    // - Metro Exodus — reason: single-player only, 4A Games confirmed no multiplayer/co-op mode exists
    // - SWAT 4 — reason: original GameSpy matchmaking is defunct; no built-in friend/squad invite remains, only manual IP connection via third-party community server browsers
    // DO NOT replace these with other games
    {
      id: 'mw3', name: 'Call of Duty: Modern Warfare III', category: 'fps', mark: '© Activision',
      steamAppId: 3595270, logoUrl: STEAM_HERO(3595270), hasTeamFeature: true,
      versions: [
        { id: 'mw3-s4',     label: 'Season 4', date: '2024' },
        { id: 'mw3-s3',     label: 'Season 3: Interlude', date: '2024' },
        { id: 'mw3-s2',     label: 'Season 2', date: '2024' },
        { id: 'mw3-s1',     label: 'Season 1', date: '2024' },
        { id: 'mw3-launch', label: 'Launch', date: '2023' },
      ],
    },
    {
      id: 'wz-fps', name: 'Call of Duty: Warzone', category: 'fps', mark: '© Activision',
      steamAppId: 1962663, logoUrl: STEAM(1962663), hasTeamFeature: true,
      platforms: ['PC', 'Console'],
      versions: [
        { id: 'wzfps-s4r', label: 'Season 4 Reloaded', date: '2025' },
        { id: 'wzfps-s4',  label: 'Season 4', date: '2025' },
        { id: 'wzfps-s3',  label: 'Season 3', date: '2025' },
        { id: 'wzfps-s2',  label: 'Season 2', date: '2025' },
        { id: 'wzfps-s1',  label: 'Season 1', date: '2025' },
      ],
    },
    {
      id: 'bo6', name: 'Call of Duty: Black Ops 6', category: 'fps', mark: '© Activision',
      // logoUrl intentionally omitted — header/library art for this app id is not populated on the Steam CDN mirror we use
      steamAppId: 4384550, hasTeamFeature: true,
      versions: [
        { id: 'bo6-s4',  label: 'Season 4', date: '2025' },
        { id: 'bo6-s3',  label: 'Season 3', date: '2025' },
        { id: 'bo6-s2',  label: 'Season 2', date: '2025' },
        { id: 'bo6-s1r', label: 'Season 1 Reloaded', date: '2024' },
        { id: 'bo6-s1',  label: 'Season 1', date: '2024' },
      ],
    },
    {
      id: 'destiny2', name: 'Destiny 2', category: 'fps', mark: '© Bungie',
      steamAppId: 1085660, logoUrl: STEAM(1085660), hasTeamFeature: true,
      versions: [
        { id: 'd2-eof',     label: 'The Edge of Fate DLC', date: '2025' },
        { id: 'd2-tfs',     label: 'The Final Shape', date: '2024' },
        { id: 'd2-lf',      label: 'Lightfall', date: '2023' },
        { id: 'd2-wq',      label: 'The Witch Queen', date: '2022' },
        { id: 'd2-haunted', label: 'The Haunted', date: '2022' },
      ],
    },
    {
      id: 'farcry6', name: 'Far Cry 6', category: 'fps', mark: '© Ubisoft',
      steamAppId: 2369390, logoUrl: STEAM(2369390), hasTeamFeature: true,
      versions: [
        { id: 'fc6-lbw',    label: 'Lost Between Worlds DLC', date: '2022' },
        { id: 'fc6-pagan',  label: 'Pagan Min DLC', date: '2022' },
        { id: 'fc6-joseph', label: 'Joseph: Collapse DLC', date: '2022' },
        { id: 'fc6-danny',  label: 'Danny & Dani vs Evil DLC', date: '2022' },
        { id: 'fc6-v1',     label: 'Launch v1.0', date: '2021' },
      ],
    },
    {
      id: 'bl3', name: 'Borderlands 3', category: 'fps', mark: '© 2K/Gearbox',
      steamAppId: 397540, logoUrl: STEAM(397540), hasTeamFeature: true,
      versions: [
        { id: 'bl3-dc',  label: "Director's Cut DLC", date: '2021' },
        { id: 'bl3-des', label: "Designer's Cut DLC", date: '2020' },
        { id: 'bl3-pk',  label: 'Psycho Krieg DLC', date: '2020' },
        { id: 'bl3-bob', label: 'Bounty of Blood DLC', date: '2020' },
        { id: 'bl3-v1',  label: 'Launch v1.0', date: '2019' },
      ],
    },
    {
      id: 'ttw', name: "Tiny Tina's Wonderlands", category: 'fps', mark: '© 2K/Gearbox',
      steamAppId: 1286680, logoUrl: STEAM(1286680), hasTeamFeature: true,
      versions: [
        { id: 'ttw-ss', label: 'Shattering Spectreglass DLC', date: '2022' },
        { id: 'ttw-gg', label: "Glutton's Gamble DLC", date: '2022' },
        { id: 'ttw-mm', label: 'Molten Mirrors DLC', date: '2022' },
        { id: 'ttw-cc', label: 'Coiled Captors DLC', date: '2022' },
        { id: 'ttw-v1', label: 'Launch v1.0', date: '2022' },
      ],
    },
    {
      id: 'doom-eternal', name: 'Doom Eternal', category: 'fps', mark: '© id Software',
      steamAppId: 782330, logoUrl: STEAM(782330), hasTeamFeature: true,
      versions: [
        { id: 'de-ag2', label: 'Ancient Gods Part 2 DLC', date: '2021' },
        { id: 'de-ag1', label: 'Ancient Gods Part 1 DLC', date: '2020' },
        { id: 'de-666', label: 'Update 6.66', date: '2021' },
        { id: 'de-v1',  label: 'Launch v1.0', date: '2020' },
      ],
    },
    {
      id: 'drg', name: 'Deep Rock Galactic', category: 'fps', mark: '© Ghost Ship',
      steamAppId: 548430, logoUrl: STEAM(548430), hasTeamFeature: true,
      versions: [
        { id: 'drg-s5', label: 'Season 5: Endgame', date: '2025' },
        { id: 'drg-s4', label: 'Season 4: Critical Corruption', date: '2024' },
        { id: 'drg-s3', label: 'Season 3: Plaguefall', date: '2023' },
        { id: 'drg-s2', label: 'Season 2: Rival Escalation', date: '2022' },
        { id: 'drg-s1', label: 'Season 1: Rival Incursion', date: '2022' },
      ],
    },
    {
      id: 'payday3', name: 'Payday 3', category: 'fps', mark: '© Starbreeze',
      steamAppId: 1272080, logoUrl: STEAM(1272080), hasTeamFeature: true,
      versions: [
        { id: 'pd3-ch7', label: 'Chapter 7: Boys in Blue', date: '2025' },
        { id: 'pd3-ch6', label: 'Chapter 6', date: '2025' },
        { id: 'pd3-ch5', label: 'Chapter 5', date: '2024' },
        { id: 'pd3-ch4', label: 'Chapter 4: Boys in Blue Prelude', date: '2024' },
        { id: 'pd3-v1',  label: 'Launch v1.0', date: '2023' },
      ],
    },
    {
      id: 'b4b', name: 'Back 4 Blood', category: 'fps', mark: '© Turtle Rock',
      steamAppId: 924970, logoUrl: STEAM(924970), hasTeamFeature: true,
      versions: [
        { id: 'b4b-cow',  label: 'Children of the Worm DLC', date: '2022' },
        { id: 'b4b-tot',  label: 'Tunnels of Terror DLC', date: '2022' },
        { id: 'b4b-nope', label: 'No Hope Difficulty Update', date: '2022' },
        { id: 'b4b-v1',   label: 'Launch v1.0', date: '2021' },
      ],
    },
    {
      id: 'vt2', name: 'Vermintide 2', category: 'fps', mark: '© Fatshark',
      steamAppId: 552500, logoUrl: STEAM(552500), hasTeamFeature: true,
      versions: [
        { id: 'vt2-sob', label: 'Shadows over Bögenhafen Revisited', date: '2024' },
        { id: 'vt2-wom', label: 'Winds of Magic Revamped', date: '2023' },
        { id: 'vt2-cw',  label: 'Chaos Wastes', date: '2021' },
        { id: 'vt2-btu', label: 'Back to Ubersreik DLC', date: '2019' },
        { id: 'vt2-v1',  label: 'Launch v1.0', date: '2018' },
      ],
    },
    {
      id: 'hd2', name: 'Helldivers 2', category: 'fps', mark: '© Arrowhead',
      steamAppId: 553850, logoUrl: STEAM(553850), hasTeamFeature: true,
      versions: [
        { id: 'hd2-eof', label: 'Escalation of Freedom', date: '2024' },
        { id: 'hd2-vc',  label: 'Viper Commandos Warbond', date: '2024' },
        { id: 'hd2-ff',  label: "Freedom's Flame Warbond", date: '2024' },
        { id: 'hd2-dd',  label: 'Democratic Detonation Warbond', date: '2024' },
        { id: 'hd2-v1',  label: 'Launch v1.0', date: '2024' },
      ],
    },
    {
      id: 'remnant2', name: 'Remnant II', category: 'fps', mark: '© Gunfire Games',
      steamAppId: 1282100, logoUrl: STEAM(1282100), hasTeamFeature: true,
      versions: [
        { id: 'rem2-fk',   label: 'The Forgotten Kingdom DLC', date: '2024' },
        { id: 'rem2-dh',   label: 'The Dark Horizon DLC', date: '2024' },
        { id: 'rem2-ak',   label: 'The Awakened King DLC', date: '2023' },
        { id: 'rem2-v1',   label: 'Launch v1.0', date: '2023' },
      ],
    },
    {
      id: 'insurgency', name: 'Insurgency: Sandstorm', category: 'fps', mark: '© New World Interactive',
      steamAppId: 581320, logoUrl: STEAM(581320), hasTeamFeature: true,
      versions: [
        { id: 'ins-spr25', label: '2025 Spring Update', date: '2025' },
        { id: 'ins-res',   label: 'Operation: Resurgence', date: '2024' },
        { id: 'ins-ai',    label: 'AI Overhaul Update', date: '2023' },
        { id: 'ins-war',   label: 'Operation: Warlord', date: '2022' },
        { id: 'ins-y2',    label: 'Year 2 Pass', date: '2020' },
      ],
    },
    {
      id: 'groundbranch', name: 'Ground Branch', category: 'fps', mark: '© BlackFoot Studios',
      steamAppId: 16900, logoUrl: STEAM(16900), hasTeamFeature: true,
      versions: [
        { id: 'gb-1027', label: 'v1027 – Multiplayer Overhaul', date: '2025' },
        { id: 'gb-1026', label: 'v1026 – New Missions', date: '2024' },
        { id: 'gb-1025', label: 'v1025 – Weapon Attachments', date: '2024' },
        { id: 'gb-1024', label: 'v1024 – AI Update', date: '2023' },
        { id: 'gb-1023', label: 'v1023 – Quickmatch', date: '2022' },
      ],
    },
    {
      id: 'readyornot', name: 'Ready or Not', category: 'fps', mark: '© VOID Interactive',
      steamAppId: 1144200, logoUrl: STEAM(1144200), hasTeamFeature: true,
      versions: [
        { id: 'ron-20', label: 'v2.0 – Complete Edition', date: '2024' },
        { id: 'ron-12', label: 'v1.2 – Neon Graves', date: '2024' },
        { id: 'ron-11', label: 'v1.1 – Conspiracy', date: '2023' },
        { id: 'ron-10', label: 'v1.0 Launch', date: '2023' },
        { id: 'ron-ea', label: 'Early Access', date: '2021' },
      ],
    },
    {
      id: 'armareforger', name: 'Arma Reforger', category: 'fps', mark: '© Bohemia Interactive',
      steamAppId: 1874880, logoUrl: STEAM(1874880), hasTeamFeature: true,
      versions: [
        { id: 'ar-13', label: 'v1.3 – Combined Arms', date: '2025' },
        { id: 'ar-12', label: 'v1.2 – Workshop', date: '2024' },
        { id: 'ar-11', label: 'v1.1 – Conflict Overhaul', date: '2024' },
        { id: 'ar-10', label: 'v1.0 Launch', date: '2023' },
        { id: 'ar-09', label: 'Experimental v0.9', date: '2023' },
      ],
    },
    {
      id: 'squad', name: 'Squad', category: 'fps', mark: '© Offworld Industries',
      steamAppId: 393380, logoUrl: STEAM(393380), hasTeamFeature: true,
      versions: [
        { id: 'sq-75', label: 'v7.5 – Helicopters', date: '2025' },
        { id: 'sq-74', label: 'v7.4 – New Maps', date: '2024' },
        { id: 'sq-73', label: 'v7.3 – Commander Role', date: '2024' },
        { id: 'sq-72', label: 'v7.2 – Weapon Rework', date: '2023' },
        { id: 'sq-71', label: 'v7.1 – ICO', date: '2023' },
      ],
    },
    {
      id: 'postscriptum', name: 'Post Scriptum', category: 'fps', mark: '© Periscope Games',
      steamAppId: 736220, logoUrl: STEAM(736220), hasTeamFeature: true,
      versions: [
        { id: 'ps-tbseventh', label: 'The Bloody Seventh', date: '2024' },
        { id: 'ps-45',        label: 'v4.5 – Map Update', date: '2023' },
        { id: 'ps-40',        label: 'v4.0 – Beyond Carentan', date: '2022' },
        { id: 'ps-38',        label: 'v3.8 – New Factions', date: '2021' },
        { id: 'ps-35',        label: 'v3.5 – Paradox', date: '2020' },
      ],
    },
    {
      id: 'hll', name: 'Hell Let Loose', category: 'fps', mark: '© Team17',
      steamAppId: 686810, logoUrl: STEAM(686810), hasTeamFeature: true,
      versions: [
        { id: 'hll-u18', label: 'Update 18: Mortain', date: '2025' },
        { id: 'hll-u17', label: 'Update 17: Caen', date: '2024' },
        { id: 'hll-u16', label: 'Update 16: Nacht', date: '2024' },
        { id: 'hll-u15', label: 'Update 15: Kharkov', date: '2023' },
        { id: 'hll-u14', label: 'Update 14: Entrenchment', date: '2023' },
      ],
    },
    {
      id: 'tarkov-arena', name: 'Escape from Tarkov: Arena', category: 'fps', mark: '© Battlestate Games', hasTeamFeature: true,
      versions: [
        { id: 'ta-04', label: 'v0.4 — Current Live Build', date: '2026' },
        { id: 'ta-03', label: 'Patch 0.3 – Ranked Mode', date: '2024' },
        { id: 'ta-02', label: 'Patch 0.2 – New Maps', date: '2024' },
        { id: 'ta-01', label: 'Early Access Launch 0.1', date: '2023' },
      ],
    },
    {
      id: 'wolfyb', name: 'Wolfenstein: Youngblood', category: 'fps', mark: '© Bethesda',
      steamAppId: 1056960, logoUrl: STEAM(1056960), hasTeamFeature: true,
      versions: [
        { id: 'wyb-109', label: 'v1.0.9 Final Update', date: '2020' },
        { id: 'wyb-108', label: 'v1.0.8', date: '2020' },
        { id: 'wyb-v1',  label: 'Launch v1.0', date: '2019' },
      ],
    },
  ],
}

// ─── SORT GAMES BY CATEGORY: images-first (A→Z), then no-image (A→Z) ────────
// Applied at data-init time per SPEC_UPDATE_04 Section A1.
;(function sortGames() {
  const sort = (arr: Game[]) => [
    ...arr.filter(g => !!g.logoUrl).sort((a, b) => a.name.localeCompare(b.name)),
    ...arr.filter(g => !g.logoUrl).sort((a, b) => a.name.localeCompare(b.name)),
  ]
  GAMES_BY_CATEGORY.extraction   = sort(GAMES_BY_CATEGORY.extraction)
  GAMES_BY_CATEGORY.competitive  = sort(GAMES_BY_CATEGORY.competitive)
  GAMES_BY_CATEGORY.fps          = sort(GAMES_BY_CATEGORY.fps)
})()

// ─── GAME QUESTIONS: weapons, maps, roles per game ───────────────────────────
// Weapons are categorised per SPEC_AMENDMENT_04 FIX 3.
// Maps are selectable lobby maps only — no sub-areas or callouts (FIX 4).

/** Shorthand — keeps weapon category data readable */
const wc = (category: string, weapons: string[]): WeaponCategory => ({ category, weapons })

export const GAME_QUESTIONS: Record<string, GameQuestions> = {

  // ── Escape from Tarkov ─────────────────────────────────────────────────────
  // Source: escapefromtarkov.fandom.com/wiki/Weapons
  // Researched: June 2026
  // Count: 74 weapons
  tarkov: {
    weapons: [
      wc('Assault Rifles', ['AK-74M', 'AK-74N', 'AKS-74', 'AKS-74U', 'AK-101', 'AK-102', 'AK-103', 'AK-104', 'AK-105', 'AKM', 'AKMS', 'AKMN', 'AKMSN', 'Mk47 Mutant', 'VPO-136 "Vepr-KM"', 'HK 416A5', 'HK 433', 'M4A1', 'MCX', 'MCX SPEAR', 'DT MDR', 'TX-15 DML', 'ADAR 2-15', 'SA-58', 'AS VAL', 'VSS Vintorez', 'OP-SKS', 'SKS', 'VPO-101 "Vepr-Hunter"', 'VPO-209', 'G36', 'AUG A1', 'Ash-12']),
      wc('Marksman Rifles', ['SVD', 'SVDS', 'RSASS', 'SR-25', 'Mk 17 SCAR-H', 'M1A', 'DVL-10', 'HK G28']),
      wc('Sniper Rifles', ['SV-98', 'Mosin-Nagant', 'ORSIS T-5000M', 'AXMC .338', 'Blaser R93']),
      wc('Submachine Guns', ['PP-19-01 "Vityaz-SN"', 'PP-9 "Klin"', 'PP-91 "Kedr"', 'PP-91-01 "Kedr-B"', 'MPX', 'MP5', 'MP5K', 'MP5SD', 'MP7A1', 'MP7A2', 'MP9', 'MP9-N', 'SR-2M "Veresk"', 'P90', 'UMP-45', 'PPSh-41']),
      wc('Shotguns', ['MP-133', 'MP-153', 'MP-155 Ultima', 'MTs-255-12', 'Saiga-12', 'Saiga-12K', 'KS-23M', 'VPO-215 "Vepr-12"', 'M870', 'M590A1']),
      wc('Light Machine Guns', ['PKP "Pecheneg"', 'PKM', 'RPK-16', 'M249', 'MG5']),
      wc('Pistols', ['Glock 17', 'Glock 18C', 'Glock 19X', 'M9A3', 'P226R', 'APB', 'APS', 'PM', 'PB', 'TT', 'SR-1MP "Gyurza"', 'PL-15', 'RSh-12']),
      wc('Melee', ['Red Rebel Ice Pick', 'Cultist Knife', 'Kiba Arms Straight Razor', 'ER Grizzly Boss Axe']),
    ],
    maps: [
      'Customs', 'Interchange', 'Reserve', 'Shoreline', 'Woods',
      'Streets of Tarkov', 'Lighthouse', 'Ground Zero',
      'Factory (Day)', 'Factory (Night)', 'The Lab',
    ],
    roles: [
      { value: 'rat',         label: 'The Rat',           subtitle: 'Extract with gear, never fight' },
      { value: 'chad',        label: 'The Chad',          subtitle: 'Fight everyone, fear nothing' },
      { value: 'scav',        label: 'Scav Runner',       subtitle: 'Free runs, low risk' },
      { value: 'pvp',         label: 'PvP Hunter',        subtitle: 'Player-killing is the loot' },
      { value: 'pve',         label: 'PvE Farmer',        subtitle: 'Bosses and scavs only' },
      { value: 'support',     label: 'Support / Medic',   subtitle: 'Keeps the squad alive' },
      { value: 'igl',         label: 'IGL / Shot Caller', subtitle: 'Plans the run, calls contacts' },
      { value: 'sniper',      label: 'Overwatch Sniper',  subtitle: 'Controls the perimeter' },
      { value: 'budget',      label: 'Budget Runner',     subtitle: 'Efficiency over firepower' },
      { value: 'quester',     label: 'Quester',           subtitle: 'Quest completion above all' },
    ],
  },

  // ── Hunt: Showdown 1896 ────────────────────────────────────────────────────
  // Source: huntshowdown.wiki.gg/wiki/Weapons
  // Researched: June 2026
  // Count: 56 weapons
  hunt: {
    weapons: [
      wc('Long Rifles', ['Berthier 1892', 'Krag', 'Lebel 1886', 'Mako 1895', 'Martini-Henry', 'Mosin Obrez', 'Mosin-Nagant', 'Sparks']),
      wc('Medium Rifles', ['1865 Carbine', 'Centennial', 'Drilling', 'Maynard Sniper', 'Springfield 1866', 'Vetterli 71', 'Wildland']),
      wc('Compact Rifles', ['Frontier 73C', 'Infantry 73L', 'Marathon', 'Ranger 73', 'Vandal 73C']),
      wc('Long Pistols', ['Haymaker', 'Uppercut']),
      wc('Medium Pistols', ['Pax', 'Scottfield']),
      wc('Compact Pistols', ['Bornheim No. 3', 'Conversion', 'LeMat Mark II', 'Nagant M1895', 'New Army', 'Officer']),
      wc('Shotguns', ['Auto-5', 'Homestead 78', 'Rival 78', 'Romero 77', 'Slate', 'Specter 1882', 'Terminus']),
      wc('Special / Bows', ['Bomb Lance', 'Bomb Launcher', 'Chu Ko Nu', 'Crossbow', 'Dolch 96', 'Hand Crossbow', 'Hunting Bow', 'Nitro Express']),
      wc('Melee', ['Baseball Bat', 'Cavalry Saber', 'Combat Axe', 'Katana', 'Machete', 'Railroad Hammer']),
    ],
    // FIX 4: Bayou and Mammon's Gulch are the current map names in Hunt 1896.
    // Stillwater Bayou and Lawson Delta are superseded names from before the 1896 relaunch.
    maps: ["Bayou", "Mammon's Gulch", 'DeSalle'],
    roles: [
      { value: 'frontline',  label: 'Frontline Hunter',   subtitle: 'Close fights, compound entry' },
      { value: 'sniper',     label: 'Long-Range Sniper',  subtitle: 'Controls sightlines from distance' },
      { value: 'support',    label: 'Support Trapper',    subtitle: 'Traps, alerts, peeks' },
      { value: 'flanker',    label: 'Flanker',            subtitle: 'Off-angle, unexpected entry' },
      { value: 'solo',       label: 'Solo Hunter',        subtitle: 'Self-sufficient, avoids squads' },
      { value: 'bounty',     label: 'Bounty Stealer',     subtitle: 'Third-parties fights, takes the prize' },
      { value: 'boss',       label: 'Boss Specialist',    subtitle: 'Clue gathering, efficient kills' },
      { value: 'ambusher',   label: 'Ambusher',           subtitle: 'Waits, watches, punishes' },
      { value: 'aggressive', label: 'Aggressive Pusher',  subtitle: 'Never waits — always presses' },
      { value: 'methodical', label: 'Methodical',         subtitle: 'Slow, deliberate, no mistakes' },
    ],
  },

  // ── Gray Zone Warfare ──────────────────────────────────────────────────────
  // Source: eu.turtlebeach.com/blog/all-weapons-in-gray-zone-warfare, grayzonewarfarewiki.wiki
  // Researched: June 2026
  // Count: 27 weapons (early access — roster growing)
  gzw: {
    weapons: [
      wc('Assault Rifles', ['AKM', 'AKMN', 'AKMS', 'AKMSN', 'AK-74M', 'AK-74N', 'AK-15', 'AK-308', 'M4A1', 'MK18', 'CQ A1', 'KAC KS-1', 'Sa vz. 58', 'Colt M16A1']),
      wc('Marksman Rifles', ['Springfield M1A', 'SKS', 'SVD']),
      wc('Sniper Rifles', ['Mosin-Nagant', 'M700', 'Remington 788']),
      wc('Submachine Guns', ['MP7A1', 'Sa vz. 61 Skorpion']),
      wc('Shotguns', ['Remington Model 870', 'Mossberg 590']),
      wc('Pistols', ['Glock 17', 'Beretta M9A1', 'Colt 1911 Commander', 'Laugo Alien', 'Norinco M-201C', 'Type 51']),
    ],
    // FIX 4: GZW is open-world with deployment zones, not discrete lobby maps.
    // Listing the selectable deployment areas as they appear in the mission board.
    maps: ['Ban Pa', 'Dead Falls', "The Warden's Keep", 'Sawmill', 'The Harbor', 'Maw of Lamang'],
    roles: [...GENERIC_ROLES],
  },

  // ── Delta Force ────────────────────────────────────────────────────────────
  // Source: pcgamesn.com/delta-force/weapons-guns
  // Researched: June 2026
  // Count: 45 weapons
  deltaforce: {
    weapons: [
      wc('Assault Rifles', ['CAR-15', 'M16A4', 'AKS-74', 'QBZ95-1', 'K416', 'M4A1', 'SG552', 'AUG', 'AK-12', 'SR-3M Compact', 'PTR-32', 'AKM', 'AS Val', 'CI-19', 'Type-191', 'AR57']),
      wc('Battle Rifles', ['G3', 'M7', 'SCAR-H']),
      wc('Submachine Guns', ['UZI', 'Bizon', 'SMG-45', 'MP7', 'P90', 'MP5', 'Vityaz', 'Vector']),
      wc('Light Machine Guns', ['M249', 'PKM', 'M250']),
      wc('Marksman Rifles', ['Mini-14', 'PSG-1', 'VSS', 'SR-25', 'M14', 'SKS']),
      wc('Sniper Rifles', ['SV-98', 'R93', 'SVD', 'M700', 'AWM', 'M82']),
      wc('Shotguns', ['M870', 'M1014', 'S12K']),
      wc('Pistols', ['G17', 'QSZ-92G', 'Desert Eagle', '93R', 'G18', '.357 Revolver', 'M1911']),
    ],
    maps: [
      // Havoc Warfare maps
      'Safi River', 'Al-Hasakah', 'Kohat Toi Pass', 'Port Sulphur', 'Sinai Desert',
      // Zero Hour extraction zones
      'Al-Hasakah (Extraction)', 'Safi River (Extraction)',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Marauders ──────────────────────────────────────────────────────────────
  // Source: marauders.fandom.com/wiki/Weapons, imfdb.org/wiki/Marauders_(video_game)
  // Researched: June 2026
  // Count: 26 weapons
  marauders: {
    weapons: [
      wc('Rifles', ['M1 Garand', 'M1 Carbine', 'M1941 Johnson', 'M16', 'K1 Assault', 'De Lisle Carbine']),
      wc('Submachine Guns', ['Thompson', 'Heavy Thompson', 'M50 Reising', 'T40 (Sten prototype)', 'PPSh-41', 'MP40', 'Uzi']),
      wc('Light Machine Guns', ['DP-28', 'MG 42', 'Bren LMG']),
      wc('Shotguns', ['Trench Gun']),
      wc('Pistols', ['Luger P08', '1911 Government', 'M1911 Stamped', 'VZ Klobb (Sa vz. 61)']),
      wc('Special / Launchers', ['Mini Thumper (M79 cut-down)', 'China Lake Launcher', 'LPO Flamethrower']),
    ],
    maps: [
      'Star Commander', 'Frigate', 'Research Facility', 'Battlecruiser',
      'Asteroid Field', 'Science Vessel', 'Prison Barge', 'Carrier',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Dark and Darker ────────────────────────────────────────────────────────
  // No traditional weapon selection — class determines playstyle.
  // "weapons" field repurposed as "classes", "maps" as dungeon zones.
  dad: {
    weapons: [
      wc('Classes', ['Fighter', 'Barbarian', 'Cleric', 'Ranger', 'Rogue', 'Wizard', 'Bard', 'Druid', 'Warlock']),
    ],
    maps: ['Goblin Caves', 'Forgotten Castle', 'The Crypt', 'Inferno', 'Ice Cavern'],
    roles: [
      { value: 'tank',      label: 'Tank / Frontliner',  subtitle: 'Fighter, Barbarian — absorbs pressure' },
      { value: 'healer',    label: 'Healer',             subtitle: 'Cleric — keeps the team standing' },
      { value: 'dps-melee', label: 'Melee DPS',          subtitle: 'Rogue — quick, lethal' },
      { value: 'dps-range', label: 'Ranged DPS',         subtitle: 'Ranger — distance dealer' },
      { value: 'utility',   label: 'Utility / Caster',   subtitle: 'Wizard, Bard, Warlock, Druid' },
      { value: 'flex',      label: 'Flex',               subtitle: 'Whatever the group needs' },
    ],
  },

  // ── Arena Breakout (Mobile) ────────────────────────────────────────────────
  // Source: arena-breakout-infinite.fandom.com (mobile shares weapon DNA with ABI)
  // Researched: June 2026
  // Count: 20 weapons (mobile version subset)
  ab: {
    weapons: [
      wc('Assault Rifles', ['AKM', 'M4A1', 'AK-74N', 'AK-74U', 'AK-102', 'SCAR-L']),
      wc('Carbines', ['SKS', 'M16', 'M14', 'SA85M']),
      wc('Marksman / Sniper', ['SVDS', 'VSS', 'M24', 'Mosin-Nagant']),
      wc('Submachine Guns', ['MP5', 'UMP 45', 'P90', 'Mac-10']),
      wc('Shotguns', ['M870', 'MP-133']),
      wc('Pistols', ['M9A3', 'M1911', 'Deagle']),
    ],
    maps: ['Armory', 'Valley', 'Farm', 'Port'],
    roles: [...GENERIC_ROLES],
  },

  // ── Arena Breakout: Infinite (PC) ─────────────────────────────────────────
  // Source: theguidehall.com/arena-breakout-infinite-all-weapons/
  // Researched: June 2026
  // Count: 71 weapons
  abi: {
    weapons: [
      wc('Assault Rifles', ['AKM', 'M4A1', 'FAL', 'H416', 'MDR', 'AK-102', 'AK-74N', 'AKS-74U', 'AUG', 'F2000', 'AR-57', 'ACE31', 'AEK', 'AN-94', 'SCAR-L', 'T951', 'T03', 'SG550', 'G3', 'AK12', 'MCX', 'PCC-9', 'ZC807']),
      wc('Submachine Guns', ['MP5', 'MPX', 'P90', 'Uzi', 'UMP 45', 'MAC-10', 'M3A1', 'T79', 'MP 40', 'QC61', 'MPF45', 'T85', 'Vector 45', 'Vector 9', 'PP19']),
      wc('Carbines', ['SA85M', 'SKS', 'M14', 'M96', 'Mini 14', 'BM59', 'SVTU', 'M16']),
      wc('Marksman Rifles', ['SVDS', 'VSS', 'Mk 14', 'M110', 'ML Rifle']),
      wc('Sniper Rifles', ['Mosin-Nagant', 'SJ16', 'M24']),
      wc('Shotguns', ['M870', 'MP-133', 'S12K', 'USAS-12', 'SPR310']),
      wc('Light Machine Guns', ['RPK-16']),
      wc('Pistols', ['G17', 'M9A3', 'G18C', 'Deagle', 'T54', 'M1911', 'MP9', 'G-Deagle', 'T05', 'M45A1', 'CZ 52', 'F57']),
    ],
    maps: ['Armory', 'Valley', 'Farm', 'Port', 'Operations Base'],
    roles: [
      { value: 'rat',       label: 'Rat',              subtitle: 'Extract over fight' },
      { value: 'fighter',   label: 'Fighter',          subtitle: 'Engages everything' },
      { value: 'sniper',    label: 'Marksman',         subtitle: 'Long-range suppressor' },
      { value: 'support',   label: 'Support',          subtitle: 'Heals and assists' },
      { value: 'igl',       label: 'IGL',              subtitle: 'Calls the play' },
      { value: 'flanker',   label: 'Flanker',          subtitle: 'Unexpected angles' },
      { value: 'lootter',   label: 'Loot Runner',      subtitle: 'In and out fast' },
      { value: 'ambusher',  label: 'Ambusher',         subtitle: 'Waits for them to come' },
      { value: 'pvp',       label: 'PvP Seeker',       subtitle: 'Looking for fights' },
      { value: 'budget',    label: 'Budget Runner',    subtitle: 'Low-cost, high-efficiency' },
    ],
  },

  // ── SCUM ───────────────────────────────────────────────────────────────────
  // Source: scum.wiki.gg/wiki/All_Firearms
  // Researched: June 2026
  // Count: 42 firearms
  scum: {
    weapons: [
      wc('Assault Rifles', ['AK-15', 'AK-47', 'AKM', 'AKS-74U', 'M16A4', 'MK18', 'SCAR-L', 'VHS 2', 'VHS 2 CT', 'VHS BG']),
      wc('Sniper Rifles', ['AWM', 'AWP', 'Kar98', 'M1 Rifle', 'M82A1', 'M1891', 'SVD', 'VSS VZ']),
      wc('Hunting Rifles', ['Carbon Hunter', 'Hunter85']),
      wc('Submachine Guns', ['AS Val', 'MP5', 'MP5 K', 'MP5 SD', 'UMP-45']),
      wc('Shotguns', ['DT11B', 'M1887', 'M1887 Sawed Off', 'SDASS 12M', 'TEC01 490', 'The Mule DT11B Short']),
      wc('Pistols & Revolvers', ['DEagle .357', 'DEagle 50', 'HS SF19', 'HS-9', 'Judge 44', 'Krueger', 'M1911', 'PeaceKeeper 38', 'Serpent 357', 'TEC01 M9', 'Viper M357']),
      wc('Light Machine Guns', ['M249', 'RPK']),
      wc('Improvised', ['Improvised Handgun .50cal', 'Improvised Shotgun']),
    ],
    maps: [
      // SCUM has one large island divided into sectors
      'Sector A (North West)', 'Sector B (North East)',
      'Sector C (South West)', 'Sector D (South East)',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Vigor ──────────────────────────────────────────────────────────────────
  // Source: vigor.fandom.com/wiki/Weapons, imfdb.org/wiki/Vigor
  // Researched: June 2026
  // Count: 32 weapons
  vigor: {
    weapons: [
      wc('Rifles', ['M2 Carbine', 'SKS', 'vz.52 Rifle', 'M21', 'SSG 82', 'AUR HBAR-T', 'VSS Vintorez']),
      wc('Assault Rifles', ['A-KM', 'A74-K', 'AKS-74U', 'ES16A2']),
      wc('Submachine Guns', ['Thompson', 'Grease Gun', 'PM-63 RAK', 'Škorpion', 'Suomi KP/-31', 'MGV-176', 'AUR Para', 'ADR-97']),
      wc('Pistols', ['PM', 'Luger', 'M1911', 'Combat Magnum']),
      wc('Shotguns', ['Silver Pigeon', 'Izh43']),
      wc('Machine Guns', ['Maschinengewehr 3', 'RPK', 'Kk 62', 'ZA M72']),
      wc('Melee', ['Puukko', 'Vz.58 Bayonet', 'UTON vz. 75', 'Fällkniven A1']),
    ],
    maps: [
      'Borders', 'Outskirts', 'Collapsed Bridge', 'Crater', 'Nameless Village',
      'Resort', 'Lumber Yard', 'Transmission Tower', 'Shelter',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Once Human ─────────────────────────────────────────────────────────────
  // Source: once-human.wiki/weapons/
  // Researched: June 2026
  // Count: 38 weapons
  oncehuman: {
    weapons: [
      wc('Assault Rifles', ['KAM', 'SOCR']),
      wc('Submachine Guns', ['MPS5', 'MPS7', 'KV-SBR']),
      wc('Shotguns', ['Dual Fury', 'Old Huntsman', 'DBSG', 'S870', 'DB12', 'ACS12']),
      wc('Sniper Rifles', ['HAMR', 'SN700', 'AWS.338']),
      wc('Light Machine Guns', ['MG4', 'KVD']),
      wc('Pistols', ['DE.50', 'R500', 'G17']),
      wc('Launchers', ['MGL', 'RPG7']),
      wc('Bows & Crossbows', ['Rustic Crossbow', 'Compound Bow', 'Recurve Crossbow', 'Recurve Bow']),
      wc('Melee', ['Stun Baton', 'Long Axe', 'Baseball Bat', 'Torch', 'Wrench', 'Camping Knife']),
    ],
    maps: ['Manibus', 'Nalcott', 'Eternaland'],
    roles: [...GENERIC_ROLES],
  },

  // ── Deadside ───────────────────────────────────────────────────────────────
  // Source: deadsidegame.com, thegamer.com/deadside-best-weapons-guns/
  // Researched: June 2026
  // Count: 16 weapons
  deadside: {
    weapons: [
      wc('Assault Rifles', ['UAG', 'Grom', 'RPK-Mod', 'S85', 'AK-mod', 'AK-SU']),
      wc('Sniper Rifles', ['Mosin-Nagant', 'VSD', 'MG-36']),
      wc('Submachine Guns', ['P900', 'Cross Vector']),
      wc('Shotguns', ['MS590']),
      wc('Pistols', ['F-57', 'Makarov']),
      wc('Special', ['Fasam', 'R-12']),
    ],
    maps: ['Bolshakovo', 'Gromovoy', 'Strelkovo', 'Ogorodnikovo', 'Krasnobor', 'Dobrovo', 'Uspenka'],
    roles: [...GENERIC_ROLES],
  },

  // ── Incursion Red River ────────────────────────────────────────────────────
  // Source: theguidehall.com/incursion-red-river-all-weapons-available-in-early-access/
  // Researched: June 2026
  // Count: 16 weapons (early access)
  incursion: {
    weapons: [
      wc('Assault Rifles', ['Colt M4A1', 'FN SCAR-L', 'AK-74M', 'AUG A3', 'Sig Sauer MCX Rattler', 'Sig Sauer MCX Virtus']),
      wc('Marksman Rifles', ['FN SCAR-H']),
      wc('Sniper Rifles', ['SRS A2']),
      wc('Shotguns', ['Benelli M2', 'RIA VR80']),
      wc('Submachine Guns', ['MP5', 'MP5SD', 'MP5k', 'FN P90']),
      wc('Pistols', ['Glock 19', 'P320', 'FN Five-SeveN']),
    ],
    maps: ['Red River Valley'],
    roles: [...GENERIC_ROLES],
  },

  // ── Project Zomboid ────────────────────────────────────────────────────────
  // Isometric survival — weapons are melee/firearms found in world
  pz: {
    weapons: [
      wc('Firearms', ['Pistol', 'Shotgun', 'Hunting Rifle', 'Assault Rifle']),
      wc('Melee', ['Baseball Bat', 'Axe', 'Crowbar', 'Kitchen Knife', 'Frying Pan', 'Plank', 'Hammer', 'Spear (improvised)']),
    ],
    maps: ['Muldraugh', 'Rosewood', 'West Point', 'Riverside', 'Louisville'],
    roles: [...GENERIC_ROLES],
  },

  // ── Rust ───────────────────────────────────────────────────────────────────
  // Procedurally generated maps — repurposed as monument/landmark preferences
  rust: {
    weapons: [
      wc('Pistols & Revolvers', ['Python Revolver', 'Semi-Automatic Pistol', 'Revolver', 'Eoka Pistol']),
      wc('Shotguns', ['Pump Shotgun', 'Semi-Auto Shotgun', 'Spas-12', 'Double Barrel Shotgun']),
      wc('Submachine Guns', ['Thompson SMG', 'MP5A4', 'Custom SMG']),
      wc('Rifles', ['Semi-Automatic Rifle', 'LR-300 Assault Rifle', 'Assault Rifle (AK)', 'M39 Rifle']),
      wc('Light Machine Guns', ['M249']),
      wc('Sniper Rifles', ['Bolt Action Rifle', 'L96 Rifle']),
      wc('Bows & Crossbows', ['Crossbow', 'Hunting Bow', 'Compound Bow']),
      wc('Launchers', ['Multiple Grenade Launcher']),
    ],
    maps: [
      // Rust monuments players gravitate toward
      'Launch Site', 'Military Base (Abandoned)', 'Nuclear Power Plant', 'Airfield',
      'Dome', 'Harbor', 'Large Oil Rig', 'Small Oil Rig', 'Junkyard',
      'Water Treatment Plant', 'Train Yard', 'Outpost', 'Bandit Camp',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── DayZ ───────────────────────────────────────────────────────────────────
  dayz: {
    weapons: [
      wc('Assault Rifles', ['AKM', 'AK-74', 'AK-101', 'M4A1', 'CR-527', 'ADAR (AR-15)']),
      wc('Sniper Rifles', ['SVD', 'Mosin 91/30', 'Winchester Model 70', 'CZ 527', 'Blaze 95 Double Rifle']),
      wc('Submachine Guns', ['UMP-45', 'PP-19 Bizon', 'Scorpion Vz. 61', 'MP5-K']),
      wc('Shotguns', ['BK-43', 'IZH-43', 'MP-133', 'Sawed-off Shotgun']),
      wc('Pistols', ['M9 Beretta', 'FNX-45', 'M1911', 'CR-75', 'Glock 19', 'Makarov PM']),
    ],
    maps: ['Chernarus', 'Livonia', 'Sakhal'],
    roles: [...GENERIC_ROLES],
  },

  // ── The Division 2 ─────────────────────────────────────────────────────────
  div2: {
    weapons: [
      wc('Assault Rifles', ['M4 (Assault Rifle)', 'AK-M (Assault Rifle)', 'Eagle Bearer (Exotic AR)', 'Capacitor (Exotic AR)']),
      wc('Light Machine Guns', ['M60 (LMG)', 'Bullet King (Exotic LMG)', 'M249 (LMG)']),
      wc('Submachine Guns', ['Vector (SMG)', 'MPX (SMG)', 'Tommy Gun (SMG)', 'Chatterbox (Exotic SMG)']),
      wc('Marksman Rifles', ['SOCOM Mk 20 SSR (MMR)', 'Nemesis (Exotic Sniper)', '1886 (Exotic Rifle)']),
      wc('Shotguns', ['Super 90 (Shotgun)', 'Merciless (Exotic Rifle)']),
      wc('Pistols', ['Dodge City Holster Pistol', 'Liberty (Exotic Pistol)']),
    ],
    maps: [
      'Dark Zone East', 'Dark Zone West', 'Dark Zone South',
      'Tidal Basin', 'Capitol Building', 'Lincoln Memorial',
      'Air & Space Museum', 'Jefferson Trade Center',
      'Grand Washington Hotel', 'Open World (Washington D.C.)',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Warzone (extraction context) ────────────────────────────────────────────
  'warzone-ext': {
    weapons: [
      wc('Assault Rifles', ['TAQ-56', 'STB 556', 'MTZ-556', 'Holger 556', 'MCW', 'Kastov 762']),
      wc('Submachine Guns', ['Fennec 45', 'Vaznev-9K', 'Lachmann Sub', 'WSP Swarm']),
      wc('Light Machine Guns', ['RPK', 'Raal MG']),
      wc('Sniper Rifles', ['MCPR-300', 'Signal 50', 'Victus XMR', 'LA-B 330']),
      wc('Shotguns', ['Expedite 12']),
    ],
    maps: ['Al Mazrah', 'Ashika Island', 'Urzikstan', 'Rebirth Island', 'Vondel'],
    roles: [...GENERIC_ROLES],
  },

  // ── Dying Light 2 ──────────────────────────────────────────────────────────
  dl2: {
    weapons: [
      wc('Melee', ['Machete', 'Baseball Bat', 'Pipe Wrench', 'Sledgehammer', 'Katana', 'One-Handed Spike', 'Electric Machete', 'Military Machete']),
      wc('Bows & Crossbows', ['Crossbow', 'Recurve Bow', 'Compound Bow', 'Paraglider Bow']),
      wc('Throwables', ['Military Throwing Knife', 'Throwing Star', 'Infected Throwing Star']),
    ],
    maps: [
      'The Bazaar', 'Houndfield', 'Horseshoe', 'Trinity', 'Downtown',
      'Garrison', 'Muddy Grounds', 'The Wharf', 'Arch-Anemone',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Risk of Rain 2 ─────────────────────────────────────────────────────────
  // Roguelite — no traditional map/weapon choice. "weapons" = survivors (characters),
  // "maps" = stages. Questions framed accordingly in ProfileForm.
  ror2: {
    weapons: [
      wc('Survivors', ['Commando', 'Huntress', 'MUL-T', 'Engineer', 'Artificer', 'Mercenary', 'REX', 'Loader', 'Acrid', 'Captain', 'Railgunner', 'Void Fiend', 'Seeker', 'False Son', 'Chef']),
    ],
    maps: [
      'Titanic Plains', 'Distant Roost', 'Wetland Aspect', 'Rallypoint Delta',
      'Abandoned Aqueduct', 'Scorched Acres', 'Sky Meadow', 'Sundered Grove',
      'Abyssal Depths', 'Siphoned Forest', 'Sulfur Pools', 'Verdant Falls',
      'Aphelian Sanctuary', 'Void Fields', 'The Planetarium', "Sirens' Call",
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── The Forever Winter ─────────────────────────────────────────────────────
  // Source: theforeverwinter.wiki.gg/wiki/Weapons
  // Researched: June 2026
  // Count: 50 weapons (early access — all named)
  foreverwinter: {
    weapons: [
      wc('Pistols', ['87 Target', 'C96', 'G-L 19', 'Mateo Model J', 'R8', 'SOG', 'USP', 'Viper']),
      wc('Rifles', ['47 TYP', 'AK', 'G36', 'M16', 'M4A1', 'R11 RSASS', 'RPK', 'SA58', 'Surplus Rifle', 'SVD', 'TKB-0146', 'VH-Ambi 2', 'VIK-32L', 'VKS Vykhlop']),
      wc('Heavy Rifles', ['36M AntiTank', 'AT-43 MASS', 'GM6', 'NTW-20', 'SCAR']),
      wc('Light Machine Guns', ['LMG-P', 'M60', 'MG34', 'RPD', 'SAW']),
      wc('Heavy Machine Guns', ['Painless']),
      wc('Shotguns', ['AA12', 'CLAW', 'S12', 'Surplus Shotgun', 'USAS-12', 'VEPR-12']),
      wc('Submachine Guns', ['APC9 Pro', 'Kriss Vector 45', 'P90', 'PM-9', 'PnP-2K', 'PP-19 Vityaz', 'PPSh-41', 'Spectre M4', 'WLT MPL']),
      wc('Launchers', ['Grenade Launcher', 'M79 Sawed-off', 'XM25']),
    ],
    maps: ['The Dig', 'The Atrium', 'The Undercroft', 'The Generator'],
    roles: [...GENERIC_ROLES],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // COMPETITIVE
  // ──────────────────────────────────────────────────────────────────────────

  // ── Counter-Strike 2 ───────────────────────────────────────────────────────
  // Source: store.steampowered.com/app/730/CounterStrike_2/ (in-game buy menu)
  // Researched: June 2026
  // Count: 34 purchasable weapons + knife
  cs2: {
    weapons: [
      wc('Pistols', ['Glock-18', 'USP-S', 'P2000', 'Dual Berettas', 'P250', 'Five-SeveN', 'Tec-9', 'CZ75-Auto', 'Desert Eagle', 'R8 Revolver']),
      wc('Submachine Guns', ['MAC-10', 'MP9', 'MP5-SD', 'UMP-45', 'P90', 'PP-Bizon']),
      wc('Heavy', ['Nova', 'XM1014', 'MAG-7', 'Sawed-Off', 'M249', 'Negev']),
      wc('Rifles', ['FAMAS', 'Galil AR', 'M4A4', 'M4A1-S', 'AK-47', 'SG 553', 'AUG']),
      wc('Sniper Rifles', ['SSG 08', 'AWP', 'SCAR-20', 'G3SG1']),
      wc('Utility', ['HE Grenade', 'Flashbang', 'Smoke Grenade', 'Molotov / Incendiary', 'Decoy Grenade']),
      wc('Melee', ['Knife']),
    ],
    maps: [
      // Active Duty pool (2025–2026)
      'Mirage', 'Inferno', 'Dust2', 'Anubis', 'Nuke', 'Vertigo', 'Ancient', 'Train', 'Overpass',
    ],
    roles: [
      { value: 'igl',       label: 'In-Game Leader',     subtitle: 'Calls strats, reads the game' },
      { value: 'awper',     label: 'AWPer',              subtitle: 'Primary sniper' },
      { value: 'entry',     label: 'Entry Fragger',      subtitle: 'First through the door' },
      { value: 'support',   label: 'Support',            subtitle: 'Flashes, smokes, trades' },
      { value: 'lurker',    label: 'Lurker',             subtitle: 'Flanks and creates pressure' },
      { value: 'rifler',    label: 'Rifler',             subtitle: 'Versatile rifle plays' },
      { value: 'anchor',    label: 'Site Anchor',        subtitle: 'Holds a site alone' },
      { value: 'clutcher',  label: 'Clutch Player',      subtitle: 'Specialises in 1vX' },
      { value: 'eco',       label: 'Eco Specialist',     subtitle: 'Maximises force-buy rounds' },
      { value: 'hybrid',    label: 'Hybrid AWP/Rifle',   subtitle: 'Switches roles round to round' },
    ],
  },

  // ── VALORANT ────────────────────────────────────────────────────────────────
  // Source: playvalorant.com/en-gb/arsenal/ (official Arsenal page)
  // Researched: June 2026
  // Count: 19 weapons
  valorant: {
    weapons: [
      wc('Sidearms', ['Classic', 'Shorty', 'Frenzy', 'Ghost', 'Sheriff']),
      wc('Submachine Guns', ['Stinger', 'Spectre']),
      wc('Rifles', ['Bulldog', 'Guardian', 'Phantom', 'Vandal']),
      wc('Shotguns', ['Bucky', 'Judge']),
      wc('Sniper Rifles', ['Marshal', 'Outlaw', 'Operator']),
      wc('Machine Guns', ['Ares', 'Odin']),
      wc('Melee', ['Knife']),
    ],
    maps: [
      // Active ranked pool 2026
      'Abyss', 'Ascent', 'Bind', 'Fracture', 'Haven',
      'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset',
    ],
    roles: [
      { value: 'duelist',    label: 'Duelist',           subtitle: 'Entry fragger — Jett, Reyna, Neon' },
      { value: 'initiator',  label: 'Initiator',         subtitle: 'Opens sites — Sova, KAY/O, Fade' },
      { value: 'controller', label: 'Controller',        subtitle: 'Smokes and vision — Omen, Viper, Astra' },
      { value: 'sentinel',   label: 'Sentinel',          subtitle: 'Anchors and flanks — Killjoy, Cypher' },
      { value: 'igl',        label: 'IGL / Strategist',  subtitle: 'Calls the strat, reads economy' },
      { value: 'awper',      label: 'Operator Specialist', subtitle: 'Op-first playstyle' },
      { value: 'support',    label: 'Support',           subtitle: 'Utilities, flashes, heals' },
      { value: 'flex',       label: 'Flex Player',       subtitle: 'Plays whatever is needed' },
      { value: 'smokes',     label: 'Smokes Bot',        subtitle: 'Dedicated smoke controller' },
      { value: 'lurker',     label: 'Lurker',            subtitle: 'Off-angle, late rotation' },
    ],
  },

  // ── Rainbow Six Siege ──────────────────────────────────────────────────────
  // Source: liquipedia.net/rainbowsix/Portal:Weapons
  // Researched: June 2026
  // Count: 100+ weapons across categories (listing all primary types)
  r6siege: {
    weapons: [
      wc('Assault Rifles', ['L85A2', 'AR33', 'G36C', 'R4-C', '556xi', 'F2', 'AK-12', 'AUG A2', '552 Commando', '416-C Carbine', 'C8-SFW', 'Mk17 CQB', 'PARA-308', 'Type-89', 'C7E', 'M762', 'V308', 'Spear .308', 'M4', 'ARX200', 'F90', 'Commando 9', 'SC3000K', 'AK-74M']),
      wc('Submachine Guns', ['FMG-9', 'MP5K', 'UMP45', 'MP5', 'P90', '9x19VSN', 'MP7', '9mm C1', 'MPX', 'M12', 'MP5SD', 'PDW9', 'Vector .45 ACP', 'T-5 SMG', 'Scorpion EVO 3 A1', 'K1A', 'Mx4 Storm', 'AUG A3', 'P10 RONI', 'UZK50GI']),
      wc('Light Machine Guns', ['6P41', 'G8A1', 'M249', 'T-95 LSW', 'LMG-E', 'ALDA 5.56', 'M249 SAW', 'DP27']),
      wc('Marksman Rifles', ['417', 'OTs-03', 'CAMRS', 'SR-25', 'Mk 14 EBR', 'AR-15.50', 'CSRX 300', 'PMR90A2']),
      wc('Shotguns', ['M590A1', 'M1014', 'SG-CQB', 'SASG-12', 'M870', 'Super 90', 'SPAS-12', 'SPAS-15', 'SuperNova', 'ITA12L', 'SIX12', 'SIX12 SD', 'FO-12', 'BOSG.12.2', 'ACS12', 'TCSG12']),
    ],
    maps: [
      'Bank', 'Border', 'Chalet', 'Clubhouse', 'Coastline', 'Consulate',
      'Lair', 'Nighthaven Labs', 'Oregon', 'Skyscraper', 'Theme Park', 'Villa',
      'Kafe Dostoyevsky', 'Emerald Plains', 'Stadium Bravo', 'Fortress',
    ],
    roles: [
      { value: 'hard-breach', label: 'Hard Breacher',     subtitle: 'Thermite, Hibana, Ash' },
      { value: 'soft-breach', label: 'Soft Breacher',     subtitle: 'Sledge, Buck — silent entry' },
      { value: 'roamer',      label: 'Roamer',            subtitle: 'Disrupts attackers off-site' },
      { value: 'anchor',      label: 'Anchor',            subtitle: 'Holds the objective' },
      { value: 'intel',       label: 'Intel Op',          subtitle: 'Drones, cameras, Pulse' },
      { value: 'support',     label: 'Support',           subtitle: 'Shields, revives, utilities' },
      { value: 'trapper',     label: 'Trapper',           subtitle: 'Frost, Kapkan, Lesion' },
      { value: 'flank',       label: 'Flank Watch',       subtitle: 'Maestro, Valkyrie — eyes everywhere' },
      { value: 'igl',         label: 'IGL',               subtitle: 'Calls rotations and strats' },
      { value: 'flex',        label: 'Flex',              subtitle: 'Adapts to team composition' },
    ],
  },

  // ── Rainbow Six Extraction ──────────────────────────────────────────────────
  r6ext: {
    weapons: [
      wc('Assault Rifles', ['R4-C', 'M4', 'AK-12', '416-C Carbine', 'ARX200']),
      wc('Submachine Guns', ['MP5', 'Vector .45 ACP']),
      wc('Light Machine Guns', ['LMG-E']),
      wc('Marksman Rifles', ['Mk 17 CQB']),
      wc('Shotguns', ['SG-CQB', 'M1014']),
    ],
    maps: [
      'New York', 'San Francisco', 'Truth or Consequences (New Mexico)',
      'Alaska', 'Florida', 'Albuquerque', 'Portland',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Overwatch 2 ────────────────────────────────────────────────────────────
  // Role = hero category (Tank/DPS/Support). "Weapons" repurposed as heroes.
  ow2: {
    weapons: [
      wc('Tanks', ["D.Va", 'Doomfist', 'Junker Queen', 'Mauga', 'Orisa', 'Ramattra', 'Reinhardt', 'Roadhog', 'Sigma', 'Winston', 'Wrecking Ball', 'Zarya']),
      wc('DPS', ['Ashe', 'Bastion', 'Cassidy', 'Echo', 'Genji', 'Hanzo', 'Junkrat', 'Mei', 'Pharah', 'Reaper', 'Sojourn', 'Soldier: 76', 'Sombra', 'Symmetra', 'Torbjörn', 'Tracer', 'Venture', 'Widowmaker']),
      wc('Support', ['Ana', 'Baptiste', 'Brigitte', 'Illari', 'Kiriko', 'Lifeweaver', 'Lúcio', 'Mercy', 'Moira', 'Zenyatta']),
    ],
    maps: [
      'Circuit Royal', 'Dorado', 'Havana', 'Junkertown', 'Rialto', 'Route 66',
      "Watchpoint: Gibraltar", 'Shambali Monastery', 'Samoa', 'Colosseo',
      'Eichenwalde', 'Hollywood', "King's Row", 'Midtown', 'Numbani', 'Paraíso',
      'Antarctic Peninsula', 'Busan', 'Ilios', 'Lijiang Tower', 'Nepal', 'Oasis',
      'New Junk City', 'Suravasa',
    ],
    roles: [
      { value: 'tank',     label: 'Tank',    subtitle: 'Creates space and absorbs damage' },
      { value: 'dps',      label: 'DPS',     subtitle: 'Deals damage, wins duels' },
      { value: 'support',  label: 'Support', subtitle: 'Heals and enables the team' },
    ],
  },

  // ── Apex Legends ───────────────────────────────────────────────────────────
  // Source: apexlegends.fandom.com/wiki/Weapon, esports.gg, boostmatch.gg — Season 29 (2026)
  // Researched: June 2026
  // Count: 27 weapons (floor loot; Care Package weapons noted)
  apex: {
    weapons: [
      wc('Assault Rifles', ['R-301 Carbine', 'Hemlok Burst AR', 'VK-47 Flatline', 'Nemesis Burst AR', 'Havoc Rifle']),
      wc('Submachine Guns', ['Alternator SMG', 'R-99 SMG', 'CAR SMG', 'Volt SMG', 'Prowler Burst PDW']),
      wc('Light Machine Guns', ['Devotion LMG', 'Spitfire', 'Rampage LMG', 'L-STAR EMG (Care Package)']),
      wc('Sniper Rifles', ['Triple Take', 'Longbow DMR', 'Charge Rifle', 'Sentinel', 'Kraber .50-Cal (Care Package)']),
      wc('Shotguns', ['EVA-8 Auto', 'Mastiff Shotgun', 'Mozambique Shotgun', 'Peacekeeper']),
      wc('Pistols', ['P2020', 'RE-45 Auto', 'Wingman']),
      wc('Marksman Rifles', ['G7 Scout (Care Package)']),
    ],
    maps: ["King's Canyon", "World's Edge", 'Olympus', 'Storm Point', 'Broken Moon'],
    roles: [
      { value: 'fragger',   label: 'Fragger',          subtitle: 'Initiates and wins gunfights' },
      { value: 'support',   label: 'Support',          subtitle: 'Heals, revives, enables' },
      { value: 'scout',     label: 'Scout / Recon',    subtitle: 'Tracks enemies, surveys rings' },
      { value: 'anchor',    label: 'Anchor',           subtitle: 'Holds position, controls zones' },
      { value: 'igl',       label: 'IGL',              subtitle: 'Calls rotations and third-parties' },
      { value: 'aggro',     label: 'Aggressive Push',  subtitle: 'Never plays safe' },
      { value: 'passive',   label: 'Passive / Ratty',  subtitle: 'Ring plays, final circles' },
      { value: 'sniper',    label: 'Sniper',           subtitle: 'Long-range pressure and picks' },
      { value: 'flex',      label: 'Flex',             subtitle: 'Fills whatever role is needed' },
      { value: 'controller','label': 'Controller',     subtitle: 'Gibraltor, Caustic, Wattson' },
    ],
  },

  // ── Splitgate 2 ─────────────────────────────────────────────────────────────
  // Source: dotesports.com/splitgate/news/all-weapons-in-splitgate-2, gamesradar.com
  // Researched: June 2026
  // Count: 21 weapons
  splitgate2: {
    weapons: [
      wc('Assault Rifles', ['Synapse', 'Trailblazer', 'Tempo']),
      wc('Carbines', ['Hyperline', 'Quantum']),
      wc('Submachine Guns', ['Phasma', 'Rattler', 'Sprinter']),
      wc('Shotguns', ['Blitz', 'Plow', 'Charger']),
      wc('Power Weapons', ['Slipstream', 'Fubar', 'Deadbolt', 'Borealis', 'Gravitas']),
      wc('Sidearms', ['Pistol']),
      wc('Melee', ['BFB']),
    ],
    maps: [
      'Abyss', 'Atlantis', 'Epicenter', 'Forgone Destruction', 'Highwind',
      'Karman Station', 'Outpost', 'Pantheon', 'Staging Area', 'Helix',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Quake Champions ──────────────────────────────────────────────────────────
  // Source: quakechampions.fandom.com/wiki/Weapons, quake.bethesda.net
  // Researched: June 2026
  // Count: 8 weapons (starting + pickup)
  quakechamps: {
    weapons: [
      wc('Starting Weapons', ['Gauntlet', 'Machinegun', 'Shotgun', 'Nailgun']),
      wc('Pickup Weapons', ['Heavy Machinegun', 'Super Shotgun', 'Super Nailgun', 'Rocket Launcher', 'Lightning Gun', 'Railgun', 'Tribolt']),
    ],
    maps: [
      'Awoken', 'Blood Run', 'Corrupted Keep', 'The Crucible', 'The Dark Zone',
      'Exile', 'Final Destination', 'Insomnia', 'The Molten Falls',
      'Ruins of Sarnath', 'Sanctuary', 'Vale of Pnath', 'Tempest Shrine',
      'Bridge of Gods', 'Underground', 'Drowned Temple', 'Grindstone',
      'Burial Chamber', 'Ragnarok',
    ],
    roles: [
      { value: 'strafer',   label: 'Strafer',         subtitle: 'Dodge-heavy, explosive weapons' },
      { value: 'railist',   label: 'Railist',         subtitle: 'Rail gun precision' },
      { value: 'rocket',    label: 'Rocket Jumper',   subtitle: 'Uses rockets for mobility' },
      { value: 'lgist',     label: 'LG Specialist',   subtitle: 'Beam weapon control' },
      { value: 'duelist',   label: 'Duelist',         subtitle: 'One-on-one dominant' },
      { value: 'item',      label: 'Item Controller', subtitle: 'Controls armour and mega' },
    ],
  },

  // ── Team Fortress 2 ──────────────────────────────────────────────────────────
  tf2: {
    weapons: [
      wc('Scout', ['Scattergun', 'Force-A-Nature', 'Soda Popper', "Baby Face's Blaster"]),
      wc('Soldier', ['Rocket Launcher', 'Direct Hit', 'Liberty Launcher', "Cow Mangler 5000"]),
      wc('Pyro', ['Flamethrower', 'Backburner', 'Degreaser', "Dragon's Fury"]),
      wc('Demoman', ['Grenade Launcher', "Loch-N-Load", 'Iron Bomber', 'Stickybomb Launcher']),
      wc('Heavy', ['Minigun', 'Tomislav', 'Brass Beast', 'Huo-Long Heater']),
      wc('Engineer', ['Shotgun', 'Frontier Justice', 'Widowmaker']),
      wc('Medic', ['Syringe Gun', 'Blutsauger', "Crusader's Crossbow"]),
      wc('Sniper', ['Sniper Rifle', 'Huntsman', 'Machina', 'Sydney Sleeper']),
      wc('Spy', ['Revolver', 'Ambassador', "L'Etranger"]),
    ],
    maps: [
      '2Fort', 'Dustbowl', 'Badlands', 'Well (CTF)', 'Badwater Basin',
      'Upward', 'Goldrush', 'Hoodoo', 'Granary', 'Process',
      'Thunder Mountain', 'Gorge', 'Steel', 'Foundry', 'Snowycoast',
      'Borneo', 'Swiftwater', 'Powerhouse',
    ],
    roles: [
      { value: 'scout',    label: 'Scout',    subtitle: 'Fast, flanks, captures' },
      { value: 'soldier',  label: 'Soldier',  subtitle: 'Versatile rocket spam' },
      { value: 'pyro',     label: 'Pyro',     subtitle: 'Spy-checks and ambushes' },
      { value: 'demo',     label: 'Demoman',  subtitle: 'Sticky and grenade control' },
      { value: 'heavy',    label: 'Heavy',    subtitle: 'Tank and suppressor' },
      { value: 'engineer', label: 'Engineer', subtitle: 'Builds, defends, nests' },
      { value: 'medic',    label: 'Medic',    subtitle: 'Heals and uber pushes' },
      { value: 'sniper',   label: 'Sniper',   subtitle: 'Long-range picks' },
      { value: 'spy',      label: 'Spy',      subtitle: 'Stealth, sabotage, backstabs' },
    ],
  },

  // ── Halo Infinite ────────────────────────────────────────────────────────────
  // Source: diamondlobby.com/halo/infinite/halo-infinite-weapons-a-guide-to-all-weapons/
  // Researched: June 2026
  // Count: 28 weapons
  haloinfinite: {
    weapons: [
      wc('UNSC', ['MA40 Assault Rifle', 'VK78 Commando', 'BR75 Battle Rifle', 'M392 Bandit', 'MA5K Avenger', 'Mk50 Sidekick', 'S7 Sniper', 'CQS48 Bulldog', 'Hydra MLRS', 'M41 SPNKR', 'M247 HMG']),
      wc('Banished', ['Pulse Carbine', 'Plasma Pistol', 'Ravager', 'Mangler', 'Needler', 'Cindershot', 'Skewer', 'Heatwave', 'Shock Rifle', 'Disruptor']),
      wc('Power Weapons', ['Energy Sword', 'Gravity Hammer', 'Stalker Rifle', 'Volatile Skewer']),
      wc('Grenades', ['M9 Frag Grenade', 'Plasma Grenade', 'Spike Grenade']),
    ],
    maps: [
      'Aquarius', 'Bazaar', 'Behemoth', 'Catalyst', 'Fragmentation', 'Highpower',
      'Live Fire', 'Recharge', 'Streets', 'Breaker', 'Empyrean', 'Forest',
      'Prism', 'Scarr', 'Solitude', 'Detachment', 'Argyle', 'Cliffhanger',
      'Oasis', 'Chasm',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Battlefield 2042 ─────────────────────────────────────────────────────────
  bf2042: {
    weapons: [
      wc('Assault Rifles', ['M5A3', 'AK-24', 'SFAR-M GL', 'BSV-M']),
      wc('Battle Rifles', ['GVT 45-70', 'SVK']),
      wc('Marksman Rifles', ['DM7']),
      wc('Sniper Rifles', ['DXR-1', 'NTW-50', 'BFP.50', 'SWS-10']),
      wc('Submachine Guns', ['PP-29', 'MP28', 'AC9', 'VCAR', 'K30', 'PBX-45']),
      wc('Light Machine Guns', ['PKP-BP', 'Avancys', 'LCMG']),
      wc('Shotguns', ['MCS-880']),
      wc('Pistols', ['G57']),
    ],
    maps: [
      'Kaleidoscope', 'Orbital', 'Discarded', 'Manifest', 'Renewal', 'Breakaway',
      'Hourglass', 'Exposure', 'Spearhead', 'Redacted', 'Flashpoint',
      'Stranded', 'Haven', 'Reclaimed',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Battlefield V ────────────────────────────────────────────────────────────
  bfv: {
    weapons: [
      wc('Assault', ['STG 44', 'MP40', 'Sten Mk II', 'Thompson M1928', 'PPSh-41', 'Suomi KP/-31', 'ZK-383', 'Type 2A']),
      wc('Medic', ['M1897 Trench Gun', 'Model 37', 'MP34', 'Moschetto M91']),
      wc('Support', ['Bren Gun', 'M1918 BAR', 'Lewis Gun', 'KE7', 'Madsen MG', 'Type 99 LMG']),
      wc('Recon', ['Karabiner 98k', 'M1903 Springfield', 'SMLE Mk III', 'Lee-Enfield No.4', 'Mosin-Nagant', 'G43', 'Gewehr 43', 'Ross Rifle']),
    ],
    maps: [
      'Twisted Steel', 'Rotterdam', 'Arras', 'Hamada', 'Devastation',
      'Panzerstorm', 'Mercury', 'Provence', 'Marita', 'Al Sundan',
      'Operation Underground', 'Halvøy', 'Iwo Jima', 'Pacific Storm', 'Wake Island',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Enlisted ─────────────────────────────────────────────────────────────────
  enlisted: {
    weapons: [
      wc('USA', ['Thompson M1928A1', 'M1 Garand', 'M1A1 Carbine', 'Springfield 1903', 'BAR M1918', 'M1919A4 LMG', 'Bazooka M1A1', 'M3 Grease Gun', 'Winchester M12']),
      wc('Germany', ['MP40', 'StG 44', 'Kar98k', 'Gewehr 41', 'MG42', 'MG34', 'FG42', 'Panzerfaust']),
      wc('USSR', ['PPSh-41', 'PPS-43', 'Mosin Nagant', 'SVT-40', 'DP-27', 'PTRS-41', 'PPD-40']),
      wc('Japan', ['Type 99 LMG', 'Type 38 Arisaka', 'Type 100 SMG']),
    ],
    maps: [
      'Normandy', 'Moscow', 'Berlin', 'Tunisia', 'Stalingrad',
      'Pacific', 'Ardennes', 'Rzhev',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Rogue Company ────────────────────────────────────────────────────────────
  // Source: roguecompany.fandom.com/wiki/Weapons, attackofthefanboy.com
  // Researched: June 2026
  // Count: 14 weapons
  roguecompany: {
    weapons: [
      wc('Assault Rifles', ['Sahara', 'MLX Mark 4', 'Hydra', 'KA30']),
      wc('Submachine Guns', ['LMP-X', 'Objection', 'SL-C', 'Knight', 'HRM-30KS', 'Spitfire']),
      wc('Shotguns', ['Arbitrator', 'Striker']),
      wc('Light Machine Guns', ['MLX Maw']),
      wc('Sniper Rifles', ['LR15', 'Mamba']),
      wc('Marksman Rifles', ['Arren']),
      wc('Pistols', ['LW6 Revolver', 'Principle']),
    ],
    maps: ['Canopy', 'Desertion', 'Favelas', 'District', 'Skyfell', 'Windfall'],
    roles: [...GENERIC_ROLES],
  },

  // ── Diabotical ───────────────────────────────────────────────────────────────
  // Source: diabotical.fandom.com/wiki/Weapons, gamepur.com
  // Researched: June 2026
  // Count: 9 weapons
  diabotical: {
    weapons: [
      wc('Starting Weapons', ['Melee Weapon', 'Machine Gun', 'Super Shotgun']),
      wc('Pickup Weapons', ['Rocket Launcher', 'Shaft', "PNCR (Point'n'Click Rifle)", 'Plasma Blaster', 'Crossbow', 'Void Cannon']),
    ],
    maps: ['Aerowalk', 'Bloodrun', 'Courtyard', 'Event Horizon', 'Furious Heights', 'Warfare'],
    roles: [...GENERIC_ROLES],
  },

  // ── FragPunk ─────────────────────────────────────────────────────────────────
  // Source: sportskeeda.com/esports/all-weapons-fragpunk, dotgg.gg/fragpunk-weapon-tier-list
  // Researched: June 2026
  // Count: 21 weapons
  fragpunk: {
    weapons: [
      wc('Assault Rifles', ['Fever', 'Discipline']),
      wc('Submachine Guns', ['Mad Dog-S', 'Clampdown']),
      wc('Shotguns', ['Meat Maker', 'Boom Broom']),
      wc('Sniper Rifles', ['Resolver', 'Highlife']),
      wc('Marksman Rifles', ['Bad Moon-S', 'Bad Reputation']),
      wc('Light Machine Guns', ['My Way', 'Ghost Pepper']),
      wc('Pistols', ['Cure-All', 'Vicious', 'Cold Shoulder']),
      wc('Utility', ['Blaster', 'Flasher', 'Smoker', 'Burner']),
      wc('Melee', ['Blitzer', 'Standard Striker']),
    ],
    maps: ['Neon District', 'Rust', 'Storm', 'Deadzone', 'Lobby'],
    roles: [...GENERIC_ROLES],
  },

  // ── BattleBit Remastered ─────────────────────────────────────────────────────
  // Source: gameinfinitus.com/guides/battlebit-remastered-list-of-all-the-weapons/
  // Researched: June 2026
  // Count: 44 weapons
  battlebit: {
    weapons: [
      wc('Assault Rifles', ['AK74', 'M4A1', 'AK15', 'SCAR-H', 'AUG A3', 'SG550', 'FAMAS', 'ACR', 'G36C', 'HK419', 'FAL', 'AK5C']),
      wc('Marksman Rifles', ['MK20', 'M110', 'MK14 EBR', 'SVD']),
      wc('Submachine Guns', ['MP7', 'UMP-45', 'PP2000', 'PP19', 'KRISS VECTOR', 'MP5']),
      wc('PDWs & Carbines', ['HONEY BADGER', 'GROZA', 'P90', 'AS VAL', 'SCORPION EVO']),
      wc('Light Machine Guns', ['MG36', 'L86A1', 'M249', 'ULTIMAX 100']),
      wc('Sniper Rifles', ['SSG 69', 'SV-98', 'L96', 'REM700', 'M200', 'MSR']),
      wc('Pistols', ['M9', 'MP 443', 'USP', 'GLOCK 18', 'UNICA', 'DESERT EAGLE', 'RSH12']),
    ],
    maps: [
      'Azagor', 'Basra', 'Construction', 'Dustydew', 'Eduardovo', 'Frugis',
      'Hans', 'Isle', 'Multuislands', 'Namak', 'Outskirts', 'Parajaru',
      'River', 'Salhan', 'Sandstorm', 'Valley', 'Wakistan', 'Wineparade',
      'Tensatown', 'Lonovo', 'Old Wolterdijk', 'Karlin',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Prodeus ──────────────────────────────────────────────────────────────────
  // Source: prodeus.fandom.com/wiki/Weapons
  // Researched: June 2026
  // Count: 15 weapons
  prodeus: {
    weapons: [
      wc('Ballistic', ['Fists', 'Pistol', 'Shredders', 'Minigun', 'Shotgun', 'Super Shotgun', 'Auto Shotgun']),
      wc('Explosive', ['Rocket Launcher', 'Grenade Launcher', 'Swarmer', 'Mammonth']),
      wc('Energy', ['Plasma Rifle', 'Arc Rail', 'Chaos Caster']),
      wc('Melee', ['Chainsaw Gauntlets']),
    ],
    maps: ['Episode 1 Levels', 'Episode 2 Levels', 'Community Maps', 'Campaign Finale'],
    roles: [...GENERIC_ROLES],
  },

  // ── Turbo Overkill ────────────────────────────────────────────────────────────
  // Source: turbo-overkill.fandom.com/wiki/Weapons, lawod.com
  // Researched: June 2026
  // Count: 12 weapons
  turbooverkill: {
    weapons: [
      wc('Primary Weapons', ['Uzis', 'Waster Shotgun', 'Boomer', 'Rocket Launcher', 'Twincendiary', 'Magnums', 'Telefragger', 'Plasma Rifle', 'Ion Cannon', 'Micro Missile Launcher']),
      wc('Special / Augments', ['Chegg (Chainsaw Leg)', 'Grappling Hook']),
    ],
    maps: ['Act 1 Stages', 'Act 2 Stages', 'Act 3 Stages'],
    roles: [...GENERIC_ROLES],
  },

  // ── Gunfire Reborn ────────────────────────────────────────────────────────────
  // Source: mygamingtutorials.com, gamerant.com/gunfire-reborn-best-weapons/
  // Researched: June 2026
  // Count: 36 named weapons (roguelite — weapons are randomised drops, framed as preferences)
  gunfirereborn: {
    weapons: [
      wc('Rifles', ['Big Hippo', 'Cavalry', 'Crimson Firescale', 'Dragon Chaser', 'Lightning Blast', 'Rainbow Arch']),
      wc('Submachine Guns', ['Angelic Aura', 'Concealed Ammo', 'Demon Lore', 'Dual Fang', 'Skull Pill', 'Star of Aurora']),
      wc('Pistols', ['Aura of Venom', 'Foundry', 'Glimmering', 'Icy Spear', 'Prism', 'Scorching Rounds', 'Thunder', 'Talisman', 'Thunderstorm']),
      wc('Shotguns', ['Argus', 'Hell', 'Illusion', 'Porcupine', 'Pupil', 'Wild Hunt']),
      wc('Sniper Rifles', ['Bloody Drill', 'Double Caliber', 'Golden Bow', 'Strike Wing', 'Woodpecker']),
      wc('Launchers', ['Bone Dragon', 'Deafening Mortar', 'Justice', 'Tiger Cannon']),
    ],
    maps: [
      'Longling Tomb', 'Anxi Desert', 'Snowline Castle', 'Duo Dhaka', 'Crying Volcano', 'Black Mist Ruins',
    ],
    roles: [
      { value: 'crown',  label: 'Crown Prince',  subtitle: 'Explosive and elemental specialist' },
      { value: 'lazy',   label: 'Lazy Drunk',     subtitle: 'Melee and shields focus' },
      { value: 'aobai',  label: 'Ao Bai',         subtitle: 'Dual-wield berserk' },
      { value: 'qingyan','label': 'Qing Yan',     subtitle: 'Blade and scroll combo' },
      { value: 'leiluo', 'label': 'Lei Luo',      subtitle: 'Thunder and precision sniper' },
      { value: 'tao',    label: 'Tao',            subtitle: 'Status and AoE' },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // FPS
  // ──────────────────────────────────────────────────────────────────────────

  // ── Call of Duty: Modern Warfare III ─────────────────────────────────────────
  // Source: callofduty.com/mw3/weapons (official CoD weapon list)
  // Researched: June 2026
  // Count: 32 weapons at launch
  mw3: {
    weapons: [
      wc('Assault Rifles', ['MCW', 'Holger 556', 'MTZ-556', 'DG-58', 'FR 5.56', 'RAPP H', 'RAM-7', 'SVA 545']),
      wc('Submachine Guns', ['Rival-9', 'WSP Swarm', 'Striker', 'ISO 9mm', 'Lachmann Sub', 'Striker 9']),
      wc('Battle Rifles', ['Sidewinder', 'Tempus Razorback', 'SOA Subverter']),
      wc('Light Machine Guns', ['Pulemyot 762', 'RAAL MG', 'HCR 56', 'DG-58 LSW']),
      wc('Sniper Rifles', ['KATT-AMR', 'MORS', 'Longbow']),
      wc('Marksman Rifles', ['DM56', 'MTZ Interceptor', 'Lachmann-762']),
      wc('Shotguns', ['Lockwood 680', 'Haymaker', 'MX Guardian']),
    ],
    maps: [
      // MW3 2023 includes classic MW2 maps and new ones
      'Das Haus', 'Highrise', 'Karachi', 'Meat', 'Rio', 'Rust', 'Stash House',
      'Estate', 'Derail', 'Afghan', 'Sub Base', 'Wasteland', 'Terminal', 'Favela',
      'Quarry', 'Scrapyard', 'Underpass', 'Invasion', 'Popov Power', 'Orlov Military Base',
      'Hacienda',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Call of Duty: Warzone ─────────────────────────────────────────────────────
  // Source: wzstats.gg, tracker.gg/warzone — Season 29 (2026) floor loot
  // Researched: June 2026
  // Count: 40+ weapons (meta floor loot — Warzone has 255 total, listing key ones)
  'wz-fps': {
    weapons: [
      wc('Assault Rifles', ['XM4', 'Model L', 'AMES 85', 'GPR 91', 'AK-74', 'Goblin Mk2', 'AS VAL', 'MCW', 'Holger 556', 'MTZ-556', 'SVA 545', 'RAM-7']),
      wc('Submachine Guns', ['Fennec 45', 'Vaznev-9K', 'Lachmann Sub', 'WSP Swarm', 'Rival-9', 'KSV', 'Jackal PDW', 'PP-919 Estoc', 'Tanto .22', 'C9']),
      wc('Light Machine Guns', ['RPK', 'RAAL MG', 'Pulemyot 762', 'GPMG-7']),
      wc('Sniper Rifles', ['MCPR-300', 'Signal 50', 'Victus XMR', 'LA-B 330', 'KATT-AMR', 'LW3A1 Frostline']),
      wc('Marksman Rifles', ['MTZ Interceptor', 'DM56']),
      wc('Shotguns', ['Expedite 12', 'Lockwood 680', 'Marine SP']),
      wc('Pistols', ['GS45', '.44 Harbinger']),
    ],
    maps: ['Urzikstan', 'Al Mazrah', 'Ashika Island', 'Rebirth Island', 'Vondel'],
    roles: [...GENERIC_ROLES],
  },

  // ── Call of Duty: Black Ops 6 ─────────────────────────────────────────────────
  // Source: game8.co/games/Call-of-Duty-Black-Ops-6, videogamer.com/guides/black-ops-6-weapon-list/
  // Researched: June 2026
  // Count: 39 weapons (launch + Season 1)
  bo6: {
    weapons: [
      wc('Assault Rifles', ['XM4', 'AK-74', 'AMES 85', 'GPR 91', 'Model L', 'Goblin Mk2', 'AS VAL', 'Tsarkov 7.62']),
      wc('Submachine Guns', ['C9', 'Tanto .22', 'Jackal PDW', 'KSV', 'PP-919 Estoc', 'Kompakt 92']),
      wc('Light Machine Guns', ['PU-21', 'GPMG-7']),
      wc('Sniper Rifles', ['LW3A1 Frostline', 'SVD', 'LR 7.62']),
      wc('Marksman Rifles', ['AEK-973']),
      wc('Shotguns', ['Marine SP', 'ASG-89', 'Haymaker']),
      wc('Pistols', ['Stryder .22', '9mm PM', 'GS45', '.44 Harbinger']),
      wc('Launchers', ['CIGMA 2B', 'HE-1']),
      wc('Melee', ['Baseball Bat']),
    ],
    maps: [
      'Babylon', 'Derelict', 'Gala', 'Hideout', 'Kaz Island', 'Lowtown',
      'Nuketown', 'Protocol', 'Red Card', 'Rewind', 'Scud', 'Subsurface',
      'Vault', 'Vista', 'Warhead', 'Payback',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Destiny 2 ────────────────────────────────────────────────────────────────
  destiny2: {
    weapons: [
      wc('Primary', ['Auto Rifle', 'Pulse Rifle', 'Scout Rifle', 'Hand Cannon', 'Submachine Gun', 'Sidearm', 'Bow']),
      wc('Special', ['Shotgun', 'Fusion Rifle', 'Sniper Rifle', 'Grenade Launcher', 'Glaive', 'Trace Rifle']),
      wc('Heavy', ['Rocket Launcher', 'Machine Gun', 'Sword', 'Linear Fusion Rifle']),
      wc('Exotic Highlights', ['Ace of Spades', 'Gjallarhorn', 'Vex Mythoclast', 'Thorn', 'Osteo Striga', "Izanagi's Burden", 'MIDA Multi-Tool', 'Crimson']),
    ],
    maps: [
      'Cosmodrome', 'Moon', 'The Dreaming City', 'Europa', 'Nessus',
      "Savathûn's Throne World", 'Neomuna', 'The Pale Heart',
      'Vault of Glass (Raid)', 'Last Wish (Raid)', 'King\'s Fall (Raid)',
      'Root of Nightmares (Raid)', 'Crota\'s End (Raid)',
    ],
    roles: [
      { value: 'dps',     label: 'DPS Specialist',     subtitle: 'Maximises damage in boss phases' },
      { value: 'support', label: 'Support / Supers',   subtitle: 'Well, Ward, buffs for team' },
      { value: 'add',     label: 'Add Clear',          subtitle: 'Manages minor enemies' },
      { value: 'flex',    label: 'Flex',               subtitle: 'Adapts to encounter needs' },
      { value: 'pvp',     label: 'Crucible Hunter',    subtitle: 'PvP-first playstyle' },
    ],
  },

  // ── Far Cry 6 ────────────────────────────────────────────────────────────────
  farcry6: {
    weapons: [
      wc('Rifles', ['AK-47', 'Supercharger (Unique AR)']),
      wc('Sniper Rifles', ['SSGP-9 (Remington 700 based)', 'Volta (Unique Sniper)']),
      wc('Light Machine Guns', ['MG42', 'Pyrotechno (Unique LMG)']),
      wc('Submachine Guns', ['MP5']),
      wc('Shotguns', ['El Muro (Unique Shotgun)']),
      wc('Pistols', ['USP', 'Autocrat (Full-Auto Pistol)']),
      wc('Special / Exotic', ['La Varita (Unique)', 'RAT4 RPG']),
    ],
    maps: ['El Este', 'Madrugada', 'Valle de Oro', 'Esperanza', 'Isla Santuario'],
    roles: [...GENERIC_ROLES],
  },

  // ── Borderlands 3 ────────────────────────────────────────────────────────────
  bl3: {
    weapons: [
      wc('Manufacturers', ['Atlas (Smart Bullets)', 'COV (Never Reload)', 'DAHL (Burst Fire)', 'Hyperion (Accuracy on Fire)', 'Jakobs (Revolver Ricochets)', 'Maliwan (Elemental)', 'Tediore (Thrown Reload)', 'Torgue (Gyrojet/Explosive)', 'Vladof (High Fire Rate)']),
      wc('Weapon Types', ['AR', 'Pistol', 'SMG', 'Shotgun', 'Sniper', 'Heavy / Rocket Launcher']),
    ],
    maps: [
      'Pandora', 'Promethea', 'Athenas', 'Eden-6', 'Sanctuary III',
      'Maliwan Blacksite (Takedown)', 'Minos Prime (Takedown)',
    ],
    roles: [
      { value: 'fl4k',   label: 'FL4K — Beastmaster',  subtitle: 'Pet builds, critical hits' },
      { value: 'moze',   label: 'Moze — Gunner',        subtitle: 'Iron Bear mech, splash damage' },
      { value: 'amara',  label: 'Amara — Siren',        subtitle: 'Melee / action skill builds' },
      { value: 'zane',   label: 'Zane — Operative',     subtitle: 'Cryo, clone and digi-clone' },
    ],
  },

  // ── Tiny Tina's Wonderlands ──────────────────────────────────────────────────
  ttw: {
    weapons: [
      wc('Manufacturers', ['Feriore (Thrown Reload)', 'Dahlia (Full Auto)', 'Torgue (Explosive)', 'Skuldugger (High Crit)', 'Hyperius (Accuracy on Fire)', 'Jakobs (Ricochets)', 'Vladof (Fire Rate)', 'Maliwan (Elemental)']),
      wc('Weapon Types', ['AR', 'Pistol', 'SMG', 'Shotgun', 'Sniper', 'Melee Weapon', 'Spell', 'Heavy']),
    ],
    maps: [
      'Brighthoof', 'Crackmast Cove', 'Mount Craw', 'Weepwild Dankness',
      'Tangledrift', 'Sunfang Oasis', "Karnok's Wall", "Ossu-Gol Necropolis",
    ],
    roles: [
      { value: 'brr',       label: 'Brr-Zerker',        subtitle: 'Frost melee berserk' },
      { value: 'clawbringer', label: 'Clawbringer',     subtitle: 'Thunder and fire companion' },
      { value: 'graveborn', label: 'Graveborn',         subtitle: 'Dark magic and sacrifice' },
      { value: 'spellshot', label: 'Spellshot',         subtitle: 'Magic and spell spam' },
      { value: 'spore',     label: 'Sporewarden',       subtitle: 'Nature and mushroom companion' },
      { value: 'stabbomancer', label: 'Stabbomancer',  subtitle: 'Crit, stealth, melee' },
    ],
  },

  // ── Doom Eternal ─────────────────────────────────────────────────────────────
  'doom-eternal': {
    weapons: [
      wc('Shotguns', ['Combat Shotgun', 'Super Shotgun (with Meathook)']),
      wc('Heavy Weapons', ['Heavy Cannon', 'Rocket Launcher', 'Ballista', 'Chaingun']),
      wc('Energy Weapons', ['Plasma Rifle', 'BFG 9000']),
      wc('Melee', ['Crucible (Melee)', 'Doomblade (Secondary Melee)']),
      wc('Equipment', ['Ice Bomb (Equipment)', 'Frag Grenade (Equipment)', 'Flame Belch (Equipment)']),
    ],
    maps: [
      // Campaign levels
      'UAC Atlantica Facility', 'Exultia', 'Cultist Base', 'Doom Hunter Base',
      'Super Gore Nest', 'ARC Complex', 'Mars Core', 'Sentinel Prime',
      'Taras Nabad', 'Nekravol Pt.1', 'Nekravol Pt.2', 'Urdak', 'Final Sin',
      // Battlemode arenas
      'Empyrean', 'Reclaimed Earth', 'Devastation', 'Cauldron', 'Corruption',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Deep Rock Galactic ────────────────────────────────────────────────────────
  drg: {
    weapons: [
      wc('Scout', ['DRAK-25 Plasma Carbine', 'Deepcore GK2 (AR)', 'Jury-Rigged Boomstick (Shotgun)', 'Zhukov NUK17 (Dual SMGs)', 'M1000 Classic (Semi-Auto Rifle)', 'Nishanka Boltshark X-80 (Crossbow)']),
      wc('Driller', ['CRSPR Flamethrower', 'Experimental Plasma Charger', 'Cryo Cannon', 'Subata 120 (Pistol)', 'Armskore Coil Gun', 'Shard Diffractor']),
      wc('Gunner', ['"Lead Storm" Powered Minigun', 'Thunderhead Heavy Autocannon', 'Hurricane Guided Rocket System', 'BRT7 Burst Fire Gun', 'Bulldog Heavy Revolver']),
      wc('Engineer', ['"Warthog" Auto 210 Shotgun', 'Stubby Voltaic SMG', 'LOK-1 Smart Rifle', 'Deepcore 40mm PGL']),
    ],
    maps: [
      'Crystalline Caverns', 'Salt Pits', 'Fungus Bogs', 'Radioactive Exclusion Zone',
      'Dense Biozone', 'Glacial Strata', 'Azure Weald', 'Hollow Bough',
      'Sandblasted Corridors', 'Magma Core',
    ],
    roles: [
      { value: 'scout',    label: 'Scout',    subtitle: 'Mobility, speed, resupply' },
      { value: 'driller',  label: 'Driller',  subtitle: 'Path-making and flamethrower' },
      { value: 'gunner',   label: 'Gunner',   subtitle: 'Heavy suppression and shield' },
      { value: 'engineer', label: 'Engineer', subtitle: 'Platforms, turrets, grenades' },
    ],
  },

  // ── Payday 3 ─────────────────────────────────────────────────────────────────
  // Source: payday.fandom.com/wiki/Weapons_(Payday_3)/List_of_Weapons
  // Researched: June 2026
  // Count: 36 weapons (base + DLC)
  payday3: {
    weapons: [
      wc('Assault Rifles', ['CAR-4', 'SA A144', 'VF-7S', 'Ziv Commando', 'KU-59', 'ATK-7', 'WAR-45', 'Skogskrigare AG-9']),
      wc('Battle Rifles', ["Lion's Roar"]),
      wc('Submachine Guns', ['FIK PC9', 'Signature 403', 'SG Compact 7', 'Sforza Bison', 'FIK-22 TLR', 'Picchio Duro 5']),
      wc('Shotguns', ['Reinfeld 880', 'Mosconi 12G', 'SP Model 11', 'IZHMA 12G', 'Adelig RG5', 'FSA-12G', 'TAS-12']),
      wc('Pistols & Revolvers', ['J&M Castigo 44', 'Northwest B-9', 'Stryk 7']),
      wc('Sniper Rifles', ['Reinfeld 900S', 'HET-5 Red Fox']),
      wc('Light Machine Guns', ['Brenner-21']),
      wc('Special', ['Shanghai 5/56', 'OVE9000', 'Marcom Mamba MGL', 'Justicar', 'Spearfish 1895']),
    ],
    maps: [
      'No Rest for the Wicked', 'Road Rage', 'Rock the Cradle',
      'Under the Surphaze', '99 Boxes', 'Touch the Sky', 'Dirty Ice',
      'Gold & Sharke', 'Boys in Blue', 'Syntax Error', 'Fear & Greed',
      'The Murky Station', 'Cook Off', 'Border Crossing',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Back 4 Blood ──────────────────────────────────────────────────────────────
  b4b: {
    weapons: [
      wc('Assault Rifles', ['AK-47', 'M4 Carbine', 'M16', 'M1A (Semi-Auto Rifle)']),
      wc('Submachine Guns', ['UZI', 'Vector SMG']),
      wc('Shotguns', ['AA-12 (Auto Shotgun)', 'SG121 Shotgun']),
      wc('Sniper Rifles', ['Phoenix 350L (Sniper)']),
      wc('Light Machine Guns', ['RPK (LMG)']),
      wc('Pistols', ['Glock 23 (Pistol)', 'Magnum (Pistol)']),
      wc('Secondary', ['Grenade Launcher (Secondary)']),
    ],
    maps: [
      'Act 1 — The Devil\'s Return', 'Act 2 — Tunnel of Blood',
      'Act 3 — Hell or High Water', 'Act 4 — The Nightmare Begins',
      'DLC — Children of the Worm', 'DLC — Annual Pass Content',
    ],
    roles: [
      { value: 'walker',   label: 'Walker',   subtitle: 'All-round soldier' },
      { value: 'doc',      label: 'Doc',      subtitle: 'Team healer' },
      { value: 'karlee',   label: 'Karlee',   subtitle: 'Speed and hazard awareness' },
      { value: 'evangelo', label: 'Evangelo', subtitle: 'Mobility and teamwork' },
      { value: 'holly',    label: 'Holly',    subtitle: 'Stamina and inspiration' },
      { value: 'jim',      label: 'Jim',      subtitle: 'Sniper and headshots' },
      { value: 'mom',      label: 'Mom',      subtitle: 'Support and item management' },
      { value: 'hoffman',  label: 'Hoffman',  subtitle: 'Ammo and explosives' },
    ],
  },

  // ── Vermintide 2 ─────────────────────────────────────────────────────────────
  vt2: {
    weapons: [
      wc('Melee', ['Greataxe', 'Two-Handed Sword', 'Halberd', 'Executioner Sword', 'Rapier', 'Flail', 'Sword and Shield', 'Spear', 'Mace', 'Dual Daggers', 'Crowbill', 'Fire Sword', 'Flaming Flail']),
      wc('Ranged', ['Handgun', 'Blunderbuss', 'Repeater Crossbow', 'Longbow', 'Volleybow', 'Swiftbow', 'Hagbane Shortbow', 'Drakefire Pistols', 'Grudge-Raker', 'Drakegun']),
      wc('Staves (Sienna)', ['Beam Staff', 'Bolt Staff', 'Conflagration Staff', 'Flamestorm Staff', 'Coruscation Staff']),
    ],
    maps: [
      'Righteous Stand', 'The Screaming Bell', 'Convocation of Decay', 'Festering Ground',
      'Hunger in the Dark', 'Halescourge', 'Skittergate', 'Against the Grain',
      'Empire in Flames', 'The War Camp', 'Into the Nest', 'The Blightreaper',
      'The Citadel of Eternity', 'Garden of Morr', 'The Enchanter\'s Lair',
      'Athel Yenlui', 'Horn of Magnus', 'All Alone in the Dark', 'Dark Omens',
    ],
    roles: [
      { value: 'kruber',   label: 'Markus Kruber',    subtitle: 'Mercenary / Footknight / Huntsman' },
      { value: 'bardin',   label: 'Bardin Goreksson', subtitle: 'Ironbreaker / Slayer / Engineer' },
      { value: 'kerillian',label: 'Kerillian',        subtitle: 'Waystalker / Handmaiden / Shade' },
      { value: 'saltzpyre',label: 'Victor Saltzpyre', subtitle: 'WHC / Zealot / Bounty Hunter' },
      { value: 'sienna',   label: 'Sienna Fuegonasus',subtitle: 'Battle Wizard / Pyromancer / Unchained' },
    ],
  },

  // ── Helldivers 2 ─────────────────────────────────────────────────────────────
  hd2: {
    weapons: [
      wc('Assault Rifles', ['AR-23 Liberator', 'AR-23C Liberator Concussive', 'AR-23P Liberator Penetrator', 'StA-52 Assault Rifle']),
      wc('Shotguns', ['SG-225 Breaker', 'SG-225SP Breaker Spray & Pray', 'SG-225IE Breaker Incendiary', 'SG-8 Punisher', 'SG-8P Punisher Plasma', 'SG-8S Slugger', 'SG-451 Cookout']),
      wc('Marksman Rifles', ['R-63 Diligence', 'R-63CS Diligence Counter Sniper', 'APW-1 Anti-Materiel Rifle']),
      wc('Energy Weapons', ['PLAS-1 Scorcher', 'LAS-16 Sickle', 'LAS-5 Scythe', 'PLAS-101 Purifier']),
      wc('Submachine Guns', ['StA-11 SMG']),
      wc('Special', ['CB-9 Exploding Crossbow', 'JAR-5 Dominator', 'R-36 Eruptor', 'MG-43 Machine Gun']),
    ],
    maps: [
      // Active planets by faction theater (rotates with galactic war)
      'Malevelon Creek', 'Troost', 'Draupnir', 'Erata Prime', 'Veld',
      'Meridia', 'Tibit', 'Ubanea', 'Menkent', 'Vandalon IV', 'Choohe',
    ],
    roles: [
      { value: 'anti-armor',  label: 'Anti-Armor',     subtitle: 'Handles tanks and Chargers' },
      { value: 'support',     label: 'Support',        subtitle: 'Resupply, eagle calls, utility' },
      { value: 'aoe',         label: 'AoE Clearer',    subtitle: 'Orbital and area stratagems' },
      { value: 'eagle',       label: 'Eagle Caller',   subtitle: 'Eagle Airstrike specialist' },
      { value: 'all-in',      label: 'All-In',         subtitle: 'Maximum firepower always' },
      { value: 'flex',        label: 'Flex',           subtitle: 'Adapts to mission needs' },
    ],
  },

  // ── Remnant II ────────────────────────────────────────────────────────────────
  remnant2: {
    weapons: [
      wc('Long Guns', ['Nightfall', 'Meridian', 'Savior', 'Ruin', 'Chicago Typewriter', 'Merciless', 'Widowmaker', 'Bonesaw', 'Corrupted Sorrow', 'Aphelion']),
      wc('Hand Guns', ['Deceit', 'Clairvoyance', 'Cube Gun', 'Plasma Cutter']),
      wc('Melee', ['Red Doe Staff', 'Abyssal Hook', 'Stonebreaker']),
      wc('Bows & Crossbows', ['Royal Hunting Bow', 'Sagittarius', 'Twisted Arbalest']),
    ],
    maps: ['Yaesha', "N'Erud", 'Losomn', 'The Labyrinth', 'Root Earth'],
    roles: [
      { value: 'handler',   label: 'Handler',    subtitle: 'Dog companion, team utility' },
      { value: 'hunter',    label: 'Hunter',     subtitle: 'Ranged precision, scopes' },
      { value: 'medic',     label: 'Medic',      subtitle: 'Team healer and revives' },
      { value: 'challenger',label: 'Challenger', subtitle: 'Tanky brawler' },
      { value: 'gunslinger','label': 'Gunslinger',subtitle: 'Fast reload, gun specialist' },
      { value: 'summoner',  label: 'Summoner',   subtitle: 'Minion builds' },
      { value: 'engineer',  label: 'Engineer',   subtitle: 'Turret specialist' },
      { value: 'invader',   label: 'Invader',    subtitle: 'Dodge and decoy builds' },
    ],
  },

  // ── Insurgency: Sandstorm ─────────────────────────────────────────────────────
  insurgency: {
    weapons: [
      wc('Security Forces', ['M4A1', 'M16A4', 'M4A1 Block II', 'L85A2', 'G36K', 'Alpha AK', 'AUG A1', 'Mk 14 EBR', 'M110 SASS', 'M24', 'M870', 'M1014', 'MP7', 'M45A1 Pistol']),
      wc('Insurgent Forces', ['AKM', 'AK-74', 'RPK', 'PKM', 'SKS', 'Mosin-Nagant', 'SVD', 'Tabuk', 'ASVK', 'QBZ-03', 'Sterling SMG', 'M3 Grease Gun']),
    ],
    maps: [
      'Tell', 'Ministry', 'Bab', 'Farmhouse', 'Hideout', 'Refinery',
      'Crossing', 'Precinct', 'Summit', 'Outskirts', 'Embassy', 'Power Plant',
      'Tideway', 'Butcher', 'Verticality', 'Valley', 'Sinjar', 'Mamouri',
    ],
    roles: [
      { value: 'rifleman',   label: 'Rifleman',         subtitle: 'General infantry backbone' },
      { value: 'breacher',   label: 'Breacher',         subtitle: 'Close range, shotguns, entry' },
      { value: 'advisor',    label: 'Advisor',          subtitle: 'Calls in fire support and caches' },
      { value: 'observer',   label: 'Observer',         subtitle: 'Assists Commander, marks targets' },
      { value: 'gunner',     label: 'Gunner',           subtitle: 'LMG suppression' },
      { value: 'sniper',     label: 'Marksman',         subtitle: 'Overwatch and priority picks' },
    ],
  },

  // ── Ground Branch ─────────────────────────────────────────────────────────────
  groundbranch: {
    weapons: [
      wc('Assault Rifles', ['M4A1', 'M4A1 Block I', 'M4A1 Block II', 'HK416', 'SCAR-L', 'AK-74M', 'AKM', 'AK-103']),
      wc('Marksman Rifles', ['HK417 DMR', 'M110 SASS', 'SCAR-H', 'HK G3', 'M14']),
      wc('Light Machine Guns', ['FN MAG (LMG)', 'M249 Minimi']),
      wc('Submachine Guns', ['MP5', 'MP5K', 'MP5SD', 'UMP-45']),
      wc('Pistols', ['P226 (Pistol)', 'M1911 (Pistol)', 'Glock 17']),
    ],
    maps: [
      'Eviction', 'Garage', 'Embassy', 'Caves', 'Depot',
      'Farm', 'Bridge', 'Suburban', 'Asylum', 'Hospital', 'Island', 'Quarry',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Ready or Not ─────────────────────────────────────────────────────────────
  readyornot: {
    weapons: [
      wc('Assault Rifles', ['COLT M4A1', 'SR-16', 'Colt M16A2', 'HK G36C', 'SL8']),
      wc('Submachine Guns', ['HK UMP .45', 'MP5', 'MP5A4', 'MP5SD6']),
      wc('Shotguns', ['Remington 870', 'M4 Super 90 (Benelli M4)']),
      wc('Pistols', ['Colt 1911', 'Glock 17', 'Glock 19', 'H&K USP']),
      wc('Less-Lethal', ['Beanbag Shotgun (Less-Lethal)', 'Taser (Less-Lethal)', 'Pepper Spray (Less-Lethal)']),
    ],
    maps: [
      'Cherryessa Farm', 'Dealership', 'Fast Food', 'Motel', 'Meth Lab',
      'Hospital (St. Michael\'s)', 'Army Base', 'Penthouse',
      'Brewer Street Apartments', 'Valley of the Dolls', 'Port', 'Cargo Ship',
      'Ridgeline', 'Club', 'Gas Station', 'Storage Unit', 'Country Club',
      'The Donut Store', 'Data Center', 'Twisted Nerve',
    ],
    roles: [
      { value: 'entry',   label: 'Point Man / Entry', subtitle: 'First through the door' },
      { value: 'support', label: 'Support',           subtitle: 'Flashbangs, CS, door cover' },
      { value: 'rear',    label: 'Rear Security',     subtitle: 'Clears rooms, holds exits' },
      { value: 'sniper',  label: 'Overwatch',         subtitle: 'External coverage, threat IDs' },
      { value: 'igl',     label: 'Team Lead',         subtitle: 'Calls stack-ups and clears' },
      { value: 'medic',   label: 'Combat Medic',      subtitle: 'Patches and arrests downed' },
    ],
  },

  // ── Arma Reforger ─────────────────────────────────────────────────────────────
  armareforger: {
    weapons: [
      wc('US Forces', ['M16A1', 'M16A2', 'M60 (LMG)', 'M249 Minimi', 'M1911 A1', 'M21 Sniper', 'M203 Grenade Launcher']),
      wc('Soviet Forces', ['AK-74', 'AK-74SU', 'AKM', 'PKM (LMG)', 'RPG-7', 'Makarov PM', 'SVD Dragunov']),
    ],
    maps: ['Everon', 'Arland'],
    roles: [
      { value: 'rifleman', label: 'Rifleman',     subtitle: 'Core infantry' },
      { value: 'medic',    label: 'Medic',        subtitle: 'Field medicine, revives' },
      { value: 'at',       label: 'AT Gunner',    subtitle: 'Anti-armor RPG/LAW' },
      { value: 'mg',       label: 'Machine Gunner',subtitle: 'Suppression and area denial' },
      { value: 'sniper',   label: 'Sniper / DMR', subtitle: 'Precision overwatch' },
      { value: 'leader',   label: 'Team Leader',  subtitle: 'Tactical coordination' },
    ],
  },

  // ── Squad ──────────────────────────────────────────────────────────────────────
  squad: {
    weapons: [
      wc('US Forces', ['M4A1', 'M249 SAW', 'M203 (Grenade Launcher)', 'M16A4', 'M110 SASS', 'M240B', 'AT4 (Anti-Tank)', 'M72 LAW', 'M2 Browning (vehicle-mounted)']),
      wc('Russian Forces', ['AK-74M', 'RPK-74', 'PKM', 'RPG-7', 'SVD', 'KSVK']),
      wc('British Forces', ['L85A2', 'L86A2', 'L129A1', 'GPMG', 'NLAW']),
      wc('Canada / Australia', ['C7A2', 'C9 (LMG)', 'EF88', 'F89 Minimi']),
    ],
    maps: [
      'Al Basrah', 'Belaya', 'Black Coast', 'Chora', 'Fallujah', "Fool's Road",
      'Goose Bay', 'Gorodok', 'Kamdesh Highlands', 'Kohat Toi Pass', 'Kokan',
      'Lashkar Valley', 'Logar Valley', 'Manic-5', 'Mestia', 'Mutaha',
      'Nanisivik', 'Narva', 'Op First Light', 'Sanxian Islands', 'Skorpo',
      'Sumari Bala', 'Tallil Outskirts', 'Yehorivka', 'Anvil', 'Harju',
    ],
    roles: [
      { value: 'sl',       label: 'Squad Leader',   subtitle: 'Commands, marks, calls FOB' },
      { value: 'rifleman', label: 'Rifleman',        subtitle: 'Core ammo bag infantry' },
      { value: 'medic',    label: 'Medic',           subtitle: 'Revives and heals in field' },
      { value: 'at',       label: 'Anti-Tank',       subtitle: 'Destroys vehicles' },
      { value: 'mg',       label: 'Machine Gunner',  subtitle: 'Suppression fire' },
      { value: 'logi',     label: 'Logi Driver',     subtitle: 'Supplies and construction' },
      { value: 'sniper',   label: 'Marksman',        subtitle: 'Long-range picks' },
      { value: 'crewman',  label: 'Crewman',         subtitle: 'Vehicle operator' },
      { value: 'pilot',    label: 'Pilot / HAB',     subtitle: 'Helicopter or FOB builder' },
    ],
  },

  // ── Post Scriptum ─────────────────────────────────────────────────────────────
  postscriptum: {
    weapons: [
      wc('British', ['Sten Mk II', 'Lee-Enfield No.4', 'Bren LMG', '2-inch Mortar', 'PIAT', 'Webley Revolver', 'Enfield No.2']),
      wc('German', ['MP40', 'Kar98k', 'MG42', 'MG34', 'Walther P38', 'K43', 'StG 44', 'Panzerschreck']),
      wc('American', ['Thompson M1928', 'M1 Garand', 'BAR M1918', 'M3 Grease Gun', 'M1 Carbine']),
      wc('Canadian', ['Lee-Enfield No.4 (Canada)', 'Sten Mk V']),
    ],
    maps: [
      'Breville-sur-Mer', 'Maltot', 'Operation Cobra', 'Veghel',
      'Hellendoorn', 'Driel', 'Arnhem', 'Nijmegen',
    ],
    roles: [...GENERIC_ROLES],
  },

  // ── Hell Let Loose ────────────────────────────────────────────────────────────
  hll: {
    weapons: [
      wc('US Forces', ['M1 Garand', 'M1A1 Thompson', 'M1 Carbine', 'M1918 BAR', 'M1919A4 LMG', 'Springfield M1903', 'Bazooka', 'M3 Grease Gun', 'M9 Pistol']),
      wc('German Forces', ['Kar98k', 'MP40', 'StG 44', 'MG34', 'MG42', 'G43', 'Panzerschreck', 'MP44']),
      wc('Soviet Forces', ['Mosin-Nagant', 'PPSh-41', 'DP-28', 'SVT-40', 'PTRS-41']),
      wc('British Forces', ['Lee-Enfield No.4', 'Sten Mk II', 'Bren LMG', 'PIAT']),
    ],
    maps: [
      'Carentan', 'Foy', 'Hill 400', 'Hurtgen Forest', 'Kursk', 'Omaha Beach',
      'Purple Heart Lane', 'Saint-Marie-du-Mont', 'Sainte-Mère-Église',
      'Stalingrad', 'Remagen', 'El Alamein', 'Utah Beach', 'Tobruk',
      'Kharkov', 'Minsk', 'Mortain',
    ],
    roles: [
      { value: 'officer',  label: 'Officer',         subtitle: 'Rallies, marks, commands' },
      { value: 'rifleman', label: 'Rifleman',         subtitle: 'Core infantry' },
      { value: 'at',       label: 'Anti-Tank',        subtitle: 'Bazooka / Panzerschreck' },
      { value: 'mg',       label: 'Machine Gunner',   subtitle: 'Suppression and holding' },
      { value: 'sniper',   label: 'Marksman',         subtitle: 'Picked targets, holds sightlines' },
      { value: 'medic',    label: 'Medic',            subtitle: 'Revives and bandages' },
      { value: 'support',  label: 'Support',          subtitle: 'Ammo, resupply, logistics' },
      { value: 'crewman',  label: 'Crewman',          subtitle: 'Tank crew and vehicle ops' },
      { value: 'arty',     label: 'Artillery',        subtitle: 'Fires artillery support' },
    ],
  },

  // ── Escape from Tarkov: Arena ────────────────────────────────────────────────
  'tarkov-arena': {
    weapons: [
      wc('Assault Rifles', ['AK-74M', 'M4A1', 'HK 416A5', 'MCX', 'SA-58 FAL', 'AS VAL']),
      wc('Submachine Guns', ['MP5', 'MP9', 'PP-19-01 Vityaz']),
      wc('Sniper / Marksman', ['SVD', 'RSASS', 'SR-25', 'SV-98']),
      wc('Shotguns', ['M870', 'Saiga-12']),
      wc('Light Machine Guns', ['PKM', 'RPK-16', 'M249']),
      wc('Pistols', ['Glock 17', 'M9A3', 'TT']),
    ],
    maps: ['The Cube (Arena)', 'Moot', 'Interchange Arena', 'Reserve Arena'],
    roles: [...GENERIC_ROLES],
  },

  // ── Wolfenstein: Youngblood ───────────────────────────────────────────────────
  // Source: wolfenstein.fandom.com/wiki/Category:Youngblood_weapons
  // Researched: June 2026
  // Count: 9 weapons (exact in-game names)
  wolfyb: {
    weapons: [
      wc('Standard Firearms', ['Pistole', 'Maschinenpistole', 'Blitzgewehr', 'Sturmgewehr', 'Kugelgewehr']),
      wc('Kraftwerk Energy Weapons', ['Laserkraftwerk', 'Elektrokraftwerk', 'Dieselkraftwerk']),
      wc('Heavy', ['Ubergewehr']),
    ],
    maps: ['Messy Markt', 'Rudi Jäger HQ', 'Lothar HQ', 'Lab X', 'New Paris Streets'],
    roles: [...GENERIC_ROLES],
  },

}

// ─── MOCK MATCHES ────────────────────────────────────────────────────────────
// Sorted descending by overall. statusGame is overridden at render time
// with the user's selected game name (answer #7).
// revealedUsername is hidden until the match accepts. TODO: fetch from DB once auth is wired up.

// FIX 1: 4 searching (visible by default), 2 ingame (visible with notifications on), 2 offline (always hidden)
export const MOCK_MATCHES: MatchPlayer[] = [
  { id: 'match-01', label: 'MATCH 01', revealedUsername: 'ShadowRook',    overall: 94, gamesmanship: 96, vibe: 91, comms: 93, status: 'searching', statusGame: null },
  { id: 'match-02', label: 'MATCH 02', revealedUsername: 'GhostDelta7',   overall: 88, gamesmanship: 90, vibe: 85, comms: 89, status: 'searching', statusGame: null },
  { id: 'match-03', label: 'MATCH 03', revealedUsername: 'IronVeil',      overall: 83, gamesmanship: 80, vibe: 88, comms: 84, status: 'searching', statusGame: null },
  { id: 'match-04', label: 'MATCH 04', revealedUsername: 'NullTrace',     overall: 79, gamesmanship: 75, vibe: 82, comms: 78, status: 'searching', statusGame: null },
  { id: 'match-05', label: 'MATCH 05', revealedUsername: 'VoidCaster',    overall: 74, gamesmanship: 78, vibe: 70, comms: 71, status: 'ingame',    statusGame: 'Escape from Tarkov' },
  { id: 'match-06', label: 'MATCH 06', revealedUsername: 'CryptoFang',    overall: 68, gamesmanship: 65, vibe: 72, comms: 70, status: 'ingame',    statusGame: 'Arena Breakout: Infinite' },
  { id: 'match-07', label: 'MATCH 07', revealedUsername: 'StormBlind',    overall: 61, gamesmanship: 63, vibe: 58, comms: 60, status: 'offline',   statusGame: null },
  { id: 'match-08', label: 'MATCH 08', revealedUsername: 'RiftWalker',    overall: 55, gamesmanship: 52, vibe: 58, comms: 57, status: 'offline',   statusGame: null },
]

// ─── MOCK OPPONENT PROFILES (MATCHING_LOGIC_SPEC.md) ────────────────────────
// Runs through calculateMatch() against the current user's profile to produce
// the live scores shown on /squad-matches. Paired 1:1 by array position with
// MOCK_MATCHES above (same status pattern) so username/label/matchId stay stable.
// These profiles are for EFT as the example game.
// In Phase 2, these come from the database filtered by selected game.
export const MOCK_OPPONENT_PROFILES: Array<{
  id: string
  status: 'searching' | 'ingame' | 'offline'
  statusGame: string | null
  profile: Profile
}> = [
  {
    id: 'opponent-01',
    status: 'searching',
    statusGame: null,
    profile: {
      gameId: 'tarkov',
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
      gameId: 'tarkov',
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
      gameId: 'tarkov',
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
      gameId: 'tarkov',
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
      gameId: 'tarkov',
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
      gameId: 'tarkov',
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
      gameId: 'tarkov',
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
      gameId: 'tarkov',
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
]

// ─── MOCK INCOMING REQUESTS (dev prototype simulate queue) ──────────────────
// matchId links to a MOCK_MATCHES id so Decline & Block can remove that card.

export function createMockIncomingRequests(): IncomingRequest[] {
  return [
    {
      id: 'req-01',
      matchId: 'match-05',
      senderUsername: 'VoidCaster',
      senderStatus: 'searching',
      senderStatusGame: null,
      overallMatch: 74,
      expiresAt: Date.now() + 20000,
    },
    {
      id: 'req-02',
      matchId: 'match-03',
      senderUsername: 'IronVeil',
      senderStatus: 'ingame',
      senderStatusGame: 'Escape from Tarkov',
      overallMatch: 83,
      expiresAt: Date.now() + 20000,
    },
    {
      id: 'req-03',
      matchId: null,
      senderUsername: 'PhantomSix',
      senderStatus: 'searching',
      senderStatusGame: null,
      overallMatch: 71,
      expiresAt: Date.now() + 20000,
    },
  ]
}

// ─── MOCK ALLIES ─────────────────────────────────────────────────────────────
// Allies panel starts empty in prototype — user adds allies via "Add as Ally".
// This array is exported for reference only (used by simulate button if needed).

export const MOCK_ALLIES: Ally[] = [
  { id: 'ally-01', username: 'ShadowRook',  overall: 94, status: 'ingame',    statusGame: 'Escape from Tarkov' },
  { id: 'ally-02', username: 'GhostDelta7', overall: 88, status: 'searching', statusGame: null },
  { id: 'ally-03', username: 'IronVeil',    overall: 76, status: 'offline',   statusGame: null },
]

// ─── HOMEPAGE MOCK DATA (SPEC_UPDATE_05 Section D5) ──────────────────────────

export const MOCK_SQUAD = [
  { id: 'squad-01', username: 'NovaTrigger', overall: 94 },
  { id: 'squad-02', username: 'IronVeil',    overall: 88 },
]

export const MOCK_HOMEPAGE_ALLIES = [
  { id: 'ally-01', username: 'ShadowRook',  overall: 91, status: 'searching' as const },
  { id: 'ally-02', username: 'GhostDelta7', overall: 85, status: 'in-squad'  as const },
  { id: 'ally-03', username: 'CopperEdge',  overall: 76, status: 'offline'   as const },
]
