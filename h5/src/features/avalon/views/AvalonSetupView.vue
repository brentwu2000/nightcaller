<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTts } from '@/composables/useTts'
import {
  DEFAULT_AVALON_CONFIG,
  getRoleDistribution,
  isRoleConfigValid,
  needsDoubleFail,
  MISSION_SIZES,
} from '@/types/avalon'
import type { AvalonGameConfig, AvalonRoleConfig } from '@/types/avalon'
import VolumeSlider from '@/components/VolumeSlider.vue'

const router = useRouter()
const settings = useSettingsStore()
const { speak } = useTts()

const playerCount = ref(DEFAULT_AVALON_CONFIG.roles.playerCount)
const hasPercival = ref(DEFAULT_AVALON_CONFIG.roles.hasPercival)
const hasMorgana = ref(DEFAULT_AVALON_CONFIG.roles.hasMorgana)
const hasMordred = ref(DEFAULT_AVALON_CONFIG.roles.hasMordred)
const hasOberon = ref(DEFAULT_AVALON_CONFIG.roles.hasOberon)
const nightPauseSeconds = ref(DEFAULT_AVALON_CONFIG.nightPauseSeconds)
const speechRate = ref(settings.speechRate)
const speechVolume = ref(settings.speechVolume)
const musicVolume = ref(settings.musicVolume)
const sfxVolume = ref(settings.sfxVolume)

const playerOptions = [5, 6, 7, 8, 9, 10]

const ROLE_IMG_BASE = 'https://storage.yandexcloud.net/avalon-game/images/roles'

interface RoleCardDef {
  id: string
  name: string
  faction: 'good' | 'evil'
  image: string
  locked: boolean
}

const roleCards = computed<RoleCardDef[]>(() => [
  { id: 'merlin', name: '梅林', faction: 'good', image: `${ROLE_IMG_BASE}/merlin.webp`, locked: true },
  { id: 'assassin', name: '刺客', faction: 'evil', image: '/assassin.webp', locked: true },
  { id: 'percival', name: '派西維爾', faction: 'good', image: `${ROLE_IMG_BASE}/percival.webp`, locked: false },
  { id: 'morgana', name: '莫甘娜', faction: 'evil', image: `${ROLE_IMG_BASE}/morgana.webp`, locked: false },
  { id: 'mordred', name: '莫德雷德', faction: 'evil', image: `${ROLE_IMG_BASE}/mordred.webp`, locked: false },
  { id: 'oberon', name: '奧伯倫', faction: 'evil', image: `${ROLE_IMG_BASE}/oberon.webp`, locked: false },
])

function isRoleActive(id: string): boolean {
  switch (id) {
    case 'merlin': return true
    case 'assassin': return true
    case 'percival': return hasPercival.value
    case 'morgana': return hasMorgana.value
    case 'mordred': return hasMordred.value
    case 'oberon': return hasOberon.value
    default: return false
  }
}

function toggleRole(id: string): void {
  switch (id) {
    case 'percival': hasPercival.value = !hasPercival.value; break
    case 'morgana': hasMorgana.value = !hasMorgana.value; break
    case 'mordred': hasMordred.value = !hasMordred.value; break
    case 'oberon': hasOberon.value = !hasOberon.value; break
  }
}

const roleConfig = computed<AvalonRoleConfig>(() => ({
  playerCount: playerCount.value,
  hasPercival: hasPercival.value,
  hasMorgana: hasMorgana.value,
  hasMordred: hasMordred.value,
  hasOberon: hasOberon.value,
}))

const isConfigValid = computed(() => isRoleConfigValid(roleConfig.value))

const distribution = computed(() => getRoleDistribution(roleConfig.value))

const missionSizes = computed(() => {
  const sizes = MISSION_SIZES[playerCount.value] ?? MISSION_SIZES[7]
  return sizes.map((size, i) => ({
    round: i + 1,
    size,
    doubleFail: needsDoubleFail(playerCount.value, i),
  }))
})

function buildRulesText(): string {
  const intro = `歡迎來到阿瓦隆。
你們之中有人效忠亞瑟王，有人是莫德雷德的爪牙。
遊戲共有五輪任務。好人陣營需要完成三輪任務獲勝，邪惡陣營需要破壞三輪。`

  const flow = `每一輪，隊長提名隊伍，全員公開投票。
投票通過，隊員秘密執行任務。被否決，下一位隊長接手。
連續五次否決，邪惡直接獲勝。`

  // 特殊角色介紹
  const roleIntros: string[] = []

  // 梅林（固定存在）+ 刺客
  roleIntros.push('梅林是好人陣營的核心。他知道誰是邪惡陣營的成員，但不能暴露自己的身份。')
  roleIntros.push('刺客屬於邪惡陣營。如果好人完成三次任務，刺客有最後一次機會指認梅林。若指中，邪惡逆轉獲勝。')

  if (hasPercival.value) {
    roleIntros.push('派西維爾屬於好人陣營。他知道誰是梅林，可以暗中保護梅林。')
  }

  if (hasMorgana.value) {
    if (hasPercival.value) {
      roleIntros.push('莫甘娜屬於邪惡陣營。她會偽裝成梅林，讓派西維爾無法分辨真假梅林。')
    } else {
      roleIntros.push('莫甘娜屬於邪惡陣營。她會偽裝成梅林，混淆好人的判斷。')
    }
  }

  if (hasMordred.value) {
    roleIntros.push('莫德雷德屬於邪惡陣營。他不會被梅林看到，是隱藏最深的敵人。')
  }

  if (hasOberon.value) {
    roleIntros.push('奧伯倫屬於邪惡陣營。但他不知道其他邪惡成員是誰，其他邪惡成員也不知道他。他是孤獨的破壞者。')
  }

  const rolesSection = roleIntros.length > 0
    ? `接下來介紹本局的特殊角色。\n${roleIntros.join('\n')}`
    : ''

  const nightExplain = `夜晚階段，邪惡陣營會互相確認身份。梅林會看到邪惡陣營的成員。${hasPercival.value ? '派西維爾會看到梅林。' : ''}`

  const ending = '謹言慎行，命運取決於你們。準備好了嗎？讓我們開始。'

  return [intro, flow, rolesSection, nightExplain, ending].filter(Boolean).join('\n')
}

async function speakRules(): Promise<void> {
  await speak(buildRulesText(), { rate: speechRate.value, volume: speechVolume.value })
}

function startGame(): void {
  if (!isConfigValid.value) return

  const config: AvalonGameConfig = {
    roles: { ...roleConfig.value },
    nightPauseSeconds: nightPauseSeconds.value,
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

  router.push({
    path: '/avalon/play',
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
        src="https://shop.painkillerbg.com/cdn/shop/products/pic1398895_1_1024x1024.jpg?v=1589062770"
        alt="阿瓦隆"
        class="setup-banner"
        loading="eager"
      />
      <h1 class="setup-title">
        <span class="title-emoji">&#x1F3F0;</span>
        阿瓦隆設置
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

    <!-- Role Configuration -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">特殊角色（點擊選取）</h2>
      <div class="role-card-grid">
        <button
          v-for="role in roleCards"
          :key="role.id"
          class="role-card"
          :class="{
            'role-card--active': isRoleActive(role.id),
            'role-card--good': role.faction === 'good',
            'role-card--evil': role.faction === 'evil',
            'role-card--locked': role.locked,
          }"
          :disabled="role.locked"
          @click="toggleRole(role.id)"
        >
          <div class="role-card__img-wrap">
            <img
              :src="role.image"
              :alt="role.name"
              class="role-card__img"
              loading="lazy"
            />
            <div class="role-card__glow"></div>
            <span v-if="role.locked" class="role-card__lock">&#x1F512;</span>
          </div>
          <span class="role-card__name">{{ role.name }}</span>
          <span class="role-card__faction">{{ role.faction === 'good' ? '好人' : '邪惡' }}</span>
        </button>
      </div>
      <div v-if="!isConfigValid" class="config-warning">
        邪惡角色數量超過上限，請減少特殊邪惡角色
      </div>
    </section>

    <!-- Role Distribution Preview -->
    <section class="setup-card setup-card--roles mb-lg">
      <h2 class="section-title">角色組成預覽</h2>
      <div class="faction-summary">
        <div class="faction good-faction">
          <span class="faction-label">好人</span>
          <span class="faction-count">{{ distribution.good }}</span>
        </div>
        <span class="faction-vs">VS</span>
        <div class="faction evil-faction">
          <span class="faction-label">邪惡</span>
          <span class="faction-count">{{ distribution.evil }}</span>
        </div>
      </div>
      <div class="role-chips">
        <span
          v-for="(role, i) in distribution.roles"
          :key="i"
          class="role-chip"
          :class="i < distribution.good ? 'role-chip--good' : 'role-chip--evil'"
        >
          {{ role }}
        </span>
      </div>
    </section>

    <!-- Mission Sizes -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">任務人數</h2>
      <div class="mission-preview">
        <div
          v-for="m in missionSizes"
          :key="m.round"
          class="mission-item"
        >
          <span class="mission-round">R{{ m.round }}</span>
          <span class="mission-size">{{ m.size }}</span>
          <span v-if="m.doubleFail" class="mission-double">2F</span>
        </div>
      </div>
    </section>

    <!-- Time Settings -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">夜晚設定</h2>
      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F319;</span>
          <span class="time-label">確認等待</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="nightPauseSeconds = Math.max(3, nightPauseSeconds - 1)">-</button>
          <span class="time-value">{{ nightPauseSeconds }} 秒</span>
          <button class="time-btn" @click="nightPauseSeconds = Math.min(15, nightPauseSeconds + 1)">+</button>
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
        <li><span class="prep-icon">&#x1F0CF;</span> 準備角色卡並發給每位玩家</li>
        <li><span class="prep-icon">&#x1F44D;</span> 準備投票用的贊成/反對牌</li>
        <li><span class="prep-icon">&#x2705;</span> 準備任務成功/失敗牌</li>
        <li><span class="prep-icon">&#x1F4F1;</span> 將手機放在桌子中央</li>
      </ul>
    </section>

    <!-- Actions -->
    <div class="setup-actions">
      <button class="btn btn-outline btn-block rules-btn mb-md" @click="speakRules">
        規則語音說明
        <span class="rules-icon">&#x1F4E2;</span>
      </button>
      <button
        class="btn btn-primary btn-lg btn-block start-btn"
        :disabled="!isConfigValid"
        @click="startGame"
      >
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
  aspect-ratio: 16 / 9;
  object-fit: cover;
  object-position: center 20%;
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
  color: #FFFFFF;
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
  width: 48px;
  height: 48px;
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
  box-shadow: 0 4px 12px rgba(91, 106, 191, 0.35);
}

/* Role card grid */
.role-card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.role-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  transition: transform var(--anim-fast) ease;
}

.role-card:active:not(:disabled) {
  transform: scale(0.93);
}

.role-card--locked {
  cursor: default;
}

.role-card__img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2.5px solid var(--color-border);
  transition: border-color var(--anim-fast) ease, box-shadow var(--anim-fast) ease;
}

/* Inactive state: desaturated */
.role-card:not(.role-card--active) .role-card__img-wrap {
  filter: grayscale(0.7) brightness(0.7);
}

/* Active glow per faction */
.role-card--active.role-card--good .role-card__img-wrap {
  border-color: #42A5F5;
  box-shadow:
    0 0 10px rgba(66, 165, 245, 0.5),
    0 0 24px rgba(66, 165, 245, 0.25),
    inset 0 0 8px rgba(66, 165, 245, 0.15);
}

.role-card--active.role-card--evil .role-card__img-wrap {
  border-color: #EF5350;
  box-shadow:
    0 0 10px rgba(239, 83, 80, 0.5),
    0 0 24px rgba(239, 83, 80, 0.25),
    inset 0 0 8px rgba(239, 83, 80, 0.15);
}

.role-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Overlay glow layer for active cards */
.role-card__glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity var(--anim-fast) ease;
  pointer-events: none;
}

.role-card--active.role-card--good .role-card__glow {
  opacity: 1;
  background: linear-gradient(180deg, rgba(66, 165, 245, 0.15) 0%, rgba(66, 165, 245, 0) 60%);
}

.role-card--active.role-card--evil .role-card__glow {
  opacity: 1;
  background: linear-gradient(180deg, rgba(239, 83, 80, 0.15) 0%, rgba(239, 83, 80, 0) 60%);
}

/* Lock indicator */
.role-card__lock {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 12px;
  line-height: 1;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

/* Name & faction labels */
.role-card__name {
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
  line-height: 1.2;
  transition: color var(--anim-fast) ease;
}

.role-card:not(.role-card--active) .role-card__name {
  color: var(--color-text-muted);
}

.role-card__faction {
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.role-card--good .role-card__faction {
  color: #42A5F5;
}

.role-card--evil .role-card__faction {
  color: #EF5350;
}

.role-card:not(.role-card--active) .role-card__faction {
  opacity: 0.5;
}

.config-warning {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: var(--color-error-light, rgba(245, 108, 108, 0.1));
  border-radius: var(--radius-sm);
  color: var(--color-error, #f56c6c);
  font-size: var(--font-xs);
  font-weight: 600;
}

/* Faction summary */
.faction-summary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
  margin-bottom: var(--space-md);
}

.faction {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.faction-label {
  font-size: var(--font-xs);
  font-weight: 600;
}

.faction-count {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-xxl);
  font-weight: 800;
}

.good-faction .faction-label { color: #1565C0; }
.good-faction .faction-count { color: #1565C0; }
.evil-faction .faction-label { color: #C62828; }
.evil-faction .faction-count { color: #C62828; }

.faction-vs {
  font-size: var(--font-sm);
  font-weight: 800;
  color: var(--color-text-muted);
}

/* Role chips */
.role-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  justify-content: center;
}

.role-chip {
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 600;
}

.role-chip--good {
  background: rgba(21, 101, 192, 0.1);
  color: #1565C0;
  border: 1px solid rgba(21, 101, 192, 0.3);
}

.role-chip--evil {
  background: rgba(198, 40, 40, 0.1);
  color: #C62828;
  border: 1px solid rgba(198, 40, 40, 0.3);
}

/* Mission preview */
.mission-preview {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
}

.mission-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.mission-round {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  font-weight: 600;
}

.mission-size {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-lg);
  font-weight: 700;
}

.mission-double {
  font-size: 10px;
  color: #C62828;
  font-weight: 700;
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

.start-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>
