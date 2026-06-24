<script setup lang="ts">
import { computed } from 'vue'
import { DICE_NUMBERS } from '@/types/cheese-thief'

const props = defineProps<{
  currentDice: number
  completedDice: number[]
}>()

const diceNumbers = DICE_NUMBERS

const diceStates = computed(() => {
  return diceNumbers.map((d) => {
    if (props.completedDice.includes(d)) return 'completed'
    if (d === props.currentDice) return 'active'
    return 'pending'
  })
})
</script>

<template>
  <div class="phase-indicator">
    <div
      v-for="(dice, index) in diceNumbers"
      :key="dice"
      class="dice-dot"
      :class="diceStates[index]"
    >
      <span class="dice-number">
        <template v-if="diceStates[index] === 'completed'">&#x2713;</template>
        <template v-else>{{ dice }}</template>
      </span>
      <div
        v-if="index < diceNumbers.length - 1"
        class="dice-connector"
        :class="{ filled: diceStates[index] === 'completed' }"
      />
    </div>
  </div>
</template>

<style scoped>
.phase-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: var(--space-md) 0;
}

.dice-dot {
  display: flex;
  align-items: center;
  position: relative;
}

.dice-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: var(--font-sm);
  transition: all 300ms ease;
  border: 2px solid var(--color-border);
  color: var(--color-text-muted);
  background: var(--color-bg-surface);
}

/* Active: gold accent, larger */
.dice-dot.active .dice-number {
  width: 44px;
  height: 44px;
  font-size: var(--font-md);
  border-color: var(--color-accent, var(--color-primary));
  color: #FFFFFF;
  background: var(--color-accent, var(--color-primary));
  box-shadow: 0 0 12px var(--color-accent, var(--color-primary));
  font-family: 'Space Grotesk', sans-serif;
}

/* Completed: gold checkmark */
.dice-dot.completed .dice-number {
  border-color: var(--color-accent, var(--color-success));
  color: var(--color-accent, var(--color-success));
  background: transparent;
  font-size: var(--font-md);
}

.dice-connector {
  width: 16px;
  height: 2px;
  background: var(--color-border);
  transition: background-color 300ms ease;
}

.dice-connector.filled {
  background: var(--color-accent, var(--color-success));
}
</style>
