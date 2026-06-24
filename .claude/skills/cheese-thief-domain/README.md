# BoardGame Voice Host Domain Knowledge

> **專案特定知識**: 桌遊語音主持人 App 的領域知識

## 專案概述

桌遊語音主持人是一款為桌遊（狼人殺、阿瓦隆、風聲等）提供自動化語音主持服務的 App。玩家不再需要專人擔任主持人，App 會自動分配角色、播放語音腳本、管理遊戲流程與計時。

### 技術棧
- **前端**: Flutter 3.x + Riverpod
- **後端**: Supabase (PostgreSQL + Edge Functions)
- **架構**: Clean Architecture
- **特性**: 離線優先 (Offline-first)，遊戲模板本地快取

### 目標用戶
- 桌遊愛好者（不想浪費一個玩家當主持人）
- 桌遊新手（不熟悉遊戲規則，需要引導）
- 桌遊聚會組織者（快速開局、標準化流程）
- 線上/線下桌遊社群

## 核心功能域

### 1. 遊戲場次 (Game Session)

**遊戲場次生命週期**:
```
建立場次 → 玩家加入 → 設定角色 → 開始遊戲 → (夜晚 → 白天 → 投票) 循環 → 遊戲結束
```

**遊戲狀態機**:
```
                    ┌──────────┐
                    │  LOBBY   │  玩家加入/離開
                    └────┬─────┘
                         │ 房主按「開始」
                         ▼
                    ┌──────────┐
                    │  SETUP   │  角色分配、規則確認
                    └────┬─────┘
                         │ 所有玩家確認
                         ▼
                    ┌──────────┐
              ┌────▶│  NIGHT   │  語音播報夜晚流程
              │     └────┬─────┘
              │          │ 所有夜晚角色行動完畢
              │          ▼
              │     ┌──────────┐
              │     │   DAY    │  語音播報天亮、昨夜結果
              │     └────┬─────┘
              │          │ 討論時間結束
              │          ▼
              │     ┌──────────┐
              │     │  VOTE    │  投票驅逐
              │     └────┬─────┘
              │          │
              │          ▼
              │     ┌──────────────┐
              │     │ 勝負判定      │
              │     └──┬───────┬───┘
              │        │       │
              │    繼續遊戲   遊戲結束
              │        │       │
              └────────┘       ▼
                          ┌──────────┐
                          │  ENDED   │  顯示結果、角色揭曉
                          └──────────┘
```

**狀態轉換規則**:
- LOBBY → SETUP: 玩家人數滿足遊戲模板最低要求
- SETUP → NIGHT: 所有玩家確認角色（僅自己可見）
- NIGHT → DAY: 所有夜晚行動角色完成動作或計時器到期
- DAY → VOTE: 討論計時器到期或房主手動觸發
- VOTE → NIGHT: 投票完成且遊戲未結束
- VOTE → ENDED: 滿足勝利條件（如好人全滅/狼人全滅）
- 任何狀態 → ENDED: 房主強制結束

### 2. 語音主持 (Voice Narration)

**語音腳本系統**:
每個遊戲模板包含一套語音腳本，按遊戲階段觸發播放。

```
腳本結構:
├── 開場白 (game_start)
├── 夜晚階段 (night_phase)
│   ├── 「天黑請閉眼」
│   ├── 角色 A 行動語音
│   ├── 角色 B 行動語音
│   └── ...（依角色順序）
├── 白天階段 (day_phase)
│   ├── 「天亮了」
│   ├── 昨夜結果播報
│   └── 「請開始討論」
├── 投票階段 (vote_phase)
│   ├── 「投票開始」
│   └── 「投票結束，結果是...」
└── 結束語 (game_end)
    ├── 好人陣營勝利
    └── 狼人陣營勝利
```

**語音播放流程**:
1. 根據當前 GamePhase 取得對應腳本
2. 按順序播放語音片段
3. 在需要玩家互動的節點暫停
4. 等待玩家動作或計時器到期後繼續

### 3. 遊戲模板 (Game Template)

**內建模板**:
| 遊戲 | 最少人數 | 最多人數 | 角色數 |
|------|---------|---------|--------|
| 狼人殺 (基礎版) | 6 | 12 | 4 |
| 狼人殺 (進階版) | 8 | 18 | 8+ |
| 阿瓦隆 | 5 | 10 | 5 |
| 風聲 | 3 | 9 | 4 |

**自訂模板**: 進階用戶可自訂角色組合與語音腳本。

### 4. 玩家管理 (Player Management)

**玩家狀態**:
- ALIVE: 存活
- ELIMINATED: 被淘汰（投票驅逐或夜晚死亡）
- DISCONNECTED: 斷線（離線模式不適用）

**座位系統**: 玩家有固定座位號，用於投票和角色行動指示。

### 5. 計時器 (Timer)

**計時器類型**:
| 類型 | 預設時間 | 說明 |
|------|---------|------|
| 夜晚行動 | 30 秒 | 每個角色的行動時間 |
| 白天討論 | 5 分鐘 | 自由討論階段 |
| 個人發言 | 1.5 分鐘 | 輪流發言時間 |
| 投票倒數 | 15 秒 | 投票決定時間 |
| 遺言時間 | 30 秒 | 被淘汰者發言 |

**可配置**: 房主可在 LOBBY 階段調整各計時器時長。

## 資料模型

### 核心 Entity

```dart
// 遊戲模板
class GameTemplate {
  final String id;
  final String name;             // 如「狼人殺基礎版」
  final String description;
  final int minPlayers;
  final int maxPlayers;
  final List<RoleConfig> roles;  // 可用角色配置
  final List<VoiceScript> scripts; // 語音腳本
  final TimerConfig timerConfig; // 預設計時器設定
  final bool isBuiltIn;          // 是否為內建模板
  final DateTime createdAt;
}

// 遊戲場次
class GameSession {
  final String id;
  final String templateId;
  final String hostUserId;       // 房主
  final GamePhase currentPhase;
  final int currentRound;        // 當前回合數
  final List<Player> players;
  final Map<String, String> roleAssignments; // playerId → roleId
  final TimerConfig timerConfig;
  final DateTime createdAt;
  final DateTime? endedAt;
}

// 玩家
class Player {
  final String id;
  final String sessionId;
  final String userId;
  final String displayName;
  final int seatNumber;
  final PlayerStatus status;     // ALIVE / ELIMINATED / DISCONNECTED
  final String? eliminationReason;
}

// 角色
class Role {
  final String id;
  final String templateId;
  final String name;             // 如「狼人」「預言家」
  final String faction;          // 陣營：werewolf / villager / neutral
  final String description;
  final bool hasNightAction;     // 夜晚是否有行動
  final int nightActionOrder;    // 夜晚行動順序
}

// 語音腳本
class VoiceScript {
  final String id;
  final String templateId;
  final GamePhase phase;
  final int sequenceOrder;
  final String textContent;      // 腳本文字
  final String? audioAssetPath;  // 音檔路徑
  final Duration? pauseAfter;    // 播放後暫停時間
  final bool waitForAction;      // 是否等待玩家動作
}

// 遊戲階段
enum GamePhase {
  lobby,
  setup,
  night,
  day,
  vote,
  ended,
}

// 玩家狀態
enum PlayerStatus {
  alive,
  eliminated,
  disconnected,
}

// 計時器設定
class TimerConfig {
  final Duration nightActionTime;
  final Duration dayDiscussionTime;
  final Duration personalSpeechTime;
  final Duration voteCountdown;
  final Duration lastWordsTime;
}
```

### 資料庫 Schema

```sql
-- 核心表
game_templates       -- 遊戲模板（狼人殺、阿瓦隆等）
roles                -- 角色定義（狼人、預言家等）
voice_scripts        -- 語音腳本
game_sessions        -- 遊戲場次
players              -- 場次中的玩家
game_actions         -- 遊戲行動記錄（夜晚行動、投票等）
user_profiles        -- 用戶擴展資料

-- 關聯
roles.template_id → game_templates.id
voice_scripts.template_id → game_templates.id
game_sessions.template_id → game_templates.id
players.session_id → game_sessions.id
game_actions.session_id → game_sessions.id
game_actions.player_id → players.id
```

## UI/UX 設計原則

### 視覺風格

| 用途 | 設計方向 | 理由 |
|------|---------|------|
| 主題 | 深色主題為主 | 營造桌遊夜晚氛圍 |
| 主色調 | 深紫/暗藍 | 神秘感、沉浸感 |
| 強調色 | 金色/琥珀色 | 高貴感、重要資訊突出 |
| 危險/淘汰 | 暗紅色 | 直覺辨識 |
| 安全/存活 | 翠綠色 | 清晰的狀態區分 |

### 遊戲狀態視覺設計

| 階段 | 背景色調 | 氛圍 |
|------|---------|------|
| LOBBY | 溫暖中性 | 社交、輕鬆 |
| NIGHT | 深藍/暗紫 | 神秘、緊張 |
| DAY | 暖光漸亮 | 活躍、討論 |
| VOTE | 高對比 | 緊迫、決斷 |
| ENDED | 金色/灰色 | 慶祝或落幕 |

### 關鍵互動

1. **快速建房**: 選模板 → 設定人數 → 分享房間碼
2. **角色查看**: 隱私保護，僅顯示自己的角色（翻牌動畫）
3. **夜晚行動**: 簡潔的選擇介面，配合語音指引
4. **投票**: 清晰的候選人列表，倒數計時醒目
5. **結果揭曉**: 所有角色翻開，勝負動畫

### 資訊層級

- 最重要：當前遊戲階段 + 計時器
- 次重要：存活玩家列表 + 自己的角色
- 補充：歷史行動記錄、遊戲規則提示

## 語音播報流程

### 標準狼人殺夜晚流程

```
1. 播放：「天黑請閉眼」
2. 播放：「狼人請睜眼」
   → 等待狼人選擇目標（或計時器到期）
3. 播放：「狼人請閉眼」
4. 播放：「預言家請睜眼」
   → 等待預言家查驗（或計時器到期）
5. 播放：「預言家請閉眼」
6. 播放：「女巫請睜眼」
   → 等待女巫行動（或計時器到期）
7. 播放：「女巫請閉眼」
8. 播放：「天亮了，昨晚 [X號玩家] 被淘汰」（或「昨晚是平安夜」）
```

### 語音資源管理

- 內建模板語音：打包在 App assets 中
- 自訂模板語音：使用 TTS (Text-to-Speech) 即時生成
- 語音語言：支援繁體中文、簡體中文、英文

## 離線策略

### 優先級

| 功能 | 離線支援 | 說明 |
|------|---------|------|
| 瀏覽模板 | 完全支援 | 模板本地快取 |
| 建立場次 | 完全支援 | 純本地運算 |
| 遊戲進行 | 完全支援 | 狀態機本地運行 |
| 語音播放 | 完全支援 | 音檔本地快取或 TTS |
| 計時器 | 完全支援 | 本地計時 |
| 遊戲歷史 | 部分支援 | 使用快取資料 |
| 模板同步 | 需要網路 | 下載新模板/更新 |
| 多裝置同步 | 需要網路 | 跨裝置場次需即時通訊 |

### 快取策略

```
1. 首次啟動時下載所有內建模板 + 語音資源
2. 遊戲模板存入 Hive/Drift 本地資料庫
3. 語音檔案快取至本地檔案系統
4. 遊戲場次資料完全在本地運行
5. 有網路時同步遊戲歷史至 Supabase
```

## 測試重點

### 關鍵邊界條件

1. **遊戲狀態機**
   - 所有合法狀態轉換路徑
   - 非法狀態轉換應被拒絕（如 LOBBY 直接到 VOTE）
   - 房主強制結束在各階段的行為
   - 所有玩家斷線時的處理
   - 回合數正確遞增

2. **角色分配隨機性**
   - 分配結果覆蓋所有角色
   - 多次分配的統計分布合理
   - 角色數量與玩家數量匹配
   - 各陣營人數符合模板規則
   - 不會出現重複分配

3. **計時器精確度**
   - 計時器啟動/暫停/恢復行為
   - 到期觸發的回調正確
   - 背景/前景切換時計時器不漂移
   - 多個計時器同時運行的隔離性
   - 零秒和極端時長邊界

4. **語音播放序列**
   - 腳本播放順序嚴格正確
   - 等待玩家動作的暫停/恢復
   - 音檔缺失時的 fallback（TTS）
   - 播放中切換遊戲階段的處理
   - 並發播放防止

5. **玩家淘汰邏輯**
   - 投票平票處理
   - 夜晚多重死亡（狼人殺 + 女巫毒）
   - 淘汰後不能再行動
   - 勝負條件判定（好人全滅/狼人全滅）
   - 最後存活人數邊界

6. **離線快取**
   - 模板資料完整性
   - 語音檔案快取命中/未命中
   - 離線場次資料持久化
   - 網路恢復時歷史同步
