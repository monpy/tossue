# Tossue Helper

Tauri ベースのローカル helper です。Chrome extension から localhost API 経由で呼ばれ、GitHub CLI (`gh`) を使って Issue を作成します。

## Endpoints

- `GET /health`
- `GET /github/status`
- `GET /github/repositories`
- `GET /github/repos/:owner/:repo/labels` - リポジトリのラベル一覧を取得
- `POST /issues`

### GET /github/repos/:owner/:repo/labels

リポジトリに定義されているラベル一覧を取得する。

**Request:**

```
GET /github/repos/owner/repo/labels
```

**Response:**

```json
{
  "labels": [
    {
      "name": "bug",
      "color": "d73a4a",
      "description": "Something isn't working"
    },
    {
      "name": "enhancement",
      "color": "a2eeef",
      "description": "New feature or request"
    }
  ]
}
```

**Error Response:**

```json
{
  "error": "failed to fetch labels: repository not found"
}
```

## Requirements

- Rust toolchain
- Node.js / npm
- `gh` CLI
- `gh auth login` 済みの GitHub セッション
- Tauri CLI (`npm install` 後に `cargo tauri` を使用)

## Development Notes

このリポジトリでは helper を `helper/` 配下の独立した Tauri app として管理します。

## Local Run

1. `cd helper`
2. `npm install`
3. `npm run tauri:dev`

helper は `127.0.0.1:47321` で localhost API を公開します。
