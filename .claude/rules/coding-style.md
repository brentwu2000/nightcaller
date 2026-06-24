# Coding Style Rules

> **Last Updated**: 2026-03-10
> **Status**: Active
> **Scope**: Vue 3 (TypeScript) + H5 PWA

---

## 1. 型別安全 (Type Safety)

### 1.1 零 Any 政策

**CRITICAL**: 全程型別安全，禁止使用 `any`

```typescript
// ❌ NEVER USE
let data: any;
function process(input: any): any { ... }

// ✅ ALWAYS USE TYPED
interface GameTemplate {
  id: string
  name: string
  roles: Role[]
  phases: GamePhase[]
}

const template: GameTemplate = loadTemplate('werewolf')
```

### 1.2 TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 1.3 型別定義檔案

所有共享型別集中管理：

```typescript
// src/types/game.ts
export interface GameTemplate {
  id: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number
  roles: Role[]
  phases: GamePhase[]
  scripts: VoiceScript[]
}

export interface Role {
  id: string
  name: string
  faction: 'good' | 'evil' | 'neutral'
  description: string
  nightAction?: NightAction
}

export interface GamePhase {
  id: string
  type: 'night' | 'day' | 'vote' | 'special'
  name: string
  duration?: number  // seconds
  script: string     // TTS 語音腳本
}
```

---

## 2. 架構模式 (Architecture Patterns)

### 2.1 Feature-Based 目錄結構

```
src/features/{feature_name}/
├── components/           # 功能專屬 Vue 元件
│   ├── {Name}Card.vue
│   └── {Name}List.vue
├── composables/          # 功能專屬 Composables
│   └── use{Name}.ts
├── types.ts              # 功能專屬型別
├── constants.ts          # 功能專屬常數
├── index.vue             # 功能入口頁面
└── README.md             # 功能文檔 (REQUIRED)
```

### 2.2 Feature README 必須包含

每個 Feature 目錄必須有 `README.md`，作為唯一真理來源:

1. **用戶故事 (User Stories)**
2. **UI Task 清單**
3. **資料結構定義**
4. **遊戲流程說明**
5. **測試驗收標準**

---

## 3. 狀態管理 (Pinia)

### 3.1 Store 定義規範

使用 Composition API 風格 (Setup Stores):

```typescript
// src/stores/game.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameTemplate, GameState, Player } from '@/types/game'

export const useGameStore = defineStore('game', () => {
  // State
  const currentTemplate = ref<GameTemplate | null>(null)
  const players = ref<Player[]>([])
  const gameState = ref<GameState>('idle')
  const currentPhaseIndex = ref(0)

  // Getters
  const currentPhase = computed(() => {
    if (!currentTemplate.value) return null
    return currentTemplate.value.phases[currentPhaseIndex.value]
  })

  const isGameActive = computed(() =>
    gameState.value === 'playing' || gameState.value === 'paused'
  )

  // Actions
  function startGame(template: GameTemplate, playerList: Player[]) {
    currentTemplate.value = template
    players.value = playerList
    gameState.value = 'playing'
    currentPhaseIndex.value = 0
  }

  function nextPhase() {
    if (!currentTemplate.value) return
    if (currentPhaseIndex.value < currentTemplate.value.phases.length - 1) {
      currentPhaseIndex.value++
    }
  }

  function resetGame() {
    currentTemplate.value = null
    players.value = []
    gameState.value = 'idle'
    currentPhaseIndex.value = 0
  }

  return {
    currentTemplate,
    players,
    gameState,
    currentPhaseIndex,
    currentPhase,
    isGameActive,
    startGame,
    nextPhase,
    resetGame,
  }
})
```

### 3.2 Store 命名規範

```typescript
// 檔案名: kebab-case
// src/stores/game-template.ts

// Store 名稱: camelCase
export const useGameTemplateStore = defineStore('gameTemplate', () => { ... })

// 使用時:
const gameTemplateStore = useGameTemplateStore()
```

---

## 4. Vue 元件規範

### 4.1 Composition API (必須)

```vue
<!-- ✅ 正確寫法 -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Player } from '@/types/game'

// Props
const props = defineProps<{
  player: Player
  isActive: boolean
}>()

// Emits
const emit = defineEmits<{
  select: [playerId: string]
  eliminate: [playerId: string]
}>()

// Reactive state
const isRevealed = ref(false)

// Computed
const displayName = computed(() =>
  props.isActive ? props.player.name : `${props.player.name} (Out)`
)

// Methods
function handleSelect() {
  emit('select', props.player.id)
}
</script>

<template>
  <div
    class="player-card"
    :class="{ 'player-card--active': isActive }"
    @click="handleSelect"
  >
    <span class="player-card__name">{{ displayName }}</span>
  </div>
</template>

<style scoped lang="scss">
.player-card {
  padding: var(--spacing-md);
  border-radius: var(--radius-md);

  &--active {
    border-color: var(--color-primary);
  }

  &__name {
    font-size: var(--font-size-md);
  }
}
</style>
```

### 4.2 Composables 規範

```typescript
// src/composables/useTTS.ts
import { ref, onUnmounted } from 'vue'

export function useTTS() {
  const isSpeaking = ref(false)
  const synthesis = window.speechSynthesis

  function speak(text: string, lang = 'zh-TW'): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.9

      utterance.onstart = () => { isSpeaking.value = true }
      utterance.onend = () => {
        isSpeaking.value = false
        resolve()
      }
      utterance.onerror = (event) => {
        isSpeaking.value = false
        reject(new Error(`TTS Error: ${event.error}`))
      }

      synthesis.speak(utterance)
    })
  }

  function stop() {
    synthesis.cancel()
    isSpeaking.value = false
  }

  onUnmounted(() => {
    stop()
  })

  return {
    isSpeaking,
    speak,
    stop,
  }
}
```

---

## 5. CSS / SCSS 規範

### 5.1 BEM 命名 + Scoped Styles

```scss
// 使用 BEM 命名法
.block {}
.block__element {}
.block--modifier {}

// 範例:
.game-board {}
.game-board__phase-indicator {}
.game-board--night-mode {}
```

### 5.2 CSS 變數（Design Tokens）

```scss
// src/styles/variables.scss
:root {
  // 色彩
  --color-primary: #5b6abf;
  --color-primary-light: #7b88d0;
  --color-primary-dark: #3d4a9e;
  --color-background: #f5f5f5;
  --color-surface: #ffffff;
  --color-text-main: #2c3e50;
  --color-text-muted: #8e99a4;
  --color-success: #67c23a;
  --color-warning: #e6a23c;
  --color-error: #f56c6c;
  --color-info: #409eff;

  // 間距
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-xxl: 32px;

  // 圓角
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 999px;

  // 字體大小
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-md: 16px;
  --font-size-lg: 20px;
  --font-size-xl: 24px;

  // 陰影
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

// 深色模式
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1a1a2e;
    --color-surface: #16213e;
    --color-text-main: #e0e0e0;
    --color-text-muted: #8e99a4;
  }
}
```

**必須遵守**：
- WCAG AA 對比度標準（文字 4.5:1，UI 元件 3:1）
- 支援深色模式（透過 CSS 變數切換）
- 語義色保持一致性

### 5.3 響應式設計

```scss
// 使用 vw/vh 適配，透過 PostCSS px-to-viewport 自動轉換
// 設計稿基準: 375px 寬度

// 禁止硬編碼 px 寬度用於佈局
// ❌ width: 300px;
// ✅ width: 80vw; 或交由 PostCSS 自動轉換
```

---

## 6. 命名規範

### 6.1 TypeScript 命名

| 類型 | 規範 | 範例 |
|------|------|------|
| Interface/Type | PascalCase | `GameTemplate`, `PlayerState` |
| 變數/函數 | camelCase | `playerList`, `startGame()` |
| 常數 | UPPER_SNAKE_CASE | `MAX_PLAYERS`, `DEFAULT_TIMER` |
| 檔案 | kebab-case | `game-template.ts`, `use-timer.ts` |
| Vue 元件檔案 | PascalCase | `PlayerCard.vue`, `GameBoard.vue` |
| Composable | camelCase (use 前綴) | `useTTS.ts`, `useTimer.ts` |
| Store | camelCase (use 前綴) | `useGameStore` |
| Enum | PascalCase | `GamePhaseType`, `PlayerRole` |

### 6.2 Vue 模板命名

```html
<!-- 元件使用 PascalCase -->
<PlayerCard :player="player" />

<!-- 事件使用 kebab-case -->
<PlayerCard @player-select="handleSelect" />

<!-- Props 使用 camelCase（模板中自動轉 kebab-case） -->
<GameTimer :countDown="60" :autoStart="true" />
```

---

## 7. 錯誤處理

### 7.1 自訂錯誤類別

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class TTSError extends AppError {
  constructor(message = 'TTS playback failed') {
    super(message, 'TTS_ERROR')
  }
}

export class StorageError extends AppError {
  constructor(message = 'Local storage operation failed') {
    super(message, 'STORAGE_ERROR')
  }
}

export class GameLogicError extends AppError {
  constructor(message: string) {
    super(message, 'GAME_LOGIC_ERROR')
  }
}
```

### 7.2 統一錯誤處理

```typescript
// src/utils/logger.ts
const isDev = import.meta.env.DEV

export const logger = {
  info(message: string, ...args: unknown[]) {
    if (isDev) console.info(`[INFO] ${message}`, ...args)
  },
  warn(message: string, ...args: unknown[]) {
    if (isDev) console.warn(`[WARN] ${message}`, ...args)
  },
  error(message: string, error?: unknown) {
    console.error(`[ERROR] ${message}`, error)
  },
}
```

---

## 8. 禁止事項

### 8.1 Vue / TypeScript

- ❌ 使用 `any` 類型
- ❌ 使用 `console.log()` (使用 `logger`)
- ❌ 使用 Options API
- ❌ 硬編碼字串 (使用常數或 i18n)
- ❌ 巨型元件 (超過 200 行 `<script>` 應拆分)
- ❌ 在模板中使用複雜邏輯（抽取到 computed）
- ❌ 使用 `var` 宣告變數
- ❌ 非型別安全的 `$emit`

### 8.2 CSS

- ❌ 使用行內樣式 (`style=""`)（除非動態綁定必要）
- ❌ 使用 `!important`（除非覆蓋第三方樣式）
- ❌ 使用 ID 選擇器做樣式
- ❌ 巢狀超過 3 層

---

## Checklist

- [ ] 所有型別明確定義，無 `any`
- [ ] 使用 Composition API + `<script setup>`
- [ ] Store 使用 Setup Store 風格
- [ ] CSS 使用 BEM + CSS 變數
- [ ] 元件遵循單一職責（< 200 行）
- [ ] 錯誤使用自訂 Error 類別
- [ ] 沒有使用 `console.log`
- [ ] 響應式適配正確
