import Dexie, { type Table } from 'dexie'
import type { GameRecord } from '@/types/cheese-thief'

class GameDatabase extends Dexie {
  gameRecords!: Table<GameRecord, number>

  constructor() {
    super('boardgame-host-db')
    this.version(1).stores({
      gameRecords: '++id, gameTemplate, playedAt',
    })
  }
}

const db = new GameDatabase()

export interface GameStats {
  total: number
  thiefWins: number
  villagerWins: number
}

export function useGameHistory() {
  async function addRecord(record: Omit<GameRecord, 'id'>): Promise<number> {
    return await db.gameRecords.add(record as GameRecord)
  }

  async function getRecords(): Promise<GameRecord[]> {
    return await db.gameRecords.orderBy('playedAt').reverse().toArray()
  }

  async function getStats(): Promise<GameStats> {
    const records = await db.gameRecords.toArray()
    const total = records.length
    const thiefWins = records.filter((r) => r.winningFaction === 'thief').length
    const villagerWins = records.filter((r) => r.winningFaction === 'villager').length
    return { total, thiefWins, villagerWins }
  }

  async function clearAll(): Promise<void> {
    await db.gameRecords.clear()
  }

  return {
    addRecord,
    getRecords,
    getStats,
    clearAll,
  }
}
