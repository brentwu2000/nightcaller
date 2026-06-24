import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const localStorageData: Record<string, string> = {}

const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageData[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageData[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageData[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageData).forEach((k) => delete localStorageData[k])
  }),
  key: vi.fn(),
  length: 0,
}

vi.stubGlobal('localStorage', mockLocalStorage)

const STORAGE_KEY = 'boardgame-host-settings'

function clearStorage() {
  Object.keys(localStorageData).forEach((k) => delete localStorageData[k])
  mockLocalStorage.getItem.mockClear()
  mockLocalStorage.setItem.mockClear()
}

describe('useSettingsStore', () => {
  beforeEach(() => {
    clearStorage()
    setActivePinia(createPinia())
    // Reset modules so the store re-evaluates localStorage on each test
    vi.resetModules()
  })

  describe('default values', () => {
    it('should use default speech rate of 1.0 when localStorage is empty', async () => {
      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()
      expect(store.speechRate).toBe(1.0)
    })

    it('should use default speech volume of 1.0', async () => {
      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()
      expect(store.speechVolume).toBe(1.0)
    })

    it('should use default music volume of 0.3', async () => {
      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()
      expect(store.musicVolume).toBe(0.3)
    })

    it('should use default sfx volume of 0.5', async () => {
      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()
      expect(store.sfxVolume).toBe(0.5)
    })

    it('should use default discussion minutes of 5', async () => {
      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()
      expect(store.defaultDiscussionMinutes).toBe(5)
    })

    it('should use default voting seconds of 30', async () => {
      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()
      expect(store.defaultVotingSeconds).toBe(30)
    })
  })

  describe('loading persisted settings', () => {
    it('should load settings from localStorage when they exist', async () => {
      const saved = {
        speechRate: 1.5,
        speechVolume: 0.8,
        musicVolume: 0.2,
        sfxVolume: 0.7,
        defaultDiscussionMinutes: 8,
        defaultVotingSeconds: 45,
      }
      localStorageData[STORAGE_KEY] = JSON.stringify(saved)

      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()

      expect(store.speechRate).toBe(1.5)
      expect(store.speechVolume).toBe(0.8)
      expect(store.musicVolume).toBe(0.2)
      expect(store.sfxVolume).toBe(0.7)
      expect(store.defaultDiscussionMinutes).toBe(8)
      expect(store.defaultVotingSeconds).toBe(45)
    })

    it('should fall back to defaults when localStorage contains invalid JSON', async () => {
      localStorageData[STORAGE_KEY] = 'not-valid-json'

      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()

      expect(store.speechRate).toBe(1.0)
    })
  })

  describe('persistence on change', () => {
    it('should persist settings to localStorage when a value changes', async () => {
      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()

      store.speechRate = 1.8

      // Wait a tick for the watcher to fire
      await new Promise((r) => setTimeout(r, 0))

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('"speechRate":1.8'),
      )
    })

    it('should persist all fields together', async () => {
      const { useSettingsStore } = await import('@/stores/settingsStore')
      const store = useSettingsStore()

      store.musicVolume = 0.1
      await new Promise((r) => setTimeout(r, 0))

      const raw = localStorageData[STORAGE_KEY]
      expect(raw).toBeDefined()
      const parsed = JSON.parse(raw) as Record<string, unknown>
      expect(parsed).toHaveProperty('speechRate')
      expect(parsed).toHaveProperty('speechVolume')
      expect(parsed).toHaveProperty('musicVolume', 0.1)
      expect(parsed).toHaveProperty('sfxVolume')
      expect(parsed).toHaveProperty('defaultDiscussionMinutes')
      expect(parsed).toHaveProperty('defaultVotingSeconds')
    })
  })
})
