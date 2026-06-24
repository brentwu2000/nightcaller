# Tech Stack 技術棧規範

> **強制性**: 本文件定義的技術選型為專案憲法，不可違背。
> **Last Updated**: 2026-03-10

## 平台定位

- **類型**: H5 行動端網頁應用 (PWA)
- **運行環境**: 現代行動瀏覽器 (Chrome 90+, Safari 15+, Firefox 90+)
- **離線模式**: 完全離線運行，無需後端伺服器
- **目標場景**: 一台設備放桌上當語音主持人

## 前端技術棧

### 框架
- **主要**: Vue 3.x + Composition API
- **建構工具**: Vite 5.x
- **語言**: TypeScript (strict mode)
- **禁止**: Options API、Vue 2 語法、JavaScript（必須使用 TypeScript）

### 狀態管理
- **主要**: Pinia
- **禁止**: Vuex、全域 reactive 物件替代 Store

### 路由
- **主要**: Vue Router 4
- **禁止**: 手動 hash 路由

### 本地儲存
- **結構化資料**: IndexedDB (Dexie.js)
- **簡單 KV**: localStorage
- **禁止**: WebSQL、直接使用 IndexedDB 原生 API（用 Dexie.js 封裝）

### 語音 (TTS)
- **主要**: Web Speech API (SpeechSynthesis)
- **語音腳本**: 內建在應用中，不需外部 API
- **禁止**: 第三方 TTS 服務（純離線設計）

### 音效
- **主要**: Howler.js
- **音效檔案**: 預載在 public/ 或 src/assets/
- **禁止**: 直接使用 HTML5 Audio API（用 Howler.js 封裝）

### UI 元件
- **主要**: 自訂 Vue 元件 + CSS3
- **圖示**: 自訂 SVG 或 Iconify
- **字體**: Google Fonts (Noto Sans TC, Space Grotesk) 或本地字體
- **動畫**: CSS3 Transitions + Lottie-web
- **禁止**: Element Plus、Ant Design Vue 等重量級 UI 庫

### 適配方案
- **主要**: VW/VH 單位 + PostCSS px-to-viewport
- **斷點**: 以行動端為主（Mobile First）
- **禁止**: 固定 px 佈局

### 離線支援 (PWA)
- **主要**: Workbox (透過 vite-plugin-pwa)
- **快取策略**: Cache First（所有資源預載）
- **禁止**: 依賴網路連線的功能

## 架構模式

### Feature-Based 模組化架構

```
src/
├── assets/          # 靜態資源（音效、圖片）
├── components/      # 全域共享元件
├── composables/     # 全域共享 Composables
├── features/        # 功能模組（每個遊戲一個）
│   └── {game}/
│       ├── components/   # 功能專屬元件
│       ├── composables/  # 功能專屬邏輯
│       ├── types.ts      # 功能專屬型別
│       └── index.vue     # 功能入口頁面
├── router/          # 路由定義
├── stores/          # Pinia Stores
├── styles/          # 全域樣式
├── types/           # 全域型別定義
├── utils/           # 工具函數
├── App.vue
├── main.ts
└── sw.ts            # Service Worker
```

### 依賴規則

- `components/` 不可依賴 `features/`
- `composables/` 不可依賴 `features/`
- `features/` 可依賴 `components/`、`composables/`、`stores/`
- `stores/` 不可依賴 `features/`（單向資料流）

## 禁止事項

### Vue / TypeScript 禁止清單

```typescript
// ❌ 禁止 any
let data: any;

// ❌ 禁止 Options API
export default {
  data() { return {} },
  methods: {}
}

// ❌ 禁止 console.log（用統一的 logger 工具）
console.log('debug');

// ❌ 禁止非型別安全的事件
emit('update', data);  // 應使用 defineEmits 搭配型別

// ❌ 禁止 var
var x = 1;

// ❌ 禁止在模板中使用複雜表達式（抽取到 computed）
// <div>{{ items.filter(i => i.active).map(i => i.name).join(', ') }}</div>
```

### 網路相關禁止清單

```typescript
// ❌ 禁止任何 HTTP 請求（純離線應用）
fetch('https://api.example.com/...');
axios.get('...');

// ❌ 禁止 WebSocket 連線
new WebSocket('...');

// ❌ 禁止依賴外部 CDN 資源（所有資源必須本地化）
<script src="https://cdn.example.com/..."></script>
```

## 版本鎖定

```json
// package.json 版本規範
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "dexie": "^3.2.0",
    "howler": "^2.2.0",
    "lottie-web": "^5.12.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "postcss-px-to-viewport-8-plugin": "^1.2.0",
    "vitest": "^1.0.0",
    "@vue/test-utils": "^2.4.0",
    "jsdom": "^23.0.0"
  }
}
```

## 環境變數

### 本地開發 (.env.local)
```
VITE_APP_TITLE=桌遊語音主持人
VITE_APP_VERSION=1.0.0
```

**注意**：本專案為純離線應用，不需要 API Keys 或後端連線設定。

## 遵守檢查

每次 PR 必須通過：
```bash
# 型別檢查
npx vue-tsc --noEmit

# Lint
npx eslint src/ --ext .ts,.vue

# 測試
npx vitest run

# 建構（確保能成功打包）
npm run build
```
