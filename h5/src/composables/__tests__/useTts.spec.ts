import { describe, it, expect, vi } from 'vitest'
import { withSetup } from '@/test/helpers/withSetup'
import { mockSpeechSynthesis, MockSpeechSynthesisUtterance } from '@/test/setup'

// We re-import useTts after the globals are stubbed via setup.ts
async function getTts() {
  const { useTts } = await import('@/composables/useTts')
  return useTts
}

describe('useTts', () => {
  describe('isSupported', () => {
    it('should return true when speechSynthesis exists in window', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())
      expect(result.isSupported.value).toBe(true)
    })

    it('should return false when speechSynthesis is not available', async () => {
      vi.stubGlobal('speechSynthesis', undefined)
      // Re-import so the module re-evaluates the isSupported ref
      vi.resetModules()
      const { useTts } = await import('@/composables/useTts')
      const { result } = withSetup(() => useTts())
      expect(result.isSupported.value).toBe(false)
      // Restore
      vi.stubGlobal('speechSynthesis', mockSpeechSynthesis)
      vi.resetModules()
    })
  })

  describe('speak()', () => {
    it('should call speechSynthesis.speak with a new utterance', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
        utterance.onstart?.(new Event('start') as SpeechSynthesisEvent)
        utterance.onend?.(new Event('end') as SpeechSynthesisEvent)
      })

      await result.speak('hello')
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })

    it('should set isSpeaking to true on onstart and false on onend', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      let capturedUtterance: MockSpeechSynthesisUtterance | null = null
      mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
        capturedUtterance = utterance
        utterance.onstart?.(new Event('start') as SpeechSynthesisEvent)
      })

      const promise = result.speak('hello')
      expect(result.isSpeaking.value).toBe(true)

      // Simulate speech ending
      capturedUtterance!.onend?.(new Event('end') as SpeechSynthesisEvent)
      await promise
      expect(result.isSpeaking.value).toBe(false)
    })

    it('should resolve immediately when TTS is not supported', async () => {
      vi.stubGlobal('speechSynthesis', undefined)
      vi.resetModules()
      const { useTts } = await import('@/composables/useTts')
      const { result } = withSetup(() => useTts())

      await expect(result.speak('hello')).resolves.toBeUndefined()

      vi.stubGlobal('speechSynthesis', mockSpeechSynthesis)
      vi.resetModules()
    })

    it('should cancel previous utterance before speaking a new one', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      mockSpeechSynthesis.speak.mockImplementation((_u: MockSpeechSynthesisUtterance) => {
        // Do not fire onend so the first speak remains "in progress"
      })

      // Start first speak (won't resolve)
      result.speak('first')

      // Start second speak — should cancel first
      mockSpeechSynthesis.speak.mockImplementation((u: MockSpeechSynthesisUtterance) => {
        u.onend?.(new Event('end') as SpeechSynthesisEvent)
      })
      await result.speak('second')

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
    })

    it('should resolve silently on a hard TTS error (game continues)', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
        const errorEvent = Object.assign(new Event('error'), { error: 'synthesis-failed' }) as SpeechSynthesisErrorEvent
        utterance.onerror?.(errorEvent)
      })

      await expect(result.speak('hello')).resolves.toBeUndefined()
    })

    it('should resolve (not reject) when error is "canceled"', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
        const errorEvent = Object.assign(new Event('error'), { error: 'canceled' }) as SpeechSynthesisErrorEvent
        utterance.onerror?.(errorEvent)
      })

      await expect(result.speak('hello')).resolves.toBeUndefined()
    })

    it('should resolve (not reject) when error is "interrupted"', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
        const errorEvent = Object.assign(new Event('error'), { error: 'interrupted' }) as SpeechSynthesisErrorEvent
        utterance.onerror?.(errorEvent)
      })

      await expect(result.speak('hello')).resolves.toBeUndefined()
    })

    it('should set utterance lang to zh-TW by default', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      let capturedUtterance: MockSpeechSynthesisUtterance | null = null
      mockSpeechSynthesis.speak.mockImplementation((u: MockSpeechSynthesisUtterance) => {
        capturedUtterance = u
        u.onend?.(new Event('end') as SpeechSynthesisEvent)
      })

      await result.speak('hello')
      expect(capturedUtterance!.lang).toBe('zh-TW')
    })

    it('should apply custom rate and volume options', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      let capturedUtterance: MockSpeechSynthesisUtterance | null = null
      mockSpeechSynthesis.speak.mockImplementation((u: MockSpeechSynthesisUtterance) => {
        capturedUtterance = u
        u.onend?.(new Event('end') as SpeechSynthesisEvent)
      })

      await result.speak('hello', { rate: 1.5, volume: 0.8 })
      expect(capturedUtterance!.rate).toBe(1.5)
      expect(capturedUtterance!.volume).toBe(0.8)
    })

    it('should prefer zh-TW voice when available', async () => {
      const useTts = await getTts()

      const twVoice = { lang: 'zh-TW', name: 'Meijia' } as SpeechSynthesisVoice
      const cnVoice = { lang: 'zh-CN', name: 'Ting-Ting' } as SpeechSynthesisVoice
      mockSpeechSynthesis.getVoices.mockReturnValue([cnVoice, twVoice])

      const { result } = withSetup(() => useTts())

      let capturedUtterance: MockSpeechSynthesisUtterance | null = null
      mockSpeechSynthesis.speak.mockImplementation((u: MockSpeechSynthesisUtterance) => {
        capturedUtterance = u
        u.onend?.(new Event('end') as SpeechSynthesisEvent)
      })

      await result.speak('hello')
      expect(capturedUtterance!.voice).toBe(twVoice)
    })

    it('should fall back to any zh voice when zh-TW is not available', async () => {
      const useTts = await getTts()

      const cnVoice = { lang: 'zh-CN', name: 'Ting-Ting' } as SpeechSynthesisVoice
      mockSpeechSynthesis.getVoices.mockReturnValue([cnVoice])

      const { result } = withSetup(() => useTts())

      let capturedUtterance: MockSpeechSynthesisUtterance | null = null
      mockSpeechSynthesis.speak.mockImplementation((u: MockSpeechSynthesisUtterance) => {
        capturedUtterance = u
        u.onend?.(new Event('end') as SpeechSynthesisEvent)
      })

      await result.speak('hello')
      expect(capturedUtterance!.voice).toBe(cnVoice)
    })

    it('should resume speechSynthesis first when it is paused (Chrome bug workaround)', async () => {
      const useTts = await getTts()
      mockSpeechSynthesis.paused = true

      const { result } = withSetup(() => useTts())

      mockSpeechSynthesis.speak.mockImplementation((u: MockSpeechSynthesisUtterance) => {
        u.onend?.(new Event('end') as SpeechSynthesisEvent)
      })

      await result.speak('hello')
      // resume must be called before speak
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled()
      const resumeOrder = mockSpeechSynthesis.resume.mock.invocationCallOrder[0]
      const speakOrder = mockSpeechSynthesis.speak.mock.invocationCallOrder[0]
      expect(resumeOrder).toBeLessThan(speakOrder)
    })
  })

  describe('stop()', () => {
    it('should call speechSynthesis.cancel and set isSpeaking to false', async () => {
      const useTts = await getTts()
      const { result } = withSetup(() => useTts())

      result.stop()

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(1)
      expect(result.isSpeaking.value).toBe(false)
    })
  })
})
