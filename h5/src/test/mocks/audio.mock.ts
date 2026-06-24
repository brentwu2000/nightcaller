import { vi, type Mock } from 'vitest'
import { ref } from 'vue'

export interface MockUseAudio {
  playBgm: Mock
  stopBgm: Mock
  playSfx: Mock
  setBgmVolume: Mock
  setSfxVolume: Mock
  duckBgm: Mock
  unduckBgm: Mock
  pauseAll: Mock
  resumeAll: Mock
  bgmVolume: ReturnType<typeof ref<number>>
  sfxVolume: ReturnType<typeof ref<number>>
}

export function createMockUseAudio(overrides: Partial<MockUseAudio> = {}): MockUseAudio {
  return {
    playBgm: vi.fn(),
    stopBgm: vi.fn(),
    playSfx: vi.fn(),
    setBgmVolume: vi.fn(),
    setSfxVolume: vi.fn(),
    duckBgm: vi.fn(),
    unduckBgm: vi.fn(),
    pauseAll: vi.fn(),
    resumeAll: vi.fn(),
    bgmVolume: ref(0.3),
    sfxVolume: ref(0.5),
    ...overrides,
  }
}
