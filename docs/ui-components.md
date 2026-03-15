# UI Components Specification

共通UIコンポーネントの仕様を定義する。

## 概要

サイドパネル全体で一貫したデザインシステムを構築するため、`Button` と `Card` を共通コンポーネントとして提供する。スタイリングには UnoCSS ユーティリティを使用する。

## デザイントークン

`packages/extension/uno.config.ts` で定義されたテーマカラーを使用する：

| UnoCSS Class | CSS Variable | 用途 |
|--------------|--------------|------|
| `bg-bg` | `--bg` | ページ背景 |
| `bg-surface` | `--surface` | カード・入力欄背景 |
| `bg-surface-strong` | `--surface-strong` | 強調サーフェス |
| `border-border` | `--border` | ボーダー色 |
| `text-text` | `--text` | 主要テキスト |
| `text-muted` | `--muted` | 補助テキスト |
| `bg-accent` | `--accent` | プライマリアクション |
| `bg-accent-soft` | `--accent-soft` | セカンダリアクション背景 |

## Button コンポーネント

### バリアント

| バリアント | 用途 | UnoCSS クラス |
|-----------|------|---------------|
| `primary` | 主要アクション（Create Issue） | `bg-accent text-white` |
| `secondary` | 副次的アクション（Refresh） | `bg-accent-soft text-text` |
| `ghost` | 控えめなアクション（Undo, Delete） | `bg-transparent hover:bg-black/8` |

### サイズ

| サイズ | 用途 | UnoCSS クラス |
|-------|------|---------------|
| `md`（デフォルト） | 標準ボタン | `px-3.5 py-2.5` |
| `sm` | コンパクトなボタン | `px-2.5 py-1.5 text-xs` |

### アイコンボタン

`iconOnly` プロパティで正方形のアイコンボタンになる。

| サイズ | UnoCSS クラス |
|-------|---------------|
| `md` | `w-7 h-7 p-0` |
| `sm` | `w-5.5 h-5.5 p-0` |

### アクティブ状態

`active` プロパティでボタンが操作中であることを視覚的に示す。キャプチャツールの「Selecting...」「Capturing...」状態などで使用する。

| バリアント | アクティブ時 UnoCSS クラス |
|-----------|---------------------------|
| `secondary` | `ring-2 ring-accent ring-inset` |

アクティブ状態は `secondary` バリアントでのみ使用する想定。

### 共通スタイル

```
border-0 rounded-full cursor-pointer font-bold disabled:opacity-50 disabled:cursor-default
```

### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  iconOnly?: boolean;
  active?: boolean;
  disabled?: boolean;
  children: ComponentChildren;
  onClick?: () => void;
  type?: 'button' | 'submit';
  id?: string;
  class?: string;
  'aria-label'?: string;
}
```

### 使用例

```tsx
// Primary button (default)
<Button onClick={handleCreate}>Create Issue</Button>

// Secondary button
<Button variant="secondary" onClick={handleRefresh}>Refresh</Button>

// Ghost icon button
<Button variant="ghost" iconOnly aria-label="Undo" onClick={handleUndo}>←</Button>

// Small secondary button
<Button variant="secondary" size="sm" onClick={handleAdd}>Add</Button>

// Active state (e.g., during capture)
<Button variant="secondary" active>Selecting...</Button>
```

## Card コンポーネント

### バリアント

| バリアント | 用途 | UnoCSS クラス |
|-----------|------|---------------|
| `default` | セクションコンテナ | `p-3 bg-surface/92 rounded-[14px] shadow-[0_8px_30px_rgba(62,42,18,0.06)]` |
| `nested` | カード内のサブセクション | `p-2.5 bg-surface-strong/68 rounded-xl shadow-none` |

### 共通スタイル

```
grid gap-2.5 border border-border
```

### Props

```typescript
interface CardProps {
  variant?: 'default' | 'nested';
  children: ComponentChildren;
  class?: string;
}
```

### 使用例

```tsx
// Default card for sections
<Card>
  <div class="flex items-center justify-between gap-2">
    <h2>Structured Report</h2>
  </div>
  <div class="grid gap-2.5 grid-cols-2">
    {/* content */}
  </div>
</Card>

// Nested card within a section
<Card variant="nested">
  <h3>Screenshot</h3>
  <Button variant="secondary">Capture</Button>
</Card>
```

## 移行方針

### 現状のボタン実装

| 現在のパターン | 移行後 |
|---------------|--------|
| `<button>` | `<Button>` |
| `<button class="secondary">` | `<Button variant="secondary">` |
| `<button class="secondary icon-only">` | `<Button variant="secondary" iconOnly>` |
| `<button class="action-icon-button">` | `<Button variant="ghost" size="sm" iconOnly>` |

### 移行対象外

- `.label-chip`: トグルボタンとして独自の振る舞いがあるため、別途 `Chip` コンポーネントとして検討
- `.action-cutline`: 特殊なレイアウト要件があるため現状維持
- `.preview-close`: オーバーレイ用の特殊配置のため現状維持

### 現状のカード実装

| 現在のパターン | 移行後 |
|---------------|--------|
| `<section class="card">` | `<Card>` |
| `<section class="capture-tool-card">` | `<Card variant="nested">` |

## ファイル構成

```
packages/extension/src/sidepanel/components/
├── ui/
│   ├── Button.tsx
│   └── Card.tsx
```

スタイルは各コンポーネント内で UnoCSS ユーティリティクラスとして定義する（CSS Modules は使用しない）。

## MediaGrid コンポーネント

複数のスクリーンショット・録画を表示するためのグリッドコンポーネント。

### 概要

キャプチャツールで取得した画像・動画を無制限に追加できる。各メディアは小さなサムネイルとして表示され、個別に削除可能。

### データ構造

```typescript
type MediaItem = {
  id: string;
  type: 'image' | 'video';
  dataUrl: string;  // image: base64 data URL, video: blob object URL
  capturedAt: number;
};
```

### Props

```typescript
interface MediaGridProps {
  items: MediaItem[];
  onRemove: (id: string) => void;
}
```

### レイアウト

| プロパティ | UnoCSS クラス |
|-----------|---------------|
| グリッドコンテナ | `grid grid-cols-3 gap-2` |
| サムネイルラッパー | `relative aspect-video rounded-lg overflow-hidden bg-surface-strong` |
| 削除ボタン | `absolute top-1 right-1` （`Button variant="ghost" size="sm" iconOnly`） |
| サムネイル画像/動画 | `w-full h-full object-cover` |

### 動作

- サムネイルクリックで拡大プレビュー（将来実装）
- 削除ボタンクリックで該当メディアを削除
- 空の場合はグリッドを非表示

### 使用例

```tsx
<MediaGrid
  items={mediaItems}
  onRemove={(id) => removeMedia(id)}
/>
```

## LabelSelector コンポーネント

ラベル選択UIを提供するコンポーネント。リポジトリから取得したラベルとカスタムラベルの両方をサポートする。

### 概要

- リポジトリ未選択時はラベル選択を無効化し、リポジトリ選択を促す
- リポジトリ選択後は、そのリポジトリのラベル一覧を取得して選択肢として表示
- カスタムラベルも追加可能

### データ構造

```typescript
type RepositoryLabel = {
  name: string;
  color: string;       // 6桁の16進数カラーコード（# なし）
  description?: string;
};
```

### 状態管理

```typescript
// リポジトリから取得したラベル一覧
const repositoryLabels = signal<RepositoryLabel[]>([]);

// 選択中のラベル名
const selectedLabels = signal<Set<string>>(new Set());

// ラベル取得中フラグ
const isLoadingLabels = signal<boolean>(false);
```

### UI 状態

| 状態 | 表示内容 |
|-----|---------|
| リポジトリ未選択 | 「Select a repository first」メッセージを表示、ラベルチップは非表示 |
| ラベル取得中 | ローディング表示 |
| ラベル取得完了 | リポジトリラベル一覧 + カスタムラベル入力欄を表示 |
| ラベル取得失敗 | エラーメッセージ + カスタムラベル入力欄のみ表示 |

### LabelChip コンポーネント

ラベルを表示するチップコンポーネント。

#### バリアント

| 状態 | スタイル |
|-----|---------|
| 未選択 | 白背景、ラベル色の左ボーダー |
| 選択中 | ラベル色の背景（透明度付き）、チェックマーク表示 |

#### UnoCSS クラス

```
// 共通
inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer text-sm font-medium transition-colors

// 未選択
bg-surface border-border

// 選択中
border-transparent
```

#### 動的スタイル

ラベルの色は GitHub から取得した `color` を使用：

```tsx
// 未選択時：左ボーダーにラベル色
style={{ borderLeftColor: `#${label.color}`, borderLeftWidth: '3px' }}

// 選択時：背景にラベル色（透明度付き）
style={{ backgroundColor: `#${label.color}20`, color: getContrastColor(label.color) }}
```

#### チェックマーク

選択中のラベルには先頭にチェックマーク（✓）を表示：

```tsx
{selected && <span class="text-xs">✓</span>}
<span>{label.name}</span>
```

### カスタムラベル追加

リポジトリに存在しないラベルを追加できる。

#### UI構成

```tsx
<div class="flex gap-2">
  <input
    type="text"
    placeholder="Add custom label..."
    class="flex-1 px-3 py-1.5 rounded-full border border-border bg-surface text-sm"
  />
  <Button variant="secondary" size="sm" disabled={!inputValue}>
    Add
  </Button>
</div>
```

#### 動作

1. 入力欄にラベル名を入力
2. 「Add」ボタンをクリック または Enter キーで追加
3. 追加されたラベルは自動的に選択状態になる
4. カスタムラベルはグレー色（`#666666`）で表示

### Props

```typescript
interface LabelSelectorProps {
  repo: string;  // 選択中のリポジトリ（owner/repo 形式）
}
```

### 使用例

```tsx
<LabelSelector repo={currentRepo} />
```

### リポジトリラベル取得

リポジトリが選択されたタイミングで、Helper API 経由でラベル一覧を取得する。

#### API エンドポイント

```
GET /github/repos/:owner/:repo/labels
```

#### レスポンス

```json
{
  "labels": [
    { "name": "bug", "color": "d73a4a", "description": "Something isn't working" },
    { "name": "enhancement", "color": "a2eeef", "description": "New feature or request" }
  ]
}
```

#### エラーハンドリング

- Helper 未接続時：カスタムラベルのみ利用可能
- API エラー時：エラーメッセージ表示 + カスタムラベルのみ利用可能

## CSS 削除対象

コンポーネント移行後、`global.css` から以下のスタイルを削除する：

- `button` 基本スタイル（456-464行目）
- `button.secondary`（466-469行目）
- `button.icon-only`（471-477行目）
- `button:disabled`（479-482行目）
- `.card`（81-89行目）
- `.capture-tool-card`（192-199行目）
- `.label-chip` 関連スタイル（374-410行目）
