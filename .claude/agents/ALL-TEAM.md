# 桌遊語音主持人 Agent 全團隊總覽

> **Last Updated**: 2026-03-10
> **Project**: 桌遊語音主持人 (BoardGame Voice Host) - 離線 H5 語音主持 PWA
> **Tech Stack**: Vue 3 + Vite + TypeScript + Pinia + Web Speech API + IndexedDB + PWA
> **Total Agents**: 10 個 (1 Tech Lead + 3 Teams × 3 Members)

---

## 專案簡介

桌遊語音主持人是一款**純離線單裝置 AI 語音主持 H5 PWA**，專為小社團線下桌遊聚會設計，一台設備放桌上當主持人。核心功能包括：
- 遊戲場次管理（開始/暫停/結束遊戲）
- Web Speech API 語音旁白（瀏覽器內建 TTS 自動播報）
- 遊戲模板庫（預設遊戲規則與流程，本地儲存）
- 玩家管理與角色分配（單設備操作）
- 計時器（發言、投票計時）
- 遊戲歷史記錄（IndexedDB 本地儲存）

**無後端、無登入、無網路依賴** — 安裝為 PWA 後完全離線可用。

---

## 組織架構圖

```
                              ┌─────────────────────────────┐
                              │      @tech-lead             │
                              │   (Linus 風格 Tech Lead)     │
                              │   代碼審查、架構決策、品質把關  │
                              └──────────────┬──────────────┘
                                             │
            ┌────────────────────────────────┼────────────────────────────────┐
            ▼                                ▼                                ▼
┌───────────────────────┐      ┌───────────────────────┐      ┌───────────────────────┐
│     Product Team      │      │       Dev Team        │      │      Test Team        │
│       產品組          │  ──▶ │        開發組         │  ──▶ │        測試組         │
│   product-team.md     │      │    dev-team.md        │      │    test-team.md       │
├───────────────────────┤      ├───────────────────────┤      ├───────────────────────┤
│ @business-analyst     │      │ @code-architect       │      │ @test-generator       │
│ @ui-ux-designer       │      │ @h5-developer (主力)  │      │ @test-engineer        │
│ @product-strategist   │      │ @mobile-developer     │      │ @test-runner          │
│                       │      │  (輔助/未來 Flutter)  │      │                       │
└───────────────────────┘      └───────────────────────┘      └───────────────────────┘
```

---

## Agent 速查表

### 技術領導 (獨立角色)

| Agent | 檔案 | 主要職責 |
|-------|------|---------|
| **@tech-lead** | `tech-lead.md` | Linus 風格代碼審查、架構決策、技術債務識別、品質把關 |

---

### 產品組 (Product Team)

**團隊檔案**: `product-team.md`
**職責**: 需求分析 → UI 設計 → 策略驗證 → 產出 README.md

| Agent | 主要職責 |
|-------|---------|
| **@business-analyst** | 業務流程分析、User Stories、Edge Cases、需求文檔 |
| **@ui-ux-designer** | 介面設計、設計規範、UI Tasks、無障礙設計 |
| **@product-strategist** | 市場分析、推廣策略、社群經營、KPI 定義 |

**工作流程**:
```
用戶需求 → Business Analyst → UI/UX Designer → Product Strategist
              (需求分析)         (UI 設計)        (策略驗證)
                                    │
                                    ▼
                          Feature README.md
```

---

### 開發組 (Dev Team)

**團隊檔案**: `dev-team.md`
**職責**: 架構設計 → H5 PWA 開發（純前端離線）

| Agent | 主要職責 |
|-------|---------|
| **@code-architect** | Vue 3 模組化架構、Pinia Store 設計、PWA 離線策略 |
| **@h5-developer** | **首席開發者** — Vue 3 + Vite PWA 全功能開發、Web Speech API 整合、IndexedDB 資料層 |
| **@mobile-developer** | 輔助角色 — 未來若需 Flutter 原生版本時啟用 |

**工作流程**:
```
README.md → Code Architect → H5 Developer
                 │                │
                 ▼                ▼
            架構設計         Vue 3 PWA 實作
            Store 設計       Web Speech API
            離線策略         IndexedDB 資料層
                 │                │
                 └────────────────┘
                          │
                          ▼
               Feature 程式碼 (開發組產出)
```

---

### 測試組 (Test Team)

**團隊檔案**: `test-team.md`
**職責**: 測試規劃 → 測試實作 → 測試執行 → 品質報告

| Agent | 主要職責 |
|-------|---------|
| **@test-generator** | 測試案例設計、test_task.md、邊界條件、覆蓋率目標 |
| **@test-engineer** | 測試策略、Vitest + Vue Test Utils 自動化框架、CI/CD 整合 |
| **@test-runner** | 執行測試 (vitest run)、失敗分析、根因診斷、修復建議 |

**工作流程**:
```
程式碼 → Test Generator → Test Engineer → Test Runner
          (測試設計)       (自動化實作)     (執行驗證)
                                              │
                                              ▼
                                         品質報告
```

---

## 調用方式

### 方式一：調用整個團隊 (推薦)

```bash
# 啟動產品組進行需求分析
請產品組分析桌遊語音主持人的遊戲場次管理功能需求

# 啟動開發組進行實作
請開發組實作桌遊語音主持人的語音腳本管理功能

# 啟動測試組進行驗證
請測試組驗證桌遊語音主持人的遊戲模板載入功能
```

### 方式二：調用特定角色

```bash
# 只需要架構設計
請 @code-architect 設計桌遊語音主持人的 Vue 3 模組化架構

# 只需要 H5 開發
請 @h5-developer 實作遊戲進行頁面的 Web Speech API 語音播報

# 只需要代碼審查
請 @tech-lead 審查這段程式碼
```

### 方式三：完整開發流程

```bash
# 依序啟動三組團隊
請依序啟動產品組、開發組、測試組來開發桌遊語音主持人的語音主持功能

# 執行順序:
# 1. 產品組 → 產出 README.md
# 2. 開發組 → 產出程式碼
# 3. 測試組 → 產出品質報告
# 4. Tech Lead → 最終代碼審查
```

### 方式四：需求驅動閉環工作流（推薦）

```bash
# 使用 feature-workflow 指令，自動完成需求→開發→測試→回修閉環
/feature-workflow 語音主持

# 流程: 產品組 → 開發組 → 測試組 → (失敗則回修) → Tech Lead → 交付
# 特色: 測試失敗自動回修最多 3 輪，超過則請求人工介入
```

---

## 團隊協作矩陣

| 階段 | 輸入 | 負責團隊 | 輸出 | 下一階段 |
|------|------|---------|------|---------|
| Phase 0 | 用戶需求 | 產品組 | README.md | Phase 1 |
| Phase 1 | README.md | 開發組 (Arch) | 架構設計 | Phase 2 |
| Phase 2 | 架構設計 | 開發組 (H5) | Vue 3 PWA 程式碼 | Phase 3 |
| Phase 3 | 程式碼 | 測試組 | 測試報告 | Phase 4 |
| Phase 4 | 全部 | Tech Lead | 審查通過 | 完成 |

---

## 桌遊語音主持人核心功能域

| 功能域 | 說明 | 本地儲存 (IndexedDB) | 關鍵測試 |
|--------|------|---------------------|---------|
| 遊戲場次 | 開始/暫停/結束遊戲 | game_sessions | 狀態機轉換、計時器 |
| 語音主持 | Web Speech API 語音播報、腳本管理 | voice_scripts | 語音播放順序、多語言 |
| 遊戲模板 | 預設遊戲規則與流程 | game_templates | 模板載入、自訂規則 |
| 玩家管理 | 玩家登記、角色分配 (單設備) | players | 隨機分配、人數檢查 |
| 計時器 | 發言計時、投票計時 | timer_configs | 計時準確性、暫停恢復 |

---

## 快速參考：何時用哪個 Agent

| 任務類型 | 推薦 Agent | 說明 |
|---------|-----------|------|
| 需求分析 | @business-analyst | 定義 User Stories, Edge Cases |
| UI 設計 | @ui-ux-designer | 介面佈局、互動流程 |
| 市場策略 | @product-strategist | 推廣、社群經營、KPI |
| 系統架構 | @code-architect | Vue 3 模組化架構、Pinia Store |
| H5 PWA 開發 | @h5-developer | **主力開發** — Vue 3 / PWA / Web Speech API |
| Flutter 版本 | @mobile-developer | 輔助角色（未來需要時啟用） |
| 測試規劃 | @test-generator | test_task.md |
| 自動化測試 | @test-engineer | Vitest + Vue Test Utils |
| 測試執行 | @test-runner | vitest run、診斷 |
| 代碼審查 | @tech-lead | 品質把關、架構決策 |

---

## 交付標準 Checklist

### 產品組交付
- [ ] README.md 包含 User Stories (>=5)
- [ ] README.md 包含 Edge Cases (>=3)
- [ ] UI Tasks 有明確驗收標準
- [ ] 設計規範符合遊戲主題風格設計
- [ ] 考量單設備放桌上的使用場景

### 開發組交付
- [ ] `npm run lint` 無錯誤
- [ ] TypeScript strict 模式無型別錯誤
- [ ] Vue 3 Composition API 模組化架構正確
- [ ] PWA 離線功能正常運作
- [ ] Web Speech API 語音播報正確
- [ ] IndexedDB 資料持久化正確

### 測試組交付
- [ ] Unit Tests 覆蓋率 > 80%
- [ ] `npm test` (vitest) 全部通過
- [ ] test_task.md 更新完成
- [ ] 遊戲狀態機轉換邊界測試通過
- [ ] PWA / Service Worker 離線測試通過

### Tech Lead 審查
- [ ] 品味評分 (pass/warn/fail)
- [ ] 無架構紅線違規
- [ ] 資料流正確
- [ ] 離線儲存正確

---

## 檔案清單

```
.claude/agents/
├── ALL-TEAM.md               # 本文件 - 全團隊總覽
├── tech-lead.md              # 技術領導
│
├── product-team.md           # 產品組 (團隊)
│   ├── @business-analyst
│   ├── @ui-ux-designer
│   └── @product-strategist
│
├── dev-team.md               # 開發組 (團隊)
│   ├── @code-architect
│   ├── @h5-developer (主力)
│   └── @mobile-developer (輔助/未來)
│
└── test-team.md              # 測試組 (團隊)
    ├── @test-generator
    ├── @test-engineer
    └── @test-runner
```

---

## 技術棧總覽

| 層級 | 技術 | 說明 |
|------|------|------|
| 框架 | Vue 3 + Vite | Composition API + 快速建構 |
| 語言 | TypeScript (strict) | 型別安全 |
| 狀態管理 | Pinia | 響應式狀態 |
| 路由 | Vue Router 4 | SPA 路由 |
| 本地儲存 | IndexedDB (Dexie.js) | 離線資料持久化 |
| 語音 | Web Speech API | 瀏覽器內建 TTS |
| PWA | Workbox + vite-plugin-pwa | 離線安裝 |
| CSS | TailwindCSS / UnoCSS | 原子化 CSS |
| 後端 | 無 | 純前端離線應用 |

---

## Agent Teams 整合 (Experimental)

本專案支援 Claude Code 的實驗性 Agent Teams 功能，允許多個 Claude 實例協作。

### 啟用方式

```bash
# 設定環境變數
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### Slash Commands

| 指令 | 說明 | 啟動的 Teammates |
|------|------|-----------------|
| `/spawn-product-team` | 啟動產品組 | BA, Designer, Strategist |
| `/spawn-dev-team` | 啟動開發組 | Architect, H5 Developer |
| `/spawn-test-team` | 啟動測試組 | Generator, Engineer, Runner |
| `/spawn-full-team` | 完整流程 | 所有團隊 + Tech Lead |
| `/feature-workflow` | 需求閉環流程 | 全團隊 + 回修迴圈 |

### 團隊協作模式

```
┌────────────────────────────────────────────────────────────────┐
│                    Team Lead (Coordinator)                      │
│                    使用 shared task list                        │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
         ┌─────────────────────────────────────────────┐
         │              Spawn Teammates                 │
         │  spawn-teammate: "Code Architect"            │
         │  spawn-teammate: "H5 Developer"              │
         └─────────────────────────────────────────────┘
                               │
                               ▼
         ┌─────────────────────────────────────────────┐
         │           Inter-Agent Messaging              │
         │  send message to "H5 Developer":             │
         │  "架構設計已完成，請開始 PWA 實作"              │
         └─────────────────────────────────────────────┘
```

### 詳細設定

請參考 `.claude/AGENT-TEAMS-SETUP.md` 獲取完整設定指南。
