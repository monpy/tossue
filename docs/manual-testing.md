# Tossue Manual Testing Guide

## Load

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the `extension` folder

## Test Environment

- Recommended browser: recent Chrome
- Recommended page for manual testing: any local dev page or a public page with forms and buttons
- Optional for GitHub issue creation: Tossue Helper and authenticated GitHub CLI
- Optional for Chrome AI: a Chrome profile where Prompt API / `LanguageModel` is available

## Tossue Helper Setup

GitHub 連携を使う前にローカル helper と GitHub CLI を準備する。

1. `helper/` の Tauri app を起動する
   `cd helper && npm install && npm run tauri:dev`
2. `gh` CLI をインストールする
3. `gh auth login` を実行する
4. Tossue のサイドパネルで helper 状態を `Refresh Helper` する

補足:

- helper は `http://127.0.0.1:47321` で待ち受ける
- helper が起動していない場合、拡張は copy-and-paste fallback だけ提供する
- `gh auth status` が成功しないと direct issue creation は使えない
- Tauri / Rust の依存解決に失敗する場合はローカルの Rust toolchain 更新が必要なことがある

## Quick Test Checklist

以下を上から順に確認すると、一通りの動作を短時間で見られる。

1. 拡張が読み込める
2. Side Panel が開ける
3. ページ上のエリア選択ができる
4. 操作ログが Side Panel に出る
5. console error / failed request が Diagnostics に出る
6. screenshot を取得できる
7. Markdown Preview が更新される
8. 必要なら GitHub Issue を作成できる
9. 必要なら DevTools パネルで debugger を attach できる
10. 必要なら Chrome AI で文面を整形できる

## Manual Test Steps

### 1. Side Panel を開く

1. 拡張を読み込んだあと、任意の Web ページを開く
2. 拡張アイコンをクリックする
3. Side Panel が開き、`Tossue` が表示されることを確認する

期待結果:

- フォームが表示される
- helper が起動していれば接続状態が上部に表示される
- `GitHub Repository`, `Issue Title`, `Bug Summary` などの入力欄が見える

### 2. Area Picker を試す

1. Side Panel の `Select Area` を押す
2. 対象ページ上で任意のボタンや入力欄にカーソルを合わせる
3. ハイライトが出ることを確認する
4. 対象要素をクリックする

期待結果:

- 選択した要素の `tagName`, `selector`, `role`, `text`, `rect` が `Captured Context` に表示される
- ページ側でクリック操作が実行されず、選択だけが行われる

補足:

- Area Picker 中に `Esc` を押すとキャンセルできる

### 3. 操作ログを試す

1. 対象ページ上でボタンをクリックする
2. 入力欄に何か入力する
3. フォーム変更や submit 相当の操作を行う
4. Side Panel の `Refresh` を押す

期待結果:

- `Recent Actions` に `click`, `input`, `change`, `submit` が表示される
- ターゲット要素の簡易表現と入力値の一部が表示される

### 4. Console Error を試す

1. テスト対象ページで DevTools Console を開く
2. 次を実行する

```js
console.error("manual test error");
```

3. Side Panel の `Refresh` を押す

期待結果:

- `Diagnostics` に `manual test error` が表示される

補足:

- ページ内の `console.error` と `console.warn` をフックしている
- 既存アプリが console を特殊に扱っている場合は記録されないことがある

### 5. Failed Request を試す

1. テスト対象ページの DevTools Console で次を実行する

```js
fetch("/this-path-should-fail-for-testing");
```

2. Side Panel の `Refresh` を押す

期待結果:

- `Diagnostics` に failed network entry が表示される

補足:

- `fetch` と `XMLHttpRequest` をフックしている
- CORS やアプリ独自ラッパーの影響で見え方が変わることがある

### 6. Screenshot を試す

1. Side Panel の `Capture Screenshot` を押す

期待結果:

- 現在表示中のタブの可視領域スクリーンショットが表示される
- `Markdown Preview` の `Attachments` に screenshot がある前提の文言が出る

### 7. Markdown Preview を試す

1. `Issue Title`, `Bug Summary`, `Expected Behavior`, `Actual Behavior`, `Reproduction Notes` を入力する
2. `Labels` に `bug, needs-triage` のように入力する

期待結果:

- `Markdown Preview` が自動更新される
- 入力内容、選択エリア、操作ログ、Diagnostics が Markdown に入る

### 8. GitHub Issue 作成を試す

1. `GitHub Repository` に `owner/repo` 形式で入力する
2. helper が reachable で、GitHub CLI が authenticated であることを確認する
3. `Issue Title` を入力する
4. `Create Issue` を押す

期待結果:

- 成功時は `Created #123: https://github.com/...` のようなメッセージが出る
- 対象 repo に Issue が作成される

失敗時の確認ポイント:

- repo 形式が `owner/repo` になっているか
- helper が起動しているか
- `gh auth status` が成功するか
- 認証済みユーザーに対象 repo への権限があるか

### 9. DevTools パネルを試す

1. テスト対象ページで DevTools を開く
2. 上部タブに `Tossue` があることを確認する
3. パネルを開いて `Attach Debugger` を押す
4. permission ダイアログが出たら許可する
5. ページ上でエラーや failed request を発生させる

期待結果:

- `Debugger attached` と表示される
- runtime exception や network failed event がパネル内に出る
- Side Panel の Diagnostics にも反映される

注意:

- `debugger` permission は optional なので、クリック時に許可が必要
- DevTools を閉じると挙動が変わることがある

### 10. Chrome AI を試す

1. ある程度フォームを埋める
2. `Enhance with Chrome AI` を押す

期待結果:

- `LanguageModel` が使える環境なら、title や本文が整形される
- 使えない環境では unavailable 系メッセージが表示される

注意:

- この機能は Chrome の Prompt API availability に依存する
- 環境によっては model download が必要

## Suggested Manual Test Page

ローカルの検証用に、次のようなページで試すと確認しやすい。

- ボタンがある
- テキスト入力欄がある
- フォーム送信がある
- 失敗する API 呼び出しを起こせる
- console error を簡単に出せる

ローカルアプリがなければ、適当なフォームを持つ社内検証ページや手元の dev server で十分。

## Troubleshooting

### Side Panel が開かない

- `chrome://extensions` で拡張が有効か確認する
- 対象ページを開き直す
- 拡張アイコンから開く

### Area Picker が反応しない

- ページを reload して content script を再注入する
- `chrome://extensions` の拡張エラーログを確認する
- `chrome://` 系や Chrome Web Store ページでは制限がある

### Diagnostics が増えない

- Side Panel の `Refresh` を押す
- content script がそのページで実行可能か確認する
- console / fetch がアプリ側で独自ラップされていないか確認する

### GitHub Issue が作れない

- helper の起動状態を確認する
- `gh auth status` を確認する
- repository 名を確認する
- Side Panel のエラーメッセージを確認する
