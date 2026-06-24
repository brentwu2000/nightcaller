<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settingsStore'
import { useTts } from '@/composables/useTts'
import {
  ONW_ROLES,
  ONW_MIN_PLAYERS,
  ONW_MAX_PLAYERS,
  ONW_CENTER_CARD_COUNT,
  DEFAULT_ONW_CONFIG,
  RECOMMENDED_ROLES,
  isOnwRoleConfigValid,
  countRoles,
  getFactionColor,
  getFactionLabel,
} from '@/types/one-night-werewolf'
import type { OnwGameConfig, OnwRoleId, OnwFaction } from '@/types/one-night-werewolf'
import VolumeSlider from '@/components/VolumeSlider.vue'
import RoleInfoModal from '../components/RoleInfoModal.vue'

const router = useRouter()
const settings = useSettingsStore()
const { speak } = useTts()

const playerCount = ref(DEFAULT_ONW_CONFIG.playerCount)
const selectedRoles = ref<OnwRoleId[]>([...DEFAULT_ONW_CONFIG.selectedRoles])
const discussionMinutes = ref(DEFAULT_ONW_CONFIG.discussionMinutes)
const voteCountdownSeconds = ref(DEFAULT_ONW_CONFIG.voteCountdownSeconds)
const nightSilenceSeconds = ref(DEFAULT_ONW_CONFIG.nightSilenceSeconds)
const speechRate = ref(settings.speechRate)
const speechVolume = ref(settings.speechVolume)
const musicVolume = ref(settings.musicVolume)
const sfxVolume = ref(settings.sfxVolume)

// Role info modal
const inspectingRoleId = ref<OnwRoleId | null>(null)
const inspectingRoleImg = computed(() =>
  inspectingRoleId.value ? ROLE_IMGS[inspectingRoleId.value] : undefined,
)

function openRoleInfo(id: OnwRoleId): void {
  inspectingRoleId.value = id
}

const requiredTotal = computed(() => playerCount.value + ONW_CENTER_CARD_COUNT)
const currentTotal = computed(() => selectedRoles.value.length)
const isValid = computed(() => isOnwRoleConfigValid(playerCount.value, selectedRoles.value))
const roleCounts = computed(() => countRoles(selectedRoles.value))

const ONW_BOX_IMG = 'https://cdn.shopify.com/s/files/1/0740/4855/products/ONUW_272896be-e795-4aec-9e37-ccd43ca0872d.png?v=1653932533'

// Role card display definitions
interface RoleCardDef {
  id: OnwRoleId
  name: string
  faction: OnwFaction
  description: string
  maxCount: number
  emoji: string
}

const ROLE_EMOJIS: Record<OnwRoleId, string> = {
  werewolf: '\u{1F43A}',
  minion: '\u{1F608}',
  mason: '\u{1F91D}',
  seer: '\u{1F52E}',
  robber: '\u{1F978}',
  troublemaker: '\u{1F608}',
  drunk: '\u{1F37A}',
  hunter: '\u{1F3AF}',
  insomniac: '\u{1F441}',
  tanner: '\u{1F9F6}',
  villager: '\u{1F9D1}\u200D\u{1F33E}',
  doppelganger: '\u{1F46F}',
}

const UBG_BASE = 'https://www.ultraboardgames.com/one-night-ultimate-werewolf/gfx'

const ROLE_IMGS: Record<OnwRoleId, string> = {
  werewolf: `${UBG_BASE}/werewolf.jpg`,
  minion: `${UBG_BASE}/minion.jpg`,
  mason: `${UBG_BASE}/mason.jpg`,
  seer: `${UBG_BASE}/seer.jpg`,
  robber: `${UBG_BASE}/robber.jpg`,
  troublemaker: `${UBG_BASE}/troublemaker.jpg`,
  drunk: `${UBG_BASE}/drunk.jpg`,
  hunter: `${UBG_BASE}/hunter.jpg`,
  insomniac: `${UBG_BASE}/insomniac.jpg`,
  tanner: `${UBG_BASE}/tanner.jpg`,
  villager: `${UBG_BASE}/villager.jpg`,
  doppelganger: `${UBG_BASE}/doppleganger.jpg`,
}

// Display roles: werewolf faction first, then village, then special
const DISPLAY_ORDER: OnwRoleId[] = [
  'werewolf', 'minion',
  'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'hunter',
  'tanner', 'villager',
  'doppelganger',
]

const roleCardDefs = computed<RoleCardDef[]>(() =>
  DISPLAY_ORDER.map((id) => {
    const role = ONW_ROLES[id]
    return {
      id,
      name: role.name,
      faction: role.faction,
      description: role.description,
      maxCount: role.maxCount,
      emoji: ROLE_EMOJIS[id],
    }
  }),
)

function addRole(id: OnwRoleId): void {
  const role = ONW_ROLES[id]
  const current = roleCounts.value[id]
  if (current < role.maxCount) {
    selectedRoles.value = [...selectedRoles.value, id]
  }
}

function removeRole(id: OnwRoleId): void {
  const idx = selectedRoles.value.lastIndexOf(id)
  if (idx !== -1) {
    const next = [...selectedRoles.value]
    next.splice(idx, 1)
    selectedRoles.value = next
  }
}

function applyRecommended(): void {
  const rec = RECOMMENDED_ROLES[playerCount.value]
  if (rec) {
    selectedRoles.value = [...rec]
  }
}

function setPlayerCount(n: number): void {
  playerCount.value = n
  // Auto-apply recommended if current selection doesn't match
  const rec = RECOMMENDED_ROLES[n]
  if (rec) {
    selectedRoles.value = [...rec]
  }
}

// Faction summary
const factionSummary = computed(() => {
  let village = 0
  let werewolfCount = 0
  let tannerCount = 0
  for (const roleId of selectedRoles.value) {
    const role = ONW_ROLES[roleId]
    if (role.faction === 'village') village++
    else if (role.faction === 'werewolf') werewolfCount++
    else if (role.faction === 'tanner') tannerCount++
  }
  return { village, werewolf: werewolfCount, tanner: tannerCount }
})

// Warnings
const warnings = computed<string[]>(() => {
  const w: string[] = []
  if (currentTotal.value !== requiredTotal.value) {
    const diff = requiredTotal.value - currentTotal.value
    if (diff > 0) w.push(`還需要加入 ${diff} 張角色牌`)
    else w.push(`多了 ${-diff} 張角色牌，請移除`)
  }
  if (roleCounts.value.werewolf === 0 && roleCounts.value.minion === 0) {
    w.push('建議至少加入一張狼人陣營角色')
  }
  return w
})

const RULES_TEXT = `一夜終極狼人殺遊戲規則。
每位玩家拿到一張角色牌，桌面中央放三張中間牌。
夜晚階段：各角色按順序執行行動，牌可能被交換。
白天階段：所有人討論，找出你認為的狼人。
投票階段：倒數結束後，所有人同時指向一名玩家。得票最多的被淘汰。
勝負判定：淘汰狼人則村民勝；未淘汰狼人則狼人勝；淘汰皮匠則皮匠獨贏。
注意：你手上的牌可能在夜晚被交換了！`

async function speakRules(): Promise<void> {
  await speak(RULES_TEXT, { rate: speechRate.value, volume: speechVolume.value })
}

function startGame(): void {
  if (!isValid.value) return

  const gameConfig: OnwGameConfig = {
    playerCount: playerCount.value,
    selectedRoles: [...selectedRoles.value],
    discussionMinutes: discussionMinutes.value,
    voteCountdownSeconds: voteCountdownSeconds.value,
    nightSilenceSeconds: nightSilenceSeconds.value,
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
    path: '/one-night-werewolf/play',
    query: { config: encodeURIComponent(JSON.stringify(gameConfig)) },
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
        :src="ONW_BOX_IMG"
        alt="一夜終極狼人殺"
        class="setup-banner"
        loading="eager"
      />
      <h1 class="setup-title">
        <span class="title-emoji">&#x1F43A;</span>
        一夜終極狼人殺
      </h1>
    </header>

    <!-- Player Count -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">玩家人數</h2>
      <div class="player-selector">
        <button
          v-for="n in (ONW_MAX_PLAYERS - ONW_MIN_PLAYERS + 1)"
          :key="n + ONW_MIN_PLAYERS - 1"
          class="player-btn"
          :class="{ active: playerCount === n + ONW_MIN_PLAYERS - 1 }"
          @click="setPlayerCount(n + ONW_MIN_PLAYERS - 1)"
        >
          {{ n + ONW_MIN_PLAYERS - 1 }}
        </button>
      </div>
      <div class="card-count" :class="{ 'card-count--valid': isValid, 'card-count--invalid': !isValid }">
        已選 {{ currentTotal }} / {{ requiredTotal }} 張（{{ playerCount }} 玩家 + 3 中間牌）
      </div>
    </section>

    <!-- Role Selection -->
    <section class="setup-card mb-lg">
      <div class="section-header">
        <h2 class="section-title">角色牌選擇</h2>
        <button class="btn-recommend" @click="applyRecommended">
          推薦配置
        </button>
      </div>

      <div class="role-pool">
        <div
          v-for="card in roleCardDefs"
          :key="card.id"
          class="role-pool-card"
          :class="{
            'role-pool-card--active': roleCounts[card.id] > 0,
            'role-pool-card--village': card.faction === 'village',
            'role-pool-card--werewolf': card.faction === 'werewolf',
            'role-pool-card--tanner': card.faction === 'tanner',
            'role-pool-card--advanced': card.id === 'doppelganger',
          }"
        >
          <div class="role-pool-card__img-wrap" @click="openRoleInfo(card.id)">
            <img
              :src="ROLE_IMGS[card.id]"
              :alt="card.name"
              class="role-pool-card__img"
              loading="lazy"
            />
            <div class="role-pool-card__glow"></div>
            <button class="role-pool-card__info" @click.stop="openRoleInfo(card.id)">?</button>
            <span
              v-if="card.id === 'doppelganger'"
              class="role-pool-card__badge"
            >進階</span>
          </div>
          <span class="role-pool-card__name">{{ card.name }}</span>
          <span
            class="role-pool-card__faction"
            :style="{ color: getFactionColor(card.faction) }"
          >{{ getFactionLabel(card.faction) }}</span>
          <div class="role-pool-card__controls">
            <button
              class="ctrl-btn ctrl-btn--minus"
              :disabled="roleCounts[card.id] === 0"
              @click="removeRole(card.id)"
            >-</button>
            <span class="ctrl-count">{{ roleCounts[card.id] }}</span>
            <button
              class="ctrl-btn ctrl-btn--plus"
              :disabled="roleCounts[card.id] >= card.maxCount"
              @click="addRole(card.id)"
            >+</button>
          </div>
        </div>
      </div>

      <!-- Warnings -->
      <div
        v-for="(w, i) in warnings"
        :key="i"
        class="config-warning"
      >
        {{ w }}
      </div>
    </section>

    <!-- Faction Summary -->
    <section class="setup-card setup-card--roles mb-lg">
      <h2 class="section-title">陣營組成</h2>
      <div class="faction-bar">
        <div class="faction-item faction-item--village">
          <span class="faction-dot" style="background: #42A5F5;"></span>
          <span class="faction-label">村民</span>
          <span class="faction-count">{{ factionSummary.village }}</span>
        </div>
        <div class="faction-item faction-item--werewolf">
          <span class="faction-dot" style="background: #EF5350;"></span>
          <span class="faction-label">狼人</span>
          <span class="faction-count">{{ factionSummary.werewolf }}</span>
        </div>
        <div v-if="factionSummary.tanner > 0" class="faction-item faction-item--tanner">
          <span class="faction-dot" style="background: #FF9800;"></span>
          <span class="faction-label">皮匠</span>
          <span class="faction-count">{{ factionSummary.tanner }}</span>
        </div>
      </div>
    </section>

    <!-- Time Settings -->
    <section class="setup-card mb-lg">
      <h2 class="section-title">遊戲設定</h2>

      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F4AC;</span>
          <span class="time-label">討論時間</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="discussionMinutes = Math.max(0, discussionMinutes - 1)">-</button>
          <span class="time-value">{{ discussionMinutes === 0 ? '不限' : `${discussionMinutes} 分` }}</span>
          <button class="time-btn" @click="discussionMinutes = Math.min(15, discussionMinutes + 1)">+</button>
        </div>
      </div>

      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F44A;</span>
          <span class="time-label">投票倒數</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="voteCountdownSeconds = Math.max(3, voteCountdownSeconds - 1)">-</button>
          <span class="time-value">{{ voteCountdownSeconds }} 秒</span>
          <button class="time-btn" @click="voteCountdownSeconds = Math.min(10, voteCountdownSeconds + 1)">+</button>
        </div>
      </div>

      <div class="time-row">
        <div class="time-label-group">
          <span class="time-icon">&#x1F319;</span>
          <span class="time-label">夜晚靜默</span>
        </div>
        <div class="time-control">
          <button class="time-btn" @click="nightSilenceSeconds = Math.max(3, nightSilenceSeconds - 1)">-</button>
          <span class="time-value">{{ nightSilenceSeconds }} 秒</span>
          <button class="time-btn" @click="nightSilenceSeconds = Math.min(10, nightSilenceSeconds + 1)">+</button>
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
        <li><span class="prep-icon">&#x1F0CF;</span> 準備對應的角色牌，發給每位玩家一張</li>
        <li><span class="prep-icon">&#x1F4B3;</span> 將三張中間牌正面朝下放在桌面中央</li>
        <li><span class="prep-icon">&#x1F440;</span> 每位玩家偷看自己的角色後蓋在面前</li>
        <li><span class="prep-icon">&#x1F4F1;</span> 將手機放在桌子中央，點擊開始遊戲</li>
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
        :disabled="!isValid"
        @click="startGame"
      >
        開始遊戲 &#x25B6;
      </button>
    </div>

    <!-- Back button -->
    <button class="btn-back" @click="goBack">
      &larr;
    </button>

    <!-- Role Info Modal -->
    <RoleInfoModal
      :role-id="inspectingRoleId"
      :role-img="inspectingRoleImg"
      @close="inspectingRoleId = null"
    />
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
  color: #FFFFFF;
  z-index: 10;
  text-shadow: 0 2px 6px rgba(0,0,0,0.6);
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.section-header .section-title {
  margin-bottom: 0;
}

.btn-recommend {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--color-primary);
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-primary);
  background: transparent;
  transition: all var(--anim-micro) ease;
}

.btn-recommend:active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
}

/* Player selector */
.player-selector {
  display: flex;
  gap: var(--space-xs);
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

.card-count {
  text-align: center;
  margin-top: var(--space-md);
  font-size: var(--font-sm);
  font-weight: 600;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-full);
}

.card-count--valid {
  color: #2E7D32;
  background: rgba(46, 125, 50, 0.1);
}

.card-count--invalid {
  color: #C62828;
  background: rgba(198, 40, 40, 0.1);
}

/* Role pool grid */
.role-pool {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm);
}

.role-pool-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 0 0 var(--space-xs);
}

.role-pool-card__img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2.5px solid var(--color-border);
  transition: border-color var(--anim-fast) ease, box-shadow var(--anim-fast) ease;
}

/* Inactive state: desaturated */
.role-pool-card:not(.role-pool-card--active) .role-pool-card__img-wrap {
  filter: grayscale(0.7) brightness(0.7);
}

/* Active glow per faction */
.role-pool-card--active.role-pool-card--village .role-pool-card__img-wrap {
  border-color: #42A5F5;
  box-shadow:
    0 0 8px rgba(66, 165, 245, 0.45),
    0 0 20px rgba(66, 165, 245, 0.2),
    inset 0 0 6px rgba(66, 165, 245, 0.12);
}

.role-pool-card--active.role-pool-card--werewolf .role-pool-card__img-wrap {
  border-color: #EF5350;
  box-shadow:
    0 0 8px rgba(239, 83, 80, 0.45),
    0 0 20px rgba(239, 83, 80, 0.2),
    inset 0 0 6px rgba(239, 83, 80, 0.12);
}

.role-pool-card--active.role-pool-card--tanner .role-pool-card__img-wrap {
  border-color: #FF9800;
  box-shadow:
    0 0 8px rgba(255, 152, 0, 0.45),
    0 0 20px rgba(255, 152, 0, 0.2),
    inset 0 0 6px rgba(255, 152, 0, 0.12);
}

.role-pool-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.role-pool-card__glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity var(--anim-fast) ease;
  pointer-events: none;
}

.role-pool-card--active.role-pool-card--village .role-pool-card__glow {
  opacity: 1;
  background: linear-gradient(180deg, rgba(66, 165, 245, 0.12) 0%, rgba(66, 165, 245, 0) 60%);
}

.role-pool-card--active.role-pool-card--werewolf .role-pool-card__glow {
  opacity: 1;
  background: linear-gradient(180deg, rgba(239, 83, 80, 0.12) 0%, rgba(239, 83, 80, 0) 60%);
}

.role-pool-card--active.role-pool-card--tanner .role-pool-card__glow {
  opacity: 1;
  background: linear-gradient(180deg, rgba(255, 152, 0, 0.12) 0%, rgba(255, 152, 0, 0) 60%);
}

.role-pool-card__info {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #FFF;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  z-index: 2;
  opacity: 0.7;
  transition: opacity var(--anim-micro) ease;
}

.role-pool-card__info:active {
  opacity: 1;
  background: rgba(0, 0, 0, 0.8);
}

.role-pool-card__badge {
  position: absolute;
  top: 3px;
  left: 3px;
  font-size: 9px;
  font-weight: 700;
  color: #FFF;
  background: rgba(156, 39, 176, 0.85);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  line-height: 1.3;
}

.role-pool-card__name {
  font-size: var(--font-xs);
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
  line-height: 1.2;
}

.role-pool-card:not(.role-pool-card--active) .role-pool-card__name {
  color: var(--color-text-muted);
}

.role-pool-card__faction {
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.role-pool-card:not(.role-pool-card--active) .role-pool-card__faction {
  opacity: 0.5;
}

/* +/- controls */
.role-pool-card__controls {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.ctrl-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-text);
  background: var(--color-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--anim-micro) ease;
}

.ctrl-btn:disabled {
  opacity: 0.3;
}

.ctrl-btn--plus:not(:disabled):active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
}

.ctrl-btn--minus:not(:disabled):active {
  background: #EF5350;
  border-color: #EF5350;
  color: #FFF;
}

.ctrl-count {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-sm);
  font-weight: 700;
  min-width: 16px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.config-warning {
  margin-top: var(--space-md);
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 152, 0, 0.1);
  border-radius: var(--radius-sm);
  color: #E65100;
  font-size: var(--font-xs);
  font-weight: 600;
}

/* Faction bar */
.faction-bar {
  display: flex;
  justify-content: center;
  gap: var(--space-xl);
}

.faction-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.faction-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.faction-label {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text);
}

.faction-count {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-lg);
  font-weight: 800;
  color: var(--color-text);
}

/* Time settings */
.time-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
}

.time-row + .time-row {
  border-top: 1px solid var(--color-border);
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
  min-width: 60px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* Audio sliders */
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
