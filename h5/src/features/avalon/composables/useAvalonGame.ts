import { ref, computed } from 'vue'
import { useAvalonNight } from './useAvalonNight'
import { useTts } from '@/composables/useTts'
import { useAudio } from '@/composables/useAudio'
import { useGameHistory } from '@/composables/useGameHistory'
import {
  DEFAULT_AVALON_CONFIG,
  createInitialGameState,
  getMissionSize,
  needsDoubleFail,
  MAX_REJECTS,
} from '@/types/avalon'
import type {
  AvalonPhase,
  AvalonGameConfig,
  AvalonGameState,
  WinSide,
  WinReason,
} from '@/types/avalon'

export function useAvalonGame() {
  const phase = ref<AvalonPhase>('setup')
  const config = ref<AvalonGameConfig>({ ...DEFAULT_AVALON_CONFIG })
  const isPaused = ref(false)
  const gameStartTime = ref(0)
  const gameState = ref<AvalonGameState>(createInitialGameState())

  // Last action for undo support
  const lastAction = ref<{ type: string; timestamp: number } | null>(null)
  const canUndo = computed(() => {
    if (!lastAction.value) return false
    return Date.now() - lastAction.value.timestamp < 3000
  })

  // Win result
  const winResult = ref<{ side: WinSide; reason: WinReason } | null>(null)

  const audio = useAudio()
  const nightPhase = useAvalonNight({
    onSpeakStart: () => audio.pauseForTts(),
    onSpeakEnd: () => audio.resumeAfterTts(),
  })

  const { speak, stop: stopTts } = useTts()
  const { addRecord } = useGameHistory()

  // Computed helpers
  const currentMissionSize = computed(() =>
    getMissionSize(config.value.roles.playerCount, gameState.value.currentRound),
  )

  const isDoubleFailRound = computed(() =>
    needsDoubleFail(config.value.roles.playerCount, gameState.value.currentRound),
  )

  const ttsOptions = computed(() => ({
    rate: config.value.speechRate,
    volume: config.value.speechVolume,
  }))

  // === Lifecycle ===

  function startGame(gameConfig: AvalonGameConfig): void {
    config.value = { ...gameConfig }
    gameStartTime.value = Date.now()
    gameState.value = createInitialGameState()
    winResult.value = null
    lastAction.value = null
    phase.value = 'night'

    audio.unlock()
    audio.setBgmVolume(gameConfig.musicVolume)
    audio.setSfxVolume(gameConfig.sfxVolume)
    audio.loadBgm('night')

    nightPhase
      .startNight(
        gameConfig.roles,
        gameConfig.speechRate,
        gameConfig.speechVolume,
        gameConfig.nightPauseSeconds,
      )
      .then(() => {
        if (phase.value === 'night') {
          enterScoreboard()
        }
      })
      .catch(() => {
        if (phase.value === 'night') {
          enterScoreboard()
        }
      })
  }

  function enterScoreboard(): void {
    audio.stopBgm()
    phase.value = 'scoreboard'
  }

  // === Scoreboard Actions ===

  async function reportMissionSuccess(): Promise<void> {
    if (phase.value !== 'scoreboard') return

    const state = gameState.value
    const round = state.currentRound
    const roundNum = round + 1

    state.missions[round] = 'success'
    state.successCount++
    state.rejectStreak = 0

    lastAction.value = { type: 'mission_success', timestamp: Date.now() }

    audio.playSfx('win')
    await speak(
      `任務結果揭曉——任務成功！好人陣營取得第${roundNum}次勝利。`,
      ttsOptions.value,
    ).catch(() => { /* continue */ })

    if (state.successCount >= 3) {
      await enterAssassinate()
    } else {
      state.currentRound = round + 1
      announceNextRound()
    }
  }

  async function reportMissionFail(): Promise<void> {
    if (phase.value !== 'scoreboard') return

    const state = gameState.value
    const round = state.currentRound
    const roundNum = round + 1

    state.missions[round] = 'fail'
    state.failCount++
    state.rejectStreak = 0

    lastAction.value = { type: 'mission_fail', timestamp: Date.now() }

    audio.playSfx('lose')
    await speak(
      `任務結果揭曉——任務失敗！邪惡陣營破壞了第${roundNum}次任務。`,
      ttsOptions.value,
    ).catch(() => { /* continue */ })

    if (state.failCount >= 3) {
      await finishGame('evil', 'three_missions_fail')
    } else {
      state.currentRound = round + 1
      announceNextRound()
    }
  }

  async function reportReject(): Promise<void> {
    if (phase.value !== 'scoreboard') return

    const state = gameState.value
    state.rejectStreak++

    lastAction.value = { type: 'reject', timestamp: Date.now() }

    if (state.rejectStreak >= MAX_REJECTS) {
      await speak(
        '連續五次否決！邪惡陣營不戰而勝！',
        ttsOptions.value,
      ).catch(() => { /* continue */ })
      await finishGame('evil', 'five_rejects')
    } else if (state.rejectStreak === MAX_REJECTS - 1) {
      await speak(
        `提名被否決。已連續否決${state.rejectStreak}次。警告——若下次提名再次被否決，邪惡陣營將直接獲勝！`,
        ttsOptions.value,
      ).catch(() => { /* continue */ })
    } else {
      await speak(
        `提名被否決。已連續否決${state.rejectStreak}次。`,
        ttsOptions.value,
      ).catch(() => { /* continue */ })
    }
  }

  function undoLastAction(): void {
    if (!canUndo.value || !lastAction.value) return

    const state = gameState.value
    const action = lastAction.value.type

    if (action === 'mission_success') {
      state.successCount--
      state.missions[state.currentRound] = 'pending'
      // currentRound may have already advanced
      if (state.currentRound > 0 && state.missions[state.currentRound] === 'pending') {
        // We advanced the round; undo that too
        const prevRound = state.currentRound - 1
        if (state.missions[prevRound] === 'success') {
          state.missions[prevRound] = 'pending'
          state.currentRound = prevRound
          state.successCount--
        }
      }
    } else if (action === 'mission_fail') {
      state.failCount--
      state.missions[state.currentRound] = 'pending'
      if (state.currentRound > 0 && state.missions[state.currentRound] === 'pending') {
        const prevRound = state.currentRound - 1
        if (state.missions[prevRound] === 'fail') {
          state.missions[prevRound] = 'pending'
          state.currentRound = prevRound
          state.failCount--
        }
      }
    } else if (action === 'reject') {
      state.rejectStreak = Math.max(0, state.rejectStreak - 1)
    }

    lastAction.value = null
    // If we were in finished/assassinate, go back to scoreboard
    if (phase.value === 'finished' || phase.value === 'assassinate') {
      phase.value = 'scoreboard'
      winResult.value = null
    }
  }

  async function announceNextRound(): Promise<void> {
    const state = gameState.value
    const roundNum = state.currentRound + 1
    const size = getMissionSize(config.value.roles.playerCount, state.currentRound)
    const doubleFail = needsDoubleFail(config.value.roles.playerCount, state.currentRound)

    let text = `第${roundNum}輪任務，需要${size}人執行。`
    if (doubleFail) {
      text += '注意，本輪需要兩張失敗牌才算任務失敗。'
    }

    await speak(text, ttsOptions.value).catch(() => { /* continue */ })
  }

  // === Assassinate ===

  async function enterAssassinate(): Promise<void> {
    phase.value = 'assassinate'
    await speak(
      '好人陣營完成了三次任務！然而，黑暗尚未散去。刺客，這是你最後的機會。與你的同伴商議，找出梅林。',
      ttsOptions.value,
    ).catch(() => { /* continue */ })
  }

  async function reportAssassinateResult(success: boolean): Promise<void> {
    if (phase.value !== 'assassinate') return

    if (success) {
      audio.playSfx('lose')
      await speak(
        '梅林被識破！邪惡陣營逆轉勝利！黑暗，籠罩了卡美洛。',
        ttsOptions.value,
      ).catch(() => { /* continue */ })
      await finishGame('evil', 'assassinate_success')
    } else {
      audio.playSfx('win')
      await speak(
        '刺殺失敗！好人陣營最終獲勝！亞瑟的騎士，守護了卡美洛的榮光。',
        ttsOptions.value,
      ).catch(() => { /* continue */ })
      await finishGame('good', 'assassinate_fail')
    }
  }

  // === Finish ===

  async function finishGame(side: WinSide, reason: WinReason): Promise<void> {
    winResult.value = { side, reason }
    phase.value = 'finished'

    const durationMinutes = Math.round((Date.now() - gameStartTime.value) / 60000)

    await addRecord({
      gameTemplate: 'avalon',
      playerCount: config.value.roles.playerCount,
      winningFaction: side === 'good' ? 'villager' : 'thief',
      durationMinutes,
      playedAt: new Date(),
    })
  }

  // === Replay Night ===

  function replayNight(): void {
    stopTts()
    phase.value = 'night'
    audio.loadBgm('night')

    nightPhase
      .startNight(
        config.value.roles,
        config.value.speechRate,
        config.value.speechVolume,
        config.value.nightPauseSeconds,
      )
      .then(() => {
        if (phase.value === 'night') {
          enterScoreboard()
        }
      })
      .catch(() => {
        if (phase.value === 'night') {
          enterScoreboard()
        }
      })
  }

  // === Pause / Resume ===

  function pauseGame(): void {
    isPaused.value = true
    nightPhase.pause()
    audio.pauseAll()
  }

  function resumeGame(): void {
    isPaused.value = false
    nightPhase.resume()
    audio.resumeAll()
  }

  // === Play Again / Cleanup ===

  function playAgain(): void {
    stopTts()
    nightPhase.abort()
    audio.stopBgm()
    phase.value = 'setup'
    isPaused.value = false
    gameState.value = createInitialGameState()
    winResult.value = null
    lastAction.value = null
  }

  function cleanup(): void {
    stopTts()
    nightPhase.abort()
    audio.stopBgm()
  }

  return {
    phase,
    config,
    isPaused,
    gameState,
    winResult,
    canUndo,
    currentMissionSize,
    isDoubleFailRound,
    nightPhase,
    audio,
    startGame,
    reportMissionSuccess,
    reportMissionFail,
    reportReject,
    undoLastAction,
    reportAssassinateResult,
    replayNight,
    pauseGame,
    resumeGame,
    playAgain,
    cleanup,
  }
}
