<script setup lang="ts">
import { computed } from 'vue'
import { MAX_REJECTS } from '@/types/avalon'

const props = defineProps<{
  rejectStreak: number
}>()

const dots = computed(() =>
  Array.from({ length: MAX_REJECTS }, (_, i) => ({
    index: i,
    active: i < props.rejectStreak,
    isLast: i === MAX_REJECTS - 1,
  })),
)
</script>

<template>
  <div class="reject-counter">
    <span class="reject-label">連續否決</span>
    <div class="reject-dots">
      <span
        v-for="dot in dots"
        :key="dot.index"
        class="reject-dot"
        :class="{
          'reject-dot--active': dot.active,
          'reject-dot--danger': dot.active && dot.isLast,
        }"
      ></span>
    </div>
  </div>
</template>

<style scoped>
.reject-counter {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.reject-label {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  font-weight: 600;
}

.reject-dots {
  display: flex;
  gap: var(--space-sm);
}

.reject-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-border);
  transition: all var(--anim-fast) ease;
}

.reject-dot--active {
  background: #E65100;
}

.reject-dot--danger {
  background: #C62828;
  box-shadow: 0 0 8px rgba(198, 40, 40, 0.5);
}
</style>
