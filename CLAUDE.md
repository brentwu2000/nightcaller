# 桌遊語音主持人 H5 App (BoardGame Voice Host) 專案指引

> 這是 Claude Code 的專案入口文件，定義專案結構與開發規範。

## 專案概述

桌遊語音主持人是一款專為需要主持人角色的桌遊設計的 H5 行動端網頁應用（PWA），透過 Web Speech API 的 TTS 語音自動主持遊戲流程，完全離線運行，無需後端伺服器。

**目標客戶**：小社團線下桌遊聚會 — 一台手機/平板放桌上當主持人，面對面玩，無需每人一台設備，無需註冊，掃 QR Code 或分享連結即可開始。

**支援遊戲**：狼人殺、阿瓦隆、抵抗組織、血染鐘樓、一夜狼人等。

**核心功能**：
- 遊戲模板庫（預設 + 自訂遊戲規則，內建預載）
- AI 語音主持（Web Speech API TTS 自動播報遊戲階段）
- 玩家管理（本地角色分配）
- 遊戲流程控制（夜晚/白天/投票循環）
- 計時器（發言、投票計時）
- 音效與背景音樂
- 自訂遊戲模板創建
- 遊戲歷史記錄（本地 IndexedDB）

**不包含的功能**（離線優先設計）：
- 用戶帳號/認證
- 線上房間/匹配
- 後端伺服器/資料庫
- 推播通知
- 多設備即時同步

## 目錄結構

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
│   ├── components/       # Vue 元件
│   ├── composables/      # Vue Composables (狀態邏輯)
│   ├── features/         # 功能模組
│   │   └── cheese-thief/ # 奶酪大盜遊戲（範例）
│   ├── router/           # Vue Router
│   ├── stores/           # Pinia 狀態管理
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
│   ├── components/       # UI 元件設計稿（玩家卡片、角色圖示）
│   ├── screens/          # 頁面設計稿（遊戲大廳、主持介面）
│   └── design_system/    # Design System 文件
│
├── docs/                 # 專案文檔
│   ├── architecture/     # 架構設計文檔
│   └── guides/           # 開發指南
│
├── features/             # 功能規格文檔
│   └── {feature_name}/   # 每個功能一個資料夾
│       └── README.md     # 功能規格（User Stories, Edge Cases）
│
├── index.html            # 入口 HTML
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── package.json          # 依賴管理
├── CLAUDE.md             # 本文件 - 專案入口
└── README.md             # 專案總覽
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | Vue 3 + Composition API |
| 建構 | Vite 5.x |
| 語言 | TypeScript (strict) |
| 狀態管理 | Pinia |
| 路由 | Vue Router 4 |
| UI 框架 | 自訂元件 + CSS3 |
| 語音 | Web Speech API (SpeechSynthesis) |
| 音效 | Howler.js |
| 本地儲存 | IndexedDB (Dexie.js) |
| 離線支援 | PWA (Workbox) |
| 適配方案 | VW/VH + PostCSS px-to-viewport |
| 動畫 | CSS3 Transitions + Lottie-web |

## 開發規範

### 必讀規範（位於 `.claude/rules/`）

| 檔案 | 說明 |
|------|------|
| `tech-stack.md` | 技術選型限制（不可違背） |
| `coding-style.md` | 程式風格與命名規範 |
| `security.md` | 安全規範（Web 安全、XSS 防護） |
| `workflow.md` | Git 工作流程 |
| `testing.md` | 測試規範 |

### Agent 團隊（位於 `.claude/agents/`）

| 團隊 | 說明 |
|------|------|
| `product-team.md` | 產品組（BA, Designer, Strategist） |
| `dev-team.md` | 開發組（Architect, H5 Developer） |
| `test-team.md` | 測試組（Generator, Engineer, Runner） |
| `tech-lead.md` | 技術領導（代碼審查） |

## 功能開發流程

```
1. features/{name}/README.md  ← 產品組產出規格
2. docs/architecture/{name}.md ← 架構設計
3. src/types/{name}.ts         ← TypeScript 型別定義
4. src/stores/{name}.ts        ← Pinia Store
5. src/composables/use{Name}.ts ← Composable 邏輯
6. src/features/{name}/        ← Vue 元件實作
7. appui/screens/{name}/       ← UI 設計資源
```

## 快速指令

```bash
# 啟動開發伺服器
npm run dev

# 建構生產版本
npm run build

# 預覽生產版本
npm run preview

# 執行測試
npm run test

# 啟動產品組
請產品組分析 遊戲模板庫功能

# 啟動開發組
請開發組實作 狼人殺遊戲流程

# 啟動測試組
請測試組驗證 角色分配邏輯

# 代碼審查
請 @tech-lead 審查這段程式碼

# 需求閉環流程
/feature-workflow 語音主持系統
```

## 相關文檔

- [README.md](./README.md) - 專案總覽與 User Stories
- [docs/architecture/](./docs/architecture/) - 架構設計文檔
- [appui/](./appui/) - UI/UX 設計資源
