import { ref, onUnmounted } from 'vue'

interface TtsOptions {
  rate?: number
  volume?: number
  lang?: string
}

/**
 * Preload voices — on many mobile browsers, getVoices() returns empty
 * on the first call. Voices load asynchronously via the voiceschanged event.
 */
let voicesReady = false
let voicesPromise: Promise<void> | null = null

function ensureVoicesLoaded(): Promise<void> {
  if (voicesReady) return Promise.resolve()
  if (voicesPromise) return voicesPromise

  const voices = window.speechSynthesis?.getVoices()
  if (voices && voices.length > 0) {
    voicesReady = true
    return Promise.resolve()
  }

  voicesPromise = new Promise<void>((resolve) => {
    const onReady = () => {
      voicesReady = true
      window.speechSynthesis.removeEventListener('voiceschanged', onReady)
      resolve()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onReady)
    setTimeout(() => {
      voicesReady = true
      resolve()
    }, 3000)
  })

  return voicesPromise
}

// Trigger voice preloading immediately at module load
if (typeof window !== 'undefined' && window.speechSynthesis) {
  ensureVoicesLoaded()
}

/** Find the best Chinese voice available */
function findChineseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang.startsWith('zh') && v.lang.includes('TW')) ??
    voices.find((v) => v.lang.startsWith('zh')) ??
    null
  )
}

/**
 * Single attempt to speak. Returns a promise that resolves when speech ends.
 * Rejects if TTS fails to start within `startTimeout` ms.
 */
function attemptSpeak(
  text: string,
  options: TtsOptions,
  startTimeout: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = options.lang ?? 'zh-TW'
    utterance.rate = options.rate ?? 1.0
    utterance.volume = options.volume ?? 1.0
    utterance.pitch = 1.0

    const zhVoice = findChineseVoice()
    if (zhVoice) {
      utterance.voice = zhVoice
    }

    let started = false
    let startTimer: ReturnType<typeof setTimeout> | null = null
    let safetyTimer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (startTimer) { clearTimeout(startTimer); startTimer = null }
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null }
    }

    utterance.onstart = () => {
      started = true
      if (startTimer) { clearTimeout(startTimer); startTimer = null }
    }

    utterance.onend = () => {
      cleanup()
      resolve()
    }

    utterance.onerror = (event) => {
      cleanup()
      if (event.error === 'canceled' || event.error === 'interrupted') {
        resolve()
      } else {
        reject(new Error(`TTS error: ${event.error}`))
      }
    }

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }

    window.speechSynthesis.speak(utterance)

    // If onstart doesn't fire within startTimeout, TTS is stuck/silent
    startTimer = setTimeout(() => {
      startTimer = null
      if (!started) {
        window.speechSynthesis.cancel()
        reject(new Error('TTS_NOT_STARTED'))
      }
    }, startTimeout)

    // Safety timeout: if TTS never fires onend/onerror
    const estimatedMs = Math.max(text.length * 80, 2000) + 5000
    safetyTimer = setTimeout(() => {
      safetyTimer = null
      window.speechSynthesis.cancel()
      resolve()
    }, estimatedMs + startTimeout)
  })
}

export function useTts() {
  const isSpeaking = ref(false)
  const isSupported = ref(
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis !== 'undefined' &&
    window.speechSynthesis !== null,
  )

  /** Track whether stop() was called so chunked speech can abort early */
  let aborted = false

  function stop(): void {
    aborted = true
    if (isSupported.value) {
      window.speechSynthesis.cancel()
    }
    isSpeaking.value = false
  }

  /**
   * Split long text into small chunks for TTS.
   * Many mobile browsers silently truncate utterances beyond ~80-100 chars.
   * We split aggressively at all natural pause points.
   */
  function splitIntoChunks(text: string): string[] {
    const MAX_CHUNK = 80

    // First split at strong boundaries: 。！？ and newlines
    const sentences = text.split(/(?<=[。！？\n])\s*/).filter((s) => s.trim().length > 0)

    const chunks: string[] = []

    for (const sentence of sentences) {
      if (sentence.length <= MAX_CHUNK) {
        chunks.push(sentence.trim())
        continue
      }

      // Long sentence: split further at ，、；：
      const parts = sentence.split(/(?<=[，、；：])\s*/).filter((s) => s.trim().length > 0)
      let current = ''

      for (const part of parts) {
        if (current.length + part.length > MAX_CHUNK && current.length > 0) {
          chunks.push(current.trim())
          current = part
        } else {
          current += part
        }
      }
      if (current.trim().length > 0) {
        chunks.push(current.trim())
      }
    }

    return chunks.length > 0 ? chunks : [text]
  }

  /**
   * Speak text with automatic retry and long-text chunking.
   * On iOS Safari first load, the first speechSynthesis.speak() call may be
   * silently ignored. We detect this via onstart timeout and retry once — the
   * first (silent) call unlocks the audio session, so the retry succeeds.
   */
  async function speak(text: string, options: TtsOptions = {}): Promise<void> {
    if (!isSupported.value) return

    stop()
    aborted = false
    isSpeaking.value = true

    const chunks = splitIntoChunks(text)

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (aborted) break

        const isFirst = i === 0
        try {
          await attemptSpeak(chunks[i], options, isFirst ? 800 : 2000)
        } catch (err) {
          if (err instanceof Error && err.message === 'TTS_NOT_STARTED' && isFirst) {
            // iOS first-load: retry the first chunk
            try {
              await attemptSpeak(chunks[i], options, 2000)
            } catch {
              // Give up on this chunk
            }
          }
          // Other TTS errors — skip chunk so game continues
        }
      }
    } finally {
      isSpeaking.value = false
    }
  }

  onUnmounted(() => {
    stop()
  })

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  }
}
