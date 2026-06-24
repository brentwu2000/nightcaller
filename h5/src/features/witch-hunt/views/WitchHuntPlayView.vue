<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWitchHuntGame } from '../composables/useWitchHuntGame'
import { DEFAULT_SALEM_CONFIG, getWitchCount } from '@/types/witch-hunt'
import type { SalemGameConfig } from '@/types/witch-hunt'
import SurvivalTracker from '../components/SurvivalTracker.vue'
import CountdownTimer from '@/components/CountdownTimer.vue'
import VolumeSlider from '@/components/VolumeSlider.vue'
import { useWakeLock } from '@/composables/useWakeLock'

const route = useRoute()
const router = useRouter()

const game = useWitchHuntGame()
const wakeLock = useWakeLock()
const showVolumePanel = ref(false)
const showWitchWinConfirm = ref(false)

const dataPhase = computed(() => {
  const p = game.phase.value
  if (p === 'night' || p === 'dawn') return 'night'
  if (p === 'conspiracy') return 'conspiracy'
  return undefined
})

const phaseLabel = computed(() => {
  switch (game.phase.value) {
    case 'discussion': return '自由討論'
    case 'trial_defense': return '審判辯護'
    case 'trial_vote': return '審判投票'
    case 'trial_result': return '審判結果'
    case 'conspiracy': return '共謀事件'
    case 'night': return '夜晚階段'
    case 'dawn': return '黎明結算'
    case 'finished': return '遊戲結束'
    default: return ''
  }
})

const nightStepLabel = computed(() => {
  switch (game.nightPhase.currentStep.value) {
    case 'opening': return '夜幕降臨'
    case 'witch': return '巫師殺戮'
    case 'guardian': return '守護者守護'
    default: return ''
  }
})

const winMessage = computed(() => {
  if (!game.winResult.value) return ''
  return game.winResult.value.winner === 'villager'
    ? '村民陣營獲勝！'
    : '巫師陣營獲勝！'
})

const winSubMessage = computed(() => {
  if (!game.winResult.value) return ''
  switch (game.winResult.value.reason) {
    case 'all_witches_revealed': return '所有巫師已被揭露'
    case 'witch_dominance': return '巫師的黑暗力量吞噬了小鎮'
    default: return ''
  }
})

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function parseConfig(): SalemGameConfig {
  try {
    const raw = route.query.config as string | undefined
    if (raw) {
      const parsed = JSON.parse(decodeURIComponent(raw))
      if (typeof parsed === 'object' && parsed !== null) {
        const p = parsed as Record<string, unknown>
        const pc = clamp(Math.round(Number(p.playerCount) || 8), 4, 12)
        return {
          playerCount: pc,
          witchCount: clamp(Math.round(Number(p.witchCount) || getWitchCount(pc)), 1, 4),
          hasGuardian: p.hasGuardian !== false,
          discussionMinutes: clamp(Math.round(Number(p.discussionMinutes) || 5), 1, 10),
          defenseSeconds: clamp(Math.round(Number(p.defenseSeconds) || 60), 30, 180),
          conspiracySeconds: clamp(Math.round(Number(p.conspiracySeconds) || 15), 10, 30),
          nightWitchSeconds: clamp(Math.round(Number(p.nightWitchSeconds) || 10), 5, 20),
          nightGuardianSeconds: clamp(Math.round(Number(p.nightGuardianSeconds) || 8), 5, 15),
          speechRate: clamp(Number(p.speechRate) || 1, 0.5, 2),
          speechVolume: clamp(Number(p.speechVolume) ?? 1, 0, 1),
          musicVolume: clamp(Number(p.musicVolume) ?? 0.3, 0, 1),
          sfxVolume: clamp(Number(p.sfxVolume) ?? 0.5, 0, 1),
        }
      }
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_SALEM_CONFIG }
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
  router.push('/witch-hunt/setup')
}

function handleExit(): void {
  game.cleanup()
  window.speechSynthesis?.cancel()
  router.push('/')
}

function confirmWitchWin(): void {
  showWitchWinConfirm.value = false
  game.declareWitchWin()
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

// Game stats for result screen
const gameStats = computed(() => {
  const events = game.gameState.value.events
  return {
    rounds: game.gameState.value.currentRound,
    trialWitch: events.filter((e) => e.type === 'trial_witch').length,
    trialVillager: events.filter((e) => e.type === 'trial_villager').length,
    nightKills: events.filter((e) => e.type === 'night_kill').length,
  }
})
</script>

<template>
  <div class="play-page" :data-phase="dataPhase">
    <!-- Top bar -->
    <header class="play-header">
      <button class="btn-back-play" @click="handleExit">&larr;</button>
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

    <!-- Main content -->
    <main class="play-content">
      <Transition name="phase-switch" mode="out-in">

        <!-- DISCUSSION -->
        <div v-if="game.phase.value === 'discussion'" key="discussion" class="phase-discussion">
          <SurvivalTracker
            :survival="game.gameState.value.survival"
            :current-round="game.gameState.value.currentRound"
          />

          <div class="discussion-card">
            <div class="discussion-icon">&#x2600;</div>
            <div class="discussion-title">自由討論</div>
            <div class="discussion-hint">玩家輪流行動：祈禱（抽牌）或出牌</div>
          </div>

          <div class="timer-section">
            <CountdownTimer
              :remaining="game.discussionTimer.remaining.value"
              :total="game.config.value.discussionMinutes * 60"
              size="lg"
              :show-progress="true"
              :urgent-threshold="30"
            />
          </div>

          <div class="day-actions">
            <button class="btn btn-danger btn-block mb-md" @click="game.triggerTrial()">
              &#x2696; 觸發審判（指控達 7 點）
            </button>
            <button class="btn btn-outline btn-block mb-md" @click="game.endDiscussion()">
              結束討論，進入共謀
            </button>
            <button class="btn-witch-win" @click="showWitchWinConfirm = true">
              &#x1F9D9; 宣告巫師勝利
            </button>
          </div>
        </div>

        <!-- TRIAL DEFENSE -->
        <div v-else-if="game.phase.value === 'trial_defense'" key="trial_defense" class="phase-trial">
          <SurvivalTracker
            :survival="game.gameState.value.survival"
            :current-round="game.gameState.value.currentRound"
          />

          <div class="trial-card">
            <div class="trial-icon">&#x2696;</div>
            <h2 class="trial-title">審判進行中</h2>
            <p class="trial-desc">被告正在辯護</p>
          </div>

          <div class="timer-section">
            <CountdownTimer
              :remaining="game.defenseTimer.remaining.value"
              :total="game.config.value.defenseSeconds"
              size="lg"
              :show-progress="true"
              :urgent-threshold="10"
            />
          </div>

          <button class="btn btn-outline btn-block" @click="game.skipDefense()">
            結束辯護，進入投票
          </button>
        </div>

        <!-- TRIAL VOTE (brief transition) -->
        <div v-else-if="game.phase.value === 'trial_vote'" key="trial_vote" class="phase-trial-vote">
          <div class="vote-card">
            <div class="vote-icon">&#x270B;</div>
            <h2 class="vote-title">投票中</h2>
            <p class="vote-desc">認為有罪的請舉手</p>
          </div>
        </div>

        <!-- TRIAL RESULT -->
        <div v-else-if="game.phase.value === 'trial_result'" key="trial_result" class="phase-trial-result">
          <SurvivalTracker
            :survival="game.gameState.value.survival"
            :current-round="game.gameState.value.currentRound"
          />

          <h3 class="result-question">審判結果？</h3>

          <div class="result-buttons">
            <button class="action-btn action-btn--guilty-witch" @click="game.reportTrialGuiltyWitch()">
              <span class="action-icon">&#x1F525;</span>
              <span class="action-label">有罪</span>
              <span class="action-sub">是巫師</span>
            </button>
            <button class="action-btn action-btn--guilty-villager" @click="game.reportTrialGuiltyVillager()">
              <span class="action-icon">&#x1F614;</span>
              <span class="action-label">有罪</span>
              <span class="action-sub">是村民</span>
            </button>
          </div>

          <button class="btn btn-outline btn-block acquit-btn" @click="game.reportAcquittal()">
            &#x2696; 無罪釋放
          </button>

          <Transition name="fade">
            <button v-if="game.canUndo.value" class="btn-undo" @click="game.undoLastAction()">
              &#x21A9; 撤銷上一步
            </button>
          </Transition>
        </div>

        <!-- CONSPIRACY -->
        <div v-else-if="game.phase.value === 'conspiracy'" key="conspiracy" class="phase-conspiracy">
          <div class="conspiracy-card">
            <div class="conspiracy-icon">&#x1F91D;</div>
            <h2 class="conspiracy-title">共謀事件</h2>
            <p class="conspiracy-desc">試煉卡正在傳遞中...</p>
          </div>

          <div class="timer-section">
            <CountdownTimer
              :remaining="game.conspiracyTimer.remaining.value"
              :total="game.config.value.conspiracySeconds"
              size="lg"
              :show-progress="true"
              :urgent-threshold="5"
            />
          </div>

          <button class="btn btn-primary btn-lg btn-block" @click="game.endConspiracy()">
            提前結束，進入夜晚
          </button>
        </div>

        <!-- NIGHT PHASE -->
        <div v-else-if="game.phase.value === 'night'" key="night" class="phase-night">
          <div class="night-card">
            <div class="night-step-icon">&#x1F319;</div>
            <div class="night-step-label">{{ nightStepLabel }}</div>
            <div class="night-step-hint">請保持安靜，聆聽語音指示</div>
          </div>
          <button class="btn btn-outline btn-skip" @click="game.nightPhase.skip()">
            跳過等待
          </button>
        </div>

        <!-- DAWN -->
        <div v-else-if="game.phase.value === 'dawn'" key="dawn" class="phase-dawn">
          <SurvivalTracker
            :survival="game.gameState.value.survival"
            :current-round="game.gameState.value.currentRound"
          />

          <!-- Settlement options (hidden after settling) -->
          <template v-if="!game.dawnSettled.value">
            <h3 class="result-question">昨夜發生了什麼？</h3>

            <div class="result-buttons">
              <button class="action-btn action-btn--kill-villager" @click="game.reportDawnKill()">
                <span class="action-icon">&#x1F480;</span>
                <span class="action-label">有人被殺</span>
              </button>
              <button class="action-btn action-btn--safe" @click="game.reportDawnSafe()">
                <span class="action-icon">&#x1F6E1;</span>
                <span class="action-label">無人死亡</span>
                <span class="action-sub">被守護</span>
              </button>
            </div>
          </template>

          <!-- After settlement -->
          <template v-else>
            <div class="dawn-settled-hint">已結算完畢</div>
          </template>

          <button
            v-if="game.dawnSettled.value"
            class="btn btn-primary btn-lg btn-block"
            @click="game.advanceToNextRound()"
          >
            進入下一回合 &#x2600;
          </button>

          <Transition name="fade">
            <button v-if="game.canUndo.value" class="btn-undo" @click="game.undoLastAction()">
              &#x21A9; 撤銷上一步
            </button>
          </Transition>
        </div>

        <!-- FINISHED -->
        <div v-else-if="game.phase.value === 'finished'" key="finished" class="phase-result">
          <div
            class="result-card"
            :class="game.winResult.value?.winner === 'villager' ? 'result-card--villager' : 'result-card--witch'"
          >
            <div class="result-icon">
              {{ game.winResult.value?.winner === 'villager' ? '&#x2696;' : '&#x1F9D9;' }}
            </div>
            <h2 class="result-title">{{ winMessage }}</h2>
            <p class="result-sub">{{ winSubMessage }}</p>
          </div>

          <!-- Stats -->
          <div class="stats-card">
            <div class="stat-item">
              <span class="stat-value">{{ gameStats.rounds }}</span>
              <span class="stat-label">回合</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ gameStats.trialWitch }}</span>
              <span class="stat-label">揭露巫師</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ gameStats.trialVillager }}</span>
              <span class="stat-label">錯殺村民</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ gameStats.nightKills }}</span>
              <span class="stat-label">夜殺</span>
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

    <!-- Witch win confirmation dialog -->
    <Transition name="fade">
      <div v-if="showWitchWinConfirm" class="confirm-overlay" @click.self="showWitchWinConfirm = false">
        <div class="confirm-dialog">
          <h3 class="confirm-title">確認宣告巫師勝利？</h3>
          <p class="confirm-desc">當巫師人數已等於或超過村民人數時，由組織者宣告遊戲結束。</p>
          <div class="confirm-actions">
            <button class="btn btn-outline" @click="showWitchWinConfirm = false">取消</button>
            <button class="btn btn-danger" @click="confirmWitchWin">確認</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Footer -->
    <footer class="play-footer">
      <div class="nav-controls">
        <button class="btn-volume-toggle" @click="showVolumePanel = !showVolumePanel">
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

/* Night / conspiracy theme */
.play-page[data-phase="night"] {
  background-color: #0d0d1a;
  color: #e0e0e0;
}

.play-page[data-phase="conspiracy"] {
  background-color: #0a1a0a;
  color: #d0e0d0;
}

/* Header */
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
}

.btn-pause.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-text-on-primary);
}

/* Pause overlay */
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
.pause-text { font-size: var(--font-display); font-weight: 800; color: #FFFFFF; }
.pause-hint { margin-top: var(--space-md); color: rgba(255, 255, 255, 0.5); font-size: var(--font-sm); }

/* Main content */
.play-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-lg);
  overflow-y: auto;
}

/* Discussion */
.phase-discussion {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
}

.discussion-card {
  background: linear-gradient(180deg, #FFF8E1 0%, #FFE082 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  box-shadow: 0 4px 16px rgba(255, 193, 7, 0.2);
}

.discussion-icon { font-size: 48px; line-height: 1; }
.discussion-title {
  font-size: var(--font-xxl);
  font-weight: 800;
  color: #E65100;
}
.discussion-hint {
  font-size: var(--font-sm);
  color: #795548;
  text-align: center;
}

.day-actions {
  width: 100%;
}

.btn-danger {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md) var(--space-xl);
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: var(--font-md);
  min-height: 48px;
  background: #C62828;
  color: #FFFFFF;
  border: none;
}

.btn-danger:active { transform: scale(0.96); opacity: 0.9; }

.btn-witch-win {
  display: block;
  width: 100%;
  text-align: center;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  padding: var(--space-sm) 0;
  margin-top: var(--space-sm);
}

/* Trial */
.phase-trial,
.phase-trial-vote,
.phase-trial-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
}

.trial-card,
.vote-card {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  border: 2px solid #C62828;
}

.trial-icon,
.vote-icon { font-size: 48px; line-height: 1; }
.trial-title,
.vote-title { font-size: var(--font-xl); font-weight: 800; color: #C62828; }
.trial-desc,
.vote-desc { font-size: var(--font-sm); color: var(--color-text-muted); text-align: center; }

/* Result buttons */
.result-question {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
}

.result-buttons {
  display: flex;
  gap: var(--space-md);
  width: 100%;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xl) var(--space-md);
  border-radius: var(--radius-lg);
  border: 2px solid var(--color-border);
  background: var(--color-bg-card);
  min-height: 100px;
  justify-content: center;
  transition: all var(--anim-micro) ease;
}

.action-btn:active { transform: scale(0.95); }

.action-icon { font-size: var(--font-display); }
.action-label { font-size: var(--font-md); font-weight: 700; }
.action-sub { font-size: var(--font-xs); color: var(--color-text-muted); }

.action-btn--guilty-witch { border-color: rgba(123, 31, 162, 0.3); }
.action-btn--guilty-witch:active { border-color: #7B1FA2; background: rgba(123, 31, 162, 0.1); }

.action-btn--guilty-villager { border-color: rgba(198, 40, 40, 0.3); }
.action-btn--guilty-villager:active { border-color: #C62828; background: rgba(198, 40, 40, 0.1); }

.action-btn--kill-villager { border-color: rgba(198, 40, 40, 0.3); }
.action-btn--kill-villager:active { border-color: #C62828; background: rgba(198, 40, 40, 0.1); }

.action-btn--safe { border-color: rgba(21, 101, 192, 0.3); }
.action-btn--safe:active { border-color: #1565C0; background: rgba(21, 101, 192, 0.1); }

.acquit-btn {
  border-radius: var(--radius-full);
  color: #E65100;
  border-color: #E65100;
}

.btn-undo {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  padding: var(--space-sm) var(--space-lg);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-bg-surface);
}

/* Conspiracy */
.phase-conspiracy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
}

.conspiracy-card {
  background: linear-gradient(180deg, #1B5E20 0%, #2E7D32 100%);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.conspiracy-icon { font-size: 48px; line-height: 1; }
.conspiracy-title { font-size: var(--font-xl); font-weight: 800; color: #FFFFFF; }
.conspiracy-desc { font-size: var(--font-sm); color: rgba(255, 255, 255, 0.7); }

/* Night phase */
.phase-night {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-lg);
  width: 100%;
  flex: 1;
}

.night-card {
  background: linear-gradient(180deg, #1a0033 0%, #2d1b69 50%, #1a237e 100%);
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

.night-step-icon { font-size: 64px; line-height: 1; }
.night-step-label { font-size: var(--font-xxl); font-weight: 800; color: #FFFFFF; text-align: center; }
.night-step-hint { font-size: var(--font-sm); color: rgba(255, 255, 255, 0.6); text-align: center; }

.btn-skip {
  border-color: rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.6);
  font-size: var(--font-sm);
  border-radius: var(--radius-full);
}

/* Dawn */
.phase-dawn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
  width: 100%;
}

.dawn-settled-hint {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  text-align: center;
  padding: var(--space-md) 0;
}

/* Timer */
.timer-section {
  padding: var(--space-lg) 0;
  text-align: center;
}

/* Result */
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

.result-card--villager { background: linear-gradient(180deg, #0D47A1 0%, #1565C0 100%); }
.result-card--witch { background: linear-gradient(180deg, #2d1b69 0%, #7B1FA2 100%); }

.result-icon { font-size: 64px; line-height: 1; }
.result-title { font-size: var(--font-xxl); font-weight: 800; color: #FFFFFF; text-align: center; }
.result-sub { font-size: var(--font-sm); color: rgba(255, 255, 255, 0.7); }

/* Stats */
.stats-card {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--space-xl);
  width: 100%;
  padding: var(--space-lg);
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
}

.stat-value {
  font-family: 'Space Grotesk', sans-serif;
  font-size: var(--font-xxl);
  font-weight: 800;
  color: var(--color-text);
}

.stat-label {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.result-actions { width: 100%; }

/* Confirm dialog */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: var(--space-xl);
}

.confirm-dialog {
  background: var(--color-bg-card);
  border-radius: var(--radius-xl);
  padding: var(--space-xl);
  max-width: 320px;
  width: 100%;
}

.confirm-title {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--space-sm);
}

.confirm-desc {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  margin-bottom: var(--space-xl);
}

.confirm-actions {
  display: flex;
  gap: var(--space-md);
}

.confirm-actions .btn {
  flex: 1;
}

/* Footer */
.play-footer {
  padding: var(--space-sm) var(--space-lg) calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
  position: relative;
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
