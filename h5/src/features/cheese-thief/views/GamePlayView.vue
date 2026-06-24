<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCheeseThiefGame } from '../composables/useCheeseThiefGame'
import { DEFAULT_GAME_CONFIG, getRoleComposition } from '@/types/cheese-thief'
import type { GameConfig, WinningFaction } from '@/types/cheese-thief'
import CountdownTimer from '@/components/CountdownTimer.vue'
import PhaseIndicator from '@/components/PhaseIndicator.vue'
import VolumeSlider from '@/components/VolumeSlider.vue'
import { useWakeLock } from '@/composables/useWakeLock'

const route = useRoute()
const router = useRouter()

const game = useCheeseThiefGame()
const wakeLock = useWakeLock()
const showVolumePanel = ref(false)

const dataPhase = computed(() => {
  return game.phase.value === 'night' ? 'night' : undefined
})

const accompliceInfo = computed(() => {
  const parsedConfig = parseConfig()
  const roles = getRoleComposition(parsedConfig.playerCount)
  const countText = roles.accomplice === 1 ? '1 位共犯' : `${roles.accomplice} 位共犯`
  if (parsedConfig.playerCount === 7) {
    return `選擇 ${countText}（共犯互認，但不知道大盜）`
  }
  return `選擇 ${countText}（共犯與大盜互相確認身份）`
})

const phaseLabel = computed(() => {
  switch (game.phase.value) {
    case 'night': return '夜晚階段'
    case 'discussion': return '白天討論'
    case 'voting': return '投票時間'
    case 'result': return '遊戲結算'
    default: return ''
  }
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function validateConfig(raw: Record<string, unknown>): GameConfig {
  return {
    playerCount: clamp(Math.round(Number(raw.playerCount) || DEFAULT_GAME_CONFIG.playerCount), 4, 8),
    nightSecondsPerDice: clamp(Math.round(Number(raw.nightSecondsPerDice) || DEFAULT_GAME_CONFIG.nightSecondsPerDice), 3, 15),
    discussionMinutes: clamp(Number(raw.discussionMinutes) || DEFAULT_GAME_CONFIG.discussionMinutes, 1, 15),
    votingSeconds: clamp(Number(raw.votingSeconds) || DEFAULT_GAME_CONFIG.votingSeconds, 10, 120),
    speechRate: clamp(Number(raw.speechRate) || DEFAULT_GAME_CONFIG.speechRate, 0.5, 2),
    speechVolume: clamp(Number(raw.speechVolume) ?? DEFAULT_GAME_CONFIG.speechVolume, 0, 1),
    musicVolume: clamp(Number(raw.musicVolume) ?? DEFAULT_GAME_CONFIG.musicVolume, 0, 1),
    sfxVolume: clamp(Number(raw.sfxVolume) ?? DEFAULT_GAME_CONFIG.sfxVolume, 0, 1),
  }
}

function parseConfig(): GameConfig {
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
  return { ...DEFAULT_GAME_CONFIG }
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

function skipNight(): void {
  game.nightPhase.skip()
}

function endDiscussionEarly(): void {
  game.nextPhase()
}

function goToResult(): void {
  game.nextPhase()
}

async function selectWinner(faction: WinningFaction): Promise<void> {
  await game.endGame(faction)
}

function handlePlayAgain(): void {
  game.playAgain()
  router.push('/cheese-thief/setup')
}

function handleExit(): void {
  game.cleanup()
  window.speechSynthesis?.cancel()
  router.push('/')
}

// Volume controls
const localMusicVol = ref(game.audio.bgmVolume.value)
const localSfxVol = ref(game.audio.sfxVolume.value)

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
      <!-- NIGHT PHASE -->
      <Transition name="phase-switch" mode="out-in">
        <div v-if="game.phase.value === 'night'" key="night" class="phase-night">
          <!-- Dice calling sub-phase -->
          <template v-if="game.nightPhase.subPhase.value === 'dice'">
            <PhaseIndicator
              :current-dice="game.nightPhase.currentDiceNumber.value"
              :completed-dice="game.nightPhase.completedDice.value"
            />

            <!-- Night center card -->
            <div class="night-card">
              <div class="night-card-hint">
                請擲到 <strong>{{ game.nightPhase.currentDiceNumber.value || '-' }} 點</strong> 的玩家睜眼...
              </div>

              <div class="dice-display">
                <Transition name="scale" mode="out-in">
                  <div
                    :key="game.nightPhase.currentDiceNumber.value"
                    class="dice-number-ring glow-ring"
                  >
                    <span class="dice-number dice-pop">
                      {{ game.nightPhase.currentDiceNumber.value || '-' }}
                    </span>
                  </div>
                </Transition>
              </div>

              <CountdownTimer
                :remaining="game.nightPhase.timer.remaining.value"
                :total="game.nightPhase.timer.totalSeconds.value || game.config.value.nightSecondsPerDice"
                size="md"
                :show-progress="true"
              />
            </div>
          </template>

          <!-- Accomplice selection sub-phase -->
          <template v-else-if="game.nightPhase.subPhase.value === 'accomplice'">
            <div class="night-card">
              <div class="accomplice-phase">
                <div class="accomplice-icon">&#x1F3AD;</div>
                <div class="accomplice-label">共犯選擇</div>
                <div class="accomplice-info">
                  {{ accompliceInfo }}
                </div>
              </div>

              <CountdownTimer
                :remaining="game.nightPhase.timer.remaining.value"
                :total="game.nightPhase.timer.totalSeconds.value || 10"
                size="md"
                :show-progress="true"
              />
            </div>
          </template>

          <button class="btn btn-outline btn-skip" @click="skipNight">
            跳過夜晚
          </button>
        </div>

        <!-- DISCUSSION PHASE -->
        <div v-else-if="game.phase.value === 'discussion'" key="discussion" class="phase-day">
          <div class="day-card">
            <div class="day-phase-icon">&#x2600;</div>
            <div class="day-label">白天討論</div>

            <CountdownTimer
              :remaining="game.discussionTimer.remaining.value"
              :total="game.discussionTimer.totalSeconds.value"
              size="lg"
              :show-progress="true"
              :urgent-threshold="30"
            />
          </div>

          <button
            class="btn btn-primary btn-lg btn-block mt-xl"
            @click="endDiscussionEarly"
          >
            提前結束討論
          </button>
        </div>

        <!-- VOTING PHASE -->
        <div v-else-if="game.phase.value === 'voting'" key="voting" class="phase-day">
          <div class="day-card">
            <div class="day-phase-icon">&#x2696;</div>
            <div class="day-label">投票時間</div>

            <CountdownTimer
              :remaining="game.votingTimer.remaining.value"
              :total="game.votingTimer.totalSeconds.value"
              size="lg"
              :show-progress="true"
              :urgent-threshold="5"
            />
          </div>

          <button
            class="btn btn-primary btn-lg btn-block mt-xl"
            @click="goToResult"
          >
            進入結算
          </button>
        </div>

        <!-- RESULT PHASE -->
        <div v-else-if="game.phase.value === 'result'" key="result" class="phase-result">
          <h2 class="result-title">誰贏了？</h2>

          <div class="winner-buttons">
            <button
              class="winner-btn villager-btn"
              @click="selectWinner('villager')"
            >
              <span class="winner-icon">&#x1F33E;</span>
              <span class="winner-text">瞌睡鼠陣營</span>
            </button>
            <button
              class="winner-btn thief-btn"
              @click="selectWinner('thief')"
            >
              <span class="winner-icon">&#x1F3AD;</span>
              <span class="winner-text">大盜陣營</span>
            </button>
            <button
              class="winner-btn scapegoat-btn"
              @click="selectWinner('scapegoat')"
            >
              <span class="winner-icon">&#x1F400;</span>
              <span class="winner-text">背鍋鼠</span>
            </button>
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

    <!-- Bottom controls -->
    <footer class="play-footer">
      <!-- Pause/Skip button (night) -->
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
          class="btn-nav"
          :disabled="game.phase.value === 'night'"
          @click="game.prevPhase()"
        >
          上一點數
        </button>
        <button
          class="btn-nav"
          :disabled="game.phase.value === 'result'"
          @click="game.nextPhase()"
        >
          下一點數
        </button>
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
}

/* ===== Night Phase ===== */
.phase-night {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
}

/* Night center card — gold/warm tones from mockup */
.night-card {
  background: linear-gradient(180deg, #D4A34A 0%, #C4903A 50%, #B8802E 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  position: relative;
}

.night-card-hint {
  font-size: var(--font-sm);
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
}

.night-card-hint strong {
  color: #FFFFFF;
  font-weight: 700;
}

.dice-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.dice-number-ring {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 4px solid rgba(232, 212, 77, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
}

.dice-number {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-mega);
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1;
  text-shadow: 0 0 30px rgba(232, 212, 77, 0.6);
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

/* Accomplice phase */
.accomplice-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.accomplice-icon {
  font-size: 64px;
  line-height: 1;
}

.accomplice-label {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: #FFFFFF;
}

.accomplice-info {
  font-size: var(--font-sm);
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
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

/* ===== Day Phase (Discussion / Voting) ===== */
.phase-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  width: 100%;
}

.day-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-3xl) var(--space-xl);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border);
}

.day-phase-icon {
  font-size: 48px;
  line-height: 1;
}

.day-label {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: var(--color-text);
}

/* ===== Result Phase ===== */
.phase-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.result-title {
  font-size: var(--font-xxl);
  font-weight: 800;
  margin-bottom: var(--space-xxl);
}

.winner-buttons {
  display: flex;
  gap: var(--space-md);
  width: 100%;
}

.winner-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xl) var(--space-md);
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-border);
  background: var(--color-bg-card);
  transition: all var(--anim-micro) ease;
  min-height: 130px;
  justify-content: center;
}

.winner-btn:active {
  transform: scale(0.95);
}

.villager-btn:active,
.villager-btn:focus {
  border-color: var(--color-success);
  background: var(--color-success-light);
}

.thief-btn:active,
.thief-btn:focus {
  border-color: var(--color-error);
  background: var(--color-error-light);
}

.scapegoat-btn:active,
.scapegoat-btn:focus {
  border-color: #AB47BC;
  background: color-mix(in srgb, #AB47BC 12%, transparent);
}

.winner-icon {
  font-size: var(--font-display);
}

.winner-text {
  font-size: var(--font-md);
  font-weight: 700;
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
  background: linear-gradient(135deg, #D4A34A 0%, #B8802E 100%);
  color: #FFFFFF;
  box-shadow: 0 4px 12px rgba(180, 130, 50, 0.3);
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

.btn-nav {
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-full);
  border: 1.5px solid var(--color-border);
  background: var(--color-bg-surface);
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  transition: all var(--anim-micro) ease;
}

.btn-nav:active {
  background: var(--color-primary-surface);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-nav:disabled {
  opacity: 0.3;
  pointer-events: none;
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
