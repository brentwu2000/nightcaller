<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOnwGame } from '../composables/useOnwGame'
import {
  DEFAULT_ONW_CONFIG,
  ONW_ROLES,
  ONW_MIN_PLAYERS,
  ONW_MAX_PLAYERS,
  ONW_CENTER_CARD_COUNT,
} from '@/types/one-night-werewolf'
import type { OnwGameConfig, OnwRoleId, OnwVoteResult } from '@/types/one-night-werewolf'
import VolumeSlider from '@/components/VolumeSlider.vue'
import { useWakeLock } from '@/composables/useWakeLock'

const route = useRoute()
const router = useRouter()

const game = useOnwGame()
const wakeLock = useWakeLock()
const showVolumePanel = ref(false)

// Result input state
const isTie = ref(false)
const selectedEliminatedRoles = ref<OnwRoleId[]>([])

const dataPhase = computed(() => {
  if (game.phase.value === 'night') return 'night'
  return undefined
})

const phaseLabel = computed(() => {
  switch (game.phase.value) {
    case 'night': return '夜晚階段'
    case 'discussion': return '白天討論'
    case 'vote': return '投票階段'
    case 'result': return '結果輸入'
    case 'finished': return '遊戲結束'
    default: return ''
  }
})

const nightStepLabel = computed(() => {
  const step = game.nightPhase.currentStep.value
  switch (step) {
    case 'opening': return '所有人閉上眼睛'
    case 'doppelganger': return '化身幽靈行動'
    case 'werewolf': return '狼人行動'
    case 'minion': return '爪牙行動'
    case 'mason': return '守夜人行動'
    case 'seer': return '預言家行動'
    case 'robber': return '強盜行動'
    case 'troublemaker': return '搗蛋鬼行動'
    case 'drunk': return '酒鬼行動'
    case 'insomniac': return '失眠者行動'
    case 'doppelganger_second': return '化身幽靈第二次行動'
    case 'closing': return '天亮了'
    case 'completed': return '夜晚結束'
    default: return ''
  }
})

const nightStepEmoji = computed(() => {
  const step = game.nightPhase.currentStep.value
  switch (step) {
    case 'opening': return '\u{1F319}'
    case 'werewolf': return '\u{1F43A}'
    case 'minion': return '\u{1F608}'
    case 'mason': return '\u{1F91D}'
    case 'seer': return '\u{1F52E}'
    case 'robber': return '\u{1F978}'
    case 'troublemaker': return '\u{1F608}'
    case 'drunk': return '\u{1F37A}'
    case 'insomniac': return '\u{1F441}'
    case 'doppelganger': case 'doppelganger_second': return '\u{1F46F}'
    case 'closing': return '\u{2600}\u{FE0F}'
    default: return '\u{1F319}'
  }
})

const winMessage = computed(() => {
  if (!game.gameResult.value) return ''
  switch (game.gameResult.value.winner) {
    case 'village': return '村民陣營獲勝！'
    case 'werewolf': return '狼人陣營獲勝！'
    case 'tanner': return '皮匠獲勝！'
    default: return '遊戲結束'
  }
})

const winClass = computed(() => {
  if (!game.gameResult.value) return ''
  switch (game.gameResult.value.winner) {
    case 'village': return 'result-card--village'
    case 'werewolf': return 'result-card--werewolf'
    case 'tanner': return 'result-card--tanner'
    default: return ''
  }
})

const winIcon = computed(() => {
  if (!game.gameResult.value) return ''
  switch (game.gameResult.value.winner) {
    case 'village': return '\u{1F451}'
    case 'werewolf': return '\u{1F43A}'
    case 'tanner': return '\u{1F3AD}'
    default: return ''
  }
})

// All available roles for result selection (unique, from what was in the game)
const availableRolesForResult = computed(() => {
  const uniqueRoles = [...new Set(game.config.value.selectedRoles)]
  return uniqueRoles.map((id) => ({
    id,
    name: ONW_ROLES[id].name,
    faction: ONW_ROLES[id].faction,
  }))
})

function toggleEliminatedRole(roleId: OnwRoleId): void {
  if (isTie.value) return
  const idx = selectedEliminatedRoles.value.indexOf(roleId)
  if (idx !== -1) {
    selectedEliminatedRoles.value.splice(idx, 1)
  } else {
    selectedEliminatedRoles.value.push(roleId)
  }
}

function handleSubmitResult(): void {
  const voteResult: OnwVoteResult = {
    eliminatedRoles: isTie.value ? [] : [...selectedEliminatedRoles.value],
    isTie: isTie.value,
  }
  game.submitResult(voteResult)
}

const canSubmitResult = computed(() => {
  return isTie.value || selectedEliminatedRoles.value.length > 0
})

// Config parsing
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function validateConfig(raw: Record<string, unknown>): OnwGameConfig {
  const playerCount = clamp(Math.round(Number(raw.playerCount) || 5), ONW_MIN_PLAYERS, ONW_MAX_PLAYERS)
  const rawRoles = raw.selectedRoles as unknown
  let selectedRoles: OnwRoleId[] = DEFAULT_ONW_CONFIG.selectedRoles

  if (Array.isArray(rawRoles) && rawRoles.length === playerCount + ONW_CENTER_CARD_COUNT) {
    const validRoleIds = Object.keys(ONW_ROLES)
    if (rawRoles.every((r) => typeof r === 'string' && validRoleIds.includes(r))) {
      selectedRoles = rawRoles as OnwRoleId[]
    }
  }

  return {
    playerCount,
    selectedRoles,
    discussionMinutes: clamp(Math.round(Number(raw.discussionMinutes) || 5), 0, 15),
    voteCountdownSeconds: clamp(Math.round(Number(raw.voteCountdownSeconds) || 3), 3, 10),
    nightSilenceSeconds: clamp(Math.round(Number(raw.nightSilenceSeconds) || 5), 3, 10),
    speechRate: clamp(Number(raw.speechRate) || 1, 0.5, 2),
    speechVolume: clamp(Number(raw.speechVolume) ?? 1, 0, 1),
    musicVolume: clamp(Number(raw.musicVolume) ?? 0.3, 0, 1),
    sfxVolume: clamp(Number(raw.sfxVolume) ?? 0.5, 0, 1),
  }
}

function parseConfig(): OnwGameConfig {
  try {
    const raw = route.query.config as string | undefined
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw))
      if (typeof parsed === 'object' && parsed !== null) {
        return validateConfig(parsed as Record<string, unknown>)
      }
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_ONW_CONFIG }
}

onMounted(() => {
  const config = parseConfig()
  game.startGame(config)
  wakeLock.request()
})

onUnmounted(() => {
  game.cleanup()
  window.speechSynthesis?.cancel()
  wakeLock.release()
})

function togglePause(): void {
  if (game.isPaused.value) {
    game.resumeGame()
  } else {
    game.pauseGame()
  }
}

function handlePlayAgain(): void {
  game.playAgain()
  router.push('/one-night-werewolf/setup')
}

function handleExit(): void {
  game.cleanup()
  window.speechSynthesis?.cancel()
  router.push('/')
}

// Volume controls
const localMusicVol = ref(0.3)
const localSfxVol = ref(0.5)

onMounted(() => {
  localMusicVol.value = game.audio.bgmVolume.value
  localSfxVol.value = game.audio.sfxVolume.value
})

watch(localMusicVol, (v) => game.audio.setBgmVolume(v))
watch(localSfxVol, (v) => game.audio.setSfxVolume(v))
</script>

<template>
  <div class="play-page" :data-phase="dataPhase">
    <!-- Top bar -->
    <header class="play-header">
      <button class="btn-back-play" @click="handleExit">
        &larr;
      </button>
      <span class="phase-label">{{ phaseLabel }}</span>
      <button
        class="btn-pause"
        :class="{ active: game.isPaused.value }"
        @click="togglePause"
      >
        {{ game.isPaused.value ? '&#9654;' : '&#10074;&#10074;' }}
      </button>
    </header>

    <!-- Pause overlay -->
    <Transition name="fade">
      <div v-if="game.isPaused.value" class="pause-overlay" @click="togglePause">
        <div class="pause-content">
          <div class="pause-text">暫停中</div>
          <div class="pause-hint">點擊任意處繼續</div>
        </div>
      </div>
    </Transition>

    <!-- Speaking toast -->
    <Transition name="fade">
      <div v-if="game.nightPhase.isSpeaking.value && game.phase.value === 'night'" class="speaking-toast">
        語音播報中...
      </div>
    </Transition>

    <!-- Main content -->
    <main class="play-content">
      <Transition name="phase-switch" mode="out-in">
        <!-- NIGHT PHASE -->
        <div v-if="game.phase.value === 'night'" key="night" class="phase-night">
          <div class="night-card onw-night-card">
            <div class="night-step-icon">{{ nightStepEmoji }}</div>
            <div class="night-step-label">{{ nightStepLabel }}</div>
            <div class="night-step-hint">請保持安靜，聆聽語音指示</div>

            <!-- Night progress -->
            <div class="night-progress">
              <div class="night-progress-bar">
                <div
                  class="night-progress-fill"
                  :style="{ width: game.nightPhase.totalSteps.value > 0
                    ? `${(game.nightPhase.completedSteps.value / game.nightPhase.totalSteps.value) * 100}%`
                    : '0%' }"
                ></div>
              </div>
              <div class="night-progress-text">
                {{ game.nightPhase.completedSteps.value }} / {{ game.nightPhase.totalSteps.value }}
              </div>
            </div>
          </div>

          <button class="btn btn-outline btn-skip" @click="game.nightPhase.skip()">
            跳過等待
          </button>
        </div>

        <!-- DISCUSSION PHASE -->
        <div v-else-if="game.phase.value === 'discussion'" key="discussion" class="phase-discussion">
          <div class="discussion-card">
            <div class="discussion-icon">&#x2600;&#xFE0F;</div>
            <h2 class="discussion-title">白天討論</h2>
            <p class="discussion-hint">
              找出你認為的狼人！記住：你的牌可能已經被交換了。
            </p>
          </div>

          <!-- Timer -->
          <div
            v-if="game.config.value.discussionMinutes > 0"
            class="timer-display"
            :class="{ 'timer-display--low': game.isDiscussionLow.value }"
          >
            {{ game.discussionDisplay.value }}
          </div>
          <div v-else class="timer-display timer-display--free">
            自由討論
          </div>

          <div class="discussion-actions">
            <button
              v-if="!game.isDiscussionRunning.value && game.config.value.discussionMinutes > 0"
              class="btn btn-primary btn-lg btn-block"
              @click="game.startDiscussionTimer()"
            >
              開始計時
            </button>
            <button
              class="btn btn-outline btn-block"
              @click="game.skipToVote()"
            >
              直接進入投票 &#x27A1;
            </button>
          </div>
        </div>

        <!-- VOTE PHASE -->
        <div v-else-if="game.phase.value === 'vote'" key="vote" class="phase-vote">
          <div class="vote-card">
            <div class="vote-icon">&#x1F44A;</div>
            <h2 class="vote-title">投票階段</h2>
            <p class="vote-hint">
              討論結束，準備同時指人！
            </p>
          </div>

          <div class="vote-countdown" :class="{ 'vote-countdown--active': game.isVoteRunning.value }">
            {{ game.voteCountdown.value }}
          </div>

          <div class="vote-actions">
            <button
              v-if="!game.isVoteRunning.value && game.voteCountdown.value > 0"
              class="btn btn-primary btn-lg btn-block"
              @click="game.startVoteCountdown()"
            >
              開始倒數
            </button>
            <button
              v-if="game.voteCountdown.value <= 0"
              class="btn btn-primary btn-lg btn-block"
              @click="game.enterResult()"
            >
              輸入結果 &#x27A1;
            </button>
          </div>
        </div>

        <!-- RESULT PHASE -->
        <div v-else-if="game.phase.value === 'result'" key="result" class="phase-result-input">
          <div class="result-input-card">
            <h2 class="result-input-title">投票結果</h2>
            <p class="result-input-desc">選擇被淘汰玩家持有的最終角色牌</p>
          </div>

          <!-- Tie checkbox -->
          <label class="tie-option">
            <input
              v-model="isTie"
              type="checkbox"
              class="tie-checkbox"
            />
            <span class="tie-label">平票（無人被淘汰）</span>
          </label>

          <!-- Role selection for elimination -->
          <div class="eliminated-roles" :class="{ 'eliminated-roles--disabled': isTie }">
            <button
              v-for="role in availableRolesForResult"
              :key="role.id"
              class="elim-role-btn"
              :class="{
                'elim-role-btn--selected': selectedEliminatedRoles.includes(role.id),
                'elim-role-btn--village': role.faction === 'village',
                'elim-role-btn--werewolf': role.faction === 'werewolf',
                'elim-role-btn--tanner': role.faction === 'tanner',
              }"
              :disabled="isTie"
              @click="toggleEliminatedRole(role.id)"
            >
              {{ role.name }}
            </button>
          </div>

          <button
            class="btn btn-primary btn-lg btn-block mt-xl"
            :disabled="!canSubmitResult"
            @click="handleSubmitResult"
          >
            確認結果
          </button>

          <button
            class="btn btn-outline btn-block mt-md"
            @click="game.replayNight()"
          >
            &#x1F504; 重新夜晚
          </button>
        </div>

        <!-- FINISHED PHASE -->
        <div v-else-if="game.phase.value === 'finished'" key="finished" class="phase-finished">
          <div class="result-card" :class="winClass">
            <div class="result-icon">{{ winIcon }}</div>
            <h2 class="result-title">{{ winMessage }}</h2>
          </div>

          <div class="result-detail" v-if="game.gameResult.value">
            <div class="result-detail-text">
              <template v-if="game.gameResult.value.voteResult.isTie">
                投票結果：平票，無人被淘汰
              </template>
              <template v-else>
                被淘汰角色：{{ game.gameResult.value.voteResult.eliminatedRoles.map(r => game.getRoleLabel(r)).join('、') }}
              </template>
            </div>
          </div>

          <div class="result-actions mt-xl">
            <button class="btn btn-primary btn-lg btn-block mb-md" @click="handlePlayAgain">
              再來一局
            </button>
            <button class="btn btn-outline btn-block" @click="handleExit">
              返回首頁
            </button>
          </div>
        </div>
      </Transition>
    </main>

    <!-- Footer -->
    <footer class="play-footer">
      <div class="footer-main">
        <button
          v-if="game.phase.value === 'night'"
          class="btn btn-gold btn-block"
          @click="togglePause"
        >
          {{ game.isPaused.value ? '繼續' : '暫停' }}
        </button>
      </div>

      <div class="nav-controls">
        <button
          class="btn-volume-toggle"
          @click="showVolumePanel = !showVolumePanel"
        >
          &#x1F50A;
        </button>
      </div>

      <Transition name="slide-up">
        <div v-if="showVolumePanel" class="volume-panel card">
          <VolumeSlider v-model="localMusicVol" label="音樂" icon="&#x1F3B5;" />
          <VolumeSlider v-model="localSfxVol" label="音效" icon="&#x2728;" />
        </div>
      </Transition>
    </footer>
  </div>
</template>

<style scoped>
.play-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg);
  color: var(--color-text);
  transition: var(--transition-theme);
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Header ===== */
.play-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  padding-top: calc(var(--space-md) + env(safe-area-inset-top, 0px));
  z-index: 10;
}

.btn-back-play {
  font-size: var(--font-xl);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
}

.phase-label {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-text);
}

.btn-pause {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-bg-surface);
  border: 2px solid var(--color-border);
  font-size: var(--font-md);
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--anim-micro) ease;
}

.btn-pause.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
}

/* ===== Pause Overlay ===== */
.pause-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.pause-content { text-align: center; }

.pause-text {
  font-size: var(--font-display);
  font-weight: 800;
  color: #FFFFFF;
}

.pause-hint {
  margin-top: var(--space-md);
  color: rgba(255, 255, 255, 0.5);
  font-size: var(--font-sm);
}

/* ===== Main Content ===== */
.play-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  overflow-y: auto;
}

/* ===== Night Phase ===== */
.phase-night {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
}

.onw-night-card {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-3xl) var(--space-xl);
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.night-step-icon {
  font-size: 64px;
  line-height: 1;
}

.night-step-label {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: #FFFFFF;
  text-align: center;
}

.night-step-hint {
  font-size: var(--font-sm);
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

/* Night progress */
.night-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.night-progress-bar {
  width: 80%;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
  overflow: hidden;
}

.night-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #42A5F5, #7C4DFF);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.night-progress-text {
  font-size: var(--font-xs);
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}

.speaking-toast {
  position: fixed;
  top: calc(60px + env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--color-primary);
  padding: var(--space-xs) var(--space-lg);
  background: var(--color-bg-surface);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-md);
  z-index: 50;
  white-space: nowrap;
}

.btn-skip {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.6);
  font-size: var(--font-sm);
  border-radius: var(--radius-full);
}

.btn-skip:active {
  border-color: rgba(255, 255, 255, 0.6);
  color: rgba(255, 255, 255, 0.9);
}

/* ===== Discussion Phase ===== */
.phase-discussion {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  width: 100%;
}

.discussion-card {
  background: linear-gradient(180deg, #E65100 0%, #F57C00 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 24px rgba(230, 81, 0, 0.3);
}

.discussion-icon {
  font-size: 48px;
  line-height: 1;
  margin-bottom: var(--space-sm);
}

.discussion-title {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: #FFFFFF;
}

.discussion-hint {
  font-size: var(--font-sm);
  color: rgba(255, 255, 255, 0.8);
  margin-top: var(--space-sm);
  line-height: 1.5;
}

.timer-display {
  font-family: 'Space Grotesk', monospace;
  font-size: 72px;
  font-weight: 800;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.05em;
}

.timer-display--low {
  color: #C62828;
  animation: pulse-red 1s ease infinite;
}

.timer-display--free {
  font-size: var(--font-xxl);
  font-family: inherit;
}

@keyframes pulse-red {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.discussion-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* ===== Vote Phase ===== */
.phase-vote {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  width: 100%;
}

.vote-card {
  background: linear-gradient(180deg, #AD1457 0%, #C2185B 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 24px rgba(173, 20, 87, 0.3);
}

.vote-icon {
  font-size: 48px;
  line-height: 1;
  margin-bottom: var(--space-sm);
}

.vote-title {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: #FFFFFF;
}

.vote-hint {
  font-size: var(--font-sm);
  color: rgba(255, 255, 255, 0.8);
  margin-top: var(--space-sm);
}

.vote-countdown {
  font-family: 'Space Grotesk', monospace;
  font-size: 96px;
  font-weight: 900;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
  transition: transform 0.3s ease;
}

.vote-countdown--active {
  color: #C62828;
  animation: pulse-red 0.8s ease infinite;
}

.vote-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

/* ===== Result Input Phase ===== */
.phase-result-input {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
}

.result-input-card {
  text-align: center;
  padding: var(--space-md);
}

.result-input-title {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: var(--color-text);
}

.result-input-desc {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-sm);
}

.tie-option {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--color-border);
  cursor: pointer;
  width: 100%;
}

.tie-checkbox {
  width: 22px;
  height: 22px;
  accent-color: var(--color-primary);
}

.tie-label {
  font-size: var(--font-md);
  font-weight: 600;
}

.eliminated-roles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  justify-content: center;
  width: 100%;
}

.eliminated-roles--disabled {
  opacity: 0.3;
  pointer-events: none;
}

.elim-role-btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: 600;
  border: 2px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text);
  transition: all var(--anim-fast) ease;
}

.elim-role-btn:active {
  transform: scale(0.95);
}

.elim-role-btn--selected.elim-role-btn--village {
  border-color: #42A5F5;
  background: rgba(66, 165, 245, 0.15);
  color: #1565C0;
}

.elim-role-btn--selected.elim-role-btn--werewolf {
  border-color: #EF5350;
  background: rgba(239, 83, 80, 0.15);
  color: #C62828;
}

.elim-role-btn--selected.elim-role-btn--tanner {
  border-color: #FF9800;
  background: rgba(255, 152, 0, 0.15);
  color: #E65100;
}

/* ===== Finished Phase ===== */
.phase-finished {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  width: 100%;
}

.result-card {
  border-radius: var(--radius-xl);
  padding: var(--space-3xl) var(--space-xl);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.result-card--village {
  background: linear-gradient(180deg, #0D47A1 0%, #1565C0 100%);
}

.result-card--werewolf {
  background: linear-gradient(180deg, #4A0000 0%, #7B1A1A 100%);
}

.result-card--tanner {
  background: linear-gradient(180deg, #E65100 0%, #F57C00 100%);
}

.result-icon {
  font-size: 64px;
  line-height: 1;
}

.result-title {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: #FFFFFF;
  text-align: center;
}

.result-detail {
  text-align: center;
}

.result-detail-text {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

.result-actions {
  width: 100%;
}

/* ===== Footer ===== */
.play-footer {
  padding: var(--space-sm) var(--space-lg) calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  position: relative;
}

.footer-main {
  margin-bottom: var(--space-sm);
}

.btn-gold {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-md);
  min-height: 48px;
  background: linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(15, 52, 96, 0.3);
}

.btn-gold:active {
  transform: scale(0.96);
}

.nav-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.btn-volume-toggle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-bg-surface);
  border: 1.5px solid var(--color-border);
  font-size: var(--font-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.volume-panel {
  position: absolute;
  bottom: 100%;
  left: var(--space-lg);
  right: var(--space-lg);
  margin-bottom: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  z-index: 20;
}
</style>
