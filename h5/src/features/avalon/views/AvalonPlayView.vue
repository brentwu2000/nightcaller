<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAvalonGame } from '../composables/useAvalonGame'
import {
  DEFAULT_AVALON_CONFIG,
  needsDoubleFail,
  MISSION_SIZES,
} from '@/types/avalon'
import type { AvalonGameConfig } from '@/types/avalon'
import MissionTracker from '../components/MissionTracker.vue'
import RejectCounter from '../components/RejectCounter.vue'
import VolumeSlider from '@/components/VolumeSlider.vue'
import { useWakeLock } from '@/composables/useWakeLock'

const route = useRoute()
const router = useRouter()

const game = useAvalonGame()
const wakeLock = useWakeLock()
const showVolumePanel = ref(false)

const dataPhase = computed(() => {
  return game.phase.value === 'night' ? 'night' : undefined
})

const phaseLabel = computed(() => {
  switch (game.phase.value) {
    case 'night': return '夜晚階段'
    case 'scoreboard': return '任務記分板'
    case 'assassinate': return '刺殺階段'
    case 'finished': return '遊戲結束'
    default: return ''
  }
})

const missionSizes = computed(() => {
  const sizes = MISSION_SIZES[game.config.value.roles.playerCount] ?? MISSION_SIZES[7]
  return sizes
})

const doubleFailRounds = computed(() => {
  const pc = game.config.value.roles.playerCount
  return Array.from({ length: 5 }, (_, i) => needsDoubleFail(pc, i))
})

const nightStepLabel = computed(() => {
  switch (game.nightPhase.currentStep.value) {
    case 'opening': return '所有人閉上眼睛'
    case 'evil_reveal': return '邪惡陣營互認'
    case 'merlin_reveal': return '梅林確認邪惡'
    case 'percival_reveal': return '派西維爾確認梅林'
    case 'closing': return '天亮了'
    default: return ''
  }
})

const winMessage = computed(() => {
  if (!game.winResult.value) return ''
  const { side, reason } = game.winResult.value
  if (side === 'good') {
    return '好人陣營獲勝！'
  }
  switch (reason) {
    case 'three_missions_fail': return '邪惡陣營獲勝！三次任務失敗'
    case 'five_rejects': return '邪惡陣營獲勝！連續五次否決'
    case 'assassinate_success': return '邪惡陣營獲勝！梅林被刺殺'
    default: return '邪惡陣營獲勝！'
  }
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function validateConfig(raw: Record<string, unknown>): AvalonGameConfig {
  const roles = (raw.roles ?? {}) as Record<string, unknown>
  return {
    roles: {
      playerCount: clamp(Math.round(Number(roles.playerCount) || 7), 5, 10),
      hasPercival: Boolean(roles.hasPercival),
      hasMorgana: Boolean(roles.hasMorgana),
      hasMordred: Boolean(roles.hasMordred),
      hasOberon: Boolean(roles.hasOberon),
    },
    nightPauseSeconds: clamp(Math.round(Number(raw.nightPauseSeconds) || 5), 3, 15),
    speechRate: clamp(Number(raw.speechRate) || 1, 0.5, 2),
    speechVolume: clamp(Number(raw.speechVolume) ?? 1, 0, 1),
    musicVolume: clamp(Number(raw.musicVolume) ?? 0.3, 0, 1),
    sfxVolume: clamp(Number(raw.sfxVolume) ?? 0.5, 0, 1),
  }
}

function parseConfig(): AvalonGameConfig {
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
  return { ...DEFAULT_AVALON_CONFIG }
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
  router.push('/avalon/setup')
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
      <div v-if="game.nightPhase.isSpeaking.value" class="speaking-toast">
        語音播報中...
      </div>
    </Transition>

    <!-- Main content area -->
    <main class="play-content">
      <Transition name="phase-switch" mode="out-in">
        <!-- NIGHT PHASE -->
        <div v-if="game.phase.value === 'night'" key="night" class="phase-night">
          <div class="night-card avalon-night-card">
            <div class="night-step-icon">&#x1F319;</div>
            <div class="night-step-label">{{ nightStepLabel }}</div>
            <div class="night-step-hint">請保持安靜，聆聽語音指示</div>
          </div>

          <button class="btn btn-outline btn-skip" @click="game.nightPhase.skip()">
            跳過等待
          </button>
        </div>

        <!-- SCOREBOARD PHASE -->
        <div v-else-if="game.phase.value === 'scoreboard'" key="scoreboard" class="phase-scoreboard">
          <!-- Mission Tracker -->
          <MissionTracker
            :missions="game.gameState.value.missions"
            :current-round="game.gameState.value.currentRound"
            :mission-sizes="missionSizes"
            :double-fail-rounds="doubleFailRounds"
          />

          <!-- Current round info -->
          <div class="round-info">
            <div class="round-number">第 {{ game.gameState.value.currentRound + 1 }} 輪</div>
            <div class="round-detail">
              需要 {{ game.currentMissionSize.value }} 人執行任務
              <span v-if="game.isDoubleFailRound.value" class="double-fail-badge">需2張失敗牌</span>
            </div>
          </div>

          <!-- Reject Counter -->
          <RejectCounter :reject-streak="game.gameState.value.rejectStreak" />

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button
              class="action-btn action-btn--success"
              @click="game.reportMissionSuccess()"
            >
              <span class="action-icon">&#x2714;</span>
              <span class="action-label">任務成功</span>
            </button>
            <button
              class="action-btn action-btn--fail"
              @click="game.reportMissionFail()"
            >
              <span class="action-icon">&#x2716;</span>
              <span class="action-label">任務失敗</span>
            </button>
          </div>

          <button
            class="btn btn-outline btn-block reject-btn"
            @click="game.reportReject()"
          >
            提名被否決
          </button>

          <!-- Undo -->
          <Transition name="fade">
            <button
              v-if="game.canUndo.value"
              class="btn-undo"
              @click="game.undoLastAction()"
            >
              &#x21A9; 撤銷上一步
            </button>
          </Transition>

          <!-- Replay night -->
          <button
            class="btn btn-outline btn-block replay-btn"
            @click="game.replayNight()"
          >
            &#x1F504; 重新發牌（重播夜晚）
          </button>
        </div>

        <!-- ASSASSINATE PHASE -->
        <div v-else-if="game.phase.value === 'assassinate'" key="assassinate" class="phase-assassinate">
          <div class="assassinate-card">
            <div class="assassinate-icon">&#x1F5E1;</div>
            <h2 class="assassinate-title">刺客階段</h2>
            <p class="assassinate-desc">
              好人已完成三次任務。刺客，請與同伴商議，指認梅林。
            </p>
          </div>

          <div class="assassinate-buttons">
            <button
              class="action-btn action-btn--fail"
              @click="game.reportAssassinateResult(true)"
            >
              <span class="action-icon">&#x1F480;</span>
              <span class="action-label">梅林被找到</span>
            </button>
            <button
              class="action-btn action-btn--success"
              @click="game.reportAssassinateResult(false)"
            >
              <span class="action-icon">&#x1F6E1;</span>
              <span class="action-label">刺殺失敗</span>
            </button>
          </div>
        </div>

        <!-- FINISHED PHASE -->
        <div v-else-if="game.phase.value === 'finished'" key="finished" class="phase-result">
          <div class="result-card" :class="game.winResult.value?.side === 'good' ? 'result-card--good' : 'result-card--evil'">
            <div class="result-icon">
              {{ game.winResult.value?.side === 'good' ? '&#x1F451;' : '&#x1F480;' }}
            </div>
            <h2 class="result-title">{{ winMessage }}</h2>
          </div>

          <!-- Mission summary -->
          <MissionTracker
            :missions="game.gameState.value.missions"
            :current-round="4"
            :mission-sizes="missionSizes"
            :double-fail-rounds="doubleFailRounds"
          />

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

    <!-- Bottom controls -->
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

.pause-content {
  text-align: center;
}

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

.avalon-night-card {
  background: linear-gradient(180deg, #1a237e 0%, #283593 50%, #303f9f 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-3xl) var(--space-xl);
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
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

/* ===== Scoreboard Phase ===== */
.phase-scoreboard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  width: 100%;
}

.round-info {
  text-align: center;
}

.round-number {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: var(--color-text);
}

.round-detail {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
}

.double-fail-badge {
  display: inline-block;
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  background: rgba(198, 40, 40, 0.1);
  color: #C62828;
  font-size: var(--font-xs);
  font-weight: 700;
  margin-left: var(--space-xs);
}

/* Action buttons */
.action-buttons {
  display: flex;
  gap: var(--space-md);
  width: 100%;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-xl) var(--space-md);
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-border);
  background: var(--color-bg-card);
  transition: all var(--anim-micro) ease;
  min-height: 100px;
  justify-content: center;
}

.action-btn:active {
  transform: scale(0.95);
}

.action-btn--success {
  border-color: rgba(21, 101, 192, 0.3);
}

.action-btn--success:active {
  border-color: #1565C0;
  background: rgba(21, 101, 192, 0.1);
}

.action-btn--fail {
  border-color: rgba(198, 40, 40, 0.3);
}

.action-btn--fail:active {
  border-color: #C62828;
  background: rgba(198, 40, 40, 0.1);
}

.action-icon {
  font-size: var(--font-display);
}

.action-label {
  font-size: var(--font-md);
  font-weight: 700;
}

.reject-btn {
  border-radius: var(--radius-full);
  color: #E65100;
  border-color: #E65100;
}

.reject-btn:active {
  background: rgba(230, 81, 0, 0.1);
}

.btn-undo {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
}

.replay-btn {
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
}

/* ===== Assassinate Phase ===== */
.phase-assassinate {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  width: 100%;
}

.assassinate-card {
  background: linear-gradient(180deg, #4A0000 0%, #7B1A1A 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-3xl) var(--space-xl);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.assassinate-icon {
  font-size: 64px;
  line-height: 1;
}

.assassinate-title {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: #FFFFFF;
}

.assassinate-desc {
  font-size: var(--font-sm);
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  line-height: 1.5;
}

.assassinate-buttons {
  display: flex;
  gap: var(--space-md);
  width: 100%;
}

/* ===== Result Phase ===== */
.phase-result {
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

.result-card--good {
  background: linear-gradient(180deg, #0D47A1 0%, #1565C0 100%);
}

.result-card--evil {
  background: linear-gradient(180deg, #4A0000 0%, #7B1A1A 100%);
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
  background: linear-gradient(135deg, #1a237e 0%, #303f9f 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(26, 35, 126, 0.3);
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
