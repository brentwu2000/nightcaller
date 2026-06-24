import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withSetup } from '@/test/helpers/withSetup'
import { DEFAULT_GAME_CONFIG } from '@/types/cheese-thief'
import type { GameConfig } from '@/types/cheese-thief'

// ---------------------------------------------------------------------------
// Mock all heavy dependencies before importing the composable under test
// ---------------------------------------------------------------------------

const mockSpeak = vi.fn().mockResolvedValue(undefined)
const mockStopTts = vi.fn()

vi.mock('@/composables/useTts', () => ({
  useTts: () => ({
    speak: mockSpeak,
    stop: mockStopTts,
    isSpeaking: { value: false },
    isSupported: { value: true },
  }),
}))

const mockStartNight = vi.fn().mockResolvedValue(undefined)
const mockAbortNight = vi.fn()
const mockPauseNight = vi.fn()
const mockResumeNight = vi.fn()
const mockNightTimer = { remaining: { value: 0 }, isRunning: { value: false } }
const mockNightIsCompleted = { value: false }
const mockNightState = { value: { currentDiceNumber: 0, remainingSeconds: 0, isCompleted: false, isPaused: false } }

vi.mock('@/features/cheese-thief/composables/useNightPhase', () => ({
  useNightPhase: (_hooks?: unknown) => ({
    startNight: mockStartNight,
    abort: mockAbortNight,
    pause: mockPauseNight,
    resume: mockResumeNight,
    timer: mockNightTimer,
    nightState: mockNightState,
    isCompleted: mockNightIsCompleted,
    isPaused: { value: false },
    isSpeaking: { value: false },
    currentDiceNumber: { value: 0 },
    completedDice: { value: [] },
    subPhase: { value: 'idle' },
    skip: vi.fn(),
  }),
}))

const mockPlayBgm = vi.fn()
const mockStopBgm = vi.fn()
const mockPlaySfx = vi.fn()
const mockDuckBgm = vi.fn()
const mockUnduckBgm = vi.fn()
const mockSetBgmVolume = vi.fn()
const mockSetSfxVolume = vi.fn()
const mockPauseAll = vi.fn()
const mockResumeAll = vi.fn()

vi.mock('@/composables/useAudio', () => ({
  useAudio: () => ({
    unlock: vi.fn(),
    loadBgm: vi.fn(),
    playBgm: mockPlayBgm,
    stopBgm: mockStopBgm,
    playSfx: mockPlaySfx,
    setBgmVolume: mockSetBgmVolume,
    setSfxVolume: mockSetSfxVolume,
    duckBgm: mockDuckBgm,
    unduckBgm: mockUnduckBgm,
    pauseForTts: vi.fn(),
    resumeAfterTts: vi.fn(),
    pauseAll: mockPauseAll,
    resumeAll: mockResumeAll,
    bgmVolume: { value: 0.3 },
    sfxVolume: { value: 0.5 },
  }),
}))

const mockAddRecord = vi.fn().mockResolvedValue(1)

vi.mock('@/composables/useGameHistory', () => ({
  useGameHistory: () => ({
    addRecord: mockAddRecord,
    getRecords: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({ total: 0, thiefWins: 0, villagerWins: 0 }),
    clearAll: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Import composable after mocking
async function getGame() {
  const { useCheeseThiefGame } = await import(
    '@/features/cheese-thief/composables/useCheeseThiefGame'
  )
  return useCheeseThiefGame
}

const testConfig: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  playerCount: 6,
  musicVolume: 0.2,
  sfxVolume: 0.4,
}

describe('useCheeseThiefGame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStartNight.mockResolvedValue(undefined)
    mockSpeak.mockResolvedValue(undefined)
    mockAddRecord.mockResolvedValue(1)
  })

  describe('initial state', () => {
    it('should start in setup phase', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      expect(result.phase.value).toBe('setup')
    })

    it('should start with isPaused = false', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      expect(result.isPaused.value).toBe(false)
    })

    it('should expose the default game config', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      expect(result.config.value.playerCount).toBe(DEFAULT_GAME_CONFIG.playerCount)
    })
  })

  describe('startGame()', () => {
    it('should transition phase to night', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      expect(result.phase.value).toBe('night')
    })

    it('should store the provided config', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      expect(result.config.value.playerCount).toBe(testConfig.playerCount)
    })

    it('should configure audio volumes', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      expect(mockSetBgmVolume).toHaveBeenCalledWith(testConfig.musicVolume)
      expect(mockSetSfxVolume).toHaveBeenCalledWith(testConfig.sfxVolume)
    })

    it('should load night BGM (duck/unduck handled per-speak by hooks)', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      // startGame calls loadBgm (not playBgm); BGM starts after first TTS via hooks
      expect(result.audio.loadBgm).toHaveBeenCalledWith('night')
    })

    it('should call startNight with the game config', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      expect(mockStartNight).toHaveBeenCalledWith(testConfig)
    })
  })

  describe('nextPhase()', () => {
    it('should advance from night to discussion', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      expect(result.phase.value).toBe('night')

      result.nextPhase()
      expect(result.phase.value).toBe('discussion')
    })

    it('should advance from discussion to voting', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.nextPhase()  // night → discussion
      result.nextPhase()  // discussion → voting
      expect(result.phase.value).toBe('voting')
    })

    it('should advance from voting to result', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.nextPhase()  // night → discussion
      result.nextPhase()  // discussion → voting
      result.nextPhase()  // voting → result
      expect(result.phase.value).toBe('result')
    })

    it('should not advance past result phase', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      // Advance to result
      result.nextPhase()
      result.nextPhase()
      result.nextPhase()
      expect(result.phase.value).toBe('result')

      // Another nextPhase should have no effect
      result.nextPhase()
      expect(result.phase.value).toBe('result')
    })

    it('should stop TTS when advancing phase', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.nextPhase()
      expect(mockStopTts).toHaveBeenCalled()
    })
  })

  describe('pauseGame() and resumeGame()', () => {
    it('should set isPaused to true when paused', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.pauseGame()
      expect(result.isPaused.value).toBe(true)
    })

    it('should pause night phase and audio', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.pauseGame()
      expect(mockPauseNight).toHaveBeenCalled()
      expect(mockPauseAll).toHaveBeenCalled()
    })

    it('should set isPaused to false when resumed', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.pauseGame()
      result.resumeGame()
      expect(result.isPaused.value).toBe(false)
    })

    it('should resume night phase and audio', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.pauseGame()
      result.resumeGame()
      expect(mockResumeNight).toHaveBeenCalled()
      expect(mockResumeAll).toHaveBeenCalled()
    })
  })

  describe('endGame()', () => {
    it('should play "lose" SFX when thief wins', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      await result.endGame('thief')
      expect(mockPlaySfx).toHaveBeenCalledWith('lose')
    })

    it('should play "win" SFX when villager wins', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      await result.endGame('villager')
      expect(mockPlaySfx).toHaveBeenCalledWith('win')
    })

    it('should save a game record with the correct winning faction', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      await result.endGame('villager')
      expect(mockAddRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          winningFaction: 'villager',
          gameTemplate: 'cheese-thief',
          playerCount: testConfig.playerCount,
        }),
      )
    })

    it('should speak a result announcement', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      await result.endGame('thief')
      expect(mockSpeak).toHaveBeenCalledWith(
        expect.stringContaining('大盜陣營獲勝'),
        expect.any(Object),
      )
    })
  })

  describe('playAgain()', () => {
    it('should reset phase to setup', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.nextPhase()
      result.playAgain()
      expect(result.phase.value).toBe('setup')
    })

    it('should set isPaused to false', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.pauseGame()
      result.playAgain()
      expect(result.isPaused.value).toBe(false)
    })

    it('should abort the night phase', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.playAgain()
      expect(mockAbortNight).toHaveBeenCalled()
    })

    it('should stop BGM', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.playAgain()
      expect(mockStopBgm).toHaveBeenCalled()
    })
  })

  describe('roleComposition computed', () => {
    it('should reflect the role composition for the configured player count', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame({ ...testConfig, playerCount: 4 })
      expect(result.roleComposition.value.thief).toBe(1)
      expect(result.roleComposition.value.villager).toBe(2)
    })
  })

  describe('currentTimer computed', () => {
    it('should return night timer during night phase', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      expect(result.currentTimer.value).toBe(result.nightPhase.timer)
    })

    it('should return discussionTimer during discussion phase', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.nextPhase()  // → discussion
      expect(result.currentTimer.value).toBe(result.discussionTimer)
    })

    it('should return votingTimer during voting phase', async () => {
      const useCheeseThiefGame = await getGame()
      const { result } = withSetup(() => useCheeseThiefGame())
      result.startGame(testConfig)
      result.nextPhase()  // → discussion
      result.nextPhase()  // → voting
      expect(result.currentTimer.value).toBe(result.votingTimer)
    })
  })
})
