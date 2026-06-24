# 奶酪大盜 H5 PWA 測試規範

> 版本：1.0
> 日期：2026-03-10
> 範圍：h5/src/ — Vue 3 + Vite + TypeScript + Pinia + Web Speech API + IndexedDB

---

## 測試環境說明

| 項目 | 說明 |
|------|------|
| 框架 | Vitest + @vue/test-utils |
| 模擬層 | vi.fn() / vi.spyOn() / vi.mock() |
| DOM 環境 | jsdom (happy-dom 備選) |
| 非同步工具 | flushPromises + fake timers |
| 覆蓋率目標 | 整體 80%，核心 composables 95%，型別/常數 100% |

### Mock 需求總覽

| 模組 | Mock 方式 | 原因 |
|------|-----------|------|
| `window.speechSynthesis` | `vi.stubGlobal` | jsdom 無實作 |
| `SpeechSynthesisUtterance` | 自訂 class stub | 需控制 onend/onerror 回調 |
| `Howl` (howler) | `vi.mock('howler')` | 無瀏覽器音訊環境 |
| `Dexie` / IndexedDB | `vi.mock('dexie')` + fake-indexeddb | 儲存層隔離 |
| `localStorage` | `vi.stubGlobal` 或 memory stub | 設定持久化測試 |
| `setInterval` / `setTimeout` | `vi.useFakeTimers()` | 控制倒計時 |
| `useRouter` / `useRoute` | `vi.mock('vue-router')` | 頁面導航測試 |

---

## 一、useTts.ts — Web Speech API 封裝

**檔案路徑**: `h5/src/composables/useTts.ts`

**關鍵行為摘要**:
- `speak()` 呼叫前先執行 `stop()` 取消前一個語句
- 偏好 `zh-TW` 語音，其次任何 `zh` 語音
- Chrome bug: 若 `speechSynthesis.paused` 則先 `resume()` 再 `speak()`
- `canceled` / `interrupted` 錯誤視為正常 resolve，其餘 reject
- 元件 unmount 時自動 `stop()`

---

### TC-H5-001: speak() 正常播報並 resolve

- **前置條件**: `window.speechSynthesis` 存在；`SpeechSynthesisUtterance.onend` 可被觸發
- **測試步驟**:
  1. stub `window.speechSynthesis.speak` 為 spy，呼叫後立即觸發 utterance.onend
  2. 呼叫 `speak('測試文字')`
  3. await Promise
- **預期結果**:
  - Promise resolve（無值）
  - `speechSynthesis.speak` 被呼叫一次
  - `isSpeaking` 在 onstart 後為 `true`，onend 後為 `false`

---

### TC-H5-002: speak() 在不支援環境下直接 resolve

- **前置條件**: `window.speechSynthesis` 不存在（`isSupported = false`）
- **測試步驟**: 呼叫 `speak('任意文字')`
- **預期結果**:
  - Promise 立即 resolve
  - `speechSynthesis.speak` 未被呼叫
  - `isSpeaking` 保持 `false`

---

### TC-H5-003: speak() 選用 zh-TW 語音

- **前置條件**: `getVoices()` 回傳含 `zh-TW` 及 `en-US` 的語音列表
- **測試步驟**: 呼叫 `speak('文字')`
- **預期結果**: utterance.voice 設為 lang 包含 `TW` 的語音物件

---

### TC-H5-004: speak() 無 zh-TW 時退而選用 zh 語音

- **前置條件**: `getVoices()` 只回傳 `zh-CN` 及 `en-US`
- **測試步驟**: 呼叫 `speak('文字')`
- **預期結果**: utterance.voice 設為 lang 起始 `zh` 的語音（zh-CN）

---

### TC-H5-005: speak() 無任何中文語音時不設定 voice

- **前置條件**: `getVoices()` 只回傳 `en-US`
- **測試步驟**: 呼叫 `speak('文字')`
- **預期結果**: utterance.voice 未被設定（維持 null/undefined）

---

### TC-H5-006: speak() 套用自訂 rate 與 volume

- **前置條件**: 標準環境
- **測試步驟**: 呼叫 `speak('文字', { rate: 1.5, volume: 0.7 })`
- **預期結果**: utterance.rate === 1.5；utterance.volume === 0.7

---

### TC-H5-007: speak() 預設使用 zh-TW lang

- **前置條件**: 標準環境
- **測試步驟**: 呼叫 `speak('文字')`（不帶 options）
- **預期結果**: utterance.lang === 'zh-TW'

---

### TC-H5-008: speak() 呼叫前先取消前一個語句

- **前置條件**: 第一次 speak 尚未結束
- **測試步驟**:
  1. 呼叫 `speak('第一段')` （不等待完成）
  2. 立即呼叫 `speak('第二段')`
- **預期結果**: `speechSynthesis.cancel` 在第二次 speak 前被呼叫

---

### TC-H5-009: speak() 觸發 canceled 錯誤時 resolve 不 reject

- **前置條件**: utterance.onerror 觸發 `{ error: 'canceled' }`
- **測試步驟**: 呼叫 `speak('文字')` 後觸發 onerror
- **預期結果**: Promise resolve（不拋出例外）

---

### TC-H5-010: speak() 觸發 interrupted 錯誤時 resolve 不 reject

- **前置條件**: utterance.onerror 觸發 `{ error: 'interrupted' }`
- **測試步驟**: 同上
- **預期結果**: Promise resolve（不拋出例外）

---

### TC-H5-011: speak() 觸發其他 TTS 錯誤時 reject

- **前置條件**: utterance.onerror 觸發 `{ error: 'synthesis-failed' }`
- **測試步驟**: 呼叫 `speak('文字')` 後觸發 onerror
- **預期結果**: Promise reject，錯誤訊息包含 `'synthesis-failed'`

---

### TC-H5-012: Chrome bug workaround — paused 時先 resume

- **前置條件**: `speechSynthesis.paused === true`
- **測試步驟**: 呼叫 `speak('文字')`
- **預期結果**: `speechSynthesis.resume()` 在 `speechSynthesis.speak()` 之前被呼叫

---

### TC-H5-013: stop() 取消語音並重設狀態

- **前置條件**: 語音播報中（isSpeaking = true）
- **測試步驟**: 呼叫 `stop()`
- **預期結果**:
  - `speechSynthesis.cancel()` 被呼叫
  - `isSpeaking` 變為 `false`
  - `currentUtterance` 清空

---

### TC-H5-014: onUnmounted 時自動 stop

- **前置條件**: 元件已 mount 且語音播報中
- **測試步驟**: unmount 元件
- **預期結果**: `speechSynthesis.cancel()` 被自動呼叫

---

## 二、useAudio.ts — Howler.js BGM/SFX 封裝

**檔案路徑**: `h5/src/composables/useAudio.ts`

**關鍵行為摘要**:
- `playBgm()` 若同一 track 已在播放則跳過
- `duckBgm()` 將 BGM 音量降至原音量的 20%
- `unduckBgm()` 還原至 `bgmVolume` 值
- `setBgmVolume()` duck 中不更新 Howl 實例音量

---

### TC-H5-015: playBgm() 播放 night 軌道

- **前置條件**: Howl 已 mock；currentBgm 為 null
- **測試步驟**: 呼叫 `playBgm('night')`
- **預期結果**: 建立 Howl 實例並呼叫 `play()`；`currentBgmTrack === 'night'`

---

### TC-H5-016: playBgm() 同一 track 重複呼叫不重建實例

- **前置條件**: 'night' track 已在播放（`playing()` 回傳 true）
- **測試步驟**: 再次呼叫 `playBgm('night')`
- **預期結果**: 不建立新 Howl 實例；`stopBgm()` 未被呼叫

---

### TC-H5-017: playBgm() 切換 track 時先停止舊 BGM

- **前置條件**: 'night' track 播放中
- **測試步驟**: 呼叫 `playBgm('day')`
- **預期結果**: 舊 Howl 的 `stop()` 和 `unload()` 被呼叫後再建立新實例

---

### TC-H5-018: stopBgm() 停止並釋放資源

- **前置條件**: BGM 播放中
- **測試步驟**: 呼叫 `stopBgm()`
- **預期結果**: `stop()` 和 `unload()` 被呼叫；`currentBgm === null`；`currentBgmTrack === null`

---

### TC-H5-019: stopBgm() 在無 BGM 時安全呼叫

- **前置條件**: `currentBgm === null`
- **測試步驟**: 呼叫 `stopBgm()`
- **預期結果**: 不拋出例外

---

### TC-H5-020: playSfx() 播放指定音效

- **前置條件**: Howl mock 可追蹤 play 呼叫
- **測試步驟**: 依序呼叫 `playSfx('ding')`、`playSfx('win')`
- **預期結果**: 每次呼叫建立新 Howl 並呼叫 `play()`

---

### TC-H5-021: duckBgm() 降低 BGM 音量至 20%

- **前置條件**: BGM 播放中，`bgmVolume = 0.5`
- **測試步驟**: 呼叫 `duckBgm()`
- **預期結果**: `currentBgm.volume()` 以 `0.1`（0.5 * 0.2）呼叫；`isDucked === true`

---

### TC-H5-022: unduckBgm() 還原 BGM 音量

- **前置條件**: duck 中，`bgmVolume = 0.5`
- **測試步驟**: 呼叫 `unduckBgm()`
- **預期結果**: `currentBgm.volume()` 以 `0.5` 呼叫；`isDucked === false`

---

### TC-H5-023: setBgmVolume() duck 中不更新 Howl 音量

- **前置條件**: `isDucked === true`
- **測試步驟**: 呼叫 `setBgmVolume(0.8)`
- **預期結果**: `bgmVolume.value === 0.8`；`currentBgm.volume()` 未被呼叫

---

### TC-H5-024: setBgmVolume() 非 duck 時即時更新

- **前置條件**: `isDucked === false`；BGM 播放中
- **測試步驟**: 呼叫 `setBgmVolume(0.8)`
- **預期結果**: `currentBgm.volume(0.8)` 被呼叫

---

### TC-H5-025: pauseAll() 暫停 BGM

- **前置條件**: BGM 播放中
- **測試步驟**: 呼叫 `pauseAll()`
- **預期結果**: `currentBgm.pause()` 被呼叫

---

### TC-H5-026: resumeAll() 恢復 BGM

- **前置條件**: BGM 已暫停
- **測試步驟**: 呼叫 `resumeAll()`
- **預期結果**: `currentBgm.play()` 被呼叫

---

### TC-H5-027: onUnmounted 時自動 stopBgm

- **前置條件**: BGM 播放中的元件
- **測試步驟**: unmount 元件
- **預期結果**: `stop()` 和 `unload()` 被呼叫

---

## 三、useTimer.ts — 通用倒計時

**檔案路徑**: `h5/src/composables/useTimer.ts`

**關鍵行為摘要**:
- `startCountdown()` 每秒遞減，`remaining <= 0` 時呼叫 `onComplete`
- `pause()` 只設旗標，不清除 interval
- `resume()` 只在 `remaining > 0` 時恢復
- `reset()` 清除 interval 並歸零

---

### TC-H5-028: startCountdown() 正確初始化狀態

- **前置條件**: fake timers 啟用
- **測試步驟**: 呼叫 `startCountdown(10)`
- **預期結果**: `remaining.value === 10`；`totalSeconds.value === 10`；`isRunning.value === true`

---

### TC-H5-029: startCountdown() 每秒遞減 remaining

- **前置條件**: fake timers；`startCountdown(3)`
- **測試步驟**: 推進 3 秒（`vi.advanceTimersByTime(3000)`）
- **預期結果**: `remaining.value === 0`；`isRunning.value === false`

---

### TC-H5-030: startCountdown() 觸發 onTick 回調

- **前置條件**: fake timers；onTick spy
- **測試步驟**: `startCountdown(3)`，推進 1 秒
- **預期結果**: `onTick` 以 `2`（剩餘 2 秒）呼叫一次

---

### TC-H5-031: startCountdown() 完成時觸發 onComplete

- **前置條件**: fake timers；onComplete spy；`startCountdown(2)`
- **測試步驟**: 推進 2 秒
- **預期結果**: `onComplete` 被呼叫一次

---

### TC-H5-032: pause() 暫停計時

- **前置條件**: 計時器運行中
- **測試步驟**: 呼叫 `pause()`；推進 2 秒
- **預期結果**: `isRunning.value === false`；`remaining.value` 未減少

---

### TC-H5-033: resume() 在 remaining > 0 時恢復計時

- **前置條件**: 已 pause；`remaining.value === 5`
- **測試步驟**: 呼叫 `resume()`
- **預期結果**: `isRunning.value === true`

---

### TC-H5-034: resume() 在 remaining === 0 時不恢復

- **前置條件**: `remaining.value === 0`（已完成）
- **測試步驟**: 呼叫 `resume()`
- **預期結果**: `isRunning.value === false`（維持）

---

### TC-H5-035: reset() 歸零並停止計時

- **前置條件**: 計時器運行中
- **測試步驟**: 呼叫 `reset()`
- **預期結果**: `remaining.value === 0`；`isRunning.value === false`；interval 被清除

---

### TC-H5-036: startCountdown() 重複呼叫時重置前一個計時

- **前置條件**: fake timers；第一次 `startCountdown(10)` 已推進 3 秒
- **測試步驟**: 呼叫 `startCountdown(5)`
- **預期結果**: `remaining.value === 5`；`totalSeconds.value === 5`（舊計時被取消）

---

### TC-H5-037: getProgress() 回傳正確進度比例

- **前置條件**: `startCountdown(10)`；推進 4 秒（remaining = 6）
- **測試步驟**: 呼叫 `getProgress()`
- **預期結果**: 回傳 `0.4`（1 - 6/10）

---

### TC-H5-038: getProgress() totalSeconds 為 0 時回傳 0

- **前置條件**: 未呼叫 `startCountdown`
- **測試步驟**: 呼叫 `getProgress()`
- **預期結果**: 回傳 `0`（不發生除以零）

---

### TC-H5-039: 邊界 — startCountdown(0) 立即完成

- **前置條件**: fake timers
- **測試步驟**: 呼叫 `startCountdown(0)`；推進 1 秒
- **預期結果**: `remaining.value === 0`；`onComplete` 在第一個 tick 後被呼叫

---

### TC-H5-040: onUnmounted 時自動清除 interval

- **前置條件**: 計時器運行中的元件
- **測試步驟**: unmount 元件
- **預期結果**: clearInterval 被呼叫（不拋出例外，不繼續倒數）

---

## 四、useGameHistory.ts — Dexie IndexedDB CRUD

**檔案路徑**: `h5/src/composables/useGameHistory.ts`

**關鍵行為摘要**:
- DB 名稱 `boardgame-host-db`，Table `gameRecords`，主鍵 `++id`
- `getRecords()` 以 `playedAt` 降序排列
- `getStats()` 計算 total / thiefWins / villagerWins

---

### TC-H5-041: addRecord() 成功儲存並回傳 id

- **前置條件**: fake IndexedDB（fake-indexeddb 或 vi.mock）
- **測試步驟**: 呼叫 `addRecord({ gameTemplate: 'cheese-thief', playerCount: 6, winningFaction: 'villager', durationMinutes: 12, playedAt: new Date() })`
- **預期結果**: 回傳數字 id（≥ 1）

---

### TC-H5-042: getRecords() 以 playedAt 降序回傳

- **前置條件**: 資料庫有 3 筆記錄，playedAt 分別為 T1 < T2 < T3
- **測試步驟**: 呼叫 `getRecords()`
- **預期結果**: 回傳陣列順序為 [T3, T2, T1]

---

### TC-H5-043: getRecords() 空資料庫回傳空陣列

- **前置條件**: 空資料庫
- **測試步驟**: 呼叫 `getRecords()`
- **預期結果**: 回傳 `[]`

---

### TC-H5-044: getStats() 正確計算勝負統計

- **前置條件**: 5 筆記錄（3 villager wins, 2 thief wins）
- **測試步驟**: 呼叫 `getStats()`
- **預期結果**: `{ total: 5, thiefWins: 2, villagerWins: 3 }`

---

### TC-H5-045: getStats() 空資料庫回傳零值

- **前置條件**: 空資料庫
- **測試步驟**: 呼叫 `getStats()`
- **預期結果**: `{ total: 0, thiefWins: 0, villagerWins: 0 }`

---

### TC-H5-046: clearAll() 清空所有記錄

- **前置條件**: 資料庫有 5 筆記錄
- **測試步驟**: 呼叫 `clearAll()`；再呼叫 `getRecords()`
- **預期結果**: 回傳 `[]`

---

### TC-H5-047: addRecord() 多筆資料 id 自動遞增

- **前置條件**: 空資料庫
- **測試步驟**: 連續呼叫 `addRecord()` 三次
- **預期結果**: 回傳 id 依序為 1, 2, 3

---

## 五、useNightPhase.ts — 夜晚階段編排

**檔案路徑**: `h5/src/features/cheese-thief/composables/useNightPhase.ts`

**關鍵行為摘要**:
- `startNight()` 依序播報骰子 1→6，每個 5 秒間隔
- 支援 `pause()` / `resume()` / `skip()` / `abort()`
- `abort()` 立即解除所有等待的 Promise
- `completedDice` 每個骰子完成後追加
- `DICE_NUMBERS = [1,2,3,4,5,6]`；`NIGHT_SECONDS_PER_DICE = 5`

---

### TC-H5-048: startNight() 初始重置狀態

- **前置條件**: TTS mock；fake timers
- **測試步驟**: 呼叫 `startNight(config)` 後立即檢查狀態
- **預期結果**: `currentDiceNumber.value === 0`；`isCompleted.value === false`；`isPaused.value === false`；`completedDice.value === []`

---

### TC-H5-049: startNight() 播報開場語音

- **前置條件**: TTS speak spy
- **測試步驟**: 啟動夜晚，允許第一段 speak resolve
- **預期結果**: `speak` 以 `'請所有人閉上眼睛，夜晚降臨了'` 為第一個參數呼叫

---

### TC-H5-050: startNight() 依序更新 currentDiceNumber

- **前置條件**: TTS mock 即時 resolve；fake timers 跳過 delay
- **測試步驟**: 推進完整夜晚流程
- **預期結果**: `currentDiceNumber.value` 依序經歷 1, 2, 3, 4, 5, 6

---

### TC-H5-051: startNight() 每個骰子播報正確文字

- **前置條件**: TTS speak spy；骰子 3 播報時暫停
- **測試步驟**: 逐骰子推進
- **預期結果**: `speak` 對骰子 3 以 `'骰子數字是 3 的玩家，請睜開眼睛'` 呼叫

---

### TC-H5-052: startNight() 每個骰子倒計時 5 秒

- **前置條件**: fake timers；waitForCountdown spy
- **測試步驟**: 處理骰子 1 後檢查計時器
- **預期結果**: `timer.startCountdown` 以 `5`（NIGHT_SECONDS_PER_DICE）呼叫

---

### TC-H5-053: startNight() 骰子完成後追加至 completedDice

- **前置條件**: 骰子 1 流程完成
- **測試步驟**: 處理骰子 1 完整流程（speak → countdown → speak '請閉上眼睛'）
- **預期結果**: `completedDice.value` 包含 `[1]`

---

### TC-H5-054: startNight() 完成後設定 isCompleted 並播報晨起語音

- **前置條件**: 完整夜晚流程
- **測試步驟**: 執行完所有 6 個骰子
- **預期結果**: `isCompleted.value === true`；`speak` 以 `'天亮了，請所有人睜開眼睛'` 呼叫

---

### TC-H5-055: pause() 暫停夜晚流程

- **前置條件**: 夜晚進行中（骰子 2 的倒計時）
- **測試步驟**: 呼叫 `pause()`
- **預期結果**: `isPaused.value === true`；`timer.pause()` 被呼叫；流程暫停不繼續

---

### TC-H5-056: resume() 恢復夜晚流程

- **前置條件**: 已呼叫 `pause()`
- **測試步驟**: 呼叫 `resume()`
- **預期結果**: `isPaused.value === false`；`timer.resume()` 被呼叫；pausePromiseResolve 被呼叫

---

### TC-H5-057: skip() 跳過當前等待（delay 或 countdown）

- **前置條件**: 夜晚進行中，當前在 delay 等待
- **測試步驟**: 呼叫 `skip()`
- **預期結果**: skipResolve 被呼叫；流程立即繼續至下一個骰子

---

### TC-H5-058: skip() 跳過倒計時

- **前置條件**: 夜晚進行中，當前在 waitForCountdown
- **測試步驟**: 呼叫 `skip()`
- **預期結果**: `timer.reset()` 被呼叫；流程繼續至 '請閉上眼睛' 播報

---

### TC-H5-059: abort() 立即中止所有流程

- **前置條件**: 夜晚進行中（骰子 3）
- **測試步驟**: 呼叫 `abort()`
- **預期結果**:
  - `aborted` 旗標設為 true（後續骰子不執行）
  - `isPaused.value === false`
  - TTS `stop()` 被呼叫
  - `timer.reset()` 被呼叫
  - skipResolve / pausePromiseResolve 被呼叫解除等待

---

### TC-H5-060: abort() 在 pause 狀態下也能中止

- **前置條件**: 夜晚 pause 中
- **測試步驟**: 呼叫 `abort()`
- **預期結果**: Promise 鏈不再 hang；`isCompleted.value === false`

---

### TC-H5-061: nightState computed 反映當前狀態

- **前置條件**: 骰子 4，countdown remaining = 3，isPaused = false
- **測試步驟**: 讀取 `nightState.value`
- **預期結果**: `{ currentDiceNumber: 4, remainingSeconds: 3, isCompleted: false, isPaused: false }`

---

### TC-H5-062: 邊界 — 第一個骰子前 abort 不播報任何骰子語音

- **前置條件**: TTS mock 即時 resolve
- **測試步驟**: `startNight(config)` 後在開場語音 resolve 前立即 `abort()`
- **預期結果**: 骰子 1 語音 `'骰子數字是 1 的玩家...'` 未被呼叫

---

## 六、useCheeseThiefGame.ts — 主遊戲編排器

**檔案路徑**: `h5/src/features/cheese-thief/composables/useCheeseThiefGame.ts`

**關鍵行為摘要**:
- `startGame()` 設定 phase 為 `'night'`，播放 night BGM，duck BGM，啟動夜晚
- 夜晚完成後自動 `nextPhase()` 進入 discussion
- `nextPhase()` / `prevPhase()` 依 phases 陣列索引移動（prevPhase 最低到 night）
- `endGame()` 播報勝利語音，播放 SFX，儲存記錄
- `playAgain()` 重置所有狀態回 setup

---

### TC-H5-063: startGame() 設定 phase 為 night

- **前置條件**: 所有依賴 mock
- **測試步驟**: 呼叫 `startGame(DEFAULT_GAME_CONFIG)`
- **預期結果**: `phase.value === 'night'`

---

### TC-H5-064: startGame() 播放 night BGM 並 duck

- **前置條件**: audio mock
- **測試步驟**: 呼叫 `startGame(config)`
- **預期結果**: `audio.playBgm('night')` 被呼叫；`audio.duckBgm()` 被呼叫

---

### TC-H5-065: startGame() 套用 config 音量設定

- **前置條件**: audio mock
- **測試步驟**: `startGame({ ...config, musicVolume: 0.6, sfxVolume: 0.4 })`
- **預期結果**: `audio.setBgmVolume(0.6)` 和 `audio.setSfxVolume(0.4)` 被呼叫

---

### TC-H5-066: 夜晚完成後自動進入 discussion

- **前置條件**: nightPhase mock 立即完成
- **測試步驟**: `startGame()` 後等待 nightPhase Promise resolve
- **預期結果**: `phase.value === 'discussion'`；`audio.unduckBgm()` 被呼叫

---

### TC-H5-067: nextPhase() 從 night 進入 discussion

- **前置條件**: `phase.value === 'night'`
- **測試步驟**: 呼叫 `nextPhase()`
- **預期結果**: `phase.value === 'discussion'`

---

### TC-H5-068: nextPhase() 從 discussion 進入 voting

- **前置條件**: `phase.value === 'discussion'`
- **測試步驟**: 呼叫 `nextPhase()`
- **預期結果**: `phase.value === 'voting'`

---

### TC-H5-069: nextPhase() 從 voting 進入 result

- **前置條件**: `phase.value === 'voting'`
- **測試步驟**: 呼叫 `nextPhase()`
- **預期結果**: `phase.value === 'result'`

---

### TC-H5-070: nextPhase() 在 result 時不繼續

- **前置條件**: `phase.value === 'result'`
- **測試步驟**: 呼叫 `nextPhase()`
- **預期結果**: `phase.value` 維持 `'result'`

---

### TC-H5-071: prevPhase() 從 discussion 回到 night

- **前置條件**: `phase.value === 'discussion'`
- **測試步驟**: 呼叫 `prevPhase()`
- **預期結果**: `phase.value === 'night'`

---

### TC-H5-072: prevPhase() 在 night 時不回到 setup

- **前置條件**: `phase.value === 'night'`
- **測試步驟**: 呼叫 `prevPhase()`
- **預期結果**: `phase.value` 維持 `'night'`（currentIndex = 1，不允許 < 1）

---

### TC-H5-073: enterPhase('discussion') 播放 day BGM 並啟動計時

- **前置條件**: audio mock；speak mock 立即 resolve；`config.discussionMinutes = 5`
- **測試步驟**: 進入 discussion phase
- **預期結果**: `audio.playBgm('day')` 被呼叫；discuss TTS 播報後 `discussionTimer.startCountdown(300)` 被呼叫

---

### TC-H5-074: enterPhase('voting') 啟動投票計時

- **前置條件**: speak mock 即時 resolve；`config.votingSeconds = 30`
- **測試步驟**: 進入 voting phase
- **預期結果**: 投票 TTS 播報後 `votingTimer.startCountdown(30)` 被呼叫

---

### TC-H5-075: enterPhase('result') 停止 BGM

- **前置條件**: audio mock；BGM 播放中
- **測試步驟**: 進入 result phase
- **預期結果**: `audio.stopBgm()` 被呼叫

---

### TC-H5-076: pauseGame() 暫停所有元件

- **前置條件**: 遊戲進行中
- **測試步驟**: 呼叫 `pauseGame()`
- **預期結果**:
  - `isPaused.value === true`
  - `nightPhase.pause()` 被呼叫
  - `discussionTimer.pause()` 被呼叫
  - `votingTimer.pause()` 被呼叫
  - `audio.pauseAll()` 被呼叫

---

### TC-H5-077: resumeGame() 恢復所有元件

- **前置條件**: 遊戲已暫停
- **測試步驟**: 呼叫 `resumeGame()`
- **預期結果**:
  - `isPaused.value === false`
  - `nightPhase.resume()` 被呼叫
  - `discussionTimer.resume()` 被呼叫
  - `votingTimer.resume()` 被呼叫
  - `audio.resumeAll()` 被呼叫

---

### TC-H5-078: endGame('villager') 播報村民勝利並播放 win SFX

- **前置條件**: speak mock；audio mock；addRecord mock
- **測試步驟**: 呼叫 `endGame('villager')`
- **預期結果**: `audio.playSfx('win')` 被呼叫；speak 包含 `'村民陣營獲勝'`

---

### TC-H5-079: endGame('thief') 播報大盜勝利並播放 lose SFX

- **前置條件**: 同上
- **測試步驟**: 呼叫 `endGame('thief')`
- **預期結果**: `audio.playSfx('lose')` 被呼叫；speak 包含 `'大盜陣營獲勝'`

---

### TC-H5-080: endGame() 儲存正確的 GameRecord

- **前置條件**: addRecord spy；`gameStartTime = Date.now() - 120000`（2 分鐘前）
- **測試步驟**: 呼叫 `endGame('villager')`
- **預期結果**: `addRecord` 以包含 `{ gameTemplate: 'cheese-thief', winningFaction: 'villager', durationMinutes: 2 }` 的物件呼叫

---

### TC-H5-081: playAgain() 重置所有狀態至 setup

- **前置條件**: 遊戲 result 階段
- **測試步驟**: 呼叫 `playAgain()`
- **預期結果**:
  - `phase.value === 'setup'`
  - `isPaused.value === false`
  - `nightPhase.abort()` 被呼叫
  - `audio.stopBgm()` 被呼叫

---

### TC-H5-082: cleanup() 釋放所有資源

- **前置條件**: 遊戲進行中
- **測試步驟**: 呼叫 `cleanup()`
- **預期結果**: `stopTts()`、`nightPhase.abort()`、`discussionTimer.reset()`、`votingTimer.reset()`、`audio.stopBgm()` 均被呼叫

---

### TC-H5-083: currentTimer computed 在不同 phase 回傳對應 timer

- **前置條件**: 所有 timer mock
- **測試步驟**: 分別設定 phase 為 discussion / voting / night，讀取 `currentTimer`
- **預期結果**: discussion → discussionTimer；voting → votingTimer；night → nightPhase.timer

---

### TC-H5-084: roleComposition computed 依 playerCount 正確計算

- **前置條件**: `config.playerCount = 7`
- **測試步驟**: 讀取 `roleComposition.value`
- **預期結果**: `{ thief: 2, accomplice: 1, sleepyMouse: 1, villager: 3 }`

---

## 七、settingsStore.ts — 設定持久化

**檔案路徑**: `h5/src/stores/settingsStore.ts`

**關鍵行為摘要**:
- 初始化時從 `localStorage['boardgame-host-settings']` 讀取
- 任意欄位變更時透過 `watch` 自動 persist
- 預設值：speechRate=1.0, speechVolume=1.0, musicVolume=0.3, sfxVolume=0.5, discussionMinutes=5, votingSeconds=30

---

### TC-H5-085: 初始化時載入 localStorage 設定

- **前置條件**: localStorage 有有效 JSON，speechRate=1.5
- **測試步驟**: 建立 store
- **預期結果**: `store.speechRate === 1.5`

---

### TC-H5-086: localStorage 無資料時使用預設值

- **前置條件**: localStorage 為空
- **測試步驟**: 建立 store
- **預期結果**: `{ speechRate: 1.0, speechVolume: 1.0, musicVolume: 0.3, sfxVolume: 0.5, defaultDiscussionMinutes: 5, defaultVotingSeconds: 30 }`

---

### TC-H5-087: localStorage JSON 損壞時使用預設值

- **前置條件**: `localStorage.setItem('boardgame-host-settings', '{invalid json}')`
- **測試步驟**: 建立 store
- **預期結果**: 使用預設值，不拋出例外

---

### TC-H5-088: 設定變更時自動寫入 localStorage

- **前置條件**: store 已初始化；localStorage spy
- **測試步驟**: `store.musicVolume = 0.8`；等待 nextTick
- **預期結果**: `localStorage.setItem` 被呼叫，值包含 `musicVolume: 0.8`

---

### TC-H5-089: 所有設定欄位變更均觸發 persist

- **前置條件**: localStorage spy
- **測試步驟**: 逐一修改 speechRate, speechVolume, musicVolume, sfxVolume, defaultDiscussionMinutes, defaultVotingSeconds
- **預期結果**: 每次變更後 `localStorage.setItem` 被呼叫

---

### TC-H5-090: persist() 儲存完整的 PersistedSettings 結構

- **前置條件**: 已修改部分設定
- **測試步驟**: 觸發 persist 後解析 localStorage 值
- **預期結果**: JSON 包含全部 6 個欄位

---

## 八、gameHistoryStore.ts — 歷史記錄 Pinia Store

**檔案路徑**: `h5/src/stores/gameHistoryStore.ts`

---

### TC-H5-091: loadRecords() 設定 isLoading 狀態

- **前置條件**: useGameHistory mock 有延遲
- **測試步驟**: 呼叫 `loadRecords()`，在 Promise resolve 前讀取 `isLoading`
- **預期結果**: `isLoading.value === true`；resolve 後 `isLoading.value === false`

---

### TC-H5-092: loadRecords() 更新 records 和 stats

- **前置條件**: getRecords() 回傳 2 筆；getStats() 回傳 `{ total: 2, thiefWins: 1, villagerWins: 1 }`
- **測試步驟**: 呼叫 `loadRecords()`
- **預期結果**: `records.value.length === 2`；`stats.value.total === 2`

---

### TC-H5-093: loadRecords() 失敗時 isLoading 仍重置為 false

- **前置條件**: getRecords() 拋出例外
- **測試步驟**: 呼叫 `loadRecords()`（catch 例外）
- **預期結果**: `isLoading.value === false`

---

### TC-H5-094: addRecord() 新增後重新載入列表

- **前置條件**: addRecord spy；loadRecords spy
- **測試步驟**: 呼叫 `store.addRecord(record)`
- **預期結果**: `history.addRecord(record)` 先被呼叫；之後 `loadRecords()` 被呼叫

---

### TC-H5-095: clearAll() 清空 records 和 stats

- **前置條件**: records 有 3 筆資料
- **測試步驟**: 呼叫 `clearAll()`
- **預期結果**: `records.value === []`；`stats.value === { total: 0, thiefWins: 0, villagerWins: 0 }`；`history.clearAll()` 被呼叫

---

## 九、CountdownTimer.vue — 倒計時顯示元件

**檔案路徑**: `h5/src/components/CountdownTimer.vue`

---

### TC-H5-096: 顯示秒數（< 60 秒）

- **前置條件**: `remaining=45, total=60`
- **測試步驟**: render 元件
- **預期結果**: 顯示文字 `'45'`

---

### TC-H5-097: 顯示分:秒格式（≥ 60 秒）

- **前置條件**: `remaining=125, total=300`
- **測試步驟**: render 元件
- **預期結果**: 顯示文字 `'2:05'`

---

### TC-H5-098: remaining=60 顯示 1:00

- **前置條件**: `remaining=60, total=60`
- **測試步驟**: render 元件
- **預期結果**: 顯示 `'1:00'`

---

### TC-H5-099: isUrgent — remaining <= urgentThreshold 時套用 urgent class

- **前置條件**: `remaining=8, total=60, urgentThreshold=10`
- **測試步驟**: render 元件
- **預期結果**: 根元素有 `.urgent` class；`.timer-display` 有 `.urgency` class

---

### TC-H5-100: isUrgent — remaining=0 時不顯示 urgent（已結束）

- **前置條件**: `remaining=0, total=60, urgentThreshold=10`
- **測試步驟**: render 元件
- **預期結果**: 無 `.urgent` class（`remaining > 0` 條件不滿足）

---

### TC-H5-101: urgentThreshold 預設為 10

- **前置條件**: `remaining=9, total=60`（不帶 urgentThreshold prop）
- **測試步驟**: render 元件
- **預期結果**: 有 `.urgent` class

---

### TC-H5-102: showProgress=true 時顯示進度條

- **前置條件**: `remaining=30, total=60, showProgress=true`
- **測試步驟**: render 元件
- **預期結果**: `.timer-progress` 存在；`.timer-progress-bar` 寬度約 50%

---

### TC-H5-103: showProgress=false 時不顯示進度條

- **前置條件**: `showProgress=false`
- **測試步驟**: render 元件
- **預期結果**: `.timer-progress` 不存在

---

### TC-H5-104: size='xl' 套用 timer-xl class

- **前置條件**: `size='xl'`
- **測試步驟**: render 元件
- **預期結果**: 根元素有 `.timer-xl` class

---

### TC-H5-105: total=0 時 progress 為 0（不發生除以零）

- **前置條件**: `remaining=0, total=0`
- **測試步驟**: render 元件
- **預期結果**: `.timer-progress-bar` 寬度為 0%；不拋出例外

---

## 十、GameSetupView.vue — 遊戲設定頁

**檔案路徑**: `h5/src/features/cheese-thief/views/GameSetupView.vue`

---

### TC-H5-106: 預設玩家人數為 6

- **前置條件**: settingsStore mock；router mock
- **測試步驟**: mount GameSetupView
- **預期結果**: 玩家人數 6 的按鈕有 `.active` class

---

### TC-H5-107: 點擊玩家人數按鈕更新選擇

- **前置條件**: mount GameSetupView
- **測試步驟**: 點擊顯示 `'8'` 的按鈕
- **預期結果**: `'8'` 按鈕取得 `.active` class；原 `'6'` 按鈕失去 `.active`

---

### TC-H5-108: 角色組成跟隨玩家人數即時更新

- **前置條件**: mount；初始 playerCount=6
- **測試步驟**: 點擊玩家人數 `'7'`
- **預期結果**: 角色顯示更新為 `{ thief: 2, accomplice: 1, sleepyMouse: 1, villager: 3 }`

---

### TC-H5-109: 討論時間遞減按鈕，最低 1 分鐘

- **前置條件**: mount；discussionMinutes=1
- **測試步驟**: 點擊 `-` 按鈕
- **預期結果**: 顯示仍為 `'1 分鐘'`（不低於 1）

---

### TC-H5-110: 討論時間遞增按鈕，最高 15 分鐘

- **前置條件**: mount；discussionMinutes=15
- **測試步驟**: 點擊 `+` 按鈕
- **預期結果**: 顯示仍為 `'15 分鐘'`（不超過 15）

---

### TC-H5-111: 投票時間遞減按鈕，最低 10 秒

- **前置條件**: mount；votingSeconds=10
- **測試步驟**: 點擊 `-` 按鈕
- **預期結果**: 顯示仍為 `'10 秒'`

---

### TC-H5-112: 投票時間遞增按鈕，最高 120 秒

- **前置條件**: mount；votingSeconds=120
- **測試步驟**: 點擊 `+` 按鈕
- **預期結果**: 顯示仍為 `'120 秒'`

---

### TC-H5-113: 點擊「規則語音說明」呼叫 speak

- **前置條件**: useTts mock
- **測試步驟**: 點擊「規則語音說明」按鈕
- **預期結果**: `speak` 以包含遊戲規則的長文本呼叫

---

### TC-H5-114: startGame() 儲存設定至 settingsStore

- **前置條件**: settingsStore mock；router mock
- **測試步驟**: 修改 musicVolume 為 0.7；點擊「開始遊戲」
- **預期結果**: `settings.musicVolume === 0.7`

---

### TC-H5-115: startGame() 導航至 play 頁並帶 config query

- **前置條件**: router push spy
- **測試步驟**: 點擊「開始遊戲」
- **預期結果**: `router.push` 以 `{ path: '/cheese-thief/play', query: { config: ... } }` 呼叫；config JSON 可正確 decode

---

### TC-H5-116: 點擊返回導航至首頁

- **前置條件**: router push spy
- **測試步驟**: 點擊返回按鈕（`←`）
- **預期結果**: `router.push('/')` 被呼叫

---

### TC-H5-117: 從 settingsStore 載入預設設定值

- **前置條件**: settingsStore mock 回傳 `{ defaultDiscussionMinutes: 8, defaultVotingSeconds: 60 }`
- **測試步驟**: mount GameSetupView
- **預期結果**: discussionMinutes 顯示 `'8 分鐘'`；votingSeconds 顯示 `'60 秒'`

---

## 十一、GamePlayView.vue — 核心主持頁

**檔案路徑**: `h5/src/features/cheese-thief/views/GamePlayView.vue`

---

### TC-H5-118: onMounted 時以 route.query.config 啟動遊戲

- **前置條件**: route.query.config 含有效 JSON config；useCheeseThiefGame mock
- **測試步驟**: mount GamePlayView
- **預期結果**: `game.startGame` 以 parsed config 呼叫

---

### TC-H5-119: route.query.config 無效時使用 DEFAULT_GAME_CONFIG

- **前置條件**: route.query.config = 'invalid'
- **測試步驟**: mount GamePlayView
- **預期結果**: `game.startGame` 以 DEFAULT_GAME_CONFIG 呼叫

---

### TC-H5-120: onUnmounted 時呼叫 cleanup

- **前置條件**: useCheeseThiefGame mock
- **測試步驟**: mount 後 unmount
- **預期結果**: `game.cleanup()` 被呼叫

---

### TC-H5-121: 夜晚階段顯示 PhaseIndicator 和 CountdownTimer

- **前置條件**: `game.phase.value = 'night'`
- **測試步驟**: mount GamePlayView
- **預期結果**: 頁面存在 PhaseIndicator 和 CountdownTimer 元件；顯示「夜晚」標籤

---

### TC-H5-122: 夜晚階段語音播報中顯示指示器

- **前置條件**: `game.nightPhase.isSpeaking.value = true`
- **測試步驟**: mount 並渲染
- **預期結果**: 存在 `.speaking-indicator`，文字含「語音播報中」

---

### TC-H5-123: 討論階段顯示討論計時器和「提前結束討論」按鈕

- **前置條件**: `game.phase.value = 'discussion'`
- **測試步驟**: mount
- **預期結果**: 存在「提前結束討論」按鈕；phase-label 顯示「白天討論」

---

### TC-H5-124: 投票階段顯示投票計時器和「進入結算」按鈕

- **前置條件**: `game.phase.value = 'voting'`
- **測試步驟**: mount
- **預期結果**: 存在「進入結算」按鈕；phase-label 顯示「投票」

---

### TC-H5-125: 結算階段顯示勝利選擇按鈕

- **前置條件**: `game.phase.value = 'result'`
- **測試步驟**: mount
- **預期結果**: 存在「村民陣營」和「大盜陣營」按鈕；存在「再來一局」和「返回首頁」按鈕

---

### TC-H5-126: 點擊暫停按鈕切換暫停狀態

- **前置條件**: `game.isPaused.value = false`
- **測試步驟**: 點擊暫停按鈕（`⏸`）
- **預期結果**: `game.pauseGame()` 被呼叫

---

### TC-H5-127: 已暫停時點擊按鈕恢復

- **前置條件**: `game.isPaused.value = true`
- **測試步驟**: 點擊暫停按鈕（`▶`）
- **預期結果**: `game.resumeGame()` 被呼叫

---

### TC-H5-128: 暫停時顯示 pause overlay

- **前置條件**: `game.isPaused.value = true`
- **測試步驟**: mount
- **預期結果**: 存在 `.pause-overlay`，文字含「已暫停」和「點擊任意處繼續」

---

### TC-H5-129: 點擊 overlay 恢復遊戲

- **前置條件**: `game.isPaused.value = true`
- **測試步驟**: 點擊 `.pause-overlay`
- **預期結果**: `game.resumeGame()` 被呼叫

---

### TC-H5-130: 點擊「跳過」呼叫 nightPhase.skip

- **前置條件**: `game.phase.value = 'night'`
- **測試步驟**: 點擊「跳過」按鈕
- **預期結果**: `game.nightPhase.skip()` 被呼叫

---

### TC-H5-131: 夜晚階段「上一步」按鈕禁用

- **前置條件**: `game.phase.value = 'night'`
- **測試步驟**: mount
- **預期結果**: 「上一步」按鈕有 `disabled` 屬性

---

### TC-H5-132: 結算階段「下一步」按鈕禁用

- **前置條件**: `game.phase.value = 'result'`
- **測試步驟**: mount
- **預期結果**: 「下一步」按鈕有 `disabled` 屬性

---

### TC-H5-133: 點擊「村民陣營」呼叫 endGame('villager')

- **前置條件**: `game.phase.value = 'result'`
- **測試步驟**: 點擊「村民陣營」按鈕
- **預期結果**: `game.endGame('villager')` 被呼叫

---

### TC-H5-134: 點擊「大盜陣營」呼叫 endGame('thief')

- **前置條件**: `game.phase.value = 'result'`
- **測試步驟**: 點擊「大盜陣營」按鈕
- **預期結果**: `game.endGame('thief')` 被呼叫

---

### TC-H5-135: 點擊「再來一局」呼叫 playAgain 並導航至 setup

- **前置條件**: router push spy；`game.phase.value = 'result'`
- **測試步驟**: 點擊「再來一局」
- **預期結果**: `game.playAgain()` 被呼叫；`router.push('/cheese-thief/setup')` 被呼叫

---

### TC-H5-136: 點擊「返回首頁」呼叫 cleanup 並導航至根路徑

- **前置條件**: router push spy
- **測試步驟**: 點擊「返回首頁」（或標題欄 `←`）
- **預期結果**: `game.cleanup()` 被呼叫；`router.push('/')` 被呼叫

---

### TC-H5-137: 音量面板切換顯示

- **前置條件**: `showVolumePanel = false`
- **測試步驟**: 點擊音量圖示按鈕（🔊）
- **預期結果**: `.volume-panel` 顯示；再次點擊後隱藏

---

### TC-H5-138: 調整 musicVolume 即時更新 audio

- **前置條件**: audio mock
- **測試步驟**: 修改 `localMusicVol`（v-model）
- **預期結果**: `game.audio.setBgmVolume(newValue)` 被呼叫

---

### TC-H5-139: data-phase 屬性在夜晚時為 'night'，其他時為 undefined

- **前置條件**: 分別設定 phase=night 和 phase=discussion
- **測試步驟**: 讀取根元素 `data-phase` 屬性
- **預期結果**: night → `'night'`；discussion → 無此屬性

---

## 十二、型別與常數驗證

**檔案路徑**: `h5/src/types/cheese-thief.ts`

---

### TC-H5-140: getRoleComposition() 4 人局正確組成

- **測試步驟**: `getRoleComposition(4)`
- **預期結果**: `{ thief: 1, accomplice: 0, sleepyMouse: 1, villager: 2 }`

---

### TC-H5-141: getRoleComposition() 5 人局正確組成

- **預期結果**: `{ thief: 1, accomplice: 1, sleepyMouse: 1, villager: 2 }`

---

### TC-H5-142: getRoleComposition() 6 人局正確組成

- **預期結果**: `{ thief: 1, accomplice: 1, sleepyMouse: 1, villager: 3 }`

---

### TC-H5-143: getRoleComposition() 7 人局正確組成

- **預期結果**: `{ thief: 2, accomplice: 1, sleepyMouse: 1, villager: 3 }`

---

### TC-H5-144: getRoleComposition() 8 人局正確組成

- **預期結果**: `{ thief: 2, accomplice: 1, sleepyMouse: 1, villager: 4 }`

---

### TC-H5-145: getRoleComposition() 未定義人數（如 3 人）回退至 6 人組成

- **測試步驟**: `getRoleComposition(3)`
- **預期結果**: 回傳 6 人組成（compositions[6] fallback）

---

### TC-H5-146: DICE_NUMBERS 包含 1 到 6 共 6 個元素

- **預期結果**: `[1, 2, 3, 4, 5, 6]`；length === 6

---

### TC-H5-147: NIGHT_SECONDS_PER_DICE 為 5

- **預期結果**: `NIGHT_SECONDS_PER_DICE === 5`

---

### TC-H5-148: DEFAULT_GAME_CONFIG 包含正確預設值

- **預期結果**: `{ playerCount: 6, discussionMinutes: 5, votingSeconds: 30, speechRate: 1.0, speechVolume: 1.0, musicVolume: 0.3, sfxVolume: 0.5 }`

---

## 十三、離線場景測試

---

### TC-H5-149: PWA 離線時 IndexedDB 仍可讀寫

- **前置條件**: Service Worker 快取已建立；模擬網路離線（offline mode）
- **測試步驟**: 新增 GameRecord；讀取 getRecords()
- **預期結果**: 新增成功；讀取到剛新增的記錄

---

### TC-H5-150: PWA 離線時遊戲可完整進行（不依賴網路 API）

- **前置條件**: 網路離線
- **測試步驟**: 執行完整遊戲流程（setup → night → discussion → voting → result）
- **預期結果**: 所有流程正常完成；設定與歷史記錄正常儲存

---

### TC-H5-151: 頁面重新整理後 settingsStore 從 localStorage 還原

- **前置條件**: 已修改設定並 persist；模擬頁面刷新（重新建立 store）
- **測試步驟**: 建立新 settingsStore 實例
- **預期結果**: 設定值與刷新前一致

---

### TC-H5-152: 頁面重新整理後 gameHistoryStore 從 IndexedDB 還原

- **前置條件**: 已有歷史記錄；模擬頁面刷新
- **測試步驟**: 呼叫 `loadRecords()`
- **預期結果**: records 還原為刷新前的資料

---

### TC-H5-153: Web Speech API 在私密瀏覽模式下的降級處理

- **前置條件**: `window.speechSynthesis` 存在但 `getVoices()` 回傳 `[]`
- **測試步驟**: 呼叫 `speak('測試')`
- **預期結果**: 不設定 voice，仍呼叫 `speechSynthesis.speak()`；不拋出例外

---

## 十四、邊界條件補充

---

### TC-H5-154: useTimer pause 後 remaining 繼續被 setInterval tick，但 isRunning=false 時不遞減

- **前置條件**: fake timers；pause 後推進 3 秒
- **測試步驟**: `startCountdown(10)` → 推進 2 秒 → `pause()` → 推進 3 秒
- **預期結果**: `remaining.value === 8`（僅遞減 2 秒）

---

### TC-H5-155: useNightPhase 連續呼叫 skip 不拋出例外

- **前置條件**: skipResolve 為 null（無等待中的 delay）
- **測試步驟**: 連續呼叫 `skip()` 兩次
- **預期結果**: 不拋出例外

---

### TC-H5-156: useCheeseThiefGame 在 night 結束但 phase 已被切換時不執行 nextPhase

- **前置條件**: nightPhase.startNight() 執行中；期間手動呼叫 nextPhase() 切換至 discussion
- **測試步驟**: nightPhase Promise resolve
- **預期結果**: `phase.value` 維持 `'discussion'`（不再次觸發 nextPhase）

---

### TC-H5-157: CountdownTimer remaining=1, urgentThreshold=1 時顯示 urgent

- **前置條件**: `remaining=1, total=60, urgentThreshold=1`
- **預期結果**: 有 `.urgent` class（`remaining <= threshold && remaining > 0`）

---

### TC-H5-158: useGameHistory getStats 所有記錄均為 thief wins 時 villagerWins 為 0

- **前置條件**: 3 筆記錄全為 `winningFaction: 'thief'`
- **測試步驟**: `getStats()`
- **預期結果**: `{ total: 3, thiefWins: 3, villagerWins: 0 }`

---

## 覆蓋率目標

| 模組 | 目標覆蓋率 | 優先級 |
|------|-----------|--------|
| `useTimer.ts` | 95% | P0 Critical |
| `useNightPhase.ts` | 95% | P0 Critical |
| `useCheeseThiefGame.ts` | 90% | P0 Critical |
| `useTts.ts` | 90% | P0 Critical |
| `types/cheese-thief.ts` | 100% | P0 Critical |
| `useGameHistory.ts` | 85% | P1 Important |
| `settingsStore.ts` | 85% | P1 Important |
| `gameHistoryStore.ts` | 80% | P1 Important |
| `useAudio.ts` | 80% | P1 Important |
| `CountdownTimer.vue` | 80% | P1 Important |
| `GameSetupView.vue` | 75% | P2 |
| `GamePlayView.vue` | 70% | P2 |
| **整體目標** | **80%** | |

---

## 優先級排序

### P0 Critical（必須，阻斷發布）
- TC-H5-028 ~ TC-H5-040：useTimer 倒計時核心邏輯
- TC-H5-048 ~ TC-H5-062：useNightPhase 夜晚流程（含 abort/pause/skip）
- TC-H5-063 ~ TC-H5-084：useCheeseThiefGame 階段轉換與狀態管理
- TC-H5-140 ~ TC-H5-148：型別與常數正確性

### P1 Important（重要，Sprint 內完成）
- TC-H5-001 ~ TC-H5-014：useTts 語音播報與 Chrome bug workaround
- TC-H5-041 ~ TC-H5-047：useGameHistory CRUD
- TC-H5-085 ~ TC-H5-095：settingsStore / gameHistoryStore 持久化
- TC-H5-096 ~ TC-H5-105：CountdownTimer 顯示邏輯
- TC-H5-149 ~ TC-H5-153：離線場景

### P2 Nice-to-have（加分項）
- TC-H5-015 ~ TC-H5-027：useAudio Howler 封裝細節
- TC-H5-106 ~ TC-H5-139：View 元件互動測試
- TC-H5-154 ~ TC-H5-158：邊界條件補充

---

## Mock 設計參考

```typescript
// speechSynthesis stub 範例
const mockUtterance = {
  lang: '',
  rate: 1,
  volume: 1,
  pitch: 1,
  voice: null,
  onstart: null as (() => void) | null,
  onend: null as (() => void) | null,
  onerror: null as ((e: { error: string }) => void) | null,
}

vi.stubGlobal('SpeechSynthesisUtterance', vi.fn(() => mockUtterance))
vi.stubGlobal('speechSynthesis', {
  speak: vi.fn((u) => { u.onstart?.(); u.onend?.() }),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  paused: false,
  getVoices: vi.fn(() => [
    { lang: 'zh-TW', name: 'Chinese TW' },
    { lang: 'en-US', name: 'English US' },
  ]),
})
```

```typescript
// Howl mock 範例
vi.mock('howler', () => ({
  Howl: vi.fn().mockImplementation(() => ({
    play: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    unload: vi.fn(),
    volume: vi.fn(),
    playing: vi.fn(() => false),
  })),
}))
```

```typescript
// Dexie mock 範例（或使用 fake-indexeddb）
vi.mock('dexie', () => {
  const records: any[] = []
  let nextId = 1
  return {
    default: class {
      version() { return { stores: () => {} } }
      gameRecords = {
        add: vi.fn(async (r) => { r.id = nextId++; records.push(r); return r.id }),
        toArray: vi.fn(async () => [...records]),
        orderBy: vi.fn(() => ({ reverse: () => ({ toArray: async () => [...records].reverse() }) })),
        clear: vi.fn(async () => { records.length = 0 }),
      }
    },
  }
})
```
