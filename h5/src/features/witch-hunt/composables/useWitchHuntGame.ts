import { ref, computed } from 'vue'
import { useWitchHuntNight } from './useWitchHuntNight'
import { useTts } from '@/composables/useTts'
import { useAudio } from '@/composables/useAudio'
import { useTimer } from '@/composables/useTimer'
import { useGameHistory } from '@/composables/useGameHistory'
import {
  DEFAULT_SALEM_CONFIG,
  createInitialGameState,
  checkVillagerWin,
} from '@/types/witch-hunt'
import type {
  SalemPhase,
  SalemGameConfig,
  SalemGameState,
  SalemFaction,
  SalemWinReason,
} from '@/types/witch-hunt'

export function useWitchHuntGame() {
  const phase = ref<SalemPhase>('setup')
  const config = ref<SalemGameConfig>({ ...DEFAULT_SALEM_CONFIG })
  const isPaused = ref(false)
  const gameStartTime = ref(0)
  const gameState = ref<SalemGameState>(createInitialGameState(DEFAULT_SALEM_CONFIG))

  // Win result
  const winResult = ref<{ winner: SalemFaction; reason: SalemWinReason } | null>(null)

  // Dawn settlement tracking — prevent advancing without settling
  const dawnSettled = ref(false)

  // Undo support
  const lastAction = ref<{ type: string; timestamp: number; undoData?: Record<string, unknown> } | null>(null)
  const canUndo = computed(() => {
    if (!lastAction.value) return false
    return Date.now() - lastAction.value.timestamp < 5000
  })

  const audio = useAudio()
  const nightPhase = useWitchHuntNight({
    onSpeakStart: () => audio.pauseForTts(),
    onSpeakEnd: () => audio.resumeAfterTts(),
  })

  const { speak, stop: stopTts } = useTts()
  const { addRecord } = useGameHistory()

  // Timers
  const discussionTimer = useTimer({
    onTick: (remaining) => {
      if (remaining === 30) {
        speak('還剩三十秒。', ttsOptions.value).catch(() => { /* continue */ })
      }
    },
    onComplete: () => {
      speak('討論時間結束。即將進入共謀階段。', ttsOptions.value)
        .then(() => enterConspiracy())
        .catch(() => enterConspiracy())
    },
  })

  const defenseTimer = useTimer({
    onComplete: () => {
      speak('辯護時間結束。', ttsOptions.value)
        .then(() => enterTrialVote())
        .catch(() => enterTrialVote())
    },
  })

  const conspiracyTimer = useTimer({
    onComplete: () => {
      speak('時間到。請查看你收到的試煉卡。如果你看到了巫師的印記，那麼，歡迎加入黑暗。', ttsOptions.value)
        .then(() => {
          // Give players time to check their cards, then auto-advance
          setTimeout(() => proceedFromConspiracy(), 3000)
        })
        .catch(() => {
          setTimeout(() => proceedFromConspiracy(), 3000)
        })
    },
  })

  const ttsOptions = computed(() => ({
    rate: config.value.speechRate,
    volume: config.value.speechVolume,
  }))

  // ===== Lifecycle =====

  function startGame(gameConfig: SalemGameConfig): void {
    config.value = { ...gameConfig }
    gameStartTime.value = Date.now()
    gameState.value = createInitialGameState(gameConfig)
    winResult.value = null
    lastAction.value = null
    dawnSettled.value = false

    audio.unlock()
    audio.setBgmVolume(gameConfig.musicVolume)
    audio.setSfxVolume(gameConfig.sfxVolume)

    startDayPhase()
  }

  // ===== Day Phase (Discussion) =====

  async function startDayPhase(): Promise<void> {
    phase.value = 'discussion'
    audio.stopBgm()

    const round = gameState.value.currentRound
    await speak(`第${round}回合，白天到來。薩勒姆的陽光透過窗戶照進來。自由討論開始。`, ttsOptions.value)
      .catch(() => { /* continue */ })

    discussionTimer.startCountdown(config.value.discussionMinutes * 60)
  }

  /** 提前結束討論 → 進入共謀 */
  function endDiscussion(): void {
    discussionTimer.reset()
    enterConspiracy()
  }

  // ===== Trial =====

  async function triggerTrial(): Promise<void> {
    discussionTimer.pause()
    phase.value = 'trial_defense'

    audio.playSfx('whoosh')
    await speak('指控已經足夠了！審判即將開始。被告，你有時間為自己辯護。', ttsOptions.value)
      .catch(() => { /* continue */ })

    defenseTimer.startCountdown(config.value.defenseSeconds)
  }

  function skipDefense(): void {
    defenseTimer.reset()
    enterTrialVote()
  }

  async function enterTrialVote(): Promise<void> {
    phase.value = 'trial_vote'
    await speak('辯護結束。所有人，準備投票。認為有罪的，請舉手。三、二、一，投票！', ttsOptions.value)
      .catch(() => { /* continue */ })

    phase.value = 'trial_result'
  }

  async function reportTrialGuiltyWitch(): Promise<void> {
    if (phase.value !== 'trial_result') return

    const survival = gameState.value.survival
    const prevState = { ...survival }

    survival.alivePlayers--
    survival.revealedWitches++

    gameState.value.events.push({
      round: gameState.value.currentRound,
      phase: 'day',
      type: 'trial_witch',
      description: '一名巫師被審判揭露並處決',
    })

    lastAction.value = {
      type: 'trial_guilty_witch',
      timestamp: Date.now(),
      undoData: { prevState },
    }

    audio.playSfx('win')
    await speak('審判已決！翻開試煉卡，巫師的真面目暴露了。正義向前邁進了一步。', ttsOptions.value)
      .catch(() => { /* continue */ })

    // Auto-check villager win
    if (checkVillagerWin(survival, config.value.witchCount)) {
      await finishGame('villager', 'all_witches_revealed')
    } else {
      returnToDiscussion()
    }
  }

  async function reportTrialGuiltyVillager(): Promise<void> {
    if (phase.value !== 'trial_result') return

    const survival = gameState.value.survival
    const prevState = { ...survival }

    survival.alivePlayers--
    survival.deadVillagers++

    gameState.value.events.push({
      round: gameState.value.currentRound,
      phase: 'day',
      type: 'trial_villager',
      description: '一名無辜的村民被錯誤處決',
    })

    lastAction.value = {
      type: 'trial_guilty_villager',
      timestamp: Date.now(),
      undoData: { prevState },
    }

    audio.playSfx('lose')
    await speak('審判已決。翻開試煉卡，他是清白的。薩勒姆失去了一名無辜的靈魂。', ttsOptions.value)
      .catch(() => { /* continue */ })

    returnToDiscussion()
  }

  async function reportAcquittal(): Promise<void> {
    if (phase.value !== 'trial_result') return

    gameState.value.events.push({
      round: gameState.value.currentRound,
      phase: 'day',
      type: 'acquittal',
      description: '嫌疑人被無罪釋放',
    })

    await speak('投票未過半數，嫌疑人被無罪釋放。繼續討論。', ttsOptions.value)
      .catch(() => { /* continue */ })

    returnToDiscussion()
  }

  /** 審判結束後回到白天討論（可繼續觸發審判） */
  function returnToDiscussion(): void {
    phase.value = 'discussion'
    discussionTimer.resume()
  }

  // ===== Conspiracy =====

  async function enterConspiracy(): Promise<void> {
    phase.value = 'conspiracy'
    audio.stopBgm()

    await speak('共謀的時刻到了。請所有人閉上眼睛。', ttsOptions.value)
      .catch(() => { /* continue */ })
    await speak('現在，請每位玩家將一張試煉卡，傳給你左手邊的人。傳遞中，請小心，不要讓別人看見你的卡片。', ttsOptions.value)
      .catch(() => { /* continue */ })

    conspiracyTimer.startCountdown(config.value.conspiracySeconds)
  }

  /** 提前結束共謀 → 進入夜晚 */
  function endConspiracy(): void {
    conspiracyTimer.reset()
    proceedFromConspiracy()
  }

  async function proceedFromConspiracy(): Promise<void> {
    // Prevent double-trigger from timer callback + manual button
    if (phase.value !== 'conspiracy') return

    await speak('請收好你的試煉卡。準備進入夜晚。', ttsOptions.value)
      .catch(() => { /* continue */ })

    startNightPhase()
  }

  // ===== Night =====

  function startNightPhase(): void {
    phase.value = 'night'
    audio.loadBgm('night')

    nightPhase
      .startNight(config.value, gameState.value.currentRound)
      .then(() => {
        if (phase.value === 'night') {
          enterDawn()
        }
      })
      .catch(() => {
        if (phase.value === 'night') {
          enterDawn()
        }
      })
  }

  // ===== Dawn =====

  async function enterDawn(): Promise<void> {
    audio.stopBgm()
    phase.value = 'dawn'
    dawnSettled.value = false

    await speak('黎明到來，陽光驅散了黑暗。請所有人睜開眼睛。', ttsOptions.value)
      .catch(() => { /* continue */ })
  }

  async function reportDawnKill(): Promise<void> {
    if (phase.value !== 'dawn') return

    const survival = gameState.value.survival
    const prevState = { ...survival }

    survival.alivePlayers--
    survival.deadVillagers++

    gameState.value.events.push({
      round: gameState.value.currentRound,
      phase: 'night',
      type: 'night_kill',
      description: '一名村民在夜晚被殺害',
    })

    lastAction.value = {
      type: 'dawn_kill',
      timestamp: Date.now(),
      undoData: { prevState },
    }

    dawnSettled.value = true

    audio.playSfx('lose')
    await speak('昨晚，薩勒姆失去了一位居民。一名村民在夜晚中被殺害了。', ttsOptions.value)
      .catch(() => { /* continue */ })
  }

  async function reportDawnSafe(): Promise<void> {
    if (phase.value !== 'dawn') return

    gameState.value.events.push({
      round: gameState.value.currentRound,
      phase: 'night',
      type: 'night_safe',
      description: '昨夜平安無事，守護者成功保護了目標',
    })

    dawnSettled.value = true

    await speak('昨夜一切平安。守護者成功保護了目標。', ttsOptions.value)
      .catch(() => { /* continue */ })
  }

  async function advanceToNextRound(): Promise<void> {
    gameState.value.currentRound++
    startDayPhase()
  }

  // ===== Manual Win Declaration =====

  /** 組織者宣告巫師勝利（當巫師人數 >= 村民或所有村民死亡） */
  async function declareWitchWin(): Promise<void> {
    await finishGame('witch', 'witch_dominance')
  }

  // ===== Undo =====

  function undoLastAction(): void {
    if (!canUndo.value || !lastAction.value) return

    const action = lastAction.value
    const undoData = action.undoData as Record<string, unknown> | undefined

    if (undoData?.prevState) {
      const prev = undoData.prevState as Record<string, number>
      const survival = gameState.value.survival
      survival.alivePlayers = prev.alivePlayers
      survival.revealedWitches = prev.revealedWitches
      survival.deadVillagers = prev.deadVillagers

      gameState.value.events.pop()
    }

    lastAction.value = null

    if (phase.value === 'finished') {
      winResult.value = null
      if (action.type === 'dawn_kill') {
        phase.value = 'dawn'
        dawnSettled.value = false
      } else {
        phase.value = 'trial_result'
      }
    }

    // Undo dawn settlement
    if (action.type === 'dawn_kill') {
      dawnSettled.value = false
    }
  }

  // ===== Finish =====

  async function finishGame(winner: SalemFaction, reason: SalemWinReason): Promise<void> {
    winResult.value = { winner, reason }
    phase.value = 'finished'

    if (winner === 'villager') {
      audio.playSfx('win')
      await speak('正義終於降臨薩勒姆！所有的巫師都已被揭露。村民們，你們守護了這個小鎮。村民陣營勝利！', ttsOptions.value)
        .catch(() => { /* continue */ })
    } else {
      audio.playSfx('lose')
      await speak('黑暗吞噬了薩勒姆。巫師們的陰謀得逞了。再也無人能阻止黑暗的蔓延。巫師陣營勝利！', ttsOptions.value)
        .catch(() => { /* continue */ })
    }

    const durationMinutes = Math.round((Date.now() - gameStartTime.value) / 60000)

    await addRecord({
      gameTemplate: 'witch-hunt',
      playerCount: config.value.playerCount,
      winningFaction: winner === 'villager' ? 'villager' : 'thief',
      durationMinutes,
      playedAt: new Date(),
    })
  }

  // ===== Pause / Resume =====

  function pauseGame(): void {
    isPaused.value = true
    nightPhase.pause()
    discussionTimer.pause()
    defenseTimer.pause()
    conspiracyTimer.pause()
    audio.pauseAll()
  }

  function resumeGame(): void {
    isPaused.value = false
    nightPhase.resume()
    if (phase.value === 'discussion') discussionTimer.resume()
    if (phase.value === 'trial_defense') defenseTimer.resume()
    if (phase.value === 'conspiracy') conspiracyTimer.resume()
    audio.resumeAll()
  }

  // ===== Play Again / Cleanup =====

  function playAgain(): void {
    stopTts()
    nightPhase.abort()
    discussionTimer.reset()
    defenseTimer.reset()
    conspiracyTimer.reset()
    audio.stopBgm()
    phase.value = 'setup'
    isPaused.value = false
    gameState.value = createInitialGameState(config.value)
    winResult.value = null
    lastAction.value = null
    dawnSettled.value = false
  }

  function cleanup(): void {
    stopTts()
    nightPhase.abort()
    discussionTimer.reset()
    defenseTimer.reset()
    conspiracyTimer.reset()
    audio.stopBgm()
  }

  return {
    // State
    phase,
    config,
    isPaused,
    gameState,
    winResult,
    canUndo,
    dawnSettled,

    // Sub-systems
    nightPhase,
    audio,
    discussionTimer,
    defenseTimer,
    conspiracyTimer,

    // Lifecycle
    startGame,

    // Discussion
    endDiscussion,
    triggerTrial,

    // Trial
    skipDefense,
    reportTrialGuiltyWitch,
    reportTrialGuiltyVillager,
    reportAcquittal,

    // Conspiracy
    endConspiracy,

    // Dawn
    reportDawnKill,
    reportDawnSafe,
    advanceToNextRound,

    // Win
    declareWitchWin,

    // Undo
    undoLastAction,

    // Controls
    pauseGame,
    resumeGame,
    playAgain,
    cleanup,
  }
}
