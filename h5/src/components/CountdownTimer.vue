<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  remaining: number
  total: number
  size?: 'md' | 'lg' | 'xl'
  showProgress?: boolean
  urgentThreshold?: number
}>()

const formattedTime = computed(() => {
  const mins = Math.floor(props.remaining / 60)
  const secs = props.remaining % 60
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `${secs}`
})

const progress = computed(() => {
  if (props.total === 0) return 0
  return 1 - props.remaining / props.total
})

const isUrgent = computed(() => {
  const threshold = props.urgentThreshold ?? 10
  return props.remaining <= threshold && props.remaining > 0
})

const sizeClass = computed(() => {
  switch (props.size) {
    case 'xl': return 'timer-xl'
    case 'lg': return 'timer-lg'
    default: return 'timer-md'
  }
})
</script>

<template>
  <div class="countdown-timer" :class="[sizeClass, { urgent: isUrgent }]">
    <div class="timer-display" :class="{ urgency: isUrgent }">
      {{ formattedTime }}
    </div>
    <div v-if="showProgress" class="timer-progress">
      <div
        class="timer-progress-bar"
        :class="{ 'progress-glow': !isUrgent }"
        :style="{ width: `${progress * 100}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.countdown-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  width: 100%;
}

.timer-display {
  font-family: 'Space Grotesk', sans-serif;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--color-text);
  transition: color 300ms ease;
}

.timer-md .timer-display {
  font-size: var(--font-display);
}

.timer-lg .timer-display {
  font-size: var(--font-hero);
}

.timer-xl .timer-display {
  font-size: var(--font-mega);
}

.timer-progress {
  width: 100%;
  max-width: 280px;
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.timer-progress-bar {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 1s linear;
}

.urgent .timer-progress-bar {
  background: var(--color-error);
}
</style>
