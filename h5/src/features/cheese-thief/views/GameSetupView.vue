<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTts } from '@/composables/useTts'
import { getRoleComposition, DEFAULT_GAME_CONFIG } from '@/types/cheese-thief'
import type { GameConfig } from '@/types/cheese-thief'
import VolumeSlider from '@/components/VolumeSlider.vue'

const router = useRouter()
const settings = useSettingsStore()
const { speak } = useTts()

const playerCount = ref(DEFAULT_GAME_CONFIG.playerCount)
const nightSecondsPerDice = ref(DEFAULT_GAME_CONFIG.nightSecondsPerDice)
const discussionMinutes = ref(settings.defaultDiscussionMinutes)
const votingSeconds = ref(settings.defaultVotingSeconds)
const speechRate = ref(settings.speechRate)
const speechVolume = ref(settings.speechVolume)
const musicVolume = ref(settings.musicVolume)
const sfxVolume = ref(settings.sfxVolume)

const playerOptions = [4, 5, 6, 7, 8]

const roles = computed(() => getRoleComposition(playerCount.value))

/** 實際發牌的角色卡（共犯不是卡片，是大盜夜晚選出的） */
const cardList = computed(() => [
  { name: '大盜', count: roles.value.thief, color: '#E53935', img: '/Thief.jpg' },
  { name: '背鍋鼠', count: roles.value.scapegoat, color: '#66BB6A', img: '/Scapegoat.jpg' },
  { name: '瞌睡鼠', count: roles.value.villager + roles.value.accomplice, color: '#43A047', img: '/Sleepyhead.jpg' },
])

const accompliceCount = computed(() => roles.value.accomplice)

function buildRulesText(count: number): string {
  const base = `歡迎來到奶酪大盜。
在這個遊戲中，你們之中有一個人是奶酪大盜，一個人是背鍋鼠，其餘都是瞌睡鼠。瞌睡鼠的任務是找出大盜。
遊戲開始前，每個人請拿起你的骰盅，在骰盅裡秘密擲骰。骰子的數字就是你的起床時間，不要讓別人看見。
夜晚階段，我會從1喊到6。當我喊到你的數字，你可以睜開眼睛。
如果只有你一個人醒來，你可以偷看任意一位玩家的骰子，但要注意，不能讓其他人知道你偷看了誰。
如果你和其他人同時醒來，請微笑，什麼都不要做。
奶酪大盜比較特別：每當有人醒來，不管是誰，大盜都必須悄悄拿走桌上的奶酪標記。`

  let accompliceRules = ''
  if (count === 4) {
    accompliceRules = `
今天是四人局，沒有共犯機制。大盜需要獨自行動。`
  } else if (count === 5 || count === 6) {
    accompliceRules = `
今天的局有共犯機制。所有號碼叫完之後，大盜可以睜開眼睛，從其餘玩家中輕輕觸碰一位玩家的手背。被觸碰的玩家就成為共犯，會與大盜互相確認身份，同進退。`
  } else if (count === 7) {
    accompliceRules = `
今天的局有共犯機制。所有號碼叫完之後，大盜可以睜開眼睛，從其餘玩家中輕輕觸碰兩位玩家的手背。被觸碰的玩家就成為共犯，共犯之間會互相確認身份，但不知道大盜是誰。`
  } else {
    accompliceRules = `
今天的局有共犯機制。所有號碼叫完之後，大盜可以睜開眼睛，從其餘玩家中輕輕觸碰兩位玩家的手背。被觸碰的玩家就成為共犯，會與大盜互相確認身份，同進退。`
  }

  const ending = `
白天到來後，大家可以討論你的觀察與推理，最後同時投票，指出你認為的奶酪大盜。
如果大多數人正確指認大盜，瞌睡鼠陣營獲勝。如果指到的是背鍋鼠，背鍋鼠單獨獲勝。否則大盜陣營獲勝。
準備好了嗎？讓我們開始。`

  return base + accompliceRules + ending
}

async function speakRules(): Promise<void> {
  await speak(buildRulesText(playerCount.value), { rate: speechRate.value, volume: speechVolume.value })
}

function startGame(): void {
  const config: GameConfig = {
    playerCount: playerCount.value,
    nightSecondsPerDice: nightSecondsPerDice.value,
    discussionMinutes: discussionMinutes.value,
    votingSeconds: votingSeconds.value,
    speechRate: speechRate.value,
    speechVolume: speechVolume.value,
    musicVolume: musicVolume.value,
    sfxVolume: sfxVolume.value,
  }

  // Save defaults
  settings.speechRate = speechRate.value
  settings.speechVolume = speechVolume.value
  settings.musicVolume = musicVolume.value
  settings.sfxVolume = sfxVolume.value
  settings.defaultDiscussionMinutes = discussionMinutes.value
  settings.defaultVotingSeconds = votingSeconds.value

  router.push({
    path: '/cheese-thief/play',
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
      <img
        src="https://shop.painkillerbg.com/cdn/shop/files/pic6951766_1024x1024.jpg?v=1744730663"
        alt="奶酪大盜"
        class="setup-banner"
        loading="eager"
      />
      <h1 class="setup-title">
        <span class="title-emoji">&#x1F42D;</span>
        遊戲設置
      </h1>
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
    </section>

    <!-- Role Composition -->
    <section class="setup-card setup-card--roles mb-lg">
      <h2 class="section-title">角色卡分配</h2>
      <div class="role-grid role-grid--3col">
        <div
          v-for="card in cardList"
          :key="card.name"
          class="role-card"
          :style="{ '--role-color': card.color }"
        >
          <div class="role-img-wrap">
            <img class="role-img" :src="card.img" :alt="card.name" />
            <span class="role-count">{{ card.count }}</span>
          </div>
          <span class="role-name">{{ card.name }}</span>
        </div>
      </div>
      <div v-if="accompliceCount > 0" class="accomplice-callout">
        <div class="accomplice-callout__icon">
          <img class="accomplice-callout__img" src="/Accomplice.jpg" alt="共犯" />
        </div>
        <div class="accomplice-callout__text">
          <span class="accomplice-callout__title">共犯 &times;{{ accompliceCount }}</span>
          <span class="accomplice-callout__desc">夜晚由大盜從其餘玩家中指定</span>
        </div>
      </div>
    </section>

    <!-- Time Settings -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">時間設定</h2>
      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x23F3;</span>
          <span class="time-label">每號等待</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="nightSecondsPerDice = Math.max(3, nightSecondsPerDice - 1)">-</button>
          <span class="time-value">{{ nightSecondsPerDice }} 秒</span>
          <button class="time-btn" @click="nightSecondsPerDice = Math.min(15, nightSecondsPerDice + 1)">+</button>
        </div>
      </div>
      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F4AC;</span>
          <span class="time-label">討論時間</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="discussionMinutes = Math.max(1, discussionMinutes - 1)">-</button>
          <span class="time-value">{{ discussionMinutes }} 分鐘</span>
          <button class="time-btn" @click="discussionMinutes = Math.min(15, discussionMinutes + 1)">+</button>
        </div>
      </div>
      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F5F3;</span>
          <span class="time-label">投票時間</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="votingSeconds = Math.max(10, votingSeconds - 10)">-</button>
          <span class="time-value">{{ votingSeconds }} 秒</span>
          <button class="time-btn" @click="votingSeconds = Math.min(120, votingSeconds + 10)">+</button>
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
      <h2 class="section-title">遊戲準備</h2>
      <ul class="prep-list">
        <li><span class="prep-icon">&#x1F9C0;</span> 準備角色卡（大盜、背鍋鼠、瞌睡鼠）</li>
        <li><span class="prep-icon">&#x1F9C0;</span> 每人一張骰子號碼卡（1-6）</li>
        <li><span class="prep-icon">&#x1F9C0;</span> 將手機放在桌子中央</li>
      </ul>
    </section>

    <!-- Actions -->
    <div class="setup-actions">
      <button class="btn btn-outline btn-block rules-btn mb-md" @click="speakRules">
        規則語音說明
        <span class="rules-icon">&#x1F4E2;</span>
      </button>
      <button class="btn btn-primary btn-lg btn-block start-btn" @click="startGame">
        開始遊戲 &#x25B6;
      </button>
    </div>

    <!-- Back button floating -->
    <button class="btn-back" @click="goBack">
      &larr;
    </button>
  </div>
</template>

<style scoped>
/* Header */
.setup-header {
  text-align: center;
  padding: 0 0 var(--space-lg);
}

.setup-banner {
  width: calc(100% + var(--space-lg) * 2);
  margin-left: calc(var(--space-lg) * -1);
  margin-top: calc(var(--space-lg) * -1);
  height: 140px;
  object-fit: cover;
  object-position: center 30%;
  display: block;
  border-radius: 0;
  margin-bottom: var(--space-lg);
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

.title-emoji {
  font-size: var(--font-xxl);
}

/* Back button */
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

/* Setup card sections */
.setup-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  border: 1px solid var(--color-border);
}

.setup-card--roles {
  border-color: var(--color-primary-light);
  border-width: 2px;
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
}

.player-btn {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  font-size: var(--font-lg);
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
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.35);
}

/* Role grid */
.role-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.role-grid--3col {
  grid-template-columns: repeat(3, 1fr);
}

.role-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.role-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2px solid var(--role-color);
}

.role-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
  display: block;
}

.role-count {
  position: absolute;
  top: var(--space-xs);
  left: var(--space-xs);
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--role-color);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: var(--font-sm);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  z-index: 1;
}

.role-name {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
}

.accomplice-callout {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  background: rgba(255, 112, 67, 0.08);
  border: 1px dashed rgba(255, 112, 67, 0.4);
}

.accomplice-callout__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #FF7043;
}

.accomplice-callout__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%;
}

.accomplice-callout__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.accomplice-callout__title {
  font-size: var(--font-sm);
  font-weight: 700;
  color: #FF7043;
}

.accomplice-callout__desc {
  font-size: var(--font-xs);
  color: var(--color-text-secondary);
}

/* Time settings */
.time-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.time-row:last-child {
  border-bottom: none;
}

.time-label-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.time-icon {
  font-size: var(--font-md);
}

.time-label {
  font-size: var(--font-sm);
  color: var(--color-text);
}

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
  transition: all var(--anim-micro) ease;
}

.time-btn:active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

.time-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-sm);
  font-weight: 600;
  min-width: 70px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* Audio sliders */
.sliders {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* Preparation list */
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

.prep-icon {
  font-size: var(--font-md);
  flex-shrink: 0;
}

/* Action buttons */
.setup-actions {
  padding: var(--space-lg) 0 var(--space-xl);
}

.rules-btn {
  border-radius: var(--radius-full);
}

.rules-icon {
  font-size: var(--font-md);
}

.start-btn {
  font-size: var(--font-lg);
  letter-spacing: 0.02em;
}
</style>
