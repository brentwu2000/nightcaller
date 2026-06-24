# 天黑請閉眼 (nightcaller)

> 桌遊語音主持人 — 一台手機/平板放桌上，自動用語音主持需要主持人的桌遊。

「天黑請閉眼」是一款 **H5 行動端網頁應用（PWA）**，透過 Web Speech API 的 TTS 語音自動主持遊戲流程，**完全離線運行，無需後端伺服器、無需註冊**。掃 QR Code 或分享連結即可開始。

## 支援遊戲

- 一夜終極狼人（One Night Ultimate Werewolf）
- 狼人殺
- 阿瓦隆 / 抵抗組織
- 血染鐘樓
- 奶酪大盜（範例遊戲）

## 核心功能

- 🎙️ **AI 語音主持** — Web Speech API TTS 自動播報遊戲階段（天黑請閉眼、角色行動、天亮投票）
- 📜 **遊戲模板庫** — 預設 + 自訂遊戲規則，內建預載
- 👥 **玩家管理** — 本地角色分配
- ⏱️ **計時器** — 發言、投票計時
- 🎵 **音效與背景音樂**
- 💾 **遊戲歷史記錄** — 本地 IndexedDB

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | Vue 3 + Composition API |
| 建構 | Vite 5 |
| 語言 | TypeScript (strict) |
| 狀態管理 | Pinia |
| 路由 | Vue Router 4 |
| 語音 | Web Speech API (SpeechSynthesis) |
| 音效 | Howler.js |
| 本地儲存 | IndexedDB (Dexie.js) |
| 離線支援 | PWA (Workbox / vite-plugin-pwa) |

## 開發

主應用位於 `h5/` 目錄：

```bash
cd h5
npm install      # 安裝依賴
npm run dev      # 啟動開發伺服器 (http://localhost:3000)
npm run build    # 建構生產版本（輸出 dist/）
npm run preview  # 預覽生產版本
npm run test     # 執行測試 (Vitest)
npm run typecheck # 型別檢查 (vue-tsc)
```

## 專案結構

```
.
├── h5/                # 主應用 (Vue 3 + Vite PWA)
│   ├── src/
│   │   ├── features/  # 功能模組（每個遊戲一個）
│   │   ├── composables/
│   │   ├── stores/    # Pinia
│   │   └── types/
│   └── public/        # PWA manifest、圖示
├── features/          # 功能規格文檔（avalon, cheese-thief, witch-hunt…）
├── docs/              # 架構與設計文檔
├── .claude/           # Claude Code 配置（rules / agents / skills）
└── CLAUDE.md          # 專案入口指引
```

## 部署

建構產物為純靜態檔案，可部署至任何靜態檔案託管（GitHub Pages / Netlify / Vercel / Cloudflare Pages）：

```bash
cd h5 && npm run build   # 產出 h5/dist/
```

## 授權

Private.
