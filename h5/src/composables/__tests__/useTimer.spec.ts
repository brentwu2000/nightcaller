import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withSetup } from '@/test/helpers/withSetup'
import { useTimer } from '@/composables/useTimer'

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should start with remaining = 0 and isRunning = false', () => {
      const { result } = withSetup(() => useTimer())
      expect(result.remaining.value).toBe(0)
      expect(result.isRunning.value).toBe(false)
    })
  })

  describe('startCountdown()', () => {
    it('should set remaining and isRunning when started', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(10)

      expect(result.remaining.value).toBe(10)
      expect(result.isRunning.value).toBe(true)
      expect(result.totalSeconds.value).toBe(10)
    })

    it('should decrement remaining by 1 every second', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(5)

      vi.advanceTimersByTime(1000)
      expect(result.remaining.value).toBe(4)

      vi.advanceTimersByTime(2000)
      expect(result.remaining.value).toBe(2)
    })

    it('should call onTick with the remaining value on each tick', () => {
      const onTick = vi.fn()
      const { result } = withSetup(() => useTimer({ onTick }))
      result.startCountdown(3)

      vi.advanceTimersByTime(3000)

      expect(onTick).toHaveBeenCalledTimes(3)
      expect(onTick).toHaveBeenNthCalledWith(1, 2)
      expect(onTick).toHaveBeenNthCalledWith(2, 1)
      expect(onTick).toHaveBeenNthCalledWith(3, 0)
    })

    it('should call onComplete and stop running when countdown reaches 0', () => {
      const onComplete = vi.fn()
      const { result } = withSetup(() => useTimer({ onComplete }))
      result.startCountdown(3)

      vi.advanceTimersByTime(3000)

      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(result.isRunning.value).toBe(false)
      expect(result.remaining.value).toBe(0)
    })

    it('should restart the timer when called again while running', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(10)
      vi.advanceTimersByTime(3000)

      result.startCountdown(5)
      expect(result.remaining.value).toBe(5)
      expect(result.totalSeconds.value).toBe(5)
    })

    it('should handle 0 seconds without error', () => {
      const onComplete = vi.fn()
      const { result } = withSetup(() => useTimer({ onComplete }))
      result.startCountdown(0)

      vi.advanceTimersByTime(1000)

      // With 0 seconds, first tick fires with remaining = -1 but clamps to 0
      expect(result.remaining.value).toBe(0)
    })
  })

  describe('pause()', () => {
    it('should stop decrementing when paused', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(10)
      vi.advanceTimersByTime(2000)

      result.pause()
      expect(result.isRunning.value).toBe(false)

      vi.advanceTimersByTime(3000)
      // Should remain at 8 even after 3 more seconds
      expect(result.remaining.value).toBe(8)
    })

    it('should set isRunning to false', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(10)
      result.pause()
      expect(result.isRunning.value).toBe(false)
    })
  })

  describe('resume()', () => {
    it('should continue countdown after pause', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(10)
      vi.advanceTimersByTime(3000)

      result.pause()
      vi.advanceTimersByTime(5000)  // paused, should not count

      result.resume()
      expect(result.isRunning.value).toBe(true)

      vi.advanceTimersByTime(2000)
      expect(result.remaining.value).toBe(5)
    })

    it('should not resume when remaining is 0', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(3)
      vi.advanceTimersByTime(3000)  // complete

      result.resume()
      expect(result.isRunning.value).toBe(false)
    })
  })

  describe('reset()', () => {
    it('should set remaining to 0 and stop the timer', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(10)
      vi.advanceTimersByTime(3000)

      result.reset()

      expect(result.remaining.value).toBe(0)
      expect(result.isRunning.value).toBe(false)
    })

    it('should not call onComplete after reset', () => {
      const onComplete = vi.fn()
      const { result } = withSetup(() => useTimer({ onComplete }))
      result.startCountdown(5)
      vi.advanceTimersByTime(2000)

      result.reset()
      vi.advanceTimersByTime(5000)

      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  describe('getProgress()', () => {
    it('should return 0 when totalSeconds is 0', () => {
      const { result } = withSetup(() => useTimer())
      expect(result.getProgress()).toBe(0)
    })

    it('should return a value between 0 and 1 proportional to elapsed time', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(10)
      vi.advanceTimersByTime(5000)

      // 5 elapsed out of 10 total → progress = 0.5
      expect(result.getProgress()).toBeCloseTo(0.5)
    })

    it('should return 1 when countdown is complete', () => {
      const { result } = withSetup(() => useTimer())
      result.startCountdown(5)
      vi.advanceTimersByTime(5000)

      expect(result.getProgress()).toBe(1)
    })
  })
})
