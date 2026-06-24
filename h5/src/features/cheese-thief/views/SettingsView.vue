<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTts } from '@/composables/useTts'
import VolumeSlider from '@/components/VolumeSlider.vue'

const router = useRouter()
const settings = useSettingsStore()
const { speak, isSupported: ttsSupported } = useTts()

const isPwaInstalled = ref(
  window.matchMedia('(display-mode: standalone)').matches
)

async function testVoice(): Promise<void> {
  await speak('這是語音測試，你好！歡迎使用桌遊語音主持人。', {
    rate: settings.speechRate,
    volume: settings.speechVolume,
  })
}

function goBack(): void {
  router.push('/')
}
</script>

<template>
  <div class="page">
    <header class="settings-header">
      <button class="btn-back" @click="goBack">&larr;</button>
      <h1 class="page-title">設定</h1>
    </header>

    <!-- Voice settings -->
    <section class="card mb-lg">
      <h2 class="section-title">語音設定</h2>
      <div class="sliders">
        <VolumeSlider
          v-model="settings.speechRate"
          label="語速"
          :min="0.5"
          :max="2"
          :step="0.1"
        />
        <VolumeSlider
          v-model="settings.speechVolume"
          label="語音音量"
        />
      </div>
      <button class="btn btn-outline btn-block mt-lg" @click="testVoice">
        測試語音
      </button>
      <div v-if="!ttsSupported" class="tts-warning mt-md">
        您的瀏覽器不支援語音合成功能
      </div>
    </section>

    <!-- Audio settings -->
    <section class="card mb-lg">
      <h2 class="section-title">音訊設定</h2>
      <div class="sliders">
        <VolumeSlider
          v-model="settings.musicVolume"
          label="音樂音量"
        />
        <VolumeSlider
          v-model="settings.sfxVolume"
          label="音效音量"
        />
      </div>
    </section>

    <!-- Default game settings -->
    <section class="card mb-lg">
      <h2 class="section-title">預設遊戲設定</h2>
      <div class="setting-row">
        <span class="setting-label">討論時間（分鐘）</span>
        <div class="setting-control">
          <button
            class="time-btn"
            @click="settings.defaultDiscussionMinutes = Math.max(1, settings.defaultDiscussionMinutes - 1)"
          >-</button>
          <span class="setting-value">{{ settings.defaultDiscussionMinutes }}</span>
          <button
            class="time-btn"
            @click="settings.defaultDiscussionMinutes = Math.min(15, settings.defaultDiscussionMinutes + 1)"
          >+</button>
        </div>
      </div>
      <div class="setting-row mt-md">
        <span class="setting-label">投票時間（秒）</span>
        <div class="setting-control">
          <button
            class="time-btn"
            @click="settings.defaultVotingSeconds = Math.max(10, settings.defaultVotingSeconds - 10)"
          >-</button>
          <span class="setting-value">{{ settings.defaultVotingSeconds }}</span>
          <button
            class="time-btn"
            @click="settings.defaultVotingSeconds = Math.min(120, settings.defaultVotingSeconds + 10)"
          >+</button>
        </div>
      </div>
    </section>

    <!-- App info -->
    <section class="card mb-lg">
      <h2 class="section-title">應用資訊</h2>
      <div class="info-row">
        <span class="info-label">版本</span>
        <span class="info-value text-muted">1.0.0</span>
      </div>
      <div class="info-row mt-sm">
        <span class="info-label">PWA 狀態</span>
        <span class="info-value" :class="isPwaInstalled ? 'installed' : 'not-installed'">
          {{ isPwaInstalled ? '已安裝' : '未安裝' }}
        </span>
      </div>
      <div class="info-row mt-sm">
        <span class="info-label">TTS 支援</span>
        <span class="info-value" :class="ttsSupported ? 'installed' : 'not-installed'">
          {{ ttsSupported ? '支援' : '不支援' }}
        </span>
      </div>
      <div class="info-row mt-sm">
        <span class="info-label">資料儲存</span>
        <span class="info-value text-muted">本機（IndexedDB）</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}

.btn-back {
  font-size: var(--font-xl);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
}

.section-title {
  font-size: var(--font-md);
  font-weight: 600;
  margin-bottom: var(--space-lg);
}

.sliders {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.tts-warning {
  font-size: var(--font-sm);
  color: var(--color-error);
  text-align: center;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-label {
  font-size: var(--font-sm);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.time-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-border);
  font-size: var(--font-lg);
  font-weight: 600;
  background: var(--color-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-btn:active {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: var(--color-primary);
}

.setting-value {
  font-size: var(--font-md);
  font-weight: 600;
  min-width: 40px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-sm);
}

.info-label {
  color: var(--color-text);
}

.info-value {
  font-weight: 500;
}

.installed {
  color: var(--color-success);
}

.not-installed {
  color: var(--color-text-muted);
}
</style>
