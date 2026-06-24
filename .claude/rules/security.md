# Security Rules

> **Last Updated**: 2026-03-10
> **Status**: Active
> **Severity**: IMPORTANT
> **Scope**: H5 PWA 離線應用（無後端伺服器）

---

## 1. 架構安全概述

本專案為**純離線 H5 應用**，無後端伺服器、無用戶認證、無 API Keys。安全重點在於：

- Web 前端安全（XSS、CSP）
- 本地資料完整性
- PWA 安全配置
- 第三方依賴安全

---

## 2. XSS 防護

### 2.1 Vue 自動轉義

Vue 3 默認對模板中的內容進行 HTML 轉義，但仍需注意：

```vue
<!-- ✅ 安全：Vue 自動轉義 -->
<p>{{ userInput }}</p>

<!-- ❌ 危險：v-html 繞過轉義 -->
<p v-html="userInput"></p>
```

### 2.2 v-html 使用規範

**原則**: 禁止使用 `v-html`，除非內容來源完全可控。

```typescript
// ❌ NEVER：使用者輸入直接渲染
<div v-html="playerName"></div>

// ✅ OK：純粹的預定義內容（如遊戲規則描述）
// 且內容定義在程式碼中，非使用者輸入
const RULE_HTML = '<strong>狼人</strong>每晚可以殺害一名玩家'
```

若必須使用 `v-html`，需先進行消毒：

```typescript
// src/utils/sanitize.ts
export function sanitizeHtml(input: string): string {
  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
}
```

### 2.3 使用者輸入處理

所有使用者輸入（玩家名稱、自訂模板名稱等）必須驗證和清理：

```typescript
// src/utils/validators.ts

/** 驗證玩家名稱 */
export function validatePlayerName(name: string): string {
  // 移除首尾空白
  const trimmed = name.trim()

  // 長度限制
  if (trimmed.length === 0 || trimmed.length > 20) {
    throw new Error('玩家名稱需為 1-20 字元')
  }

  // 只允許文字、數字、常見符號
  if (!/^[\p{L}\p{N}\s\-_]+$/u.test(trimmed)) {
    throw new Error('玩家名稱包含不允許的字元')
  }

  return trimmed
}

/** 驗證自訂模板名稱 */
export function validateTemplateName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0 || trimmed.length > 50) {
    throw new Error('模板名稱需為 1-50 字元')
  }
  return trimmed
}
```

---

## 3. Content Security Policy (CSP)

### 3.1 推薦 CSP 配置

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  media-src 'self' blob:;
  font-src 'self';
  connect-src 'self';
  worker-src 'self';
">
```

**說明**：
- `default-src 'self'` — 只允許載入同源資源
- `script-src 'self'` — 只允許同源 JS（禁止 inline script 和 eval）
- `style-src 'self' 'unsafe-inline'` — 允許 inline style（Vue scoped CSS 需要）
- `connect-src 'self'` — 禁止外部 API 連線（純離線）
- 無 `unsafe-eval` — 防止 eval 攻擊

### 3.2 禁止外部資源載入

```html
<!-- ❌ 禁止從 CDN 載入 -->
<script src="https://cdn.example.com/lib.js"></script>
<link href="https://fonts.googleapis.com/..." />

<!-- ✅ 所有資源本地化 -->
<script src="/assets/lib.js"></script>
```

---

## 4. 本地儲存安全

### 4.1 IndexedDB 資料處理

```typescript
// 儲存前驗證資料結構
import type { GameHistory } from '@/types/game'

function validateGameHistory(data: unknown): data is GameHistory {
  if (typeof data !== 'object' || data === null) return false
  const record = data as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.templateId === 'string' &&
    typeof record.startedAt === 'string' &&
    Array.isArray(record.players)
  )
}

// 讀取時驗證
async function loadGameHistory(): Promise<GameHistory[]> {
  const raw = await db.gameHistory.toArray()
  return raw.filter(validateGameHistory)
}
```

### 4.2 localStorage 使用規範

```typescript
// ✅ 只儲存非敏感的簡單設定
localStorage.setItem('theme', 'dark')
localStorage.setItem('tts-rate', '0.9')
localStorage.setItem('volume', '80')

// ❌ 不儲存複雜或大量資料（用 IndexedDB）
// ❌ 不儲存任何個人身份資訊
```

### 4.3 資料清理

```typescript
// 提供使用者清除本地資料的功能
export async function clearAllData(): Promise<void> {
  // 清除 IndexedDB
  await db.delete()

  // 清除 localStorage
  localStorage.clear()

  // 清除 Service Worker cache
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(name => caches.delete(name)))
}
```

---

## 5. PWA 安全

### 5.1 Service Worker 安全

```typescript
// src/sw.ts
// Service Worker 只快取本地資源，不代理外部請求

import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

// 只預快取本地建構產物
precacheAndRoute(self.__WB_MANIFEST)

// 只快取同源資源
registerRoute(
  ({ url }) => url.origin === self.location.origin,
  new CacheFirst()
)

// ❌ 不代理或快取外部資源
```

### 5.2 HTTPS 要求

PWA 必須透過 HTTPS 提供服務（localhost 開發除外）：
- 部署時必須啟用 HTTPS
- manifest.json 的 start_url 使用相對路徑

---

## 6. 第三方依賴安全

### 6.1 依賴審計

```bash
# 定期檢查依賴漏洞
npm audit

# 修復已知漏洞
npm audit fix
```

### 6.2 依賴更新策略

- 每月檢查一次依賴更新
- 使用 `npm outdated` 查看過期依賴
- 更新前先在開發環境測試
- 鎖定主要版本（使用 `^` 而非 `*`）

### 6.3 最小化依賴

```
原則：能用原生 API 實現的，不引入額外依賴

✅ Web Speech API（TTS）— 原生
✅ IndexedDB + Dexie.js — 輕量封裝
✅ CSS3 Transitions — 原生動畫
❌ 不引入 Axios（無 HTTP 請求）
❌ 不引入 Moment.js（用 Intl.DateTimeFormat）
```

---

## 7. 隱私保護

### 7.1 無資料收集原則

本專案不收集任何個人資訊：

- 不需要帳號註冊
- 不收集裝置資訊
- 不使用分析追蹤（Google Analytics 等）
- 不傳送任何資料到外部伺服器
- 玩家名稱僅存在本地裝置

### 7.2 資料僅限本地

```
所有資料儲存在使用者的瀏覽器中：
- 遊戲歷史記錄 → IndexedDB
- 自訂模板 → IndexedDB
- 偏好設定 → localStorage
- 快取資源 → Service Worker Cache

清除瀏覽器資料即可完全移除所有記錄。
```

---

## 8. 禁止事項

- ❌ 使用 `v-html` 渲染使用者輸入
- ❌ 使用 `eval()` 或 `Function()` 構造函數
- ❌ 從 CDN 載入外部腳本
- ❌ 發送任何 HTTP 請求到外部伺服器
- ❌ 收集或追蹤使用者行為
- ❌ 在 console 輸出使用者資料（生產環境）
- ❌ 使用 `innerHTML` 直接操作 DOM

---

## Checklist

開發時請確認:

- [ ] 無使用 `v-html` 渲染使用者輸入
- [ ] 所有使用者輸入有驗證和清理
- [ ] CSP meta tag 已設定
- [ ] 無外部資源依賴（CDN）
- [ ] Service Worker 只快取同源資源
- [ ] 無任何外部 HTTP 請求
- [ ] `npm audit` 無高危漏洞
- [ ] 部署使用 HTTPS
