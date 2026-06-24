<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const transitionName = computed(() => {
  return route.meta.transition as string ?? 'page'
})
</script>

<template>
  <RouterView v-slot="{ Component }">
    <Transition :name="transitionName" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>

<style>
@import '@/styles/variables.css';
@import '@/styles/base.css';
@import '@/styles/transitions.css';
</style>
