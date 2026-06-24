import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { GameRecord } from '@/types/cheese-thief'
import type { GameStats } from '@/composables/useGameHistory'

// ---------------------------------------------------------------------------
// Mock useGameHistory composable
// ---------------------------------------------------------------------------
const mockGetRecords = vi.fn()
const mockGetStats = vi.fn()
const mockAddRecord = vi.fn()
const mockClearAll = vi.fn()

vi.mock('@/composables/useGameHistory', () => ({
  useGameHistory: () => ({
    getRecords: mockGetRecords,
    getStats: mockGetStats,
    addRecord: mockAddRecord,
    clearAll: mockClearAll,
  }),
}))

function makeRecord(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: 1,
    gameTemplate: 'cheese-thief',
    playerCount: 6,
    winningFaction: 'villager',
    durationMinutes: 10,
    playedAt: new Date('2024-06-01T12:00:00Z'),
    ...overrides,
  }
}

describe('useGameHistoryStore', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.resetModules()

    // Default return values
    mockGetRecords.mockResolvedValue([])
    mockGetStats.mockResolvedValue({ total: 0, thiefWins: 0, villagerWins: 0 } as GameStats)
    mockAddRecord.mockResolvedValue(1)
    mockClearAll.mockResolvedValue(undefined)
  })

  describe('initial state', () => {
    it('should start with empty records array', async () => {
      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      expect(store.records).toEqual([])
    })

    it('should start with zero stats', async () => {
      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      expect(store.stats).toEqual({ total: 0, thiefWins: 0, villagerWins: 0 })
    })

    it('should start with isLoading = false', async () => {
      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('loadRecords()', () => {
    it('should populate records from the composable', async () => {
      const records = [makeRecord({ id: 1 }), makeRecord({ id: 2 })]
      mockGetRecords.mockResolvedValue(records)

      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      await store.loadRecords()

      expect(store.records).toEqual(records)
    })

    it('should populate stats from the composable', async () => {
      const stats: GameStats = { total: 5, thiefWins: 3, villagerWins: 2 }
      mockGetStats.mockResolvedValue(stats)

      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      await store.loadRecords()

      expect(store.stats).toEqual(stats)
    })

    it('should set isLoading to true during the fetch and false after', async () => {
      let resolveRecords!: (v: GameRecord[]) => void
      mockGetRecords.mockReturnValue(new Promise<GameRecord[]>((r) => { resolveRecords = r }))

      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      const loadPromise = store.loadRecords()

      expect(store.isLoading).toBe(true)

      resolveRecords([])
      await loadPromise

      expect(store.isLoading).toBe(false)
    })

    it('should set isLoading to false even when the fetch throws', async () => {
      mockGetRecords.mockRejectedValue(new Error('db error'))

      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()

      await expect(store.loadRecords()).rejects.toThrow('db error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('addRecord()', () => {
    it('should call composable addRecord with the provided record', async () => {
      const record = makeRecord()
      const { id: _id, ...recordWithoutId } = record

      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      await store.addRecord(recordWithoutId)

      expect(mockAddRecord).toHaveBeenCalledWith(recordWithoutId)
    })

    it('should reload records after adding', async () => {
      const newRecord = makeRecord({ id: 42 })
      mockGetRecords.mockResolvedValue([newRecord])
      mockGetStats.mockResolvedValue({ total: 1, thiefWins: 0, villagerWins: 1 })

      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      const { id: _id, ...recordWithoutId } = newRecord
      await store.addRecord(recordWithoutId)

      expect(store.records).toHaveLength(1)
      expect(store.stats.total).toBe(1)
    })
  })

  describe('clearAll()', () => {
    it('should call composable clearAll', async () => {
      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()

      // Pre-populate
      store.records = [makeRecord()]
      store.stats = { total: 1, thiefWins: 0, villagerWins: 1 }

      await store.clearAll()
      expect(mockClearAll).toHaveBeenCalledTimes(1)
    })

    it('should reset records to empty array', async () => {
      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      store.records = [makeRecord()]

      await store.clearAll()
      expect(store.records).toEqual([])
    })

    it('should reset stats to zero', async () => {
      const { useGameHistoryStore } = await import('@/stores/gameHistoryStore')
      const store = useGameHistoryStore()
      store.stats = { total: 5, thiefWins: 3, villagerWins: 2 }

      await store.clearAll()
      expect(store.stats).toEqual({ total: 0, thiefWins: 0, villagerWins: 0 })
    })
  })
})
