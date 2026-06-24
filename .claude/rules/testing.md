# Testing Rules

> **Last Updated**: 2026-03-10
> **Status**: Active
> **Coverage Target**: 80% (Critical paths: 100%)
> **Testing Framework**: Vitest + Vue Test Utils

---

## 1. TDD 工作流程

### 1.1 Red-Green-Refactor 循環

```
┌─────────────────┐
│ 1. Write Test   │ <--- 先寫測試 (Red)
│    (Failing)    │
└────────┬────────┘
         v
┌─────────────────┐
│ 2. Write Code   │ <--- 實作功能 (Green)
│    (Passing)    │
└────────┬────────┘
         v
┌─────────────────┐
│ 3. Refactor     │ <--- 重構優化
│    (Clean)      │
└────────┬────────┘
         │
         v
      Repeat
```

### 1.2 測試先行原則

**CRITICAL**: 對於核心業務邏輯，必須先寫測試

```typescript
// 1. 先定義預期行為
import { describe, it, expect, beforeEach } from 'vitest'
import { useWerewolfGame } from '../composables/useWerewolfGame'

describe('useWerewolfGame', () => {
  it('should assign roles to all players', () => {
    // Given
    const players = ['Alice', 'Bob', 'Charlie', 'Dave']
    const { assignRoles, playerRoles } = useWerewolfGame()

    // When
    assignRoles(players, { werewolves: 1, seer: 1, witch: 1 })

    // Then
    expect(playerRoles.value).toHaveLength(4)
    expect(playerRoles.value.filter(p => p.role === 'werewolf')).toHaveLength(1)
  })
})

// 2. 再實作功能
```

---

## 2. 測試金字塔

```
           /\
          /  \
         / E2E\        10% - End-to-End Tests (Playwright)
        /______\
       /        \
      /Component \     20% - Component Tests (Vue Test Utils)
     /____________\
    /              \
   /     Unit       \  70% - Unit Tests (Vitest)
  /__________________\
```

### 2.1 Unit Tests (70%)

測試 Composables、Stores、工具函數:

```typescript
// src/composables/__tests__/useTTS.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTTS } from '../useTTS'

// Mock Web Speech API
const mockSpeak = vi.fn()
const mockCancel = vi.fn()

Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: mockSpeak,
    cancel: mockCancel,
    speaking: false,
  },
})

describe('useTTS', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call speechSynthesis.speak with correct parameters', () => {
    const { speak } = useTTS()

    speak('天黑請閉眼', 'zh-TW')

    expect(mockSpeak).toHaveBeenCalledOnce()
    const utterance = mockSpeak.mock.calls[0][0]
    expect(utterance.text).toBe('天黑請閉眼')
    expect(utterance.lang).toBe('zh-TW')
  })

  it('should set isSpeaking to true during playback', () => {
    const { speak, isSpeaking } = useTTS()

    speak('測試')

    // Simulate onstart callback
    const utterance = mockSpeak.mock.calls[0][0]
    utterance.onstart()

    expect(isSpeaking.value).toBe(true)
  })

  it('should cancel speech on stop', () => {
    const { stop } = useTTS()

    stop()

    expect(mockCancel).toHaveBeenCalledOnce()
  })
})
```

### 2.2 Component Tests (20%)

測試 Vue 元件的渲染和交互:

```typescript
// src/features/werewolf/components/__tests__/RoleCard.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RoleCard from '../RoleCard.vue'
import type { Player } from '@/types/game'

describe('RoleCard', () => {
  const mockPlayer: Player = {
    id: '1',
    name: 'Alice',
    role: 'werewolf',
    isAlive: true,
  }

  it('displays player name', () => {
    const wrapper = mount(RoleCard, {
      props: { player: mockPlayer, isRevealed: false },
    })

    expect(wrapper.text()).toContain('Alice')
  })

  it('hides role when not revealed', () => {
    const wrapper = mount(RoleCard, {
      props: { player: mockPlayer, isRevealed: false },
    })

    expect(wrapper.text()).not.toContain('werewolf')
  })

  it('shows role when revealed', () => {
    const wrapper = mount(RoleCard, {
      props: { player: mockPlayer, isRevealed: true },
    })

    expect(wrapper.text()).toContain('werewolf')
  })

  it('emits select event when clicked', async () => {
    const wrapper = mount(RoleCard, {
      props: { player: mockPlayer, isRevealed: false },
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual(['1'])
  })
})
```

### 2.3 E2E Tests (10%)

測試完整的使用者流程 (使用 Playwright):

```typescript
// e2e/game-flow.test.ts
import { test, expect } from '@playwright/test'

test('User can start a werewolf game', async ({ page }) => {
  await page.goto('/')

  // Select game template
  await page.click('text=狼人殺')

  // Add players
  await page.fill('[data-testid="player-input"]', 'Alice')
  await page.click('[data-testid="add-player"]')
  await page.fill('[data-testid="player-input"]', 'Bob')
  await page.click('[data-testid="add-player"]')
  // ... add more players

  // Start game
  await page.click('[data-testid="start-game"]')

  // Verify game started
  await expect(page.locator('[data-testid="game-phase"]')).toBeVisible()
  await expect(page.locator('[data-testid="game-phase"]')).toContainText('夜晚')
})
```

---

## 3. 測試檔案結構

```
src/
├── composables/
│   ├── __tests__/
│   │   ├── useTTS.test.ts
│   │   ├── useTimer.test.ts
│   │   └── useAudio.test.ts
│   ├── useTTS.ts
│   ├── useTimer.ts
│   └── useAudio.ts
├── stores/
│   ├── __tests__/
│   │   ├── game.test.ts
│   │   └── template.test.ts
│   ├── game.ts
│   └── template.ts
├── features/
│   └── werewolf/
│       ├── components/
│       │   ├── __tests__/
│       │   │   └── RoleCard.test.ts
│       │   └── RoleCard.vue
│       ├── composables/
│       │   ├── __tests__/
│       │   │   └── useWerewolfGame.test.ts
│       │   └── useWerewolfGame.ts
│       └── ...
├── utils/
│   ├── __tests__/
│   │   ├── shuffle.test.ts
│   │   └── logger.test.ts
│   └── ...
├── __tests__/
│   └── fixtures/           # 共享測試資料
│       ├── game-templates.ts
│       └── players.ts
e2e/                        # E2E 測試
├── game-flow.test.ts
└── pwa-offline.test.ts
```

---

## 4. Mock 與 Fixture 規範

### 4.1 Mock Web API

```typescript
// src/__tests__/mocks/speech-synthesis.ts
import { vi } from 'vitest'

export function mockSpeechSynthesis() {
  const speak = vi.fn()
  const cancel = vi.fn()
  const getVoices = vi.fn(() => [
    { lang: 'zh-TW', name: 'Chinese Taiwan' },
    { lang: 'zh-CN', name: 'Chinese China' },
  ])

  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak, cancel, getVoices, speaking: false },
    writable: true,
  })

  return { speak, cancel, getVoices }
}
```

### 4.2 Test Fixtures

```typescript
// src/__tests__/fixtures/game-templates.ts
import type { GameTemplate } from '@/types/game'

export const werewolfTemplate: GameTemplate = {
  id: 'werewolf-basic',
  name: '狼人殺 (基本)',
  description: '經典狼人殺',
  minPlayers: 6,
  maxPlayers: 12,
  roles: [
    { id: 'werewolf', name: '狼人', faction: 'evil', description: '每晚可殺一人' },
    { id: 'villager', name: '村民', faction: 'good', description: '普通村民' },
    { id: 'seer', name: '預言家', faction: 'good', description: '每晚可查驗一人身份' },
  ],
  phases: [
    { id: 'night-1', type: 'night', name: '第一個夜晚', script: '天黑請閉眼' },
    { id: 'day-1', type: 'day', name: '第一個白天', duration: 300, script: '天亮請睜眼' },
  ],
  scripts: [],
}

export const testPlayers = [
  { id: '1', name: 'Alice', role: 'werewolf', isAlive: true },
  { id: '2', name: 'Bob', role: 'seer', isAlive: true },
  { id: '3', name: 'Charlie', role: 'villager', isAlive: true },
]
```

### 4.3 Pinia Store 測試

```typescript
// src/stores/__tests__/game.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '../game'
import { werewolfTemplate, testPlayers } from '@/__tests__/fixtures/game-templates'

describe('useGameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should start game with template and players', () => {
    const store = useGameStore()

    store.startGame(werewolfTemplate, testPlayers)

    expect(store.gameState).toBe('playing')
    expect(store.players).toHaveLength(3)
    expect(store.currentTemplate).toEqual(werewolfTemplate)
  })

  it('should advance to next phase', () => {
    const store = useGameStore()
    store.startGame(werewolfTemplate, testPlayers)

    store.nextPhase()

    expect(store.currentPhaseIndex).toBe(1)
  })

  it('should reset game', () => {
    const store = useGameStore()
    store.startGame(werewolfTemplate, testPlayers)

    store.resetGame()

    expect(store.gameState).toBe('idle')
    expect(store.players).toHaveLength(0)
    expect(store.currentTemplate).toBeNull()
  })
})
```

---

## 5. Vitest 配置

### 5.1 vitest.config.ts

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/*.d.ts',
        'src/main.ts',
        'src/sw.ts',
      ],
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

### 5.2 測試設定檔

```typescript
// src/__tests__/setup.ts
import { vi } from 'vitest'

// Mock IndexedDB (Dexie)
vi.mock('dexie', () => {
  return {
    default: class MockDexie {
      version() { return this }
      stores() { return this }
    },
  }
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})
```

---

## 6. 測試命名規範

### 6.1 Describe-It Pattern

```typescript
describe('useTimer', () => {
  describe('start', () => {
    it('should start countdown from given seconds', () => {})
    it('should emit onComplete when timer reaches zero', () => {})
    it('should not start if already running', () => {})
  })

  describe('pause', () => {
    it('should pause running timer', () => {})
    it('should preserve remaining time when paused', () => {})
  })

  describe('reset', () => {
    it('should reset timer to initial value', () => {})
    it('should stop running timer on reset', () => {})
  })
})
```

### 6.2 命名格式

```
should [expected behavior] when [condition]
```

範例:
- `should assign all roles when game starts`
- `should speak night script when entering night phase`
- `should save game history when game ends`

---

## 7. 覆蓋率要求

| 層級 | 覆蓋率目標 | 說明 |
|------|-----------|------|
| Composables (核心邏輯) | 100% | TTS、計時器、遊戲流程必須完整測試 |
| Stores (狀態管理) | 90% | Pinia Store 高覆蓋 |
| Utils (工具函數) | 90% | 洗牌、角色分配等 |
| Components (Vue 元件) | 60% | UI 元件 |
| E2E (完整流程) | 關鍵路徑 | 主要遊戲流程 |

### 7.1 檢查覆蓋率

```bash
# 執行測試並生成覆蓋率報告
npx vitest run --coverage

# 報告會生成在 coverage/ 目錄
# 開啟 coverage/index.html 查看詳細報告
```

---

## 8. CI/CD 整合

### 8.1 GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx vue-tsc --noEmit

      - name: Run tests
        run: npx vitest run --coverage

      - name: Check coverage
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi
```

---

## 9. 測試優先事項

### 9.1 必須測試

- [ ] 遊戲流程邏輯（角色分配、階段流轉）
- [ ] TTS 語音播報（正確調用 Web Speech API）
- [ ] 計時器邏輯（倒數、暫停、重置）
- [ ] IndexedDB 資料持久化
- [ ] 遊戲模板載入與解析
- [ ] 錯誤處理路徑

### 9.2 建議測試

- [ ] 所有 Composables
- [ ] 所有 Pinia Stores
- [ ] 關鍵 UI 元件交互
- [ ] PWA 離線功能

### 9.3 可選測試

- [ ] 純展示型元件
- [ ] CSS 動畫
- [ ] 常數定義

---

## Checklist

- [ ] 核心 Composable 有 100% 測試覆蓋
- [ ] 每個 PR 包含相關測試
- [ ] 測試可以獨立運行（無外部依賴）
- [ ] Mock 正確使用（Web Speech API、IndexedDB）
- [ ] CI 自動執行測試
- [ ] 覆蓋率不低於 80%
