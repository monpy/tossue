# 監視対象タブ表示機能

## 概要

サイドパネルで現在監視しているタブを明示的に表示し、必要に応じて切り替えられるようにする。

## 背景・動機

- 現状、サイドパネルを開いた時点のタブが固定されるが、どのタブが対象か表示されていない
- タブを切り替えると、対象も切り替わったと誤解しやすい
- 意図せず別タブに対して操作してしまう可能性がある

## 機能仕様

### 1. 監視対象タブ情報の表示

サイドパネルのヘッダー下部に、現在の監視対象タブ情報をコンパクトに表示する。

#### 表示内容

| 項目 | 表示形式 | 例 |
|------|---------|-----|
| タイトル | 最大30文字（超過時は truncate） | `Example Page Title...` |
| URL | ホスト名のみ | `example.com` |

#### レイアウト

```
┌─────────────────────────────────────────┐
│  AI-ready issue composer                │
│  Tossue                      [Refresh]  │
├─────────────────────────────────────────┤
│  📍 Example Page Title...               │
│     example.com            [Switch Tab] │
└─────────────────────────────────────────┘
```

### 2. タブ切り替え機能

「Switch Tab」ボタンにより、監視対象を現在アクティブなタブに切り替える。

#### 動作フロー

1. ユーザーが「Switch Tab」ボタンをクリック
2. 現在のブラウザでアクティブなタブを取得
3. 監視対象タブを新しいタブに更新
4. 収集済み状態（actions, console, network, selectedArea 等）をリセット
5. UI を更新して新しいタブ情報を表示

### 3. 視覚的警告

監視対象タブと現在のアクティブタブが異なる場合、視覚的に区別できるようにする。

#### 警告表示の条件

- 監視対象タブ ID ≠ 現在のアクティブタブ ID

#### 警告スタイル

- 軽い警告色の背景（`bg-yellow-50` または同等）
- 注意アイコン（⚠）の表示
- ツールチップ: 「監視対象は別のタブです」

## データ構造

### 監視対象タブ情報

```typescript
type WatchedTabInfo = {
  id: number;
  title: string;
  url: string;
};
```

### シグナル追加

```typescript
// 監視対象タブの情報
export const watchedTabInfo = signal<WatchedTabInfo | null>(null);

// 現在のアクティブタブと監視対象タブが異なるかどうか
export const isWatchingDifferentTab = computed(() => {
  // chrome.tabs API で現在のアクティブタブを監視
  // watchedTabInfo.value?.id !== currentActiveTabId
});
```

## UI コンポーネント

### WatchedTabIndicator

監視対象タブの情報と切り替えボタンを表示するコンポーネント。

#### ファイル配置

```
packages/extension/src/sidepanel/components/
└── WatchedTabIndicator.tsx
```

#### Props

```typescript
interface WatchedTabIndicatorProps {
  // props なし（シグナルから状態を取得）
}
```

#### UnoCSS クラス

| 要素 | クラス |
|------|--------|
| コンテナ | `flex items-center justify-between gap-2 px-3 py-2 bg-surface rounded-lg border border-border` |
| 警告時コンテナ | `bg-yellow-50 border-yellow-200` |
| タブ情報 | `flex-1 min-w-0` |
| タイトル | `text-sm font-medium text-text truncate` |
| URL | `text-xs text-muted truncate` |
| 切り替えボタン | `Button variant="secondary" size="sm"` |

## 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `signals.ts` | `watchedTabInfo` シグナル追加 |
| `useTabState.ts` | タブ情報の取得・更新ロジック追加 |
| `WatchedTabIndicator.tsx` | 新規コンポーネント作成 |
| `App.tsx` | `WatchedTabIndicator` の配置 |

## 関連 Issue

- GitHub Issue #40
