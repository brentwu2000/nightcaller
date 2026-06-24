// ============================================================
// Salem 1692 — 獵巫鎮語音主持型別定義
// ============================================================

// ===== Phase & State Types =====

/** 遊戲主階段 */
export type SalemPhase =
  | 'setup'
  | 'discussion'       // 白天自由討論
  | 'trial_defense'    // 審判：辯護階段
  | 'trial_vote'       // 審判：投票階段
  | 'trial_result'     // 審判：結果輸入
  | 'conspiracy'       // 共謀事件
  | 'night'            // 夜晚（巫師殺人 + 守護者）
  | 'dawn'             // 黎明結算
  | 'finished'         // 遊戲結束

/** 夜晚子步驟 */
export type SalemNightStep =
  | 'opening'
  | 'witch'
  | 'guardian'
  | 'idle'

/** 勝利原因 */
export type SalemWinReason =
  | 'all_witches_revealed'  // 所有巫師卡被揭露（自動判定）
  | 'witch_dominance'       // 組織者宣告巫師勝利（手動）

/** 陣營 */
export type SalemFaction = 'villager' | 'witch'

// ===== Configuration =====

export interface SalemGameConfig {
  playerCount: number
  witchCount: number
  hasGuardian: boolean

  // 計時設定
  discussionMinutes: number
  defenseSeconds: number
  conspiracySeconds: number
  nightWitchSeconds: number
  nightGuardianSeconds: number

  // 音訊設定
  speechRate: number
  speechVolume: number
  musicVolume: number
  sfxVolume: number
}

export const DEFAULT_SALEM_CONFIG: SalemGameConfig = {
  playerCount: 8,
  witchCount: 2,
  hasGuardian: true,
  discussionMinutes: 5,
  defenseSeconds: 60,
  conspiracySeconds: 15,
  nightWitchSeconds: 10,
  nightGuardianSeconds: 8,
  speechRate: 1.0,
  speechVolume: 1.0,
  musicVolume: 0.3,
  sfxVolume: 0.5,
}

// ===== Survival Tracking =====
// 僅追蹤公開可知的資訊，不追蹤隱藏的巫師人數

export interface SalemSurvival {
  alivePlayers: number
  revealedWitches: number    // 透過審判揭露的巫師數
  deadVillagers: number      // 死亡村民（夜殺 + 錯判）
}

// ===== Game Events =====

export interface SalemEvent {
  round: number
  phase: 'day' | 'night' | 'conspiracy'
  type: 'trial_witch' | 'trial_villager' | 'acquittal' | 'night_kill' | 'night_safe'
  description: string
}

// ===== Game State =====

export interface SalemGameState {
  survival: SalemSurvival
  currentRound: number
  events: SalemEvent[]
}

// ===== Helper Functions =====

/** 根據玩家人數計算巫師數 */
export function getWitchCount(playerCount: number): number {
  if (playerCount <= 6) return 1
  if (playerCount <= 9) return 2
  return 3
}

/** 建立初始存活狀態 */
export function createInitialSurvival(playerCount: number): SalemSurvival {
  return {
    alivePlayers: playerCount,
    revealedWitches: 0,
    deadVillagers: 0,
  }
}

/** 建立初始遊戲狀態 */
export function createInitialGameState(config: SalemGameConfig): SalemGameState {
  return {
    survival: createInitialSurvival(config.playerCount),
    currentRound: 1,
    events: [],
  }
}

/** 檢查村民自動勝利（所有巫師卡被揭露） */
export function checkVillagerWin(survival: SalemSurvival, witchCount: number): boolean {
  return survival.revealedWitches >= witchCount
}

// ===== Game History Record =====

export interface SalemGameRecord {
  id?: number
  gameTemplate: 'witch-hunt'
  playerCount: number
  winningFaction: SalemFaction
  winReason: SalemWinReason
  rounds: number
  durationMinutes: number
  playedAt: Date
}
