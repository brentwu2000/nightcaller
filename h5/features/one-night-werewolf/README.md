# 一夜終極狼人殺 (One Night Ultimate Werewolf)

> **版本**: v1.0
> **日期**: 2026-03-12
> **產出者**: Business Analyst
> **狀態**: 待開發

---

## 1. 遊戲簡介

### 1.1 概述

一夜終極狼人殺（One Night Ultimate Werewolf，簡稱 ONUW）是由 Bezier Games 出版的快節奏社交推理桌遊。每局僅有**一個夜晚**，結束後立即進行白天討論與投票。全局約 10 分鐘，極適合作為聚會暖場或在阿瓦隆等長局之間穿插遊玩。

### 1.2 核心機制

- **中間牌（Center Cards）**：桌上永遠有 3 張沒有玩家拿到的備用牌，部分角色的夜晚行動可與中間牌互動
- **角色交換**：強盜、搗蛋鬼等角色會在夜晚期間悄悄交換牌，玩家的最終身份可能已與開局不同
- **一票定生死**：白天討論結束後，所有玩家同時指向一名玩家，得票最多者被淘汰
- **快節奏**：沒有多輪淘汰，一個夜晚 + 一次投票決定勝負

### 1.3 勝負條件

| 情境 | 結果 |
|------|------|
| 被淘汰的玩家持有狼人牌（投票結束時）| 村民陣營獲勝 |
| 被淘汰的玩家持有非狼人牌，且場上有狼人 | 狼人陣營獲勝 |
| 場上沒有任何狼人（狼人牌全在中間），且無人得票（平票或每人各得一票） | 村民陣營獲勝 |
| 場上沒有狼人，且有人被淘汰 | 狼人陣營獲勝 |
| 皮匠被淘汰（無論場上是否有狼人） | 皮匠獲勝（皮匠單獨獲勝，其他陣營均落敗） |

> **注意**：勝負判定依據的是**投票結束時玩家手上實際持有的牌**，而非遊戲開始時分配的牌。

### 1.4 支援人數與角色組合

- **人數**：3–10 人
- **角色牌數**：玩家人數 + 3（桌上中間牌永遠 3 張）
- **本 App 支援的基礎角色**：狼人、爪牙、預言家、強盜、搗蛋鬼、酒鬼、獵人、失眠者、皮匠、村民
- **進階可選角色**：仿製者（Doppelganger）

### 1.5 與其他遊戲的差異

| 特性 | 一夜終極狼人殺 | 阿瓦隆 | 奶酪大盜 |
|------|--------------|--------|---------|
| 遊戲時長 | 約 10 分鐘 | 30–45 分鐘 | 20–30 分鐘 |
| 夜晚輪數 | 1 輪 | 1 輪 | 1 輪 |
| 淘汰機制 | 投票 1 次 | 任務成敗 | 投票多輪 |
| 角色交換 | 有（核心機制） | 無 | 無 |
| 中間牌 | 有（3 張） | 無 | 無 |
| 主持工作量 | 中（角色順序嚴格） | 中 | 低 |

---

## 2. App 定位與範圍

### 2.1 本 App 負責的事

| 功能 | 說明 |
|------|------|
| 角色組成設定 | 主持人在設定畫面選擇要加入哪些角色牌 |
| 夜晚語音主持 | TTS 按固定順序自動播報每個角色的行動指令 |
| 白天討論計時 | 可設定討論時間，顯示倒數計時器 |
| 投票計時 | 可設定同時指人的倒數秒數 |
| 結果回報 | 主持人輸入被淘汰的玩家，App 判定並播報勝負 |
| 遊戲歷史記錄 | 本地 IndexedDB 儲存每局結果 |

### 2.2 本 App 不負責的事

| 排除項目 | 原因 |
|---------|------|
| 數位角色分配（每人一台設備查看角色）| 核心定位：一台設備放桌上，玩家翻閱實體牌 |
| 角色牌管理（哪張牌發給誰）| 由玩家自行洗牌發牌 |
| 推理輔助（記錄誰說了什麼）| 推理是玩家的樂趣，不介入 |
| 強制計時結束（自動跳過討論）| 主持人手動控制節奏 |

---

## 3. User Stories

### US-01: 選擇角色組成

**As a** 主持人
**I want** 在遊戲開始前，從角色列表中選擇要加入本局的角色牌
**So that** 每局可以根據人數與玩家偏好調整遊戲難度與趣味性

**Acceptance Criteria:**
- [ ] Given 進入設定畫面，When 輸入玩家人數（3–10），Then App 顯示推薦的角色組合
- [ ] Given 角色選擇畫面，When 主持人勾選或取消角色，Then App 即時顯示目前總牌數（需等於玩家人數 + 3）
- [ ] Given 總牌數不足或超出，When 主持人嘗試開始遊戲，Then App 顯示提示訊息「牌數必須等於玩家人數加三張中間牌」並禁止繼續
- [ ] Given 角色組合合法，When 主持人點擊「開始夜晚」，Then App 進入夜晚語音主持流程
- [ ] Given 選擇了仿製者角色，When 顯示角色列表，Then 仿製者標示為「進階」並排在列表最上方

**Edge Cases:**
- EC-1: 人數低於 3 人，禁止開始並提示最低人數限制
- EC-2: 人數高於 10 人，禁止開始並提示最高人數限制
- EC-3: 只選了村民填滿，無狼人牌，App 顯示警告「場上沒有狼人，遊戲將無懸念」，但仍允許繼續（主持人可能刻意體驗特殊模式）

**Priority:** P0
**Effort:** M

---

### US-02: 夜晚語音主持（核心功能）

**As a** 主持人
**I want** App 自動按照官方規則的角色順序播報 TTS 語音，引導每個角色依序完成夜晚行動
**So that** 不需要熟悉規則的人也能主持，所有玩家只需閉眼聽從語音指示

**Acceptance Criteria:**
- [ ] Given 夜晚開始，When 語音播報，Then 依照官方固定順序播報（仿製者→狼人→爪牙→預言家→強盜→搗蛋鬼→酒鬼→失眠者）
- [ ] Given 某角色未被選入本局，When 輪到該角色，Then App 自動跳過該角色，不播報
- [ ] Given 語音播報進行中，When 主持人點擊「暫停」，Then 語音暫停，計時停止
- [ ] Given 語音已暫停，When 主持人點擊「繼續」，Then 從暫停處繼續播報
- [ ] Given 語音播報進行中，When 主持人點擊「跳過本段」，Then 停止目前語音並進入下一個角色的步驟
- [ ] Given 夜晚流程全部完成，When 最後語音播報結束，Then App 自動跳轉至白天計時畫面
- [ ] Given 主持人想重播夜晚，When 點擊「重播夜晚」按鈕，Then 夜晚語音從頭重新播放

**Edge Cases:**
- EC-1: iOS Safari 首次進入頁面尚未有使用者互動，TTS 無法自動播放，App 顯示「點擊任意處開始」的互動提示
- EC-2: 播報過程中手機鎖屏，Page Visibility API 偵測後暫停計時，恢復時提醒主持人確認當前進度
- EC-3: TTS 語音載入失敗（瀏覽器無中文語音），App 顯示文字提示並允許主持人手動逐段觸發

**Priority:** P0
**Effort:** L

---

### US-03: 白天討論計時

**As a** 主持人
**I want** 在夜晚結束後，開啟一個可視的倒數計時器，為白天討論階段計時
**So that** 討論時間有明確邊界，避免遊戲拖延

**Acceptance Criteria:**
- [ ] Given 夜晚流程結束，When App 進入白天畫面，Then 顯示討論計時器（預設 5 分鐘，可在設定中調整）
- [ ] Given 計時器顯示，When 主持人點擊「開始討論」，Then 倒數計時開始，畫面顯示剩餘時間
- [ ] Given 計時進行中，When 主持人點擊「暫停」，Then 計時暫停
- [ ] Given 計時進行中，When 主持人點擊「跳過」，Then 立即進入投票畫面
- [ ] Given 計時歸零，When 倒數結束，Then 播放提示音效並顯示「討論結束，準備投票！」提示

**Edge Cases:**
- EC-1: 主持人將討論時間設定為 0，App 允許此設定（代表自由討論，不計時），計時器不顯示倒數，僅顯示「自由討論中，點擊進入投票」按鈕

**Priority:** P0
**Effort:** S

---

### US-04: 投票計時

**As a** 主持人
**I want** 在投票環節顯示倒數計時，引導所有玩家同時指向懷疑對象
**So that** 所有玩家同時做決定，避免後指的人受前面指法影響

**Acceptance Criteria:**
- [ ] Given 進入投票畫面，When 主持人點擊「開始投票倒數」，Then 顯示倒數（預設 3 秒，可設定 3–10 秒）
- [ ] Given 倒數為 0，When 計時結束，Then 播放「指！」的語音提示，提醒所有人同時指出
- [ ] Given 投票完成，When 主持人點擊「輸入結果」，Then 進入結果輸入畫面

**Edge Cases:**
- EC-1: 倒數期間主持人誤觸，提供 3 秒內的「撤銷重來」按鈕

**Priority:** P0
**Effort:** S

---

### US-05: 輸入淘汰結果與判定勝負

**As a** 主持人
**I want** 輸入得票最多的玩家及其實際持有的角色牌，App 自動判斷並播報哪個陣營獲勝
**So that** 勝負判定有明確依據，減少人工計算錯誤

**Acceptance Criteria:**
- [ ] Given 進入結果畫面，When 主持人輸入「得票最多的玩家持有的角色」，Then App 顯示判定邏輯並確認勝利陣營
- [ ] Given 勝利陣營確定，When 主持人點擊「確認結果」，Then TTS 播報勝利宣告語音
- [ ] Given 皮匠被淘汰，When 主持人選擇被淘汰玩家的角色為「皮匠」，Then App 顯示「皮匠單獨獲勝！」並播報相應語音
- [ ] Given 場上無狼人且投票平票，When 主持人選擇「沒有人被淘汰（平票）」，Then App 判定村民陣營獲勝
- [ ] Given 場上無狼人但有人被淘汰，When 主持人確認，Then App 判定狼人陣營獲勝並說明原因
- [ ] Given 遊戲結束，When 結果畫面顯示，Then 顯示「再玩一局」與「返回大廳」按鈕

**Edge Cases:**
- EC-1: 得票最多的玩家有兩人（並列最高票），兩人均被淘汰，App 提示「本局有兩人同票被淘汰」，主持人需分別輸入兩人的角色，勝負以兩人中是否有狼人為準（任一人持有狼人即算村民勝）
- EC-2: 強盜或搗蛋鬼交換後，玩家可能自己也搞不清楚手上是什麼牌，App 在結果畫面提示「所有玩家翻開手中的牌」再輸入
- EC-3: 主持人輸入錯誤想更正，提供「重新輸入」按鈕，清除當前選擇

**Priority:** P0
**Effort:** M

---

### US-06: 各角色夜晚行動說明

**As a** 第一次玩的玩家
**I want** 在設定畫面可以查看每個角色的功能說明
**So that** 不需要帶著說明書，快速了解本局使用的角色能力

**Acceptance Criteria:**
- [ ] Given 設定畫面的角色列表，When 點擊角色名稱旁的說明圖示，Then 彈出說明卡片顯示角色名稱、陣營、夜晚行動說明
- [ ] Given 說明卡片，When 用戶關閉，Then 返回設定畫面不影響已選擇的角色設定

**Priority:** P1
**Effort:** S

---

### US-07: 遊戲歷史記錄

**As a** 玩家
**I want** 在遊戲結束後，本局的結果被自動記錄下來
**So that** 可以回顧歷史戰績，查看常用角色配置與勝率統計

**Acceptance Criteria:**
- [ ] Given 遊戲結束，When 主持人確認結果，Then 系統自動儲存本局記錄至 IndexedDB
- [ ] Given 歷史記錄頁面，When 用戶進入，Then 顯示過去的遊戲列表，包含日期、人數、角色配置、勝利陣營
- [ ] Given 記錄超過 50 筆，When 新增記錄，Then 自動刪除最舊的記錄（保持最多 50 筆）

**Priority:** P1
**Effort:** M

---

### US-08: 音效與背景音樂

**As a** 玩家
**I want** 夜晚階段有神秘的背景音樂，投票與結果時有對應的音效
**So that** 遊戲氛圍更沉浸，增加儀式感

**Acceptance Criteria:**
- [ ] Given 夜晚開始，When 語音主持啟動，Then 播放夜晚背景音樂（低沉神秘風格）
- [ ] Given 白天開始，When 討論計時啟動，Then 夜晚音樂淡出，切換為白天輕鬆音樂（可關閉）
- [ ] Given 投票計時歸零，When 播報「指！」，Then 播放戲劇性音效
- [ ] Given 結果揭曉，When 勝利方確定，Then 播放對應的勝利/失敗音效
- [ ] Given 設定畫面，When 用戶調整音量滑桿，Then 即時生效（TTS 音量、音效音量、背景音樂音量各自獨立）

**Priority:** P1
**Effort:** M

---

### US-09: 語音速度與音量設定

**As a** 主持人
**I want** 可以調整 TTS 語音的速度與音量
**So that** 在吵雜場合可以提高音量，對新手可以放慢速度

**Acceptance Criteria:**
- [ ] Given 設定畫面，When 調整語速滑桿（0.5x–1.5x），Then 語音預覽以調整後速度播放一段示例
- [ ] Given 設定畫面，When 調整語音音量滑桿，Then 語音音量即時生效

**Priority:** P1
**Effort:** S

---

### US-10: 仿製者（Doppelganger）進階角色支援

**As a** 進階玩家
**I want** 可以在角色列表中加入仿製者
**So that** 可以體驗更複雜的夜晚互動

**Acceptance Criteria:**
- [ ] Given 選擇了仿製者角色，When 夜晚開始，Then 仿製者排在所有角色最前面播報
- [ ] Given 仿製者的 TTS 指令播報，When 播報仿製者環節，Then 語音提示「仿製者，請睜眼，偷看另一名玩家的牌，你將扮演那個角色」
- [ ] Given 仿製者模仿的是有夜晚行動的角色（如強盜、搗蛋鬼），When 播報時，Then 在原角色行動後，額外播報「仿製者（若仿製了 XX），請依照該角色行動」的提示

**Priority:** P2
**Effort:** L

---

## 4. Edge Cases 完整清單

### 4.1 設定階段

| 編號 | 情境 | 處理方式 |
|------|------|---------|
| EC-S-01 | 玩家人數為 3，只有一名狼人，狼人知道其他兩人是好人 | 允許，但在設定畫面顯示警告「3 人局建議加入更多功能角色以增加趣味性」 |
| EC-S-02 | 選擇了多張村民（填充牌），導致無任何特殊角色 | 允許，但顯示提示「本局無特殊功能角色，遊戲體驗可能平淡」 |
| EC-S-03 | 狼人牌數量超過總牌數的一半 | 顯示警告「狼人比例過高，遊戲可能失衡」，允許繼續 |
| EC-S-04 | 選擇了失眠者但沒有選擇強盜和搗蛋鬼 | 顯示提示「場上沒有強盜和搗蛋鬼，失眠者的行動將毫無意義（始終看到自己的原始角色）」，允許繼續 |
| EC-S-05 | 選擇了爪牙但沒有選擇狼人 | 顯示警告「場上沒有狼人，爪牙在夜晚將無法看到任何同伴（爪牙睜眼時若沒有狼人，代表狼人都在中間牌）」，允許繼續 |

### 4.2 夜晚語音主持階段

| 編號 | 情境 | 處理方式 |
|------|------|---------|
| EC-N-01 | iOS Safari TTS 被系統靜音（靜音開關）| 播報前偵測並提示用戶關閉靜音開關，或顯示文字版指令供主持人自行朗讀 |
| EC-N-02 | 手機在語音播報中途接到電話 | Page Visibility 偵測頁面離開，自動暫停，返回後顯示「是否從暫停處繼續？」 |
| EC-N-03 | 語音播報到一半，主持人想完全重新開始 | 夜晚畫面提供「重置夜晚」按鈕，確認後從第一個角色重新播報 |
| EC-N-04 | 預言家查看中間牌時，主持人需要偷偷展示中間牌給預言家 | 語音提示「預言家可以看另外兩張中間牌之一」，這是實體牌的操作，App 無需介入，但語音需明確說明 |
| EC-N-05 | 強盜交換牌後，強盜自己忘記看新牌了 | 夜晚語音明確指示「強盜，看一下你拿來的牌」，App 不做其他處理 |
| EC-N-06 | 夜晚開始後，主持人發現角色設定有誤 | 提供「返回設定」按鈕（確認後中止夜晚並返回設定畫面），所有夜晚進度清空 |

### 4.3 白天討論與投票階段

| 編號 | 情境 | 處理方式 |
|------|------|---------|
| EC-D-01 | 討論中有人需要短暫離開（廁所等）| 主持人手動點擊暫停計時，等人回來後繼續 |
| EC-D-02 | 投票時所有人各得一票（完全平票）| 結果畫面提示「所有人各得一票，無人被淘汰」，進入勝負判定邏輯 |
| EC-D-03 | 玩家拒絕指人（棄權）| App 不追蹤個人票數，只提供平票/無人被淘汰的選項給主持人輸入 |

### 4.4 結果判定階段

| 編號 | 情境 | 處理方式 |
|------|------|---------|
| EC-R-01 | 得票最高者有兩人以上（並列）| App 詢問「是否並列最高票？」，若是，要求輸入所有並列最高票玩家的角色，任一人持有狼人則村民勝 |
| EC-R-02 | 玩家的牌在夜晚被交換，但雙方都不確定最終是誰的牌 | App 在結果畫面提示「請所有玩家翻開手中的牌進行確認後再輸入結果」 |
| EC-R-03 | 皮匠被淘汰，同時場上也有狼人 | 皮匠獲勝，優先級高於村民陣營勝負，App 顯示「皮匠被淘汰，皮匠獲勝！村民和狼人均落敗。」 |
| EC-R-04 | 主持人輸入結果後發現有誤 | 結果確認前提供「重新輸入」按鈕；結果播報後無法撤銷（重新一局即可） |
| EC-R-05 | 場上沒有狼人，但非平票（有人被淘汰）| 狼人陣營獲勝，App 說明「場上沒有狼人，但有人被淘汰，狼人陣營獲勝！」 |

---

## 5. 夜晚語音腳本（完整）

### 5.1 官方夜晚行動順序

ONUW 夜晚行動有嚴格的固定順序（官方規則）：

```
1. 仿製者 (Doppelganger)       ← 僅選入時才播報
2. 狼人 (Werewolf)
3. 爪牙 (Minion)
4. 預言家 (Seer)
5. 強盜 (Robber)
6. 搗蛋鬼 (Troublemaker)
7. 酒鬼 (Drunk)
8. 失眠者 (Insomniac)
9. 仿製者（第二次，若模仿了有行動的角色）← 僅特定情境
```

> 獵人（Hunter）、皮匠（Tanner）、村民（Villager）**無夜晚行動**，不播報。

### 5.2 開場語音

```
天黑請閉眼。

每位玩家已拿到自己的角色牌，請確認你的角色後蓋在桌上。
桌中央有三張沒有人拿到的中間牌，這三張牌可能影響你的判斷。

夜晚即將開始。所有人閉上眼睛，保持安靜。
```

### 5.3 各角色語音腳本

---

#### 仿製者 (Doppelganger)
*僅在選入仿製者時播報，排在最前面*

```
仿製者，請睜開眼睛。

請偷看另一名玩家的角色牌，你將扮演那個角色。
記住你看到的角色。

仿製者，請閉上眼睛。
```

*若仿製者模仿的角色有夜晚行動（如強盜、搗蛋鬼、預言家、酒鬼），在原角色行動完成後，需要額外播報：*

```
仿製者，若你模仿的角色剛才有夜晚行動，現在輪到你以那個身份行動。
請依照你所模仿的角色的指示操作。

仿製者，請閉上眼睛。
```

---

#### 狼人 (Werewolf)

**情境一：場上有兩名以上的狼人**

```
狼人，請睜開眼睛，確認彼此身份。

（停頓五秒）

狼人，請閉上眼睛。
```

**情境二：場上只有一名狼人（孤狼）**

```
狼人，請睜開眼睛。

如果你是孤狼，沒有看到任何同伴，你可以看一張中間牌獲取資訊。
請伸出手指，指向其中一張中間牌，主持人將輕觸那張牌讓你查看。

（停頓五秒）

狼人，請閉上眼睛。
```

> **主持人操作提示**：若孤狼選擇查看中間牌，主持人（或其他閉眼玩家）協助悄悄翻開讓孤狼看，隨後蓋回。此操作由實體牌完成，App 無法追蹤。

---

#### 爪牙 (Minion)

**情境一：場上有狼人**

```
爪牙，請睜開眼睛。

（停頓一秒）

狼人們，請伸出你們的拇指，讓爪牙確認你們的身份。

（停頓四秒）

狼人，收回拇指。
爪牙，請閉上眼睛。
```

**情境二：場上沒有狼人（狼人牌全在中間）**

```
爪牙，請睜開眼睛。

如果你沒有看到任何狼人舉起拇指，代表狼人牌可能在中間。
你需要在白天保護自己，讓村民們誤判方向。

爪牙，請閉上眼睛。
```

> **主持人注意**：App 無法自動判斷場上是否有狼人，語音統一播報完整版，由主持人知悉牌的情況（主持人不知道牌的情況時，此指令仍正確——爪牙自己會看到有無狼人）。

---

#### 預言家 (Seer)

**固定語音**

```
預言家，請睜開眼睛。

你可以選擇以下其中一種行動：
一、查看另一名玩家的角色牌；
二、查看中間的兩張牌。

請伸出手指，指向你想查看的目標。主持人將協助你悄悄查看。

（停頓七秒）

預言家，請閉上眼睛。
```

---

#### 強盜 (Robber)

**固定語音**

```
強盜，請睜開眼睛。

你可以選擇偷走另一名玩家的角色牌，與你手中的牌交換。
你的新角色就是你偷到的那張牌。請看清楚你偷到的角色。

若你選擇不行動，也可以保留原本的牌。

請伸出手指，指向你想偷牌的玩家。主持人將協助交換並讓你查看。
若選擇不行動，請放下手。

（停頓六秒）

強盜，請閉上眼睛。
```

---

#### 搗蛋鬼 (Troublemaker)

**固定語音**

```
搗蛋鬼，請睜開眼睛。

你可以秘密交換兩名其他玩家的角色牌。
注意，你自己不能查看這兩張牌的內容。

若你選擇行動，請伸出兩根手指，分別指向你想讓他們交換的兩名玩家。
主持人將協助交換，但不讓那兩名玩家知道。
若選擇不行動，請放下手。

（停頓六秒）

搗蛋鬼，請閉上眼睛。
```

---

#### 酒鬼 (Drunk)

**固定語音**

```
酒鬼，請睜開眼睛。

你必須將你的角色牌與其中一張中間牌交換。
你不能查看你換到的牌是什麼。

請伸出手指，指向中間三張牌其中一張。主持人將協助你悄悄交換。

（停頓四秒）

酒鬼，請閉上眼睛。
```

---

#### 失眠者 (Insomniac)

**固定語音**

```
失眠者，請睜開眼睛。

請偷看你面前的角色牌，確認你現在手中持有的是什麼角色。
（如果沒有人在夜晚移動了你的牌，你看到的就是你原本的角色。）

（停頓四秒）

失眠者，請閉上眼睛。
```

---

### 5.4 結尾語音

```
天亮了，所有人請睜開眼睛。

一個夜晚過去了。現在是白天，你們有時間互相討論，找出你們認為的狼人。

討論結束後，所有人同時指向一名玩家——得票最多的人將被淘汰。
記住：你手上的牌可能在夜晚被交換了。

白天討論，現在開始。
```

### 5.5 勝負宣告語音

**村民陣營獲勝（淘汰了狼人）**

```
結果揭曉！被淘汰的玩家持有狼人牌！

村民陣營獲勝！光明驅散了黑暗，今晚的村莊是安全的。
```

**狼人陣營獲勝（淘汰了非狼人）**

```
結果揭曉！被淘汰的玩家並非狼人！

狼人陣營獲勝！黑暗的力量藏在了眾目睽睽之下，村民們受騙了。
```

**村民陣營獲勝（場上無狼人，無人被淘汰）**

```
結果揭曉！場上沒有狼人，而且沒有人被淘汰！

村民陣營獲勝！所有狼人藏在了中間牌，無人受到傷害。
```

**狼人陣營獲勝（場上無狼人，但有人被淘汰）**

```
結果揭曉！場上沒有狼人，但有人被淘汰了！

狼人陣營獲勝！村民們在沒有狼人的情況下自相殘殺，狼人們在中間牌中偷笑。
```

**皮匠獲勝**

```
結果揭曉！被淘汰的玩家是皮匠！

皮匠獲勝！皮匠渴望被淘汰，而你們如了他的願。
無論是村民還是狼人，這局的輸家是你們所有人！
```

**並列最高票，有狼人被淘汰**

```
結果揭曉！並列最高票的玩家中，有人持有狼人牌！

村民陣營獲勝！雖然有無辜者受到牽連，但狼人終究難逃法眼。
```

---

## 6. 遊戲流程說明

### 6.1 完整流程狀態機

```
setup（設定）
    │
    │  主持人選擇角色、設定人數與計時選項
    ▼
night（夜晚語音主持）
    │
    │  TTS 按序播報各角色指令
    │  玩家依指示進行實體牌操作
    ▼
discussion（白天討論計時）
    │
    │  倒數計時，玩家自由討論
    ▼
vote（投票計時）
    │
    │  倒數計時，所有人同時指人
    ▼
result（結果輸入與判定）
    │
    │  主持人輸入被淘汰玩家的角色
    │  App 判定勝負並播報宣告
    ▼
finished（結束畫面）
    │
    ├── 「再玩一局」→ setup（保留角色設定）
    └── 「返回大廳」→ 遊戲大廳
```

### 6.2 夜晚流程子狀態

```
night_idle（夜晚待機）
    │
    ▼
night_opening（開場語音）
    │
    ▼
night_doppelganger（仿製者，若選入）
    │
    ▼
night_werewolf（狼人）
    │
    ▼
night_minion（爪牙，若選入）
    │
    ▼
night_seer（預言家，若選入）
    │
    ▼
night_robber（強盜，若選入）
    │
    ▼
night_troublemaker（搗蛋鬼，若選入）
    │
    ▼
night_drunk（酒鬼，若選入）
    │
    ▼
night_insomniac（失眠者，若選入）
    │
    ▼
night_closing（結尾語音）
    │
    ▼
night_completed（夜晚結束）
```

### 6.3 各階段計時建議

| 階段 | 建議時長 | 可調整範圍 |
|------|---------|-----------|
| 各角色夜晚指令 | 由語音長度決定 + 可設定靜默等待秒數（3–10 秒） | 3–10 秒靜默 |
| 白天討論 | 5 分鐘 | 0（自由）–15 分鐘 |
| 投票倒數 | 3 秒 | 3–10 秒 |

---

## 7. TypeScript 類型定義

```typescript
// src/types/one-night-werewolf.ts

// ===== 角色定義 =====

export type OnwRoleId =
  | 'werewolf'
  | 'minion'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'hunter'
  | 'insomniac'
  | 'tanner'
  | 'villager'
  | 'doppelganger'

export type OnwFaction = 'village' | 'werewolf' | 'tanner'

export interface OnwRole {
  id: OnwRoleId
  name: string                  // 繁體中文名稱
  faction: OnwFaction
  hasNightAction: boolean       // 是否有夜晚行動
  nightOrder: number            // 夜晚行動順序（0 = 無行動）
  description: string           // 角色說明（顯示用）
  nightInstruction: string      // 夜晚行動說明（顯示用）
  isAdvanced: boolean           // 是否為進階角色（如仿製者）
}

// ===== 遊戲設定 =====

export type OnwPhase =
  | 'setup'
  | 'night'
  | 'discussion'
  | 'vote'
  | 'result'
  | 'finished'

export type OnwNightStep =
  | 'idle'
  | 'opening'
  | 'doppelganger'
  | 'werewolf'
  | 'minion'
  | 'seer'
  | 'robber'
  | 'troublemaker'
  | 'drunk'
  | 'insomniac'
  | 'doppelganger_second'       // 仿製者的第二次行動（若模仿了有行動的角色）
  | 'closing'
  | 'completed'

export interface OnwGameConfig {
  playerCount: number           // 玩家人數（3–10）
  selectedRoles: OnwRoleId[]    // 已選擇加入本局的角色牌（數量需等於 playerCount + 3）
  discussionMinutes: number     // 白天討論時間（分鐘，0 表示不計時）
  voteCountdownSeconds: number  // 投票倒數秒數（3–10）
  nightSilenceSeconds: number   // 每個角色指令後的靜默等待秒數（3–10）
  speechRate: number            // TTS 語速（0.5–1.5）
  speechVolume: number          // TTS 音量（0–1）
  musicVolume: number           // 背景音樂音量（0–1）
  sfxVolume: number             // 音效音量（0–1）
}

// ===== 遊戲狀態 =====

export type OnwWinnerFaction = 'village' | 'werewolf' | 'tanner' | 'none'

export type OnwWinReason =
  | 'werewolf_eliminated'        // 狼人被淘汰，村民勝
  | 'no_werewolf_eliminated'     // 非狼人被淘汰，且場上有狼人，狼人勝
  | 'no_werewolf_no_elimination' // 場上無狼人，無人被淘汰，村民勝
  | 'no_werewolf_but_eliminated' // 場上無狼人，但有人被淘汰，狼人勝
  | 'tanner_eliminated'          // 皮匠被淘汰，皮匠勝

export interface OnwVoteResult {
  eliminatedRoles: OnwRoleId[]  // 被淘汰玩家最終持有的角色（可能不只一人並列最高票）
  isTie: boolean                // 是否為平票（無人被淘汰）
}

export interface OnwGameState {
  phase: OnwPhase
  nightStep: OnwNightStep
  discussionRemainingSeconds: number
  voteCountdownRemaining: number
  isNightCompleted: boolean
  isPaused: boolean
}

// ===== 勝負結果 =====

export interface OnwGameResult {
  winner: OnwWinnerFaction
  winReason: OnwWinReason
  voteResult: OnwVoteResult
}

// ===== 歷史記錄 =====

export interface OnwGameRecord {
  id?: number
  gameTemplate: 'one-night-werewolf'
  playerCount: number
  selectedRoles: OnwRoleId[]
  winner: OnwWinnerFaction
  winReason: OnwWinReason
  durationMinutes: number
  playedAt: Date
}

// ===== 常數 =====

export const ONW_ROLES: Readonly<Record<OnwRoleId, OnwRole>> = {
  doppelganger: {
    id: 'doppelganger',
    name: '仿製者',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 1,
    description: '夜晚偷看另一名玩家的牌，並扮演該角色。',
    nightInstruction: '偷看一名玩家的牌，你將扮演那個角色，並可能需要執行該角色的夜晚行動。',
    isAdvanced: true,
  },
  werewolf: {
    id: 'werewolf',
    name: '狼人',
    faction: 'werewolf',
    hasNightAction: true,
    nightOrder: 2,
    description: '狼人陣營。夜晚睜眼確認同伴，若為孤狼可查看一張中間牌。',
    nightInstruction: '睜眼確認同伴；若為孤狼，可選擇查看一張中間牌。',
    isAdvanced: false,
  },
  minion: {
    id: 'minion',
    name: '爪牙',
    faction: 'werewolf',
    hasNightAction: true,
    nightOrder: 3,
    description: '狼人陣營。夜晚睜眼確認狼人身份，但狼人不知道爪牙是誰。',
    nightInstruction: '睜眼查看所有狼人的身份。',
    isAdvanced: false,
  },
  seer: {
    id: 'seer',
    name: '預言家',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 4,
    description: '村民陣營。夜晚可查看一名玩家的牌，或查看中間的兩張牌。',
    nightInstruction: '選擇查看一名玩家的牌，或查看中間兩張牌。',
    isAdvanced: false,
  },
  robber: {
    id: 'robber',
    name: '強盜',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 5,
    description: '村民陣營。夜晚可偷走另一名玩家的牌，與自己交換，並查看新角色。',
    nightInstruction: '可選擇偷走一名玩家的牌與自己的牌交換，並查看新角色。',
    isAdvanced: false,
  },
  troublemaker: {
    id: 'troublemaker',
    name: '搗蛋鬼',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 6,
    description: '村民陣營。夜晚可秘密交換兩名其他玩家的牌，自己不查看。',
    nightInstruction: '可選擇交換兩名其他玩家的牌，自己不能查看。',
    isAdvanced: false,
  },
  drunk: {
    id: 'drunk',
    name: '酒鬼',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 7,
    description: '村民陣營。夜晚必須將自己的牌與一張中間牌交換，不查看新角色。',
    nightInstruction: '必須將自己的牌與一張中間牌交換，不能查看換到的角色。',
    isAdvanced: false,
  },
  hunter: {
    id: 'hunter',
    name: '獵人',
    faction: 'village',
    hasNightAction: false,
    nightOrder: 0,
    description: '村民陣營。無夜晚行動。若獵人被淘汰，他指向的玩家也同時被淘汰。',
    nightInstruction: '無夜晚行動，閉眼休息。',
    isAdvanced: false,
  },
  insomniac: {
    id: 'insomniac',
    name: '失眠者',
    faction: 'village',
    hasNightAction: true,
    nightOrder: 8,
    description: '村民陣營。夜晚最後行動，查看自己目前的角色（確認牌是否被交換）。',
    nightInstruction: '查看自己手中的角色牌，確認是否在夜晚被交換。',
    isAdvanced: false,
  },
  tanner: {
    id: 'tanner',
    name: '皮匠',
    faction: 'tanner',
    hasNightAction: false,
    nightOrder: 0,
    description: '特殊陣營。無夜晚行動。只有皮匠被淘汰時，皮匠獲勝（其他人均落敗）。',
    nightInstruction: '無夜晚行動，閉眼休息。',
    isAdvanced: false,
  },
  villager: {
    id: 'villager',
    name: '村民',
    faction: 'village',
    hasNightAction: false,
    nightOrder: 0,
    description: '村民陣營。無夜晚行動，單純靠白天推理。',
    nightInstruction: '無夜晚行動，閉眼休息。',
    isAdvanced: false,
  },
} as const

export const ONW_MIN_PLAYERS = 3
export const ONW_MAX_PLAYERS = 10
export const ONW_CENTER_CARD_COUNT = 3 // 中間牌固定 3 張

export const DEFAULT_ONW_CONFIG: OnwGameConfig = {
  playerCount: 5,
  selectedRoles: ['werewolf', 'werewolf', 'seer', 'robber', 'troublemaker', 'villager', 'villager', 'villager'],
  discussionMinutes: 5,
  voteCountdownSeconds: 3,
  nightSilenceSeconds: 5,
  speechRate: 1.0,
  speechVolume: 1.0,
  musicVolume: 0.3,
  sfxVolume: 0.5,
}

// ===== Helper Functions =====

/**
 * 驗證角色組合是否合法
 * 條件：角色牌總數必須等於玩家人數 + 中間牌數量（3）
 */
export function isOnwRoleConfigValid(
  playerCount: number,
  selectedRoles: OnwRoleId[]
): boolean {
  const requiredTotal = playerCount + ONW_CENTER_CARD_COUNT
  return selectedRoles.length === requiredTotal
}

/**
 * 取得夜晚行動的角色清單（按順序排列）
 * 過濾掉沒有夜晚行動或未選入本局的角色
 */
export function getNightActionSequence(
  selectedRoles: OnwRoleId[]
): OnwRoleId[] {
  const roleSet = new Set(selectedRoles)
  return (Object.values(ONW_ROLES) as OnwRole[])
    .filter((role) => role.hasNightAction && roleSet.has(role.id))
    .sort((a, b) => a.nightOrder - b.nightOrder)
    .map((role) => role.id)
    // 去除重複（如選了兩張狼人牌，只播報一次狼人指令）
    .filter((id, index, arr) => arr.indexOf(id) === index)
}

/**
 * 判斷是否為孤狼情境
 * 場上只有一張狼人牌時，孤狼可選擇查看中間牌
 */
export function isLoneWolf(selectedRoles: OnwRoleId[]): boolean {
  return selectedRoles.filter((r) => r === 'werewolf').length === 1
}

/**
 * 判斷勝負
 */
export function determineWinner(
  voteResult: OnwVoteResult,
  allSelectedRoles: OnwRoleId[]
): OnwGameResult {
  const hasWerewolfInPlay = allSelectedRoles
    .slice(0, allSelectedRoles.length - ONW_CENTER_CARD_COUNT)
    .some((r) => r === 'werewolf')

  // 皮匠被淘汰：皮匠單獨獲勝（優先判斷）
  if (!voteResult.isTie && voteResult.eliminatedRoles.includes('tanner')) {
    return {
      winner: 'tanner',
      winReason: 'tanner_eliminated',
      voteResult,
    }
  }

  // 無人被淘汰（平票）
  if (voteResult.isTie) {
    if (!hasWerewolfInPlay) {
      // 無狼人且無人被淘汰：村民勝
      return {
        winner: 'village',
        winReason: 'no_werewolf_no_elimination',
        voteResult,
      }
    }
    // 有狼人但無人被淘汰：狼人勝
    return {
      winner: 'werewolf',
      winReason: 'no_werewolf_eliminated',
      voteResult,
    }
  }

  // 有人被淘汰
  const werewolfEliminated = voteResult.eliminatedRoles.includes('werewolf')

  if (werewolfEliminated) {
    return {
      winner: 'village',
      winReason: 'werewolf_eliminated',
      voteResult,
    }
  }

  // 被淘汰的不是狼人
  if (!hasWerewolfInPlay) {
    // 場上根本沒有狼人但有人被淘汰：狼人勝
    return {
      winner: 'werewolf',
      winReason: 'no_werewolf_but_eliminated',
      voteResult,
    }
  }

  // 場上有狼人但淘汰了非狼人：狼人勝
  return {
    winner: 'werewolf',
    winReason: 'no_werewolf_eliminated',
    voteResult,
  }
}
```

---

## 8. UI Task 清單

### 8.1 設定畫面（SetupView）

- [ ] **T-S-01**: 人數輸入元件（+/- 按鈕，範圍 3–10），即時更新需要的牌數提示 — AC: 顯示「已選 X 張，需要 Y 張（玩家數 + 3）」
- [ ] **T-S-02**: 角色列表（可勾選），分組顯示「狼人陣營 / 村民陣營 / 特殊陣營」 — AC: 勾選後牌數計數即時更新
- [ ] **T-S-03**: 角色說明彈窗，點擊角色名旁的圖示觸發 — AC: 顯示角色名稱、陣營色標、功能說明
- [ ] **T-S-04**: 推薦角色配置按鈕（依人數），點擊後自動選好建議角色 — AC: 切換人數後推薦配置自動更新
- [ ] **T-S-05**: 角色配置警告提示（無狼人、無特殊角色等）— AC: 警告以橙色橫幅顯示，不阻擋操作
- [ ] **T-S-06**: 計時設定區塊（討論時間、投票倒數、夜晚靜默等待），摺疊式設定面板 — AC: 數值即時儲存至 localStorage
- [ ] **T-S-07**: 「開始夜晚」按鈕，牌數不符時呈 disabled 狀態 — AC: 點擊前驗證合法性，合法才啟動夜晚流程

### 8.2 夜晚主持畫面（NightView）

- [ ] **T-N-01**: 夜晚氛圍背景（深藍/黑色，星空風格），顯示目前播報角色的名稱與圖示 — AC: 角色切換時有淡入動畫
- [ ] **T-N-02**: TTS 語音播報狀態指示（波形動畫或脈動圓點，Speaking / Waiting 兩種狀態）— AC: Speaking 時顯示動畫，Waiting 靜默等待時顯示倒數進度條
- [ ] **T-N-03**: 夜晚進度指示（已完成 X / 共 Y 個角色行動），非線性進度條 — AC: 每完成一個角色高亮顯示
- [ ] **T-N-04**: 控制按鈕組（暫停/繼續、跳過當前指令、重播本段）— AC: 暫停後按鈕切換為「繼續」
- [ ] **T-N-05**: 「返回設定」按鈕（需二次確認，確認後中止夜晚）— AC: 彈出確認對話框，確認後清空夜晚狀態
- [ ] **T-N-06**: iOS TTS 解鎖提示（首次進入頁面顯示「點擊開始」覆蓋層）— AC: 點擊後解鎖 TTS 並開始夜晚

### 8.3 白天討論畫面（DiscussionView）

- [ ] **T-D-01**: 大型倒數計時器（分：秒格式），畫面中央顯示 — AC: 最後 30 秒數字變紅色
- [ ] **T-D-02**: 「開始討論」按鈕，進入畫面後需手動點擊才開始計時 — AC: 點擊後按鈕切換為「暫停」
- [ ] **T-D-03**: 「跳過直接投票」按鈕 — AC: 點擊後彈出確認，確認後跳至投票畫面
- [ ] **T-D-04**: 計時結束提示（全螢幕橙色閃爍 + 音效）— AC: 計時結束後自動顯示「進入投票」按鈕

### 8.4 投票畫面（VoteView）

- [ ] **T-V-01**: 投票說明文字「討論結束，準備同時指人！」— AC: 畫面醒目大字顯示
- [ ] **T-V-02**: 投票倒數計時（大數字，3–10 秒）— AC: 點擊「開始倒數」後啟動，歸零時播報「指！」
- [ ] **T-V-03**: 倒數結束後顯示「輸入被淘汰者」按鈕 — AC: 倒數完成後才顯示此按鈕

### 8.5 結果畫面（ResultView）

- [ ] **T-R-01**: 被淘汰角色選擇介面，列出所有基礎角色供主持人選擇 — AC: 支援選擇多個角色（並列最高票情境）
- [ ] **T-R-02**: 「場上是否有狼人？」快速選擇（若主持人知道牌的分配），或「不確定」選項 — AC: 影響勝負判定邏輯（不確定時要求主持人翻牌確認）
- [ ] **T-R-03**: 「無人被淘汰（平票）」勾選選項 — AC: 勾選後角色選擇介面禁用
- [ ] **T-R-04**: 勝負結果大字展示，陣營顏色區分（村民=藍色/綠色，狼人=紅色，皮匠=橙色）— AC: 顯示 1–2 秒後再顯示 TTS 宣告文字
- [ ] **T-R-05**: 「再玩一局」按鈕（保留角色設定，返回設定畫面）與「返回大廳」按鈕 — AC: 「再玩一局」不清空 selectedRoles 和 playerCount 設定

### 8.6 歷史記錄畫面（HistoryView，P1）

- [ ] **T-H-01**: 遊戲記錄列表，依日期倒序，每筆顯示日期、人數、勝利方 — AC: 最多顯示 50 筆
- [ ] **T-H-02**: 記錄詳情彈窗，顯示本局使用的角色配置 — AC: 點擊列表項目展開

---

## 9. 成功指標

### 9.1 核心指標

| 指標 | 目標 | 追蹤方式 |
|------|------|---------|
| 夜晚流程完成率 | > 85%（開始夜晚 vs 夜晚正常結束）| IndexedDB 記錄 |
| 遊戲完成率 | > 75%（開始遊戲 vs 進入結果畫面）| IndexedDB 記錄 |
| 平均遊戲時長 | 8–15 分鐘 | IndexedDB 記錄 |
| 重複使用率 | 同設備 7 天內再玩 > 50%（快節奏特性）| IndexedDB 記錄 |

### 9.2 品質指標

| 指標 | 目標 |
|------|------|
| TTS 播報中斷率（iOS）| < 5% |
| 設定頁面配置錯誤率（牌數不符就開始）| 0%（硬性防呆）|
| 勝負判定正確率 | 100%（邏輯單元測試覆蓋所有情境）|

---

## 10. 推薦角色配置（預設值）

以下為各人數的官方推薦基礎角色配置：

| 人數 | 推薦角色（含 3 張中間牌） |
|------|--------------------------|
| 3 人 | 狼人×1、預言家×1、強盜×1、搗蛋鬼×1、村民×2（總 6 張） |
| 4 人 | 狼人×2、預言家×1、強盜×1、搗蛋鬼×1、村民×2（總 7 張） |
| 5 人 | 狼人×2、預言家×1、強盜×1、搗蛋鬼×1、村民×1、失眠者×1（總 8 張） |
| 6 人 | 狼人×2、爪牙×1、預言家×1、強盜×1、搗蛋鬼×1、酒鬼×1、村民×1（總 9 張） |
| 7 人 | 狼人×2、爪牙×1、預言家×1、強盜×1、搗蛋鬼×1、酒鬼×1、失眠者×1、村民×1（總 10 張） |
| 8 人 | 狼人×2、爪牙×1、預言家×1、強盜×1、搗蛋鬼×1、酒鬼×1、獵人×1、皮匠×1、村民×1（總 11 張） |
| 9 人 | 狼人×2、爪牙×1、預言家×1、強盜×1、搗蛋鬼×1、酒鬼×1、獵人×1、皮匠×1、失眠者×1、村民×1（總 12 張） |
| 10 人 | 狼人×2、爪牙×1、預言家×1、強盜×1、搗蛋鬼×1、酒鬼×1、獵人×1、皮匠×1、失眠者×1、村民×2（總 13 張） |

---

## 11. 開發里程碑

### P0 核心功能（MVP）

| 任務 | 說明 |
|------|------|
| `src/types/one-night-werewolf.ts` | TypeScript 類型定義與 Helper Functions |
| `src/stores/one-night-werewolf.ts` | Pinia Store（遊戲狀態管理）|
| `src/composables/useOnwNight.ts` | 夜晚語音主持邏輯 |
| `src/features/one-night-werewolf/views/OnwSetupView.vue` | 設定畫面 |
| `src/features/one-night-werewolf/views/OnwNightView.vue` | 夜晚主持畫面 |
| `src/features/one-night-werewolf/views/OnwDiscussionView.vue` | 討論計時畫面 |
| `src/features/one-night-werewolf/views/OnwVoteView.vue` | 投票計時畫面 |
| `src/features/one-night-werewolf/views/OnwResultView.vue` | 結果輸入與宣告畫面 |
| 單元測試：`determineWinner()` | 覆蓋所有勝負情境（100% 覆蓋率）|
| 單元測試：`getNightActionSequence()` | 覆蓋各種角色組合排序 |

### P1 增強功能

| 任務 | 說明 |
|------|------|
| `src/features/one-night-werewolf/views/OnwHistoryView.vue` | 歷史記錄畫面 |
| 音效整合（夜晚 BGM、投票音效、勝利音效）| 使用 Howler.js |
| 角色說明彈窗元件 | `OnwRoleInfoCard.vue` |
| 仿製者（Doppelganger）完整支援 | 第二次夜晚行動邏輯 |

### P2 可選優化

| 任務 | 說明 |
|------|------|
| 推薦角色配置一鍵設定 | 依人數自動填入推薦角色 |
| 夜晚動畫（角色圖示依序出現）| Lottie-web 動畫 |
| 多語言支援準備（i18n 抽取字串）| 為後續英文版預留 |

---

**END OF DOCUMENT**
