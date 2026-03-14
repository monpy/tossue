# Responsive UI Specification

サイドパネルのコンパクト・レスポンシブ対応仕様。

## 設計方針

### Fluid Design（ブレークポイントなし）

メディアクエリによるブレークポイントは使用せず、どの幅でも自然に見えるfluidなデザインを採用する。

- **最小対応幅**: 280px（Chrome サイドパネルの最小幅）
- **最大対応幅**: 制限なし（ただし主な使用想定は 300-500px）

### 原則

1. **固定幅を避ける**: `px` 固定値より `%` や `min()`/`max()` を優先
2. **折り返しを許容**: `flex-wrap: wrap` で自然に折り返す
3. **テキスト切り詰め**: 長いテキストは `text-overflow: ellipsis` で省略
4. **最小タップターゲット**: ボタン・リンクは最小 44x44px（WCAG 2.5.5）

## スペーシング

### コンパクト化されたスペーシング

| 要素 | 現状 | 変更後 | UnoCSS |
|------|------|--------|--------|
| `.app-shell` gap | 14px | 12px | `gap-3` |
| `.app-shell` padding | 16px | 12px | `p-3` |
| Card padding (default) | 14px | 12px | `p-3` |
| Card padding (nested) | 12px | 10px | `p-2.5` |
| Card gap | 12px | 10px | `gap-2.5` |
| セクション間 gap | 10px | 8px | `gap-2` |

### フォントサイズ

コンパクト表示でも可読性を維持する最小サイズ：

| 要素 | サイズ | UnoCSS |
|------|--------|--------|
| h1 (アプリ名) | 24px | `text-2xl` |
| h2 (セクション見出し) | 15px | `text-[15px]` |
| h3 (サブセクション) | 13px | `text-[13px]` |
| 本文 | 13px | `text-[13px]` |
| ラベル・補助テキスト | 11px | `text-[11px]` |
| 最小サイズ | 11px | - |

## レイアウトパターン

### フォームグリッド

フォーム用の `.grid` は常に1カラム：

```css
.grid {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
}
```

### Fluid Grid（2カラム表示）

`.split` や `.area-meta-grid` など、2カラム表示が適切な場所のみ `auto-fit` を使用：

```css
.split {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}
```

### ヘッダー行（タイトル + ボタン）

タイトルとボタンが横並びで、狭い時にボタンが縮小：

```css
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0; /* 子要素の shrink を許可 */
}
```

### ボタン行

複数ボタンは `flex-wrap` で自然に折り返す：

```css
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
```

## アクセシビリティ

### フォーカスインジケーター

すべてのインタラクティブ要素に明確なフォーカス表示：

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

ボタンは `:focus-visible` に加えて背景色変化も併用：

```css
button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  background-color: var(--accent-soft);
}
```

### コントラスト比

WCAG AA 準拠（4.5:1 以上）：

| 組み合わせ | コントラスト比 |
|-----------|---------------|
| `--text` on `--bg` | 12.5:1 |
| `--text` on `--surface` | 14.2:1 |
| `--muted` on `--surface` | 5.8:1 |
| `--accent` on white | 4.5:1 |

### タッチターゲット

- 最小サイズ: 44x44px（WCAG 2.5.5 Level AAA）
- アイコンボタン: 28x28px 以上（周囲の余白で44pxを確保）

## 折りたたみセクション

### 使用基準

以下の条件を満たす場合のみ折りたたみを検討：

1. セカンダリな情報である
2. 初期状態で非表示でもユーザーが困らない
3. 折りたたみ/展開の操作が直感的

### 現状の分析

| セクション | 折りたたみ | 理由 |
|-----------|-----------|------|
| Helper Status | 既存 (`<details>`) | 詳細情報はセカンダリ |
| Structured Report | 不要 | 主要な入力エリア |
| Captured Context | 不要 | 頻繁に使用 |
| Timeline | 検討可 | 長くなりがち |
| Markdown Preview | 検討可 | 確認用でセカンダリ |
| Issue Creator | 不要 | 最終アクション |

### 実装方針

現時点では新規の折りたたみは追加しない。`<details>` による折りたたみは既存の Helper Status のみとする。

将来的に Timeline が長くなりすぎる場合は、折りたたみより `max-height` + スクロールで対応（現状実装済み）。

## 移行対象

### global.css の変更

| セレクタ | 変更内容 |
|---------|---------|
| `.app-shell` | gap: 14px → 12px, padding: 16px → 12px |
| `h1` | font-size: 28px → 24px |
| `h2` | font-size: 16px → 15px |
| `h3` | font-size: 14px → 13px |
| `.grid` | `repeat(2, ...)` → `1fr`（常に1カラム） |
| 新規 | `:focus-visible` スタイル追加 |

### Card コンポーネント

| variant | 変更内容 |
|---------|---------|
| default | p-3.5 → p-3, gap-3 → gap-2.5 |
| nested | p-3 → p-2.5 |

## 参考

- [WCAG 2.2 Success Criterion 2.5.5: Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)
- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
