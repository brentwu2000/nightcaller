<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTts } from '@/composables/useTts'
import { DEFAULT_SALEM_CONFIG, getWitchCount } from '@/types/witch-hunt'
import type { SalemGameConfig } from '@/types/witch-hunt'
import VolumeSlider from '@/components/VolumeSlider.vue'

const router = useRouter()
const settings = useSettingsStore()
const { speak } = useTts()

const playerCount = ref(DEFAULT_SALEM_CONFIG.playerCount)
const hasGuardian = ref(DEFAULT_SALEM_CONFIG.hasGuardian)
const discussionMinutes = ref(DEFAULT_SALEM_CONFIG.discussionMinutes)
const defenseSeconds = ref(DEFAULT_SALEM_CONFIG.defenseSeconds)
const conspiracySeconds = ref(DEFAULT_SALEM_CONFIG.conspiracySeconds)
const nightWitchSeconds = ref(DEFAULT_SALEM_CONFIG.nightWitchSeconds)
const nightGuardianSeconds = ref(DEFAULT_SALEM_CONFIG.nightGuardianSeconds)
const speechRate = ref(settings.speechRate)
const speechVolume = ref(settings.speechVolume)
const musicVolume = ref(settings.musicVolume)
const sfxVolume = ref(settings.sfxVolume)

const playerOptions = [4, 5, 6, 7, 8, 9, 10, 11, 12]

const witchCount = computed(() => getWitchCount(playerCount.value))
const villagerCount = computed(() => playerCount.value - witchCount.value)

const isConfigValid = computed(() =>
  playerCount.value >= 4 && playerCount.value <= 12,
)

function buildRulesText(): string {
  return `歡迎來到獵巫鎮，薩勒姆，一六九二年。
恐懼與猜疑籠罩著這個小鎮。在你們之中，有人暗中修練巫術，意圖顛覆這個小鎮。
而你們，忠誠的村民，必須揪出這些巫師。
遊戲開始前，每位玩家會收到數張試煉卡。試煉卡上標記著村民或巫師。
收到巫師卡的玩家，就是巫師陣營。
白天，玩家輪流行動。你可以選擇祈禱，也就是抽兩張牌。
或者，你可以打出手牌。紅色指控卡，用來指控你懷疑的對象。
藍色咒語卡，可以保護自己或影響他人。綠色行動卡，可以偷牌、移除指控等。
當一位玩家累積了七點指控，審判將會開始。
被告有機會辯護，然後所有人同時投票。
如果多數人認為有罪，被告必須翻開所有試煉卡。
每一輪結束前，會發生共謀事件。
每位玩家將一張隱藏的試煉卡傳給左邊的人。
如果你收到了巫師卡，你就成了巫師。你的靈魂，已經墮落了。
夜晚來臨時，巫師們會睜開眼睛，一致決定殺害一名村民。
${hasGuardian.value ? '如果有人持有星座卡，他可以守護一名玩家免於死亡。' : ''}
村民陣營的目標：揭開所有巫師卡。
巫師陣營的目標：消滅所有村民，或讓所有人墮落。
準備好了嗎？薩勒姆的命運，掌握在你們手中。`
}

async function speakRules(): Promise<void> {
  await speak(buildRulesText(), { rate: speechRate.value, volume: speechVolume.value })
}

function startGame(): void {
  if (!isConfigValid.value) return

  const config: SalemGameConfig = {
    playerCount: playerCount.value,
    witchCount: witchCount.value,
    hasGuardian: hasGuardian.value,
    discussionMinutes: discussionMinutes.value,
    defenseSeconds: defenseSeconds.value,
    conspiracySeconds: conspiracySeconds.value,
    nightWitchSeconds: nightWitchSeconds.value,
    nightGuardianSeconds: nightGuardianSeconds.value,
    speechRate: speechRate.value,
    speechVolume: speechVolume.value,
    musicVolume: musicVolume.value,
    sfxVolume: sfxVolume.value,
  }

  settings.speechRate = speechRate.value
  settings.speechVolume = speechVolume.value
  settings.musicVolume = musicVolume.value
  settings.sfxVolume = sfxVolume.value

  router.push({
    path: '/witch-hunt/play',
    query: { config: encodeURIComponent(JSON.stringify(config)) },
  })
}

function goBack(): void {
  router.push('/')
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <header class="setup-header">
      <h1 class="setup-title">
        <span class="title-emoji">&#x2696;</span>
        獵巫鎮 Salem 1692
      </h1>
      <p class="setup-subtitle">薩勒姆審判 — 社交推理桌遊語音主持</p>
    </header>

    <!-- Player Count -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">玩家人數</h2>
      <div class="player-selector">
        <button
          v-for="n in playerOptions"
          :key="n"
          class="player-btn"
          :class="{ active: playerCount === n }"
          @click="playerCount = n"
        >
          {{ n }}
        </button>
      </div>
      <div class="faction-hint">
        村民 {{ villagerCount }} 人 / 巫師 {{ witchCount }} 人
      </div>
    </section>

    <!-- Guardian Toggle -->
    <section class="setup-card mb-lg">
      <div class="toggle-row">
        <div>
          <h2 class="section-title" style="margin-bottom: 0">守護者（星座卡）</h2>
          <p class="toggle-desc">每晚可保護一名玩家免於被殺</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="hasGuardian" />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </section>

    <!-- Time Settings -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">時間設定</h2>

      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x2600;</span>
          <span class="time-label">討論時間</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="discussionMinutes = Math.max(1, discussionMinutes - 1)">-</button>
          <span class="time-value">{{ discussionMinutes }} 分鐘</span>
          <button class="time-btn" @click="discussionMinutes = Math.min(10, discussionMinutes + 1)">+</button>
        </div>
      </div>

      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F6E1;</span>
          <span class="time-label">辯護時間</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="defenseSeconds = Math.max(30, defenseSeconds - 15)">-</button>
          <span class="time-value">{{ defenseSeconds }} 秒</span>
          <button class="time-btn" @click="defenseSeconds = Math.min(180, defenseSeconds + 15)">+</button>
        </div>
      </div>

      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F91D;</span>
          <span class="time-label">共謀傳遞</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="conspiracySeconds = Math.max(10, conspiracySeconds - 5)">-</button>
          <span class="time-value">{{ conspiracySeconds }} 秒</span>
          <button class="time-btn" @click="conspiracySeconds = Math.min(30, conspiracySeconds + 5)">+</button>
        </div>
      </div>

      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F319;</span>
          <span class="time-label">巫師行動</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="nightWitchSeconds = Math.max(5, nightWitchSeconds - 2)">-</button>
          <span class="time-value">{{ nightWitchSeconds }} 秒</span>
          <button class="time-btn" @click="nightWitchSeconds = Math.min(20, nightWitchSeconds + 2)">+</button>
        </div>
      </div>

      <div v-if="hasGuardian" class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x2B50;</span>
          <span class="time-label">守護者行動</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="nightGuardianSeconds = Math.max(5, nightGuardianSeconds - 2)">-</button>
          <span class="time-value">{{ nightGuardianSeconds }} 秒</span>
          <button class="time-btn" @click="nightGuardianSeconds = Math.min(15, nightGuardianSeconds + 2)">+</button>
        </div>
      </div>
    </section>

    <!-- Audio Settings -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">音訊設定</h2>
      <div class="sliders">
        <VolumeSlider v-model="speechRate" label="話速" icon="&#x1F50A;" :min="0.5" :max="2" :step="0.1" />
        <VolumeSlider v-model="speechVolume" label="語音音量" icon="&#x1F399;" :min="0" :max="1" :step="0.1" />
        <VolumeSlider v-model="musicVolume" label="音樂音量" icon="&#x1F3B5;" :min="0" :max="1" :step="0.1" />
        <VolumeSlider v-model="sfxVolume" label="音效音量" icon="&#x2728;" :min="0" :max="1" :step="0.1" />
      </div>
    </section>

    <!-- Preparation Notes -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">遊戲準備清單</h2>
      <ul class="prep-list">
        <li><span class="prep-icon">&#x1F0CF;</span> 試煉卡（巫師 {{ witchCount }} 張 + 村民若干張）</li>
        <li><span class="prep-icon">&#x1F534;</span> 紅色指控卡（每張 1 點，累積 7 點觸發審判）</li>
        <li><span class="prep-icon">&#x1F535;</span> 藍色咒語卡（Piety、Matchmaker 等）</li>
        <li><span class="prep-icon">&#x1F7E2;</span> 綠色行動卡（Robbery、Alibi 等）</li>
        <li v-if="hasGuardian"><span class="prep-icon">&#x2B50;</span> 星座卡（守護者用）</li>
        <li><span class="prep-icon">&#x1F4F1;</span> 將手機放在桌子中央</li>
        <li><span class="prep-icon">&#x1F507;</span> 夜晚和共謀時請保持安靜</li>
      </ul>
    </section>

    <!-- Actions -->
    <div class="setup-actions">
      <button class="btn btn-outline btn-block rules-btn mb-md" @click="speakRules">
        規則語音說明 &#x1F4E2;
      </button>
      <button
        class="btn btn-primary btn-lg btn-block start-btn"
        :disabled="!isConfigValid"
        @click="startGame"
      >
        開始審判 &#x2696;
      </button>
    </div>

    <!-- Back button -->
    <button class="btn-back" @click="goBack">&larr;</button>
  </div>
</template>

<style scoped>
.setup-header {
  text-align: center;
  padding: var(--space-xl) 0 var(--space-lg);
}

.setup-title {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.title-emoji { font-size: var(--font-xxl); }

.setup-subtitle {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}

.btn-back {
  position: fixed;
  top: calc(var(--space-lg) + env(safe-area-inset-top, 0px));
  left: var(--space-lg);
  font-size: var(--font-xl);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  z-index: 10;
}

.setup-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--color-border);
}

.section-title {
  font-size: var(--font-md);
  font-weight: 700;
  margin-bottom: var(--space-md);
  color: var(--color-text);
}

/* Player selector */
.player-selector {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
  flex-wrap: wrap;
}

.player-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  font-size: var(--font-md);
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-bg-surface);
  transition: all var(--anim-fast) ease;
}

.player-btn.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(91, 106, 191, 0.35);
}

.faction-hint {
  text-align: center;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-sm);
}

/* Toggle */
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-desc {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}

.toggle-switch {
  position: relative;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: var(--color-border);
  transition: background var(--anim-fast) ease;
  cursor: pointer;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #FFFFFF;
  top: 3px;
  left: 3px;
  transition: transform var(--anim-fast) ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

/* Time settings */
.time-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
}

.time-label-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.time-icon { font-size: var(--font-md); }
.time-label { font-size: var(--font-sm); color: var(--color-text); }

.time-control {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.time-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid var(--color-primary);
  font-size: var(--font-lg);
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-btn:active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.time-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-sm);
  font-weight: 600;
  min-width: 60px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* Sliders */
.sliders {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* Prep list */
.prep-list {
  list-style: none;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.prep-list li {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.prep-icon { font-size: var(--font-md); flex-shrink: 0; }

/* Actions */
.setup-actions {
  padding: var(--space-lg) 0 var(--space-xl);
}

.rules-btn { border-radius: var(--radius-full); }

.start-btn {
  font-size: var(--font-lg);
  letter-spacing: 0.02em;
}

.start-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
