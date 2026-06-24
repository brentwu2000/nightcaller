# 奶酪大盜 (Cheese Thief) 靜態測試審查報告

**審查日期**: 2026-03-10
**審查員**: test-runner (靜態分析模式)
**審查範圍**: 7 個測試檔案 + 對應實作程式碼

---

## 審查摘要

| 指標 | 數值 |
|------|------|
| 審查測試檔案數 | 7 |
| 審查實作檔案數 | 16+ |
| 發現 BLOCKER 問題 | 4 |
| 發現 SUGGESTION 問題 | 9 |
| 整體品質評分 | 黃 (YELLOW) |

**整體評語**: 測試架構設計完善，結構清晰，Fixture/Mock 層設計合理。核心 Domain 層測試（UseCase）品質高。但存在 4 個阻塞性問題（其中 1 個會導致部分測試在執行時行為不可預測，3 個涉及未覆蓋的公開方法），以及多個中等品質問題需要補強。

---

## 一、一致性問題清單（測試與實作不匹配）

### ISSUE-01：CheeseThiefPlayerEntity 缺少 `part '*.g.dart'` 導致無 fromJson（嚴重度：中）

**位置**: `app/lib/features/cheese_thief/domain/entities/cheese_thief_player_entity.dart`

**問題**: `cheese_thief_player_entity.dart` 僅有 `part '*.freezed.dart'`，沒有 `part '*.g.dart'`，也沒有 `fromJson` factory。而 `cheese_thief_game_entity.dart` 同時有 `.freezed.dart` 和 `.g.dart` 並宣告了 `fromJson`。

由於 `CheeseThiefGameEntity` 包含 `List<CheeseThiefPlayerEntity>` 且有 `fromJson`，若 Hive 或 Supabase 需要反序列化玩家列表，`CheeseThiefPlayerEntity` 缺少 `@JsonSerializable` 標記會導致 `CheeseThiefGameEntity.fromJson` 在解析嵌套玩家時無法正常運作。

**對測試的影響**: 測試中直接建構物件，不走 `fromJson`，因此測試本身不會失敗。但這是實作層的潛在 bug，Fixture 無法揭露此問題。

---

### ISSUE-02：`calculate_result_usecase.dart` 的 `syncGameRecord` fire-and-forget 未使用 `unawaited()`（嚴重度：中）

**位置**: `app/lib/features/cheese_thief/domain/usecases/calculate_result_usecase.dart:40`

```dart
// 實作（第 37-41 行）
result.fold(
  (_) => null,
  (voteResult) => _repository.syncGameRecord(game, voteResult),  // 回傳 Future，未 await 也未 unawaited()
);
```

**問題**: `syncGameRecord` 回傳 `Future<Either<Failure, Unit>>`，此處的 lambda 回傳了 `Future` 但未加 `unawaited()` 宣告，在 `dart analyze --fatal-infos` 模式下會觸發 `unawaited_futures` lint 警告，若 CI 設定 `--fatal-infos` 則建置失敗。

**對應測試**:
`app/test/features/cheese_thief/domain/usecases/calculate_result_usecase_test.dart:291-325`，測試使用 `await Future.delayed(Duration.zero)` 等待非同步上傳，這個模式是正確的，但測試可能因 lint 錯誤在 CI 前就失敗。

---

### ISSUE-03：`night_phase_notifier_test.dart` 中 `dispose()` 驗證的假設不一定成立（嚴重度：中）

**位置**: `app/test/features/cheese_thief/presentation/providers/night_phase_notifier_test.dart:388-392`

```dart
test('dispose 呼叫 voice.stop()', () {
  final n = NightPhaseNotifier(mockVoice);
  n.dispose();
  verify(() => mockVoice.stop()).called(greaterThanOrEqualTo(1));
});
```

**問題**: `NightPhaseNotifier.dispose()` 中（實作第 135 行）呼叫 `_voice.stop()` 但沒有 `await`，因為 `dispose()` 是同步的。`_voice.stop()` 回傳 `Future<Either<Failure, Unit>>`，這個 Future 被丟棄。測試中 `verify(...).called(greaterThanOrEqualTo(1))` 驗證的是方法被「呼叫」，由於 `stop()` 是同步啟動的（即使 Future 被丟棄），`verify` 實際上可以通過。但這在 dart analyze 下也會出現 `unawaited_futures` 警告。

此外，`tearDown` 中已呼叫 `notifier.dispose()`（setUp 建立的 notifier），而這個新建的 `n` 會再呼叫一次 `stop()`，導致 `verify` 的計數同時包含 tearDown 觸發的呼叫（若測試順序或共享 mock 有問題）。由於 `n` 使用了與 `notifier` 相同的 `mockVoice` 實例，而 `tearDown` 中 `notifier.dispose()` 也會呼叫 `stop()`，整個測試執行期間 `stop()` 可能被呼叫多次，`greaterThanOrEqualTo(1)` 雖然可以通過，但實際驗證效果被稀釋。

---

### ISSUE-04：`game_state_machine_test.dart` 中直接建構 `GameStateMachine` 與透過 `ProviderContainer` 使用的方式混用，但 ProviderContainer 測試缺少 `addTearDown` 一致性（輕微）

**位置**: `app/test/features/cheese_thief/presentation/providers/game_state_machine_test.dart:59-81`

`buildContainer()` 輔助函式建立的 `ProviderContainer` 不在函式內部呼叫 `addTearDown(container.dispose)`，需要呼叫端自行管理（在實際使用位置 L398、L412、L439 有正確加上 `addTearDown`），但 `buildContainer()` 函式本身若被其他測試使用而忘記加 `addTearDown`，會造成資源洩漏。這是輕微的設計問題，尚未造成實際問題。

---

## 二、缺失測試清單

### MISSING-01：`GameStateMachine.assignRoles()` 公開方法未測試

**優先級**: BLOCKER

**說明**: `game_state_provider.dart` 的 `GameStateMachine` 有公開方法 `assignRoles()（第 94-113 行）`，此方法：
- 呼叫 `_assignRoles` UseCase
- 成功後更新 `game` 且將 `phase` 強制設為 `GamePhase.roleAssigned`
- 失敗後設置 `errorMessage`

**測試檔案** `game_state_machine_test.dart` 中完全沒有測試 `assignRoles()` 的測試案例。這是核心遊戲流程（準備 → 角色分配）的關鍵方法。

**應補充的測試案例**:
- `assignRoles()` 成功時 phase 更新為 `roleAssigned`
- `assignRoles()` game 為 null 時提前返回
- `assignRoles()` 失敗時設置 `errorMessage`
- `assignRoles()` 期間 `isLoading` 為 true

---

### MISSING-02：`GameStateMachine.finalizeResult()` 公開方法未測試

**優先級**: BLOCKER

**說明**: `GameStateMachine.finalizeResult()`（第 191-224 行）是整個遊戲結算的核心方法：
- 呼叫 `_calculateResult` UseCase
- 成功後設置 `endedAt` 並將 `phase` 更新為 `result`
- 更新 `game.endedAt = DateTime.now()`

**測試檔案** `game_state_machine_test.dart` 完全沒有覆蓋此方法。

**應補充的測試案例**:
- `finalizeResult()` 成功時 phase 更新為 `result`
- `finalizeResult()` 成功時 `game.endedAt` 不為 null
- `finalizeResult()` game 為 null 時提前返回
- `finalizeResult()` 失敗時設置 `errorMessage`

---

### MISSING-03：`GameStateMachine.playAgain()` 公開方法未測試

**優先級**: BLOCKER

**說明**: `GameStateMachine.playAgain()`（第 230-248 行）呼叫 `JoinGameUseCase` 並重置遊戲到 `preparing` 階段。測試檔案中完全沒有此方法的測試。

**應補充的測試案例**:
- `playAgain()` 成功時 phase 重置為 `preparing`
- `playAgain()` 成功時 `game` 被替換為新遊戲
- `playAgain()` game 為 null 時提前返回
- `playAgain()` 失敗時設置 `errorMessage`

---

### MISSING-04：`GameStateMachine.setCheeseStolen()` 公開方法未測試

**優先級**: BLOCKER

**說明**: `GameStateMachine.setCheeseStolen()`（第 176-185 行）呼叫 `StealCheeseUseCase`，決定奶酪是否被偷，這是遊戲的核心狀態之一。測試檔案完全沒有此方法的測試。

**應補充的測試案例**:
- `setCheeseStolen(stolen: true)` 成功後 `game.isCheeseStolen = true`
- `setCheeseStolen(stolen: false)` 成功後 `game.isCheeseStolen = false`
- game 為 null 時提前返回
- UseCase 失敗時設置 `errorMessage`

---

### MISSING-05：`GameStateMachine.goToPreviousPlayer()` 公開方法未測試

**優先級**: SUGGESTION

**說明**: `goToPreviousPlayer()`（第 137-154 行）允許角色分配時重看上一位玩家。測試中沒有任何此方法的測試案例。

---

### MISSING-06：`GameStateMachine.confirmPlayerRole()` 僅有 null game 的邊界測試

**優先級**: SUGGESTION

**說明**: `game_state_machine_test.dart:351-358` 只測試了 game 為 null 的情況。缺少：
- game 存在時確認角色後 `hasConfirmedRole = true`
- `roleAssignmentIndex` 遞增邏輯
- 多次呼叫後最終 `allPlayersConfirmed = true` 的場景

---

### MISSING-07：`NightPhaseNotifier` 靜音模式下語音是否被跳過未測試

**優先級**: SUGGESTION

**說明**: `NightPhaseState.isMuted` 存在，`setMuted()` 有測試，但 `startNight()` 等語音呼叫時是否尊重 `isMuted` 狀態（不呼叫 `_voice.speak()`）完全未被測試。查看 `night_phase_provider.dart` 的實作，也確實沒有在 `_voice.speak()` 之前加入 `isMuted` 的守衛條件，這是實作與預期行為（靜音改為閃爍動畫）之間的潛在設計缺口。

---

### MISSING-08：`AssignRolesUseCase` Repository 回傳 Left(Failure) 時未測試

**優先級**: SUGGESTION

**說明**: `assign_roles_usecase_test.dart` 中 Repository 錯誤傳遞的測試案例完全缺失。當 `mockRepository.updateGame()` 回傳 `Left(Failure)` 時，UseCase 應該將 Failure 原樣回傳，但此路徑沒有測試覆蓋。

---

### MISSING-09：`SubmitVoteUseCase` 的 `isThiefCaught` 參數實際傳遞驗證缺失

**優先級**: SUGGESTION

**說明**: `submit_vote_usecase_test.dart` 驗證了 `gameId` 正確傳入 `finalizeVote`（第 97-122 行），但沒有驗證 `isThiefCaught` 和 `voteMap` 的確切值是否被正確傳遞（用 `any()` 而非具體值 matcher）。雖然這對功能正確性影響不大，但測試精確度不足。

---

## 三、品質問題清單

### QUALITY-01：`calculate_result_usecase_test.dart` 對 accusedSeats 的驗證部分依賴 mock 回傳值而非 UseCase 邏輯

**嚴重度**: 中

**說明**: `CalculateResultUseCase.call()` 的實作會重新計算 `accusedSeats`（第 20-24 行），然後用 `copyWith` 覆蓋 repository 回傳的 `accusedSeats`（第 44-48 行）。但測試中 mock 的 `finalizeVote` 已直接回傳了含有正確 `accusedSeats` 的 `VoteResultEntity`，導致測試實際上在驗證 UseCase 重新計算的 `accusedSeats` 是否等於 mock 預設的值，而非測試 UseCase 內部計算邏輯本身。

**修復方向**: 讓 mock 的 `finalizeVote` 回傳空的 `accusedSeats`（或故意錯誤的值），再驗證 UseCase 的 `copyWith` 覆蓋邏輯是否正確計算了 `accusedSeats`。

---

### QUALITY-02：`game_state_machine_test.dart` 對 `isLoading` 中間狀態的測試有 flaky 風險

**嚴重度**: 低

**位置**: `app/test/features/cheese_thief/presentation/providers/game_state_machine_test.dart:248-273`

```dart
test('建立遊戲期間 isLoading 為 true（驗證中間狀態）', () async {
  // ...
  final future = machine.startNewGame(playerCount: 6, discussionMinutes: 3);
  // 立即檢查 loading 狀態（在 await 之前）
  expect(machine.state.isLoading, isTrue);
  await future;
```

**說明**: 此測試依賴 Dart 事件循環的調度時序，在 `startNewGame` 啟動後、第一個 microtask 執行前，`isLoading` 應已被設為 `true`（因為 `state = state.copyWith(isLoading: true)` 是同步執行的）。這個假設目前成立，但若實作改變（例如改為 `await Future.microtask(() => ...)`），則測試會失敗。屬於低風險但需要留意的設計。

---

### QUALITY-03：`night_phase_notifier_test.dart` 的 `startNight` 計時驗證依賴 3 秒硬編碼延遲

**嚴重度**: 中

**位置**: `app/test/features/cheese_thief/presentation/providers/night_phase_notifier_test.dart:111-118`

```dart
test('startNight 後 3 秒完成語音延遲，currentDiceNumber = 1', () {
  fakeAsync((async) {
    notifier.startNight(hasAccomplice: false, discussionMinutes: 3);
    async.elapse(const Duration(seconds: 3));
    expect(notifier.state.currentDiceNumber, equals(1));
  });
});
```

**說明**: 實作中的 `await Future.delayed(const Duration(seconds: 3))` 是硬編碼。這段 3 秒延遲實際上是「等待 TTS 播放完成」的估算值（實作中也說明了「實際實作中應監聽 TTS 的 completion callback」）。此設計是技術債，但在 `fakeAsync` 環境中只要延遲值吻合就能通過測試，目前不會造成 flaky，但一旦改為 TTS callback 驅動後，計時測試需要全部重寫。

---

### QUALITY-04：`mock_repositories.dart` 未 Mock `CheeseThiefVoiceRepository` 的所有方法

**嚴重度**: 低

**說明**: `MockCheeseThiefVoiceRepository` 繼承 `Mock implements CheeseThiefVoiceRepository`，但 `CheeseThiefVoiceRepository` 有 `isVoicePackReady()`、`downloadVoicePack()`、`isMuted()` 三個方法，在測試中沒有設置 stub。如果測試中某個路徑觸發了這些方法，mocktail 會拋出 `MissingStubError`。目前 `night_phase_notifier_test.dart` 的測試路徑沒有觸發這些方法，所以暫時不影響現有測試，但未來擴充測試時可能忘記補充。

---

### QUALITY-05：部分 Fixture 假設與遊戲規則有細微差異

**位置**: `app/test/helpers/cheese_thief_fixtures.dart:199-249`

**說明**: `assignedSeats8()` 中座位 2 和座位 3 都是 `accomplice`（共犯 ×2），符合 `accompliceCountFor(8) = 2` 的規則。但 `assignedSeats6()` 中只有座位 2 是 `accomplice`（共犯 ×1），符合 `accompliceCountFor(6) = 1`。這些 Fixture 本身正確，但 `CheeseThiefGameFixture.result4PlayersThiefCaught()` 在第 98 行設置了 `isCheeseStolen: true`，但其描述（大盜被逮）通常應代表奶酪**未**被偷走（大盜被識破就沒機會偷）。這個語意不一致可能造成使用此 Fixture 的測試誤判結算邏輯。

---

## 四、修復建議

### BLOCKER（必須修復才能確保測試套件完整覆蓋核心功能）

**B1. 補充 `assignRoles()` 測試**

在 `game_state_machine_test.dart` 新增 group：

```dart
group('assignRoles', () {
  test('game 為 null 時 assignRoles 不改變狀態', () async {
    final machine = buildStateMachine();
    final initialState = machine.state;
    await machine.assignRoles();
    expect(machine.state, equals(initialState));
  });

  test('assignRoles 成功後 phase 更新為 roleAssigned', () async {
    final mockAssignRoles = MockAssignRolesUseCase();
    final game = CheeseThiefGameFixture.preparing6Players();
    final assignedGame = CheeseThiefGameFixture.roleAssigned8Players();

    when(() => mockAssignRoles(game: any(named: 'game')))
        .thenAnswer((_) async => Right(assignedGame));

    final machine = buildStateMachine(assignRoles: mockAssignRoles);
    // 先注入 game（透過 startNewGame 或 transitionTo）
    // ...
    await machine.assignRoles();

    expect(machine.state.phase, equals(GamePhase.roleAssigned));
    expect(machine.state.isLoading, isFalse);
  });

  test('assignRoles 失敗時設置 errorMessage', () async {
    // ...
  });
});
```

**B2. 補充 `finalizeResult()` 測試**

```dart
group('finalizeResult', () {
  test('game 為 null 時提前返回', () async { ... });
  test('成功時 phase 更新為 result', () async { ... });
  test('成功時 game.endedAt 不為 null', () async { ... });
  test('失敗時設置 errorMessage', () async { ... });
});
```

**B3. 補充 `playAgain()` 測試**

```dart
group('playAgain', () {
  test('game 為 null 時提前返回', () async { ... });
  test('成功時 phase 重置為 preparing', () async { ... });
  test('成功時 game 被新遊戲替換', () async { ... });
});
```

**B4. 補充 `setCheeseStolen()` 測試**

```dart
group('setCheeseStolen', () {
  test('stolen=true 成功後 game.isCheeseStolen = true', () async { ... });
  test('game 為 null 時提前返回', () async { ... });
});
```

**B5. 修正 `calculate_result_usecase.dart` 的 unawaited Future**

```dart
// 修改前（第 40 行）
(voteResult) => _repository.syncGameRecord(game, voteResult),

// 修改後
(voteResult) {
  unawaited(_repository.syncGameRecord(game, voteResult));
},
```

需在檔案頂部加入 `import 'dart:async';`（若未 import）。

---

### SUGGESTION（建議改善，不影響現有測試執行）

**S1. 補充 `AssignRolesUseCase` Repository 錯誤傳遞測試**

```dart
group('Repository 錯誤傳遞', () {
  test('updateGame 失敗時回傳 Left(Failure)', () async {
    when(() => mockRepository.updateGame(any()))
        .thenAnswer((_) async => const Left(CacheFailure('儲存失敗')));

    final game = CheeseThiefGameFixture.preparingWithCount(4);
    final result = await useCase(game: game);

    expect(result.isLeft(), isTrue);
  });
});
```

**S2. 補充 `confirmPlayerRole()` 有 game 時的行為測試**

需要在測試中先透過 mock 注入 game，再測試座位角色確認邏輯。

**S3. 修正 `result4PlayersThiefCaught` Fixture 語意**

`isCheeseStolen: true` 在「大盜被逮」的情境下語意不明，建議根據實際遊戲規則選擇 `true` 或 `false`，並更新註解說明。

**S4. 在 `buildContainer()` 內加入 `addTearDown`**

```dart
ProviderContainer buildContainer({...}) {
  final container = ProviderContainer(overrides: [...]);
  addTearDown(container.dispose);  // 加入這行
  return container;
}
```

**S5. 補充 `MockCheeseThiefVoiceRepository` 其餘方法的 stub**

在 `registerFallbackValues()` 或測試 `setUp` 中補充：
```dart
when(() => mockVoice.isVoicePackReady()).thenAnswer((_) async => true);
when(() => mockVoice.isMuted()).thenAnswer((_) async => false);
```

**S6. 靜音模式行為驗證**

如果 `isMuted = true` 時應跳過語音，需在 `NightPhaseNotifier` 實作中加入守衛，並補充測試：
```dart
test('isMuted=true 時 startNight 不呼叫 voice.speak', () async { ... });
```

**S7. `CalculateResultUseCase` accusedSeats 計算測試的改進**

讓 mock 回傳 accusedSeats 為空列表，驗證 UseCase 會正確覆蓋為自行計算的結果。

---

## 五、結論

### 整體評分：黃 (YELLOW)

**可以執行（理論上）的測試**: 全部 7 個檔案的測試，在補足 code generation（freezed、json_serializable）後可以執行，不存在明顯的 import 錯誤或 API 不匹配問題。

**測試覆蓋的強項**:
- `GamePhase` 狀態機轉換：覆蓋全面，合法/非法/邊界全部覆蓋
- `PeekDiceUseCase`：邊界值、錯誤路徑、Repository 呼叫驗證俱全
- `SubmitVoteUseCase`：票數驗證邏輯覆蓋完整，含各人數迴圈測試
- `AssignRolesUseCase`：角色組成、隨機性、Repository 互動均有測試
- `NightPhaseNotifier`：fakeAsync 計時驅動是亮點設計

**測試覆蓋的弱點**:
- `GameStateMachine` 有 5 個公開方法（`assignRoles`、`finalizeResult`、`playAgain`、`setCheeseStolen`、`goToPreviousPlayer`）完全未測試，這些方法都是遊戲主流程的關鍵節點，屬於 BLOCKER 問題
- `CalculateResultUseCase` 對 `accusedSeats` 自行計算邏輯的驗證不夠直接

**是否足以保證遊戲品質**: **尚不足夠**。

`GameStateMachine` 是整個遊戲流程的樞紐，其 4 個核心方法（角色分配、奶酪結算、遊戲結算、再玩一局）均缺乏測試覆蓋，這意味著若這些方法的業務邏輯出現 bug，現有測試套件無法捕獲。建議在第一輪修復中優先補充這 4 個 BLOCKER 測試，完成後整體測試套件品質可提升至綠色（GREEN）。
