# Dev Team (開發組) - BoardGame Voice Host

## 專案背景
桌遊語音主持人是一款**純離線 H5 PWA 應用**，為桌遊（如狼人殺、阿瓦隆等）提供 AI 語音主持功能。使用 Vue 3 + Vite + TypeScript 開發，透過 Web Speech API 實現語音播報，IndexedDB 實現本地資料持久化，無後端依賴。

## 角色定位
負責技術架構設計、前端模組開發與程式碼品質。

## 團隊成員

### @agent-code-architect (首席架構師)
**職責**:
- 規劃 Vue 3 Composition API 模組化架構
- 設計 Pinia Store 結構與資料流
- 規劃 PWA 離線策略與 Service Worker
- 設計 Web Speech API 整合架構
- 進行程式碼審查與技術決策

**輸出產物**:
- 架構設計文檔
- TypeScript 介面定義
- 資料流圖
- 技術選型建議

**BoardGame 架構重點**:
- 遊戲狀態機 (GameStateMachine) 架構
- PWA 完全離線運作
- Web Speech API 語音播放管線
- IndexedDB (Dexie.js) 資料層設計
- Pinia Store 模組化設計

### @agent-h5-developer (首席開發者)
**職責**:
- **主力開發角色** — 負責全部 H5 PWA 功能實作
- 使用 Vue 3 Composition API 開發所有頁面與元件
- 使用 Pinia 管理遊戲狀態
- 整合 Web Speech API 實現語音主持
- 使用 Dexie.js 操作 IndexedDB 實現離線資料持久化
- PWA Service Worker 配置與離線快取策略
- 響應式佈局與多設備適配
- CSS3 動畫與遊戲沉浸感設計

**輸出產物**:
- Vue 3 頁面與元件程式碼
- Pinia Store 定義
- Web Speech API 整合程式碼
- IndexedDB 資料層程式碼
- PWA 配置 (Manifest + Service Worker)
- Lighthouse 效能報告

**BoardGame H5 頁面**:
- 遊戲大廳頁（遊戲模板選擇）
- 玩家登記頁（輸入玩家名稱、座位號）
- 角色揭示頁（單設備傳閱查看角色）
- 遊戲進行頁（階段顯示、語音播放、計時器）
- 投票頁（淘汰投票）
- 結算頁（勝負結果、角色揭曉）
- 遊戲歷史頁（本地歷史記錄）

### @agent-mobile-developer (Flutter 開發 — 輔助角色)
**狀態**: 輔助角色，未來若需 Flutter 原生版本時啟用
**說明**: 目前主平台為 H5 PWA，Flutter 版本列為未來規劃。若需啟用，請參考原始 mobile-developer.md 配置。

---

## 工作流程

```
產品組 README.md → Code Architect → H5 Developer
                        │                │
                        ▼                ▼
                   架構設計         Vue 3 PWA 實作
                   Store 設計       Web Speech API
                   離線策略         IndexedDB 資料層
                   介面定義         元件開發
                        │                │
                        └────────────────┘
                                │
                                ▼
                   Feature 程式碼 (開發組產出)
```

---

## 調用方式

```
請開發組實作 BoardGame Voice Host 的 [功能名稱]：

1. Code Architect：
   - 設計功能模組的 Vue 3 架構
   - 定義 TypeScript 介面與 Pinia Store

2. H5 Developer：
   - 實作 Vue 3 頁面與元件
   - 整合 Web Speech API 語音主持
   - 使用 IndexedDB 持久化資料
   - 確保 PWA 離線可用
```

---

## 技術棧

| 層級 | 技術 | 說明 |
|------|------|------|
| 框架 | Vue 3 (Composition API) | SFC + script setup |
| 建構 | Vite 6 | 快速開發與建構 |
| 語言 | TypeScript (strict) | 型別安全 |
| 狀態管理 | Pinia | 響應式狀態 + 遊戲狀態機 |
| 路由 | Vue Router 4 | SPA 路由 |
| 本地儲存 | IndexedDB (Dexie.js) | 遊戲模板、場次、歷史記錄 |
| 語音 | Web Speech API | 瀏覽器內建 TTS 語音播報 |
| CSS | TailwindCSS / UnoCSS | 原子化 CSS |
| PWA | Workbox + vite-plugin-pwa | 離線安裝 |
| 後端 | 無 | 純前端離線應用 |

---

## 程式碼規範

### Vue 3 + TypeScript 規範
```typescript
// ✅ 正確：使用 Composition API + script setup
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameSessionStore } from '@/stores/gameSession'
import type { GameSession } from '@/types/game'

const store = useGameSessionStore()
const currentPhase = computed(() => store.currentPhase)
</script>

// ✅ 正確：明確型別，禁止 any
const sessions: GameSession[] = []

// ✅ 正確：Pinia Store 定義
export const useGameSessionStore = defineStore('gameSession', () => {
  const session = ref<GameSession | null>(null)
  const currentPhase = computed(() => session.value?.currentPhaseId)

  async function startGame(templateId: string) {
    // ...
  }

  return { session, currentPhase, startGame }
})

// ✅ 正確：遊戲階段判斷
const currentPhaseName = computed(() => {
  const phase = template.value?.phases[session.value?.currentPhaseIndex ?? 0]
  return phase?.displayName ?? ''
})
```

### IndexedDB (Dexie.js) 規範
```typescript
// ✅ 正確：Dexie 資料庫定義
import Dexie, { type Table } from 'dexie'

export class GameDatabase extends Dexie {
  gameTemplates!: Table<GameTemplate>
  gameSessions!: Table<GameSession>
  players!: Table<Player>
  voiceScripts!: Table<VoiceScript>
  gameHistory!: Table<GameHistory>

  constructor() {
    super('BoardGameHostDB')
    this.version(1).stores({
      gameTemplates: 'id, name, gameType',
      gameSessions: 'id, templateId, status, createdAt',
      players: 'id, sessionId, seatNumber',
      voiceScripts: 'id, phaseId, orderIndex',
      gameHistory: 'id, templateId, createdAt',
    })
  }
}

export const db = new GameDatabase()
```

---

## BoardGame 特定架構

### Vue 3 模組化結構
```
src/
├── components/               # 共用元件
│   ├── ui/                   # 基礎 UI 元件
│   │   ├── GameTimer.vue
│   │   ├── PlayerAvatar.vue
│   │   ├── PhaseIndicator.vue
│   │   └── Button.vue
│   └── business/             # 業務元件
│       ├── PlayerSeatGrid.vue
│       ├── RoleCard.vue
│       ├── VotePlayerCard.vue
│       └── NarrationPlayer.vue
├── composables/              # 組合式函數
│   ├── useGameStateMachine.ts
│   ├── useSpeechSynthesis.ts
│   ├── useGameTimer.ts
│   └── useRoleAssigner.ts
├── views/                    # 頁面
│   ├── LobbyView.vue
│   ├── PlayerSetupView.vue
│   ├── RoleRevealView.vue
│   ├── GamePlayView.vue
│   ├── VotingView.vue
│   ├── ResultView.vue
│   └── HistoryView.vue
├── stores/                   # Pinia 狀態管理
│   ├── gameSession.ts
│   ├── gameTemplate.ts
│   ├── voicePlayback.ts
│   └── gameHistory.ts
├── db/                       # IndexedDB 資料層
│   ├── database.ts           # Dexie 定義
│   ├── seedData.ts           # 預設遊戲模板種子資料
│   └── migrations.ts         # 資料庫版本遷移
├── types/                    # TypeScript 型別定義
│   ├── game.ts
│   ├── player.ts
│   ├── role.ts
│   ├── voiceScript.ts
│   └── gamePhase.ts
├── utils/                    # 工具函數
│   ├── roleAssigner.ts
│   ├── gameStateMachine.ts
│   └── timerUtils.ts
├── router/
│   └── index.ts
├── styles/
│   └── theme.css
├── App.vue
├── main.ts
└── sw.ts                     # Service Worker
```

### 核心 TypeScript 介面
```typescript
// types/game.ts
export interface GameTemplate {
  id: string
  name: string              // 狼人殺、阿瓦隆...
  description: string
  minPlayers: number
  maxPlayers: number
  phases: GamePhase[]
  availableRoles: Role[]
  coverImage?: string
}

export interface GameSession {
  id: string
  templateId: string
  status: 'setup' | 'playing' | 'finished'
  currentPhaseIndex: number
  currentRound: number
  createdAt: Date
}

export interface Player {
  id: string
  sessionId: string
  displayName: string
  seatNumber: number
  isAlive: boolean
  roleId?: string           // 分配的角色
}

export interface Role {
  id: string
  templateId: string
  name: string              // 狼人、預言家、村民...
  faction: 'wolf' | 'villager' | 'neutral'
  description: string
  nightAction?: string
  count: number
}

export interface VoiceScript {
  id: string
  phaseId: string
  content: string           // 旁白文字 (Web Speech API 播報)
  orderIndex: number
}

export interface GamePhase {
  id: string
  templateId: string
  name: string              // night, day, voting, result
  displayName: string       // 夜晚、白天、投票、結算
  orderIndex: number
  durationSeconds?: number
}
```

---

## 交付標準

開發組完成後，必須確保：

1. **程式碼品質**:
   - [ ] `npm run lint` 無錯誤
   - [ ] TypeScript strict 模式無型別錯誤
   - [ ] 無 `any` 型別

2. **架構合規**:
   - [ ] Vue 3 Composition API 模組化架構
   - [ ] Pinia Store 正確定義
   - [ ] TypeScript 介面定義完整

3. **離線支援**:
   - [ ] PWA 安裝後完全離線可用
   - [ ] IndexedDB 資料持久化正確
   - [ ] Service Worker 快取策略合理
   - [ ] Web Speech API 離線可用

4. **單設備使用場景**:
   - [ ] 單設備傳閱查看角色流程順暢
   - [ ] 放桌上當主持人的 UI 適配
   - [ ] 語音播報清晰可聞
