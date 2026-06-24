import { ref, computed } from 'vue'
import { useTts } from '@/composables/useTts'
import { useTimer } from '@/composables/useTimer'
import {
  DICE_NUMBERS,
  getRoleComposition,
  hasAccomplicePhase,
} from '@/types/cheese-thief'
import type { GameConfig, NightState, NightSubPhase } from '@/types/cheese-thief'

export interface NightPhaseHooks {
  onSpeakStart?: () => void
  onSpeakEnd?: () => void
  onCountdownTick?: (remaining: number) => void
}

export function useNightPhase(hooks: NightPhaseHooks = {}) {
  const { speak: rawSpeak, stop: stopTts, isSpeaking } = useTts()

  const currentDiceNumber = ref(0)
  const isCompleted = ref(false)
  const isPaused = ref(false)
  const completedDice = ref<number[]>([])
  const subPhase = ref<NightSubPhase>('idle')

  let skipResolve: (() => void) | null = null
  let pausePromiseResolve: (() => void) | null = null
  let aborted = false

  let timerCompleteResolve: (() => void) | null = null

  const timer = useTimer({
    onTick(remaining: number) {
      hooks.onCountdownTick?.(remaining)
    },
    onComplete() {
      if (timerCompleteResolve) {
        timerCompleteResolve()
        timerCompleteResolve = null
      }
    },
  })

  const nightState = computed<NightState>(() => ({
    currentDiceNumber: currentDiceNumber.value,
    remainingSeconds: timer.remaining.value,
    isCompleted: isCompleted.value,
    isPaused: isPaused.value,
    subPhase: subPhase.value,
  }))

  /** Speak with duck/unduck hooks for BGM masking */
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

  function waitForCountdown(seconds: number): Promise<void> {
    if (aborted) return Promise.resolve()
    return new Promise((resolve) => {
      timerCompleteResolve = resolve
      timer.startCountdown(seconds)

      skipResolve = () => {
        timerCompleteResolve = null
        timer.reset()
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

  async function startNight(config: GameConfig): Promise<void> {
    aborted = false
    isCompleted.value = false
    isPaused.value = false
    currentDiceNumber.value = 0
    completedDice.value = []
    subPhase.value = 'dice'

    const ttsOptions = {
      rate: config.speechRate,
      volume: config.speechVolume,
    }

    const roles = getRoleComposition(config.playerCount)
    const accompliceCount = roles.accomplice

    // Opening announcement
    await speak('請所有人閉上眼睛，夜晚降臨了', ttsOptions)
    await delay(1000)

    if (aborted) return

    // Call each dice number
    for (const dice of DICE_NUMBERS) {
      if (aborted) return

      await waitWhilePaused()
      if (aborted) return

      currentDiceNumber.value = dice
      await speak(`骰子數字是 ${dice} 的玩家，請睜開眼睛`, ttsOptions)

      if (aborted) return

      await waitWhilePaused()
      if (aborted) return

      // Wait countdown — BGM at full volume here to mask sounds
      await waitForCountdown(config.nightSecondsPerDice)

      if (aborted) return

      await speak('請閉上眼睛', ttsOptions)
      completedDice.value = [...completedDice.value, dice]

      await delay(500)
    }

    if (aborted) return

    // Accomplice selection phase (5+ players)
    if (hasAccomplicePhase(config.playerCount) && accompliceCount > 0) {
      subPhase.value = 'accomplice'
      currentDiceNumber.value = 0

      await waitWhilePaused()
      if (aborted) return

      const countText = accompliceCount === 1 ? '一位共犯' : `${accompliceCount}位共犯`

      await speak('現在進入共犯選擇環節。請所有人伸出右手', ttsOptions)
      if (aborted) return

      await speak(`奶酪大盜，請睜開眼睛，選擇${countText}，輕輕觸碰他的手背`, ttsOptions)
      if (aborted) return

      await waitWhilePaused()
      if (aborted) return

      // Wait for accomplice selection — BGM masks touching sounds
      await waitForCountdown(config.nightSecondsPerDice)
      if (aborted) return

      if (config.playerCount === 7) {
        // 7 人：共犯不知道大盜身份，但共犯之間互相確認
        await speak('大盜請閉上眼睛。被觸碰手背的玩家，你們已成為共犯，但你們不知道大盜是誰。共犯請睜開眼睛，互相確認身份', ttsOptions)
        if (aborted) return

        await waitForCountdown(config.nightSecondsPerDice)
        if (aborted) return

        await speak('共犯請閉上眼睛', ttsOptions)
      } else {
        // 5-6 人、8 人：共犯與大盜互相確認身份（相認）
        const confirmText = accompliceCount === 1
          ? '被觸碰手背的玩家，你已成為共犯。請睜開眼睛，與大盜互相確認身份'
          : '被觸碰手背的玩家，你們已成為共犯。請睜開眼睛，與大盜互相確認身份'
        await speak(confirmText, ttsOptions)
        if (aborted) return

        await waitForCountdown(config.nightSecondsPerDice)
        if (aborted) return

        await speak('共犯和大盜，請閉上眼睛', ttsOptions)
      }

      await delay(500)
    }

    if (aborted) return

    // Morning announcement
    subPhase.value = 'idle'
    await speak('天亮了，請所有人睜開眼睛', ttsOptions)
    isCompleted.value = true
  }

  function pause(): void {
    isPaused.value = true
    timer.pause()
  }

  function resume(): void {
    isPaused.value = false
    timer.resume()
    if (pausePromiseResolve) {
      pausePromiseResolve()
      pausePromiseResolve = null
    }
  }

  function skip(): void {
    if (skipResolve) {
      skipResolve()
      skipResolve = null
    }
  }

  function abort(): void {
    aborted = true
    isPaused.value = false
    subPhase.value = 'idle'
    stopTts()
    timer.reset()
    timerCompleteResolve = null
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
    currentDiceNumber,
    isCompleted,
    isPaused,
    isSpeaking,
    completedDice,
    subPhase,
    timer,
    startNight,
    pause,
    resume,
    skip,
    abort,
  }
}
