import { describe, it, expect, beforeEach } from 'vitest'
import { useGameHistory } from '@/composables/useGameHistory'
import type { GameRecord } from '@/types/cheese-thief'

// fake-indexeddb is installed globally via src/test/setup.ts so Dexie
// uses an in-memory IndexedDB for every test run.

function makeRecord(overrides: Partial<Omit<GameRecord, 'id'>> = {}): Omit<GameRecord, 'id'> {
  return {
    gameTemplate: 'cheese-thief',
    playerCount: 6,
    winningFaction: 'villager',
    durationMinutes: 15,
    playedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  }
}

describe('useGameHistory', () => {
  // Each test gets a fresh composable instance, but Dexie's in-memory DB
  // persists within a process. We clear it via clearAll() in beforeEach.
  let history: ReturnType<typeof useGameHistory>

  beforeEach(async () => {
    history = useGameHistory()
    await history.clearAll()
  })

  describe('addRecord()', () => {
    it('should return a numeric id after adding a record', async () => {
      const id = await history.addRecord(makeRecord())
      expect(typeof id).toBe('number')
      expect(id).toBeGreaterThan(0)
    })

    it('should persist the record so it appears in getRecords()', async () => {
      await history.addRecord(makeRecord({ playerCount: 8 }))
      const records = await history.getRecords()
      expect(records).toHaveLength(1)
      expect(records[0].playerCount).toBe(8)
    })
  })

  describe('getRecords()', () => {
    it('should return an empty array when no records exist', async () => {
      const records = await history.getRecords()
      expect(records).toEqual([])
    })

    it('should return records ordered by playedAt descending (newest first)', async () => {
      await history.addRecord(makeRecord({ playedAt: new Date('2024-01-01T10:00:00Z') }))
      await history.addRecord(makeRecord({ playedAt: new Date('2024-01-03T10:00:00Z') }))
      await history.addRecord(makeRecord({ playedAt: new Date('2024-01-02T10:00:00Z') }))

      const records = await history.getRecords()
      expect(records[0].playedAt.toISOString()).toContain('2024-01-03')
      expect(records[1].playedAt.toISOString()).toContain('2024-01-02')
      expect(records[2].playedAt.toISOString()).toContain('2024-01-01')
    })
  })

  describe('getStats()', () => {
    it('should return zero stats when no records exist', async () => {
      const stats = await history.getStats()
      expect(stats).toEqual({ total: 0, thiefWins: 0, villagerWins: 0 })
    })

    it('should count total records correctly', async () => {
      await history.addRecord(makeRecord())
      await history.addRecord(makeRecord())
      const stats = await history.getStats()
      expect(stats.total).toBe(2)
    })

    it('should count thief wins correctly', async () => {
      await history.addRecord(makeRecord({ winningFaction: 'thief' }))
      await history.addRecord(makeRecord({ winningFaction: 'thief' }))
      await history.addRecord(makeRecord({ winningFaction: 'villager' }))
      const stats = await history.getStats()
      expect(stats.thiefWins).toBe(2)
      expect(stats.villagerWins).toBe(1)
    })

    it('should count villager wins correctly', async () => {
      await history.addRecord(makeRecord({ winningFaction: 'villager' }))
      const stats = await history.getStats()
      expect(stats.villagerWins).toBe(1)
    })

    it('should reflect newly added records immediately', async () => {
      await history.addRecord(makeRecord({ winningFaction: 'thief' }))
      const stats = await history.getStats()
      expect(stats.total).toBe(1)
      expect(stats.thiefWins).toBe(1)
    })
  })

  describe('clearAll()', () => {
    it('should remove all records', async () => {
      await history.addRecord(makeRecord())
      await history.addRecord(makeRecord())
      await history.clearAll()
      const records = await history.getRecords()
      expect(records).toHaveLength(0)
    })

    it('should reset stats to zero after clearing', async () => {
      await history.addRecord(makeRecord({ winningFaction: 'thief' }))
      await history.clearAll()
      const stats = await history.getStats()
      expect(stats).toEqual({ total: 0, thiefWins: 0, villagerWins: 0 })
    })
  })
})
