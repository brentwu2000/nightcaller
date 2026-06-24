import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useGameHistory } from '@/composables/useGameHistory'
import type { GameRecord } from '@/types/cheese-thief'
import type { GameStats } from '@/composables/useGameHistory'

export const useGameHistoryStore = defineStore('gameHistory', () => {
  const records = ref<GameRecord[]>([])
  const stats = ref<GameStats>({ total: 0, thiefWins: 0, villagerWins: 0 })
  const isLoading = ref(false)

  const history = useGameHistory()

  async function loadRecords(): Promise<void> {
    isLoading.value = true
    try {
      records.value = await history.getRecords()
      stats.value = await history.getStats()
    } finally {
      isLoading.value = false
    }
  }

  async function addRecord(record: Omit<GameRecord, 'id'>): Promise<void> {
    await history.addRecord(record)
    await loadRecords()
  }

  async function clearAll(): Promise<void> {
    await history.clearAll()
    records.value = []
    stats.value = { total: 0, thiefWins: 0, villagerWins: 0 }
  }

  return {
    records,
    stats,
    isLoading,
    loadRecords,
    addRecord,
    clearAll,
  }
})
