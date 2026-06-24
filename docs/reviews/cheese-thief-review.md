# 代碼審查報告：奶酪大盜 (Cheese Thief)

> **審查者**: Tech Lead (Linus 風格)
> **審查日期**: 2026-03-10
> **審查版本**: v1.0 Draft
> **審查基準**: `.claude/rules/` 憲法文件

---

## 1. 總體評分

**🟡 可接受 — 帶條件進入下一階段**

整體架構思路正確，Clean Architecture 分層清晰，Database 設計尤為出色。但存在數個必須在進入測試階段前修復的 BLOCKER，以及影響生產可靠性的 MAJOR 問題。

---

## 2. 架構評分

| 維度 | 評分 | 說明 |
|------|------|------|
| Clean Architecture 分層 | 🟢 90/100 | Domain 層乾淨，無 Flutter 依賴，方向正確 |
| Repository 模式 | 🟢 88/100 | 介面與實作分離完整，離線優先策略合理 |
| 狀態機設計 | 🟢 92/100 | GamePhase 單向轉換防護精良，是本模組最好的設計 |
| Riverpod Provider 設計 | 🟡 72/100 | autoDispose 使用不一致；votingProvider 初始化有空值風險 |
| 資料庫 Schema | 🟢 95/100 | RLS 政策細緻，View 欄位遮蔽方案是亮點 |
| Edge Functions | 🟡 78/100 | 核心函數品質高，但與 Flutter 資料模型存在語義不一致 |
| 遊戲邏輯正確性 | 🟡 75/100 | Fisher-Yates 正確，但勝負判定流程有重複計算問題 |
| 安全性 | 🟡 80/100 | x-user-id workaround 正確實作，但 RLS 有潛在繞過風險 |
| 離線支援 | 🟢 85/100 | PendingSync Queue 設計合理，但 pendingSync 在 syncGameRecord 中未被實際使用 |
| 程式碼品質 | 🟡 76/100 | 存在 dynamic 使用、硬編碼字串、helper 類別業務邏輯複製問題 |

---

## 3. 問題清單

### 🔴 BLOCKER（必須修復，阻擋進入測試階段）

---

#### BLOCKER-01: `result_page.dart` 使用 `dynamic` 類型，違反零 dynamic 政策

**位置**: `/app/lib/features/cheese_thief/presentation/pages/result_page.dart:42`

```dart
// 當前錯誤程式碼
class _ResultBody extends StatelessWidget {
  final dynamic game;  // ← BLOCKER：明確違反 coding-style.md §1.1
```

**現象**: `game.players.length as int`（第 100 行）和 `player.seatNumber as int`（第 106 行）都需要強轉，說明型別安全已經破洞。

**修復方案**:
```dart
class _ResultBody extends StatelessWidget {
  const _ResultBody({
    required this.result,
    required this.game,    // 改為具體型別
    required this.ref,
  });

  final VoteResultEntity result;
  final CheeseThiefGameEntity game;  // ← 具體型別
  final WidgetRef ref;
```

第 100 行直接移除 `as int` 強轉，因為 `game.players.length` 本身就是 `int`。

---

#### BLOCKER-02: `getGameHistory()` 中 userId 為空字串，歷史記錄永遠無法讀取

**位置**: `/app/lib/features/cheese_thief/data/repositories/cheese_thief_game_repository_impl.dart:201`

```dart
// 當前錯誤程式碼
final userId = ''; // 從 auth 取得
final models = await _remote.getGameRecords(userId: userId);
```

這是一個未完成的 TODO，以空字串查詢 Supabase 會返回空列表或錯誤，歷史記錄頁永遠顯示空白。

**修復方案**: `CheeseThiefGameRepositoryImpl` 需要注入 `SupabaseClient` 或獨立的 `authRepository`。最小改動方案：

```dart
class CheeseThiefGameRepositoryImpl implements CheeseThiefGameRepository {
  final CheeseThiefLocalDataSource _local;
  final CheeseThiefRemoteDataSource _remote;
  final SupabaseClient _supabase;  // 新增

  // ...

  @override
  Future<Either<Failure, List<GameRecordSummary>>> getGameHistory() async {
    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) return const Right([]);  // 未登入
      final models = await _remote.getGameRecords(userId: userId);
      return Right(models.map((m) => m.toEntity()).toList());
    } catch (_) {
      return const Right([]);
    }
  }
}
```

並在 `use_case_providers.dart` 中更新注入:
```dart
final cheeseThiefGameRepositoryProvider = Provider<CheeseThiefGameRepository>((ref) {
  return CheeseThiefGameRepositoryImpl(
    local: ref.watch(cheeseThiefLocalDataSourceProvider),
    remote: ref.watch(cheeseThiefRemoteDataSourceProvider),
    supabase: ref.watch(supabaseClientProvider),  // 新增
  );
});
```

---

#### BLOCKER-03: 夜晚計時器未等待 TTS 完成，直接啟動倒數，導致語音與計時不同步

**位置**: `/app/lib/features/cheese_thief/presentation/providers/night_phase_provider.dart:33-37`

```dart
// 當前問題程式碼
await _voice.speak(const NightStartScript());

// 語音結束後（預估 3 秒），開始第 1 號碼
// 實際實作中應監聽 TTS 的 completion callback
await Future.delayed(const Duration(seconds: 3));  // ← 硬編碼等待時間
await _advanceToNumber(1);
```

`flutter_tts` 提供 `setCompletionHandler` callback，應使用它而非固定 3 秒延遲。若語音在慢速設備上播放超過 3 秒，計時器就會在語音結束前啟動，玩家聽到「骰子 1 號」的同時計時已跑了一半。

**修復方案**: 在 `CheeseThiefVoiceRepositoryImpl` 中加入 `Future<void> speakAndWait(VoiceScript script)` 方法：

```dart
// voice_repository_impl.dart
Completer<void>? _ttsCompleter;

Future<Either<Failure, Unit>> speakAndWait(VoiceScript script) async {
  try {
    _ttsCompleter = Completer<void>();
    _tts.setCompletionHandler(() {
      if (!(_ttsCompleter?.isCompleted ?? true)) {
        _ttsCompleter?.complete();
      }
    });
    final text = _buildScriptText(script);
    await _tts.speak(text);
    await _ttsCompleter!.future.timeout(
      const Duration(seconds: 30),
      onTimeout: () {},  // 超時後繼續，避免永久阻塞
    );
    return const Right(unit);
  } catch (e) {
    return Left(ServerFailure('語音播放失敗：$e'));
  }
}
```

或者在 Repository interface 中新增此方法，讓 `NightPhaseNotifier` 等待完成再推進號碼。

---

#### BLOCKER-04: `RoleAssignmentPage` 架構文件承諾防截圖，但實作中完全缺失

**位置**: 架構文件 `/docs/architecture/cheese-thief-architecture.md:996-1009`

架構文件中明確記載了 `FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE)` 防截圖設計，但 `/app/lib/features/cheese_thief/presentation/pages/role_assignment_page.dart` 的 `initState` 和 `dispose` 中完全沒有此程式碼。

這不只是功能缺失，更是安全問題——玩家截圖角色卡後傳給他人，嚴重破壞遊戲平衡。

**修復方案**:
```dart
@override
void initState() {
  super.initState();
  FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE);
  WidgetsBinding.instance.addPostFrameCallback((_) => _tryAssignRoles());
}

@override
void dispose() {
  FlutterWindowManager.clearFlags(FlutterWindowManager.FLAG_SECURE);
  super.dispose();
}
```

並在 `pubspec.yaml` 確認 `flutter_window_manager` 已列為依賴項。

---

#### BLOCKER-05: `CalculateResultUseCase` 與 `CheeseThiefGameRepositoryImpl.finalizeVote()` 重複計算 `accusedSeats`，且最終值以 UseCase 覆蓋為準，Repository 計算結果被丟棄

**位置**: `/app/lib/features/cheese_thief/domain/usecases/calculate_result_usecase.dart:19-48`

```dart
// UseCase 計算一次 accusedSeats
final maxVotes = voteMap.values.fold(0, (max, v) => v > max ? v : max);
final accusedSeats = voteMap.entries...  // 計算 #1

// Repository 內部也計算一次（finalizeVote）
// Repository 回傳含 accusedSeats 的 VoteResultEntity

// UseCase 最後用自己算的覆蓋 Repository 回傳的值
return result.map(
  (voteResult) => voteResult.copyWith(
    accusedSeats: accusedSeats,  // ← 覆蓋 Repository 的計算結果
    winner: winner,
    isThiefCaught: isThiefCaught,
  ),
);
```

這表示 `finalizeVote` 裡面計算的 `accusedSeats` 是無用計算，業務邏輯重複且有潛在不一致風險（若兩處計算邏輯不同）。

**修復方案**: 將 `accusedSeats` 的計算責任統一在 `CalculateResultUseCase`，`finalizeVote` 只負責持久化，不負責計算：

```dart
// Repository 介面調整
Future<Either<Failure, VoteResultEntity>> finalizeVote({
  required String gameId,
  required Map<int, int> voteMap,
  required List<int> accusedSeats,  // 由 UseCase 傳入
  required bool isThiefCaught,
  required WinnerCamp winner,       // 由 UseCase 傳入
});
```

---

### 🟡 MAJOR（強烈建議修復，影響生產品質）

---

#### MAJOR-01: `syncGameRecord()` 承諾「失敗放入 pending queue」但實際實作為空操作

**位置**: `/app/lib/features/cheese_thief/data/repositories/cheese_thief_game_repository_impl.dart:190-193`

```dart
} catch (_) {
  // 失敗時放入 pending queue，不回傳 Failure
  return const Right(unit);  // ← pending queue 實際上沒有被呼叫
}
```

`addPendingSyncRecord()` 方法已在 `CheeseThiefLocalDataSource` 中定義且實作，但 `syncGameRecord` 的 catch 區塊完全沒有呼叫它。架構文件的離線降級策略圖描述了重試機制，但這個機制根本不存在。

**修復方案**:
```dart
} catch (_) {
  try {
    final pendingRecord = {
      'game_id': game.id,
      'player_count': game.playerCount,
      'winner_camp': result.winner.name,
      'duration_seconds': durationSeconds,
      'role_distribution': { ... },
      'created_at': DateTime.now().toIso8601String(),
    };
    await _local.addPendingSyncRecord(pendingRecord);
  } catch (localError) {
    // local 也失敗時靜默忽略，不影響遊戲
    debugPrint('[CheeseThiefRepo] Failed to add pending sync: $localError');
  }
  return const Right(unit);
}
```

---

#### MAJOR-02: `votingProvider` 以 `game?.id ?? ''` 初始化，空字串 gameId 會導致 `finalizeVote` 寫入錯誤資料

**位置**: `/app/lib/features/cheese_thief/presentation/providers/voting_provider.dart:100-106`

```dart
final votingProvider = StateNotifierProvider.autoDispose<VotingNotifier, VotingState>((ref) {
  final game = ref.watch(currentGameProvider);
  return VotingNotifier(
    submitVote: ref.watch(submitVoteUseCaseProvider),
    playerCount: game?.playerCount ?? 4,
    gameId: game?.id ?? '',  // ← 空字串
  );
});
```

若玩家在沒有 game 的狀態下（如直接深連結到 `/cheese-thief/voting`）進入投票頁，`_gameId` 為空字串，`SubmitVoteUseCase` 會以空字串 gameId 呼叫 `finalizeVote`，產生損壞的歷史記錄。

**修復方案**: 在 `VotingNotifier.confirmResult()` 開頭加入 guard：
```dart
Future<void> confirmResult({required bool isThiefCaught}) async {
  if (_gameId.isEmpty) {
    state = state.copyWith(errorMessage: '遊戲狀態異常，請重新開始');
    return;
  }
  // ...
}
```

長期方案：路由層應實作 redirect guard，確保缺少 game 時跳回首頁。

---

#### MAJOR-03: `NightPhaseNotifier` 的 `_startCountdown` 會產生計時器累積問題

**位置**: `/app/lib/features/cheese_thief/presentation/providers/night_phase_provider.dart:69-83`

`_advanceToNumber` 在每個號碼切換時呼叫 `_startCountdown`，`_startCountdown` 的第一行是 `_countdownTimer?.cancel()`，這看起來是安全的。

但問題在於 `_advanceToNumber` 本身是 `async`，而 `Timer.periodic` 的回呼也可能在 `_advanceToNumber` 執行期間觸發（當 `_voice.speak()` 花費超過 1 秒時）。這可能導致同時有兩個 `Timer.periodic` 在跑，造成號碼跳號或跑兩次。

**修復方案**: 在 `_advanceToNumber` 開頭立即取消計時器：
```dart
Future<void> _advanceToNumber(int number) async {
  _countdownTimer?.cancel();  // ← 移到方法開頭，而非 _startCountdown 開頭
  if (number > 6) { ... }
  // ...
  await _voice.speak(...);   // speak 期間不會有舊計時器在跑
  _startCountdown(number);
}
```

---

#### MAJOR-04: `CheeseThiefGameEntityHelper` 在 `voice_repository_impl.dart` 中複製了 `accompliceCountFor()` 業務邏輯

**位置**: `/app/lib/features/cheese_thief/data/repositories/cheese_thief_voice_repository_impl.dart:131-138`

```dart
// Data 層複製了 Domain 層的業務邏輯
class CheeseThiefGameEntityHelper {
  static int accompliceCountFor(int playerCount) => switch (playerCount) {
        4 => 0,
        5 || 6 => 1,
        _ => 2,
      };
}
```

這違反了 DRY 原則，更嚴重的是違反了 Clean Architecture 的依賴方向——Data 層本來可以直接引用 Domain 層的 `CheeseThiefGameEntity.accompliceCountFor()`，但卻另起爐灶。若遊戲規則改變（如 6 人局改為 2 共犯），維護者必須修改兩處且可能漏改。

**修復方案**: 直接引用 Domain 層：
```dart
// voice_repository_impl.dart 頂部 import
import '../../domain/entities/cheese_thief_game_entity.dart';

// 使用 Domain 層的靜態方法
String _buildRulesText(int playerCount) {
  final hasAccomplice =
      CheeseThiefGameEntity.accompliceCountFor(playerCount) > 0;
  // ...
}
```

刪除 `CheeseThiefGameEntityHelper` 類別。

---

#### MAJOR-05: `save-cheese-thief-result` Edge Function 的資料模型與 Flutter 端嚴重不對齊

**位置**: `/supabase/functions/save-cheese-thief-result/index.ts:38-79`

Edge Function 中的 `winning_faction` 使用 `"villager" | "thief"` 枚舉，但 Flutter `WinnerCamp` 使用 `mouse | thief`。同樣地，`role` 使用 `"sleepy_mouse"`（snake_case），但 Flutter `CheeseThiefRole` 使用 `sleepyMouse`（camelCase）。

目前 Flutter 端並未呼叫 `save-cheese-thief-result`（實際同步走的是 `uploadGameRecord` 直接插入）。但若未來串接這個 Edge Function，需要手動轉換枚舉值，是隱患。

**修復方案**: 在 `cheese_thief_game_repository_impl.dart` 的 `syncGameRecord` 中加入轉換輔助，或統一採用一套命名標準（建議以 DB 端的 snake_case 為主）。

---

#### MAJOR-06: `uploadGameRecord` 以 mutation `..['user_id'] = userId` 修改 DTO，有副作用風險

**位置**: `/app/lib/features/cheese_thief/data/datasources/cheese_thief_remote_datasource.dart:36-40`

```dart
await _supabase.from(_tableName).insert(
  record.toJson()..['user_id'] = userId,  // ← Dart cascade 修改 Map
);
```

`toJson()` 回傳新 Map，所以 `record` 本身不受影響，這點是安全的。但 `userId` 應該在 `GameRecordModel` 建立時就注入，而不是在 DataSource 層補填。`GameRecordModel.userId` 欄位存在但在 `syncGameRecord` 中傳入空字串：

```dart
// repository_impl.dart:177
userId: '', // 由 uploadGameRecord 補填  ← 設計意圖不清晰
```

**修復方案**: 在 `CheeseThiefGameRepositoryImpl.syncGameRecord()` 中先取得 userId，傳給 `GameRecordModel` 建構子：
```dart
final userId = _supabase.auth.currentUser?.id ?? '';
final record = GameRecordModel(
  userId: userId,
  // ...
);
await _remote.uploadGameRecord(record);
```

`uploadGameRecord` 不再需要補填 userId。

---

#### MAJOR-07: `goToPreviousPlayer()` 的索引計算有 off-by-one 問題

**位置**: `/app/lib/features/cheese_thief/presentation/providers/game_state_provider.dart:142-144`

```dart
void goToPreviousPlayer() {
  final game = state.game;
  if (game == null || game.roleAssignmentIndex <= 0) return;

  final prevIndex = game.roleAssignmentIndex - 1;
  final updatedPlayers = game.players.map((p) {
    if (p.seatNumber == prevIndex + 1) {  // ← prevIndex + 1 == roleAssignmentIndex（舊值）
      return p.copyWith(hasConfirmedRole: false);
    }
    return p;
  }).toList();
```

當 `roleAssignmentIndex = 2`（第 3 位玩家輪到），按「上一位」應回到 `roleAssignmentIndex = 1`（第 2 位）。程式計算 `prevIndex = 1`，然後找 `seatNumber == prevIndex + 1 == 2` 的玩家，這是正確的。

但目的是重設「當前要回看的玩家」的確認狀態，而非「被跳過的玩家」的確認狀態。`prevIndex + 1` 等於原本的 `roleAssignmentIndex`，意味著它重設的是「已確認的那個玩家」，而非「要重新展示的那個玩家」。

具體驗證：`roleAssignmentIndex = 2` 時，已確認的是座位 1 和座位 2。按上一位後 `prevIndex = 1`，程式找 `seatNumber == 2` 的玩家重設確認——這正確地重設了座位 2。

實際上這是正確的，但邏輯表達令人困惑，應加註解說明：
```dart
// 重設「prevIndex 這個 index 對應的玩家（seatNumber = prevIndex + 1）」的確認狀態
// 這個玩家就是我們要回去重新展示的玩家
if (p.seatNumber == prevIndex + 1) {
```

---

#### MAJOR-08: `ctp_insert_service` Policy 使用 `auth.role()` 但在 service_role JWT 中此函數行為不穩定

**位置**: `/supabase/migrations/20260310000001_create_cheese_thief_tables.sql:529-531`

```sql
CREATE POLICY "ctr_insert_service"
  ON public.cheese_thief_results FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
```

Supabase 官方建議對 service_role 的 bypass 透過「使用 service_role key 建立的 client 自動 bypass RLS」機制，而非透過 Policy 顯式允許。`auth.role() = 'service_role'` 在 PostgreSQL RLS 中依賴 JWT claim，但 service_role client 的行為是「完全 bypass RLS」而非「通過 service_role policy」，這條 Policy 實際上永遠不會被執行，是無效程式碼。

此外，`ctr_insert_host` 和 `ctr_insert_service` 兩個 Policy 並存，但 `save-cheese-thief-result` Edge Function 使用的是 service_role client（自動 bypass），這條 Policy 存在但無效。

**修復方案**: 刪除 `ctr_insert_service` Policy，加上說明性注釋：
```sql
-- 注意：Edge Function 使用 service_role client，自動 bypass RLS。
-- 此 Policy 無需顯式授權 service_role。
```

---

### 🟢 MINOR（可以之後處理）

---

#### MINOR-01: `NightPhasePage` 硬編碼顏色值，未使用 `AppColors`

**位置**: `night_phase_page.dart:58` 的 `backgroundColor: const Color(0xFF0D0D1A)`

整個 presentation 層有大量直接使用 `Color(0xFF...)` 的場合，應統一到 `AppColors` 常數中，方便未來主題切換。

---

#### MINOR-02: `_CountdownBar` 中的 `progress = remainingSeconds / 5.0` 假設每個號碼固定 5 秒

**位置**: `/app/lib/features/cheese_thief/presentation/pages/night_phase_page.dart:182`

若未來允許自訂每個號碼的等待時間，這裡需要配合修改。建議從 `NightPhaseState` 中讀取 `totalSecondsPerNumber` 而非硬編碼 5.0。

---

#### MINOR-03: `GameRecordSummary` 有 `formattedDuration` 計算方法，但 `GameRecordSummary._()` 的私有建構子可能與 Freezed 生成的 `const` 建構子衝突

**位置**: `/app/lib/features/cheese_thief/domain/entities/game_record_summary.dart:22-28`

這是個待確認的 Freezed 版本相容性問題。若 `build_runner` 生成失敗，需要將 `formattedDuration` 移到 Extension 中。

---

#### MINOR-04: `RoleCardWidget` 使用 `RotationYTransition` 自實作翻牌，但 `AnimatedSwitcher` 的 `transitionBuilder` 對翻牌動畫的支援有已知限制

**位置**: `/app/lib/features/cheese_thief/presentation/widgets/role_card_widget.dart:20-30`

`AnimatedSwitcher` 的 `transitionBuilder` 會對兩個子 widget 同時應用動畫，`RotationYTransition` 只對其中一個有意義。應使用 `AnimationController` + `TweenAnimationBuilder` 實作更精確的翻牌效果，或使用 `flip_card` package。

---

#### MINOR-05: `NightPhaseProvider.dispose()` 呼叫 `_voice.stop()` 但未 await

**位置**: `/app/lib/features/cheese_thief/presentation/providers/night_phase_provider.dart:133-137`

```dart
@override
void dispose() {
  _countdownTimer?.cancel();
  _voice.stop();  // ← Future<Either> 被丟棄
  super.dispose();
}
```

`dispose` 不能是 async，但應使用 `unawaited()` 明確表達意圖：
```dart
unawaited(_voice.stop());
```

---

#### MINOR-06: `cheese_thief_routes.dart` 未列入 `/voting` 路由，但 `VotingPage` 需要被導航到

查看 `cheese_thief_routes.dart`，路由定義中有 `/voting`（第 41-44 行），這個 MINOR 已確認不成立，標記為已確認無誤。

---

#### MINOR-07: `SubmitVoteUseCase` 和 `CalculateResultUseCase` 職責重疊，應合併或明確分工

`SubmitVoteUseCase` 呼叫 `finalizeVote`，`CalculateResultUseCase` 也呼叫 `finalizeVote`。`VotingNotifier` 先呼叫 `SubmitVoteUseCase`，成功後 `VotingPage._submitResult()` 再呼叫 `GameStateMachine.finalizeResult()`（內部呼叫 `CalculateResultUseCase`）——等於 `finalizeVote` 被呼叫了兩次。

應在結算流程中只呼叫一次 `finalizeVote`，二選一：讓 `CalculateResultUseCase` 統一負責，或讓 `SubmitVoteUseCase` 只做驗證不呼叫 Repository。

---

## 4. 亮點（做得好的地方）

### 亮點 1: Database Schema 的欄位級安全設計

`cheese_thief_players_public` View 的設計極為精緻：

```sql
CASE
  WHEN p.user_id = auth.uid() THEN p.dice_number
  WHEN public.is_game_finished(p.game_id) THEN p.dice_number
  ELSE NULL
END AS dice_number
```

這正確處理了「遊戲中隱藏他人骰子，結算後所有人可見」的需求，且透過 SECURITY DEFINER 函數避免了 RLS recursion 問題。這是教科書級別的 PostgreSQL RLS + View 組合使用。

### 亮點 2: `GamePhase` 狀態機的防護設計

```dart
Set<GamePhase> get validNextPhases => switch (this) {
  GamePhase.lobby => {GamePhase.preparing},
  // ...
};

bool canTransitionTo(GamePhase next) => validNextPhases.contains(next);
```

以 enum extension + switch expression 定義合法轉換，比 if-else 鏈更易維護，且完全窮舉所有 case，Dart 編譯器會在新增 enum value 時強制要求更新此 switch。

### 亮點 3: `VoiceScript` Sealed Class 的型別安全設計

```dart
sealed class VoiceScript {
  const VoiceScript();
}
```

透過 sealed class + switch expression 在 `_buildScriptText` 中處理所有語音腳本，編譯器保證不會漏掉任何 script 類型。比 enum + Map<String, String> 或 if-else 鏈更安全、更可讀。

### 亮點 4: `AssignRolesUseCase` 使用 `Random.secure()` 的 Fisher-Yates

```dart
void _fisherYatesShuffle(List<CheeseThiefRole> roles) {
  final random = Random.secure();  // 密碼學安全隨機數
  for (int i = roles.length - 1; i > 0; i--) {
    final j = random.nextInt(i + 1);
    // ...
  }
}
```

正確使用 `Random.secure()`（而非 `Random()`）確保角色分配無法被預測。Fisher-Yates 實作無 bug，每個排列的機率完全相等。

### 亮點 5: `get-voice-scripts` Edge Function 的 ETag 快取機制

Edge Function 實作了完整的 ETag + `If-None-Match` 快取流程，`Cache-Control: public, max-age=300` 讓語音腳本可被 CDN 快取，有效減少資料庫查詢次數。這是大多數人會忽略的最佳化細節。

### 亮點 6: `join-cheese-thief-game` 的 Race Condition 處理

```typescript
if (insertError.code === "23505") {
  return jsonError("Failed to join: seat was just taken, please retry", 409, "ALREADY_JOINED");
}
```

正確處理「兩個玩家同時加入搶同一座位」的競爭條件，依賴 DB 唯一約束而非應用層鎖定，是正確的做法。

### 亮點 7: `NightPhaseState.progress` 的精確計算

```dart
double get progress =>
  isCompleted ? 1.0 : (currentDiceNumber - 1) / 6.0;
```

當 `currentDiceNumber = 1` 時 progress = 0（剛開始），`currentDiceNumber = 6` 時 progress = 5/6（最後一個號碼進行中），`isCompleted = true` 時 progress = 1.0。語義正確。

---

## 5. 改善建議（下一步優化方向）

### 建議 1: 加入 App 崩潰恢復機制

架構文件描述了崩潰恢復流程（從 `gameSnapshot` 恢復），但 `home_page.dart` 進入時未呼叫 `repository.getCurrentGame()` 來恢復狀態。建議在 `GameStateMachine` 初始化時加入自動恢復：

```dart
// game_state_provider.dart - 在 Provider 建立時
final gameStateMachineProvider = StateNotifierProvider<GameStateMachine, GameStateState>((ref) {
  final machine = GameStateMachine(...);
  // 非同步恢復，不阻塞 Provider 建立
  machine.tryRestoreGame();
  return machine;
});
```

### 建議 2: 加入電量警告

架構文件 §5 提到電量警告機制，但實作中完全缺失。這個功能對「手機夜晚主持長達 30+ 秒」的場景非常重要，建議在 Phase 4 UI 完成前實作。

### 建議 3: 單元測試覆蓋核心 UseCase

根據 `testing.md`，Domain 層 UseCase 需要 100% 覆蓋率，但目前無任何測試檔案。至少需要：
- `AssignRolesUseCase` - 驗證各人數的角色分配比例
- `CalculateResultUseCase` - 驗證平票處理邏輯
- `GamePhase.canTransitionTo()` - 驗證所有合法/非法轉換

### 建議 4: 考慮 `gameStateMachineProvider` 不使用 `autoDispose`

`gameStateMachineProvider` 目前沒有 `autoDispose`（正確），但 `currentGameProvider` 和 `currentPlayersProvider` 使用了 `autoDispose`。若這些衍生 Provider 在某個頁面 dispose 後被重建，可能從 `gameStateMachineProvider` 讀到舊狀態。建議統一這三個 Provider 的 dispose 策略。

### 建議 5: `DiscussionNotifier.extendOneMinute()` 重新呼叫 `start()` 的邏輯有潛在重複計時器問題

```dart
void extendOneMinute() {
  if (state.isExtended) return;
  state = state.copyWith(remainingSeconds: state.remainingSeconds + 60, ...);
  if (!state.isPaused) start();  // ← 若計時器已在跑，呼叫 start() 會再開一個
}
```

`start()` 的第一行是 `_timer?.cancel()`，所以會先取消舊計時器再開新的。這在技術上是安全的，但有一個輕微問題：若計時器在這個瞬間觸發了最後一下（`remainingSeconds - 1 <= 0`），可能觸發 `isCompleted = true`，然後 `extendOneMinute` 又把 `isCompleted` 設回 false。建議在 `extendOneMinute` 中先取消計時器，再更新狀態，再重啟計時器。

---

## 6. 結論

### 可以進入下一階段嗎？

**條件性可以。** 必須先修復以下 5 個 BLOCKER，才允許進入測試階段：

| # | BLOCKER | 預估工時 |
|---|---------|---------|
| BLOCKER-01 | `result_page.dart` 的 `dynamic game` | 30 分鐘 |
| BLOCKER-02 | `getGameHistory()` 空字串 userId | 1 小時 |
| BLOCKER-03 | 夜晚計時器與 TTS 不同步 | 2-3 小時 |
| BLOCKER-04 | 角色分配頁防截圖功能缺失 | 1 小時 |
| BLOCKER-05 | `accusedSeats` 重複計算邏輯 | 1 小時 |

**BLOCKER 修復後，重新送審以下項目：**
- [ ] BLOCKER-01 至 BLOCKER-05 全部修復
- [ ] `result_page.dart` 通過 `flutter analyze --fatal-infos` 零警告
- [ ] 手動驗證夜晚計時（1號→6號，每號不早於語音結束前推進）
- [ ] 手動驗證歷史記錄頁正確顯示資料

MAJOR-01 至 MAJOR-08 建議在測試階段開始前修復，但不阻擋進入測試。

---

*審查報告由 Tech Lead 產出，2026-03-10*
