import { ref, computed } from 'vue'
import { useNightPhase } from './useNightPhase'
import { useTts } from '@/composables/useTts'
import { useTimer } from '@/composables/useTimer'
import { useAudio } from '@/composables/useAudio'
import { useGameHistory } from '@/composables/useGameHistory'
import {
  DEFAULT_GAME_CONFIG,
  getRoleComposition,
} from '@/types/cheese-thief'
import type {
  GamePhase,
  GameConfig,
  WinningFaction,
  RoleComposition,
} from '@/types/cheese-thief'

export function useCheeseThiefGame() {
  const phase = ref<GamePhase>('setup')
  const config = ref<GameConfig>({ ...DEFAULT_GAME_CONFIG })
  const isPaused = ref(false)
  const gameStartTime = ref(0)

  const audio = useAudio()

  // Night phase with hooks:
  // - pauseForTts/resumeAfterTts: fully pause Howler + suspend AudioContext during TTS
  //   so Web Speech API and Web Audio don't compete on mobile
  // - tick: play tick SFX each countdown second (suppressed during TTS automatically)
  const nightPhase = useNightPhase({
    onSpeakStart: () => audio.pauseForTts(),
    onSpeakEnd: () => audio.resumeAfterTts(),
    onCountdownTick: () => audio.playSfx('tick'),
  })

  const { speak, stop: stopTts } = useTts()
  const discussionTimer = useTimer()
  const votingTimer = useTimer()
  const { addRecord } = useGameHistory()

  const roleComposition = computed<RoleComposition>(() =>
    getRoleComposition(config.value.playerCount)
  )

  const currentTimer = computed(() => {
    if (phase.value === 'discussion') return discussionTimer
    if (phase.value === 'voting') return votingTimer
    return nightPhase.timer
  })

  function startGame(gameConfig: GameConfig): void {
    config.value = { ...gameConfig }
    gameStartTime.value = Date.now()
    phase.value = 'night'

    // Unlock AudioContext within this user gesture (button click).
    // On mobile, AudioContext starts suspended and needs a user gesture to activate.
    // This must happen before any Howler playback or TTS.
    audio.unlock()

    audio.setBgmVolume(gameConfig.musicVolume)
    audio.setSfxVolume(gameConfig.sfxVolume)
    // Load BGM but don't play yet — BGM auto-starts when resumeAfterTts()
    // is called after the first TTS finishes.
    audio.loadBgm('night')

    nightPhase.startNight(gameConfig).then(() => {
      if (phase.value === 'night') {
        nextPhase()
      }
    }).catch(() => {
      // TTS error — still advance so the game doesn't get stuck
      if (phase.value === 'night') {
        nextPhase()
      }
    })
  }

  function nextPhase(): void {
    stopTts()

    const phases: GamePhase[] = ['setup', 'night', 'discussion', 'voting', 'result']
    const currentIndex = phases.indexOf(phase.value)
    if (currentIndex < phases.length - 1) {
      const next = phases[currentIndex + 1]
      enterPhase(next)
    }
  }

  function prevPhase(): void {
    stopTts()

    const phases: GamePhase[] = ['setup', 'night', 'discussion', 'voting', 'result']
    const currentIndex = phases.indexOf(phase.value)
    if (currentIndex > 1) {
      const prev = phases[currentIndex - 1]
      enterPhase(prev)
    }
  }

  function enterPhase(newPhase: GamePhase): void {
    discussionTimer.reset()
    votingTimer.reset()

    phase.value = newPhase

    const ttsOptions = {
      rate: config.value.speechRate,
      volume: config.value.speechVolume,
    }

    switch (newPhase) {
      case 'discussion':
        audio.stopBgm()
        speak('現在是白天討論時間，請大家開始討論', ttsOptions).then(() => {
          discussionTimer.startCountdown(config.value.discussionMinutes * 60)
        }).catch(() => {
          discussionTimer.startCountdown(config.value.discussionMinutes * 60)
        })
        break

      case 'voting':
        speak('討論時間結束，現在開始投票', ttsOptions).then(() => {
          votingTimer.startCountdown(config.value.votingSeconds)
        }).catch(() => {
          votingTimer.startCountdown(config.value.votingSeconds)
        })
        break

      case 'result':
        audio.stopBgm()
        break

      case 'night':
        audio.stopBgm()
        audio.loadBgm('night')
        // Night phase handles pause/resume per-speak via hooks; BGM starts after first TTS
        nightPhase.startNight(config.value).then(() => {
          if (phase.value === 'night') {
            nextPhase()
          }
        }).catch(() => {
          // TTS error — still advance so the game doesn't get stuck
          if (phase.value === 'night') {
            nextPhase()
          }
        })
        break
    }
  }

  function pauseGame(): void {
    isPaused.value = true
    nightPhase.pause()
    discussionTimer.pause()
    votingTimer.pause()
    audio.pauseAll()
  }

  function resumeGame(): void {
    isPaused.value = false
    nightPhase.resume()
    discussionTimer.resume()
    votingTimer.resume()
    audio.resumeAll()
  }

  async function endGame(winner: WinningFaction): Promise<void> {
    const ttsOptions = {
      rate: config.value.speechRate,
      volume: config.value.speechVolume,
    }

    const winnerTextMap: Record<WinningFaction, string> = {
      villager: '遊戲結束！瞌睡鼠陣營獲勝！',
      thief: '遊戲結束！大盜陣營獲勝！',
      scapegoat: '遊戲結束！背鍋鼠獲勝！',
    }
    const winnerText = winnerTextMap[winner]

    audio.playSfx(winner === 'villager' ? 'win' : 'lose')
    // Brief delay for SFX to finish before TTS
    await new Promise(r => setTimeout(r, 600))
    await speak(winnerText, ttsOptions)

    const durationMinutes = Math.round(
      (Date.now() - gameStartTime.value) / 60000
    )

    await addRecord({
      gameTemplate: 'cheese-thief',
      playerCount: config.value.playerCount,
      winningFaction: winner,
      durationMinutes,
      playedAt: new Date(),
    })
  }

  function playAgain(): void {
    stopTts()
    nightPhase.abort()
    discussionTimer.reset()
    votingTimer.reset()
    audio.stopBgm()
    phase.value = 'setup'
    isPaused.value = false
  }

  function cleanup(): void {
    stopTts()
    nightPhase.abort()
    discussionTimer.reset()
    votingTimer.reset()
    audio.stopBgm()
  }

  return {
    phase,
    config,
    isPaused,
    gameStartTime,
    roleComposition,
    currentTimer,
    nightPhase,
    discussionTimer,
    votingTimer,
    audio,
    startGame,
    nextPhase,
    prevPhase,
    pauseGame,
    resumeGame,
    endGame,
    playAgain,
    cleanup,
  }
}
