# 架構設計：奶酪大盜 H5 PWA (Cheese Thief)

> **版本**: v1.0
> **更新日期**: 2026-03-10
> **狀態**: Active
> **需求來源**: `features/cheese-thief/README.md` (v2.0)
> **平台**: H5 PWA — Vue 3 + Vite 5 + TypeScript (strict)

---

## 現有模式分析

### 參考的現有慣例

| 模式 | 來源檔案 | 本模組採用方式 |
|------|---------|--------------|
| Feature-Based 目錄結構 | `.claude/rules/tech-stack.md` L66-84 | `src/features/cheese-thief/` 含 components / composables / types / views |
| Composition API + `<script setup>` | `.claude/rules/coding-style.md` §4.1 | 所有 Vue 元件一律使用 `<script setup lang="ts">` |
| Setup Store (Pinia) | `.claude/rules/coding-style.md` §3.1 | `settingsStore`、`gameHistoryStore` 使用 Composition 風格 |
| 零 `any` 政策 | `.claude/rules/coding-style.md` §1.1 | 所有型別明確定義，TypeScript strict mode |
| 自訂 Error 類別 | `.claude/rules/coding-style.md` §7.1 | `TTSError`、`StorageError`、`GameLogicError` |
| BEM + CSS 變數 | `.claude/rules/coding-style.md` §5.1-5.2 | 全域 CSS 變數 + scoped BEM class |
| logger 工具 | `.claude/rules/coding-style.md` §7.2 | 禁止 `console.log`，使用統一 `logger` |
| VW/VH 適配 | `.claude/rules/tech-stack.md` L51-54 | PostCSS `px-to-viewport`，設計稿基準 375px |
| 禁止外部 HTTP | `.claude/rules/tech-stack.md` L121-132 | 純離線，無任何網路請求 |
| 禁止重量級 UI 庫 | `.claude/rules/tech-stack.md` L49 | 僅自訂 Vue 元件 + CSS3 |

---

## 架構決策

### 決策 1：純離線單裝置架構

- **選擇方案**: 所有遊戲邏輯在瀏覽器本地執行，無後端、無 WebSocket
- **理由**: v2.0 設計目標為「一台設備放桌上當主持人」，語音由 Web Speech API 提供，音效檔案 PWA precache，無需網路
- **Trade-offs**: 無法多裝置同步，但換取 100% 離線可用、零伺服器成本、架構極簡

### 決策 2：Composable-First 狀態機設計

- **選擇方案**: 遊戲狀態機由 `useCheeseThiefGame` composable 管理，不使用 Pinia 存放遊戲進行中狀態
- **理由**: 遊戲進行中狀態具有強時序性（TTS 等待、計時器回調、暫停恢復），由 composable 直接管理 `ref`/`computed` 比 Pinia action 更容易控制 async 生命週期；Pinia 僅用於跨路由持久化（設定、歷史記錄）
- **Trade-offs**: 狀態無法用 Pinia devtools 追蹤，但遊戲 session 本身不需要跨路由持久化

### 決策 3：TTS 優先，預錄音檔作為 Fallback

- **選擇方案**: 主要使用 Web Speech API，不支援時降級為預錄音檔，再降級為視覺主持模式
- **理由**: Web Speech API 不需要儲存大量音檔，離線完全可用；Fallback 機制對應 EC-06（TTS 不支援中文）
- **Trade-offs**: Web Speech API 聲音品質因裝置而異，但覆蓋率高（Chrome/Safari 均支援中文 TTS）

### 決策 4：IndexedDB (Dexie) 存歷史，localStorage 存設定

- **選擇方案**: 遊戲歷史記錄存 IndexedDB，語速/音量設定存 localStorage
- **理由**: 歷史記錄需要結構化查詢（排序、統計），IndexedDB 更適合；設定是簡單 KV 且需跨 session 快速讀取，localStorage 效能更好
- **Trade-offs**: 兩種儲存並存，但職責明確，符合 `tech-stack.md` 規範

### 決策 5：Service Worker 全量 Precache

- **選擇方案**: 透過 Workbox (`vite-plugin-pwa`) 對所有靜態資源 precache，包含音效 mp3 檔案
- **理由**: 遊戲核心需求之一為「離線可用」（US-07），音效不可在離線時失效
- **Trade-offs**: 首次載入時間較長（需 precache 音效），但後續完全離線，符合「首次載入 < 3 秒」目標（音效檔案需壓縮至總計 < 1MB）

---

## 專案目錄結構

```
src/
├── assets/
│   ├── audio/
│   │   ├── bgm-night.mp3          # 夜晚背景音樂（蟲鳴）
│   │   ├── bgm-day.mp3            # 白天背景音樂（鳥鳴）
│   │   ├── sfx-tick.mp3           # 倒計時滴答音效
│   │   ├── sfx-phase-change.mp3   # 階段切換音效
│   │   ├── sfx-win-mouse.mp3      # 老鼠陣營勝利音效
│   │   └── sfx-win-thief.mp3      # 大盜陣營勝利音效
│   └── images/
│       ├── cover-cheese-thief.webp # 遊戲封面圖
│       └── icons/                  # PWA 圖示
│           ├── icon-192.png
│           └── icon-512.png
│
├── components/                     # 全域共享元件
│   ├── CountdownTimer.vue          # 通用倒計時顯示元件
│   ├── PhaseIndicator.vue          # 當前階段大字顯示
│   ├── VolumeSlider.vue            # 音量滑桿元件
│   └── PauseOverlay.vue            # 暫停遮罩元件
│
├── composables/                    # 全域共享 Composables
│   ├── useTts.ts                   # Web Speech API 封裝
│   ├── useAudio.ts                 # Howler.js 音效管理
│   ├── useTimer.ts                 # 通用倒計時計時器
│   └── useGameHistory.ts           # 歷史記錄 (Dexie.js)
│
├── features/
│   └── cheese-thief/
│       ├── components/
│       │   ├── NightPhaseProgress.vue   # 1-6 叫號進度點
│       │   ├── PlayerCountSelector.vue  # 人數選擇器
│       │   ├── RoleCompositionCard.vue  # 角色組成預覽
│       │   ├── PrepCheckList.vue        # 實體道具清單
│       │   ├── ResultSelector.vue       # 結算勝負選擇
│       │   └── GameHistoryItem.vue      # 歷史記錄列表項
│       ├── composables/
│       │   ├── useCheeseThiefGame.ts    # 遊戲狀態機（核心）
│       │   └── useNightPhase.ts         # 夜晚叫號邏輯
│       ├── types/
│       │   └── cheese-thief.ts          # 功能專屬型別定義
│       ├── constants.ts                 # 遊戲常數與語音腳本
│       └── views/
│           ├── GameSelectView.vue       # 遊戲選擇（首頁）
│           ├── GameSetupView.vue        # 遊戲設定
│           ├── GamePlayView.vue         # 主持進行（核心頁）
│           └── HistoryView.vue          # 歷史記錄
│
├── router/
│   └── index.ts                    # Vue Router 4 路由定義
│
├── stores/
│   ├── settings-store.ts           # 語速、音量全域設定 (localStorage)
│   └── game-history-store.ts       # 遊戲歷史 (Dexie.js 橋接)
│
├── styles/
│   ├── variables.css               # CSS Design Tokens（日/夜色彩、間距、圓角）
│   ├── base.css                    # Reset + 全域基礎樣式
│   └── transitions.css             # 日夜切換動畫、頁面切換動畫
│
├── types/
│   └── global.d.ts                 # 全域型別宣告（Web Speech API 補充型別）
│
├── utils/
│   ├── errors.ts                   # AppError / TTSError / StorageError / GameLogicError
│   ├── logger.ts                   # 統一 logger（dev only）
│   └── db.ts                       # Dexie.js 資料庫初始化
│
├── App.vue
├── main.ts
└── sw.ts                           # Workbox Service Worker 配置
```

---

## TypeScript 型別定義

**檔案路徑**: `src/features/cheese-thief/types/cheese-thief.ts`

```typescript
// ==================== 遊戲階段 ====================

export type GamePhase =
  | 'idle'         // 未開始
  | 'rules'        // 規則說明語音
  | 'night'        // 夜晚語音主持
  | 'discussion'   // 白天討論計時
  | 'voting'       // 投票計時
  | 'result'       // 結算

// ==================== 遊戲設定 ====================

export interface GameConfig {
  playerCount: number        // 4-8，預設 4
  discussionMinutes: number  // 1-10，預設 3
  votingSeconds: number      // 30-120，預設 60
  speechRate: number         // 0.8-1.5，預設 1.0
  speechVolume: number       // 0-1，預設 1.0
  musicVolume: number        // 0-1，預設 0.3
  sfxVolume: number          // 0-1，預設 0.7
}

// ==================== 夜晚狀態 ====================

export interface NightState {
  currentDiceNumber: number  // 0-6（0 = 夜晚尚未開始）
  remainingSeconds: number   // 每號碼 5 秒倒計時
  isCompleted: boolean       // 是否已播報完 1-6 全部號碼
  isPaused: boolean
}

// ==================== 遊戲整體狀態 ====================

export interface GameState {
  phase: GamePhase
  config: GameConfig
  night: NightState
  isPaused: boolean
  startedAt: Date | null     // 本局開始時間（用於計算局時長）
}

// ==================== 結算結果 ====================

export type WinningFaction = 'mouse' | 'thief'

// ==================== 歷史記錄 ====================

export interface GameRecord {
  id: string                    // crypto.randomUUID()
  gameTemplate: 'cheese-thief'
  playerCount: number
  winningFaction: WinningFaction
  durationMinutes: number
  playedAt: Date
}

// ==================== 統計 ====================

export interface GameStats {
  totalGames: number
  mouseWins: number
  thiefWins: number
  mouseWinRate: number          // 0-1
  thiefWinRate: number          // 0-1
}

// ==================== TTS 模式 ====================

// 三段 Fallback 機制
export type TtsMode = 'web-speech' | 'audio-file' | 'visual-only'

// ==================== 角色組成 ====================

export interface RoleComposition {
  thiefCount: 1
  accompliceCount: 0 | 1 | 2   // 4人=0，5-6人=1，7-8人=2
  mouseCount: number
}
```

---

## 元件設計規格

### 全域共享元件 (`src/components/`)

| 元件 | Props | Emits | 職責 |
|------|-------|-------|------|
| `CountdownTimer.vue` | `seconds: number`, `isRunning: boolean`, `size?: 'lg'\|'xl'` | `tick`, `complete` | 顯示倒計時數字，超大字體（GamePlayView 主體） |
| `PhaseIndicator.vue` | `phase: GamePhase`, `label: string` | — | 當前階段文字大字顯示，根據 phase 切換日/夜配色 |
| `VolumeSlider.vue` | `modelValue: number`, `label: string`, `min?: number`, `max?: number` | `update:modelValue` | 音量/語速滑桿，支援 v-model |
| `PauseOverlay.vue` | `isVisible: boolean` | `resume` | 暫停時覆蓋全螢幕的遮罩，中央顯示「暫停中」與恢復按鈕 |

### 功能專屬元件 (`src/features/cheese-thief/components/`)

| 元件 | Props | Emits | 職責 |
|------|-------|-------|------|
| `NightPhaseProgress.vue` | `currentNumber: number`, `totalNumbers?: 6` | — | 底部 6 個進度點，已播報的點亮起 |
| `PlayerCountSelector.vue` | `modelValue: number` | `update:modelValue` | 橫向 4-8 人數選擇器，選中項目放大顯示 |
| `RoleCompositionCard.vue` | `playerCount: number` | — | 依人數顯示角色卡組成（大盜/共犯/貪睡鼠數量） |
| `PrepCheckList.vue` | `playerCount: number` | — | 實體道具清單（骰子、骰盅、角色卡、奶酪標記） |
| `ResultSelector.vue` | — | `select: [faction: WinningFaction]` | 結算時組織者選擇勝利方的兩個大按鈕 |
| `GameHistoryItem.vue` | `record: GameRecord` | — | 歷史記錄列表中的單筆項目 |

---

## 核心 Composable 設計

### `useCheeseThiefGame.ts` — 遊戲狀態機

**路徑**: `src/features/cheese-thief/composables/useCheeseThiefGame.ts`

**職責**: 管理 `GamePhase` 轉換，協調 `useNightPhase`、`useTts`、`useAudio`、`useTimer`，是整個遊戲的控制中樞。

```typescript
import { ref, computed, readonly } from 'vue'
import type { GameConfig, GamePhase, GameState, WinningFaction } from '../types/cheese-thief'
import { useNightPhase } from './useNightPhase'
import { useTts } from '@/composables/useTts'
import { useAudio } from '@/composables/useAudio'
import { useTimer } from '@/composables/useTimer'
import { useGameHistory } from '@/composables/useGameHistory'
import { NIGHT_SCRIPTS, DAY_SCRIPTS, RESULT_SCRIPTS } from '../constants'
import { GameLogicError } from '@/utils/errors'
import { logger } from '@/utils/logger'

export function useCheeseThiefGame() {
  // ── 依賴 Composables ──
  const tts = useTts()
  const audio = useAudio()
  const timer = useTimer()
  const nightPhase = useNightPhase({ tts, audio })
  const history = useGameHistory()

  // ── 核心狀態 ──
  const phase = ref<GamePhase>('idle')
  const config = ref<GameConfig>(DEFAULT_CONFIG)
  const isPaused = ref(false)
  const startedAt = ref<Date | null>(null)

  // ── Computed ──
  const isActive = computed(() =>
    phase.value !== 'idle' && phase.value !== 'result'
  )

  // ── Phase 轉換函數 ──

  async function startGame(gameConfig: GameConfig): Promise<void> {
    config.value = gameConfig
    startedAt.value = new Date()
    await _transitionTo('rules')
  }

  async function _transitionTo(nextPhase: GamePhase): Promise<void> {
    logger.info(`[Game] Phase transition: ${phase.value} → ${nextPhase}`)
    phase.value = nextPhase

    switch (nextPhase) {
      case 'rules':
        await _runRulesPhase()
        break
      case 'night':
        await _runNightPhase()
        break
      case 'discussion':
        await _runDiscussionPhase()
        break
      case 'voting':
        await _runVotingPhase()
        break
    }
  }

  async function _runRulesPhase(): Promise<void> {
    audio.stopAll()
    const script = config.value.playerCount >= 5
      ? NIGHT_SCRIPTS.rulesWithAccomplice
      : NIGHT_SCRIPTS.rulesBasic
    await tts.speak(script, config.value)
    // 規則語音結束後自動進入夜晚（使用者也可手動跳過）
    if (phase.value === 'rules') {
      await _transitionTo('night')
    }
  }

  async function _runNightPhase(): Promise<void> {
    audio.playBgm('night', config.value.musicVolume)
    await tts.speak(NIGHT_SCRIPTS.nightBegin, config.value)
    await nightPhase.runNightSequence(config.value)
    await tts.speak(NIGHT_SCRIPTS.nightEnd(config.value.discussionMinutes), config.value)
    if (phase.value === 'night') {
      await _transitionTo('discussion')
    }
  }

  async function _runDiscussionPhase(): Promise<void> {
    audio.playBgm('day', config.value.musicVolume)
    const totalSeconds = config.value.discussionMinutes * 60

    timer.start({
      seconds: totalSeconds,
      onTick: (remaining) => {
        // 最後 30 秒語音提醒
        if (remaining === 30) {
          tts.speak(DAY_SCRIPTS.thirtySecondsLeft, config.value)
        }
      },
      onComplete: async () => {
        await tts.speak(DAY_SCRIPTS.discussionEnd, config.value)
        if (phase.value === 'discussion') {
          await _transitionTo('voting')
        }
      },
    })
  }

  async function _runVotingPhase(): Promise<void> {
    await tts.speak(DAY_SCRIPTS.votingCountdown, config.value)
    timer.start({
      seconds: config.value.votingSeconds,
      onComplete: () => {
        // 投票計時結束，等待組織者手動選擇勝負
        phase.value = 'result'
      },
    })
  }

  // ── 暫停/恢復 ──

  function pause(): void {
    if (!isActive.value || isPaused.value) return
    isPaused.value = true
    tts.stop()
    timer.pause()
    audio.pauseAll()
    nightPhase.pause()
    logger.info('[Game] Paused')
  }

  function resume(): void {
    if (!isPaused.value) return
    isPaused.value = false
    audio.resumeAll()
    nightPhase.resume()
    timer.resume()
    logger.info('[Game] Resumed')
  }

  // ── 跳過/手動控制 ──

  function skipCurrentPhase(): void {
    tts.stop()
    timer.stop()
    nightPhase.skip()
    const next = _nextPhase(phase.value)
    if (next) _transitionTo(next)
  }

  function _nextPhase(current: GamePhase): GamePhase | null {
    const sequence: GamePhase[] = ['rules', 'night', 'discussion', 'voting', 'result']
    const idx = sequence.indexOf(current)
    return idx >= 0 && idx < sequence.length - 1 ? sequence[idx + 1] : null
  }

  // ── 結算 ──

  async function resolveResult(faction: WinningFaction): Promise<void> {
    if (phase.value !== 'result') {
      throw new GameLogicError('Cannot resolve result outside result phase')
    }
    audio.stopAll()
    const script = faction === 'mouse'
      ? RESULT_SCRIPTS.mouseWins
      : RESULT_SCRIPTS.thiefWins
    audio.playSfx(faction === 'mouse' ? 'win-mouse' : 'win-thief', config.value.sfxVolume)
    await tts.speak(script, config.value)

    // 儲存歷史記錄
    const duration = startedAt.value
      ? Math.round((Date.now() - startedAt.value.getTime()) / 60000)
      : 0
    await history.saveRecord({
      gameTemplate: 'cheese-thief',
      playerCount: config.value.playerCount,
      winningFaction: faction,
      durationMinutes: duration,
    })
  }

  // ── 重置 ──

  function reset(): void {
    phase.value = 'idle'
    isPaused.value = false
    startedAt.value = null
    tts.stop()
    timer.stop()
    audio.stopAll()
    nightPhase.reset()
    logger.info('[Game] Reset')
  }

  return {
    // State (readonly 防止外部直接修改)
    phase: readonly(phase),
    config: readonly(config),
    isPaused: readonly(isPaused),
    isActive,
    // Night phase 狀態（穿透給 View）
    nightState: nightPhase.state,
    // Timer 剩餘秒數（穿透給 CountdownTimer）
    timerRemaining: timer.remaining,
    // Actions
    startGame,
    pause,
    resume,
    skipCurrentPhase,
    resolveResult,
    reset,
  }
}

const DEFAULT_CONFIG: GameConfig = {
  playerCount: 4,
  discussionMinutes: 3,
  votingSeconds: 60,
  speechRate: 1.0,
  speechVolume: 1.0,
  musicVolume: 0.3,
  sfxVolume: 0.7,
}
```

---

### `useNightPhase.ts` — 夜晚叫號邏輯

**路徑**: `src/features/cheese-thief/composables/useNightPhase.ts`

**職責**: 管理 1→6 號碼依序播報，每號 5 秒等待，支援暫停/恢復/跳過。

```typescript
import { ref, computed, readonly } from 'vue'
import type { NightState, GameConfig } from '../types/cheese-thief'
import type { UseTtsReturn } from '@/composables/useTts'
import type { UseAudioReturn } from '@/composables/useAudio'
import { NIGHT_SCRIPTS } from '../constants'

const NIGHT_NUMBERS = [1, 2, 3, 4, 5, 6] as const
const WAIT_SECONDS_PER_NUMBER = 5

interface NightPhaseOptions {
  tts: UseTtsReturn
  audio: UseAudioReturn
}

export function useNightPhase({ tts, audio }: NightPhaseOptions) {
  const currentDiceNumber = ref(0)
  const remainingSeconds = ref(0)
  const isCompleted = ref(false)
  const isPaused = ref(false)

  // 供外部中斷 await 的控制旗標
  let _abortSignal = false
  let _pauseResolve: (() => void) | null = null

  const state = computed<NightState>(() => ({
    currentDiceNumber: currentDiceNumber.value,
    remainingSeconds: remainingSeconds.value,
    isCompleted: isCompleted.value,
    isPaused: isPaused.value,
  }))

  async function runNightSequence(config: GameConfig): Promise<void> {
    _abortSignal = false
    isCompleted.value = false

    for (const num of NIGHT_NUMBERS) {
      if (_abortSignal) break

      // 等待暫停解除
      await _waitIfPaused()
      if (_abortSignal) break

      currentDiceNumber.value = num

      // 播報語音：「骰子數字是 N 的玩家，請睜開眼睛」
      audio.duck(config.musicVolume)  // TTS 播報時降低音樂至 10%
      await tts.speak(NIGHT_SCRIPTS.callNumber(num), config)
      audio.unduck(config.musicVolume)

      if (_abortSignal) break

      // 5 秒等待倒計時
      await _countdown(WAIT_SECONDS_PER_NUMBER)
    }

    if (!_abortSignal) {
      isCompleted.value = true
    }
  }

  async function _countdown(seconds: number): Promise<void> {
    remainingSeconds.value = seconds
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (_abortSignal) {
          clearInterval(interval)
          resolve()
          return
        }
        if (isPaused.value) {
          // 計時器暫停，等待 resume
          await _waitIfPaused()
        }
        remainingSeconds.value--
        if (remainingSeconds.value <= 0) {
          clearInterval(interval)
          resolve()
        }
      }, 1000)
    })
  }

  function _waitIfPaused(): Promise<void> {
    if (!isPaused.value) return Promise.resolve()
    return new Promise((resolve) => {
      _pauseResolve = resolve
    })
  }

  function pause(): void {
    isPaused.value = true
  }

  function resume(): void {
    isPaused.value = false
    if (_pauseResolve) {
      _pauseResolve()
      _pauseResolve = null
    }
  }

  function skip(): void {
    _abortSignal = true
    resume()  // 確保 await 能解除
  }

  function reset(): void {
    currentDiceNumber.value = 0
    remainingSeconds.value = 0
    isCompleted.value = false
    isPaused.value = false
    _abortSignal = false
    _pauseResolve = null
  }

  return {
    state,
    runNightSequence,
    pause,
    resume,
    skip,
    reset,
  }
}
```

---

### `useTts.ts` — Web Speech API 封裝

**路徑**: `src/composables/useTts.ts`

**職責**: 封裝 `speechSynthesis`，支援語速/音量設定、`onend` 等待、瀏覽器相容性偵測與 Fallback。

```typescript
import { ref, onUnmounted } from 'vue'
import { TTSError } from '@/utils/errors'
import { logger } from '@/utils/logger'
import type { GameConfig } from '@/features/cheese-thief/types/cheese-thief'

export type TtsMode = 'web-speech' | 'audio-file' | 'visual-only'

export interface UseTtsReturn {
  isSpeaking: Readonly<typeof isSpeakingRef>
  mode: Readonly<typeof modeRef>
  speak: (text: string, config: Pick<GameConfig, 'speechRate' | 'speechVolume'>) => Promise<void>
  stop: () => void
}

const isSpeakingRef = ref(false)
const modeRef = ref<TtsMode>('web-speech')

export function useTts(): UseTtsReturn {
  const isSpeaking = isSpeakingRef
  const mode = modeRef

  // 啟動時偵測 TTS 可用性
  _detectTtsMode()

  function _detectTtsMode(): void {
    if (!('speechSynthesis' in window)) {
      logger.warn('[TTS] Web Speech API not supported, fallback to audio-file')
      mode.value = 'audio-file'
      return
    }
    // 測試中文語音可用性（非同步，voices 可能尚未載入）
    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      const hasZh = voices.some(v => v.lang.startsWith('zh'))
      if (!hasZh && voices.length > 0) {
        logger.warn('[TTS] No Chinese voice found, fallback to audio-file')
        mode.value = 'audio-file'
      }
    }
    window.speechSynthesis.onvoiceschanged = checkVoices
    checkVoices()
  }

  function speak(
    text: string,
    config: Pick<GameConfig, 'speechRate' | 'speechVolume'>
  ): Promise<void> {
    if (mode.value === 'visual-only') return Promise.resolve()
    if (mode.value === 'audio-file') {
      // Fallback：交由 useAudio 播放預錄音檔（key 由呼叫端提供）
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      // iOS Safari 需要在使用者手勢後才能播放，先 cancel 確保佇列清空
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-TW'
      utterance.rate = config.speechRate
      utterance.volume = config.speechVolume

      utterance.onstart = () => {
        isSpeaking.value = true
        logger.info(`[TTS] Speaking: "${text.slice(0, 20)}..."`)
      }

      utterance.onend = () => {
        isSpeaking.value = false
        resolve()
      }

      utterance.onerror = (event) => {
        isSpeaking.value = false
        // 'interrupted' 是正常的 stop() 呼叫，不視為錯誤
        if (event.error === 'interrupted') {
          resolve()
          return
        }
        logger.error('[TTS] Error:', event.error)
        reject(new TTSError(`SpeechSynthesis error: ${event.error}`))
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  function stop(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    isSpeaking.value = false
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isSpeaking,
    mode,
    speak,
    stop,
  }
}
```

---

### `useAudio.ts` — Howler.js 音效管理

**路徑**: `src/composables/useAudio.ts`

**職責**: 管理背景音樂（日/夜切換）、音效播放、TTS 播報時自動 Duck（降音量）。

```typescript
import { ref } from 'vue'
import { Howl, Howler } from 'howler'
import { logger } from '@/utils/logger'

type BgmTrack = 'night' | 'day'
type SfxKey = 'tick' | 'phase-change' | 'win-mouse' | 'win-thief'

const BGM_SRC: Record<BgmTrack, string> = {
  night: '/audio/bgm-night.mp3',
  day: '/audio/bgm-day.mp3',
}

const SFX_SRC: Record<SfxKey, string> = {
  tick: '/audio/sfx-tick.mp3',
  'phase-change': '/audio/sfx-phase-change.mp3',
  'win-mouse': '/audio/sfx-win-mouse.mp3',
  'win-thief': '/audio/sfx-win-thief.mp3',
}

export interface UseAudioReturn {
  playBgm: (track: BgmTrack, volume: number) => void
  stopBgm: () => void
  pauseAll: () => void
  resumeAll: () => void
  stopAll: () => void
  playSfx: (key: SfxKey, volume: number) => void
  duck: (baseVolume: number) => void      // TTS 播報時降至 10%
  unduck: (baseVolume: number) => void    // TTS 結束後恢復
}

export function useAudio(): UseAudioReturn {
  let currentBgm: Howl | null = null
  let currentBgmTrack: BgmTrack | null = null
  const isDucked = ref(false)

  // 預載所有 SFX（防止首次播放延遲）
  const sfxPool: Partial<Record<SfxKey, Howl>> = {}
  for (const [key, src] of Object.entries(SFX_SRC) as [SfxKey, string][]) {
    sfxPool[key] = new Howl({ src: [src], preload: true })
  }

  function playBgm(track: BgmTrack, volume: number): void {
    if (currentBgmTrack === track && currentBgm?.playing()) return

    currentBgm?.fade(currentBgm.volume(), 0, 500)
    currentBgm?.once('fade', () => currentBgm?.stop())

    const bgm = new Howl({
      src: [BGM_SRC[track]],
      loop: true,
      volume: isDucked.value ? volume * 0.1 : volume,
    })
    bgm.play()
    currentBgm = bgm
    currentBgmTrack = track
    logger.info(`[Audio] BGM: ${track}`)
  }

  function stopBgm(): void {
    currentBgm?.fade(currentBgm.volume(), 0, 300)
    currentBgm?.once('fade', () => currentBgm?.stop())
    currentBgm = null
    currentBgmTrack = null
  }

  function pauseAll(): void {
    Howler.autoUnlock = false
    currentBgm?.pause()
  }

  function resumeAll(): void {
    currentBgm?.play()
  }

  function stopAll(): void {
    Howler.stop()
    currentBgm = null
    currentBgmTrack = null
  }

  function playSfx(key: SfxKey, volume: number): void {
    const sfx = sfxPool[key]
    if (!sfx) {
      logger.warn(`[Audio] SFX not found: ${key}`)
      return
    }
    sfx.volume(volume)
    sfx.play()
  }

  function duck(baseVolume: number): void {
    isDucked.value = true
    currentBgm?.fade(currentBgm.volume(), baseVolume * 0.1, 200)
  }

  function unduck(baseVolume: number): void {
    isDucked.value = false
    currentBgm?.fade(currentBgm.volume(), baseVolume, 300)
  }

  return {
    playBgm,
    stopBgm,
    pauseAll,
    resumeAll,
    stopAll,
    playSfx,
    duck,
    unduck,
  }
}
```

---

### `useTimer.ts` — 通用計時器

**路徑**: `src/composables/useTimer.ts`

**職責**: 可暫停/恢復的倒計時，每秒回調，結束回調。

```typescript
import { ref, readonly } from 'vue'

interface TimerOptions {
  seconds: number
  onTick?: (remaining: number) => void
  onComplete?: () => void
}

export function useTimer() {
  const remaining = ref(0)
  const isRunning = ref(false)

  let _intervalId: ReturnType<typeof setInterval> | null = null
  let _onTick: ((remaining: number) => void) | undefined
  let _onComplete: (() => void) | undefined

  function start(options: TimerOptions): void {
    stop()
    remaining.value = options.seconds
    _onTick = options.onTick
    _onComplete = options.onComplete
    isRunning.value = true
    _tick()
  }

  function _tick(): void {
    _intervalId = setInterval(() => {
      if (remaining.value <= 0) {
        stop()
        _onComplete?.()
        return
      }
      remaining.value--
      _onTick?.(remaining.value)
    }, 1000)
  }

  function pause(): void {
    if (_intervalId !== null) {
      clearInterval(_intervalId)
      _intervalId = null
      isRunning.value = false
    }
  }

  function resume(): void {
    if (!isRunning.value && remaining.value > 0) {
      isRunning.value = true
      _tick()
    }
  }

  function stop(): void {
    if (_intervalId !== null) {
      clearInterval(_intervalId)
      _intervalId = null
    }
    isRunning.value = false
    remaining.value = 0
  }

  return {
    remaining: readonly(remaining),
    isRunning: readonly(isRunning),
    start,
    pause,
    resume,
    stop,
  }
}
```

---

### `useGameHistory.ts` — Dexie.js 歷史記錄

**路徑**: `src/composables/useGameHistory.ts`

```typescript
import { ref } from 'vue'
import type { GameRecord, GameStats } from '@/features/cheese-thief/types/cheese-thief'
import { db } from '@/utils/db'
import { StorageError } from '@/utils/errors'
import { logger } from '@/utils/logger'

const MAX_RECORDS = 200

export function useGameHistory() {
  const records = ref<GameRecord[]>([])
  const stats = ref<GameStats>({
    totalGames: 0,
    mouseWins: 0,
    thiefWins: 0,
    mouseWinRate: 0,
    thiefWinRate: 0,
  })

  async function loadHistory(): Promise<void> {
    try {
      const data = await db.gameRecords
        .orderBy('playedAt')
        .reverse()
        .toArray()
      records.value = data
      _computeStats(data)
    } catch (err) {
      throw new StorageError(`Failed to load game history: ${String(err)}`)
    }
  }

  async function saveRecord(
    input: Omit<GameRecord, 'id' | 'playedAt'>
  ): Promise<void> {
    const record: GameRecord = {
      ...input,
      id: crypto.randomUUID(),
      playedAt: new Date(),
    }
    try {
      await db.gameRecords.add(record)
      // 自動清理超過 200 筆的舊記錄
      const count = await db.gameRecords.count()
      if (count > MAX_RECORDS) {
        const oldest = await db.gameRecords.orderBy('playedAt').first()
        if (oldest) await db.gameRecords.delete(oldest.id)
      }
      records.value.unshift(record)
      _computeStats(records.value)
      logger.info(`[History] Saved record: ${record.id}`)
    } catch (err) {
      throw new StorageError(`Failed to save game record: ${String(err)}`)
    }
  }

  function _computeStats(data: GameRecord[]): void {
    const total = data.length
    const mouseWins = data.filter(r => r.winningFaction === 'mouse').length
    const thiefWins = total - mouseWins
    stats.value = {
      totalGames: total,
      mouseWins,
      thiefWins,
      mouseWinRate: total > 0 ? mouseWins / total : 0,
      thiefWinRate: total > 0 ? thiefWins / total : 0,
    }
  }

  return {
    records,
    stats,
    loadHistory,
    saveRecord,
  }
}
```

---

## Pinia Store 設計

### `settings-store.ts`

**路徑**: `src/stores/settings-store.ts`

**儲存後端**: `localStorage`（直接在 action 內讀寫）

```typescript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { GameConfig } from '@/features/cheese-thief/types/cheese-thief'

const STORAGE_KEY = 'ct_settings'

export const useSettingsStore = defineStore('settings', () => {
  const config = ref<GameConfig>(_loadFromStorage())

  // 自動持久化
  watch(config, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, { deep: true })

  function updateConfig(partial: Partial<GameConfig>): void {
    config.value = { ...config.value, ...partial }
  }

  function resetDefaults(): void {
    config.value = DEFAULT_CONFIG
  }

  return { config, updateConfig, resetDefaults }
})

function _loadFromStorage(): GameConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) as Partial<GameConfig> }
  } catch {
    return DEFAULT_CONFIG
  }
}

const DEFAULT_CONFIG: GameConfig = {
  playerCount: 4,
  discussionMinutes: 3,
  votingSeconds: 60,
  speechRate: 1.0,
  speechVolume: 1.0,
  musicVolume: 0.3,
  sfxVolume: 0.7,
}
```

### `game-history-store.ts`

**路徑**: `src/stores/game-history-store.ts`

**職責**: 橋接 `useGameHistory` composable 與 Pinia，使 `HistoryView` 可以透過 Store 取得歷史狀態，避免每次進入頁面重複建立 composable 實例。

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameRecord, GameStats } from '@/features/cheese-thief/types/cheese-thief'
import { useGameHistory } from '@/composables/useGameHistory'

export const useGameHistoryStore = defineStore('gameHistory', () => {
  const { records, stats, loadHistory, saveRecord } = useGameHistory()
  const isLoaded = ref(false)

  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value) {
      await loadHistory()
      isLoaded.value = true
    }
  }

  return {
    records,
    stats,
    isLoaded,
    ensureLoaded,
    saveRecord,
  }
})
```

---

## 常數與語音腳本

**路徑**: `src/features/cheese-thief/constants.ts`

```typescript
// 所有字串集中管理，禁止在元件內硬編碼文字
export const NIGHT_SCRIPTS = {
  rulesBasic: `歡迎來到奶酪大盜。\n\n在這個遊戲中，你們之中有一個人是奶酪大盜……`,
  rulesWithAccomplice: `歡迎來到奶酪大盜。\n\n今天的局有共犯機制……`,
  nightBegin: `好，現在進入夜晚。\n請所有人閉上眼睛。\n\n深呼吸，放鬆。\n\n夜晚，悄悄降臨……`,
  callNumber: (n: number) => `骰子數字是 ${n} 的玩家，請睜開眼睛。`,
  nightEnd: (minutes: number) =>
    `好，請所有人閉上眼睛。\n\n黎明到來，天亮了。\n\n請所有人睜開眼睛。\n\n現在開始討論。\n你們有 ${minutes} 分鐘的時間，找出奶酪大盜。`,
} as const

export const DAY_SCRIPTS = {
  thirtySecondsLeft: `剩餘三十秒，即將進入投票。`,
  discussionEnd: `時間到。\n\n停止討論。\n\n現在，請所有人同時指向你認為的奶酪大盜。\n\n三、二、一，指！`,
  votingCountdown: `三、二、一，指！`,
} as const

export const RESULT_SCRIPTS = {
  mouseWins: `貪睡鼠陣營勝利！\n\n奶酪大盜被成功識破，奶酪保住了！`,
  thiefWins: `奶酪大盜勝利！\n\n大盜成功逃脫，奶酪已經被偷走了。`,
} as const

export const ROLE_COMPOSITION: Record<number, { thief: 1; accomplice: 0 | 1 | 2; mouse: number }> = {
  4: { thief: 1, accomplice: 0, mouse: 3 },
  5: { thief: 1, accomplice: 1, mouse: 3 },
  6: { thief: 1, accomplice: 1, mouse: 4 },
  7: { thief: 1, accomplice: 2, mouse: 4 },
  8: { thief: 1, accomplice: 2, mouse: 5 },
}

export const MIN_PLAYERS = 4
export const MAX_PLAYERS = 8
export const NIGHT_WAIT_SECONDS = 5
export const MAX_HISTORY_RECORDS = 200
```

---

## Dexie.js 資料庫初始化

**路徑**: `src/utils/db.ts`

```typescript
import Dexie, { type Table } from 'dexie'
import type { GameRecord } from '@/features/cheese-thief/types/cheese-thief'

class AppDatabase extends Dexie {
  gameRecords!: Table<GameRecord, string>

  constructor() {
    super('boardgame-host-db')
    this.version(1).stores({
      // id 為主鍵，playedAt 為索引（排序用）
      gameRecords: 'id, playedAt, gameTemplate, winningFaction',
    })
  }
}

export const db = new AppDatabase()
```

---

## 路由設計

**路徑**: `src/router/index.ts`

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'game-select',
      component: () => import('@/features/cheese-thief/views/GameSelectView.vue'),
      meta: { title: '選擇遊戲' },
    },
    {
      path: '/cheese-thief/setup',
      name: 'cheese-thief-setup',
      component: () => import('@/features/cheese-thief/views/GameSetupView.vue'),
      meta: { title: '遊戲設定' },
    },
    {
      path: '/cheese-thief/play',
      name: 'cheese-thief-play',
      component: () => import('@/features/cheese-thief/views/GamePlayView.vue'),
      meta: { title: '主持進行' },
      // 防止直接進入遊戲頁（需先完成設定）
      beforeEnter: (_to, _from, next) => {
        const hasSetup = sessionStorage.getItem('ct_setup_done')
        hasSetup ? next() : next({ name: 'cheese-thief-setup' })
      },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/features/cheese-thief/views/HistoryView.vue'),
      meta: { title: '歷史記錄' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/features/cheese-thief/views/SettingsView.vue'),
      meta: { title: '設定' },
    },
  ],
})

// 自動設定頁面標題
router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} — 桌遊語音主持人` : '桌遊語音主持人'
})

export default router
```

---

## CSS 設計規格

### 日夜色彩 Design Tokens

**路徑**: `src/styles/variables.css`

```css
:root {
  /* 日間模式（Discussion / Voting） */
  --color-phase-bg: #fdf6e3;
  --color-phase-text: #2c3e50;
  --color-phase-accent: #e67e22;

  /* 夜晚模式（Night Phase） */
  --color-night-bg: #0d1b2a;
  --color-night-surface: #1a2a3a;
  --color-night-text: #c8d6e5;
  --color-night-accent: #6c5ce7;

  /* 通用 */
  --color-primary: #5b6abf;
  --color-success: #27ae60;
  --color-error: #e74c3c;
  --color-warning: #f39c12;

  /* 間距（px → vw 由 PostCSS 轉換） */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;

  /* 圓角 */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 999px;

  /* 大計時數字 */
  --font-size-timer: 80px;
  --font-size-phase: 36px;
}
```

### 日夜切換動畫

**路徑**: `src/styles/transitions.css`

```css
/* GamePlayView 背景日夜切換：800ms 漸變 */
.game-play-view {
  transition:
    background-color 800ms ease-in-out,
    color 800ms ease-in-out;
}

.game-play-view--night {
  background-color: var(--color-night-bg);
  color: var(--color-night-text);
}

.game-play-view--day {
  background-color: var(--color-phase-bg);
  color: var(--color-phase-text);
}

/* 頁面切換 */
.page-enter-active,
.page-leave-active {
  transition: opacity 250ms ease, transform 250ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
```

---

## 資料流圖

```
View (GamePlayView.vue)
  │  reactive binding (readonly refs)
  ▼
useCheeseThiefGame (狀態機 composable)
  │  呼叫
  ├──▶ useNightPhase     ──▶ 管理 1-6 叫號序列
  ├──▶ useTts            ──▶ Web Speech API
  ├──▶ useAudio          ──▶ Howler.js (BGM / SFX)
  └──▶ useTimer          ──▶ setInterval 倒計時
                                        │
                         useGameHistory ──▶ Dexie.js (IndexedDB)
                                        │
Pinia Stores（跨路由持久化）
  ├── settingsStore      ──▶ localStorage
  └── gameHistoryStore   ──▶ 橋接 useGameHistory
```

---

## PWA 離線策略

**路徑**: `src/sw.ts` + `vite.config.ts`（`vite-plugin-pwa` 配置）

### Workbox 快取策略

```typescript
// vite.config.ts（PWA 配置片段）
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    // Precache：所有編譯產物 + 音效檔案
    globPatterns: ['**/*.{js,css,html,ico,png,webp,mp3}'],
    // 音效檔案快取策略：Cache First（離線優先）
    runtimeCaching: [
      {
        urlPattern: /\.mp3$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'audio-cache',
          expiration: { maxEntries: 20 },
        },
      },
    ],
  },
  manifest: {
    name: '桌遊語音主持人',
    short_name: '語音主持',
    theme_color: '#0d1b2a',
    background_color: '#0d1b2a',
    display: 'standalone',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
})
```

### Service Worker 更新策略

- `registerType: 'autoUpdate'` — 背景自動更新 SW
- 更新完成後顯示「已更新，點擊重新整理」提示（`App.vue` 監聽 `useRegisterSW`）
- 所有音效 mp3 必須壓縮至總計 < 800KB，確保首次載入 < 3 秒

### 瀏覽器自動播放限制處理

iOS Safari / Chrome 要求使用者手勢後才能播放音訊。策略：

1. `GameSetupView.vue` 顯示「開始遊戲」按鈕 → 使用者點擊 → 觸發手勢
2. 按鈕 click handler 內立即呼叫 `audio.unlock()`（Howler.js 內建解鎖機制）
3. 解鎖後才允許進入 `GamePlayView`

---

## 元件清單與建置順序

### 元件設計規格總表

| 元件 | 路徑 | 職責 | 依賴 |
|------|------|------|------|
| `cheese-thief.ts` | `features/cheese-thief/types/` | 所有型別定義 | 無 |
| `constants.ts` | `features/cheese-thief/` | 語音腳本、遊戲常數 | 型別 |
| `db.ts` | `utils/` | Dexie 資料庫初始化 | Dexie |
| `errors.ts` | `utils/` | 自訂 Error 類別 | 無 |
| `logger.ts` | `utils/` | 統一 logger | 無 |
| `useTimer.ts` | `composables/` | 通用倒計時 | 無 |
| `useTts.ts` | `composables/` | TTS 封裝 | errors, logger |
| `useAudio.ts` | `composables/` | 音效管理 | Howler, logger |
| `useGameHistory.ts` | `composables/` | 歷史記錄 CRUD | db, errors, logger |
| `useNightPhase.ts` | `features/.../composables/` | 夜晚叫號序列 | useTts, useAudio, constants |
| `useCheeseThiefGame.ts` | `features/.../composables/` | 遊戲狀態機 | useNightPhase, useTts, useAudio, useTimer, useGameHistory |
| `settings-store.ts` | `stores/` | 設定持久化 | 型別 |
| `game-history-store.ts` | `stores/` | 歷史 Store 橋接 | useGameHistory |
| `CountdownTimer.vue` | `components/` | 倒計時顯示 | 無 |
| `PhaseIndicator.vue` | `components/` | 階段文字顯示 | 型別 |
| `VolumeSlider.vue` | `components/` | 音量滑桿 | 無 |
| `PauseOverlay.vue` | `components/` | 暫停遮罩 | 無 |
| `NightPhaseProgress.vue` | `features/.../components/` | 1-6 進度點 | 無 |
| `PlayerCountSelector.vue` | `features/.../components/` | 人數選擇 | 常數 |
| `RoleCompositionCard.vue` | `features/.../components/` | 角色組成 | 常數 |
| `PrepCheckList.vue` | `features/.../components/` | 道具清單 | 常數 |
| `ResultSelector.vue` | `features/.../components/` | 勝負選擇 | 型別 |
| `GameHistoryItem.vue` | `features/.../components/` | 歷史列表項 | 型別 |
| `GameSelectView.vue` | `features/.../views/` | 首頁 | settingsStore |
| `GameSetupView.vue` | `features/.../views/` | 遊戲設定 | settingsStore, PlayerCountSelector, RoleCompositionCard, PrepCheckList, VolumeSlider |
| `GamePlayView.vue` | `features/.../views/` | 主持進行 | useCheeseThiefGame, CountdownTimer, PhaseIndicator, PauseOverlay, NightPhaseProgress, ResultSelector |
| `HistoryView.vue` | `features/.../views/` | 歷史記錄 | gameHistoryStore, GameHistoryItem |
| `router/index.ts` | `router/` | 路由定義 | views |

---

## 建置順序

### Sprint 1 — 基礎骨架

- [ ] 初始化 Vite + Vue 3 + TypeScript 專案
- [ ] 配置 `tsconfig.json`（strict mode）
- [ ] 配置 PostCSS `px-to-viewport`（基準 375px）
- [ ] 配置 `vite-plugin-pwa` + Workbox
- [ ] 建立 `src/utils/errors.ts`、`src/utils/logger.ts`
- [ ] 建立 `src/utils/db.ts`（Dexie 初始化）
- [ ] 建立 `src/styles/variables.css`、`base.css`、`transitions.css`
- [ ] 建立 `src/features/cheese-thief/types/cheese-thief.ts`
- [ ] 建立 `src/features/cheese-thief/constants.ts`

### Sprint 2 — 核心 Composables

- [ ] 實作 `src/composables/useTimer.ts`
- [ ] 實作 `src/composables/useTts.ts`（含 Fallback 偵測）
- [ ] 實作 `src/composables/useAudio.ts`（Howler.js 整合）
- [ ] 實作 `src/composables/useGameHistory.ts`（Dexie CRUD）
- [ ] 實作 `src/features/cheese-thief/composables/useNightPhase.ts`
- [ ] 實作 `src/features/cheese-thief/composables/useCheeseThiefGame.ts`

### Sprint 3 — Pinia Stores + Router

- [ ] 實作 `src/stores/settings-store.ts`
- [ ] 實作 `src/stores/game-history-store.ts`
- [ ] 實作 `src/router/index.ts`

### Sprint 4 — 共用元件

- [ ] `CountdownTimer.vue`
- [ ] `PhaseIndicator.vue`
- [ ] `VolumeSlider.vue`
- [ ] `PauseOverlay.vue`

### Sprint 5 — 功能專屬元件

- [ ] `NightPhaseProgress.vue`
- [ ] `PlayerCountSelector.vue`
- [ ] `RoleCompositionCard.vue`
- [ ] `PrepCheckList.vue`
- [ ] `ResultSelector.vue`
- [ ] `GameHistoryItem.vue`

### Sprint 6 — Views（頁面）

- [ ] `GameSelectView.vue`
- [ ] `GameSetupView.vue`
- [ ] `GamePlayView.vue`（核心，最複雜）
- [ ] `HistoryView.vue`
- [ ] `SettingsView.vue`

### Sprint 7 — PWA + 音效資源

- [ ] 準備音效 mp3 並壓縮（目標 < 800KB 總計）
- [ ] 配置 Service Worker 更新提示（`App.vue`）
- [ ] 測試離線模式完整流程
- [ ] 測試 iOS Safari TTS + 自動播放限制

---

## Edge Cases 對應方案

| Edge Case | 來源 | 架構對應 |
|-----------|------|---------|
| EC-06：TTS 不支援中文 | `features/README.md` | `useTts._detectTtsMode()` 三段 Fallback：web-speech → audio-file → visual-only |
| EC-03：裝置靜音 | `features/README.md` | `GameSetupView` 啟動前偵測音量，`GamePlayView` 顯示視覺號碼（始終顯示大字 currentDiceNumber） |
| EC-01：骰子全同號 | `features/README.md` | 不影響架構，語音照常播 1-6，App 不參與骰子狀態 |
| EC-02：大盜忘偷奶酪 | `features/README.md` | `ResultSelector` 提供「重新夜晚」選項，呼叫 `skipCurrentPhase` 回到 night |
| EC-04：玩家離桌 | `features/README.md` | `pause()` / `resume()` 全系統暫停 |
| EC-05：電量不足 | `features/README.md` | `GameSetupView` 顯示 `navigator.getBattery()` 警告（< 20%） |
| 暫停超過 10 分鐘 | US-05 AC | `useCheeseThiefGame` 設定 10 分鐘 timeout，觸發確認 dialog |
| localStorage 空間不足 | US-08 EC | `saveRecord` catch `StorageError`，提示清理舊記錄 |
| 記錄超過 200 筆 | US-08 EC | `useGameHistory.saveRecord` 自動刪除最舊一筆 |

---

## 品質標準對應

| 需求來源 | 指標 | 架構保證 |
|---------|------|---------|
| 成功指標 | 語音播放成功率 > 99% | `useTts` 三段 Fallback |
| 成功指標 | 離線可用率 100% | Workbox precache 全量 |
| 成功指標 | 首次載入 < 3 秒 | 音效 mp3 壓縮 < 800KB，lazy route import |
| 成功指標 | 夜晚計時誤差 < 0.5 秒 | `setInterval(1000)` 精度，5 秒等待不依賴 TTS 完成時間 |
| US-05 | 暫停按鈕 64x64px | `PauseOverlay.vue` CSS 規範 |
| US-06 | 設定持久化 | `settingsStore` localStorage watch |
| CT-HOST-07 | 日夜切換 800ms | `transitions.css` |
| PR 規範 | `vue-tsc`, `eslint`, `vitest` 通過 | `tech-stack.md` CI 流程 |

---

*文檔產出：Code Architect — 2026-03-10*
