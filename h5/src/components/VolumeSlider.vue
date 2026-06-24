<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number
  label: string
  min?: number
  max?: number
  step?: number
  icon?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const minVal = computed(() => props.min ?? 0)
const maxVal = computed(() => props.max ?? 1)
const stepVal = computed(() => props.step ?? 0.1)

const displayValue = computed(() => {
  return Math.round(props.modelValue * 100)
})

const progressPercent = computed(() => {
  const range = maxVal.value - minVal.value
  if (range === 0) return 0
  return ((props.modelValue - minVal.value) / range) * 100
})

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', parseFloat(target.value))
}
</script>

<template>
  <div class="volume-slider">
    <div class="slider-header">
      <span class="slider-label">
        <span v-if="icon" class="slider-icon" v-html="icon"></span>
        {{ label }}
      </span>
      <span class="slider-value">{{ displayValue }}%</span>
    </div>
    <div class="slider-track-wrapper">
      <input
        type="range"
        :value="modelValue"
        :min="minVal"
        :max="maxVal"
        :step="stepVal"
        class="slider-input"
        :style="{ '--progress': `${progressPercent}%` }"
        @input="onInput"
      />
    </div>
  </div>
</template>

<style scoped>
.volume-slider {
  width: 100%;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.slider-label {
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.slider-icon {
  font-size: var(--font-md);
}

.slider-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
  min-width: 40px;
  text-align: right;
}

.slider-track-wrapper {
  position: relative;
}

.slider-input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: var(--radius-full);
  outline: none;
  background: linear-gradient(
    to right,
    var(--color-primary) 0%,
    var(--color-primary) var(--progress),
    var(--color-border) var(--progress),
    var(--color-border) 100%
  );
}

.slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: 3px solid var(--color-bg-surface);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.slider-input::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  border: 3px solid var(--color-bg-surface);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.slider-input::-moz-range-track {
  height: 6px;
  background: transparent;
  border-radius: var(--radius-full);
}
</style>
