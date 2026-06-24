# Feature Workflow - 需求驅動開發工作流程

> 從需求分析到交付的完整閉環工作流，包含測試失敗自動回修機制。

## 觸發方式

```bash
/feature-workflow [功能名稱]
```

---

## 工作流程總覽

```
                                ┌──────────────┐
                                │   用戶需求    │
                                └──────┬───────┘
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │  Phase 1: 需求分析 (產品組) │
                        │  輸出: README.md           │
                        └──────────┬───────────────┘
                                   │
                                   ▼
                            ┌────────────┐   No
                            │ 需求審查通過? │ ──────▶ 產品組修正 ──┐
                            └─────┬──────┘                      │
                                  │ Yes                         │
                                  ◀─────────────────────────────┘
                                  │
                                  ▼
                        ┌──────────────────────────┐
                        │  Phase 2: 開發實作 (開發組) │
                        │  輸出: Feature Code        │
                        └──────────┬───────────────┘
                                   │
                                   ▼
                        ┌──────────────────────────┐
                        │  Phase 3: 測試驗證 (測試組) │
                        │  輸出: 品質報告             │
                        └──────────┬───────────────┘
                                   │
                                   ▼
                         ┌───────────────┐   No    ┌─────────────────────┐
                         │  測試全部通過?  │ ──────▶ │ Phase 3.5: 回修迴圈  │
                         └──────┬────────┘         │ 開發組修復 → 重新測試 │
                                │ Yes              └──────────┬──────────┘
                                │                             │
                                │   ◀─────────────────────────┘
                                ▼
                        ┌──────────────────────────┐
                        │  Phase 4: Tech Lead 審查   │
                        │  輸出: 審查報告             │
                        └──────────┬───────────────┘
                                   │
                                   ▼
                         ┌───────────────┐   No    ┌─────────────────────┐
                         │  審查通過?     │ ──────▶ │ 開發組修正 → 重新審查 │
                         └──────┬────────┘         └──────────┬──────────┘
                                │ Yes                         │
                                │   ◀─────────────────────────┘
                                ▼
                        ┌──────────────────────────┐
                        │     功能交付完成            │
                        └──────────────────────────┘
```

---

## 執行指令

當用戶輸入 `/feature-workflow [功能名稱]` 時，執行以下流程：

### Phase 1: 需求分析（產品組）

啟動產品組三位成員，依序完成需求分析。

```
spawn-teammate: Business Analyst
你是桌遊語音主持人 App 專案的商業分析師。請針對「$ARGUMENTS」功能，產出：
1. 功能概述與目標用戶
2. User Stories（至少 5 個，As a... I want... So that...）
3. Edge Cases（至少 3 個邊界情況）
4. 業務流程圖（含正常流程與異常流程）
5. 驗收標準（Acceptance Criteria）
請遵守 @rules/workflow.md 和 @skills/boardgame-domain/README.md。
完成後通知 Team Lead。

---

spawn-teammate: UI/UX Designer
你是桌遊語音主持人 App 專案的 UI/UX 設計師。根據 Business Analyst 的分析結果，產出：
1. 介面佈局說明（每個頁面的區塊配置）
2. 互動流程圖（用戶操作步驟）
3. UI Tasks 清單（含明確驗收標準）
4. 設計規範（深色主題、遊戲氛圍、間距、字體、動畫）
5. 狀態設計（Loading / Error / Empty / Success / Game Phase）
遵循沉浸式桌遊體驗設計原則，確保遊戲狀態清晰可辨。

---

spawn-teammate: Product Strategist
你是桌遊語音主持人 App 專案的產品策略師。審視 BA 與 Designer 的產出，補充：
1. 功能優先級建議（P0/P1/P2）
2. 成功指標（KPIs）與衡量方式
3. 風險評估與緩解策略
4. 未來迭代方向
```

**Phase 1 產出物**:
- `features/{功能名稱}/README.md`

**Phase 1 Gate（需求審查）**:
- [ ] User Stories >= 5 個且符合 INVEST 原則
- [ ] Edge Cases >= 3 個
- [ ] UI Tasks 每項有明確驗收標準
- [ ] 功能設計符合桌遊沉浸式體驗原則

如果需求不完整，通知產品組補充後重新審查。

---

### Phase 2: 開發實作（開發組）

需求審查通過後，啟動開發組四位成員。

```
spawn-teammate: Code Architect
你是桌遊語音主持人 App 專案的程式架構師。根據 features/{功能名稱}/README.md，設計：
1. Clean Architecture 模組結構（Domain / Data / Presentation）
2. Entity 定義（使用 Freezed）
3. Repository Interface 定義
4. UseCase 定義與數據流設計（含遊戲狀態機設計）
5. Provider 結構規劃
遵守 @rules/tech-stack.md 和 @rules/coding-style.md。
完成後通知 Supabase Architect 與 Backend Developer。

---

spawn-teammate: Supabase Schema Architect
你是桌遊語音主持人 App 專案的資料庫架構師。根據架構設計，產出：
1. PostgreSQL Schema（Migration SQL）
2. RLS Policy（每個表都必須有）
3. 索引設計（覆蓋所有 WHERE 常用欄位）
4. Trigger / Function（如需要）
遵守 @rules/security.md 和 @skills/supabase-postgres-best-practices。

---

spawn-teammate: Backend Developer
你是桌遊語音主持人 App 專案的後端開發者。根據 Schema 與架構設計，實作：
1. Supabase Edge Functions（Deno/TypeScript strict）
2. 使用 x-user-id workaround 處理認證
3. 輸入驗證與錯誤處理
4. CORS 設定
遵守 @rules/security.md 和 @rules/coding-style.md。

---

spawn-teammate: Mobile Developer
你是桌遊語音主持人 App 專案的行動開發者。等待 API 設計完成後，實作：
1. Flutter UI 頁面（遵循 UI Tasks 驗收標準）
2. Riverpod Provider 與 State（使用 Freezed）
3. Repository Implementation（連接 Supabase）
4. 遊戲狀態機實作（LOBBY → SETUP → PLAYING → ENDED）
5. 語音播放引擎與計時器整合
6. 離線模板快取（Local DataSource）
遵守 @rules/tech-stack.md 和 @rules/coding-style.md。
```

**Phase 2 產出物**:
- `docs/architecture/{功能名稱}.md` -- 架構設計文檔
- `supabase/migrations/xxx_{功能名稱}.sql` -- 資料庫遷移
- `supabase/functions/{功能名稱}/` -- Edge Functions
- `app/lib/features/{功能名稱}/` -- Flutter 程式碼

**Phase 2 Gate（開發自查）**:
- [ ] `flutter analyze` 無錯誤
- [ ] 零 `dynamic` 類型
- [ ] Clean Architecture 分層正確（Domain 不依賴 Data）
- [ ] 所有資料表啟用 RLS
- [ ] Edge Functions 使用 x-user-id workaround
- [ ] 遊戲狀態機轉換邏輯正確
- [ ] 離線模板快取正確實作

---

### Phase 3: 測試驗證（測試組）

開發自查通過後，啟動測試組。

```
spawn-teammate: Test Generator
你是桌遊語音主持人 App 專案的測試設計師。分析開發組的程式碼，產出：
1. test_task.md（完整測試清單）
2. Unit Test 案例（Domain UseCase、Repository）
3. Widget Test 案例（關鍵頁面、互動行為）
4. Integration Test 案例（端到端流程）
5. 邊界條件清單（特別關注遊戲狀態機、角色分配、計時器邏輯）
覆蓋率目標：Unit 100%（Domain）、Widget 60%+、總體 80%+。

---

spawn-teammate: Test Engineer
你是桌遊語音主持人 App 專案的測試工程師。根據 test_task.md，實作：
1. Unit Tests（flutter_test + mocktail）
2. Widget Tests（ProviderScope + Mock）
3. Integration Tests（如需要）
4. Mock / Fixture 設計
遵守 @rules/testing.md 的測試金字塔。

---

spawn-teammate: Test Runner
你是桌遊語音主持人 App 專案的測試執行者。執行所有測試並分析：
1. 運行 `flutter test --coverage`
2. 收集測試結果（通過/失敗/跳過）
3. 分析每個失敗測試的根因
4. 為每個失敗提供具體修復建議
5. 確認覆蓋率 > 80%

**重要**：產出測試報告時，明確分類問題：
- BLOCKER: 必須修復（功能錯誤、邏輯 bug）
- MAJOR: 應該修復（邊界條件、錯誤處理不足）
- MINOR: 可選修復（程式碼風格、命名建議）
```

**Phase 3 產出物**:
- `features/{功能名稱}/test_task.md` -- 測試規範
- `app/test/features/{功能名稱}/` -- 測試程式碼
- 測試報告（含通過率、覆蓋率、問題清單）

**Phase 3 Gate（測試通過判定）**:
- [ ] `flutter test` 全部通過（零 BLOCKER）
- [ ] 覆蓋率 >= 80%
- [ ] 無 BLOCKER 問題
- [ ] 遊戲狀態機邊界測試通過
- [ ] 角色分配隨機性測試通過
- [ ] 計時器精確度測試通過

---

### Phase 3.5: 回修迴圈（如測試未通過）

**觸發條件**：Phase 3 Gate 未全部通過。

```
┌──────────────────────────────────────────────────────────────┐
│                     回修迴圈 (Fix Loop)                        │
│                                                               │
│  最大迭代次數：3 次                                             │
│  超過 3 次 → 中止流程，請求人工介入                               │
│                                                               │
│  Step 1: Test Runner 產出問題清單                               │
│          ├── BLOCKER 清單（必修）                               │
│          ├── MAJOR 清單（建議修）                                │
│          └── 修復建議（含具體程式碼片段）                          │
│                                                               │
│  Step 2: 分派修復任務                                           │
│          ├── Flutter 問題 → Mobile Developer                   │
│          ├── API 問題 → Backend Developer                      │
│          ├── Schema 問題 → Supabase Architect                  │
│          └── 架構問題 → Code Architect                          │
│                                                               │
│  Step 3: 開發組修復                                             │
│          ├── 根據問題清單逐一修復                                 │
│          ├── 修復後運行 flutter analyze 自查                     │
│          └── 提交修復說明                                        │
│                                                               │
│  Step 4: Test Runner 重新執行測試                                │
│          ├── 只重跑失敗的測試 + 回歸測試                          │
│          ├── 確認修復是否引入新問題                                │
│          └── 更新測試報告                                        │
│                                                               │
│  Step 5: 判定                                                   │
│          ├── 全部通過 → 進入 Phase 4                             │
│          └── 仍有失敗 → 回到 Step 1（迭代次數 +1）               │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**回修報告格式**:

```markdown
## 回修報告 - 第 N 輪

### 修復摘要
| # | 問題 | 嚴重度 | 負責人 | 狀態 |
|---|------|--------|--------|------|
| 1 | 遊戲狀態機 NIGHT→DAY 轉換未觸發語音 | BLOCKER | Mobile Developer | 已修復 |
| 2 | RLS Policy 缺少 DELETE | BLOCKER | Supabase Architect | 已修復 |
| 3 | 角色分配未排除已淘汰玩家 | MAJOR | Backend Developer | 已修復 |

### 重新測試結果
- 通過: 45/47
- 失敗: 2/47
- 覆蓋率: 83%

### 剩餘問題
[如有，列出待修復項目]
```

---

### Phase 4: Tech Lead 審查

測試全部通過後，啟動最終審查。

```
spawn-teammate: Tech Lead
你是桌遊語音主持人 App 專案的技術領導（Linus 風格）。
請對本次功能開發進行全面審查：

1. **程式碼品味評分** (🟢/🟡/🔴)
   - 命名是否清晰自解釋
   - 抽象層級是否適當
   - 是否有過度工程

2. **架構紅線檢查**
   - Domain 層是否獨立（不依賴 Data/Presentation）
   - Repository 介面與實作是否正確分離
   - Provider 是否直接呼叫 Supabase（禁止）

3. **桌遊語音主持人特定檢查**
   - 遊戲狀態機轉換是否完整且無死鎖
   - 語音腳本播放順序是否正確
   - 計時器精確度是否足夠
   - 角色分配隨機性是否可靠
   - 離線模板快取是否正確

4. **安全檢查**
   - RLS 是否完整
   - API Keys 是否安全
   - 輸入驗證是否充分

產出審查報告，含具體修改建議。
```

**Phase 4 Gate（審查通過判定）**:
- [ ] 品味評分 🟢 或 🟡（>= 5 分）
- [ ] 無架構紅線違規
- [ ] 無安全問題

如審查未通過：開發組根據審查報告修正 → Tech Lead 重新審查（最多 2 輪）。

---

## 狀態追蹤

使用 shared task list 追蹤整體進度：

```markdown
## Feature Workflow: [功能名稱]

### 進度
- [x] Phase 1: 需求分析
- [x] Phase 1 Gate: 需求審查
- [x] Phase 2: 開發實作
- [x] Phase 2 Gate: 開發自查
- [ ] Phase 3: 測試驗證 - 進行中
- [ ] Phase 3 Gate: 測試通過判定
- [ ] Phase 3.5: 回修迴圈（如需要）
- [ ] Phase 4: Tech Lead 審查
- [ ] Phase 4 Gate: 審查通過
- [ ] 功能交付完成

### 迭代記錄
| 迭代 | 階段 | 結果 | 備註 |
|------|------|------|------|
| 1 | Phase 3 | 2 BLOCKER | 狀態機轉換、RLS 問題 |
| 2 | Phase 3.5 | 全部通過 | 修復 2 個 BLOCKER |
| 3 | Phase 4 | 6/10 | 輕微命名建議 |
```

---

## 完成標準（最終 Checklist）

### 產品組
- [ ] `features/{功能名稱}/README.md` 完整
- [ ] User Stories >= 5、Edge Cases >= 3
- [ ] UI Tasks 可執行且有驗收標準

### 開發組
- [ ] `flutter analyze` 無錯誤
- [ ] 零 `dynamic` 類型
- [ ] Clean Architecture 分層正確
- [ ] RLS 政策完整
- [ ] 遊戲狀態機正確
- [ ] 離線模板快取正確
- [ ] Edge Functions 安全

### 測試組
- [ ] `flutter test` 全部通過
- [ ] 覆蓋率 >= 80%
- [ ] test_task.md 更新完成
- [ ] 遊戲核心邏輯邊界測試通過

### Tech Lead
- [ ] 品味評分 >= 🟡 (5+)
- [ ] 無架構紅線違規
- [ ] 無安全問題

### 交付物清單
- [ ] `features/{功能名稱}/README.md`
- [ ] `features/{功能名稱}/test_task.md`
- [ ] `docs/architecture/{功能名稱}.md`
- [ ] `supabase/migrations/xxx_{功能名稱}.sql`
- [ ] `supabase/functions/{功能名稱}/`（如需要）
- [ ] `app/lib/features/{功能名稱}/`
- [ ] `app/test/features/{功能名稱}/`

---

## 異常處理

| 情境 | 處理方式 |
|------|---------|
| 需求不明確 | 產品組補充，必要時請求用戶澄清 |
| 技術不可行 | Code Architect 提出替代方案，回產品組調整 |
| 測試連續 3 輪失敗 | 中止流程，輸出問題報告，請求人工介入 |
| Tech Lead 連續 2 輪評分不及格 | 中止流程，建議重新設計架構 |
| 依賴外部服務不可用 | Mock 先行，標記為技術債 |
