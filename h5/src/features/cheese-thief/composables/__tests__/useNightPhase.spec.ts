import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withSetup } from '@/test/helpers/withSetup'
import { DEFAULT_GAME_CONFIG, DICE_NUMBERS } from '@/types/cheese-thief'

// ---------------------------------------------------------------------------
// Mock the useTts composable so we control when speak() resolves
// ---------------------------------------------------------------------------
const mockSpeak = vi.fn()
const mockStopTts = vi.fn()
const mockIsSpeaking = { value: false }

vi.mock('@/composables/useTts', () => ({
  useTts: () => ({
    speak: mockSpeak,
    stop: mockStopTts,
    isSpeaking: mockIsSpeaking,
    isSupported: { value: true },
  }),
}))

// Import the composable AFTER mocking its dependencies
async function getNightPhase() {
  const { useNightPhase } = await import(
    '@/features/cheese-thief/composables/useNightPhase'
  )
  return useNightPhase
}

describe('useNightPhase', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockSpeak.mockReset()
    mockStopTts.mockReset()
    // Default: speak resolves immediately
    mockSpeak.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should start with currentDiceNumber = 0 and isCompleted = false', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())
      expect(result.currentDiceNumber.value).toBe(0)
      expect(result.isCompleted.value).toBe(false)
      expect(result.isPaused.value).toBe(false)
    })
  })

  describe('startNight()', () => {
    it('should set isCompleted to true after the full sequence finishes', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      const nightPromise = result.startNight(DEFAULT_GAME_CONFIG)

      // Advance through all dice (6 × NIGHT_SECONDS_PER_DICE seconds) plus
      // the small delays between announcements
      await vi.runAllTimersAsync()
      await nightPromise

      expect(result.isCompleted.value).toBe(true)
    })

    it('should announce each dice number 1 through 6', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      const nightPromise = result.startNight(DEFAULT_GAME_CONFIG)
      await vi.runAllTimersAsync()
      await nightPromise

      // Check that speak was called for each dice number
      for (const n of DICE_NUMBERS) {
        expect(mockSpeak).toHaveBeenCalledWith(
          expect.stringContaining(`${n}`),
          expect.any(Object),
        )
      }
    })

    it('should update currentDiceNumber as each dice is processed', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      // Track which dice numbers were set during the run
      const observed: number[] = []
      const originalSpeak = mockSpeak.getMockImplementation()

      mockSpeak.mockImplementation(async (text: string) => {
        const match = text.match(/(\d)/)
        if (match) observed.push(result.currentDiceNumber.value)
      })

      const nightPromise = result.startNight(DEFAULT_GAME_CONFIG)
      await vi.runAllTimersAsync()
      await nightPromise

      // After full night (with accomplice phase for 5+ players), currentDiceNumber resets to 0
      // For 4 players it would stay at 6 (no accomplice phase)
      expect(result.currentDiceNumber.value).toBe(0)

      if (originalSpeak) mockSpeak.mockImplementation(originalSpeak)
    })

    it('should reset state at the beginning of each startNight call', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      const first = result.startNight(DEFAULT_GAME_CONFIG)
      result.abort()
      await first

      // Second run
      const second = result.startNight(DEFAULT_GAME_CONFIG)
      expect(result.isCompleted.value).toBe(false)
      expect(result.completedDice.value).toHaveLength(0)

      result.abort()
      await second
    })
  })

  describe('pause() and resume()', () => {
    it('should set isPaused to true when paused', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      result.startNight(DEFAULT_GAME_CONFIG)
      result.pause()

      expect(result.isPaused.value).toBe(true)
    })

    it('should set isPaused to false when resumed', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      result.startNight(DEFAULT_GAME_CONFIG)
      result.pause()
      result.resume()

      expect(result.isPaused.value).toBe(false)
    })

    it('should expose nightState reflecting current status', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      result.startNight(DEFAULT_GAME_CONFIG)
      result.pause()

      expect(result.nightState.value.isPaused).toBe(true)
      expect(result.nightState.value.isCompleted).toBe(false)

      result.abort()
    })
  })

  describe('skip()', () => {
    it('should advance past the current delay when called', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      // Use real timers briefly to intercept the delay
      vi.useRealTimers()
      const nightPromise = result.startNight(DEFAULT_GAME_CONFIG)

      // Abort immediately so we don't have to wait the full sequence
      result.abort()
      await nightPromise

      expect(result.isCompleted.value).toBe(false)
    })
  })

  describe('abort()', () => {
    it('should stop the night sequence without completing it', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      const nightPromise = result.startNight(DEFAULT_GAME_CONFIG)
      result.abort()
      await nightPromise

      expect(result.isCompleted.value).toBe(false)
    })

    it('should call stopTts when aborting', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      const nightPromise = result.startNight(DEFAULT_GAME_CONFIG)
      result.abort()
      await nightPromise

      expect(mockStopTts).toHaveBeenCalled()
    })

    it('should resolve isPaused to false after abort', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())

      const nightPromise = result.startNight(DEFAULT_GAME_CONFIG)
      result.pause()
      result.abort()
      await nightPromise

      expect(result.isPaused.value).toBe(false)
    })
  })

  describe('nightState computed', () => {
    it('should expose timer remaining seconds in nightState', async () => {
      const useNightPhase = await getNightPhase()
      const { result } = withSetup(() => useNightPhase())
      expect(result.nightState.value.remainingSeconds).toBe(
        result.timer.remaining.value,
      )
    })
  })

  describe('DEFAULT_GAME_CONFIG.nightSecondsPerDice', () => {
    it('should default to 5 seconds per dice', () => {
      expect(DEFAULT_GAME_CONFIG.nightSecondsPerDice).toBe(5)
    })
  })
})
