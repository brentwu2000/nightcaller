<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameHistoryStore } from '@/stores/gameHistoryStore'

const router = useRouter()
const historyStore = useGameHistoryStore()

onMounted(async () => {
  await historyStore.loadRecords()
})

function formatDate(date: Date): string {
  const d = new Date(date)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${month}/${day} ${hours}:${mins}`
}

function winnerLabel(faction: string): string {
  if (faction === 'thief') return '大盜勝'
  if (faction === 'scapegoat') return '背鍋鼠勝'
  return '瞌睡鼠勝'
}

function winnerClass(faction: string): string {
  if (faction === 'thief') return 'thief-win'
  if (faction === 'scapegoat') return 'scapegoat-win'
  return 'villager-win'
}

function winRate(wins: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((wins / total) * 100)}%`
}

async function handleClear(): Promise<void> {
  if (confirm('確定要清除所有歷史記錄嗎？')) {
    await historyStore.clearAll()
  }
}

function goBack(): void {
  router.push('/')
}
</script>

<template>
  <div class="page">
    <header class="history-header">
      <button class="btn-back" @click="goBack">&larr;</button>
      <h1 class="page-title">歷史記錄</h1>
    </header>

    <!-- Stats -->
    <section v-if="historyStore.stats.total > 0" class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ historyStore.stats.total }}</div>
        <div class="stat-label">總局數</div>
      </div>
      <div class="stat-card">
        <div class="stat-value thief-color">
          {{ winRate(historyStore.stats.thiefWins, historyStore.stats.total) }}
        </div>
        <div class="stat-label">大盜勝率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value villager-color">
          {{ winRate(historyStore.stats.villagerWins, historyStore.stats.total) }}
        </div>
        <div class="stat-label">瞌睡鼠勝率</div>
      </div>
    </section>

    <!-- Records list -->
    <section v-if="historyStore.records.length > 0" class="records-section">
      <h2 class="records-heading">對局記錄</h2>

      <div class="records-list">
        <div
          v-for="record in historyStore.records"
          :key="record.id"
          class="record-item"
        >
          <div class="record-top">
            <span class="record-date">{{ formatDate(record.playedAt) }}</span>
          </div>
          <div class="record-bottom">
            <span class="record-details">{{ record.playerCount }} 人局</span>
            <span class="record-dot">&middot;</span>
            <span
              class="record-winner"
              :class="winnerClass(record.winningFaction)"
            >
              {{ winnerLabel(record.winningFaction) }}
            </span>
            <span class="record-dot">&middot;</span>
            <span class="record-duration">{{ record.durationMinutes }} 分鐘</span>
          </div>
        </div>
      </div>

      <button class="btn btn-outline btn-block mt-xl" @click="handleClear">
        清除所有記錄
      </button>
    </section>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon">&#x1F42D;</div>
      <div class="empty-text">還沒有遊戲記錄</div>
      <div class="empty-hint text-muted">開始一場遊戲來留下記錄吧</div>
    </div>
  </div>
</template>

<style scoped>
.history-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.btn-back {
  font-size: var(--font-xl);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
}

.page-title {
  margin-bottom: 0;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  margin-bottom: var(--space-xl);
}

.stat-card {
  text-align: center;
  padding: var(--space-lg) var(--space-sm);
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-xl);
  font-weight: 700;
}

.stat-label {
  font-size: var(--font-xs);
  margin-top: var(--space-xs);
  color: var(--color-text-muted);
}

.villager-color {
  color: var(--color-success);
}

.thief-color {
  color: var(--color-error);
}

/* Records */
.records-section {
  flex: 1;
}

.records-heading {
  font-size: var(--font-md);
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--color-text-secondary);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.record-item {
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.record-top {
  margin-bottom: var(--space-xs);
}

.record-date {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.record-bottom {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-sm);
}

.record-details,
.record-duration {
  color: var(--color-text-secondary);
}

.record-dot {
  color: var(--color-text-muted);
}

.record-winner {
  font-weight: 700;
  font-size: var(--font-xs);
  padding: 2px 10px;
  border-radius: var(--radius-full);
}

.villager-win {
  background: var(--color-success-light);
  color: var(--color-success);
}

.thief-win {
  background: var(--color-error-light);
  color: var(--color-error);
}

.scapegoat-win {
  background: color-mix(in srgb, #AB47BC 12%, transparent);
  color: #AB47BC;
}

/* Empty state */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: var(--space-md);
}

.empty-icon {
  font-size: 80px;
  opacity: 0.4;
  line-height: 1;
}

.empty-text {
  font-size: var(--font-lg);
  font-weight: 700;
}

.empty-hint {
  font-size: var(--font-sm);
}
</style>
