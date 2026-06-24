# Test Team (測試組) - BoardGame Voice Host (桌遊語音主持人)

## 專案背景
BoardGame Voice Host 是一款桌遊語音主持人 H5 PWA，支援狼人殺、阿瓦隆等桌遊的離線語音主持，使用 Vue 3 + TypeScript + Pinia 開發，無後端依賴。

## 角色定位
負責測試規劃、自動化測試、品質驗證與持續整合。

## 團隊成員

### @agent-test-generator (測試分析師)
**職責**:
- 分析需求產出測試案例
- 撰寫 `test_task.md` 測試規範
- 定義測試邊界與覆蓋率目標
- 識別關鍵測試場景

**輸出產物**:
- test_task.md 測試規範
- 測試案例矩陣
- 邊界條件清單
- 測試優先級排序

**BoardGame Voice Host 測試重點**:
- 遊戲狀態機轉換正確性
- 角色分配隨機性與公平性
- Web Speech API 語音播放時序與排程
- 計時器精度與暫停/恢復
- PWA 離線功能
- IndexedDB 資料持久化

### @agent-test-engineer (測試工程師)
**職責**:
- 設計測試策略與金字塔
- 建立 Vitest + Vue Test Utils 自動化測試框架
- 整合 CI/CD 測試流程
- 分析測試覆蓋率

**輸出產物**:
- 測試策略文檔
- CI/CD 配置
- 覆蓋率報告
- 測試環境設定

### @agent-test-runner (測試執行者)
**職責**:
- 執行自動化測試 (`npm test` / `vitest run`)
- 分析測試失敗原因
- 診斷錯誤根因
- 提供修復建議

**輸出產物**:
- 測試執行報告
- 失敗分析
- 修復建議
- 回歸測試結果

---

## 工作流程

```
開發組程式碼 → Test Generator → Test Engineer → Test Runner
                    │                │               │
                    ▼                ▼               ▼
              測試案例設計      自動化測試實作    測試執行驗證
              test_task.md     Vitest Tests      執行報告
              邊界條件         Vue Test Utils    失敗分析
                    │                │               │
                    └────────────────┴───────────────┘
                                     │
                                     ▼
                         品質報告 (測試組產出)
```

---

## 調用方式

```
請測試組驗證 BoardGame Voice Host 的 [功能名稱]：

1. Test Generator：
   - 分析功能 README.md
   - 產出測試案例清單
   - 定義遊戲狀態機的邊界條件

2. Test Engineer：
   - 建立 Vitest 單元測試
   - 建立 Vue Test Utils 元件測試
   - 設計 Composable / Store Mock
   - 整合 CI 測試流程

3. Test Runner：
   - 執行 npm test (vitest run)
   - 分析失敗測試
   - 提供修復建議
```

---

## 測試金字塔

```
                    ┌─────────┐
                    │  E2E    │  10%  - 完整用戶流程
                    │  Tests  │        (Playwright)
                    ├─────────┤
                    │Component│  30%  - Vue 元件測試
                    │  Tests  │        (Vue Test Utils)
                    ├─────────┤
                    │  Unit   │  60%  - 業務邏輯測試
                    │  Tests  │        (Vitest)
                    └─────────┘
```

---

## BoardGame Voice Host 測試案例範本

### test_task.md 格式
```markdown
# BoardGame Voice Host 測試規範 - [功能名稱]

## 單元測試 (Unit Tests) — Vitest

### GameSessionStore (Pinia)
- [ ] `createSession()` - 成功建立新的遊戲場次
- [ ] `createSession()` - 玩家人數不足時應拋出異常
- [ ] `startGame()` - 成功開始遊戲
- [ ] `startGame()` - 角色未分配時不可開始
- [ ] `endGame()` - 成功結束場次並記錄結果到 IndexedDB

### useGameStateMachine (Composable)
- [ ] `transition()` - 從角色分配正確轉換到夜晚階段
- [ ] `transition()` - 從投票階段正確轉換到夜晚或遊戲結束
- [ ] `transition()` - 非法轉換應拋出 InvalidPhaseTransitionError
- [ ] `transition()` - 遊戲結束後不可再轉換

### useRoleAssigner (Composable)
- [ ] `assignRoles()` - 正確分配所有角色
- [ ] `assignRoles()` - 角色數量等於玩家數量
- [ ] `assignRoles()` - 多次分配結果不完全相同（隨機性）
- [ ] `assignRoles()` - 角色組合符合遊戲模板規則

### useGameTimer (Composable)
- [ ] `start()` - 正確開始倒數計時
- [ ] `pause()` - 暫停後剩餘時間不變
- [ ] `resume()` - 恢復後繼續倒數
- [ ] `onComplete` - 倒數結束時觸發回呼
- [ ] `reset()` - 重置計時器到初始值

### useSpeechSynthesis (Composable)
- [ ] `speak()` - 正確呼叫 Web Speech API
- [ ] `speak()` - 語音播放完成後觸發 onEnd 回呼
- [ ] `stop()` - 正確停止語音播放
- [ ] 瀏覽器不支援 Web Speech API 時的降級處理

## 元件測試 (Component Tests) — Vue Test Utils

### GamePlayView
- [ ] 顯示當前遊戲階段名稱
- [ ] 顯示倒數計時器
- [ ] 夜晚階段顯示對應 UI
- [ ] 投票階段顯示投票按鈕
- [ ] 遊戲結束顯示勝負結果

### VotingView
- [ ] 顯示所有存活玩家
- [ ] 已淘汰玩家不可被投票
- [ ] 投票完成後顯示結果
- [ ] 平票時顯示平票處理選項

### RoleRevealView
- [ ] 顯示玩家角色卡（翻牌效果）
- [ ] 角色資訊正確顯示（名稱、陣營、技能）
- [ ] 確認按鈕點擊後進入下一玩家

## 整合測試 (E2E Tests) — Playwright

### 遊戲流程
- [ ] 選擇模板 → 登記玩家 → 分配角色 → 夜晚 → 白天 → 投票 → 結算
- [ ] 狼人殺：狼人全部淘汰 → 好人陣營勝利
- [ ] 狼人殺：好人數 <= 狼人數 → 狼人陣營勝利

### PWA 離線功能
- [ ] PWA 安裝後斷網仍可正常使用
- [ ] IndexedDB 資料持久化：關閉瀏覽器後資料仍在
- [ ] Service Worker 正確快取靜態資源

### 語音播放
- [ ] 階段轉換時播放對應語音 (Web Speech API)
- [ ] 語音播放完成後才開始計時
```

---

## Vitest 測試範例

### 單元測試
```typescript
// tests/unit/composables/useGameStateMachine.test.ts
import { describe, it, expect } from 'vitest'
import { useGameStateMachine } from '@/composables/useGameStateMachine'

describe('useGameStateMachine', () => {
  it('從角色分配正確轉換到夜晚階段', () => {
    const { transition } = useGameStateMachine()
    const nextPhase = transition('roleAssignment', defaultContext())

    expect(nextPhase).toBe('nightPhase')
  })

  it('非法轉換應拋出異常', () => {
    const { transition } = useGameStateMachine()

    expect(() => transition('gameOver', defaultContext()))
      .toThrow('InvalidPhaseTransition')
  })

  it('投票後狼人數 >= 好人數則遊戲結束', () => {
    const { transition } = useGameStateMachine()
    const context = {
      alivePlayers: [
        { role: 'werewolf', isAlive: true },
        { role: 'villager', isAlive: true },
      ],
    }

    const nextPhase = transition('voting', context)
    expect(nextPhase).toBe('gameOver')
  })
})
```

### 元件測試
```typescript
// tests/components/GamePlayView.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import GamePlayView from '@/views/GamePlayView.vue'

describe('GamePlayView', () => {
  it('顯示當前遊戲階段名稱', () => {
    const wrapper = mount(GamePlayView, {
      global: {
        plugins: [
          createTestingPinia({
            initialState: {
              gameSession: {
                session: {
                  status: 'playing',
                  currentPhaseIndex: 0,
                },
                currentPhaseName: '夜晚階段',
              },
            },
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('夜晚階段')
  })

  it('遊戲結束時顯示勝負結果', () => {
    const wrapper = mount(GamePlayView, {
      global: {
        plugins: [
          createTestingPinia({
            initialState: {
              gameSession: {
                session: {
                  status: 'finished',
                  winnerFaction: 'villager',
                },
              },
            },
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('好人陣營勝利')
  })
})
```

---

## CI/CD 測試配置

### GitHub Actions 範例
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

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

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Run tests
        run: npm test -- --coverage

      - name: Check coverage
        run: |
          COVERAGE=$(npx vitest run --coverage --reporter=json 2>/dev/null | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold 80%"
            exit 1
          fi
```

---

## 交付標準

測試組完成後，必須確保：

1. **測試覆蓋率**:
   - [ ] Unit Tests 覆蓋率 > 80%
   - [ ] Component Tests 覆蓋關鍵頁面
   - [ ] 所有 Edge Cases 有對應測試

2. **測試品質**:
   - [ ] `npm test` (vitest) 全部通過
   - [ ] 無 flaky tests (不穩定測試)
   - [ ] 測試執行時間 < 1 分鐘

3. **文檔完整**:
   - [ ] test_task.md 更新完成
   - [ ] 測試案例與需求對應
   - [ ] 失敗測試有修復建議

4. **BoardGame Voice Host 特定驗證**:
   - [ ] 遊戲狀態機在各種邊界條件下轉換正確
   - [ ] 角色分配隨機性通過統計檢驗
   - [ ] 計時器暫停/恢復不會丟失時間
   - [ ] Web Speech API 語音播放完成後才觸發下一階段
   - [ ] PWA 離線功能正常運作
   - [ ] IndexedDB 資料持久化正確
