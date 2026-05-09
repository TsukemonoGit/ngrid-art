# NOSTR メモ（UI着手前）

## いま実装済み

- `10002` 初期取得 -> デフォルトリレー反映
- `10030` 初期取得
- `30030` 不足分 backfill
- `30030` 受信時の再反映で `palette` 再構築
- `palette` localStorage 保存/復元
- 同一 shortcode 衝突回避（重複時のみ `_hash4`、さらに衝突なら `_2`, `_3`）
- `Stray` セクション（10030 直下 `emoji` タグ）

## 関数と役割

- `fetchLatestKind10030(pubkey)`
  - 自分の最新 `kind:10030` を 1 件取得

- `fetchMissingKind30030IntoStock(filters)`
  - 10030 の `a` タグに対して不足分だけ `kind:30030` を backward 取得
  - `kind30030Stock` を更新

- `fetchAllKind30030FromOthers(filters)`
  - みんなの `kind:30030` を収集
  - 自分の pubkey は除外
  - `latestEmojisFromOthers` を更新

- `syncPaletteFromKind10030(k, { backfillMissing })`
  - `10030 + 30030` から `palette` を再構築
  - `backfillMissing: true` なら不足 30030 も取得

- `addKind30030ToMyKind10030(atag)`
  - 自分の 10030 の `a` タグに追加して publish

- `removeKind30030FromMyKind10030(atag)`
  - 自分の 10030 の `a` タグから削除して publish

- `createMyKind10030IfMissing()`
  - 自分の 10030 未所持時のみ新規作成して再取得

## 安全チェック

- 10030 の `a` タグを publish 更新する前に、
  - 構成元 `kind10030.value.pubkey` と `loginUser.value` の一致を必須チェック

## UI 未着手メモ

- 10030 未所持ユーザー向けに「Create My Emoji List」ボタンを表示
- みんなの 30030 一覧で「追加 / 削除」ボタンから上記関数を呼ぶ

## ほかの関数メモ（UI以外も含む）

### rx-nostr.ts

- `setForwardFilters(filters)`
  - forward購読のフィルタを更新

- `publishEvent(event)`
  - イベントpublishの共通関数

- `setDefaultRelaysfrom10002(pubkey)`
  - kind10002を1件取得してデフォルトリレー反映

- `getCurrentKind10030ATags()`
  - 現在の kind10030 から `a` タグ一覧を取得

### syncPaletteFromKind10030.ts

- `syncPaletteFromKind10030(k, { backfillMissing })`
  - 10030 + 30030 から palette を再構築
  - backfill有無を切り替え可能
    - 10030受信によるパレットの更新 → 30030フェッチが必要になる可能性有
    - 30030受信によるパレットの更新 → フェッチいらないよ

### utils.ts

- `isReplaceableEventSpecifier(value)`
  - `30030:pubkey:d` 形式か判定

- `eventToAtag(event)`
  - Event から atag (`kind:pubkey:d`) を生成

- `toPubhex(pubkey)`
  - npub / nprofile / pubhex を pubhex に正規化

### globalRunes.svelte.ts

- `createGlobalState(initialValue, storageKey?)`
  - グローバルstate作成
  - storageKey指定時は localStorage 復元/保存を自動化

## localStorage 管理データまとめ

### 保存されるストア（storageKeyあり）

- `kind10002` -> key: `art:kind10002`
- `kind10030` -> key: `art:kind10030`
- `grid` -> key: `art:grid`
- `palette` -> key: `art:palette`

### 保存されないストア（storageKeyなし）

- `kind30030Stock`（SvelteMap）
- `latestEmojisFromOthers`（SvelteMap）
- `subscriptionStartTime`
- `loginUser`

### 保存仕様メモ

- `createGlobalState` は初回 get/set 時に localStorage から lazy hydrate
- `set value` 時に JSON 保存
- `value === null` の場合は対応する key を削除
- `SvelteMap` は JSON 化できないため storageKey なしで運用
