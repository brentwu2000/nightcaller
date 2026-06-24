import 'fake-indexeddb/auto'
import { vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Web Speech API mock
// ---------------------------------------------------------------------------

export class MockSpeechSynthesisUtterance {
  text: string
  lang: string = 'zh-TW'
  rate: number = 1.0
  volume: number = 1.0
  pitch: number = 1.0
  voice: SpeechSynthesisVoice | null = null

  onstart: ((event: SpeechSynthesisEvent) => void) | null = null
  onend: ((event: SpeechSynthesisEvent) => void) | null = null
  onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null

  constructor(text: string) {
    this.text = text
  }
}

export const mockSpeechSynthesis = {
  speaking: false,
  paused: false,
  pending: false,
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [] as SpeechSynthesisVoice[]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onvoiceschanged: null,
}

// Install global mocks before each test
beforeEach(() => {
  vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance)
  vi.stubGlobal('speechSynthesis', mockSpeechSynthesis)

  // Reset call counts but keep the mock function references
  mockSpeechSynthesis.speak.mockReset()
  mockSpeechSynthesis.cancel.mockReset()
  mockSpeechSynthesis.pause.mockReset()
  mockSpeechSynthesis.resume.mockReset()
  mockSpeechSynthesis.getVoices.mockReset()
  mockSpeechSynthesis.getVoices.mockReturnValue([])

  // Reset state properties
  mockSpeechSynthesis.speaking = false
  mockSpeechSynthesis.paused = false
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Howler mock — prevent real audio loading in tests
// ---------------------------------------------------------------------------

vi.mock('howler', () => {
  const HowlMock = vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    unload: vi.fn(),
    playing: vi.fn(() => false),
    volume: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }))

  return { Howl: HowlMock }
})
