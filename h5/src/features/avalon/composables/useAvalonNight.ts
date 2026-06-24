import { ref, computed } from 'vue'
import { useTts } from '@/composables/useTts'
import type { AvalonRoleConfig, AvalonNightStep } from '@/types/avalon'

export interface NightPhaseHooks {
  onSpeakStart?: () => void
  onSpeakEnd?: () => void
}

export function useAvalonNight(hooks: NightPhaseHooks = {}) {
  const { speak: rawSpeak, stop: stopTts, isSpeaking } = useTts()

  const currentStep = ref<AvalonNightStep>('idle')
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
    roleConfig: AvalonRoleConfig,
    speechRate: number,
    speechVolume: number,
    pauseSeconds: number,
  ): Promise<void> {
    aborted = false
    isCompleted.value = false
    isPaused.value = false
    currentStep.value = 'opening'

    const ttsOpts = { rate: speechRate, volume: speechVolume }
    const pauseMs = pauseSeconds * 1000

    // === Opening ===
    await speak('所有人閉上眼睛。夜晚降臨。', ttsOpts)
    await delay(1500)
    if (aborted) return

    // === Evil reveal ===
    await waitWhilePaused()
    if (aborted) return
    currentStep.value = 'evil_reveal'

    if (roleConfig.hasOberon) {
      await speak(
        '邪惡陣營——奧伯倫除外——請睜開眼睛，確認彼此的身份。',
        ttsOpts,
      )
    } else {
      await speak(
        '邪惡陣營成員，請睜開眼睛，確認彼此的身份。',
        ttsOpts,
      )
    }
    await delay(pauseMs)
    if (aborted) return
    await speak('邪惡陣營，請閉上眼睛。', ttsOpts)
    await delay(1000)
    if (aborted) return

    // === Merlin reveal ===
    await waitWhilePaused()
    if (aborted) return
    currentStep.value = 'merlin_reveal'

    await speak('梅林，請睜開眼睛。', ttsOpts)
    await delay(500)
    if (aborted) return

    if (roleConfig.hasMordred) {
      await speak(
        '邪惡陣營成員——莫德雷德除外——請伸出拇指。',
        ttsOpts,
      )
    } else {
      await speak(
        '邪惡陣營成員，請伸出拇指。',
        ttsOpts,
      )
    }
    await delay(pauseMs)
    if (aborted) return
    await speak('收回拇指。梅林，請閉上眼睛。', ttsOpts)
    await delay(1000)
    if (aborted) return

    // === Percival reveal (conditional) ===
    if (roleConfig.hasPercival) {
      await waitWhilePaused()
      if (aborted) return
      currentStep.value = 'percival_reveal'

      await speak('派西維爾，請睜開眼睛。', ttsOpts)
      await delay(500)
      if (aborted) return

      if (roleConfig.hasMorgana) {
        await speak(
          '梅林與莫甘娜，請伸出拇指。',
          ttsOpts,
        )
      } else {
        await speak(
          '梅林，請伸出拇指。',
          ttsOpts,
        )
      }
      await delay(pauseMs)
      if (aborted) return
      await speak('收回拇指。派西維爾，請閉上眼睛。', ttsOpts)
      await delay(1000)
      if (aborted) return
    }

    // === Closing ===
    await waitWhilePaused()
    if (aborted) return
    currentStep.value = 'closing'

    await speak('天亮了，所有人請睜開眼睛。', ttsOpts)
    await delay(500)
    if (aborted) return
    await speak('第一位隊長，請開始提名你的任務隊伍。', ttsOpts)

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
