# Cheese-Thief UI/UX 設計規範文檔

> **UI/UX Designer 產出**
>
> **專案**: Cheese-Thief - 戒食習慣養成 App
>
> **設計理念**: 正向心理設計
>
> **版本**: v1.0
>
> **更新日期**: 2026-02-12

---

## 目錄

1. [設計哲學](#設計哲學)
2. [Design System 設計規範](#design-system-設計規範)
3. [核心頁面 UI Tasks](#核心頁面-ui-tasks)
4. [互動流程圖](#互動流程圖)
5. [正向心理設計](#正向心理設計)
6. [元件狀態設計](#元件狀態設計)
7. [無障礙設計](#無障礙設計)

---

## 設計哲學

### 研究基礎

1. **Nielsen Norman Group 眼動追蹤研究**: 用戶在螢幕左側花費 69% 更多時間
2. **Fitts's Law**: 目標越大、距離越近 = 點擊越快
3. **Hick's Law**: 選項過多導致決策疲勞，限制在 5-7 個選項
4. **PERMA 正向心理模型**: 強調成就感、正向情緒、意義感

### 設計原則

| 原則 | 說明 | 應用 |
|------|------|------|
| 左側優先 | 重要元素靠左放置 | 導航、戒食天數、主要 CTA |
| 正向框架 | 永遠用正向語言 | 「已堅持 X 天」而非「還要 Y 天」 |
| 低認知負荷 | 減少決策點 | 單一主要 CTA、預設選項 |
| 即時回饋 | 每個動作都有視覺回饋 | 微動畫、狀態變化 |
| 容錯設計 | 允許錯誤並提供恢復路徑 | 確認對話框、撤銷功能 |

---

## Design System 設計規範

### 1. 色彩系統

色彩選擇應根據功能需求自由設計，以下為結構參考：

```dart
// lib/core/theme/app_colors.dart

class AppColors {
  // ========== 主色調 - 根據設計需求定義 ==========
  static const Color primary = Color(/* 設計決定 */);
  static const Color primaryLight = Color(/* 設計決定 */);
  static const Color primaryDark = Color(/* 設計決定 */);
  static const Color primarySurface = Color(/* 設計決定 */);

  // ========== 背景色 ==========
  static const Color background = Color(/* 設計決定 */);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(/* 設計決定 */);

  // ========== 文字色 ==========
  static const Color textPrimary = Color(/* 設計決定 */);
  static const Color textSecondary = Color(/* 設計決定 */);
  static const Color textTertiary = Color(/* 設計決定 */);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // ========== 語義色 ==========
  static const Color success = Color(/* 綠色系 */);
  static const Color successLight = Color(/* 淺綠色系 */);
  static const Color warning = Color(/* 橙/黃色系 */);
  static const Color warningLight = Color(/* 淺橙色系 */);
  static const Color error = Color(/* 紅色系 */);
  static const Color errorLight = Color(/* 淺紅色系 */);
  static const Color info = Color(/* 藍色系 */);
  static const Color infoLight = Color(/* 淺藍色系 */);

  // ========== 渴望強度色階 ==========
  // 從綠色（低強度）漸變到紅色（高強度）
  static const List<Color> cravingIntensityColors = [
    Color(/* 1 - 輕微 - 綠色系 */),
    Color(/* 2 */),
    Color(/* 3 */),
    Color(/* 4 */),
    Color(/* 5 - 中等 - 黃/橙色系 */),
    Color(/* 6 */),
    Color(/* 7 */),
    Color(/* 8 */),
    Color(/* 9 */),
    Color(/* 10 - 強烈 - 紅色系 */),
  ];
}
```

#### 色彩對比度要求

| 組合 | 最低對比度 | WCAG 標準 |
|------|-----------|-----------|
| 正文文字/背景 | 4.5:1 | AA |
| 大型文字/背景 | 3:1 | AA |
| UI 元件/背景 | 3:1 | AA |

#### 深色模式

必須支援深色模式，建議使用非純黑背景以減少視覺疲勞。

---

### 2. 字體規範

```dart
// lib/core/theme/app_typography.dart

class AppTypography {
  static const String fontFamilyPrimary = 'Noto Sans TC';
  static const String fontFamilyMono = 'JetBrains Mono';

  // ========== 標題樣式 ==========
  static const TextStyle displayLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 57,
    fontWeight: FontWeight.w700,
    height: 1.12,
  );

  static const TextStyle headlineLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 32,
    fontWeight: FontWeight.w600,
    height: 1.25,
  );

  static const TextStyle titleLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 22,
    fontWeight: FontWeight.w500,
    height: 1.27,
  );

  static const TextStyle titleMedium = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 16,
    fontWeight: FontWeight.w500,
    height: 1.5,
  );

  // ========== 內文樣式 ==========
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 16,
    fontWeight: FontWeight.w400,
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: fontFamilyPrimary,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    height: 1.43,
  );

  // ========== 數字專用樣式 ==========
  static const TextStyle heroNumber = TextStyle(
    fontFamily: fontFamilyMono,
    fontSize: 72,
    fontWeight: FontWeight.w700,
    height: 1.0,
  );

  static const TextStyle statNumber = TextStyle(
    fontFamily: fontFamilyMono,
    fontSize: 32,
    fontWeight: FontWeight.w600,
    height: 1.2,
  );
}
```

---

### 3. 間距系統 (8pt Grid)

```dart
// lib/core/theme/app_spacing.dart

class AppSpacing {
  static const double unit = 8.0;

  static const double xs = 4;    // 0.5 unit
  static const double sm = 8;    // 1 unit
  static const double md = 12;   // 1.5 unit
  static const double lg = 16;   // 2 unit
  static const double xl = 24;   // 3 unit
  static const double xxl = 32;  // 4 unit
  static const double xxxl = 48; // 6 unit

  // 頁面間距
  static const double pageHorizontal = 16;
  static const double pageTop = 24;
  static const double pageBottom = 32;

  // 卡片間距
  static const double cardPadding = 16;
  static const double cardMargin = 12;
}
```

---

### 4. 圓角規範

```dart
// lib/core/theme/app_radius.dart

class AppRadius {
  static const double xs = 4;    // 小型元件
  static const double sm = 8;    // 按鈕、輸入框
  static const double md = 12;   // 卡片、對話框
  static const double lg = 16;   // 大型卡片
  static const double xl = 24;   // 特殊強調
  static const double full = 999; // 圓形

  static const BorderRadius radiusSm = BorderRadius.all(Radius.circular(sm));
  static const BorderRadius radiusMd = BorderRadius.all(Radius.circular(md));
  static const BorderRadius radiusLg = BorderRadius.all(Radius.circular(lg));
}
```

---

### 5. 陰影規範

```dart
// lib/core/theme/app_shadows.dart

class AppShadows {
  static const List<BoxShadow> sm = [
    BoxShadow(
      color: Color(0x0A000000),
      offset: Offset(0, 1),
      blurRadius: 3,
    ),
  ];

  static const List<BoxShadow> md = [
    BoxShadow(
      color: Color(0x0F000000),
      offset: Offset(0, 4),
      blurRadius: 6,
    ),
  ];

  static const List<BoxShadow> lg = [
    BoxShadow(
      color: Color(0x19000000),
      offset: Offset(0, 10),
      blurRadius: 15,
    ),
  ];

  static const List<BoxShadow> primaryButton = [
    BoxShadow(
      color: Color(0x338B9EB7),
      offset: Offset(0, 4),
      blurRadius: 12,
    ),
  ];
}
```

---

### 6. 動畫規範

```dart
// lib/core/theme/app_animations.dart

class AppAnimations {
  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 250);
  static const Duration slow = Duration(milliseconds: 350);

  static const Curve standard = Curves.easeInOut;
  static const Curve emphasized = Curves.easeOutBack;
  static const Curve bounce = Curves.elasticOut;
}
```

---

## 核心頁面 UI Tasks

### 頁面 1: 首頁 (Home)

#### 頁面結構

```
+------------------------------------------+
|  Cheese-Thief                    [通知] [設定] |
+------------------------------------------+
|                                          |
|       已堅持                              |
|       27                                 |
|       天                                 |
|                                          |
|  "你的堅持，正在改變自己"                   |
|                                          |
+------------------------------------------+
|  [================ 今日打卡 ===============]|
+------------------------------------------+
|  快速操作                                 |
|  +------------+  +------------+          |
|  | 渴望來襲   |  | 今日心情   |          |
|  +------------+  +------------+          |
+------------------------------------------+
|  本週概覽                                 |
|  一  二  三  四  五  六  日               |
|  ✓   ✓   ✓   ◯   -   -   -             |
+------------------------------------------+
|  下一個里程碑                             |
|  [=========>          ] 30天冠軍          |
+------------------------------------------+
| [首頁] [渴望] [成就] [社群] [我的]          |
+------------------------------------------+
```

#### UI Tasks

| Task ID | 任務描述 | 優先級 | 驗收標準 |
|---------|----------|--------|----------|
| HOME-001 | 戒食天數英雄區塊 | P0 | 數字 JetBrains Mono 72px，支援 999+ |
| HOME-002 | 每日打卡按鈕 | P0 | 未打卡：填充；已打卡：外框 + 勾選 |
| HOME-003 | 鼓勵文案區塊 | P0 | 根據天數動態變化 |
| HOME-004 | 快速操作區塊 | P0 | 觸控目標 >= 48x48pt |
| HOME-005 | 本週打卡概覽 | P1 | 顯示 7 天，可補打卡 |
| HOME-006 | 下一個里程碑進度條 | P1 | 百分比動畫 |
| HOME-007 | 首次進入空狀態 | P0 | 引導開始旅程 |
| HOME-008 | 底部導航列 | P0 | 5 項，當前高亮 |

---

### 頁面 2: 渴望記錄頁 (Craving)

#### 頁面結構

```
+------------------------------------------+
|  ←  渴望記錄                              |
+------------------------------------------+
|  現在的渴望強度是？                         |
|                                          |
|  [====|=====]  7/10                      |
|   輕微      強烈                          |
+------------------------------------------+
|  是什麼觸發了渴望？（可多選）                |
|                                          |
|  +----------+  +----------+              |
|  |   壓力   |  |   無聊   |              |
|  +----------+  +----------+              |
|  +----------+  +----------+              |
|  |  社交場合 |  |   悲傷   |              |
|  +----------+  +----------+              |
|  +----------+  +----------+              |
|  |   疲勞   |  | 習慣時間  |              |
|  +----------+  +----------+              |
+------------------------------------------+
|  備註（選填）                              |
|  +--------------------------------------+|
|  |  例如：下午茶時間經過飲料店...          ||
|  +--------------------------------------+|
+------------------------------------------+
|  [================ 記錄渴望 ===============]|
|  [我成功抵抗了！]                          |
+------------------------------------------+
```

#### UI Tasks

| Task ID | 任務描述 | 優先級 | 驗收標準 |
|---------|----------|--------|----------|
| CRAV-001 | 渴望強度滑桿 | P0 | 範圍 1-10，顏色隨強度變化 |
| CRAV-002 | 觸發因素選擇 | P0 | 6 個預設 + 自訂，可多選 |
| CRAV-003 | 備註輸入框 | P1 | 多行，最多 200 字 |
| CRAV-004 | 記錄渴望按鈕 | P0 | 提交後顯示應對策略 |
| CRAV-005 | 成功抵抗按鈕 | P0 | 觸發策略選擇 |
| CRAV-006 | 強度描述文字 | P0 | 1-3 輕微、4-6 中等、7-10 強烈 |
| CRAV-007 | 應對策略建議彈窗 | P0 | 根據觸發因素推薦 |

---

### 頁面 3: 成就館 (Achievement)

#### UI Tasks

| Task ID | 任務描述 | 優先級 | 驗收標準 |
|---------|----------|--------|----------|
| ACHV-001 | 總成就進度卡片 | P0 | 已解鎖/總數，進度條動畫 |
| ACHV-002 | 成就徽章網格 | P0 | 3 列，已解鎖/未解鎖明確 |
| ACHV-003 | 成就詳情彈窗 | P1 | 名稱、描述、解鎖日期 |
| ACHV-004 | 成就分類標籤 | P1 | 里程碑、行為分類 |
| ACHV-005 | 成就解鎖動畫 | P0 | 粒子效果，3 秒自動關閉 |
| ACHV-006 | 空狀態設計 | P0 | 鼓勵開始旅程 |

---

### 頁面 4: 個人中心 (Profile)

#### UI Tasks

| Task ID | 任務描述 | 優先級 | 驗收標準 |
|---------|----------|--------|----------|
| PROF-001 | 用戶資訊卡片 | P0 | 頭像、開始日期、累計天數 |
| PROF-002 | 統計概覽網格 | P0 | 4 個關鍵數據卡片 |
| PROF-003 | 心情趨勢圖表 | P1 | 過去 7 天折線圖 |
| PROF-004 | 設定列表 | P0 | 統一列表樣式 |
| PROF-005 | 每日提醒設定 | P1 | 開關 + 時間選擇 |
| PROF-006 | 外觀設定 | P2 | 淺色/深色/跟隨系統 |
| PROF-007 | 匯出報告 | P2 | Premium，PDF 格式 |

---

### 頁面 5: 社群頁 (Community)

#### UI Tasks

| Task ID | 任務描述 | 優先級 | 驗收標準 |
|---------|----------|--------|----------|
| COMM-001 | 動態卡片 | P2 | 匿名用戶、時間、內容、互動 |
| COMM-002 | 動態列表 | P2 | 無限滾動、下拉刷新 |
| COMM-003 | 點讚功能 | P2 | 動畫回饋、樂觀更新 |
| COMM-004 | 發布動態 | P2 | 200 字限制 |
| COMM-005 | Premium 鎖定畫面 | P1 | 清晰說明價值 |
| COMM-006 | 檢舉功能 | P2 | 長按選單 |
| COMM-007 | 空狀態設計 | P2 | 引導發布 |

---

## 互動流程圖

### 流程 1: 每日打卡流程

```
用戶開啟 App
    ↓
今天是否已打卡？
    ↓ 否                    ↓ 是
顯示打卡按鈕            顯示已完成狀態
    ↓
點擊打卡
    ↓
選擇心情
    ↓
添加備註？ → 是 → 輸入備註
    ↓ 否              ↓
提交打卡 ←────────────┘
    ↓
離線？ → 是 → 儲存本地，標記待同步
    ↓ 否
發送至 Supabase
    ↓
顯示成功動畫
    ↓
解鎖新成就？ → 是 → 顯示成就解鎖動畫
    ↓ 否
更新首頁狀態
```

### 流程 2: 渴望記錄流程

```
點擊「渴望來襲」
    ↓
調整渴望強度滑桿
    ↓
選擇觸發因素
    ↓
添加備註（選填）
    ↓
選擇提交方式
    ↓ 記錄渴望            ↓ 我成功抵抗了
提交渴望記錄          選擇使用的應對策略
    ↓                     ↓
顯示應對策略建議      顯示正向鼓勵
    ↓                     ↓
返回首頁 ←────────────────┘
```

### 流程 3: 復發處理流程

```
點擊記錄復發
    ↓
顯示確認對話框
「這不是失敗，而是學習的機會」
    ↓ 確認               ↓ 取消
記錄復發原因          返回首頁
    ↓
結束當前旅程
    ↓
顯示正向鼓勵頁面
    ↓
7天內連續復發 >= 3次？
    ↓ 是                  ↓ 否
顯示額外關懷          顯示重新開始按鈕
提供專業資源              ↓
    ↓                     ↓
建立新旅程 ←──────────────┘
```

---

## 正向心理設計

### 1. 鼓勵式文案（根據天數）

| 天數範圍 | 文案 |
|----------|------|
| 第 1 天 | 「第一步，就是最勇敢的一步」 |
| 第 2-3 天 | 「你正在建立新的自己」 |
| 第 4-7 天 | 「每一天的堅持，都在累積力量」 |
| 第 8-14 天 | 「你已經證明了自己的決心」 |
| 第 15-30 天 | 「習慣正在養成，你做得很棒」 |
| 第 31-60 天 | 「這已經成為你的新常態」 |
| 第 61-90 天 | 「兩個月了！你是自己的英雄」 |
| 90+ 天 | 「你的堅持，正在改變自己的人生」 |

### 2. 渴望抵抗成功文案

| 場景 | 文案 |
|------|------|
| 首次抵抗 | 「太棒了！這是重要的第一次勝利」 |
| 低強度抵抗 | 「輕鬆處理！你越來越強了」 |
| 中強度抵抗 | 「這次挑戰不簡單，但你做到了」 |
| 高強度抵抗 | 「這是一場硬仗，你贏了！」 |
| 連續 3 次 | 「三連勝！你正在掌控渴望」 |
| 連續 7 次 | 「一週內 7 次成功！你是渴望剋星」 |

### 3. 打卡完成文案

| 心情 | 文案 |
|------|------|
| Great | 「太棒了！保持這份好心情」 |
| Good | 「不錯的一天，繼續加油」 |
| Okay | 「平穩的一天也是進步」 |
| Tough | 「今天不容易，但你還是堅持了」 |
| Struggling | 「掙扎中仍然打卡，這就是勇氣」 |

### 4. 復發時的溫柔介面

**確認對話框文案**:
```
確定要記錄復發嗎？

這不是失敗，而是學習的機會。
你的歷史記錄會被保留，
隨時可以重新開始。

[取消]  [確定]
```

**復發後鼓勵頁面**:
```
🌱

重新開始也是勇氣

你已經堅持了 27 天
這段時間的努力不會白費

[你的成就：✓ 第一步 · ✓ 堅持三天 · ✓ 一週達人]

每一次嘗試，都讓你更了解自己。
準備好的時候，我們再一起出發。

[重新開始]

稍後再說
```

---

## 元件狀態設計

### 1. 按鈕狀態

#### Primary Button

| 狀態 | 背景色 | 文字色 | 陰影 |
|------|--------|--------|------|
| Default | primary | textOnPrimary | primaryButton |
| Hover | primaryLight | textOnPrimary | md |
| Pressed | primaryDark | textOnPrimary | none |
| Loading | primary | - | sm |
| Disabled | primary 50% | textOnPrimary | none |

#### Secondary Button

| 狀態 | 背景色 | 文字色 | 邊框 |
|------|--------|--------|------|
| Default | transparent | primary | primary 1px |
| Hover | primarySurface | primary | primary 1px |
| Pressed | primarySurface | primaryDark | primaryDark 2px |
| Disabled | transparent | primary 50% | primary 50% 1px |

### 2. 輸入框狀態

| 狀態 | 背景色 | 邊框 | 標籤色 |
|------|--------|------|--------|
| Default | surface | surfaceVariant 1px | textSecondary |
| Focused | surface | primary 2px | primary |
| Filled | surface | surfaceVariant 1px | textSecondary |
| Error | errorLight | error 2px | error |
| Disabled | surfaceVariant | none | textTertiary |

### 3. 卡片狀態

| 狀態 | 背景色 | 陰影 | Transform |
|------|--------|------|-----------|
| Default | surface | sm | none |
| Hover | surface | md | translateY(-2) |
| Pressed | surfaceVariant | none | none |
| Selected | primarySurface | sm | none |

### 4. 空狀態設計

```dart
EmptyState(
  icon: AppIcons.target,
  title: '開始你的戒食旅程',
  description: '選擇一個想要戒除的食物，\n我們會陪伴你度過這段旅程。',
  actionLabel: '開始旅程',
  onAction: () => Navigator.pushNamed(context, '/new-journey'),
);
```

### 5. 載入狀態 (Skeleton)

使用 Shimmer 效果顯示載入中狀態：
- 基底色: surfaceVariant
- 高亮色: background
- 動畫時長: 1.5 秒循環

---

## 無障礙設計

### 1. 觸控目標規範

| 元件類型 | 最小觸控區域 | Cheese-Thief 實作 |
|----------|-------------|---------------|
| 按鈕 | 44x44pt | 48x48pt |
| 圖示按鈕 | 44x44pt | 48x48pt |
| 列表項 | 44pt 高度 | 56pt 高度 |
| 滑桿軌道 | 44pt 高度 | 48pt 高度 |
| 導航項目 | 44x44pt | 56pt 高度 |

### 2. 色彩對比度

| 使用場景 | 對比度要求 | Cheese-Thief 實作 |
|----------|-----------|---------------|
| 正文文字 | >= 4.5:1 | 11.2:1 |
| 大型文字 | >= 3:1 | 5.1:1 |
| UI 元件 | >= 3:1 | 3.2:1 |

### 3. 螢幕閱讀器支援

```dart
// 為所有互動元素提供語義標籤
Semantics(
  label: '今日打卡按鈕，點擊完成每日打卡',
  button: true,
  child: PrimaryButton(
    label: '今日打卡',
    onPressed: _handleCheckin,
  ),
);

// 為進度數值提供說明
Semantics(
  label: '已堅持 27 天',
  value: '27',
  child: HeroDaysCounter(days: 27),
);
```

### 4. 動畫減少模式

```dart
// 檢測系統動畫偏好
final reduceMotion = MediaQuery.of(context).disableAnimations;

AnimatedContainer(
  duration: reduceMotion ? Duration.zero : AppAnimations.normal,
  // ...
);
```

### 5. 文字縮放支援

- 支援至少 1.5x 文字縮放
- 使用 Flexible 佈局適應縮放
- 避免固定高度容器

---

## 設計驗收標準

### 視覺設計

- [ ] 所有顏色使用 AppColors 定義
- [ ] 所有文字使用 AppTypography 定義
- [ ] 所有間距使用 AppSpacing 定義
- [ ] 所有圓角使用 AppRadius 定義
- [ ] 深色模式完整支援
- [ ] 響應式設計（320px - 428px）

### 互動設計

- [ ] 觸控目標 >= 48x48pt
- [ ] 所有按鈕有 hover/pressed 狀態
- [ ] 非同步操作有 loading 狀態
- [ ] 錯誤有清晰提示與恢復路徑
- [ ] 無資料有引導性空狀態
- [ ] 動畫 60fps

### 無障礙設計

- [ ] 色彩對比度 >= 3:1 (UI) / 4.5:1 (文字)
- [ ] VoiceOver/TalkBack 可正確朗讀
- [ ] 所有互動元素有 Semantics label
- [ ] 支援動畫減少模式
- [ ] 支援 1.5x 文字縮放

### 正向心理設計

- [ ] 無負面、責備性語言
- [ ] 復發流程溫和、鼓勵
- [ ] 成就解鎖有慶祝動畫
- [ ] 空狀態文案正向、引導性
- [ ] 錯誤訊息提供解決方案

---

## 附錄

### A. 成就定義清單

| ID | 名稱 | 類型 | 解鎖條件 |
|----|------|------|----------|
| first_day | 第一步 | 里程碑 | 完成第 1 天 |
| three_days | 堅持三天 | 里程碑 | 完成第 3 天 |
| one_week | 一週達人 | 里程碑 | 完成第 7 天 |
| two_weeks | 半月之星 | 里程碑 | 完成第 14 天 |
| one_month | 月度冠軍 | 里程碑 | 完成第 30 天 |
| three_months | 季度英雄 | 里程碑 | 完成第 90 天 |
| first_resist | 首次抵抗 | 行為 | 首次成功抵抗渴望 |
| craving_master | 渴望剋星 | 行為 | 成功抵抗 10 次渴望 |
| checkin_streak | 打卡王 | 行為 | 連續 7 天打卡 |

### B. 觸發因素與應對策略

| 觸發因素 | 推薦策略 |
|----------|----------|
| 壓力 | 深呼吸、散步 |
| 無聊 | 找事做、與人聊天 |
| 社交場合 | 提前告知、準備替代選項 |
| 悲傷 | 找人聊天、寫日記 |
| 疲勞 | 休息、喝水 |
| 習慣時間 | 建立新習慣、改變環境 |

### C. 心情對應數值

| 心情 | ID | 數值 |
|------|-----|------|
| 很棒 | great | 5 |
| 不錯 | good | 4 |
| 一般 | okay | 3 |
| 困難 | tough | 2 |
| 掙扎 | struggling | 1 |

---

**END OF DOCUMENT**
