# Workflow 工作流程規範

> **強制性**: 本文件定義的流程為專案憲法，不可違背。
> **Last Updated**: 2026-03-10

## Single Source of Truth (SSOT) 原則

### 資料來源優先級

```
1. IndexedDB (Dexie.js) — 唯一持久化儲存
   ↓ 衍生
2. Pinia Store — 執行時狀態
   ↓ 衍生
3. Vue 元件 — UI 展示
```

### 資料流向

```
[IndexedDB] ←→ [Pinia Store] ←→ [Composable] → [Vue Component]
```

- 所有持久化資料存放於 IndexedDB
- Pinia Store 負責讀取/寫入 IndexedDB 並管理執行時狀態
- Composable 封裝可重用的業務邏輯
- Vue Component 只負責 UI 展示和使用者互動

## Git 工作流程

### 分支策略

```
main (生產)
  │
  ├── develop (開發整合)
  │     │
  │     ├── feature/werewolf-game
  │     ├── feature/timer-component
  │     └── fix/tts-voice-selection
  │
  └── release/v1.0.0 (發布準備)
```

### 分支命名

```
feature/  - 新功能
fix/      - 修復 bug
refactor/ - 重構
docs/     - 文檔
test/     - 測試
chore/    - 建置/設定
```

### Commit 規範

```
<type>(<scope>): <subject>

Types:
- feat:     新功能
- fix:      修復
- docs:     文檔
- style:    格式
- refactor: 重構
- test:     測試
- chore:    雜項

Scopes:
- game:     遊戲流程
- tts:      語音相關
- timer:    計時器
- template: 遊戲模板
- audio:    音效/背景音樂
- pwa:      PWA/離線
- ui:       UI 元件
- store:    狀態管理
- db:       IndexedDB

Examples:
feat(game): 新增狼人殺夜晚流程
fix(tts): 修正中文語音播報速率
docs(template): 更新遊戲模板規格
chore(pwa): 更新 Service Worker 快取策略
```

### Pull Request 流程

```
1. 從 develop 建立 feature 分支
2. 開發並提交
3. 確保通過：
   - npx vue-tsc --noEmit
   - npx eslint src/ --ext .ts,.vue
   - npx vitest run
   - npm run build
4. 建立 PR 到 develop
5. Code Review (至少 1 人)
6. Squash and Merge
```

## 開發流程

### 功能開發流程

```
1. 需求分析 (產品組)
   └── 輸出：features/{name}/README.md (User Stories, Edge Cases)

2. 架構設計 (開發組)
   └── 輸出：docs/architecture/{name}.md

3. 型別定義
   └── 輸出：src/types/{name}.ts

4. 狀態管理
   └── 輸出：src/stores/{name}.ts (Pinia Store)

5. 業務邏輯
   └── 輸出：src/composables/use{Name}.ts

6. UI 實作
   └── 輸出：src/features/{name}/ (Vue 元件)

7. 測試
   └── 輸出：src/features/{name}/__tests__/

8. 代碼審查 (Tech Lead)
   └── 輸出：審查通過 / 修改建議
```

### 開發順序

```
1. Types Layer
   └── TypeScript 型別定義

2. Store Layer
   └── Pinia Store（狀態 + IndexedDB 持久化）

3. Composable Layer
   └── 業務邏輯 Composables（TTS、計時器等）

4. Component Layer
   ├── 共享元件
   └── 功能頁面

5. Test
   ├── Unit Tests (Composables, Stores, Utils)
   ├── Component Tests (Vue 元件)
   └── E2E Tests (完整流程)
```

## 專案目錄結構

### 頂層目錄

```
boardgame-host/
├── .claude/              # Claude Code 配置
│   ├── agents/           # Agent 定義
│   ├── commands/         # Slash Commands
│   ├── rules/            # 開發規範（憲法）
│   └── skills/           # 領域知識
│
├── src/                  # H5 主應用 (Vue 3 + Vite)
│   ├── assets/           # 靜態資源（音效、圖片）
│   ├── components/       # 全域共享 Vue 元件
│   ├── composables/      # 全域共享 Composables
│   ├── features/         # 功能模組
│   ├── router/           # Vue Router
│   ├── stores/           # Pinia Stores
│   ├── styles/           # CSS/SCSS
│   ├── types/            # TypeScript 型別定義
│   ├── utils/            # 工具函數
│   ├── App.vue
│   ├── main.ts
│   └── sw.ts             # Service Worker
│
├── public/               # 公開資源
│   ├── manifest.json     # PWA Manifest
│   └── icons/            # App 圖示
│
├── appui/                # UI 設計資源
│   ├── components/       # UI 元件設計稿
│   ├── screens/          # 頁面設計稿
│   └── design_system/    # Design System
│
├── docs/                 # 專案文檔
│   ├── architecture/     # 架構設計
│   └── guides/           # 開發指南
│
├── features/             # 功能規格文檔
│   └── {feature_name}/
│       └── README.md     # 功能規格
│
├── index.html            # 入口 HTML
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── package.json          # 依賴管理
├── CLAUDE.md             # 專案入口指引
└── README.md             # 專案總覽
```

### 功能模組目錄結構

```
src/features/
└── werewolf/                 # 狼人殺遊戲
    ├── components/
    │   ├── RoleCard.vue
    │   ├── PhaseIndicator.vue
    │   └── VotePanel.vue
    ├── composables/
    │   └── useWerewolfGame.ts
    ├── types.ts
    ├── constants.ts
    ├── index.vue             # 功能入口頁面
    ├── __tests__/
    │   └── useWerewolfGame.test.ts
    └── README.md
```

## CI/CD 流程

### PR 檢查 (必須全部通過)

```yaml
# .github/workflows/pr-check.yml
name: PR Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  check:
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

      - name: Lint
        run: npx eslint src/ --ext .ts,.vue

      - name: Test
        run: npx vitest run --coverage

      - name: Build
        run: npm run build

      - name: Coverage check
        run: |
          COVERAGE=$(npx vitest run --coverage --reporter=json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80%"
            exit 1
          fi
```

### 發布流程

```
1. 從 develop 建立 release/vX.X.X 分支
2. 更新版本號 (package.json)
3. 更新 CHANGELOG.md
4. 測試完整流程（包含離線模式）
5. Merge 到 main
6. 建立 Git Tag
7. 觸發自動部署（靜態網站託管）
```

### 部署方式

```
建構產物為純靜態檔案，可部署至：
- GitHub Pages
- Netlify
- Vercel
- 任何靜態檔案伺服器

部署命令：
npm run build
# 產出 dist/ 資料夾，直接部署
```

## 協作規範

### 團隊調用

```
# 完整功能開發
請依序啟動產品組、開發組、測試組來開發 [功能名稱]

# 單一角色
請 @code-architect 設計 [功能] 的架構
請 @h5-developer 實作 [頁面]
請 @test-generator 產出 [功能] 的測試規範
請 @tech-lead 審查這段程式碼
```

### 交付物檢查

```
產品組交付:
- [ ] README.md (User Stories, Edge Cases, UI Tasks)

開發組交付:
- [ ] 架構設計文檔
- [ ] TypeScript 型別定義
- [ ] Pinia Store
- [ ] Vue 元件
- [ ] vue-tsc 無錯誤

測試組交付:
- [ ] 測試規範
- [ ] 測試程式碼
- [ ] 覆蓋率 > 80%
- [ ] vitest 全部通過

Tech Lead 交付:
- [ ] 代碼審查報告
```

## 文檔規範

### 必要文檔

```
docs/
├── README.md           # 專案總覽
├── ARCHITECTURE.md     # 架構說明
├── SETUP.md           # 開發環境設定
├── DEPLOYMENT.md      # 部署流程
└── features/
    └── [feature].md   # 功能規格
```

### README.md 模板

```markdown
# 功能名稱

## 概述
[功能描述]

## User Stories
- As a [角色], I want [功能], so that [價值]

## Edge Cases
- EC-1: [邊界情況]

## UI Tasks
- [ ] Task 1 - [驗收標準]

## 成功指標
- [指標定義]
```

## 版本管理

### 語意化版本

```
MAJOR.MINOR.PATCH

MAJOR: 不相容的 API 變更
MINOR: 向後相容的新功能
PATCH: 向後相容的 bug 修復

範例:
1.0.0 - 首次發布
1.1.0 - 新增阿瓦隆遊戲模板
1.1.1 - 修正 TTS 語音 bug
2.0.0 - 重大架構調整
```

### CHANGELOG 格式

```markdown
# Changelog

## [1.1.0] - 2026-03-15

### Added
- 新增阿瓦隆遊戲模板
- 新增自訂計時器時長

### Fixed
- 修正 TTS 中文語音速率問題

### Changed
- 改善遊戲流程 UI 動畫
```
