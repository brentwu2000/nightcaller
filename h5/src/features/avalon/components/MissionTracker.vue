<script setup lang="ts">
import { computed } from 'vue'
import type { MissionResult } from '@/types/avalon'

const props = defineProps<{
  missions: MissionResult[]
  currentRound: number
  missionSizes: number[]
  doubleFailRounds: boolean[]
}>()

const shields = computed(() =>
  props.missions.map((result, i) => ({
    index: i,
    result,
    size: props.missionSizes[i] ?? 0,
    doubleFail: props.doubleFailRounds[i] ?? false,
    isCurrent: i === props.currentRound && result === 'pending',
  })),
)
</script>

<template>
  <div class="mission-tracker">
    <div
      v-for="shield in shields"
      :key="shield.index"
      class="mission-shield"
      :class="{
        'mission-shield--success': shield.result === 'success',
        'mission-shield--fail': shield.result === 'fail',
        'mission-shield--current': shield.isCurrent,
      }"
    >
      <span class="shield-size">{{ shield.size }}</span>
      <span v-if="shield.result === 'success'" class="shield-icon">&#x2714;</span>
      <span v-else-if="shield.result === 'fail'" class="shield-icon">&#x2716;</span>
      <span v-if="shield.doubleFail" class="shield-double">2F</span>
    </div>
  </div>
</template>

<style scoped>
.mission-tracker {
  display: flex;
  justify-content: center;
  gap: var(--space-sm);
}

.mission-shield {
  width: 52px;
  height: 60px;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  background: var(--color-bg-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  position: relative;
  transition: all var(--anim-fast) ease;
}

.mission-shield--success {
  border-color: #1565C0;
  background: rgba(21, 101, 192, 0.15);
}

.mission-shield--fail {
  border-color: #C62828;
  background: rgba(198, 40, 40, 0.15);
}

.mission-shield--current {
  border-color: var(--color-primary);
  box-shadow: 0 0 12px rgba(91, 106, 191, 0.4);
}

.shield-size {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-text);
}

.mission-shield--success .shield-size {
  color: #1565C0;
}

.mission-shield--fail .shield-size {
  color: #C62828;
}

.shield-icon {
  font-size: var(--font-xs);
  line-height: 1;
}

.mission-shield--success .shield-icon {
  color: #1565C0;
}

.mission-shield--fail .shield-icon {
  color: #C62828;
}

.shield-double {
  position: absolute;
  bottom: -8px;
  font-size: 10px;
  font-weight: 700;
  color: #C62828;
  background: var(--color-bg-card);
  padding: 0 4px;
  border-radius: 4px;
}
</style>
