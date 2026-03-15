# カスタムアップロードスクリプト仕様

Issue: #20

## 概要

Helper の設定メニュー（トレイメニュー）から、画像・動画アップロード用のカスタムスクリプトを設定・テストできる機能。

## 背景

- `gh` CLI では画像・動画を直接 Issue に添付できない
- ユーザーごとにアップロード先（S3, Cloudflare R2, Imgur 等）や方法が異なる
- 既存の `tokio::process::Command` パターンを活用してスクリプト実行可能

## 機能要件

### 1. スクリプト設定

- **設定場所**: Helper のトレイメニュー → "Upload Script Settings" でウィンドウを開く
- **入力方式**: テキストエリアにスクリプトを直接記述
- **言語指定**: シェバン（`#!/bin/bash`, `#!/usr/bin/env python3` 等）で指定
- **環境変数**: スクリプトに以下の環境変数が渡される
  - `TOSSUE_FILE_PATH`: アップロード対象ファイルのパス
  - `TOSSUE_FILENAME`: 元のファイル名（例: `screenshot-1.png`）
  - `TOSSUE_MIME_TYPE`: MIME タイプ（例: `image/png`, `video/webm`）
- **出力**: 標準出力に URL を出力（1行目のみ使用）

### 2. スクリプト実行フロー

```
Extension                    Helper
    │                           │
    ├── POST /upload/file ──────┤  (Base64 ファイルデータ送信)
    │                           │
    │                           ├── 一時ファイルに書き出し
    │                           │
    │                           ├── スクリプトを一時ファイルに書き出し
    │                           │
    │                           ├── chmod +x && 実行
    │                           │
    │                           ├── stdout から URL 取得
    │                           │
    │                           ├── 一時ファイル削除
    │                           │
    ├── { url: "https://..." } ◀┤
    │                           │
```

### 3. テスト機能

- **テスト実行**: 設定画面から「Test Upload」ボタンで PNG と WebM の両方をテスト
- **テスト内容**:
  1. サンプル PNG（1x1 ピクセル）をアップロード
  2. サンプル WebM（最小の有効なファイル）をアップロード
  3. 各ファイルの URL が正常に発行されたことを確認
- **結果表示**:
  - 成功時: 発行された URL を表示し、Issue 本文に追記されるプレビューを表示
  - 失敗時: エラーメッセージを表示

### 4. デフォルト動作

- スクリプト未設定時: アップロード機能を使用しない（既存動作を維持）
- Extension 側の添付ファイルダウンロード機能はそのまま利用可能

## UI 設計

### トレイメニュー追加項目

```
🟢 GitHub CLI: authenticated
127.0.0.1:47321 ready for extension requests
🔑 Token: abc1...xyz9
Account: User Name (@username)
Repositories: 42
Install gh from cli.github.com (条件付き表示)
────────────────────────────
📋 Copy Token
🔄 Rotate Token
────────────────────────────
📤 Upload Script Settings   ← 新規追加
────────────────────────────
Refresh Status
Login in Terminal
Quit Tossue Helper
```

### 設定ウィンドウ

```
┌─────────────────────────────────────────────────────────┐
│ Upload Script Settings                              [×] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─ Script ─────────────────────────────────────────┐   │
│ │ #!/bin/bash                                      │   │
│ │ curl -s -X POST "https://example.com/upload" \   │   │
│ │   -F "file=@$TOSSUE_FILE_PATH"                   │   │
│ │                                                   │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ Input ──────────────────────────────────────────┐   │
│ │ Environment variable:                             │   │
│ │   TOSSUE_FILE_PATH    Path to the file to upload │   │
│ │   TOSSUE_FILENAME     Original filename           │   │
│ │   TOSSUE_MIME_TYPE    MIME type (image/png, etc.) │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ Expected Output ────────────────────────────────┐   │
│ │ Print the uploaded file URL to stdout.            │   │
│ │ Only the first line is used.                      │   │
│ │                                                   │   │
│ │ Example: https://example.com/uploads/image.png    │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ Issue Body Preview ─────────────────────────────┐   │
│ │ The URL will be embedded in the issue body as:    │   │
│ │                                                   │   │
│ │ ## Attachments                                    │   │
│ │ ![screenshot-1.png](https://example.com/xxx.png)  │   │
│ │ [recording-1.webm](https://example.com/xxx.webm)  │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ ┌─ Test Result ────────────────────────────────────┐   │
│ │ (Click "Test Upload" to test with sample files)   │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│              [Test Upload]              [Save]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### テスト結果表示例

**成功時:**
```
┌─ Test Result ────────────────────────────────────────┐
│ ✓ PNG upload successful                              │
│   URL: https://example.com/test-1234.png             │
│                                                      │
│ ✓ WebM upload successful                             │
│   URL: https://example.com/test-5678.webm            │
│                                                      │
│ Preview in issue body:                               │
│ ────────────────────────────────────────────         │
│ ## Attachments                                       │
│ ![test.png](https://example.com/test-1234.png)       │
│ [test.webm](https://example.com/test-5678.webm)      │
└──────────────────────────────────────────────────────┘
```

**失敗時:**
```
┌─ Test Result ────────────────────────────────────────┐
│ ✗ PNG upload failed                                  │
│   Error: Script exited with code 1: curl: (6) ...    │
│                                                      │
│ ✗ WebM upload skipped (PNG failed)                   │
└──────────────────────────────────────────────────────┘
```

## API 設計

### POST /upload/file (新規)

添付ファイルをアップロードし、URL を取得する。

**リクエスト:**
```json
{
  "filename": "screenshot-1.png",
  "mime_type": "image/png",
  "data": "base64-encoded-file-data..."
}
```

**レスポンス:**
```json
{
  "url": "https://example.com/uploaded/screenshot-1.png"
}
```

**エラーレスポンス:**
```json
{
  "error": "Upload script is not configured"
}
```

### POST /upload/test (新規)

設定画面からテスト実行する際に使用。PNG と WebM の両方をテストする。

**リクエスト:**
```json
{
  "script": "#!/bin/bash\ncurl ..."
}
```

**レスポンス:**
```json
{
  "png": {
    "success": true,
    "url": "https://example.com/test-1234.png",
    "error": null
  },
  "webm": {
    "success": true,
    "url": "https://example.com/test-5678.webm",
    "error": null
  },
  "preview": "## Attachments\n![test.png](https://example.com/test-1234.png)\n[test.webm](https://example.com/test-5678.webm)"
}
```

**エラーレスポンス:**
```json
{
  "png": {
    "success": false,
    "url": null,
    "error": "Script exited with code 1: curl: (6) Could not resolve host"
  },
  "webm": {
    "success": false,
    "url": null,
    "error": "Skipped (PNG upload failed)"
  },
  "preview": null
}
```

### GET /upload/script (新規)

現在保存されているスクリプトを取得。

**レスポンス:**
```json
{
  "script": "#!/bin/bash\ncurl ...",
  "configured": true
}
```

### PUT /upload/script (新規)

スクリプトを保存。

**リクエスト:**
```json
{
  "script": "#!/bin/bash\ncurl ..."
}
```

**レスポンス:**
```json
{
  "ok": true
}
```

## データ保存

### スクリプト保存場所

```
~/.config/tossue/upload-script
```

- ファイル形式: プレーンテキスト（スクリプト本文をそのまま保存）
- パーミッション: `0600`（所有者のみ読み書き可能）

## 実装詳細

### スクリプト実行処理 (Rust)

```rust
async fn run_upload_script(file_path: &Path) -> Result<String, String> {
    let script = load_upload_script().await?;
    if script.is_empty() {
        return Err("Upload script is not configured".into());
    }

    // スクリプトを一時ファイルに書き出し
    let script_path = write_temp_script(&script).await?;

    // 実行権限を付与
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let permissions = std::fs::Permissions::from_mode(0o700);
        std::fs::set_permissions(&script_path, permissions)?;
    }

    // スクリプト実行
    let output = Command::new(&script_path)
        .env("TOSSUE_FILE_PATH", file_path)
        .env("TOSSUE_FILENAME", filename)
        .env("TOSSUE_MIME_TYPE", mime_type)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run upload script: {e}"))?;

    // 一時ファイル削除
    let _ = tokio::fs::remove_file(&script_path).await;

    if !output.status.success() {
        return Err(format!(
            "Upload script failed (exit code {}): {}",
            output.status.code().unwrap_or(-1),
            stderr_text(&output.stderr)
        ));
    }

    // stdout の1行目を URL として取得
    let url = String::from_utf8_lossy(&output.stdout)
        .lines()
        .next()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .ok_or("Upload script produced no output")?;

    Ok(url)
}
```

### URL 疎通確認 (Rust)

```rust
async fn check_url_reachable(url: &str) -> Result<(bool, Option<String>), String> {
    let client = reqwest::Client::new();
    let response = client
        .head(url)
        .timeout(Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Failed to reach URL: {e}"))?;

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    Ok((response.status().is_success(), content_type))
}
```

## セキュリティ考慮事項

1. **スクリプト実行権限**: Helper は通常ユーザー権限で実行されるため、スクリプトも同権限で実行される
2. **一時ファイル**: `/tmp` または `env::temp_dir()` に作成し、処理完了後に削除
3. **入力検証**: ファイルパスのエスケープは不要（環境変数経由で渡すため）
4. **タイムアウト**: スクリプト実行に60秒のタイムアウトを設定

## 将来的な拡張

- プリセットスクリプト（S3, Cloudflare R2, Imgur 等）の提供
- 複数スクリプトのチェーン実行（変換 → アップロード等）
- アップロード結果のキャッシュ（同じファイルの再アップロード防止）

## 依存関係

### Cargo.toml 追加

```toml
[dependencies]
reqwest = { version = "0.12", features = ["json"] }
```

## スクリプト例

### Cloudflare Workers を使用した例

```bash
#!/bin/bash
curl -s -X POST "https://hldy.z-1.workers.dev/" \
  -F "file=@$TOSSUE_FILE_PATH"
```

### S3 を使用した例

```bash
#!/bin/bash
aws s3 cp "$TOSSUE_FILE_PATH" "s3://my-bucket/uploads/$(basename "$TOSSUE_FILE_PATH")" --quiet
echo "https://my-bucket.s3.amazonaws.com/uploads/$(basename "$TOSSUE_FILE_PATH")"
```

### Python を使用した例

```python
#!/usr/bin/env python3
import os
import sys
import requests

file_path = os.environ.get("TOSSUE_FILE_PATH")
if not file_path:
    sys.exit(1)

with open(file_path, "rb") as f:
    response = requests.post(
        "https://example.com/upload",
        files={"file": f}
    )

print(response.json()["url"])
```
