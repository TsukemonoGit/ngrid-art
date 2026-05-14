# Nostrデータ取得の修正設計

## 現在の実装の問題点

### 現在のデータ構造

| ストア | 内容 | 更新タイミング |
|--------|------|----------------|
| `kind30030Stock` | 自分の10030に登録済みの30030（atag単位で最新） | 未来受信＋フェッチ時 |
| `latestEmojisFromOthers` | 自分の10030に登録していない30030（atag単位で最新） | 未来受信＋フェッチ時 |
| `mySets`（my-setsページ内） | **ローカル$state**、自分の30030全件 | ページ遷移時のみ全件フェッチ |
| `subscriptionStartTime` | 過去のフェッチの起点時刻 | emoji-setsページでのページネーション用 |

### 問題点

1. **`my-sets`ページのみ別パス**: `fetchAllKind30030FromPubkey`で全件フェッチしており、`subscriptionStartTime`を使わない
2. **`mySets`がローカル**: グローバルストアにないので、未来受信で自分の30030が来ても更新されない
3. **`subscriptionStartTime`の共有問題**:
   - emoji-setsページで「もっと読む」すると`subscriptionStartTime`が更新される
   - my-setsページで同じ`subscriptionStartTime`を使うと、other側のデータとずれる
   - つまり両方が同じtimerで進んでしまうと、重複取得したり見逃したりする

## 修正後の設計

### 1. グローバルな`mySets`ストアの追加

```typescript
// myが所有する30030を全件保持（atag単位で最新）
export const mySets = createGlobalState<EmojiSetEventMap>(new SvelteMap());
```

### 2. 未来受信のロジック変更

kind 30030を受信したとき：

```
if (event.pubkey === loginUser.value) {
  // mySetsに必ず保存（グローバル）
  mySets.atag.update_or_insert(event);

  // さらに既存の分けも更新（重複可）
  if (自分の10030に登録してある) {
    kind30030Stockに保存;
  } else {
    latestEmojisFromOthersに保存;
  }
} else {
  // 他人のデータ
  latestEmojisFromOthersに保存;
}
```

**ポイント**: 自分の30030は、mySets **にも** 保存される（my, otherの両方に入る場合がある）

### 3. subscriptionStartTimeの分離

```typescript
// 分離前
export const subscriptionStartTime = createGlobalState<number>(現在時刻);

// 分離後
export const subscriptionStartTimeMy = createGlobalState<number>(現在時刻);
export const subscriptionStartTimeOthers = createGlobalState<number>(現在時刻);
```

- 初期値はどちらも同じ（現在時刻）のコピー
- **my-setsページ**で過去読み込み时：`subscriptionStartTimeMy`を更新
- **emoji-setsページ**で過去読み込み时：`subscriptionStartTimeOthers`を更新
- 互いに干渉しない

### 4. my-setsページの修正

```typescript
// 修正前（全件フェッチ、ローカル状態）
const events = await fetchAllKind30030FromPubkey(pubhex);
mySets = events.map(...); // ローカル$state

// 修正後（subscriptionStartTimeMyを使ってフェッチ、グローバルストアに保存）
const events = await fetchAllKind30030FromPubkey(pubhex, {
  until: subscriptionStartTimeMy.value
});
// イベントごとにmySetsに保存
for (const event of events) {
  const atag = `30030:${event.pubkey}:${dtag}`;
  mySets.value.set(atag, toEmojiSetEvent(event));
}
// タイムスタンプ更新
subscriptionStartTimeMy.value = events[events.length - 1].created_at;
```

## 期待される動作

1. **初回アクセス（emoji-sets）**: `subscriptionStartTimeOthers`を使って過去200件取得 → `latestEmojisFromOthers` + `kind30030Stock`に保存
2. **初回アクセス（my-sets）**: `subscriptionStartTimeMy`を使って過去全件取得 → `mySets`に保存
3. **未来受信（自分の30030）**: `mySets` + (`kind30030Stock` or `latestEmojisFromOthers`) に保存
4. **未来受信（他人の30030）**: `latestEmojisFromOthers`に保存
5. **ページネーション**: 各ページが各自的な`subscriptionStartTime`を使うので干渉しない
6. **両ページ共通のデータ**: 自分の10030登録済みの30030は、`mySets` + `kind30030Stock`の両方に入る

## 利点

- ✅ 自分の30030はfuture受信でも確実に`mySets`に保存される
- ✅ my-setsページでも`subscriptionStartTime`を使うので、全件フェッチではなく効率的
- ✅ 両ページが独立したtimerでページネーション、干渉しない
- ✅ データの重複保存は許容（mySetsとkind30030Stockに重複しても問題ない）
