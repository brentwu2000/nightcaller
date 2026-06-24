import { ref, computed } from 'vue'
import { useTts } from '@/composables/useTts'
import type { SalemNightStep, SalemGameConfig } from '@/types/witch-hunt'

export interface NightPhaseHooks {
  onSpeakStart?: () => void
  onSpeakEnd?: () => void
}

export function useWitchHuntNight(hooks: NightPhaseHooks = {}) {
  const { speak: rawSpeak, stop: stopTts, isSpeaking } = useTts()

  const currentStep = ref<SalemNightStep>('idle')
  const isCompleted = ref(false)
  const isPaused = ref(false)

  let skipResolve: (() => void) | null = null
  let pausePromiseResolve: (() => void) | null = null
  let aborted = false

  const nightState = computed(() => ({
    currentStep: currentStep.value,
    isCompleted: isCompleted.value,
    isPaused: isPaused.value,
  }))

  async function speak(text: string, options?: { rate?: number; volume?: number }): Promise<void> {
    hooks.onSpeakStart?.()
    try {
      await rawSpeak(text, options)
    } finally {
      hooks.onSpeakEnd?.()
    }
  }

  function delay(ms: number): Promise<void> {
    if (aborted) return Promise.resolve()
    return new Promise((resolve) => {
      const id = setTimeout(resolve, ms)
      skipResolve = () => {
        clearTimeout(id)
        resolve()
      }
    })
  }

  async function waitWhilePaused(): Promise<void> {
    if (!isPaused.value) return
    return new Promise((resolve) => {
      pausePromiseResolve = resolve
    })
  }

  async function startNight(
    config: SalemGameConfig,
    round: number,
  ): Promise<void> {
    aborted = false
    isCompleted.value = false
    isPaused.value = false
    currentStep.value = 'opening'

    const ttsOpts = { rate: config.speechRate, volume: config.speechVolume }
    const witchMs = config.nightWitchSeconds * 1000
    const guardianMs = config.nightGuardianSeconds * 1000

    // === Opening ===
    await speak(`第${round}個夜晚。夜幕降臨薩勒姆。請所有人閉上眼睛。`, ttsOpts)
    await delay(2000)
    if (aborted) return

    await speak('深呼吸。黑暗中，有人正在謀劃。', ttsOpts)
    await delay(1500)
    if (aborted) return

    // === Witch Kill ===
    await waitWhilePaused()
    if (aborted) return
    currentStep.value = 'witch'

    await speak('巫師們，請睜開眼睛。', ttsOpts)
    await delay(1500)
    if (aborted) return

    await speak('確認你的同伴。現在，從角色卡組中選出你們要殺害的目標。請一致決定，並將那張卡面朝下放好。', ttsOpts)
    await delay(witchMs)
    if (aborted) return

    await speak('巫師們，請閉上眼睛。', ttsOpts)
    await delay(1500)
    if (aborted) return

    // === Guardian (if enabled) ===
    if (config.hasGuardian) {
      await waitWhilePaused()
      if (aborted) return
      currentStep.value = 'guardian'

      await speak('守護者，請睜開眼睛。', ttsOpts)
      await delay(1000)
      if (aborted) return

      await speak('你感受到了黑暗的氣息。請從角色卡組中選出你要守護的對象。你也可以選擇守護自己。', ttsOpts)
      await delay(guardianMs)
      if (aborted) return

      await speak('守護者，請閉上眼睛。', ttsOpts)
      await delay(1500)
      if (aborted) return
    }

    // === Done ===
    await delay(1500)
    currentStep.value = 'idle'
    isCompleted.value = true
  }

  function pause(): void {
    isPaused.value = true
  }

  function resume(): void {
    isPaused.value = false
    if (pausePromiseResolve) {
      pausePromiseResolve()
      pausePromiseResolve = null
    }
  }

  function skip(): void {
    stopTts()
    if (skipResolve) {
      skipResolve()
      skipResolve = null
    }
  }

  function abort(): void {
    aborted = true
    isPaused.value = false
    currentStep.value = 'idle'
    stopTts()
    if (skipResolve) {
      skipResolve()
      skipResolve = null
    }
    if (pausePromiseResolve) {
      pausePromiseResolve()
      pausePromiseResolve = null
    }
  }

  return {
    nightState,
    currentStep,
    isCompleted,
    isPaused,
    isSpeaking,
    startNight,
    pause,
    resume,
    skip,
    abort,
  }
}
