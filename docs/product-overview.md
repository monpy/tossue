# Tossue Product Overview

## Goal

ブラウザ上で発生した不具合を、AI と GitHub Issue の両方が扱いやすい形で記録し、投稿できる拡張を作る。

初期ターゲットは Chrome / Edge を含む Manifest V3 ベースの WebExtensions。
Safari は後段で Safari Web Extension として対応する。

## Problem

現在のバグ報告は以下に寄りがち。

- タイトルだけ
- スクリーンショットや動画だけ
- 発生直前の操作や対象領域が記録されない
- AI が解釈しやすい構造化情報がない

## MVP Scope

MVP では以下だけを確実に実装する。

- サイドパネルから Issue 作成フォームを開ける
- ページ上の対象エリアを選択できる
- 直前のユーザー操作ログを保持できる
- URL、画面サイズ、User Agent、時刻を収集できる
- console error と失敗した network request を収集できる
- スクリーンショットを添付できる
- GitHub Issue 用 Markdown を自動生成できる
- GitHub Issue を API 経由で作成できる

MVP でやらないもの。

- 長時間の動画録画
- 自動で再現手順を完全生成する機能
- Safari 固有実装の先行対応

## User Flow

1. ユーザーが拡張の Side Panel を開く
2. `Select Area` を押す
3. content script がページ上で hover / click により対象 DOM を選択する
4. 拡張が直前の操作ログ、console error、network error、ページ情報を集める
5. ユーザーが `Bug Summary` と `Expected Behavior` を入力する
6. 拡張が GitHub Issue 用 Markdown を生成する
7. ユーザーが Preview を確認し、Issue を作成する

## Main Screens

### 1. Side Panel

常設の報告 UI。MVP の中心。

表示項目:

- Repository selector
- Title
- Bug summary
- Expected behavior
- Actual behavior
- Reproduction notes
- Selected area summary
- Recent actions
- Console / network summary
- Screenshot preview
- Labels
- Preview markdown
- Create issue button

### 2. In-Page Area Picker

content script が担当する画面上オーバーレイ。

機能:

- hover 中の要素をハイライト
- click で対象確定
- selector 候補を抽出
- text / aria-label / role / id / class を要約

### 3. Optional Options Page

後続で追加する設定画面。

- ローカル helper の接続状態
- デフォルト repository
- 自動収集項目の ON/OFF
- 操作ログ保持秒数

## Integration Strategy

GitHub への直接投稿は browser extension 単体ではなく、ローカル helper 経由で行う。

- extension: バグ情報の収集、Issue draft の生成、helper の状態表示
- helper: `gh` 認証状態の確認、repository 一覧取得、Issue 作成
- fallback: helper に疎通できない場合は Markdown をコピーして手動投稿する

## Extension Architecture

### `manifest.json`

責務:

- permissions 定義
- side panel 定義
- background service worker 定義
- content scripts 注入定義

想定 permissions:

- `storage`
- `activeTab`
- `scripting`
- `tabs`
- `sidePanel`

必要に応じて:

- `alarms`

host permissions:

- `https://api.github.com/*`
- 必要なら対象アプリのドメイン

### `background/service worker`

責務:

- side panel と content script 間のイベント中継
- GitHub API 呼び出し
- screenshot 取得補助
- セッション保存
- issue payload の生成

保持する状態:

- current tab id
- selected area metadata
- recent actions ring buffer
- captured console errors
- captured failed requests
- screenshot blob or data URL

### `content script`

責務:

- DOM 選択 UI の表示
- ユーザー操作ログの収集
- 対象要素メタデータの抽出
- console error の収集補助
- fetch / XHR 失敗ログの収集補助

記録対象の例:

- click
- input
- change
- submit
- route transition
- focused element

要素メタデータ:

- `tagName`
- `id`
- `classList`
- `role`
- `aria-*`
- text snippet
- CSS selector candidate
- XPath candidate
- bounding rect
- フレームワークコンポーネント情報（React / Vue 対応）

### `sidepanel app`

責務:

- フォーム UI
- 収集済みコンテキストの表示
- Markdown preview
- submit 実行

推奨技術:

- React + TypeScript
- Vite
- `@crxjs/vite-plugin` などの拡張向けビルド

React を使わず素の TypeScript でもよいが、入力項目と状態が多いため UI 管理の観点では React が無難。

## Data Model

```ts
type IssueDraft = {
  repo: string;
  title: string;
  summary: string;
  expectedBehavior: string;
  actualBehavior: string;
  reproductionNotes: string;
  labels: string[];
  selectedArea?: SelectedArea;
  actions: UserAction[];
  consoleErrors: ConsoleEntry[];
  failedRequests: NetworkEntry[];
  page: PageContext;
  screenshotDataUrl?: string;
  createdAt: string;
};

type SelectedArea = {
  url: string;
  selector?: string;
  xpath?: string;
  tagName: string;
  id?: string;
  classes: string[];
  role?: string;
  ariaLabel?: string;
  textSnippet?: string;
  rect: { x: number; y: number; width: number; height: number };
  framework?: FrameworkInfo;
};

type FrameworkInfo = {
  framework: "React" | "Vue" | "DOM";
  selectedComponent: string;
  componentTrail: string[];
  filePath?: string; // ソースマップから取得（開発環境のみ）
};

type UserAction = {
  type: "click" | "input" | "change" | "submit" | "navigation";
  timestamp: string;
  target?: string;
  valueSnippet?: string;
};

type ConsoleEntry = {
  level: "error" | "warn";
  message: string;
  timestamp: string;
};

type NetworkEntry = {
  url: string;
  method: string;
  status?: number;
  errorText?: string;
  timestamp: string;
};

type PageContext = {
  url: string;
  title: string;
  userAgent: string;
  viewport: { width: number; height: number };
};
```
