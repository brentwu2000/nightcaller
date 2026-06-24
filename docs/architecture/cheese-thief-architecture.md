# 架構設計：奶酪大盜 (Cheese Thief)

> **版本**: v1.0
> **更新日期**: 2026-03-10
> **狀態**: Draft
> **需求來源**: `features/cheese-thief/README.md`

---

## 現有模式分析

### 參考的現有慣例

| 模式 | 來源 | 本模組採用方式 |
|------|------|--------------|
| Freezed Entity | `FLUTTER_STRUCTURE.md` L201-224 | 所有 Entity 與 State 均使用 `@freezed` |
| Feature Clean Architecture | `FLUTTER_STRUCTURE.md` L56-81 | 完整三層結構放置於 `features/cheese_thief/` |
| Repository 離線優先 | `FLUTTER_STRUCTURE.md` L228-248 | 本地先行寫入，隔離遠端同步失敗風險 |
| StateNotifierProvider + autoDispose | `FLUTTER_STRUCTURE.md` L189-194 | 遊戲狀態機使用 StateNotifier，頁面級均 autoDispose |
| 自訂 AppException | `.claude/rules/coding-style.md` §7.1 | 新增 `GameException`、`VoiceException` 子類 |
| x-user-id Workaround | `.claude/rules/security.md` §2.1 | Edge Function 呼叫均帶 `x-user-id` header |
| 零 dynamic 政策 | `.claude/rules/coding-style.md` §1.1 | 所有 Supabase 回傳資料立即 cast 至 typed model |

### 架構決策

#### 決策 1：單裝置主持模型（無 Supabase Realtime 必要）

- **選擇方案**: 單一裝置擔任房主兼主持人，所有遊戲狀態在本地執行
- **理由**: 奶酪大盜是「實體桌遊輔助」工具，所有玩家共用同一支手機，不需跨裝置同步
- **Trade-offs**: 犧牲多裝置體驗，換取零網路延遲、100% 離線可用率、架構大幅簡化
- **影響**: `CheeseThiefGameRepository` 以本地為主，Supabase 僅用於歷史記錄儲存與統計

#### 決策 2：遊戲狀態機 (GameStateMachine) 集中管理

- **選擇方案**: 以 `GameStateMachine` Notifier 統一持有 `GamePhase` 狀態，所有 UseCase 透過它推進
- **理由**: 遊戲階段有明確的單向轉換（LOBBY → RESULT），用狀態機防止非法轉換，比散落的 bool flag 更可靠
- **Trade-offs**: 增加一個抽象層，但可讓測試直接驗證狀態轉換的合法性

#### 決策 3：夜晚計時器在 Presentation 層執行

- **選擇方案**: `NightPhaseNotifier` 持有 `Timer`，每 5 秒推進號碼並驅動 TTS
- **理由**: 計時器與 UI 更新緊密耦合（倒數進度條），且不需要持久化；Domain 層保持純 Dart 不引入 dart:async 的 Timer
- **Trade-offs**: 計時邏輯在 Presentation 層，須在 widget test 中 mock Timer

#### 決策 4：TTS 透過本地引擎優先，Edge Function 備援

- **選擇方案**: 優先使用設備內建 TTS（`flutter_tts`），Edge Function 提供高品質語音包下載
- **理由**: 滿足「語音播放成功率 > 99%」與「離線可用率 100%」的指標
- **Trade-offs**: 音質不如 AI 語音，但零延遲、零網路依賴

#### 決策 5：角色分配在客戶端執行（非伺服器端）

- **選擇方案**: `AssignRolesUseCase` 在本地執行角色洗牌，不呼叫 Edge Function
- **理由**: 奶酪大盜為實體桌遊，不存在玩家作弊查看伺服器端分配的問題；骰子數字由玩家實體擲出，App 不需知道
- **Trade-offs**: 若要支援線上多人模式，此決策需重新評估

---

## 模組結構

```
app/lib/features/cheese_thief/
├── README.md                          # 功能文檔（必備）
│
├── domain/
│   ├── entities/
│   │   ├── cheese_thief_game_entity.dart      # 遊戲局
│   │   ├── cheese_thief_player_entity.dart    # 玩家+角色+骰子
│   │   ├── cheese_thief_role.dart             # 角色枚舉
│   │   ├── game_phase.dart                    # 階段枚舉
│   │   ├── night_action_entity.dart           # 夜晚行動記錄
│   │   └── vote_result_entity.dart            # 投票結果
│   │
│   ├── repositories/
│   │   ├── cheese_thief_game_repository.dart  # 遊戲資料介面
│   │   └── cheese_thief_voice_repository.dart # 語音資源介面
│   │
│   └── usecases/
│       ├── create_game_usecase.dart
│       ├── join_game_usecase.dart
│       ├── roll_dice_usecase.dart
│       ├── assign_roles_usecase.dart
│       ├── peek_dice_usecase.dart
│       ├── steal_cheese_usecase.dart
│       ├── designate_accomplice_usecase.dart
│       ├── submit_vote_usecase.dart
│       └── calculate_result_usecase.dart
│
├── data/
│   ├── models/
│   │   ├── cheese_thief_game_model.dart
│   │   ├── cheese_thief_player_model.dart
│   │   ├── night_action_model.dart
│   │   └── game_record_model.dart             # 歷史記錄 DTO
│   │
│   ├── datasources/
│   │   ├── cheese_thief_local_datasource.dart  # Hive 快取
│   │   └── cheese_thief_remote_datasource.dart # Supabase 歷史記錄
│   │
│   └── repositories/
│       ├── cheese_thief_game_repository_impl.dart
│       └── cheese_thief_voice_repository_impl.dart
│
└── presentation/
    ├── pages/
    │   ├── home_page.dart                     # 首頁
    │   ├── setup_page.dart                    # 遊戲設定（人數/時間）
    │   ├── role_assignment_page.dart          # 角色分配
    │   ├── night_phase_page.dart              # 夜晚主持
    │   ├── discussion_page.dart               # 白天討論+計時
    │   ├── voting_page.dart                   # 投票記錄
    │   ├── result_page.dart                   # 結算揭曉
    │   └── history_page.dart                  # 歷史記錄
    │
    ├── widgets/
    │   ├── player_count_selector_widget.dart
    │   ├── role_card_widget.dart
    │   ├── night_counter_widget.dart
    │   ├── countdown_timer_widget.dart
    │   ├── vote_tally_widget.dart
    │   └── result_reveal_widget.dart
    │
    └── providers/
        ├── game_state_provider.dart           # GameStateMachine
        ├── game_state_state.dart              # GameState (Freezed)
        ├── setup_provider.dart
        ├── setup_state.dart
        ├── night_phase_provider.dart          # NightPhaseNotifier
        ├── night_phase_state.dart
        ├── discussion_provider.dart
        ├── discussion_state.dart
        ├── voting_provider.dart
        ├── voting_state.dart
        └── history_provider.dart
```

---

## Domain Layer 設計

### Entities

#### CheeseThiefRole（角色枚舉）

```dart
// domain/entities/cheese_thief_role.dart

enum CheeseThiefRole {
  thief,       // 奶酪大盜（大盜陣營）
  accomplice,  // 共犯（大盜陣營，5+ 人局）
  sleepyMouse, // 貪睡鼠（老鼠陣營）
}

extension CheeseThiefRoleX on CheeseThiefRole {
  bool get isThiefCamp => this == CheeseThiefRole.thief || this == CheeseThiefRole.accomplice;
  bool get isMouseCamp => this == CheeseThiefRole.sleepyMouse;
}
```

#### GamePhase（遊戲階段枚舉）

```dart
// domain/entities/game_phase.dart

enum GamePhase {
  lobby,        // 首頁/等待
  preparing,    // 準備（物品清單 + 規則說明）
  roleAssigned, // 角色分配中
  night,        // 夜晚語音主持
  nightDone,    // 夜晚結束（過渡狀態）
  discussion,   // 白天討論
  voting,       // 投票記錄
  result,       // 結算揭曉
}

extension GamePhaseX on GamePhase {
  /// 合法的下一個階段（單向狀態機）
  Set<GamePhase> get validNextPhases => switch (this) {
    GamePhase.lobby        => {GamePhase.preparing},
    GamePhase.preparing    => {GamePhase.roleAssigned, GamePhase.lobby},
    GamePhase.roleAssigned => {GamePhase.night, GamePhase.preparing},
    GamePhase.night        => {GamePhase.nightDone},
    GamePhase.nightDone    => {GamePhase.discussion},
    GamePhase.discussion   => {GamePhase.voting},
    GamePhase.voting       => {GamePhase.result},
    GamePhase.result       => {GamePhase.lobby, GamePhase.preparing},
  };

  bool canTransitionTo(GamePhase next) => validNextPhases.contains(next);
}
```

#### CheeseThiefPlayerEntity

```dart
// domain/entities/cheese_thief_player_entity.dart

import 'package:freezed_annotation/freezed_annotation.dart';

part 'cheese_thief_player_entity.freezed.dart';

@freezed
class CheeseThiefPlayerEntity with _$CheeseThiefPlayerEntity {
  const factory CheeseThiefPlayerEntity({
    required String id,
    required int seatNumber,       // 1-8，座位順序
    required CheeseThiefRole role,
    // diceNumber 不在 App 中儲存（玩家實體擲骰），App 不需感知
    // 唯一例外：PeekDiceUseCase 執行後，貪睡鼠可在本地私人記事本記錄
    @Default(false) bool hasConfirmedRole,  // 已查看角色卡
    @Default(false) bool isWithdrawn,       // 中途退出
  }) = _CheeseThiefPlayerEntity;
}
```

#### CheeseThiefGameEntity

```dart
// domain/entities/cheese_thief_game_entity.dart

import 'package:freezed_annotation/freezed_annotation.dart';

part 'cheese_thief_game_entity.freezed.dart';
part 'cheese_thief_game_entity.g.dart';

@freezed
class CheeseThiefGameEntity with _$CheeseThiefGameEntity {
  const factory CheeseThiefGameEntity({
    required String id,
    required int playerCount,           // 4-8
    required int discussionMinutes,     // 1-10，預設 3
    required GamePhase phase,
    required List<CheeseThiefPlayerEntity> players,
    required DateTime createdAt,
    DateTime? endedAt,
    bool? isCheeseStolen,               // null=未確認，true=偷走，false=未偷
    // 輪到角色分配的座位索引（0-based）
    @Default(0) int roleAssignmentIndex,
  }) = _CheeseThiefGameEntity;

  factory CheeseThiefGameEntity.fromJson(Map<String, dynamic> json) =>
      _$CheeseThiefGameEntityFromJson(json);

  /// 依人數計算共犯數量
  static int accompliceCountFor(int playerCount) => switch (playerCount) {
    4       => 0,
    5 || 6  => 1,
    _       => 2,  // 7-8 人
  };
}
```

#### NightActionEntity

```dart
// domain/entities/night_action_entity.dart

import 'package:freezed_annotation/freezed_annotation.dart';

part 'night_action_entity.freezed.dart';

/// 夜晚行動類型
enum NightActionType {
  peekDice,            // 貪睡鼠偷看骰子（本地私人記錄）
  stealCheese,         // 大盜偷走奶酪（事後確認）
  designateAccomplice, // 大盜指定共犯
}

@freezed
class NightActionEntity with _$NightActionEntity {
  const factory NightActionEntity({
    required String id,
    required String gameId,
    required NightActionType type,
    required int callerSeatNumber,    // 執行動作的玩家座位
    int? targetSeatNumber,            // 目標玩家座位（偷看/指定共犯時使用）
    int? observedDiceNumber,          // 貪睡鼠偷看到的骰子數字（私人，1-6）
    required DateTime occurredAt,
  }) = _NightActionEntity;
}
```

#### VoteResultEntity

```dart
// domain/entities/vote_result_entity.dart

import 'package:freezed_annotation/freezed_annotation.dart';

part 'vote_result_entity.freezed.dart';

@freezed
class VoteResultEntity with _$VoteResultEntity {
  const factory VoteResultEntity({
    required String gameId,
    // key: seatNumber, value: voteCount
    required Map<int, int> voteMap,
    required List<int> accusedSeats, // 得票最多的座位（可多個，平票）
    required bool isThiefCaught,     // 被指控者包含大盜 = true
    required WinnerCamp winner,
  }) = _VoteResultEntity;

  factory VoteResultEntity.empty(String gameId) => VoteResultEntity(
    gameId: gameId,
    voteMap: const {},
    accusedSeats: const [],
    isThiefCaught: false,
    winner: WinnerCamp.thief,
  );
}

enum WinnerCamp {
  mouse,  // 貪睡鼠陣營（正確指認大盜）
  thief,  // 大盜陣營（未被識破）
}
```

---

### Repository 介面

#### CheeseThiefGameRepository

```dart
// domain/repositories/cheese_thief_game_repository.dart

import 'package:fpdart/fpdart.dart';

abstract class CheeseThiefGameRepository {
  /// 建立新遊戲（本地）
  Future<Either<Failure, CheeseThiefGameEntity>> createGame({
    required int playerCount,
    required int discussionMinutes,
  });

  /// 取得當前進行中的遊戲（本地快取）
  Future<Either<Failure, CheeseThiefGameEntity?>> getCurrentGame();

  /// 更新遊戲狀態（角色確認、階段推進等）
  Future<Either<Failure, CheeseThiefGameEntity>> updateGame(
    CheeseThiefGameEntity game,
  );

  /// 儲存夜晚行動（私人記事本，本地加密）
  Future<Either<Failure, Unit>> saveNightAction(NightActionEntity action);

  /// 取得當局夜晚行動（玩家個人查看用）
  Future<Either<Failure, List<NightActionEntity>>> getNightActions({
    required String gameId,
    required int seatNumber,
  });

  /// 儲存投票結果並結算
  Future<Either<Failure, VoteResultEntity>> finalizeVote({
    required String gameId,
    required Map<int, int> voteMap,
    required bool isThiefCaught,
  });

  /// 儲存歷史記錄到 Supabase（非同步，失敗不阻塞 UI）
  Future<Either<Failure, Unit>> syncGameRecord(
    CheeseThiefGameEntity game,
    VoteResultEntity result,
  );

  /// 取得歷史對局列表（先讀本地，再嘗試遠端）
  Future<Either<Failure, List<GameRecordSummary>>> getGameHistory();
}
```

#### CheeseThiefVoiceRepository

```dart
// domain/repositories/cheese_thief_voice_repository.dart

import 'package:fpdart/fpdart.dart';

abstract class CheeseThiefVoiceRepository {
  /// 播放指定腳本語音
  Future<Either<Failure, Unit>> speak(VoiceScript script);

  /// 暫停語音
  Future<Either<Failure, Unit>> pause();

  /// 繼續語音
  Future<Either<Failure, Unit>> resume();

  /// 停止語音
  Future<Either<Failure, Unit>> stop();

  /// 檢查語音包是否已下載（離線可用）
  Future<bool> isVoicePackReady();

  /// 下載語音包（可選，提升音質）
  Stream<DownloadProgress> downloadVoicePack();
}

/// 所有語音腳本的型別安全封裝
sealed class VoiceScript {
  const VoiceScript();
}

class RulesExplanationScript extends VoiceScript {
  final int playerCount;
  const RulesExplanationScript({required this.playerCount});
}

class NightStartScript extends VoiceScript {
  const NightStartScript();
}

class NightCallNumberScript extends VoiceScript {
  final int diceNumber;   // 1-6
  final bool hasAccomplice;  // 是否播放共犯提示
  const NightCallNumberScript({
    required this.diceNumber,
    required this.hasAccomplice,
  });
}

class NightEndScript extends VoiceScript {
  final int discussionMinutes;
  const NightEndScript({required this.discussionMinutes});
}

class DiscussionEndScript extends VoiceScript {
  const DiscussionEndScript();
}

class ResultScript extends VoiceScript {
  final WinnerCamp winner;
  const ResultScript({required this.winner});
}

class PauseAnnouncementScript extends VoiceScript {
  const PauseAnnouncementScript();
}
```

---

### UseCases

| UseCase | 路徑 | 職責 | 輸入 | 輸出 |
|---------|------|------|------|------|
| `CreateGameUseCase` | `domain/usecases/` | 建立新遊戲，驗證人數 4-8 | `playerCount`, `discussionMinutes` | `Either<Failure, CheeseThiefGameEntity>` |
| `JoinGameUseCase` | `domain/usecases/` | 重置為大廳狀態（再玩一局）| `gameId` | `Either<Failure, CheeseThiefGameEntity>` |
| `RollDiceUseCase` | `domain/usecases/` | 記錄擲骰動作（目前為 no-op，骰子由玩家實體擲）| - | `Either<Failure, Unit>` |
| `AssignRolesUseCase` | `domain/usecases/` | 依人數洗牌角色，分配給各玩家 | `gameId` | `Either<Failure, List<CheeseThiefPlayerEntity>>` |
| `PeekDiceUseCase` | `domain/usecases/` | 貪睡鼠偷看骰子，寫入私人記事本 | `gameId`, `viewerSeat`, `targetSeat`, `diceNumber` | `Either<Failure, Unit>` |
| `StealCheeseUseCase` | `domain/usecases/` | 更新 `isCheeseStolen` 標記 | `gameId`, `stolen` | `Either<Failure, CheeseThiefGameEntity>` |
| `DesignateAccompliceUseCase` | `domain/usecases/` | 記錄共犯指定行動（實體觸碰，App 輔助提示）| `gameId`, `thiefSeat`, `accompliceSeats` | `Either<Failure, Unit>` |
| `SubmitVoteUseCase` | `domain/usecases/` | 驗證並暫存投票 Map | `gameId`, `voteMap` | `Either<Failure, VoteResultEntity>` |
| `CalculateResultUseCase` | `domain/usecases/` | 計算勝負，處理平票，觸發歷史同步 | `gameId`, `isThiefCaught` | `Either<Failure, VoteResultEntity>` |

---

## Data Layer 設計

### Models（DTO）

#### CheeseThiefGameModel

```dart
// data/models/cheese_thief_game_model.dart
// 對應 Supabase 表 `cheese_thief_games`（歷史記錄用）

import 'package:freezed_annotation/freezed_annotation.dart';

part 'cheese_thief_game_model.freezed.dart';
part 'cheese_thief_game_model.g.dart';

@freezed
class CheeseThiefGameModel with _$CheeseThiefGameModel {
  const factory CheeseThiefGameModel({
    required String id,
    @JsonKey(name: 'player_count') required int playerCount,
    @JsonKey(name: 'discussion_minutes') required int discussionMinutes,
    @JsonKey(name: 'phase') required String phase,    // GamePhase.name
    @JsonKey(name: 'is_cheese_stolen') bool? isCheeseStolen,
    @JsonKey(name: 'created_at') required String createdAt,
    @JsonKey(name: 'ended_at') String? endedAt,
  }) = _CheeseThiefGameModel;

  factory CheeseThiefGameModel.fromJson(Map<String, dynamic> json) =>
      _$CheeseThiefGameModelFromJson(json);

  CheeseThiefGameEntity toEntity() => CheeseThiefGameEntity(
    id: id,
    playerCount: playerCount,
    discussionMinutes: discussionMinutes,
    phase: GamePhase.values.byName(phase),
    players: const [],  // 從 CheeseThiefPlayerModel 另行組裝
    createdAt: DateTime.parse(createdAt),
    endedAt: endedAt != null ? DateTime.parse(endedAt!) : null,
    isCheeseStolen: isCheeseStolen,
  );
}
```

#### GameRecordModel（歷史記錄 DTO）

```dart
// data/models/game_record_model.dart
// 完整歷史對局，對應 Supabase 表 `cheese_thief_game_records`

@freezed
class GameRecordModel with _$GameRecordModel {
  const factory GameRecordModel({
    required String id,
    @JsonKey(name: 'game_id') required String gameId,
    @JsonKey(name: 'user_id') required String userId,
    @JsonKey(name: 'player_count') required int playerCount,
    @JsonKey(name: 'winner_camp') required String winnerCamp,  // WinnerCamp.name
    @JsonKey(name: 'duration_seconds') required int durationSeconds,
    @JsonKey(name: 'role_distribution') required Map<String, dynamic> roleDistribution,
    @JsonKey(name: 'created_at') required String createdAt,
  }) = _GameRecordModel;

  factory GameRecordModel.fromJson(Map<String, dynamic> json) =>
      _$GameRecordModelFromJson(json);
}
```

### Supabase 資料表設計

```sql
-- 歷史對局記錄（僅存摘要，不存進行中狀態）
CREATE TABLE cheese_thief_game_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) NOT NULL,
  player_count      SMALLINT NOT NULL CHECK (player_count BETWEEN 4 AND 8),
  winner_camp       TEXT NOT NULL CHECK (winner_camp IN ('mouse', 'thief')),
  duration_seconds  INTEGER NOT NULL,
  -- JSON: {"thief": 1, "accomplice": 1, "sleepyMouse": 4}
  role_distribution JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cheese_thief_game_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own game records"
ON cheese_thief_game_records FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game records"
ON cheese_thief_game_records FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- 索引：支援 ORDER BY created_at DESC
CREATE INDEX idx_game_records_user_created
ON cheese_thief_game_records (user_id, created_at DESC);
```

### DataSources

#### CheeseThiefLocalDataSource

```dart
// data/datasources/cheese_thief_local_datasource.dart
// 使用 Hive 儲存進行中遊戲快照 + 私人記事本

abstract class CheeseThiefLocalDataSource {
  /// 儲存遊戲快照（進行中狀態，App 重啟後可恢復）
  Future<void> saveGameSnapshot(CheeseThiefGameModel game);

  /// 讀取遊戲快照
  Future<CheeseThiefGameModel?> getGameSnapshot();

  /// 清除遊戲快照（結算後清除）
  Future<void> clearGameSnapshot();

  /// 儲存私人夜晚記錄（僅存在本地，不同步）
  Future<void> saveNightNote({
    required String gameId,
    required int seatNumber,
    required String encryptedNote,
  });

  /// 讀取私人夜晚記錄
  Future<String?> getNightNote({
    required String gameId,
    required int seatNumber,
  });
}
```

#### CheeseThiefRemoteDataSource

```dart
// data/datasources/cheese_thief_remote_datasource.dart
// 僅負責歷史記錄的 Supabase 操作

abstract class CheeseThiefRemoteDataSource {
  /// 上傳對局記錄
  Future<void> uploadGameRecord(GameRecordModel record);

  /// 取得歷史記錄列表
  Future<List<GameRecordModel>> getGameRecords({
    required String userId,
    int limit = 50,
  });
}
```

### Repository 實作

```dart
// data/repositories/cheese_thief_game_repository_impl.dart

class CheeseThiefGameRepositoryImpl implements CheeseThiefGameRepository {
  final CheeseThiefLocalDataSource _local;
  final CheeseThiefRemoteDataSource _remote;

  @override
  Future<Either<Failure, CheeseThiefGameEntity>> createGame({
    required int playerCount,
    required int discussionMinutes,
  }) async {
    try {
      final game = CheeseThiefGameEntity(
        id: const Uuid().v4(),
        playerCount: playerCount,
        discussionMinutes: discussionMinutes,
        phase: GamePhase.preparing,
        players: List.generate(
          playerCount,
          (i) => CheeseThiefPlayerEntity(
            id: const Uuid().v4(),
            seatNumber: i + 1,
            role: CheeseThiefRole.sleepyMouse, // 待 AssignRolesUseCase 更新
          ),
        ),
        createdAt: DateTime.now(),
      );

      final model = CheeseThiefGameModel(/* ... */);
      await _local.saveGameSnapshot(model);
      return Right(game);
    } catch (e) {
      return Left(CacheFailure());
    }
  }

  @override
  Future<Either<Failure, Unit>> syncGameRecord(
    CheeseThiefGameEntity game,
    VoteResultEntity result,
  ) async {
    // 非同步，失敗不影響 UI
    try {
      final record = GameRecordModel(/* map from game + result */);
      await _remote.uploadGameRecord(record);
      return const Right(unit);
    } catch (_) {
      // 記錄到 local pending queue，下次開啟時重試
      return const Right(unit);  // 不回傳 Failure，避免阻塞結算流程
    }
  }
}
```

---

## Presentation Layer 設計

### 遊戲狀態機 (GameStateMachine)

```dart
// presentation/providers/game_state_provider.dart

@freezed
class GameStateState with _$GameStateState {
  const factory GameStateState({
    required CheeseThiefGameEntity? game,
    required GamePhase phase,
    @Default(false) bool isLoading,
    String? errorMessage,
  }) = _GameStateState;

  factory GameStateState.initial() => const GameStateState(
    game: null,
    phase: GamePhase.lobby,
  );
}

class GameStateMachine extends StateNotifier<GameStateState> {
  final CreateGameUseCase _createGame;
  final AssignRolesUseCase _assignRoles;
  final CalculateResultUseCase _calculateResult;

  GameStateMachine(this._createGame, this._assignRoles, this._calculateResult)
      : super(GameStateState.initial());

  /// 嘗試推進到指定階段，不合法的轉換會拋出例外
  Future<void> transitionTo(GamePhase next) async {
    if (!state.phase.canTransitionTo(next)) {
      throw GameException(
        'Invalid transition: ${state.phase} -> $next',
      );
    }
    state = state.copyWith(phase: next);
  }

  Future<void> startNewGame({
    required int playerCount,
    required int discussionMinutes,
  }) async {
    state = state.copyWith(isLoading: true);
    final result = await _createGame(
      playerCount: playerCount,
      discussionMinutes: discussionMinutes,
    );
    result.fold(
      (failure) => state = state.copyWith(
        isLoading: false,
        errorMessage: failure.message,
      ),
      (game) => state = state.copyWith(
        isLoading: false,
        game: game,
        phase: GamePhase.preparing,
      ),
    );
  }

  // ... 其他轉換方法
}

final gameStateMachineProvider =
    StateNotifierProvider<GameStateMachine, GameStateState>((ref) {
  return GameStateMachine(
    ref.watch(createGameUseCaseProvider),
    ref.watch(assignRolesUseCaseProvider),
    ref.watch(calculateResultUseCaseProvider),
  );
});
```

### NightPhaseNotifier（夜晚計時器）

```dart
// presentation/providers/night_phase_provider.dart

@freezed
class NightPhaseState with _$NightPhaseState {
  const factory NightPhaseState({
    @Default(0) int currentDiceNumber,   // 0=尚未開始，1-6=當前號碼，7=結束
    @Default(5) int remainingSeconds,    // 5 秒倒數
    @Default(false) bool isPaused,
    @Default(false) bool isCompleted,
  }) = _NightPhaseState;
}

class NightPhaseNotifier extends StateNotifier<NightPhaseState> {
  final CheeseThiefVoiceRepository _voice;
  Timer? _timer;

  NightPhaseNotifier(this._voice) : super(const NightPhaseState());

  Future<void> startNight({required bool hasAccomplice}) async {
    await _voice.speak(const NightStartScript());
    _advanceToNumber(1, hasAccomplice: hasAccomplice);
  }

  void _advanceToNumber(int number, {required bool hasAccomplice}) {
    if (number > 6) {
      _completeNight();
      return;
    }

    state = state.copyWith(currentDiceNumber: number, remainingSeconds: 5);
    _voice.speak(NightCallNumberScript(
      diceNumber: number,
      hasAccomplice: hasAccomplice && number == /* thief's slot, unknown to app */,
    ));

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.isPaused) return;

      final newSeconds = state.remainingSeconds - 1;
      if (newSeconds <= 0) {
        timer.cancel();
        _advanceToNumber(number + 1, hasAccomplice: hasAccomplice);
      } else {
        state = state.copyWith(remainingSeconds: newSeconds);
      }
    });
  }

  void pause() {
    _voice.pause();
    state = state.copyWith(isPaused: true);
  }

  void resume() {
    _voice.resume();
    state = state.copyWith(isPaused: false);
  }

  void _completeNight() {
    _voice.speak(NightEndScript(discussionMinutes: 3 /* from game config */));
    state = state.copyWith(isCompleted: true, currentDiceNumber: 7);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

final nightPhaseProvider = StateNotifierProvider.autoDispose<
    NightPhaseNotifier, NightPhaseState>((ref) {
  return NightPhaseNotifier(ref.watch(voiceRepositoryProvider));
});
```

### 衍生 Providers

```dart
// 當前遊戲（從 GameStateMachine 衍生）
final currentGameProvider = Provider.autoDispose<CheeseThiefGameEntity?>((ref) {
  return ref.watch(gameStateMachineProvider).game;
});

// 當前階段
final currentPhaseProvider = Provider<GamePhase>((ref) {
  return ref.watch(gameStateMachineProvider).phase;
});

// 角色組成預覽（設定頁用）
final roleCompositionProvider = Provider.family<RoleComposition, int>((ref, playerCount) {
  final accompliceCount = CheeseThiefGameEntity.accompliceCountFor(playerCount);
  return RoleComposition(
    thiefCount: 1,
    accompliceCount: accompliceCount,
    sleepyMouseCount: playerCount - 1 - accompliceCount,
  );
});

// 投票 Provider
final votingProvider = StateNotifierProvider.autoDispose<
    VotingNotifier, VotingState>((ref) {
  final game = ref.watch(currentGameProvider);
  return VotingNotifier(
    ref.watch(submitVoteUseCaseProvider),
    ref.watch(calculateResultUseCaseProvider),
    playerCount: game?.playerCount ?? 4,
  );
});
```

### 頁面與 Provider 對應

| 頁面 | 主要 Provider | 職責說明 |
|------|-------------|---------|
| `HomePage` | `gameStateMachineProvider`, `historyProvider` | 顯示「新遊戲」與歷史入口 |
| `SetupPage` | `setupProvider`, `roleCompositionProvider` | 人數/時間設定，即時預覽角色組成 |
| `RoleAssignmentPage` | `gameStateMachineProvider` | 逐位玩家查看角色，`roleAssignmentIndex` 追蹤進度 |
| `NightPhasePage` | `nightPhaseProvider`, `gameStateMachineProvider` | 倒數動畫、暫停/繼續、靜音偵測 |
| `DiscussionPage` | `discussionProvider` | 倒數計時、提前結束、私人記事本 |
| `VotingPage` | `votingProvider` | 計票輸入、平票彈窗 |
| `ResultPage` | `gameStateMachineProvider`, `votingProvider` | 結算揭露、角色公開、再玩一局 |
| `HistoryPage` | `historyProvider` | 歷史列表、統計概覽 |

---

## 數據流圖

### 建房到結算的完整數據流

```
[SetupPage]
  玩家輸入人數/時間
       │
       ▼ ref.read(gameStateMachineProvider.notifier).startNewGame()
[CreateGameUseCase]
  驗證 playerCount 4-8
  產生 UUID 與空玩家列表
       │
       ▼
[CheeseThiefGameRepositoryImpl.createGame()]
  本地 Hive 儲存快照（離線優先）
       │
       ▼
[GameStateMachine] phase: PREPARING
       │
       ▼ transitionTo(roleAssigned) 當最後一位玩家確認角色
[AssignRolesUseCase]
  Fisher-Yates shuffle 角色列表
  更新 players[].role
       │
       ▼
[GameStateMachine] phase: ROLE_ASSIGNED → NIGHT
       │
       ▼ startNight()
[NightPhaseNotifier]
  每 5 秒推進號碼 1→6
  驅動 CheeseThiefVoiceRepository.speak()
       │
       ▼ isCompleted = true
[GameStateMachine] phase: NIGHT_DONE → DISCUSSION
       │
       ▼ discussionMinutes 倒數歸零 or 提前結束
[GameStateMachine] phase: DISCUSSION → VOTING
       │
       ▼ confirmResult()
[VotingNotifier] → [SubmitVoteUseCase]
  計算 accusedSeats（最高票）
       │
       ▼ isThiefCaught 由房主確認
[CalculateResultUseCase]
  決定 WinnerCamp
  呼叫 syncGameRecord()（非同步，背景執行）
       │
       ▼
[GameStateMachine] phase: RESULT
  清除本地快照
  ResultPage 顯示角色揭露
```

### TTS 語音播放管線

```
NightPhaseNotifier.startNight()
       │
       ▼
CheeseThiefVoiceRepositoryImpl.speak(NightStartScript)
       │
       ├─── 本地 flutter_tts 可用？
       │         │ Yes
       │         ▼
       │    FlutterTts.speak("好，現在進入夜晚...")
       │         │
       │         ▼
       │    TTS 引擎播放（無網路需求）
       │
       └─── 靜音模式偵測？
                 │ Yes (音量 = 0)
                 ▼
            UI 閃爍動畫替代語音
            (NightPhasePage 監聽 AudioSession)
```

### 離線降級策略

```
正常模式：
  遊戲進行 → 本地 Hive → 結算後 Supabase 同步

網路斷線：
  遊戲進行 → 本地 Hive（照常）
  syncGameRecord() 失敗 → 放入 PendingSync Queue（Hive）
  下次啟動 → 檢查 PendingSync Queue → 批次上傳

App 崩潰/關機：
  gameSnapshot 保存在 Hive
  重啟後 getCurrentGame() 讀取快照
  NightPhasePage 恢復：顯示「從第 N 號繼續？」Dialog
```

---

## 關鍵設計決策詳述

### 1. 骰子結果不由伺服器決定

**原因**：奶酪大盜使用實體骰子，App 不感知骰子數字分布。語音主持固定播報 1→6，無需知道誰是哪個號碼。

**防作弊方式**：遊戲規則本身透過「實體骰盅」保密，App 無需額外措施。

### 2. 角色分配在客戶端執行

**AssignRolesUseCase 演算法**：
```
輸入：playerCount
步驟：
1. 建立角色列表 = [thief × 1, accomplice × N, sleepyMouse × (playerCount-1-N)]
2. Fisher-Yates shuffle（使用 dart:math Random.secure()）
3. 依索引分配給 players[0..playerCount-1]
4. 結果存回 Hive
```

**無 Edge Function**：減少網路依賴，滿足離線 100% 目標。

### 3. 私人記事本安全設計

- 貪睡鼠偷看記錄僅存本地 Hive，不同步 Supabase
- 其他玩家無法透過 App 讀取他人記事本（Hive key 包含 `seatNumber`，無共享 UI）
- 結算後自動清除，避免洩漏

### 4. 角色卡防截圖

```dart
// role_assignment_page.dart
@override
void initState() {
  super.initState();
  // 進入角色分配頁時禁止截圖
  FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE);
}

@override
void dispose() {
  FlutterWindowManager.clearFlags(FlutterWindowManager.FLAG_SECURE);
  super.dispose();
}
```

### 5. 電量警告

```dart
// night_phase_page.dart
// 使用 battery_plus 監聽電量
final batteryLevel = await battery.batteryLevel;
if (batteryLevel < 20) {
  // 顯示 BatteryWarningBanner Widget
}
```

---

## 元件設計總表

| 元件 | 路徑 | 職責 | 依賴 |
|------|------|------|------|
| `CheeseThiefRole` | `domain/entities/cheese_thief_role.dart` | 角色枚舉 + 陣營判斷 | 無 |
| `GamePhase` | `domain/entities/game_phase.dart` | 階段枚舉 + 合法轉換定義 | 無 |
| `CheeseThiefPlayerEntity` | `domain/entities/` | 玩家+角色資料 | `CheeseThiefRole` |
| `CheeseThiefGameEntity` | `domain/entities/` | 遊戲局全局狀態 | `CheeseThiefPlayerEntity`, `GamePhase` |
| `NightActionEntity` | `domain/entities/` | 夜晚行動記錄 | `NightActionType` |
| `VoteResultEntity` | `domain/entities/` | 投票結果+勝負 | `WinnerCamp` |
| `VoiceScript` (sealed) | `domain/repositories/` | 型別安全語音腳本 | `WinnerCamp` |
| `CheeseThiefGameRepository` | `domain/repositories/` | 遊戲資料介面 | Entities |
| `CheeseThiefVoiceRepository` | `domain/repositories/` | 語音播放介面 | `VoiceScript` |
| `CreateGameUseCase` | `domain/usecases/` | 建立遊戲 + 驗證人數 | `CheeseThiefGameRepository` |
| `AssignRolesUseCase` | `domain/usecases/` | Fisher-Yates 角色洗牌 | `CheeseThiefGameRepository` |
| `CalculateResultUseCase` | `domain/usecases/` | 計算勝負 + 觸發同步 | `CheeseThiefGameRepository` |
| `CheeseThiefGameModel` | `data/models/` | Supabase DTO | - |
| `GameRecordModel` | `data/models/` | 歷史記錄 DTO | - |
| `CheeseThiefLocalDataSource` | `data/datasources/` | Hive 操作介面 | - |
| `CheeseThiefRemoteDataSource` | `data/datasources/` | Supabase 操作介面 | - |
| `CheeseThiefGameRepositoryImpl` | `data/repositories/` | Repository 實作 | DataSources |
| `CheeseThiefVoiceRepositoryImpl` | `data/repositories/` | TTS 整合 | `flutter_tts` |
| `GameStateMachine` | `presentation/providers/` | 遊戲狀態機 Notifier | UseCases |
| `NightPhaseNotifier` | `presentation/providers/` | 夜晚計時器 + TTS 驅動 | `CheeseThiefVoiceRepository` |
| `VotingNotifier` | `presentation/providers/` | 投票計票 + 結算 | UseCases |
| `NightPhasePage` | `presentation/pages/` | 夜晚主持 UI（倒數、暫停）| `nightPhaseProvider` |
| `RoleAssignmentPage` | `presentation/pages/` | 角色分配 + 防截圖 | `gameStateMachineProvider` |
| `ResultPage` | `presentation/pages/` | 結算揭露 + 再玩一局 | 多個 Providers |

---

## 建置順序

### Phase 1：Domain Layer（無外部依賴）

- [ ] `cheese_thief_role.dart` - 角色枚舉
- [ ] `game_phase.dart` - 階段枚舉 + 狀態機轉換規則
- [ ] `cheese_thief_player_entity.dart` - Freezed
- [ ] `cheese_thief_game_entity.dart` - Freezed + `accompliceCountFor()`
- [ ] `night_action_entity.dart` - Freezed
- [ ] `vote_result_entity.dart` - Freezed
- [ ] `cheese_thief_game_repository.dart` - 介面定義
- [ ] `cheese_thief_voice_repository.dart` - 介面 + VoiceScript sealed class
- [ ] `create_game_usecase.dart`
- [ ] `assign_roles_usecase.dart` - Fisher-Yates shuffle
- [ ] `submit_vote_usecase.dart`
- [ ] `calculate_result_usecase.dart`
- [ ] `peek_dice_usecase.dart`

### Phase 2：Data Layer

- [ ] `cheese_thief_game_model.dart` - Freezed + json_serializable
- [ ] `game_record_model.dart`
- [ ] `cheese_thief_local_datasource.dart` - Hive 介面 + 實作
- [ ] `cheese_thief_remote_datasource.dart` - Supabase 介面 + 實作
- [ ] `cheese_thief_game_repository_impl.dart`
- [ ] `cheese_thief_voice_repository_impl.dart` - flutter_tts 整合
- [ ] Supabase migration SQL - `cheese_thief_game_records` 表 + RLS

### Phase 3：Presentation Layer（Core）

- [ ] `game_state_state.dart` - Freezed state
- [ ] `game_state_provider.dart` - GameStateMachine
- [ ] `night_phase_state.dart` - Freezed state
- [ ] `night_phase_provider.dart` - NightPhaseNotifier + Timer
- [ ] `voting_state.dart` - Freezed state
- [ ] `voting_provider.dart` - VotingNotifier

### Phase 4：Presentation Layer（UI）

- [ ] `setup_page.dart` - 人數選擇器、角色預覽
- [ ] `role_assignment_page.dart` - 角色卡、防截圖保護
- [ ] `night_phase_page.dart` - 大字倒數、進度條、暫停按鈕
- [ ] `discussion_page.dart` - MM:SS 計時器、私人記事本
- [ ] `voting_page.dart` - 計票卡片、平票彈窗
- [ ] `result_page.dart` - 角色揭露、勝利動畫

### Phase 5：整合與測試

- [ ] 端到端流程：LOBBY → RESULT 完整走過
- [ ] 離線測試：斷網後遊戲完整可用
- [ ] 夜晚計時誤差測試（目標 < 0.5 秒）
- [ ] 角色分配隨機性驗證
- [ ] 防截圖保護驗證（iOS + Android）
- [ ] 電量警告觸發驗證
- [ ] 歷史記錄同步（延遲上傳）

---

## 相關文檔

- 需求規格：`features/cheese-thief/README.md`
- 編碼規範：`.claude/rules/coding-style.md`
- 技術棧：`.claude/rules/tech-stack.md`
- 安全規範：`.claude/rules/security.md`
- Flutter 架構：`FLUTTER_STRUCTURE.md`
