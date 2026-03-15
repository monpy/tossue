# Settings & Issue Creation Modes

Issue 作成方法の設定と、それを管理するための Settings タブの仕様を定義する。

## 概要

ユーザーが自身の環境やワークフローに応じて Issue 作成方法を選択できるようにする。

### 背景

現在は Helper 経由（`gh` コマンド）でのみ Issue を作成できるが、以下の課題がある：

- Helper のインストール・設定が必要で導入ハードルが高い
- 「すぐに使いたい」ユーザーにとって障壁になる

これを解決するため、複数の Issue 作成モードを提供する。

## Issue 作成モード

### モード一覧

| モード | ID | 説明 | 添付ファイル |
|--------|-----|------|-------------|
| Copy | `copy` | Markdown をクリップボードにコピー | ローカル DL |
| GitHub API | `github-api` | OAuth 認証で直接 Issue 作成 | ローカル DL → 手動アップロード |
| Helper (gh CLI) | `gh-cli` | Helper 経由で `gh` コマンド実行 | 自動アップロード可能 |

### モード詳細

#### Copy モード (`copy`)

- **動作**: Issue の Markdown をクリップボードにコピー
- **認証**: 不要
- **添付ファイル**: ローカルにダウンロード
- **ユースケース**: 手軽に使いたい、社内システムに投稿したい

#### GitHub API モード (`github-api`)

- **動作**: GitHub OAuth で認証し、REST API 経由で Issue 作成
- **認証**: GitHub OAuth（`repo` スコープ）
- **添付ファイル**: ローカルにダウンロード → ユーザーが GitHub UI で手動アップロード
- **ユースケース**: Extension 単体で完結させたい、Helper をインストールしたくない

##### OAuth フロー

1. Settings タブで「Connect GitHub」ボタンをクリック
2. `chrome.identity.launchWebAuthFlow` で GitHub OAuth 画面を表示
3. 認可後、アクセストークンを `chrome.storage.local` に保存
4. リポジトリ一覧を取得し、ドロップダウンで選択可能に

##### 使用する API

- `GET /user/repos` - リポジトリ一覧取得
- `POST /repos/{owner}/{repo}/issues` - Issue 作成
- `GET /repos/{owner}/{repo}/labels` - ラベル一覧取得
- `POST /repos/{owner}/{repo}/labels` - ラベル作成（存在しない場合）

#### Helper モード (`gh-cli`)

- **動作**: ローカル Helper 経由で `gh issue create` を実行
- **認証**: Helper 側の `gh auth` 状態を使用
- **添付ファイル**: Helper の hook で自動アップロード可能
- **ユースケース**: フル機能を使いたい、カスタムスクリプトで処理したい

## UI 構成

### タブ構成

サイドパネルに 2 つのタブを追加する：

| タブ | 内容 |
|------|------|
| Main | 現在の Issue 作成 UI（フォーム、キャプチャ、タイムライン等） |
| Settings | Issue 作成モード設定、認証状態、接続設定 |

### タブ UI

```
┌────────────────────────────────────┐
│  🪲 Tossue           [Refresh]    │
├──────────┬─────────────────────────┤
│   Main   │  Settings              │  ← タブ切り替え
├──────────┴─────────────────────────┤
│                                    │
│  (タブに応じたコンテンツ)           │
│                                    │
└────────────────────────────────────┘
```

### Status Feedback（ステータス表示）

Main タブの冒頭に現在のモードと状態を簡潔に表示する：

```
┌────────────────────────────────────┐
│ Mode: GitHub API ✓ Connected       │  ← ステータスバー
│ repo: owner/repo-name              │
└────────────────────────────────────┘
```

#### 表示パターン

| モード | 状態 | 表示例 |
|--------|------|--------|
| `copy` | - | `Mode: Copy to clipboard` |
| `github-api` | 未認証 | `Mode: GitHub API — Not connected` |
| `github-api` | 認証済 | `Mode: GitHub API ✓ Connected` |
| `gh-cli` | Helper 未接続 | `Mode: Helper — Not reachable` |
| `gh-cli` | 接続済・認証済 | `Mode: Helper ✓ Ready` |
| `gh-cli` | 接続済・未認証 | `Mode: Helper — gh not authenticated` |

### Settings タブ内容

```
┌────────────────────────────────────┐
│ Issue Creation Mode                │
│ ┌────────────────────────────────┐ │
│ │ ○ Copy to clipboard            │ │
│ │ ○ GitHub API (OAuth)           │ │
│ │ ● Helper (gh CLI)              │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ GitHub API Settings                │
│ ┌────────────────────────────────┐ │
│ │ Status: Not connected          │ │
│ │ [Connect GitHub]               │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Helper Settings                    │
│ ┌────────────────────────────────┐ │
│ │ Status: ✓ Connected            │ │
│ │ gh: ✓ Installed                │ │
│ │ Auth: ✓ Authenticated          │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ Custom API (Optional)              │
│ ┌────────────────────────────────┐ │
│ │ [ ] Enable custom API          │ │
│ │ Endpoint: [________________]   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

## データモデル

### 設定の型定義

```typescript
type IssueCreateMethod = "copy" | "github-api" | "gh-cli";

interface IssueCreationSettings {
  createMethod: IssueCreateMethod;
  customApi: {
    enabled: boolean;
    endpoint?: string;
  };
}

interface GitHubOAuthState {
  accessToken?: string;
  authenticatedUser?: string;
  selectedRepo?: string;
}
```

### Storage Keys

| キー | 型 | 説明 |
|------|-----|------|
| `issueCreationSettings` | `IssueCreationSettings` | Issue 作成設定 |
| `githubOAuthState` | `GitHubOAuthState` | OAuth 認証状態 |

## 実装方針

### ファイル構成

```
sidepanel/
├── App.tsx                    # タブ切り替えを追加
├── components/
│   ├── tabs/
│   │   ├── TabBar.tsx         # タブバー
│   │   └── TabPanel.tsx       # タブパネルコンテナ
│   ├── MainTab.tsx            # 既存UIをラップ
│   ├── SettingsTab.tsx        # Settings タブ
│   ├── StatusFeedback.tsx     # ステータス表示
│   └── settings/
│       ├── ModeSelector.tsx   # モード選択
│       ├── GitHubApiSettings.tsx
│       ├── HelperSettings.tsx
│       └── CustomApiSettings.tsx
├── hooks/
│   └── useSettings.ts         # 設定の読み書き
└── store/
    └── signals.ts             # settings 用シグナル追加
```

### Issue 作成フロー

```
[Create Issue ボタン]
       ↓
  createMethod?
  ├─ copy      → Markdown をクリップボードへ
  ├─ github-api → GitHub REST API で作成
  └─ gh-cli    → Helper 経由で gh issue create
       ↓
  customApi.enabled?
  ├─ Yes → カスタム API にも送信
  └─ No  → 終了
       ↓
  添付ファイルをダウンロード
       ↓
  完了メッセージ表示
```

## 関連 Issue

- #31 - feat: Issue作成の連携モード設定
- #22 - feat: GitHub OAuth 認証による Issue 作成フロー（Extension 単体動作）
