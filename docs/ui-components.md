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
```

## Card コンポーネント

### バリアント

| バリアント | 用途 | UnoCSS クラス |
|-----------|------|---------------|
| `default` | セクションコンテナ | `bg-surface/92 rounded-[14px] shadow-[0_8px_30px_rgba(62,42,18,0.06)]` |
| `nested` | カード内のサブセクション | `bg-surface-strong/68 rounded-xl shadow-none` |

### 共通スタイル

```
grid gap-3 p-3.5 border border-border
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

## CSS 削除対象

コンポーネント移行後、`global.css` から以下のスタイルを削除する：

- `button` 基本スタイル（456-464行目）
- `button.secondary`（466-469行目）
- `button.icon-only`（471-477行目）
- `button:disabled`（479-482行目）
- `.card`（81-89行目）
- `.capture-tool-card`（192-199行目）
