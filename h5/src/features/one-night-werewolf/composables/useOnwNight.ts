import { ref, computed } from 'vue'
import { useTts } from '@/composables/useTts'
import type { OnwNightStep, OnwRoleId } from '@/types/one-night-werewolf'
import { getNightActionSequence } from '@/types/one-night-werewolf'

export interface NightPhaseHooks {
  onSpeakStart?: () => void
  onSpeakEnd?: () => void
}

export function useOnwNight(hooks: NightPhaseHooks = {}) {
  const { speak: rawSpeak, stop: stopTts, isSpeaking } = useTts()

  const currentStep = ref<OnwNightStep>('idle')
  const isCompleted = ref(false)
  const isPaused = ref(false)
  const totalSteps = ref(0)
  const completedSteps = ref(0)

  let skipResolve: (() => void) | null = null
  let pausePromiseResolve: (() => void) | null = null
  let aborted = false

  const nightState = computed(() => ({
    currentStep: currentStep.value,
    isCompleted: isCompleted.value,
    isPaused: isPaused.value,
    totalSteps: totalSteps.value,
    completedSteps: completedSteps.value,
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

  async function speakRole(
    roleStep: OnwNightStep,
    text: string,
    ttsOpts: { rate: number; volume: number },
    silenceMs: number,
  ): Promise<void> {
    await waitWhilePaused()
    if (aborted) return
    currentStep.value = roleStep
    await speak(text, ttsOpts)
    await delay(silenceMs)
    if (aborted) return
    completedSteps.value++
  }

  async function startNight(
    selectedRoles: OnwRoleId[],
    speechRate: number,
    speechVolume: number,
    silenceSeconds: number,
  ): Promise<void> {
    aborted = false
    isCompleted.value = false
    isPaused.value = false
    completedSteps.value = 0

    const ttsOpts = { rate: speechRate, volume: speechVolume }
    const silenceMs = silenceSeconds * 1000
    const sequence = getNightActionSequence(selectedRoles)
    const hasDoppelganger = selectedRoles.includes('doppelganger')

    // Calculate total steps: opening + each role + closing
    totalSteps.value = sequence.length + 2 // opening + closing

    // 化身幽靈在開場複製後立刻行動。對於「跟群組一起醒 / 最後才動」的角色
    // （狼人、爪牙、守夜人、失眠者），喚醒時直接點名化身為該角色的幽靈，
    // 讓他第一時間就睜眼，不會漏掉自己的環節。
    const wake = (roleLabel: string): string =>
      hasDoppelganger ? `${roleLabel}、以及化身為${roleLabel}的幽靈` : roleLabel

    // === Opening ===
    currentStep.value = 'opening'
    await speak('天黑請閉眼。', ttsOpts)
    await delay(1000)
    if (aborted) return
    completedSteps.value++

    // === Role actions in order ===
    for (const roleId of sequence) {
      if (aborted) return

      switch (roleId) {
        case 'doppelganger':
          await speakRole(
            'doppelganger',
            '化身幽靈，請睜開眼睛。悄悄查看另一名玩家的角色牌，記住你看到的角色，你將扮演那個角色。如果你複製到的是強盜、搗蛋鬼、酒鬼或預言家這類需要立刻行動的角色，現在就以該身份悄悄完成行動。如果你複製的是其他角色，待會輪到那個角色時會再提醒你一同行動。完成後把牌放回原位，化身幽靈，請閉上眼睛。',
            ttsOpts,
            Math.max(silenceMs, 7000),
          )
          break

        case 'werewolf':
          // App 無法得知實際發牌（玩家牌 vs 中間牌），因此一律念出涵蓋所有情況的話術：
          // 多隻狼人會看到彼此；孤狼看不到同伴，可翻一張中間牌。
          // 若有化身幽靈，開頭直接點名，讓複製成狼人的幽靈第一時間就睜眼。
          await speakRole(
            'werewolf',
            `${wake('狼人')}，請睜開眼睛，確認彼此的身份。如果你環顧四周，發現自己是唯一的狼人，沒有看到任何同伴，你可以悄悄翻開一張中間牌查看，看完後把牌蓋回原位。`,
            ttsOpts,
            silenceMs,
          )
          await waitWhilePaused()
          if (aborted) return
          await speak(`${wake('狼人')}，請閉上眼睛。`, ttsOpts)
          await delay(1000)
          break

        case 'minion':
          await speakRole(
            'minion',
            `${wake('爪牙')}，請睜開眼睛。狼人們，請伸出你們的拇指，讓爪牙確認你們的身份。`,
            ttsOpts,
            silenceMs,
          )
          await waitWhilePaused()
          if (aborted) return
          await speak(`狼人，收回拇指。${wake('爪牙')}，請閉上眼睛。`, ttsOpts)
          await delay(1000)
          break

        case 'mason':
          await speakRole(
            'mason',
            `${wake('守夜人')}，請睜開眼睛，確認彼此的身份。如果你是唯一的守夜人，沒有看到同伴，請記住這個資訊。`,
            ttsOpts,
            silenceMs,
          )
          await waitWhilePaused()
          if (aborted) return
          await speak(`${wake('守夜人')}，請閉上眼睛。`, ttsOpts)
          await delay(1000)
          break

        case 'seer':
          await speakRole(
            'seer',
            '預言家，請睜開眼睛。你可以選擇以下其中一種行動：一、悄悄查看另一名玩家的角色牌；二、悄悄查看中間的兩張牌。查看完畢後，把牌放回原位。',
            ttsOpts,
            Math.max(silenceMs, 7000),
          )
          await waitWhilePaused()
          if (aborted) return
          await speak('預言家，請閉上眼睛。', ttsOpts)
          await delay(1000)
          break

        case 'robber':
          await speakRole(
            'robber',
            '強盜，請睜開眼睛。你可以選擇一名玩家，將他的角色牌與你面前的角色牌交換。交換後，查看你拿到的新角色牌，這就是你現在的身份。若選擇不行動，也可以保留原本的牌。',
            ttsOpts,
            Math.max(silenceMs, 6000),
          )
          await waitWhilePaused()
          if (aborted) return
          await speak('強盜，請閉上眼睛。', ttsOpts)
          await delay(1000)
          break

        case 'troublemaker':
          await speakRole(
            'troublemaker',
            '搗蛋鬼，請睜開眼睛。你可以選擇兩名其他玩家，悄悄交換他們面前的角色牌。注意，你不能查看這兩張牌的內容。若選擇不行動，也可以不交換。',
            ttsOpts,
            Math.max(silenceMs, 6000),
          )
          await waitWhilePaused()
          if (aborted) return
          await speak('搗蛋鬼，請閉上眼睛。', ttsOpts)
          await delay(1000)
          break

        case 'drunk':
          await speakRole(
            'drunk',
            '酒鬼，請睜開眼睛。你必須將你面前的角色牌與一張中間牌交換。注意，你不能查看你換到的新牌。請悄悄完成交換。',
            ttsOpts,
            silenceMs,
          )
          await waitWhilePaused()
          if (aborted) return
          await speak('酒鬼，請閉上眼睛。', ttsOpts)
          await delay(1000)
          break

        case 'insomniac':
          await speakRole(
            'insomniac',
            `${wake('失眠者')}，請睜開眼睛。查看你面前的角色牌，確認你現在持有的是什麼角色。如果牌被換了，你會看到新的角色。`,
            ttsOpts,
            silenceMs,
          )
          await waitWhilePaused()
          if (aborted) return
          await speak(`${wake('失眠者')}，請閉上眼睛。`, ttsOpts)
          await delay(1000)
          break
      }
    }

    // === Closing ===
    await waitWhilePaused()
    if (aborted) return
    currentStep.value = 'closing'
    await speak(
      '天亮了，所有人請睜開眼睛。一個夜晚過去了。現在是白天，你們有時間互相討論，找出你們認為的狼人。記住：你面前的牌可能在夜晚被別人交換了。討論結束後，所有人將同時投票。白天討論，現在開始。',
      ttsOpts,
    )
    await delay(1000)
    completedSteps.value++

    currentStep.value = 'completed'
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
    totalSteps,
    completedSteps,
    startNight,
    pause,
    resume,
    skip,
    abort,
  }
}
