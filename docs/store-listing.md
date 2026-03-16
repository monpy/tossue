# Chrome Web Store 掲載情報

## ストア掲載テキスト

### 拡張機能名
Tossue

### 短い説明（132文字以内）
ブラウザのバグ情報を自動収集し、構造化されたGitHub Issueを作成するデバッグ支援拡張機能。

### 詳細な説明

**日本語:**

Tossue は、ブラウザ上で発生した不具合を効率的に報告するための Chrome 拡張機能です。

バグ報告に必要な情報を自動的に収集し、AI と人間の両方が理解しやすい構造化された GitHub Issue を作成します。

主な機能:
- ページ上の対象要素をクリックで選択し、DOM 情報を自動収集
- Console エラー、Network エラー、ユーザー操作ログを自動キャプチャ
- React/Next.js、Vue 3/Nuxt 3 のコンポーネント階層を自動検出
- 収集した情報から構造化された Markdown を生成
- GitHub Issue をワンクリックで作成

対象ユーザー:
- Web 開発者
- QA エンジニア
- プロダクトマネージャー

**English:**

Tossue is a Chrome extension for efficient bug reporting from your browser.

It automatically collects debugging context and creates well-structured GitHub Issues that both humans and AI can work with.

Key features:
- Click to select target elements on the page with automatic DOM info collection
- Auto-capture Console errors, Network errors, and user action logs
- Detect React/Next.js, Vue 3/Nuxt 3 component hierarchies
- Generate structured Markdown from collected information
- Create GitHub Issues with one click

Target users:
- Web developers
- QA engineers
- Product managers

### カテゴリ
Developer Tools

## manifest.json チェックリスト

### description（132文字以内）
現在: "Collects structured debugging context and drafts GitHub issues for AI-assisted bug fixing."
→ ✅ 132文字以内、適切な内容

### permissions 確認
| Permission | 用途 | 必要性 |
|-----------|------|--------|
| `activeTab` | 現在のタブ情報取得 | ✅ 必須 |
| `debugger` | DevTools Bridge 通信 | ✅ 必須 |
| `downloads` | ファイルダウンロード | ⚠️ 要確認 |
| `identity` | OAuth 認証 | ✅ 必須 |
| `scripting` | コンテンツスクリプト注入 | ✅ 必須 |
| `storage` | 設定の永続化 | ✅ 必須 |
| `tabs` | タブ情報取得 | ✅ 必須 |
| `sidePanel` | サイドパネル表示 | ✅ 必須 |

### host_permissions 確認
| Host | 用途 | 必要性 |
|------|------|--------|
| `<all_urls>` | 任意のページでコンテンツスクリプト実行 | ✅ 必須 |
| `http://127.0.0.1:47321/*` | Helper アプリとの通信 | ✅ 必須 |
| `https://api.github.com/*` | GitHub API 通信 | ✅ 必須 |

### icons 確認
- [x] 16x16 (`icons/icon-16.png`)
- [x] 48x48 (`icons/icon-48.png`)
- [x] 128x128 (`icons/icon-128.png`)

## 必要なアセット（オーナー作業）

### ストアアイコン
- [ ] 128x128 PNG（ストア表示用、高品質版）

### スクリーンショット（1280x800 推奨、最低1枚・推奨3-5枚）
- [ ] サイドパネル全体のスクリーンショット
- [ ] エリア選択機能のデモ
- [ ] Issue 作成フローのデモ
- [ ] コンポーネント検出の例

### プロモーション画像（オプション）
- [ ] 小タイル: 440x280
- [ ] 大タイル: 920x680
- [ ] マーキー: 1400x560

## プライバシーポリシー

Chrome Web Store では権限に応じてプライバシーポリシーが必要になる場合があります。

### データ収集について
Tossue は以下のデータを収集しますが、外部サーバーへの送信は行いません（Helper アプリとのローカル通信のみ）:
- ページ URL、タイトル
- DOM 要素情報
- Console エラーログ
- Network エラーログ
- ユーザー操作ログ
- スクリーンショット

これらのデータは GitHub Issue 作成時にのみ使用され、ローカルの Helper アプリ経由で GitHub API に送信されます。

## 公開前チェックリスト

- [ ] manifest.json の description が適切
- [ ] permissions が最小限
- [ ] アイコンが揃っている
- [ ] スクリーンショットが準備されている
- [ ] ストア掲載テキスト（日本語/英語）が確定
- [ ] プライバシーポリシー URL（必要な場合）
- [ ] ビルドが成功する
- [ ] 基本機能の動作確認が完了
