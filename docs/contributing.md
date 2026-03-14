# Contributing Guide

## Branch Structure

```
main   ← リリース用（安定版）
devel  ← 開発用・デフォルトブランチ
```

- `main`: 本番リリース用。直接 push 禁止。`devel` からの PR のみ受け付ける
- `devel`: 開発用。直接 push 禁止。feature ブランチからの PR のみ受け付ける

## Development Workflow

### 1. 新機能・修正の開発

```bash
# devel から feature ブランチを作成
git checkout devel
git pull origin devel
git checkout -b feature/your-feature-name

# 開発作業...
git add .
git commit -m "Add your feature"

# リモートに push
git push -u origin feature/your-feature-name

# devel への PR を作成
gh pr create --base devel
```

### 2. リリース

`devel` の内容を `main` にマージしてリリースする。

```bash
# devel → main への PR を作成
gh pr create --base main --head devel --title "Release vX.X.X"
```

## Branch Naming Convention

| Prefix | 用途 | 例 |
|--------|------|-----|
| `feature/` | 新機能 | `feature/add-dark-mode` |
| `fix/` | バグ修正 | `fix/login-error` |
| `docs/` | ドキュメント | `docs/update-readme` |
| `refactor/` | リファクタリング | `refactor/cleanup-api` |
| `chore/` | その他（依存関係更新など） | `chore/update-deps` |

## Pull Request Guidelines

1. PR は小さく保つ（1つの PR で1つの目的）
2. タイトルは変更内容を簡潔に記述
3. 必要に応じて変更理由やテスト方法を説明

## Commit Message Format

```
<type>: <subject>

<body (optional)>
```

Type:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `chore`: その他
