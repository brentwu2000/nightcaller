import { vi, type Mock } from 'vitest'
import { ref } from 'vue'

export interface MockUseTts {
  speak: Mock
  stop: Mock
  isSpeaking: ReturnType<typeof ref<boolean>>
  isSupported: ReturnType<typeof ref<boolean>>
}

/**
 * Creates a mock for the useTts composable.
 * speak() resolves immediately by default; pass a custom implementation
 * when you need to simulate async behaviour.
 */
export function createMockUseTts(overrides: Partial<MockUseTts> = {}): MockUseTts {
  const isSpeaking = ref(false)
  const isSupported = ref(true)

  return {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    isSpeaking,
    isSupported,
    ...overrides,
  }
}
