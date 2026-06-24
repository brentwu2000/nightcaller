import { ref, onUnmounted } from 'vue'

interface TimerCallbacks {
  onTick?: (remaining: number) => void
  onComplete?: () => void
}

export function useTimer(callbacks: TimerCallbacks = {}) {
  const remaining = ref(0)
  const isRunning = ref(false)
  const totalSeconds = ref(0)

  let intervalId: ReturnType<typeof setInterval> | null = null

  function clearInterval_(): void {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function startInterval(): void {
    clearInterval_()
    intervalId = setInterval(() => {
      remaining.value -= 1
      callbacks.onTick?.(remaining.value)

      if (remaining.value <= 0) {
        remaining.value = 0
        isRunning.value = false
        clearInterval_()
        callbacks.onComplete?.()
      }
    }, 1000)
  }

  function startCountdown(seconds: number): void {
    clearInterval_()
    totalSeconds.value = Math.max(0, seconds)
    remaining.value = Math.max(0, seconds)
    isRunning.value = true
    startInterval()
  }

  function pause(): void {
    isRunning.value = false
    clearInterval_()
  }

  function resume(): void {
    if (remaining.value > 0 && !isRunning.value) {
      isRunning.value = true
      startInterval()
    }
  }

  function reset(): void {
    clearInterval_()
    remaining.value = 0
    isRunning.value = false
  }

  function getProgress(): number {
    if (totalSeconds.value === 0) return 0
    return 1 - remaining.value / totalSeconds.value
  }

  onUnmounted(() => {
    clearInterval_()
  })

  return {
    remaining,
    isRunning,
    totalSeconds,
    startCountdown,
    pause,
    resume,
    reset,
    getProgress,
  }
}
