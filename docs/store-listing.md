# Chrome Web Store Listing

This document contains draft content for the Chrome Web Store listing of Tossue.

## English

### Short Description (132 characters max)
Collects structured debugging context and drafts GitHub issues for AI-assisted bug fixing.

### Detailed Description
Tossue is a browser extension for developers that streamlines bug reporting by collecting comprehensive debugging context directly from the browser and automatically generating well-structured GitHub issues.

**Key Features:**
- **Area Selection**: Click to select specific page elements when reporting bugs
- **Context Collection**: Automatically captures console errors, network failures, user actions, and page information
- **Smart Issue Generation**: Converts collected context into markdown-formatted GitHub issues
- **Screenshots**: Attach snapshots to your bug reports
- **GitHub Integration**: Create issues directly from the extension using GitHub authentication
- **Local Workflow**: Uses local helper app to maintain your GitHub credentials securely

**Perfect for:**
- Bug tracking and issue management
- Software quality assurance teams
- Open-source maintainers
- Development teams using GitHub

Tossue ensures that every bug report is thorough, structured, and ready for both human review and AI-assisted debugging.

---

## Japanese

### 短い説明（132文字以内）
ブラウザから構造化されたデバッグコンテキストを収集し、AI支援でバグ修正するGitHub Issueを自動生成します。

### 詳細説明
Tossue は開発者向けのブラウザ拡張機能で、ブラウザから直接デバッグコンテキストを収集し、きちんと構造化されたGitHub Issueを自動生成することで、バグ報告プロセスを効率化します。

**主な機能:**
- **エリア選択**: ページ上の特定の要素をクリックして選択できます
- **コンテキスト自動収集**: console エラー、ネットワーク失敗、ユーザーアクション、ページ情報を自動キャプチャ
- **スマート Issue 生成**: 収集したコンテキストを markdown 形式の GitHub Issue に変換
- **スクリーンショット**: バグレポートにスナップショットを添付可能
- **GitHub 統合**: GitHub 認証を使用して拡張機能から直接 Issue を作成
- **ローカルワークフロー**: ローカルヘルパーアプリで GitHub 認証情報を安全に管理

**おすすめの使用者:**
- バグ追跡と Issue 管理
- ソフトウェア品質保証チーム
- オープンソース保守者
- GitHub を使用している開発チーム

Tossue は、すべてのバグレポートが十分で、構造化され、人間のレビューと AI 支援のバグ修正の両方に対応できることを保証します。

---

## Chrome Web Store Metadata

**Category**: Developer Tools

**Languages Supported**:
- English
- 日本語 (Japanese)

**Permissions Justification**:
- `debugger`: Access to DevTools protocol for error collection
- `activeTab`: Read active tab information for context
- `tabs`: Monitor tab navigation for debugging workflow
- `storage`: Save user settings and preferences
- `scripting`: Inject content scripts for area selection
- `downloads`: Handle screenshot downloads
- `identity`: GitHub OAuth authentication
- `sidePanel`: Dedicated UI panel for bug reporting

**Target Users**:
- Web developers
- QA engineers
- Open source contributors
- Development teams using GitHub

---

## Screenshots

Store screenshots are located in `docs/screenshots/`. Replace placeholder images with actual screenshots before submission.

| # | File | Description |
|---|------|-------------|
| 1 | `01-sidepanel-overview.png` | Side panel with issue creation form |
| 2 | `02-area-selection.png` | Area selection highlighting an element |
| 3 | `03-preview.png` | Generated Markdown preview |
| 4 | `04-issue-created.png` | Issue creation success feedback |
| 5 | `05-context-collected.png` | Console/network errors display |

**Requirements**:
- Size: 1280x800 (recommended) or 640x400 (minimum)
- Format: PNG or JPEG
- Count: 1-5 images

---

## Promotional Images (Optional)

| Type | Size | Status |
|------|------|--------|
| Small Tile | 440x280 | Not created |
| Large Tile | 920x680 | Not created |
| Marquee | 1400x560 | Not created |
