# ビルドと配布方法のドキュメント

このドキュメントは、Tossue Chrome 拡張機能の開発環境セットアップからプロダクション配布までの全プロセスを説明します。

## 1. 開発環境セットアップ

### 前提条件

- **Node.js**: v18 以上（最新の LTS バージョンを推奨）
- **npm**: v9 以上
- **Rust ツールチェーン**: Helper アプリ（オプション）をビルドする場合に必要
- **Git**: リポジトリのクローンに必要

### Git リポジトリのクローン

```bash
# リポジトリをクローン
git clone https://github.com/monpy/tossue.git
cd tossue
```

### npm 依存関係のインストール

このプロジェクトは npm workspaces を使用したモノレポです。すべてのワークスペース依存関係が自動的にインストールされます。

```bash
# ルートディレクトリから実行
npm install
```

これにより以下のパッケージが自動的にセットアップされます：
- `packages/extension` - Chrome 拡張機能
- `packages/helper` - Helper アプリ（Tauri ベース）
- `packages/oauth-worker` - OAuth ワーカー
- `packages/demo-sites/*` - デモサイト（Nuxt と Next.js）

### ファイアウォールとネットワーク設定

Helper アプリがローカルホストで API を公開する場合、以下のポートが必要です：

| ポート | 用途 |
|--------|------|
| 5173 | Extension 開発サーバー（Vite HMR） |
| 47321 | Helper アプリ API |
| 3000 | Nuxt デモサイト |
| 3001 | Next.js デモサイト |

## 2. 開発モードでの実行

### Chrome 拡張機能の開発

#### Hot Module Replacement（HMR）付きで実行

最速の開発体験を得るため、HMR が有効な開発モードを使用します。

```bash
npm run dev:extension
```

このコマンドは以下を行います：
- Vite 開発サーバーを起動（ポート 5173）
- サイドパネルとデバッグツールパネルのホットリロード設定
- マニフェストの自動処理とローカル開発用の設定

#### Chrome への拡張機能の読み込み

開発モードが起動したら、Chrome で拡張機能を読み込みます：

1. Chrome で `chrome://extensions` を開く
2. **デベロッパーモード** を有効化（右上の切り替えボタン）
3. **パッケージ化されていない拡張機能を読み込む** をクリック
4. `packages/extension/dist` ディレクトリを選択

拡張機能がロードされます。Tossue アイコンがブラウザのツールバーに表示されることを確認してください。

#### 開発時の動作確認

HMR 開発モードでは以下のファイルの変更が自動的に反映されます：

- **サイドパネル** (`src/sidepanel/`) - 自動リロード
- **デバッグツールパネル** (`src/devtools/`) - 自動リロード

以下の変更には手動での拡張機能リロードが必要です：

- **バックグラウンドサービスワーカー** (`src/background/`)
- **コンテンツスクリプト** (`src/content/`)
- **マニフェスト** (`manifest.json`)

手動リロード方法：
1. `chrome://extensions` を開く
2. Tossue の拡張機能カードで **再読み込みボタン** をクリック

### Helper アプリの開発

Helper アプリは GitHub CLI を使用して Issue を作成するための Tauri ベースのローカルアプリケーションです。

#### 前提条件

Helper アプリを開発する場合は、Rust ツールチェーンが必要です：

```bash
# macOS / Linux（Homebrew 使用）
brew install rust

# または、rustup を使用
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

また、GitHub CLI がインストールされ、認証済みである必要があります：

```bash
# GitHub CLI のインストール
brew install gh  # macOS
# または apt/dnf など各パッケージマネージャ

# GitHub アカウントで認証
gh auth login
```

#### 開発モードでの実行

```bash
npm run dev:helper
```

このコマンドは以下を行います：
- Tauri 開発サーバーを起動
- Helper アプリケーションのウィンドウを開く
- API サーバーを `localhost:47321` で起動

#### API エンドポイント

Helper アプリが提供する API エンドポイント：

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/github/status` | GitHub CLI ステータス |
| GET | `/github/repositories` | ユーザーのリポジトリ一覧 |
| GET | `/github/repos/:owner/:repo/labels` | リポジトリのラベル一覧 |
| POST | `/issues` | Issue の作成 |

詳細は [packages/helper/README.md](../packages/helper/README.md) を参照してください。

### デモサイトの実行

デモサイトは拡張機能の機能テストに使用します。

#### Nuxt 3 デモサイト（Vue 3）

```bash
npm run dev:demo:nuxt
```

http://localhost:3000 でアクセス可能

テスト可能な機能：
- Network エラーシミュレーション（500/404）
- Console エラーキャプチャ
- Runtime 例外キャプチャ
- Vue コンポーネント検出

#### Next.js デモサイト（React 19）

```bash
npm run dev:demo:next
```

http://localhost:3001 でアクセス可能

テスト可能な機能：
- Network エラーシミュレーション（500/404）
- Console エラーキャプチャ
- Runtime 例外キャプチャ
- React コンポーネント検出

詳細は [packages/demo-sites/README.md](../packages/demo-sites/README.md) を参照してください。

## 3. プロダクションビルド

### 拡張機能ビルド

プロダクション用に最適化されたビルドを作成します：

```bash
npm run build:extension
```

このコマンドは以下を行います：

1. TypeScript のコンパイル
2. Vite によるバンドル化と最小化
3. `packages/extension/dist` に出力

#### ビルド出力ディレクトリ

```
packages/extension/dist/
├── manifest.json              # Manifest V3（処理済み）
├── service-worker-loader.js   # Service Worker ローダー
├── assets/                    # JavaScript/CSS 出力
│   ├── background-*.js        # Background Service Worker
│   ├── sidepanel-*.js         # Side panel JavaScript
│   ├── devtools-panel-*.js    # DevTools panel JavaScript
│   └── *.css                  # CSS ファイル
└── src/
    ├── background/            # Service Worker ソース
    ├── sidepanel/             # Side panel HTML
    ├── devtools/              # DevTools panel HTML
    └── content/               # Content script と injected script
```

#### ビルド成果物の検証

```bash
# マニフェストが正しく処理されているか確認
cat packages/extension/dist/manifest.json

# ファイルサイズを確認
ls -lh packages/extension/dist/assets/
```

### TypeScript 型チェック

ビルド前に型エラーを確認します：

```bash
npm run typecheck:extension
```

型エラーがある場合、修正してからビルドしてください。

### Helper アプリビルド

Helper アプリのプロダクション版をビルドします：

```bash
npm run build:helper
```

このコマンドは以下を行います：

1. Rust コードのコンパイル
2. バイナリのビルド
3. インストーラーの生成（OS によって異なる）

#### プラットフォーム別出力

| OS | ビルド出力 |
|----|-----------|
| macOS | `packages/helper/src-tauri/target/release/bundle/macos/` |
| Windows | `packages/helper/src-tauri/target/release/bundle/msi/` |
| Linux | `packages/helper/src-tauri/target/release/bundle/deb/` |

## 4. Chrome への手動インストール手順

### 開発・テスト環境へのインストール

デベロッパーモードを使用した一時的なインストール：

1. `npm run build:extension` でプロダクション版ビルドを実行
2. Chrome を開き、`chrome://extensions` に遷移
3. **デベロッパーモード** を有効化（右上）
4. **パッケージ化されていない拡張機能を読み込む** をクリック
5. `packages/extension/dist` を選択
6. 拡張機能がインストールされます

### 自動テスト・CI/CD 環境での読み込み

自動化スクリプトで拡張機能を読み込む場合は、以下のコマンドを使用します：

```bash
# 拡張機能の ID を取得
chrome://extensions/?id=EXTENSION_ID

# リモートデバッグを有効にして Chrome を起動（例）
google-chrome --remote-debugging-port=9222 --load-extension=$(pwd)/packages/extension/dist
```

### Web Store への申請（将来の参考）

Chrome Web Store に登録する場合：

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) にログイン
2. **新しいアイテム** をクリック
3. `packages/extension/dist` をアップロード
4. メタデータ（説明、スクリーンショット等）を入力
5. レビュー用に申請

**注意**: Manifest V3 への完全準拠、プライバシーポリシー、権限の説明が必要です。

## 5. Helper アプリ（オプション）

Helper アプリは、Chrome 拡張機能から GitHub CLI 経由で Issue を作成するローカルサーバーです。

### Helper アプリの概要

- **技術スタック**: Tauri + Rust
- **実行環境**: ローカル（`127.0.0.1:47321`）
- **依存関係**: GitHub CLI (`gh` コマンド)
- **認証**: 既存の `gh auth login` セッションを使用

### インストールと起動

#### 開発環境での起動

```bash
npm run dev:helper
```

#### プロダクション版のビルド

```bash
npm run build:helper
```

ビルドが完了したら、プラットフォーム固有のインストーラーが生成されます：

- **macOS**: DMG ファイル
- **Windows**: MSI インストーラー
- **Linux**: DEB パッケージ

### 使用例

Extension から Helper API を呼び出す例：

```typescript
// Issue の作成
const response = await fetch('http://127.0.0.1:47321/issues', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner: 'monpy',
    repo: 'tossue',
    title: 'Bug: Something broken',
    body: 'Detailed issue description with logs and screenshots'
  })
});

const result = await response.json();
console.log(result);
```

### トラブルシューティング

#### Helper アプリが見つからない / 接続できない

```bash
# Helper API のヘルスチェック
curl http://127.0.0.1:47321/health

# GitHub ステータスの確認
curl http://127.0.0.1:47321/github/status
```

#### GitHub CLI エラー

```bash
# GitHub 認証の確認
gh auth status

# ユーザーのリポジトリ一覧を確認
gh repo list
```

## 6. プロジェクト構造

```
packages/
├── extension/              # Chrome 拡張機能
│   ├── src/
│   │   ├── background/     # Service Worker
│   │   ├── content/        # Content Script
│   │   ├── sidepanel/      # Side panel UI (Preact)
│   │   ├── devtools/       # DevTools panel
│   │   └── shared/         # 共有型と util
│   ├── public/             # 静的ファイル
│   ├── dist/               # ビルド出力
│   ├── manifest.json
│   ├── vite.config.ts
│   └── package.json
├── helper/                 # Tauri Helper アプリ
│   ├── src-tauri/          # Rust ソース
│   ├── ui/                 # UI ソース
│   ├── package.json
│   └── README.md
├── oauth-worker/           # OAuth ワーカー
├── custom-api-demo/        # カスタム API デモ
└── demo-sites/             # デモサイト
    ├── nuxt/               # Nuxt 3
    └── next/               # Next.js 15
```

## 7. 開発コマンドリファレンス

| コマンド | 説明 | 使用シーン |
|---------|------|----------|
| `npm install` | 依存関係のインストール | セットアップ時、package.json 変更後 |
| `npm run dev:extension` | Extension をHMR付きで実行 | 開発中のリアルタイムテスト |
| `npm run build:extension` | Extension をプロダクションビルド | リリース前、本番検証 |
| `npm run typecheck:extension` | TypeScript の型チェック | ビルド前の品質保証 |
| `npm run dev:helper` | Helper アプリを開発モードで実行 | Helper 開発中 |
| `npm run build:helper` | Helper をプロダクション版ビルド | Helper リリース |
| `npm run dev:demo:nuxt` | Nuxt デモサイトを実行 | Extension のテスト（Vue） |
| `npm run dev:demo:next` | Next.js デモサイトを実行 | Extension のテスト（React） |

## 8. 環境変数

### Extension 開発

拡張機能では以下の環境変数が使用できます：

```bash
# 開発時のソースマップを有効化
NODE_ENV=development npm run build:extension

# 本番ビルド（ソースマップなし）
NODE_ENV=production npm run build:extension
```

ビルド出力は `packages/extension/dist` に生成されます。

### Helper アプリ

Helper アプリが GitHub CLI 認証情報を使用するため、以下が必要です：

```bash
# GitHub 認証状態の確認
gh auth status

# 必要に応じて再認証
gh auth login
```

## 9. よくある質問（FAQ）

### Q: 開発中に拡張機能が読み込まれない

A: 以下を確認してください：
1. ビルドが成功しているか：`npm run build:extension` を実行
2. `packages/extension/dist` ディレクトリが存在するか
3. Chrome DevTools で console タブにエラーがないか
4. `chrome://extensions` で拡張機能が有効になっているか

### Q: HMR が動作しない

A: 以下を確認してください：
1. Vite 開発サーバーが実行中か：ターミナルで確認
2. ファイアウォール設定でポート 5173 が開いているか
3. `vite.config.ts` で HMR 設定が正しいか

### Q: Helper アプリが接続できない

A: 以下を確認してください：
1. Helper アプリが起動しているか：`npm run dev:helper`
2. `http://127.0.0.1:47321/health` で ping できるか
3. GitHub CLI が認証済みか：`gh auth status`

### Q: プロダクション版のビルドサイズが大きい

A: 以下の最適化方法があります：
1. Unused CSS を削除：UnoCSS は自動的に削除
2. JavaScript を最小化：Vite が自動的に行う
3. ソースマップを無効化：`NODE_ENV=production` で自動的に無効

### Q: 複数の言語でテストしたい

A: Manifest の `default_locale` を使用してローカライズ対応できます：
```json
{
  "default_locale": "en",
  "_locales": {
    "en": { ... },
    "ja": { ... }
  }
}
```

## 10. トラブルシューティング

### ビルドエラー

```bash
# キャッシュをクリア
rm -rf packages/extension/dist
rm -rf node_modules/.vite

# 再インストール
npm install

# ビルドを再実行
npm run build:extension
```

### ポート競合

```bash
# ポート 5173 が使用中の場合
lsof -i :5173  # プロセスを確認
kill -9 <PID>  # プロセスを終了
```

または、`vite.config.ts` で別のポートを指定：

```typescript
server: {
  port: 5174,  // 別のポートに変更
}
```

### マニフェストエラー

```bash
# マニフェストの妥当性を確認
cat packages/extension/dist/manifest.json | jq .

# Chrome デベロッパーモードのエラーメッセージを確認
# chrome://extensions -> Tossue -> エラーをクリック
```

## 参考資料

- [Extension Architecture](./extension-architecture.md)
- [Styling Guide](./styling-guide.md)
- [Helper App README](../packages/helper/README.md)
- [Demo Sites README](../packages/demo-sites/README.md)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Vite Documentation](https://vitejs.dev/)
- [Tauri Documentation](https://tauri.app/)
