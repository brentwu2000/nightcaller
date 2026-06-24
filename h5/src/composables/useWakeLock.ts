import { ref, onUnmounted } from 'vue'

export function useWakeLock() {
  const isActive = ref(false)
  let wakeLock: WakeLockSentinel | null = null

  async function request(): Promise<void> {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      isActive.value = true
      wakeLock.addEventListener('release', () => {
        isActive.value = false
        wakeLock = null
      })
    } catch {
      // Wake lock request failed (e.g. low battery)
    }
  }

  function release(): void {
    if (wakeLock) {
      wakeLock.release()
      wakeLock = null
      isActive.value = false
    }
  }

  // Re-acquire wake lock when page becomes visible again
  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && isActive.value === false && wakeLock === null) {
      // Only re-request if it was previously active (released by visibility change)
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  onUnmounted(() => {
    release()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return { isActive, request, release }
}
