# Styling Guide

スタイリングの方針と UnoCSS の使用ガイドライン。

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| CSS Framework | UnoCSS | ^66.0 |
| Preset | @unocss/preset-wind4 | - |
| Vite Integration | @unocss/vite | - |

## UnoCSS 設定

### Why UnoCSS

- **超高速**: Tailwind JIT より 5倍速い（パース・AST なし、オンデマンド生成）
- **軽量**: 使用したクラスのみ出力、バンドルサイズ最小
- **Vite ネイティブ統合**: HMR が高速
- **Tailwind 互換**: `@unocss/preset-wind4` で Tailwind の知識をそのまま活用可能

### Theme Configuration

既存の CSS 変数をテーマとして統合:

```ts
// uno.config.ts
import { defineConfig, presetWind4 } from "unocss";

export default defineConfig({
  presets: [presetWind4()],
  theme: {
    colors: {
      bg: "var(--bg)",
      surface: "var(--surface)",
      "surface-strong": "var(--surface-strong)",
      border: "var(--border)",
      text: "var(--text)",
      muted: "var(--muted)",
      accent: "var(--accent)",
      "accent-soft": "var(--accent-soft)",
    },
  },
});
```

### CSS Variables (Design Tokens)

既存の CSS 変数は `global.css` で定義し、UnoCSS テーマから参照:

```css
:root {
  --bg: #f5f1e8;
  --surface: #fffcf6;
  --surface-strong: #fff7ea;
  --border: #d7c9af;
  --text: #1b1a17;
  --muted: #5b564d;
  --accent: #bb5a1d;
  --accent-soft: #f3d7bf;
}
```

## Usage Guidelines

### 新規コンポーネント

新規コンポーネントでは UnoCSS のユーティリティクラスを使用:

```tsx
// Good: UnoCSS utility classes
<div class="flex items-center gap-2 p-4 bg-surface rounded-xl border border-border">
  <span class="text-sm font-bold text-muted">Label</span>
</div>
```

### 既存コンポーネント

既存の `global.css` スタイルは段階的に移行:

1. 新機能追加時に関連する部分を UnoCSS 化
2. 一度に全置換せず、コンポーネント単位で移行
3. 既存クラスと UnoCSS クラスの併用を許容

### 動的クラス

条件付きクラスは従来通り文字列連結またはテンプレートリテラルを使用:

```tsx
<button
  class={`px-3 py-2 rounded-full ${isActive ? "bg-accent text-white" : "bg-accent-soft text-text"}`}
>
  Button
</button>
```

## File Structure

```
packages/extension/src/
├── styles/
│   └── global.css       # CSS variables + remaining legacy styles
└── uno.config.ts        # UnoCSS configuration
```

## Migration Strategy

### Phase 1: Setup (この Issue)
- UnoCSS + preset-wind4 のインストール
- Vite プラグイン設定
- テーマ設定（既存 CSS 変数の統合）

### Phase 2: Gradual Adoption
- 新規コンポーネントで UnoCSS を使用
- 既存コンポーネントの修正時に段階的に移行

### Phase 3: Full Migration (将来)
- 全コンポーネントの UnoCSS 化完了
- `global.css` を CSS 変数定義のみに縮小

## Notes

- 既存の `global.css` は削除せず、CSS 変数定義として保持
- BEM 風クラス名から utility-first への移行は段階的に実施
- IDE 補完のため `@unocss/eslint-config` の導入を検討
