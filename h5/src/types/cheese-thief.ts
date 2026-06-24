export type GamePhase = 'setup' | 'night' | 'discussion' | 'voting' | 'result'

export type WinningFaction = 'villager' | 'thief' | 'scapegoat'

export interface GameConfig {
  playerCount: number
  nightSecondsPerDice: number
  discussionMinutes: number
  votingSeconds: number
  speechRate: number
  speechVolume: number
  musicVolume: number
  sfxVolume: number
}

export type NightSubPhase = 'dice' | 'accomplice' | 'idle'

export interface NightState {
  currentDiceNumber: number
  remainingSeconds: number
  isCompleted: boolean
  isPaused: boolean
  subPhase: NightSubPhase
}

export interface GameRecord {
  id?: number
  gameTemplate: string
  playerCount: number
  winningFaction: WinningFaction
  durationMinutes: number
  playedAt: Date
}

export interface RoleComposition {
  thief: number
  accomplice: number
  scapegoat: number
  villager: number
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  playerCount: 6,
  nightSecondsPerDice: 5,
  discussionMinutes: 5,
  votingSeconds: 30,
  speechRate: 1.0,
  speechVolume: 1.0,
  musicVolume: 0.3,
  sfxVolume: 0.5,
}
export const DICE_NUMBERS = [1, 2, 3, 4, 5, 6] as const

export function getRoleComposition(playerCount: number): RoleComposition {
  const compositions: Record<number, RoleComposition> = {
    4: { thief: 1, accomplice: 0, scapegoat: 1, villager: 2 },
    5: { thief: 1, accomplice: 1, scapegoat: 1, villager: 2 },
    6: { thief: 1, accomplice: 1, scapegoat: 1, villager: 3 },
    7: { thief: 1, accomplice: 2, scapegoat: 1, villager: 3 },
    8: { thief: 1, accomplice: 2, scapegoat: 1, villager: 4 },
  }
  return compositions[playerCount] ?? compositions[6]
}

/**
 * 是否有共犯選擇環節
 * - 4 人局：無共犯
 * - 5-8 人局：有共犯選擇，共犯與大盜互相確認身份（相認）
 */
export function hasAccomplicePhase(playerCount: number): boolean {
  return playerCount >= 5
}
