# 奶酪大盜 H5 版本 — Tech Lead 代碼審查報告

## 審查摘要
- 審查日期: 2026-03-10
- 審查範圍: h5/ 目錄下所有源碼（composables, stores, components, views, tests, config）
- 品味評分: 🟡
- BLOCKER 數: 3
- WARNING 數: 7
- SUGGESTION 數: 6

---

## BLOCKER（必須修復）

### BLOCKER-01: useTimer pause 不停止 interval，持續消耗 CPU 並導致隱蔽的倒計時跳秒

- **位置**: `h5/src/composables/useTimer.ts:28-40`
- **問題**: `pause()` 僅設置 `isRunning.value = false`，但不清除 `setInterval`。interval 回調持續每秒執行，只靠 `if (!isRunning.value) return` 短路。這代表：
  1. 在暫停期間 interval 仍然在 firing，浪費 CPU。
  2. 更嚴重的是，如果暫停後再 `resume()` 並不重新建立 interval（因為 interval 從未停止），但如果在暫停期間用戶調用 `startCountdown()` 重新開始，`clearInterval_()` 會清除舊 interval 並建立新的——此時不會雙重計時。但若用戶 `pause()` → 長時間閒置 → `resume()`，interval 有可能因為瀏覽器在背景 tab 節流 `setInterval` 而產生不可預測的行為（Chrome 會將背景 tab 的 timer 節流到每分鐘一次）。
  3. 如果 `startCountdown(0)` 被調用，第一次 tick 將 `remaining` 設為 -1，然後才 clamp 到 0。雖然 test 中標注了這個行為，但負數瞬間可能觸發 UI 異常。
- **修復建議**:
  ```typescript
  function pause(): void {
    isRunning.value = false
    clearInterval_()  // 停止 interval
  }

  function resume(): void {
    if (remaining.value > 0 && !isRunning.value) {
      isRunning.value = true
      // 重新建立 interval
      intervalId = setInterval(() => {
        remaining.value -= 1
        callbacks.onTick?.(remaining.value)
        if (remaining.value <= 0) {
          remaining.value = 0
          isRunning.value = false
          clearInterval_()
          callbacks.onComplete?.()
        }
      }, 1000)
    }
  }
  ```
  同時在 `startCountdown()` 中加入 `remaining.value = Math.max(0, seconds)` 的防禦。

### BLOCKER-02: useNightPhase.waitForCountdown 使用 200ms polling interval 偵測 timer 完成，引入競態條件

- **位置**: `h5/src/features/cheese-thief/composables/useNightPhase.ts:43-67`
- **問題**: `waitForCountdown()` 使用 `setInterval(200ms)` 輪詢 `timer.remaining.value <= 0 && !timer.isRunning.value` 來偵測計時結束。這存在多個問題：
  1. 與 BLOCKER-01 交互：如果 timer 暫停後 `isRunning` 為 false 且 `remaining > 0`，此條件不會觸發。但如果 timer 有 bug 讓 `remaining` 到 0 但 `isRunning` 仍為 true（例如 race condition），此 polling 將永遠不會 resolve。
  2. 200ms polling 不是 0 成本，尤其在行動裝置上。
  3. 當 abort 被調用時，`checkInterval` 會被清除，但如果 abort 發生在 `clearInterval(checkInterval)` 之前的某個微妙時機，存在 `resolve` 被調用兩次的風險（abort 中的 `skipResolve` 和 polling 中的 `resolve` 可能交叉）。
- **修復建議**: 使用 timer 的 `onComplete` 回調來 resolve Promise，而非 polling：
  ```typescript
  function waitForCountdown(seconds: number): Promise<void> {
    if (aborted) return Promise.resolve()
    return new Promise((resolve) => {
      const originalOnComplete = timer callbacks
      // 利用 useTimer 的 onComplete callback
      // 或重構 useTimer 使 startCountdown 返回 Promise
    })
  }
  ```
  最乾淨的方案是讓 `useTimer.startCountdown()` 返回 `Promise<void>`，在 `onComplete` 時 resolve。

### BLOCKER-03: GameConfig 通過 URL query string 傳遞，存在注入風險且無輸入驗證

- **位置**: `h5/src/features/cheese-thief/views/GameSetupView.vue:63-66` 和 `GamePlayView.vue:31-41`
- **問題**:
  1. `GameSetupView` 將整個 `GameConfig` JSON 序列化到 URL query parameter。`GamePlayView` 用 `JSON.parse(decodeURIComponent(raw)) as GameConfig` 直接反序列化，沒有任何欄位驗證。
  2. 用戶可以手動修改 URL 注入任意值，例如 `playerCount: -1`、`discussionMinutes: 999999`、`speechRate: 100`。這些值會直接傳入 `startGame()`，導致：
     - 負數玩家人數 → `getRoleComposition()` 返回 `compositions[6]`（fallback），但語義上不正確。
     - `discussionMinutes: 999999` → 計時器設定為 59,999,940 秒，UI 會顯示異常。
     - `speechRate: 100` → Web Speech API 可能崩潰或行為異常。
  3. 將配置放 query string 也讓 URL 非常冗長，不利於分享或書簽。
- **修復建議**:
  1. 使用共享的響應式 store（如 Pinia）或 `provide/inject` 在路由之間傳遞配置，不通過 URL。
  2. 若必須用 URL，在 `parseConfig()` 中加入驗證：
  ```typescript
  function validateConfig(raw: unknown): GameConfig {
    const config = raw as GameConfig
    return {
      playerCount: Math.min(8, Math.max(4, Math.round(config.playerCount ?? 6))),
      discussionMinutes: Math.min(15, Math.max(1, config.discussionMinutes ?? 5)),
      votingSeconds: Math.min(120, Math.max(10, config.votingSeconds ?? 30)),
      speechRate: Math.min(2, Math.max(0.5, config.speechRate ?? 1)),
      speechVolume: Math.min(1, Math.max(0, config.speechVolume ?? 1)),
      musicVolume: Math.min(1, Math.max(0, config.musicVolume ?? 0.3)),
      sfxVolume: Math.min(1, Math.max(0, config.sfxVolume ?? 0.5)),
    }
  }
  ```

---

## WARNING（建議修復）

### WARN-01: useAudio playSfx 產生的 Howl 實例永遠不會被 unload，導致記憶體洩漏

- **位置**: `h5/src/composables/useAudio.ts:62-68`
- **問題**: 每次調用 `playSfx()` 都 `new Howl(...)` 但從不調用 `.unload()`。在長時間遊戲中（多輪 tick 音效），會累積大量 Howl 實例。
- **修復建議**: 預先建立 SFX Howl 實例池，或在播放結束後 unload：
  ```typescript
  function playSfx(name: SfxName): void {
    const sfx = new Howl({
      src: [sfxSources[name]],
      volume: sfxVolume.value,
      onend() { sfx.unload() },
    })
    sfx.play()
  }
  ```

### WARN-02: settingsStore 的 loadSettings 對 localStorage 數據不做類型驗證

- **位置**: `h5/src/stores/settingsStore.ts:15-32`
- **問題**: `JSON.parse(raw) as PersistedSettings` 是 type assertion，不是運行時驗證。如果 localStorage 數據被篡改或格式不完整（例如缺少某些欄位），會導致 `ref(undefined)` 被建立。
- **修復建議**: 在 `loadSettings()` 中加入默認值 merge：
  ```typescript
  const defaults: PersistedSettings = { ... }
  return { ...defaults, ...JSON.parse(raw) }
  ```

### WARN-03: useCheeseThiefGame.startGame 中的 nightPhase.startNight().then() 缺少錯誤處理

- **位置**: `h5/src/features/cheese-thief/composables/useCheeseThiefGame.ts:52-57`
- **問題**: `.then()` 沒有 `.catch()`。如果 `startNight()` 拋出異常（例如 TTS 錯誤），Promise rejection 會被靜默吞掉，成為 unhandled rejection。同樣的問題在 `enterPhase()` 的 `speak().then()` 中也存在（行 100-103, 108-111）。
- **修復建議**: 加入 `.catch()` 處理：
  ```typescript
  nightPhase.startNight(gameConfig).then(() => {
    if (phase.value === 'night') {
      audio.unduckBgm()
      nextPhase()
    }
  }).catch(() => {
    audio.unduckBgm()
    // 考慮顯示錯誤提示
  })
  ```

### WARN-04: PWA manifest 設置為 false，Service Worker 手動註冊但無 sw.js 文件

- **位置**: `h5/vite.config.ts:12` 和 `h5/src/main.ts:14-22`
- **問題**: `vite-plugin-pwa` 的 `manifest: false` 表示不生成 manifest.json。同時 `main.ts` 手動註冊 `/sw.js`，但 `vite-plugin-pwa` 使用 `registerType: 'autoUpdate'` 應該自動處理 SW 註冊。這兩者可能衝突——plugin 生成的 SW 檔名可能不是 `sw.js`（通常是 `sw.js` 或 `workbox-xxx.js`）。如果 `/sw.js` 不存在，`console.warn` 會靜默失敗，PWA 離線功能完全不可用。
- **修復建議**:
  1. 讓 `vite-plugin-pwa` 處理 manifest（移除 `manifest: false`，提供完整 manifest 配置）。
  2. 移除 `main.ts` 中的手動 SW 註冊，或使用 `vite-plugin-pwa` 提供的 `registerSW` 方法。

### WARN-05: useGameHistory 中的 Dexie db 是模組級單例，composable 被多次調用時共享同一實例

- **位置**: `h5/src/composables/useGameHistory.ts:15`
- **問題**: `const db = new GameDatabase()` 在模組頂層建立，這表示所有 `useGameHistory()` 調用共享同一個 db 實例。雖然這在功能上是正確的（且是有意的設計），但它使得：
  1. 在 `useCheeseThiefGame` 中調用 `useGameHistory()` 獲取的 `addRecord` 和 `useGameHistoryStore` 中的 `useGameHistory()` 操作同一個 db——這是好的。
  2. 但它也意味著 `useGameHistory` 不是一個真正的 composable（不依賴 component 生命周期），更適合作為一個普通的 utility module export。
- **修復建議**: 考慮將 `useGameHistory` 改名為 `gameHistoryService` 或類似名稱，使其不會被誤認為是響應式 composable。或者明確文檔化其單例行為。

### WARN-06: VolumeSlider 組件的 displayValue 計算假設 max 總是 1

- **位置**: `h5/src/components/VolumeSlider.vue:21-23`
- **問題**: `displayValue` 計算為 `Math.round(props.modelValue * 100)`，但在 `GameSetupView` 中，語速（speechRate）的 `min=0.5, max=2`。當 speechRate = 2 時，顯示為 "200%"，這在語義上是「2x 速度」。然而 "200%" 可能讓用戶困惑（他們可能期望看到 "2.0x" 或滑動條上的絕對值）。
- **修復建議**: 允許自訂格式化：
  ```vue
  <span class="slider-value">{{ formatValue ? formatValue(modelValue) : `${displayValue}%` }}</span>
  ```
  或針對 speechRate 使用不同的顯示邏輯（如 "1.5x"）。

### WARN-07: useNightPhase 中 delay() 和 waitForCountdown() 的 skipResolve 可被覆蓋

- **位置**: `h5/src/features/cheese-thief/composables/useNightPhase.ts:36-39, 61-65`
- **問題**: `skipResolve` 是一個閉包變數，`delay()` 和 `waitForCountdown()` 都會設置它。在 `startNight()` 的循環中，每次新的 `delay()` 或 `waitForCountdown()` 調用會覆蓋前一個 `skipResolve`。如果用戶快速連續點擊 skip，前一個 Promise 的 `resolve` 可能永遠不會被調用。不過在實際運行中，由於是 `await` 串行執行，前一個 Promise 要先 resolve 才會進入下一個，所以覆蓋的問題實際上不會發生——但代碼的意圖不夠明確，增加了維護風險。
- **修復建議**: 在 `delay()` 和 `waitForCountdown()` 開始時，先調用已有的 `skipResolve`（如果存在），確保前一個 Promise 被正確 resolve。

---

## SUGGESTION（可選優化）

### SUG-01: 考慮使用 vue-router 的 state 而非 query string 傳遞配置

- **位置**: `h5/src/features/cheese-thief/views/GameSetupView.vue:63-66`
- **建議**: 使用 `router.push({ path: '/cheese-thief/play', state: { config } })` 搭配 `history.state`，或者使用 Pinia store。這樣 URL 更乾淨，且不需要序列化/反序列化。

### SUG-02: 為 useAudio 的 BGM/SFX 加入 Web Audio API 實際音頻生成

- **位置**: `h5/src/composables/useAudio.ts:9-13`
- **建議**: 目前所有音頻使用同一個靜音 data URI。對於 Demo/MVP 這是合理的，但建議在 `createToneDataUri` 中使用 OfflineAudioContext 實際生成音調，讓 Demo 有聲音反饋，提升體驗。

### SUG-03: 為 GamePlayView 加入 onBeforeRouteLeave 確認對話框

- **位置**: `h5/src/features/cheese-thief/views/GamePlayView.vue`
- **建議**: 當遊戲進行中用戶按下返回鍵或瀏覽器後退時，應彈出確認對話框防止意外退出。目前 `handleExit` 直接導航離開。
  ```typescript
  onBeforeRouteLeave((_to, _from, next) => {
    if (game.phase.value !== 'setup' && game.phase.value !== 'result') {
      if (confirm('遊戲進行中，確定要離開嗎？')) {
        game.cleanup()
        next()
      } else {
        next(false)
      }
    } else {
      next()
    }
  })
  ```

### SUG-04: CountdownTimer 組件缺少 aria-live 無障礙支援

- **位置**: `h5/src/components/CountdownTimer.vue:42`
- **建議**: 為倒計時顯示加入 `aria-live="polite"` 和 `role="timer"`，讓螢幕閱讀器能播報倒計時變化。

### SUG-05: 型別定義可以更嚴格

- **位置**: `h5/src/types/cheese-thief.ts:51-59`
- **建議**: `getRoleComposition` 的參數 `playerCount` 是 `number`，但實際只支援 4-8。可以使用 literal union type：
  ```typescript
  type SupportedPlayerCount = 4 | 5 | 6 | 7 | 8
  export function getRoleComposition(playerCount: SupportedPlayerCount): RoleComposition
  ```

### SUG-06: 測試中 withSetup 未在 afterEach 中 unmount

- **位置**: `h5/src/test/helpers/withSetup.ts` 及所有使用 `withSetup` 的測試
- **建議**: `withSetup` 返回的 `unmount` 函數在大多數測試中未被調用。雖然 jsdom 會在每個測試後重置，但明確 unmount 可以觸發 `onUnmounted` hook（如 `useTimer` 中的 `clearInterval_` 清理）。建議在 `afterEach` 中統一呼叫 `unmount()`：
  ```typescript
  let cleanup: () => void
  afterEach(() => cleanup?.())

  it('test', () => {
    const { result, unmount } = withSetup(() => useTimer())
    cleanup = unmount
    // ...
  })
  ```

---

## 架構評價

整體架構設計良好，Composable-First 模式運用得當：

1. **模組分層清晰**: 通用 composables（`useTts`, `useAudio`, `useTimer`, `useGameHistory`）與遊戲特定 composables（`useNightPhase`, `useCheeseThiefGame`）分離合理。Pinia stores 僅負責持久化和全域共享狀態，業務邏輯正確地留在 composables 中。

2. **型別安全**: TypeScript strict mode 已啟用，`noImplicitAny` 和 `strictNullChecks` 都已開啟。全域沒有 `any` 類型。型別定義集中在 `types/cheese-thief.ts` 中，結構清楚。

3. **夜晚主題切換**: 使用 CSS 自訂屬性 + `[data-phase="night"]` 選擇器的方案簡潔高效，主題過渡的 800ms transition 也讓 UX 流暢。

4. **關注點分離**: Views 不含業務邏輯（只做 composable 調用和路由），composables 不直接操作 DOM。唯一的例外是 `useTts` 直接訪問 `window.speechSynthesis`，但這是 Web API composable 的標準做法。

5. **可擴展性**: 路由和 `GameSelectView` 的設計為未來新增遊戲（狼人殺、阿瓦隆）預留了擴展空間。

**不足之處**: `useCheeseThiefGame` 同時實例化了兩個 `useTts()`（自身一個 + `useNightPhase` 內部一個），這意味著 `stopTts()` 只能停止自身的 utterance，無法停止 nightPhase 內部的。`cleanup()` 方法中通過 `nightPhase.abort()` 間接停止了 nightPhase 的 TTS，但 `nextPhase()` 中的 `stopTts()` 只停止了自身實例，nightPhase 的 TTS 可能仍在播放。

---

## 測試評價

測試覆蓋面廣，品質總體良好：

1. **覆蓋範圍**: 所有核心 composables、兩個 Pinia stores、一個 UI 組件（CountdownTimer）、一個 View（GameSetupView）都有對應測試。測試金字塔分布合理（composable unit tests 佔大頭）。

2. **Mock 策略**: 測試正確地 mock 了外部依賴（Web Speech API、Howler.js、IndexedDB）。`withSetup` 工具函數使 composable 測試能在真實 Vue 組件生命周期中運行，設計精巧。

3. **邊界條件**: timer 的 0 秒、TTS 的 canceled/interrupted 錯誤、localStorage 的 invalid JSON 等邊界情況都有測試。

4. **不足之處**:
   - `useAudio` composable 完全沒有獨立測試文件（雖然 Howler 被 mock 了，但 duck/unduck、volume 設置等邏輯沒有直接測試）。
   - `GamePlayView` 沒有測試——這是最複雜的 View，包含暫停、跳過、勝負判定等交互。
   - `PhaseIndicator` 和 `VolumeSlider` 組件沒有測試。
   - `useNightPhase` 的 polling 機制在 fake timers 下可能不能完全模擬真實行為。
   - 多數 composable 測試未在 `afterEach` 中調用 `unmount()`，可能導致 `onUnmounted` hook 中的清理邏輯未被驗證。

---

## 總結

這是一個結構清晰、設計用心的 H5 桌遊語音主持人實現。Composable-First 架構正確分離了關注點，TypeScript strict mode 確保了型別安全，CSS 自訂屬性驅動的主題系統優雅高效。

3 個 BLOCKER 需要立即修復：
1. **useTimer 的 pause/resume 實現**有 interval 泄漏和瀏覽器背景節流風險。
2. **useNightPhase 的 polling 機制**應改為事件驅動。
3. **URL query string 配置傳遞**缺少輸入驗證，可被惡意構造。

7 個 WARNING 中，WARN-01（SFX 記憶體洩漏）和 WARN-03（未處理的 Promise rejection）應優先修復。

代碼風格一致，命名規範，沒有 `any` 類型，沒有 `v-html` XSS 風險。總體而言，修復上述問題後，這份代碼可以作為 MVP 發布。
