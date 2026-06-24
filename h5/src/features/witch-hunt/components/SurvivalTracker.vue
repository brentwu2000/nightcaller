<script setup lang="ts">
import { computed } from 'vue'
import type { SalemSurvival } from '@/types/witch-hunt'

const props = defineProps<{
  survival: SalemSurvival
  currentRound: number
}>()

const hasInfo = computed(() =>
  props.survival.revealedWitches > 0 || props.survival.deadVillagers > 0,
)
</script>

<template>
  <div class="survival-tracker">
    <div class="tracker-header">
      <span class="tracker-round">第 {{ currentRound }} 回合</span>
      <span class="tracker-alive">存活 {{ survival.alivePlayers }} 人</span>
    </div>

    <div class="alive-display">
      <span class="alive-icon">&#x1F3D8;</span>
      <span class="alive-count">{{ survival.alivePlayers }}</span>
      <span class="alive-label">存活居民</span>
    </div>

    <!-- Public info only -->
    <div v-if="hasInfo" class="info-row">
      <span v-if="survival.revealedWitches > 0" class="info-tag info-tag--revealed">
        &#x2620; 已揭露巫師 {{ survival.revealedWitches }}
      </span>
      <span v-if="survival.deadVillagers > 0" class="info-tag info-tag--dead">
        &#x1F480; 死亡村民 {{ survival.deadVillagers }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.survival-tracker {
  width: 100%;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--color-border);
}

.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.tracker-round {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-text-muted);
}

.tracker-alive {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.alive-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md) 0;
}

.alive-icon {
  font-size: 32px;
  line-height: 1;
}

.alive-count {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-display);
  font-weight: 800;
  line-height: 1;
  color: var(--color-text);
}

.alive-label {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

/* Info row */
.info-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.info-tag {
  font-size: var(--font-xs);
  font-weight: 600;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
}

.info-tag--revealed {
  background: rgba(123, 31, 162, 0.1);
  color: #7B1FA2;
}

.info-tag--dead {
  background: rgba(21, 101, 192, 0.1);
  color: #1565C0;
}
</style>
