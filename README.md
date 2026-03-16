# Tossue

A Chrome extension that captures structured debugging context from your browser and creates GitHub issues that both humans and AI can work with effectively.

ブラウザ上で発生した不具合を、構造化されたコンテキストとともに GitHub Issue として記録できる Chrome 拡張機能です。AI と人間の両方が扱いやすいバグレポートを生成します。

---

**[English](#features)** | **[日本語](#主な機能)**

---

## Features

- **Area Selection** — Click to select target elements on the page, automatically collecting DOM information
- **Auto-collected Debug Context** — Automatically captures console errors, network errors, and user action logs
- **Component Detection** — Automatically detects React/Next.js and Vue 3/Nuxt 3 component hierarchies
- **GitHub Issue Creation** — Generates structured Markdown from collected data and creates issues directly
- **Label Management** — Fetches repository labels and attaches them to issues
- **Helper App Integration** — Securely communicates with GitHub API via local Tauri app

## Installation

### Chrome Web Store (Coming Soon)

> Currently in preparation. Link will be available after release.

### Manual Installation (Developer Mode)

```bash
git clone https://github.com/monpy/tossue.git
cd tossue
npm install
npm run build:extension
```

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `packages/extension/dist` directory

## Quick Start

1. **Open Side Panel** — Click the Tossue icon in the toolbar
2. **Select Repository** — Choose the repository for the issue
3. **Enter Bug Info** — Fill in title, summary, and expected behavior
4. **Select Area** (optional) — Click `Select Area` and select the target element on the page
5. **Review Preview** — Check the generated Markdown
6. **Create Issue** — Click the `Create Issue` button

---

## 主な機能

- **エリア選択** — ページ上の対象要素をクリックで選択し、DOM 情報を自動収集
- **デバッグコンテキスト自動収集** — Console エラー、Network エラー、ユーザー操作ログを自動キャプチャ
- **コンポーネント検出** — React/Next.js、Vue 3/Nuxt 3 のコンポーネント階層を自動取得
- **GitHub Issue 作成** — 収集した情報から構造化された Markdown を生成し、Issue を直接作成
- **ラベル管理** — リポジトリのラベルを取得し、Issue にラベルを付与
- **Helper アプリ連携** — ローカルの Tauri アプリ経由で GitHub API と安全に通信

## インストール

### Chrome Web Store（公開後）

> 現在準備中です。公開後にリンクを掲載します。

### 開発者モードでの手動インストール

```bash
git clone https://github.com/monpy/tossue.git
cd tossue
npm install
npm run build:extension
```

1. Chrome で `chrome://extensions` を開く
2. **デベロッパーモード** を有効化（右上のトグル）
3. **パッケージ化されていない拡張機能を読み込む** をクリック
4. `packages/extension/dist` ディレクトリを選択

## 使い方

1. **サイドパネルを開く** — ツールバーの Tossue アイコンをクリック
2. **リポジトリを選択** — Issue を作成するリポジトリを選択
3. **バグ情報を入力** — タイトル、概要、期待される動作を入力
4. **エリア選択**（任意）— `Select Area` をクリックし、ページ上の対象要素を選択
5. **プレビュー確認** — 生成された Markdown を確認
6. **Issue 作成** — `Create Issue` ボタンをクリック

## 開発者向け情報

### 前提条件

- Node.js v18 以上
- npm v9 以上
- Rust ツールチェーン（Helper アプリをビルドする場合）

### セットアップ

```bash
git clone https://github.com/monpy/tossue.git
cd tossue
npm install
```

### 開発コマンド

```bash
# Chrome 拡張機能（HMR 付き）
npm run dev:extension

# Helper アプリ（Tauri）
npm run dev:helper

# 型チェック
npm run typecheck:extension

# プロダクションビルド
npm run build:extension
npm run build:helper
```

### パッケージ構成

```
packages/
├── extension/          # Chrome 拡張機能（Preact + Vite + TypeScript）
├── helper/             # Tauri Helper アプリ（Rust）
├── oauth-worker/       # Cloudflare Worker（OAuth2 フロー）
├── custom-api-demo/    # カスタム API デモサーバー
└── demo-sites/         # テスト用デモサイト
    ├── nuxt/           #   Nuxt 3（Vue 3）
    └── next/           #   Next.js 15（React 19）
```

### 技術スタック

| コンポーネント | 技術 |
|------------|------|
| Extension UI | Preact + @preact/signals |
| スタイリング | UnoCSS |
| ビルド | Vite + @crxjs/vite-plugin |
| Helper | Tauri (Rust + Axum) |
| OAuth | Cloudflare Workers |
| 型システム | TypeScript |

詳細は [docs/](./docs/) ディレクトリを参照してください。

## ドキュメント

- [プロダクト概要](./docs/product-overview.md)
- [拡張機能アーキテクチャ](./docs/extension-architecture.md)
- [ビルドと配布](./docs/development.md)
- [手動テスト](./docs/manual-testing.md)
- [リリースプロセス](./docs/release-process.md)
- [コントリビューション](./docs/contributing.md)

## ライセンス / License

[MIT License](./LICENSE)
