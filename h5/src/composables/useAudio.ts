import { ref, onUnmounted } from 'vue'
import { Howl, Howler } from 'howler'

type BgmTrack = 'night'
type SfxName = 'tick' | 'ding' | 'whoosh' | 'vote' | 'win' | 'lose'

/**
 * Generate a WAV data URI with actual audio tones.
 */
function generateToneWav(
  freq: number,
  duration: number,
  sampleRate = 44100,
  type: OscillatorType = 'sine',
  volume = 0.3,
): string {
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample: number
    const phase = 2 * Math.PI * freq * t

    switch (type) {
      case 'square':
        sample = Math.sin(phase) >= 0 ? volume : -volume
        break
      case 'sawtooth':
        sample = volume * 2 * ((freq * t) % 1 - 0.5)
        break
      case 'triangle':
        sample = volume * (4 * Math.abs((freq * t) % 1 - 0.5) - 1)
        break
      default:
        sample = volume * Math.sin(phase)
    }

    const fadeStart = numSamples * 0.9
    if (i > fadeStart) {
      sample *= 1 - (i - fadeStart) / (numSamples - fadeStart)
    }

    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
    view.setInt16(44 + i * 2, intSample, true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

/**
 * Generate a gentle music box BGM loop.
 */
function generateMusicBgm(): string {
  const sampleRate = 44100
  const duration = 8
  const numSamples = Math.floor(sampleRate * duration)
  const buffer = new ArrayBuffer(44 + numSamples * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + numSamples * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, numSamples * 2, true)

  const scale = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3]
  const melody = [0, 2, 4, 5, 4, 2, 3, 1, 0, 4, 5, 6, 7, 5, 4, 2]
  const noteLen = duration / melody.length
  const droneFreq = 130.8

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    let sample = 0

    sample += 0.04 * Math.sin(2 * Math.PI * droneFreq * t)
    sample += 0.02 * Math.sin(2 * Math.PI * droneFreq * 2 * t)

    const noteIndex = Math.floor(t / noteLen) % melody.length
    const noteStart = noteIndex * noteLen
    const noteT = t - noteStart
    const freq = scale[melody[noteIndex]]

    const env = Math.exp(-noteT * 4) * 0.12
    sample += env * Math.sin(2 * Math.PI * freq * noteT)
    sample += env * 0.3 * Math.sin(2 * Math.PI * freq * 2 * noteT)
    sample += env * 0.1 * Math.sin(2 * Math.PI * freq * 3 * noteT)

    const fadeLen = sampleRate * 0.8
    if (i < fadeLen) {
      sample *= i / fadeLen
    } else if (i > numSamples - fadeLen) {
      sample *= (numSamples - i) / fadeLen
    }

    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)))
    view.setInt16(44 + i * 2, intSample, true)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:audio/wav;base64,${btoa(binary)}`
}

// Pre-generate audio data URIs at module load
const nightBgmUri = generateMusicBgm()
const tickUri = generateToneWav(800, 0.08, 44100, 'sine', 0.4)
const dingUri = generateToneWav(1200, 0.3, 44100, 'sine', 0.5)
const whooshUri = generateToneWav(300, 0.4, 44100, 'sawtooth', 0.2)
const voteUri = generateToneWav(600, 0.15, 44100, 'sine', 0.4)
const winUri = generateToneWav(880, 0.5, 44100, 'sine', 0.5)
const loseUri = generateToneWav(200, 0.6, 44100, 'sawtooth', 0.3)

export function useAudio() {
  const bgmVolume = ref(0.3)
  const sfxVolume = ref(0.5)

  let currentBgm: Howl | null = null
  let currentBgmTrack: BgmTrack | null = null
  let bgmWasPlaying = false

  const bgmSources: Record<BgmTrack, string> = {
    night: nightBgmUri,
  }

  const sfxSources: Record<SfxName, string> = {
    tick: tickUri,
    ding: dingUri,
    whoosh: whooshUri,
    vote: voteUri,
    win: winUri,
    lose: loseUri,
  }

  /**
   * Unlock Howler's AudioContext. MUST be called within a user gesture handler
   * (e.g. button click). On mobile, AudioContext starts suspended and requires
   * a user gesture to activate. After this, suspend/resume works from any context.
   */
  function unlock(): void {
    const ctx = Howler.ctx
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
  }

  /**
   * Load BGM without playing. Creates the Howl so it's ready for playBgm/resumeAfterTts.
   */
  function loadBgm(track: BgmTrack): void {
    if (currentBgmTrack === track && currentBgm) {
      return
    }

    stopBgm()

    currentBgm = new Howl({
      src: [bgmSources[track]],
      loop: true,
      volume: bgmVolume.value,
      preload: true,
    })
    currentBgmTrack = track
  }

  function playBgm(track: BgmTrack): void {
    if (currentBgmTrack === track && currentBgm?.playing()) {
      return
    }

    stopBgm()

    currentBgm = new Howl({
      src: [bgmSources[track]],
      loop: true,
      volume: bgmVolume.value,
    })
    currentBgmTrack = track
    currentBgm.play()
  }

  function stopBgm(): void {
    if (currentBgm) {
      currentBgm.stop()
      currentBgm.unload()
      currentBgm = null
      currentBgmTrack = null
      bgmWasPlaying = false
    }
  }

  function playSfx(name: SfxName): void {
    const sfx = new Howl({
      src: [sfxSources[name]],
      volume: sfxVolume.value,
      onend() { sfx.unload() },
      onloaderror() { sfx.unload() },
    })
    sfx.play()
  }

  function setBgmVolume(v: number): void {
    bgmVolume.value = v
    if (currentBgm) {
      currentBgm.volume(v)
    }
  }

  function setSfxVolume(v: number): void {
    sfxVolume.value = v
  }

  /**
   * Pause BGM before TTS speech.
   * On mobile, Web Speech API and Web Audio API compete for the audio session.
   * Pausing all Howler audio allows TTS to use the session.
   * After TTS finishes, call resumeAfterTts() to restart BGM.
   */
  function pauseForTts(): void {
    bgmWasPlaying = currentBgm?.playing() ?? false
    if (currentBgm) {
      currentBgm.pause()
    }
  }

  /**
   * Resume BGM after TTS finishes. Starts BGM if it was loaded but never played yet
   * (e.g. after loadBgm on game start, first TTS completes → BGM should begin).
   */
  function resumeAfterTts(): void {
    if (!currentBgm) return

    // Start or resume BGM
    // If BGM was playing before TTS, resume it.
    // If BGM was loaded but never started (first TTS of night), start it now.
    if (bgmWasPlaying || !currentBgm.playing()) {
      currentBgm.play()
      bgmWasPlaying = false
    }
  }

  function pauseAll(): void {
    if (currentBgm) {
      currentBgm.pause()
    }
  }

  function resumeAll(): void {
    if (currentBgm) {
      currentBgm.play()
    }
  }

  onUnmounted(() => {
    stopBgm()
  })

  return {
    unlock,
    loadBgm,
    playBgm,
    stopBgm,
    playSfx,
    setBgmVolume,
    setSfxVolume,
    pauseForTts,
    resumeAfterTts,
    pauseAll,
    resumeAll,
    bgmVolume,
    sfxVolume,
  }
}
