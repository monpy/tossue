# UI Writing Guide

サイドパネルUIのラベル・テキストライティング方針を定める。

## 想定読者

- QA担当者
- 開発者・技術者

ユーザーフレンドリーな表現を追求しつつ、技術者が問題箇所を特定できる情報は維持する。

## セクション命名方針

### 現在のセクション構成

| セクション名 | 目的 |
|-------------|------|
| Structured Report | ユーザーが入力するバグの説明（タイトル、現状、期待動作） |
| Captured Context | 拡張が自動収集した証拠（選択エリア、スクリーンショット、録画） |
| Timeline | ユーザー操作ログ、コンソールエラー、ネットワークエラーの時系列表示 |
| Markdown Preview | 生成されたIssue本文のプレビュー |
| Create GitHub Issue | Issue作成の実行 |

### 命名ガイドライン

1. **技術者・QA向けの明確な用語を使用する**
   - 「Report」「Context」「Timeline」など、バグ報告の文脈で一般的な用語を採用
   - 過度にカジュアルな表現は避ける

2. **セクションの役割を端的に表す**
   - ユーザー入力エリアと自動収集エリアを区別できる命名にする

3. **英語で統一する**
   - Issue本文が英語で生成されることを踏まえ、UIラベルも英語で統一

## 技術的識別子の表示方針

### 対象

- CSS クラス名（例: `main.layout_system_main__j85TI`）
- CSS セレクタ
- DOM 要素情報

### 方針

**簡略化はしない。ただし、表示幅に応じて省略（`...`）する。**

#### 理由

- 技術者がどの要素かを特定するきっかけを残す
- ハッシュ化されたクラス名でも、検索すれば該当箇所を発見できる
- 完全に非表示にすると、デバッグ時の手がかりが失われる

#### 実装ガイドライン

1. **表示の優先順位**
   - フレームワークコンポーネント名がある場合は優先表示（例: `<Header>`）
   - ない場合は `tagName#id` または `tagName.class` 形式で表示

2. **省略表示**
   - 長い識別子は CSS の `text-overflow: ellipsis` で省略
   - ホバーまたはフォーカスで全文を確認できるようにする（title属性など）

3. **最大表示文字数の目安**
   - インライン表示: 40〜60文字程度で省略
   - 詳細表示（展開時）: 制限なし

### 表示例

| 元の値 | 表示 |
|--------|------|
| `div#main-content` | `div#main-content` |
| `main.layout_system_main__j85TI` | `main.layout_system_main__j8...`（省略） |
| React コンポーネント `Header` | `Header`（優先表示）+ `header.Header_root__abc12`（補足） |

## アクション行の表示形式

### Timeline エントリの表示

```
[番号] [アクション種別] | [対象] | [詳細]
```

#### アクション種別

| 種別 | 表示 |
|------|------|
| click | `click` |
| input | `input` |
| change | `change` |
| submit | `submit` |
| navigation | `Page \|` |
| リンククリック | `click link` |

### Console / Network エントリ

- Console: `⚠ console.error` / `⚡ console.warn`
- Network: `🌐 METHOD STATUS` (例: `🌐 GET 404`)

## ステータスメッセージ

### ガイドライン

1. **簡潔に、状態を明示する**
   - 良い例: `Helper connected`、`Creating issue...`
   - 悪い例: `接続しています！お待ちください...`

2. **エラーメッセージは原因と対処を示す**
   - 良い例: `GitHub CLI is not authenticated. Run gh auth login first.`

3. **言語は英語で統一**
   - Issue本文・UIラベルとの一貫性を保つ

## 今後の検討事項

- [ ] セクション名「Structured Report」「Captured Context」の再検討（より直感的な名前があれば変更）
- [ ] i18n 対応時のガイドライン追加
