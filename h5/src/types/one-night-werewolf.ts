// ===== Role Definitions =====

export type OnwRoleId =
  | 'werewolf'
  | 'minion'
  | 'mason'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'hunter'
  | 'insomniac'
  | 'tanner'
  | 'villager'
  | 'doppelganger'

export type OnwFaction = 'village' | 'werewolf' | 'tanner'

export interface OnwRole {
  id: OnwRoleId
  name: string
  faction: OnwFaction
  hasNightAction: boolean
  nightOrder: number
  description: string
  nightInstruction: string
  isAdvanced: boolean
  maxCount: number
}

// ===== Game Config =====

export type OnwPhase =
  | 'setup'
  | 'night'
  | 'discussion'
  | 'vote'
  | 'result'
  | 'finished'

export type OnwNightStep =
  | 'idle'
  | 'opening'
  | 'doppelganger'
  | 'werewolf'
  | 'minion'
  | 'mason'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'insomniac'
  | 'doppelganger_second'
  | 'closing'
  | 'completed'

export interface OnwGameConfig {
  playerCount: number
  selectedRoles: OnwRoleId[]
  discussionMinutes: number
  voteCountdownSeconds: number
  nightSilenceSeconds: number
  speechRate: number
  speechVolume: number
  musicVolume: number
  sfxVolume: number
}

// ===== Game State =====

export type OnwWinnerFaction = 'village' | 'werewolf' | 'tanner' | 'none'

export type OnwWinReason =
  | 'werewolf_eliminated'
  | 'no_werewolf_eliminated'
  | 'no_werewolf_no_elimination'
  | 'no_werewolf_but_eliminated'
  | 'tanner_eliminated'

export interface OnwVoteResult {
  eliminatedRoles: OnwRoleId[]
  isTie: boolean
}

export interface OnwGameResult {
  winner: OnwWinnerFaction
  winReason: OnwWinReason
  voteResult: OnwVoteResult
}

export interface OnwGameRecord {
  id?: number
  gameTemplate: 'one-night-werewolf'
  playerCount: number
  selectedRoles: OnwRoleId[]
  winner: OnwWinnerFaction
  winReason: OnwWinReason
  durationMinutes: number
  playedAt: Date
}

// ===== Constants =====

export const ONW_ROLES: Readonly<Record<OnwRoleId, OnwRole>> = {
  doppelganger: {
    id: 'doppelganger',
    name: '化身幽靈',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 1,
    description: '夜晚偷看另一名玩家的牌，並扮演該角色。',
    nightInstruction: '偷看一名玩家的牌，你將扮演那個角色。',
    isAdvanced: true,
    maxCount: 1,
  },
  werewolf: {
    id: 'werewolf',
    name: '狼人',
    faction: 'werewolf',
    hasNightAction: true,
    nightOrder: 2,
    description: '狼人陣營。夜晚睜眼確認同伴，若為孤狼可查看一張中間牌。',
    nightInstruction: '睜眼確認同伴；若為孤狼，可查看一張中間牌。',
    isAdvanced: false,
    maxCount: 2,
  },
  minion: {
    id: 'minion',
    name: '爪牙',
    faction: 'werewolf',
    hasNightAction: true,
    nightOrder: 3,
    description: '狼人陣營。夜晚睜眼確認狼人身份，但狼人不知道爪牙是誰。',
    nightInstruction: '睜眼查看所有狼人的身份。',
    isAdvanced: false,
    maxCount: 1,
  },
  mason: {
    id: 'mason',
    name: '守夜人',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 3.5,
    description: '村民陣營。夜晚兩名守夜人互相睜眼確認身份。若只有一名守夜人，則獨自確認。',
    nightInstruction: '兩名守夜人互相睜眼確認身份。',
    isAdvanced: false,
    maxCount: 2,
  },
  seer: {
    id: 'seer',
    name: '預言家',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 4,
    description: '村民陣營。夜晚可查看一名玩家的牌，或查看中間的兩張牌。',
    nightInstruction: '查看一名玩家的牌，或查看中間兩張牌。',
    isAdvanced: false,
    maxCount: 1,
  },
  robber: {
    id: 'robber',
    name: '強盜',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 5,
    description: '村民陣營。夜晚可偷走另一名玩家的牌，與自己交換，並查看新角色。',
    nightInstruction: '偷走一名玩家的牌與自己交換，並查看新角色。',
    isAdvanced: false,
    maxCount: 1,
  },
  troublemaker: {
    id: 'troublemaker',
    name: '搗蛋鬼',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 6,
    description: '村民陣營。夜晚可秘密交換兩名其他玩家的牌，自己不查看。',
    nightInstruction: '交換兩名其他玩家的牌，自己不能查看。',
    isAdvanced: false,
    maxCount: 1,
  },
  drunk: {
    id: 'drunk',
    name: '酒鬼',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 7,
    description: '村民陣營。夜晚必須將自己的牌與一張中間牌交換，不查看新角色。',
    nightInstruction: '將自己的牌與一張中間牌交換，不能查看。',
    isAdvanced: false,
    maxCount: 1,
  },
  hunter: {
    id: 'hunter',
    name: '獵人',
    faction: 'village',
    hasNightAction: false,
    nightOrder: 0,
    description: '村民陣營。若獵人被淘汰，他指向的玩家也同時被淘汰。',
    nightInstruction: '無夜晚行動，閉眼休息。',
    isAdvanced: false,
    maxCount: 1,
  },
  insomniac: {
    id: 'insomniac',
    name: '失眠者',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 8,
    description: '村民陣營。夜晚最後行動，查看自己目前的角色（確認牌是否被交換）。',
    nightInstruction: '查看自己手中的角色牌，確認是否被交換。',
    isAdvanced: false,
    maxCount: 1,
  },
  tanner: {
    id: 'tanner',
    name: '皮匠',
    faction: 'tanner',
    hasNightAction: false,
    nightOrder: 0,
    description: '特殊陣營。只有皮匠被淘汰時，皮匠獲勝（其他人均落敗）。',
    nightInstruction: '無夜晚行動，閉眼休息。',
    isAdvanced: false,
    maxCount: 1,
  },
  villager: {
    id: 'villager',
    name: '村民',
    faction: 'village',
    hasNightAction: false,
    nightOrder: 0,
    description: '村民陣營。無夜晚行動，單純靠白天推理。',
    nightInstruction: '無夜晚行動，閉眼休息。',
    isAdvanced: false,
    maxCount: 3,
  },
} as const

export const ONW_MIN_PLAYERS = 3
export const ONW_MAX_PLAYERS = 10
export const ONW_CENTER_CARD_COUNT = 3

export const DEFAULT_ONW_CONFIG: OnwGameConfig = {
  playerCount: 5,
  selectedRoles: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'villager', 'villager'],
  discussionMinutes: 5,
  voteCountdownSeconds: 3,
  nightSilenceSeconds: 5,
  speechRate: 1.0,
  speechVolume: 1.0,
  musicVolume: 0.3,
  sfxVolume: 0.5,
}

/** Recommended role configs per player count */
export const RECOMMENDED_ROLES: Record<number, OnwRoleId[]> = {
  3: ['werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'villager'],
  4: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'villager'],
  5: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'villager', 'insomniac'],
  6: ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'mason', 'mason', 'villager'],
  7: ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'mason', 'mason', 'drunk', 'villager'],
  8: ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'mason', 'mason', 'drunk', 'insomniac', 'villager'],
  9: ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'mason', 'mason', 'drunk', 'hunter', 'tanner', 'villager'],
  10: ['werewolf', 'werewolf', 'minion', 'seer', 'robber', 'troublemaker', 'mason', 'mason', 'drunk', 'hunter', 'tanner', 'insomniac', 'villager'],
}

// ===== Helper Functions =====

export function isOnwRoleConfigValid(
  playerCount: number,
  selectedRoles: OnwRoleId[],
): boolean {
  const requiredTotal = playerCount + ONW_CENTER_CARD_COUNT
  return selectedRoles.length === requiredTotal
}

export function getNightActionSequence(
  selectedRoles: OnwRoleId[],
): OnwRoleId[] {
  const roleSet = new Set(selectedRoles)
  return (Object.values(ONW_ROLES) as OnwRole[])
    .filter((role) => role.hasNightAction && roleSet.has(role.id))
    .sort((a, b) => a.nightOrder - b.nightOrder)
    .map((role) => role.id)
    .filter((id, index, arr) => arr.indexOf(id) === index)
}

export function isLoneWolf(selectedRoles: OnwRoleId[]): boolean {
  return selectedRoles.filter((r) => r === 'werewolf').length === 1
}

export function determineWinner(
  voteResult: OnwVoteResult,
  allSelectedRoles: OnwRoleId[],
): OnwGameResult {
  const playerRoles = allSelectedRoles.slice(0, allSelectedRoles.length - ONW_CENTER_CARD_COUNT)
  const hasWerewolfInPlay = playerRoles.some((r) => r === 'werewolf')

  if (!voteResult.isTie && voteResult.eliminatedRoles.includes('tanner')) {
    return {
      winner: 'tanner',
      winReason: 'tanner_eliminated',
      voteResult,
    }
  }

  if (voteResult.isTie) {
    if (!hasWerewolfInPlay) {
      return {
        winner: 'village',
        winReason: 'no_werewolf_no_elimination',
        voteResult,
      }
    }
    return {
      winner: 'werewolf',
      winReason: 'no_werewolf_eliminated',
      voteResult,
    }
  }

  const werewolfEliminated = voteResult.eliminatedRoles.includes('werewolf')

  if (werewolfEliminated) {
    return {
      winner: 'village',
      winReason: 'werewolf_eliminated',
      voteResult,
    }
  }

  if (!hasWerewolfInPlay) {
    return {
      winner: 'werewolf',
      winReason: 'no_werewolf_but_eliminated',
      voteResult,
    }
  }

  return {
    winner: 'werewolf',
    winReason: 'no_werewolf_eliminated',
    voteResult,
  }
}

/** Count occurrences of each role in the selection */
export function countRoles(selectedRoles: OnwRoleId[]): Record<OnwRoleId, number> {
  const counts = {} as Record<OnwRoleId, number>
  for (const roleId of Object.keys(ONW_ROLES) as OnwRoleId[]) {
    counts[roleId] = 0
  }
  for (const role of selectedRoles) {
    counts[role]++
  }
  return counts
}

/** Get faction color for display */
export function getFactionColor(faction: OnwFaction): string {
  switch (faction) {
    case 'village': return '#42A5F5'
    case 'werewolf': return '#EF5350'
    case 'tanner': return '#FF9800'
  }
}

/** Get faction label */
export function getFactionLabel(faction: OnwFaction): string {
  switch (faction) {
    case 'village': return '村民'
    case 'werewolf': return '狼人'
    case 'tanner': return '皮匠'
  }
}

/** Get winner announcement text for TTS */
export function getWinAnnouncement(result: OnwGameResult): string {
  switch (result.winReason) {
    case 'werewolf_eliminated':
      return '結果揭曉！被淘汰的玩家持有狼人牌！村民陣營獲勝！光明驅散了黑暗，今晚的村莊是安全的。'
    case 'no_werewolf_eliminated':
      return '結果揭曉！被淘汰的玩家並非狼人！狼人陣營獲勝！黑暗的力量藏在了眾目睽睽之下，村民們受騙了。'
    case 'no_werewolf_no_elimination':
      return '結果揭曉！場上沒有狼人，而且沒有人被淘汰！村民陣營獲勝！所有狼人藏在了中間牌，無人受到傷害。'
    case 'no_werewolf_but_eliminated':
      return '結果揭曉！場上沒有狼人，但有人被淘汰了！狼人陣營獲勝！村民們在沒有狼人的情況下自相殘殺。'
    case 'tanner_eliminated':
      return '結果揭曉！被淘汰的玩家是皮匠！皮匠獲勝！皮匠渴望被淘汰，而你們如了他的願。無論是村民還是狼人，這局的輸家是你們所有人！'
  }
}
