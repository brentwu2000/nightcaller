// ===== Phase & State Types =====

export type AvalonPhase = 'setup' | 'night' | 'scoreboard' | 'assassinate' | 'finished'

export type AvalonNightStep =
  | 'opening'
  | 'evil_reveal'
  | 'merlin_reveal'
  | 'percival_reveal'
  | 'closing'
  | 'idle'

export type MissionResult = 'success' | 'fail' | 'pending'

export type WinSide = 'good' | 'evil'

export type WinReason =
  | 'three_missions_success'
  | 'three_missions_fail'
  | 'five_rejects'
  | 'assassinate_success'
  | 'assassinate_fail'

// ===== Configuration =====

export interface AvalonRoleConfig {
  playerCount: number
  hasPercival: boolean
  hasMorgana: boolean
  hasMordred: boolean
  hasOberon: boolean
}

export interface AvalonGameConfig {
  roles: AvalonRoleConfig
  nightPauseSeconds: number
  speechRate: number
  speechVolume: number
  musicVolume: number
  sfxVolume: number
}

export const DEFAULT_AVALON_CONFIG: AvalonGameConfig = {
  roles: {
    playerCount: 7,
    hasPercival: true,
    hasMorgana: true,
    hasMordred: false,
    hasOberon: false,
  },
  nightPauseSeconds: 5,
  speechRate: 1.0,
  speechVolume: 1.0,
  musicVolume: 0.3,
  sfxVolume: 0.5,
}

// ===== Game State =====

export interface AvalonGameState {
  missions: MissionResult[]
  currentRound: number
  rejectStreak: number
  successCount: number
  failCount: number
}

// ===== Constants =====

export const MISSION_SIZES: Record<number, number[]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
}

/** Round index (0-based) that requires 2 fail votes for mission failure */
export const DOUBLE_FAIL_ROUND = 3

/** Minimum player count for double-fail rule to apply */
export const DOUBLE_FAIL_MIN_PLAYERS = 7

/** Maximum consecutive rejects before evil auto-wins */
export const MAX_REJECTS = 5

// ===== Helper Functions =====

export interface AvalonRoleDistribution {
  good: number
  evil: number
  roles: string[]
}

const FACTION_SIZES: Record<number, { good: number; evil: number }> = {
  5: { good: 3, evil: 2 },
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
}

export function getRoleDistribution(config: AvalonRoleConfig): AvalonRoleDistribution {
  const factions = FACTION_SIZES[config.playerCount] ?? FACTION_SIZES[7]
  const roles: string[] = []

  // Good side
  roles.push('梅林')
  if (config.hasPercival) roles.push('派西維爾')
  const fillerGood = factions.good - roles.length
  for (let i = 0; i < fillerGood; i++) {
    roles.push('忠臣')
  }

  // Evil side
  roles.push('刺客')
  if (config.hasMorgana) roles.push('莫甘娜')
  if (config.hasMordred) roles.push('莫德雷德')
  if (config.hasOberon) roles.push('奧伯倫')
  const fillerEvil = factions.evil - (roles.length - factions.good)
  for (let i = 0; i < fillerEvil; i++) {
    roles.push('爪牙')
  }

  return {
    good: factions.good,
    evil: factions.evil,
    roles,
  }
}

export function isRoleConfigValid(config: AvalonRoleConfig): boolean {
  const factions = FACTION_SIZES[config.playerCount]
  if (!factions) return false

  let evilCount = 1 // assassin always
  if (config.hasMorgana) evilCount++
  if (config.hasMordred) evilCount++
  if (config.hasOberon) evilCount++

  return evilCount <= factions.evil
}

export function needsDoubleFail(playerCount: number, roundIndex: number): boolean {
  return playerCount >= DOUBLE_FAIL_MIN_PLAYERS && roundIndex === DOUBLE_FAIL_ROUND
}

export function getMissionSize(playerCount: number, roundIndex: number): number {
  const sizes = MISSION_SIZES[playerCount] ?? MISSION_SIZES[7]
  return sizes[roundIndex] ?? 3
}

export function createInitialGameState(): AvalonGameState {
  return {
    missions: ['pending', 'pending', 'pending', 'pending', 'pending'],
    currentRound: 0,
    rejectStreak: 0,
    successCount: 0,
    failCount: 0,
  }
}

// ===== Game History Record =====

export interface AvalonGameRecord {
  id?: number
  gameTemplate: 'avalon'
  playerCount: number
  winSide: WinSide
  winReason: WinReason
  missions: MissionResult[]
  durationMinutes: number
  playedAt: Date
}
