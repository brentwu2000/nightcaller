import { ref, computed } from 'vue'
import { useOnwNight } from './useOnwNight'
import { useTts } from '@/composables/useTts'
import { useAudio } from '@/composables/useAudio'
import { useGameHistory } from '@/composables/useGameHistory'
import {
  DEFAULT_ONW_CONFIG,
  determineWinner,
  getWinAnnouncement,
  ONW_ROLES,
} from '@/types/one-night-werewolf'
import type {
  OnwPhase,
  OnwGameConfig,
  OnwGameResult,
  OnwVoteResult,
  OnwRoleId,
} from '@/types/one-night-werewolf'

export function useOnwGame() {
  const phase = ref<OnwPhase>('setup')
  const config = ref<OnwGameConfig>({ ...DEFAULT_ONW_CONFIG })
  const isPaused = ref(false)
  const gameStartTime = ref(0)

  // Discussion timer state
  const discussionRemaining = ref(0)
  const isDiscussionRunning = ref(false)
  let discussionTimerId: ReturnType<typeof setInterval> | null = null

  // Vote countdown state
  const voteCountdown = ref(0)
  const isVoteRunning = ref(false)
  let voteTimerId: ReturnType<typeof setInterval> | null = null

  // Result state
  const gameResult = ref<OnwGameResult | null>(null)

  const audio = useAudio()
  const nightPhase = useOnwNight({
    onSpeakStart: () => audio.pauseForTts(),
    onSpeakEnd: () => audio.resumeAfterTts(),
  })

  const { speak, stop: stopTts } = useTts()
  const { addRecord } = useGameHistory()

  const ttsOptions = computed(() => ({
    rate: config.value.speechRate,
    volume: config.value.speechVolume,
  }))

  // Format time display
  const discussionDisplay = computed(() => {
    const mins = Math.floor(discussionRemaining.value / 60)
    const secs = discussionRemaining.value % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  })

  const isDiscussionLow = computed(() => discussionRemaining.value <= 30 && discussionRemaining.value > 0)

  // === Lifecycle ===

  function startGame(gameConfig: OnwGameConfig): void {
    config.value = { ...gameConfig }
    gameStartTime.value = Date.now()
    gameResult.value = null
    discussionRemaining.value = 0
    voteCountdown.value = 0
    phase.value = 'night'

    audio.unlock()
    audio.setBgmVolume(gameConfig.musicVolume)
    audio.setSfxVolume(gameConfig.sfxVolume)
    audio.loadBgm('night')

    nightPhase
      .startNight(
        gameConfig.selectedRoles,
        gameConfig.speechRate,
        gameConfig.speechVolume,
        gameConfig.nightSilenceSeconds,
      )
      .then(() => {
        if (phase.value === 'night') {
          enterDiscussion()
        }
      })
      .catch(() => {
        if (phase.value === 'night') {
          enterDiscussion()
        }
      })
  }

  // === Discussion Phase ===

  function enterDiscussion(): void {
    audio.stopBgm()
    phase.value = 'discussion'
    discussionRemaining.value = config.value.discussionMinutes * 60
    isDiscussionRunning.value = false
  }

  function startDiscussionTimer(): void {
    if (isDiscussionRunning.value) return
    if (config.value.discussionMinutes === 0) {
      // No timer, discussion is free-form
      return
    }
    isDiscussionRunning.value = true
    discussionTimerId = setInterval(() => {
      if (isPaused.value) return
      discussionRemaining.value--
      if (discussionRemaining.value <= 0) {
        clearDiscussionTimer()
        isDiscussionRunning.value = false
        audio.playSfx('ding')
        speak('討論時間到！準備進入投票階段。', ttsOptions.value).catch(() => { /* continue */ })
      }
    }, 1000)
  }

  function clearDiscussionTimer(): void {
    if (discussionTimerId !== null) {
      clearInterval(discussionTimerId)
      discussionTimerId = null
    }
  }

  function skipToVote(): void {
    clearDiscussionTimer()
    isDiscussionRunning.value = false
    enterVote()
  }

  // === Vote Phase ===

  function enterVote(): void {
    phase.value = 'vote'
    voteCountdown.value = config.value.voteCountdownSeconds
    isVoteRunning.value = false
  }

  function startVoteCountdown(): void {
    if (isVoteRunning.value) return
    isVoteRunning.value = true

    speak('投票倒數開始。', ttsOptions.value).catch(() => { /* continue */ })

    voteTimerId = setInterval(() => {
      voteCountdown.value--
      if (voteCountdown.value <= 0) {
        clearVoteTimer()
        isVoteRunning.value = false
        audio.playSfx('ding')
        speak('指！', { ...ttsOptions.value, rate: (ttsOptions.value.rate ?? 1) * 1.2 }).catch(() => { /* continue */ })
      }
    }, 1000)
  }

  function clearVoteTimer(): void {
    if (voteTimerId !== null) {
      clearInterval(voteTimerId)
      voteTimerId = null
    }
  }

  // === Result Phase ===

  function enterResult(): void {
    phase.value = 'result'
    gameResult.value = null
  }

  async function submitResult(voteResult: OnwVoteResult): Promise<void> {
    const result = determineWinner(voteResult, config.value.selectedRoles)
    gameResult.value = result

    // Play announcement
    const announcement = getWinAnnouncement(result)

    if (result.winner === 'village') {
      audio.playSfx('win')
    } else {
      audio.playSfx('lose')
    }

    await speak(announcement, ttsOptions.value).catch(() => { /* continue */ })

    phase.value = 'finished'

    // Save to history
    const durationMinutes = Math.round((Date.now() - gameStartTime.value) / 60000)
    await addRecord({
      gameTemplate: 'one-night-werewolf',
      playerCount: config.value.playerCount,
      winningFaction: result.winner === 'village' ? 'villager' : 'thief',
      durationMinutes,
      playedAt: new Date(),
    })
  }

  // === Replay Night ===

  function replayNight(): void {
    stopTts()
    clearDiscussionTimer()
    clearVoteTimer()
    phase.value = 'night'
    audio.loadBgm('night')

    nightPhase
      .startNight(
        config.value.selectedRoles,
        config.value.speechRate,
        config.value.speechVolume,
        config.value.nightSilenceSeconds,
      )
      .then(() => {
        if (phase.value === 'night') {
          enterDiscussion()
        }
      })
      .catch(() => {
        if (phase.value === 'night') {
          enterDiscussion()
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
    clearDiscussionTimer()
    clearVoteTimer()
    audio.stopBgm()
    phase.value = 'setup'
    isPaused.value = false
    gameResult.value = null
  }

  function cleanup(): void {
    stopTts()
    nightPhase.abort()
    clearDiscussionTimer()
    clearVoteTimer()
    audio.stopBgm()
  }

  /** Get the role label (Chinese name) for a given role ID */
  function getRoleLabel(roleId: OnwRoleId): string {
    return ONW_ROLES[roleId]?.name ?? roleId
  }

  return {
    phase,
    config,
    isPaused,
    gameResult,
    nightPhase,
    audio,
    // Discussion
    discussionRemaining,
    discussionDisplay,
    isDiscussionRunning,
    isDiscussionLow,
    startDiscussionTimer,
    skipToVote,
    // Vote
    voteCountdown,
    isVoteRunning,
    startVoteCountdown,
    enterResult,
    // Result
    submitResult,
    // Actions
    startGame,
    replayNight,
    pauseGame,
    resumeGame,
    playAgain,
    cleanup,
    getRoleLabel,
  }
}
