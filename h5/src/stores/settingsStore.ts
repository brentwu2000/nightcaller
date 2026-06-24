import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'boardgame-host-settings'

interface PersistedSettings {
  speechRate: number
  speechVolume: number
  musicVolume: number
  sfxVolume: number
  defaultDiscussionMinutes: number
  defaultVotingSeconds: number
}

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as PersistedSettings
    }
  } catch {
    // ignore parse errors
  }
  return {
    speechRate: 1.0,
    speechVolume: 1.0,
    musicVolume: 0.3,
    sfxVolume: 0.5,
    defaultDiscussionMinutes: 5,
    defaultVotingSeconds: 30,
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = loadSettings()

  const speechRate = ref(saved.speechRate)
  const speechVolume = ref(saved.speechVolume)
  const musicVolume = ref(saved.musicVolume)
  const sfxVolume = ref(saved.sfxVolume)
  const defaultDiscussionMinutes = ref(saved.defaultDiscussionMinutes)
  const defaultVotingSeconds = ref(saved.defaultVotingSeconds)

  function persist(): void {
    const data: PersistedSettings = {
      speechRate: speechRate.value,
      speechVolume: speechVolume.value,
      musicVolume: musicVolume.value,
      sfxVolume: sfxVolume.value,
      defaultDiscussionMinutes: defaultDiscussionMinutes.value,
      defaultVotingSeconds: defaultVotingSeconds.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  // Auto-persist on change
  watch(
    [speechRate, speechVolume, musicVolume, sfxVolume, defaultDiscussionMinutes, defaultVotingSeconds],
    persist,
    { deep: true }
  )

  return {
    speechRate,
    speechVolume,
    musicVolume,
    sfxVolume,
    defaultDiscussionMinutes,
    defaultVotingSeconds,
  }
})
