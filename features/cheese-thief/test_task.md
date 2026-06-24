# 奶酪大盜 (Cheese Thief) 測試規範

> **文件類型**: Test Task Specification
> **版本**: v1.0
> **建立日期**: 2026-03-10
> **測試分析師**: Test Generator Agent
> **需求來源**: `features/cheese-thief/README.md`
> **架構來源**: `docs/architecture/cheese-thief-architecture.md`

---

## 測試策略概述

### 測試金字塔分配

```
           /\
          /  \
         / E2E\        10% (5 個) - 完整遊戲流程
        /______\
       /        \
      / Widget   \     20% (12 個) - UI 元件與頁面互動
     /____________\
    /              \
   /     Unit       \  70% (42 個) - Domain / Data / Provider 邏輯
  /__________________\
```

### 覆蓋率目標

| 層級 | 目標覆蓋率 | 說明 |
|------|----------|------|
| Domain UseCases | 100% | 所有 UseCase 的成功路徑、錯誤處理、邊界條件 |
| Domain Entities / State Machine | 100% | GamePhase 轉換、角色枚舉邏輯 |
| Data Repositories | 90% | 本地優先策略、遠端同步、序列化 |
| Presentation Providers | 80% | Notifier 狀態轉換、計時器邏輯 |
| UI Widgets | 60% | 關鍵互動元件 |

### 測試框架與工具

| 工具 | 用途 |
|------|------|
| `flutter_test` | 所有測試類型基礎框架 |
| `mocktail` | Mock Repository / DataSource / Voice |
| `fake_async` | 控制 Timer 時間推進（NightPhaseNotifier） |
| `riverpod` ProviderContainer | Unit test Riverpod Providers |

### 測試檔案位置規劃

```
test/features/cheese_thief/
├── domain/
│   ├── entities/
│   │   ├── game_phase_test.dart
│   │   └── cheese_thief_game_entity_test.dart
│   └── usecases/
│       ├── assign_roles_usecase_test.dart
│       ├── calculate_result_usecase_test.dart
│       ├── create_game_usecase_test.dart
│       ├── designate_accomplice_usecase_test.dart
│       ├── peek_dice_usecase_test.dart
│       └── submit_vote_usecase_test.dart
├── data/
│   ├── models/
│   │   └── cheese_thief_game_model_test.dart
│   ├── datasources/
│   │   └── cheese_thief_local_datasource_test.dart
│   └── repositories/
│       └── cheese_thief_game_repository_impl_test.dart
├── presentation/
│   ├── providers/
│   │   ├── game_state_machine_test.dart
│   │   ├── night_phase_notifier_test.dart
│   │   ├── voting_notifier_test.dart
│   │   └── discussion_notifier_test.dart
│   └── widgets/
│       ├── night_counter_widget_test.dart
│       ├── vote_tally_widget_test.dart
│       └── role_card_widget_test.dart
├── fixtures/
│   ├── game_entity_fixture.dart
│   ├── player_entity_fixture.dart
│   └── game_model_fixture.dart
└── mocks/
    ├── mock_cheese_thief_game_repository.dart
    ├── mock_cheese_thief_voice_repository.dart
    ├── mock_cheese_thief_local_datasource.dart
    └── mock_cheese_thief_remote_datasource.dart
```

---

## Mock 需求

| 類別 | Mock 方式 | 備註 |
|------|----------|------|
| `CheeseThiefGameRepository` | mocktail `MockCheeseThiefGameRepository` | Domain UseCase 測試用 |
| `CheeseThiefVoiceRepository` | mocktail `MockCheeseThiefVoiceRepository` | NightPhaseNotifier 測試用 |
| `CheeseThiefLocalDataSource` | mocktail `MockCheeseThiefLocalDataSource` | Repository 實作測試用 |
| `CheeseThiefRemoteDataSource` | mocktail `MockCheeseThiefRemoteDataSource` | Repository 實作測試用 |
| `Timer` | `fake_async` FakeAsync | NightPhaseNotifier 計時器控制 |

---

## 測試 Fixtures

```dart
// test/features/cheese_thief/fixtures/game_entity_fixture.dart

extension GameEntityFixture on CheeseThiefGameEntity {
  static CheeseThiefGameEntity create4Players() => CheeseThiefGameEntity(
    id: 'test-game-id-4p',
    playerCount: 4,
    discussionMinutes: 3,
    phase: GamePhase.lobby,
    players: PlayerEntityFixture.create4Players(),
    createdAt: DateTime(2026, 3, 10),
  );

  static CheeseThiefGameEntity create6Players() => CheeseThiefGameEntity(
    id: 'test-game-id-6p',
    playerCount: 6,
    discussionMinutes: 3,
    phase: GamePhase.lobby,
    players: PlayerEntityFixture.create6Players(),
    createdAt: DateTime(2026, 3, 10),
  );

  static CheeseThiefGameEntity create8Players() => CheeseThiefGameEntity(
    id: 'test-game-id-8p',
    playerCount: 8,
    discussionMinutes: 3,
    phase: GamePhase.lobby,
    players: PlayerEntityFixture.create8Players(),
    createdAt: DateTime(2026, 3, 10),
  );
}

extension PlayerEntityFixture on CheeseThiefPlayerEntity {
  static List<CheeseThiefPlayerEntity> create4Players() => [
    CheeseThiefPlayerEntity(id: 'p1', seatNumber: 1, role: CheeseThiefRole.thief),
    CheeseThiefPlayerEntity(id: 'p2', seatNumber: 2, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p3', seatNumber: 3, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p4', seatNumber: 4, role: CheeseThiefRole.sleepyMouse),
  ];

  static List<CheeseThiefPlayerEntity> create6Players() => [
    CheeseThiefPlayerEntity(id: 'p1', seatNumber: 1, role: CheeseThiefRole.thief),
    CheeseThiefPlayerEntity(id: 'p2', seatNumber: 2, role: CheeseThiefRole.accomplice),
    CheeseThiefPlayerEntity(id: 'p3', seatNumber: 3, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p4', seatNumber: 4, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p5', seatNumber: 5, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p6', seatNumber: 6, role: CheeseThiefRole.sleepyMouse),
  ];

  static List<CheeseThiefPlayerEntity> create8Players() => [
    CheeseThiefPlayerEntity(id: 'p1', seatNumber: 1, role: CheeseThiefRole.thief),
    CheeseThiefPlayerEntity(id: 'p2', seatNumber: 2, role: CheeseThiefRole.accomplice),
    CheeseThiefPlayerEntity(id: 'p3', seatNumber: 3, role: CheeseThiefRole.accomplice),
    CheeseThiefPlayerEntity(id: 'p4', seatNumber: 4, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p5', seatNumber: 5, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p6', seatNumber: 6, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p7', seatNumber: 7, role: CheeseThiefRole.sleepyMouse),
    CheeseThiefPlayerEntity(id: 'p8', seatNumber: 8, role: CheeseThiefRole.sleepyMouse),
  ];
}
```

---

## 單元測試 (Unit Tests) - 42 個

---

### 模組一：GamePhase 狀態機

#### 成功路徑

- [ ] **CT-T-001** `GamePhase.canTransitionTo()` - 合法轉換：lobby → preparing
  - Given: phase = `GamePhase.lobby`
  - When: `canTransitionTo(GamePhase.preparing)`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-002** `GamePhase.canTransitionTo()` - 合法轉換：preparing → roleAssigned
  - Given: phase = `GamePhase.preparing`
  - When: `canTransitionTo(GamePhase.roleAssigned)`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-003** `GamePhase.canTransitionTo()` - 合法轉換：roleAssigned → night
  - Given: phase = `GamePhase.roleAssigned`
  - When: `canTransitionTo(GamePhase.night)`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-004** `GamePhase.canTransitionTo()` - 合法轉換：night → nightDone
  - Given: phase = `GamePhase.night`
  - When: `canTransitionTo(GamePhase.nightDone)`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-005** `GamePhase.canTransitionTo()` - 合法轉換：nightDone → discussion
  - Given: phase = `GamePhase.nightDone`
  - When: `canTransitionTo(GamePhase.discussion)`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-006** `GamePhase.canTransitionTo()` - 合法轉換：discussion → voting
  - Given: phase = `GamePhase.discussion`
  - When: `canTransitionTo(GamePhase.voting)`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-007** `GamePhase.canTransitionTo()` - 合法轉換：voting → result
  - Given: phase = `GamePhase.voting`
  - When: `canTransitionTo(GamePhase.result)`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-008** `GamePhase.canTransitionTo()` - 合法轉換：result → lobby（再玩一局）
  - Given: phase = `GamePhase.result`
  - When: `canTransitionTo(GamePhase.lobby)`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-009** `GamePhase.canTransitionTo()` - 合法後退：preparing → lobby（返回首頁）
  - Given: phase = `GamePhase.preparing`
  - When: `canTransitionTo(GamePhase.lobby)`
  - Then: returns `true`
  - 優先級: P1 / Unit

#### 非法轉換（邊界條件）

- [ ] **CT-T-010** `GamePhase.canTransitionTo()` - 非法跳轉：lobby → night（跳過中間階段）
  - Given: phase = `GamePhase.lobby`
  - When: `canTransitionTo(GamePhase.night)`
  - Then: returns `false`
  - 優先級: P0 / Unit

- [ ] **CT-T-011** `GamePhase.canTransitionTo()` - 非法倒退：night → lobby（不可跳回）
  - Given: phase = `GamePhase.night`
  - When: `canTransitionTo(GamePhase.lobby)`
  - Then: returns `false`
  - 優先級: P0 / Unit

- [ ] **CT-T-012** `GamePhase.canTransitionTo()` - 非法自轉：result → result
  - Given: phase = `GamePhase.result`
  - When: `canTransitionTo(GamePhase.result)`
  - Then: returns `false`
  - 優先級: P1 / Unit

- [ ] **CT-T-013** `GamePhase.canTransitionTo()` - 非法跳轉：voting → lobby（跳過結算）
  - Given: phase = `GamePhase.voting`
  - When: `canTransitionTo(GamePhase.lobby)`
  - Then: returns `false`
  - 優先級: P0 / Unit

- [ ] **CT-T-014** `CheeseThiefRole.isThiefCamp` - 大盜屬於大盜陣營
  - Given: role = `CheeseThiefRole.thief`
  - When: `role.isThiefCamp`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-015** `CheeseThiefRole.isThiefCamp` - 共犯屬於大盜陣營
  - Given: role = `CheeseThiefRole.accomplice`
  - When: `role.isThiefCamp`
  - Then: returns `true`
  - 優先級: P0 / Unit

- [ ] **CT-T-016** `CheeseThiefRole.isMouseCamp` - 貪睡鼠屬於老鼠陣營，不屬於大盜陣營
  - Given: role = `CheeseThiefRole.sleepyMouse`
  - When: `role.isMouseCamp` / `role.isThiefCamp`
  - Then: `isMouseCamp` = `true`, `isThiefCamp` = `false`
  - 優先級: P0 / Unit

---

### 模組二：AssignRolesUseCase（角色分配）

#### 成功路徑

- [ ] **CT-T-017** `AssignRolesUseCase.execute()` - 4 人局角色分配正確
  - Given: 4 人局遊戲，repository mock 返回 4 人遊戲實體
  - When: `execute(gameId: 'test-game-id-4p')`
  - Then: 回傳 4 個玩家，恰好 1 個 `thief`、0 個 `accomplice`、3 個 `sleepyMouse`
  - 優先級: P0 / Unit

- [ ] **CT-T-018** `AssignRolesUseCase.execute()` - 5 人局角色分配正確
  - Given: 5 人局遊戲
  - When: `execute(gameId)`
  - Then: 回傳 5 個玩家，恰好 1 個 `thief`、1 個 `accomplice`、3 個 `sleepyMouse`
  - 優先級: P0 / Unit

- [ ] **CT-T-019** `AssignRolesUseCase.execute()` - 6 人局角色分配正確
  - Given: 6 人局遊戲
  - When: `execute(gameId)`
  - Then: 回傳 6 個玩家，恰好 1 個 `thief`、1 個 `accomplice`、4 個 `sleepyMouse`
  - 優先級: P0 / Unit

- [ ] **CT-T-020** `AssignRolesUseCase.execute()` - 7 人局角色分配正確
  - Given: 7 人局遊戲
  - When: `execute(gameId)`
  - Then: 回傳 7 個玩家，恰好 1 個 `thief`、2 個 `accomplice`、4 個 `sleepyMouse`
  - 優先級: P0 / Unit

- [ ] **CT-T-021** `AssignRolesUseCase.execute()` - 8 人局角色分配正確（最大人數）
  - Given: 8 人局遊戲
  - When: `execute(gameId)`
  - Then: 回傳 8 個玩家，恰好 1 個 `thief`、2 個 `accomplice`、5 個 `sleepyMouse`
  - 優先級: P0 / Unit

- [ ] **CT-T-022** `AssignRolesUseCase.execute()` - Fisher-Yates 產生隨機分配（非固定順序）
  - Given: 相同 6 人局，執行 100 次
  - When: 比較每次大盜座位號碼
  - Then: 大盜不固定於座位 1，至少出現 2 種以上不同座位分配
  - 備註: 統計驗證隨機性，非確定性斷言
  - 優先級: P1 / Unit

- [ ] **CT-T-023** `CheeseThiefGameEntity.accompliceCountFor()` - 各人數共犯數量正確
  - Given: playerCount = 4, 5, 6, 7, 8
  - When: `accompliceCountFor(playerCount)`
  - Then: 4 → 0, 5 → 1, 6 → 1, 7 → 2, 8 → 2
  - 優先級: P0 / Unit

---

### 模組三：CalculateResultUseCase（勝負計算）

#### 成功路徑

- [ ] **CT-T-024** `CalculateResultUseCase.execute()` - 投出大盜 → 貪睡鼠陣營勝
  - Given: voteMap = {1: 3, 2: 1}，座位 1 為大盜，`isThiefCaught = true`
  - When: `execute(gameId, isThiefCaught: true)`
  - Then: `VoteResultEntity.winner` = `WinnerCamp.mouse`，`isThiefCaught = true`
  - 優先級: P0 / Unit

- [ ] **CT-T-025** `CalculateResultUseCase.execute()` - 投出共犯（非大盜）→ 大盜陣營勝
  - Given: voteMap = {2: 3, 1: 1}，座位 2 為共犯，座位 1 為大盜，`isThiefCaught = false`
  - When: `execute(gameId, isThiefCaught: false)`
  - Then: `VoteResultEntity.winner` = `WinnerCamp.thief`
  - 優先級: P0 / Unit

- [ ] **CT-T-026** `CalculateResultUseCase.execute()` - 投出村民（貪睡鼠）→ 大盜陣營勝
  - Given: voteMap = {3: 4}，座位 3 為貪睡鼠，`isThiefCaught = false`
  - When: `execute(gameId, isThiefCaught: false)`
  - Then: `VoteResultEntity.winner` = `WinnerCamp.thief`
  - 優先級: P0 / Unit

#### 邊界條件

- [ ] **CT-T-027** `CalculateResultUseCase.execute()` - 完全平票（所有玩家各得 1 票）→ 大盜陣營勝
  - Given: 4 人局，voteMap = {1: 1, 2: 1, 3: 1, 4: 1}，座位 1 為大盜，`isThiefCaught = false`
  - When: `execute(gameId, isThiefCaught: false)`
  - Then: `accusedSeats` = [1, 2, 3, 4]，`winner` = `WinnerCamp.thief`
  - 優先級: P0 / Unit

- [ ] **CT-T-028** `CalculateResultUseCase.execute()` - 平票且平票者包含大盜 → 貪睡鼠陣營勝
  - Given: voteMap = {1: 2, 2: 2}，座位 1 為大盜，`isThiefCaught = true`
  - When: `execute(gameId, isThiefCaught: true)`
  - Then: `accusedSeats` = [1, 2]，`winner` = `WinnerCamp.mouse`
  - 優先級: P0 / Unit

- [ ] **CT-T-029** `CalculateResultUseCase.execute()` - 1 票差距勝出
  - Given: voteMap = {1: 2, 2: 1, 3: 1}，座位 1 為大盜，`isThiefCaught = true`
  - When: `execute(gameId, isThiefCaught: true)`
  - Then: `accusedSeats` = [1]，`winner` = `WinnerCamp.mouse`
  - 優先級: P0 / Unit

- [ ] **CT-T-030** `CalculateResultUseCase.execute()` - 結算後觸發 syncGameRecord（背景同步）
  - Given: 正常結算，repository.syncGameRecord mock
  - When: `execute()` 完成
  - Then: `repository.syncGameRecord()` 被呼叫 1 次
  - 優先級: P1 / Unit

---

### 模組四：PeekDiceUseCase（骰子偷看）

#### 成功路徑

- [ ] **CT-T-031** `PeekDiceUseCase.execute()` - 貪睡鼠成功偷看他人骰子
  - Given: viewerSeat = 2（貪睡鼠），targetSeat = 3，diceNumber = 4
  - When: `execute(gameId, viewerSeat: 2, targetSeat: 3, diceNumber: 4)`
  - Then: `repository.saveNightAction()` 被呼叫，action.type = `peekDice`，`observedDiceNumber = 4`
  - 優先級: P0 / Unit

#### 邊界條件

- [ ] **CT-T-032** `PeekDiceUseCase.execute()` - 不能偷看自己的骰子
  - Given: viewerSeat = 2，targetSeat = 2（相同座位）
  - When: `execute(gameId, viewerSeat: 2, targetSeat: 2, diceNumber: 3)`
  - Then: returns `Left(GameException)` 且 repository 未被呼叫
  - 優先級: P0 / Unit

- [ ] **CT-T-033** `PeekDiceUseCase.execute()` - 骰子數字超出範圍（0）→ 拒絕
  - Given: viewerSeat = 2，targetSeat = 3，diceNumber = 0
  - When: `execute()`
  - Then: returns `Left(GameException('dice number must be 1-6'))`
  - 優先級: P1 / Unit

- [ ] **CT-T-034** `PeekDiceUseCase.execute()` - 骰子數字超出範圍（7）→ 拒絕
  - Given: viewerSeat = 2，targetSeat = 3，diceNumber = 7
  - When: `execute()`
  - Then: returns `Left(GameException('dice number must be 1-6'))`
  - 優先級: P1 / Unit

---

### 模組五：DesignateAccompliceUseCase（共犯指定）

#### 成功路徑

- [ ] **CT-T-035** `DesignateAccompliceUseCase.execute()` - 5-6 人局指定 1 名共犯合法
  - Given: 6 人局，thiefSeat = 1，accompliceSeats = [3]
  - When: `execute(gameId, thiefSeat: 1, accompliceSeats: [3])`
  - Then: `Right(unit)` 且 nightAction 被儲存
  - 優先級: P0 / Unit

- [ ] **CT-T-036** `DesignateAccompliceUseCase.execute()` - 7-8 人局指定 2 名共犯合法
  - Given: 8 人局，thiefSeat = 1，accompliceSeats = [3, 5]
  - When: `execute(gameId, thiefSeat: 1, accompliceSeats: [3, 5])`
  - Then: `Right(unit)` 且 nightAction 被儲存
  - 優先級: P0 / Unit

- [ ] **CT-T-037** `DesignateAccompliceUseCase.execute()` - 4 人局不可指定共犯
  - Given: 4 人局，thiefSeat = 1，accompliceSeats = [2]
  - When: `execute(gameId, thiefSeat: 1, accompliceSeats: [2])`
  - Then: `Left(GameException('accomplice not allowed in 4-player game'))`
  - 優先級: P0 / Unit

#### 邊界條件

- [ ] **CT-T-038** `DesignateAccompliceUseCase.execute()` - 5-6 人局指定超過 1 名共犯 → 拒絕
  - Given: 6 人局，thiefSeat = 1，accompliceSeats = [2, 3]（超過上限 1）
  - When: `execute(gameId, thiefSeat: 1, accompliceSeats: [2, 3])`
  - Then: `Left(GameException('accomplice count exceeds limit for 6-player game'))`
  - 優先級: P0 / Unit

- [ ] **CT-T-039** `DesignateAccompliceUseCase.execute()` - 7-8 人局指定超過 2 名共犯 → 拒絕
  - Given: 8 人局，thiefSeat = 1，accompliceSeats = [2, 3, 4]（超過上限 2）
  - When: `execute(gameId, thiefSeat: 1, accompliceSeats: [2, 3, 4])`
  - Then: `Left(GameException('accomplice count exceeds limit for 8-player game'))`
  - 優先級: P0 / Unit

- [ ] **CT-T-040** `DesignateAccompliceUseCase.execute()` - 大盜不能指定自己為共犯
  - Given: 6 人局，thiefSeat = 1，accompliceSeats = [1]
  - When: `execute(gameId, thiefSeat: 1, accompliceSeats: [1])`
  - Then: `Left(GameException('thief cannot designate self as accomplice'))`
  - 優先級: P0 / Unit

---

### 模組六：SubmitVoteUseCase（投票驗證）

#### 成功路徑

- [ ] **CT-T-041** `SubmitVoteUseCase.execute()` - 合法投票（票數等於玩家數）
  - Given: 4 人局，voteMap = {1: 2, 2: 1, 3: 1}（總票數 = 4）
  - When: `execute(gameId, voteMap)`
  - Then: `Right(VoteResultEntity)` 被返回，accusedSeats = [1]
  - 優先級: P0 / Unit

- [ ] **CT-T-042** `SubmitVoteUseCase.execute()` - 平票返回多個 accusedSeats
  - Given: 4 人局，voteMap = {1: 2, 2: 2}（各 2 票）
  - When: `execute(gameId, voteMap)`
  - Then: `Right(VoteResultEntity)`，accusedSeats = [1, 2]（排序一致）
  - 優先級: P0 / Unit

#### 邊界條件

- [ ] **CT-T-043** `SubmitVoteUseCase.execute()` - 票數不等於玩家人數 → 拒絕
  - Given: 4 人局，voteMap = {1: 1, 2: 1}（總票數 = 2，缺少 2 票）
  - When: `execute(gameId, voteMap)`
  - Then: `Left(GameException('total votes must equal player count'))`
  - 優先級: P0 / Unit

- [ ] **CT-T-044** `SubmitVoteUseCase.execute()` - 投票對象座位號碼超出範圍 → 拒絕
  - Given: 4 人局，voteMap = {9: 4}（座位 9 不存在）
  - When: `execute(gameId, voteMap)`
  - Then: `Left(GameException('invalid seat number'))`
  - 優先級: P0 / Unit

- [ ] **CT-T-045** `SubmitVoteUseCase.execute()` - 棄票（超時未投，票數為 0）→ 轉換為平票處理
  - Given: 4 人局，某玩家棄票，voteMap 中該座位票數為 0
  - When: `execute(gameId, {1: 0, 2: 0, 3: 0, 4: 0})` （全員棄票視為平票）
  - Then: `accusedSeats` = [1, 2, 3, 4]，需房主手動確認大盜
  - 優先級: P1 / Unit

---

### 模組七：CheeseThiefGameModel（序列化）

#### 成功路徑

- [ ] **CT-T-046** `CheeseThiefGameModel.fromJson()` - 正常 JSON 反序列化
  - Given: 標準 Supabase 回傳 JSON（snake_case keys）
  - When: `CheeseThiefGameModel.fromJson(json)`
  - Then: 所有欄位正確對應，`phase` 字串轉為 `GamePhase`，`created_at` 轉為 `DateTime`
  - 優先級: P0 / Unit

- [ ] **CT-T-047** `CheeseThiefGameModel.toJson()` - 序列化產生正確 snake_case 鍵值
  - Given: 有效 `CheeseThiefGameModel` 物件
  - When: `.toJson()`
  - Then: JSON 包含 `player_count`、`discussion_minutes`、`is_cheese_stolen`、`created_at`
  - 優先級: P0 / Unit

- [ ] **CT-T-048** `CheeseThiefGameModel.toEntity()` - DTO 正確轉換為 Entity
  - Given: 有效 `CheeseThiefGameModel`，phase = "night"
  - When: `.toEntity()`
  - Then: 回傳 `CheeseThiefGameEntity`，`phase` = `GamePhase.night`，`players` 為空列表
  - 優先級: P0 / Unit

#### 邊界條件

- [ ] **CT-T-049** `CheeseThiefGameModel.fromJson()` - `is_cheese_stolen` 為 null 時正確處理
  - Given: JSON 中 `is_cheese_stolen` = null
  - When: `fromJson()`
  - Then: `isCheeseStolen` = null（未確認狀態）
  - 優先級: P1 / Unit

- [ ] **CT-T-050** `CheeseThiefGameModel.fromJson()` - `phase` 字串不合法 → 拋出例外
  - Given: JSON 中 `phase` = `"invalid_phase"`
  - When: `fromJson()`
  - Then: 拋出 `ArgumentError` 或自訂解析例外
  - 優先級: P1 / Unit

---

### 模組八：CheeseThiefGameRepositoryImpl（Repository 實作）

#### 成功路徑

- [ ] **CT-T-051** `createGame()` - 建立遊戲並儲存至本地 Hive
  - Given: `localDataSource.saveGameSnapshot` mock 成功
  - When: `createGame(playerCount: 4, discussionMinutes: 3)`
  - Then: `Right(CheeseThiefGameEntity)` 被返回，`localDataSource.saveGameSnapshot` 被呼叫
  - 優先級: P0 / Unit

- [ ] **CT-T-052** `getCurrentGame()` - 有本地快照時返回快照（本地優先）
  - Given: `localDataSource.getGameSnapshot()` 返回有效 `CheeseThiefGameModel`
  - When: `getCurrentGame()`
  - Then: 返回轉換後的 `CheeseThiefGameEntity`，未呼叫遠端 DataSource
  - 優先級: P0 / Unit

- [ ] **CT-T-053** `getCurrentGame()` - 無本地快照時返回 null
  - Given: `localDataSource.getGameSnapshot()` 返回 null
  - When: `getCurrentGame()`
  - Then: `Right(null)`
  - 優先級: P0 / Unit

- [ ] **CT-T-054** `syncGameRecord()` - 遠端同步失敗時不阻塞（靜默失敗）
  - Given: `remoteDataSource.uploadGameRecord()` 拋出 `Exception`
  - When: `syncGameRecord(game, result)`
  - Then: 返回 `Right(unit)`（不是 Left），不向上傳播錯誤
  - 優先級: P0 / Unit

#### 邊界條件 / 錯誤處理

- [ ] **CT-T-055** `createGame()` - Hive 寫入失敗 → 返回 CacheFailure
  - Given: `localDataSource.saveGameSnapshot()` 拋出 `HiveException`
  - When: `createGame(playerCount: 4, discussionMinutes: 3)`
  - Then: `Left(CacheFailure())`
  - 優先級: P0 / Unit

---

### 模組九：LocalDataSource（Hive 讀寫）

#### 成功路徑

- [ ] **CT-T-056** `saveGameSnapshot()` - 成功寫入 Hive box
  - Given: 有效 `CheeseThiefGameModel`，Hive box 已開啟
  - When: `saveGameSnapshot(model)`
  - Then: 無例外，Hive key `'current_game'` 存有序列化資料
  - 優先級: P0 / Unit

- [ ] **CT-T-057** `getGameSnapshot()` - 成功讀取並反序列化
  - Given: Hive box 中有已存入的 `CheeseThiefGameModel` 資料
  - When: `getGameSnapshot()`
  - Then: 返回正確的 `CheeseThiefGameModel`
  - 優先級: P0 / Unit

- [ ] **CT-T-058** `clearGameSnapshot()` - 清除快照後 `getGameSnapshot()` 返回 null
  - Given: Hive box 中有快照資料
  - When: `clearGameSnapshot()` 後呼叫 `getGameSnapshot()`
  - Then: `getGameSnapshot()` 返回 null
  - 優先級: P1 / Unit

#### 邊界條件（離線測試）

- [ ] **CT-T-059** `saveNightNote()` / `getNightNote()` - 不同座位號碼的記事本相互隔離
  - Given: seatNumber = 2 儲存 "note-2"，seatNumber = 3 儲存 "note-3"
  - When: `getNightNote(gameId, seatNumber: 2)`
  - Then: 返回 "note-2"，不返回 seatNumber = 3 的資料
  - 優先級: P0 / Unit

---

### 模組十：GameStateMachine（Presentation Provider）

#### 成功路徑

- [ ] **CT-T-060** `GameStateMachine.startNewGame()` - 成功建立遊戲後 phase 推進至 preparing
  - Given: `createGameUseCase` mock 返回 `Right(game)`
  - When: `startNewGame(playerCount: 4, discussionMinutes: 3)`
  - Then: `state.phase` = `GamePhase.preparing`，`state.game` 不為 null，`state.isLoading` = false
  - 優先級: P0 / Unit

- [ ] **CT-T-061** `GameStateMachine.startNewGame()` - 建立過程中 isLoading = true
  - Given: `createGameUseCase` mock 延遲返回
  - When: `startNewGame()` 呼叫後、結果返回前
  - Then: `state.isLoading` = true
  - 優先級: P1 / Unit

- [ ] **CT-T-062** `GameStateMachine.transitionTo()` - 合法轉換成功更新 phase
  - Given: state.phase = `GamePhase.preparing`
  - When: `transitionTo(GamePhase.roleAssigned)`
  - Then: `state.phase` = `GamePhase.roleAssigned`
  - 優先級: P0 / Unit

- [ ] **CT-T-063** `GameStateMachine.transitionTo()` - 非法轉換拋出 GameException
  - Given: state.phase = `GamePhase.lobby`
  - When: `transitionTo(GamePhase.result)`
  - Then: throws `GameException('Invalid transition: lobby -> result')`
  - 優先級: P0 / Unit

- [ ] **CT-T-064** `GameStateMachine.startNewGame()` - UseCase 失敗時更新 errorMessage
  - Given: `createGameUseCase` mock 返回 `Left(CacheFailure())`
  - When: `startNewGame(playerCount: 4, discussionMinutes: 3)`
  - Then: `state.errorMessage` 不為 null，`state.phase` 仍為 `lobby`
  - 優先級: P0 / Unit

---

### 模組十一：NightPhaseNotifier（夜晚計時器）

#### 成功路徑

- [ ] **CT-T-065** `NightPhaseNotifier.startNight()` - 從號碼 1 開始，5 秒後推進至號碼 2
  - Given: `fake_async` 控制時間，voiceRepository mock
  - When: `startNight(hasAccomplice: false)`，推進 5 秒
  - Then: `state.currentDiceNumber` = 2，`state.remainingSeconds` = 5
  - 優先級: P0 / Unit

- [ ] **CT-T-066** `NightPhaseNotifier` - 號碼 1 到 6 依序推進，6 號結束後 isCompleted = true
  - Given: `fake_async` 推進 6 × 5 = 30 秒
  - When: `startNight()` 後推進 30 秒
  - Then: `state.isCompleted` = true，`state.currentDiceNumber` = 7
  - 優先級: P0 / Unit

- [ ] **CT-T-067** `NightPhaseNotifier.pause()` - 暫停時計時停止（remainingSeconds 不變）
  - Given: 號碼 1 已開始，進行 2 秒
  - When: `pause()`，再推進 3 秒
  - Then: `state.remainingSeconds` 仍為 3（暫停前剩餘），`state.isPaused` = true
  - 優先級: P0 / Unit

- [ ] **CT-T-068** `NightPhaseNotifier.resume()` - 恢復後計時繼續
  - Given: 暫停中，`state.remainingSeconds` = 3
  - When: `resume()`，再推進 3 秒
  - Then: 號碼推進至下一個，`state.isPaused` = false
  - 優先級: P0 / Unit

- [ ] **CT-T-069** `NightPhaseNotifier` - 每個號碼播報時呼叫 voiceRepository.speak()
  - Given: 推進 30 秒（6 個號碼）
  - When: `startNight(hasAccomplice: false)`
  - Then: `voiceRepository.speak()` 被呼叫至少 7 次（開始語音 + 6 個號碼）
  - 優先級: P1 / Unit

- [ ] **CT-T-070** `NightPhaseNotifier.dispose()` - 釋放時 Timer 被取消（無記憶體洩漏）
  - Given: 計時進行中
  - When: `dispose()`
  - Then: 後續時間推進不再觸發狀態更新，無 Exception
  - 優先級: P1 / Unit

---

### 模組十二：VotingNotifier（投票邏輯）

#### 成功路徑

- [ ] **CT-T-071** `VotingNotifier.addVote()` - 票數累加正確
  - Given: 初始 voteMap 為空
  - When: `addVote(seatNumber: 1)` 呼叫 2 次
  - Then: `state.voteMap[1]` = 2
  - 優先級: P0 / Unit

- [ ] **CT-T-072** `VotingNotifier.removeVote()` - 票數扣除且不低於 0
  - Given: `state.voteMap = {1: 1}`
  - When: `removeVote(seatNumber: 1)` 呼叫 2 次
  - Then: `state.voteMap[1]` = 0（不為負數）
  - 優先級: P0 / Unit

- [ ] **CT-T-073** `VotingNotifier.totalVotes` - 總票數計算正確
  - Given: voteMap = {1: 2, 2: 1, 3: 1}
  - When: `state.totalVotes`
  - Then: = 4
  - 優先級: P0 / Unit

#### 邊界條件

- [ ] **CT-T-074** `VotingNotifier.confirmResult()` - 票數不等於玩家數時回傳錯誤
  - Given: 4 人局，但 voteMap 總票數 = 3
  - When: `confirmResult()`
  - Then: `state.error` 不為 null，提示「票數不符合玩家人數」
  - 優先級: P0 / Unit

---

### 模組十三：DiscussionNotifier（討論計時）

#### 成功路徑

- [ ] **CT-T-075** `DiscussionNotifier` - 倒數 3 分鐘（180 秒）歸零後自動切換
  - Given: `fake_async`，discussionMinutes = 3
  - When: `startDiscussion()`，推進 180 秒
  - Then: `state.isCompleted` = true，GameStateMachine 收到 `voting` 階段
  - 優先級: P0 / Unit

- [ ] **CT-T-076** `DiscussionNotifier` - 剩餘 30 秒時進入警告狀態
  - Given: discussionMinutes = 3
  - When: 推進 150 秒（剩餘 30 秒）
  - Then: `state.isWarning` = true
  - 優先級: P1 / Unit

- [ ] **CT-T-077** `DiscussionNotifier.extendOneMinute()` - 延長 1 分鐘（僅限 1 次）
  - Given: 討論時間歸零後進入投票頁
  - When: `extendOneMinute()` 呼叫 1 次
  - Then: 計時器重置為 60 秒，`state.canExtend` = false（不可再延長）
  - 優先級: P1 / Unit

---

## 邊界條件測試詳述（15 個）

以下為需特別關注的邊界條件場景，對應前述測試 ID：

| # | 場景 | 對應測試 ID | 說明 |
|---|------|-----------|------|
| BC-01 | 4 人局（最少人數）角色分配 | CT-T-017 | 確認無共犯，3 貪睡鼠 |
| BC-02 | 8 人局（最多人數）角色分配 | CT-T-021 | 確認 2 共犯，5 貪睡鼠 |
| BC-03 | 所有骰子相同號碼 | 見下方 CT-T-BC03 | 無法偷看，規則說明正確 |
| BC-04 | 大盜忘記偷奶酪（超時）| 見下方 CT-T-BC04 | 奶酪未偷警告流程 |
| BC-05 | 投票全部平票 | CT-T-027 | 4 人各 1 票，大盜陣營勝 |
| BC-06 | 投票只有 1 票差距 | CT-T-029 | 2 票 vs 1 票，正確識別 |
| BC-07 | 討論時間歸零自動跳轉 | CT-T-075 | 自動進入投票階段 |
| BC-08 | 夜晚計時中途暫停/恢復 | CT-T-067, CT-T-068 | 計時精確，不丟失秒數 |
| BC-09 | 網路斷線時遊戲記錄同步失敗 | CT-T-054 | 靜默失敗，不阻塞 UI |
| BC-10 | 離線模式下遊戲完整進行 | CT-T-051~055 | 本地優先策略完整覆蓋 |
| BC-11 | 遊戲結果重複上傳（冪等）| 見下方 CT-T-BC11 | 相同 gameId 重複上傳不重複計數 |
| BC-12 | 共犯被投出（大盜陣營勝） | CT-T-025 | isThiefCaught = false 判斷正確 |
| BC-13 | 大盜被投出（貪睡鼠陣營勝） | CT-T-024 | isThiefCaught = true 判斷正確 |
| BC-14 | 棄票（超時未投）| CT-T-045 | 視為平票處理 |
| BC-15 | 房間代碼碰撞重試 | 見下方 CT-T-BC15 | Edge Function 碰撞重試機制 |

### 補充邊界條件測試

- [ ] **CT-T-BC03** `AssignRolesUseCase` + `NightPhaseNotifier` - 所有玩家骰子相同號碼的情境說明
  - Given: 規則說明頁面渲染
  - When: 進入規則說明畫面
  - Then: 「與他人同時醒來 = 微笑不動」規則說明文字存在於 UI
  - 優先級: P2 / Widget

- [ ] **CT-T-BC04** `StealCheeseUseCase` - 大盜忘記偷奶酪，觸發警告流程
  - Given: 遊戲進入結算，`isCheeseStolen = false`
  - When: `execute(gameId, stolen: false)`
  - Then: `Right(entity)` 且 `entity.isCheeseStolen` = false，UI 顯示警告彈窗
  - 優先級: P1 / Unit

- [ ] **CT-T-BC11** `CheeseThiefRemoteDataSource.uploadGameRecord()` - 相同 gameId 重複呼叫冪等
  - Given: 第一次 upload 成功，第二次呼叫相同 gameId
  - When: `uploadGameRecord(record)` 第二次
  - Then: Supabase upsert（ON CONFLICT DO NOTHING）不新增重複記錄
  - 備註: 需在 migration SQL 中加入 `UNIQUE(game_id, user_id)` 或在 Edge Function 做 upsert
  - 優先級: P1 / Unit

- [ ] **CT-T-BC15** Edge Function `save-cheese-thief-result` - 房主驗證：非房主呼叫被拒絕
  - Given: `x-user-id` 對應非房主 userId
  - When: POST `/functions/v1/save-cheese-thief-result`，帶有效 gameId
  - Then: HTTP 403，body = `{ "error": "only host can save result" }`
  - 優先級: P1 / Integration

---

## Widget 測試 (Widget Tests) - 12 個

---

### NightCounterWidget

- [ ] **CT-W-001** 顯示當前號碼（大字）與 5 秒倒數進度條
  - Given: `NightPhaseState(currentDiceNumber: 3, remainingSeconds: 3, isPaused: false)`
  - When: render `NightCounterWidget`
  - Then: 顯示文字 "3"，進度條寬度約 60%（3/5）
  - 優先級: P0 / Widget

- [ ] **CT-W-002** 暫停狀態時顯示暫停圖示，進度條不動
  - Given: `NightPhaseState(isPaused: true, remainingSeconds: 2)`
  - When: render `NightCounterWidget`
  - Then: 顯示暫停圖示（PauseIcon），進度條凍結
  - 優先級: P1 / Widget

- [ ] **CT-W-003** 靜音模式時號碼閃爍動畫替代語音提示
  - Given: `isMuted: true`，`currentDiceNumber: 4`
  - When: render `NightCounterWidget`
  - Then: 存在閃爍動畫 Widget（AnimatedContainer 或 AnimatedOpacity），無語音觸發
  - 優先級: P1 / Widget

### RoleCardWidget

- [ ] **CT-W-004** 大盜角色卡顯示正確顏色與名稱
  - Given: `role: CheeseThiefRole.thief`
  - When: render `RoleCardWidget(role: CheeseThiefRole.thief, isRevealed: true)`
  - Then: 背景色為深色系（thief theme color），顯示「奶酪大盜」文字
  - 優先級: P0 / Widget

- [ ] **CT-W-005** 角色卡未翻開時顯示背面（遮擋角色資訊）
  - Given: `isRevealed: false`
  - When: render `RoleCardWidget(role: CheeseThiefRole.thief, isRevealed: false)`
  - Then: 「奶酪大盜」文字不存在，顯示遮擋背面元素
  - 優先級: P0 / Widget

- [ ] **CT-W-006** 點擊「查看我的角色」後翻開角色卡
  - Given: `isRevealed: false`，有 `onReveal` callback
  - When: tap 翻牌按鈕
  - Then: `onReveal` callback 被呼叫
  - 優先級: P0 / Widget

### VoteTallyWidget

- [ ] **CT-W-007** 顯示所有玩家票數
  - Given: 4 人局，voteMap = {1: 2, 2: 1, 3: 1, 4: 0}
  - When: render `VoteTallyWidget`
  - Then: P1 顯示 "2"，P2 顯示 "1"，P3 顯示 "1"，P4 顯示 "0"
  - 優先級: P0 / Widget

- [ ] **CT-W-008** 票數與玩家數不符時顯示警告
  - Given: 4 人局，totalVotes = 3（少 1 票）
  - When: render `VoteTallyWidget`
  - Then: 顯示橘色警告文字，「確認結果」按鈕 disabled
  - 優先級: P0 / Widget

- [ ] **CT-W-009** 點擊玩家卡片增加票數
  - Given: render `VoteTallyWidget(playerCount: 4)`
  - When: tap P1 的卡片
  - Then: P1 票數 +1，呼叫 `votingNotifier.addVote(1)`
  - 優先級: P0 / Widget

### SetupPage

- [ ] **CT-W-010** 4 人局角色組成預覽正確（無共犯）
  - Given: playerCount = 4
  - When: render `SetupPage` 中的角色組成預覽元件
  - Then: 顯示「大盜 ×1」、「貪睡鼠 ×3」，不顯示「共犯」
  - 優先級: P0 / Widget

- [ ] **CT-W-011** 人數少於 4 時「開始遊戲」按鈕 disabled
  - Given: playerCount = 3（假設允許輸入但 < 4）
  - When: render `SetupPage`
  - Then: 「開始遊戲」按鈕 disabled，顯示「最少需要 4 位玩家」提示
  - 優先級: P0 / Widget

### CountdownTimerWidget

- [ ] **CT-W-012** 剩餘 30 秒時文字顏色變橘
  - Given: `remainingSeconds: 30`
  - When: render `CountdownTimerWidget`
  - Then: 時間文字顏色 = `AppColors.warning`（橘色）
  - 優先級: P1 / Widget

---

## 整合測試 (Integration Tests) - 5 個

---

- [ ] **CT-I-001** 完整遊戲流程：LOBBY → RESULT（4 人局，大盜勝）
  - 前置條件: App 已啟動，無進行中遊戲
  - 步驟:
    1. 進入 SetupPage，選擇 4 人局，點擊「開始」
    2. 完成 4 位玩家角色查看（mock 角色分配，P1 = 大盜）
    3. 點擊「開始夜晚」，等待夜晚計時完成（或快進）
    4. 討論階段提前結束
    5. 記錄投票：P3 得 4 票（非大盜）
    6. 確認「大盜不在被投者中」
    7. 驗證結算畫面顯示「大盜陣營勝利」
  - 預期結果: 每個階段 UI 正確切換，結算顯示正確勝利方
  - 優先級: P0 / Integration

- [ ] **CT-I-002** 完整遊戲流程：6 人局，貪睡鼠陣營勝
  - 前置條件: App 已啟動
  - 步驟:
    1. 選擇 6 人局
    2. 角色分配完成（P1 = 大盜，P2 = 共犯）
    3. 夜晚完成
    4. 討論結束
    5. 投票：P1 得 4 票（最多）
    6. 確認「大盜在被投者中」
    7. 驗證結算：「貪睡鼠陣營勝利」，揭露 P1 = 大盜、P2 = 共犯
  - 預期結果: 角色揭露正確，UI 顯示對應勝利動畫
  - 優先級: P0 / Integration

- [ ] **CT-I-003** 離線模式完整遊戲
  - 前置條件: 禁用網路（DIO mock 或 test 環境設定）
  - 步驟:
    1. 建立 4 人局（Hive 本地儲存）
    2. 完整執行 LOBBY → RESULT
    3. 點擊「儲存記錄」
  - 預期結果: 整局可完整進行，儲存記錄寫入本地 Hive，無 Exception
  - 優先級: P0 / Integration

- [ ] **CT-I-004** App 崩潰恢復：夜晚中途重啟後可繼續
  - 前置條件: 夜晚階段進行至號碼 3，模擬 App 重啟
  - 步驟:
    1. 執行遊戲至夜晚號碼 3
    2. 儲存 Hive 快照（模擬崩潰）
    3. 重新初始化 App，載入快照
    4. 驗證恢復對話框顯示「從第 3 號繼續？」
  - 預期結果: 快照正確還原，玩家可選擇從中繼續或重新開始
  - 優先級: P1 / Integration

- [ ] **CT-I-005** 再玩一局流程：結算後重置狀態保留人數設定
  - 前置條件: 一局遊戲已完成結算
  - 步驟:
    1. 結算完成，點擊「再玩一局」
    2. 驗證 phase 回到 `preparing`
    3. 驗證 playerCount 保留（不重設為 4）
    4. 驗證角色卡重新分配
  - 預期結果: 人數設定保留，角色重新洗牌，重新進入角色分配流程
  - 優先級: P1 / Integration

---

## 優先級總覽

### P0（必須，Critical）- 30 個

```
CT-T-001 ~ CT-T-016  (GamePhase 狀態機，16 個)
CT-T-017 ~ CT-T-023  (AssignRolesUseCase，7 個)
CT-T-024 ~ CT-T-029  (CalculateResultUseCase，6 個)
CT-T-031, CT-T-032   (PeekDiceUseCase，2 個)
CT-T-035 ~ CT-T-040  (DesignateAccompliceUseCase，4 個，部分 P0)
CT-T-041 ~ CT-T-044  (SubmitVoteUseCase，4 個)
CT-T-046 ~ CT-T-048  (GameModel 序列化，3 個)
CT-T-051 ~ CT-T-055  (RepositoryImpl，5 個)
CT-T-056 ~ CT-T-059  (LocalDataSource，4 個)
CT-T-060 ~ CT-T-064  (GameStateMachine，5 個)
CT-T-065 ~ CT-T-068  (NightPhaseNotifier 計時，4 個)
CT-T-071 ~ CT-T-075  (VotingNotifier，4 個)
CT-W-001, CT-W-004~CT-W-011 (Widget，部分 P0)
CT-I-001 ~ CT-I-003  (整合，3 個)
```

### P1（重要，Important）- 20 個

```
CT-T-009, CT-T-030, CT-T-033~CT-T-034
CT-T-045, CT-T-049~CT-T-050
CT-T-069 ~ CT-T-070  (NightPhaseNotifier)
CT-T-076 ~ CT-T-077  (DiscussionNotifier)
CT-T-BC04, CT-T-BC11, CT-T-BC15
CT-W-002, CT-W-003, CT-W-012
CT-I-004 ~ CT-I-005
```

### P2（加分，Nice-to-have）- 9 個

```
CT-T-022  (角色隨機性統計驗證)
CT-T-BC03 (骰子全同號說明)
其餘 Widget 視覺細節測試
歷史記錄頁面 Widget 測試
語音 script 內容正確性測試
```

---

## 關鍵測試實作範例

### 範例一：AssignRolesUseCase 4 人局測試

```dart
// test/features/cheese_thief/domain/usecases/assign_roles_usecase_test.dart

group('AssignRolesUseCase', () {
  late AssignRolesUseCase usecase;
  late MockCheeseThiefGameRepository mockRepository;

  setUp(() {
    mockRepository = MockCheeseThiefGameRepository();
    usecase = AssignRolesUseCase(mockRepository);
  });

  group('4 人局', () {
    test('CT-T-017 應分配 1 大盜、0 共犯、3 貪睡鼠', () async {
      // Given
      final game = GameEntityFixture.create4Players();
      when(() => mockRepository.getCurrentGame())
          .thenAnswer((_) async => Right(game));
      when(() => mockRepository.updateGame(any()))
          .thenAnswer((_) async => Right(game));

      // When
      final result = await usecase.execute(gameId: 'test-game-id-4p');

      // Then
      expect(result.isRight(), isTrue);
      final players = result.getOrElse((_) => []);
      expect(players.where((p) => p.role == CheeseThiefRole.thief).length, 1);
      expect(players.where((p) => p.role == CheeseThiefRole.accomplice).length, 0);
      expect(players.where((p) => p.role == CheeseThiefRole.sleepyMouse).length, 3);
    });
  });
});
```

### 範例二：NightPhaseNotifier 計時測試

```dart
// test/features/cheese_thief/presentation/providers/night_phase_notifier_test.dart

group('NightPhaseNotifier', () {
  late MockCheeseThiefVoiceRepository mockVoice;

  setUp(() {
    mockVoice = MockCheeseThiefVoiceRepository();
    when(() => mockVoice.speak(any())).thenAnswer((_) async => const Right(unit));
    when(() => mockVoice.pause()).thenAnswer((_) async => const Right(unit));
    when(() => mockVoice.resume()).thenAnswer((_) async => const Right(unit));
  });

  test('CT-T-066 號碼 1 到 6 依序推進，6 號結束後 isCompleted = true', () {
    fakeAsync((async) {
      final container = ProviderContainer(
        overrides: [
          voiceRepositoryProvider.overrideWithValue(mockVoice),
        ],
      );
      final notifier = container.read(nightPhaseProvider.notifier);

      notifier.startNight(hasAccomplice: false);
      async.elapse(const Duration(seconds: 30));

      expect(container.read(nightPhaseProvider).isCompleted, isTrue);
      expect(container.read(nightPhaseProvider).currentDiceNumber, 7);

      container.dispose();
    });
  });

  test('CT-T-067 暫停時計時停止，remainingSeconds 不變', () {
    fakeAsync((async) {
      final container = ProviderContainer(
        overrides: [
          voiceRepositoryProvider.overrideWithValue(mockVoice),
        ],
      );
      final notifier = container.read(nightPhaseProvider.notifier);

      notifier.startNight(hasAccomplice: false);
      async.elapse(const Duration(seconds: 2));

      notifier.pause();
      final secondsAtPause = container.read(nightPhaseProvider).remainingSeconds;

      async.elapse(const Duration(seconds: 3));

      expect(
        container.read(nightPhaseProvider).remainingSeconds,
        secondsAtPause,
        reason: '暫停後 remainingSeconds 不應改變',
      );
      expect(container.read(nightPhaseProvider).isPaused, isTrue);

      container.dispose();
    });
  });
});
```

### 範例三：GamePhase 狀態機測試

```dart
// test/features/cheese_thief/domain/entities/game_phase_test.dart

void main() {
  group('GamePhase.canTransitionTo', () {
    group('合法轉換', () {
      test('CT-T-001 lobby → preparing', () {
        expect(GamePhase.lobby.canTransitionTo(GamePhase.preparing), isTrue);
      });

      test('CT-T-004 night → nightDone', () {
        expect(GamePhase.night.canTransitionTo(GamePhase.nightDone), isTrue);
      });

      test('CT-T-008 result → lobby（再玩一局）', () {
        expect(GamePhase.result.canTransitionTo(GamePhase.lobby), isTrue);
      });
    });

    group('非法轉換', () {
      test('CT-T-010 lobby → night（跳過中間階段）', () {
        expect(GamePhase.lobby.canTransitionTo(GamePhase.night), isFalse);
      });

      test('CT-T-011 night → lobby（不可倒退）', () {
        expect(GamePhase.night.canTransitionTo(GamePhase.lobby), isFalse);
      });

      test('CT-T-013 voting → lobby（跳過結算）', () {
        expect(GamePhase.voting.canTransitionTo(GamePhase.lobby), isFalse);
      });
    });
  });
}
```

---

## 特別注意事項

### 1. Timer 測試必須使用 fake_async

`NightPhaseNotifier` 使用 `Timer.periodic`，直接使用 `Future.delayed` 等待真實時間會讓測試很慢（5 秒 × 6 號碼 = 30 秒）。必須使用 `fake_async` 套件控制時間。

### 2. 角色分配隨機性驗證策略

`AssignRolesUseCase` 使用 `Random.secure()` 不可 mock，統計驗證（執行 100 次確認大盜非固定座位）是合理策略，但注意 CI 中偶發失敗的風險（可設定 seed 固定隨機數列做確定性測試）。

### 3. Hive 測試隔離

每個測試執行前需清空 Hive box，或使用 in-memory adapter，避免測試間狀態污染：

```dart
setUp(() async {
  Hive.init(Directory.systemTemp.path);
  await Hive.deleteBoxFromDisk('cheese_thief_game');
});
```

### 4. VoiceRepository Mock 的 speak() 回傳

`CheeseThiefVoiceRepository.speak()` 回傳 `Future<Either<Failure, Unit>>`，NightPhaseNotifier 需等待語音播放完成再開始計時，確保 mock 的 `speak()` 立即返回 `Right(unit)` 以加速測試。

### 5. GameStateMachine 非法轉換的 Exception 處理

`transitionTo()` 在非法轉換時拋出 `GameException`，呼叫端（Presentation Layer 的 button tap handler）需使用 `try-catch` 包裹，Widget 測試需驗證錯誤訊息 SnackBar 出現。

### 6. 冪等保護實作建議

Edge Function `save-cheese-thief-result` 的冪等性需在 Supabase SQL 層面保證：

```sql
-- 在 migration 中新增 unique constraint
ALTER TABLE cheese_thief_game_records
ADD CONSTRAINT unique_game_user UNIQUE (game_id, user_id);

-- Repository 使用 upsert（ON CONFLICT DO NOTHING）
INSERT INTO cheese_thief_game_records (...)
ON CONFLICT (game_id, user_id) DO NOTHING;
```

---

**END OF TEST TASK DOCUMENT**

---

| 角色 | 日期 | 狀態 |
|------|------|------|
| Test Generator | 2026-03-10 | Draft |
| Test Engineer | - | Pending Review |
| Tech Lead | - | Pending Approval |
