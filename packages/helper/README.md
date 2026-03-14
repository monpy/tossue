# Tossue Helper

Tauri ベースのローカル helper です。Chrome extension から localhost API 経由で呼ばれ、GitHub CLI (`gh`) を使って Issue を作成します。

## Planned Endpoints

- `GET /health`
- `GET /github/status`
- `GET /github/repositories`
- `POST /issues`

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
