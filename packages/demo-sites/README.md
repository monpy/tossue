# Demo Sites

Tossue 拡張機能の DevTools Bridge 機能をテストするためのデモサイト。

## パッケージ

| ディレクトリ | フレームワーク | ポート |
|-------------|---------------|--------|
| `nuxt/` | Nuxt 3 (Vue 3) | 3000 |
| `next/` | Next.js 15 (React 19) | 3001 |

## 起動方法

```bash
# Nuxt デモサイト
cd packages/demo-sites/nuxt
npm install
npm run dev

# Next.js デモサイト
cd packages/demo-sites/next
npm install
npm run dev
```

## テスト項目

### Network Errors

DevTools で Tossue タブを開いた状態でボタンをクリックすると、Network エラー（4xx/5xx）が自動でキャプチャされます。

- **Trigger 500 Error**: サーバーエラーをシミュレート
- **Trigger 404 Error**: 存在しないエンドポイントへのリクエスト

### Console Errors

DevTools で「Attach Debugger」した状態でボタンをクリックすると、Console エラーがキャプチャされます。

- **Trigger console.error**: `console.error()` の出力
- **Trigger console.warn**: `console.warn()` の出力
- **Throw Exception**: 未キャッチの例外をスロー

### Component Tracking

Vue/React コンポーネントのトラッキングをテストできます。

- **Counter**: 状態変更をトリガーするカウンター
- **Nested Components**: ネストされたコンポーネント構造

## 使い方

1. デモサイトを起動
2. Chrome で該当ページを開く
3. Tossue 拡張機能の Side Panel を開く
4. DevTools (F12) を開き、Tossue タブを選択
5. 各ボタンをクリックしてエラーをトリガー
6. Side Panel の「DevTools Bridge」セクションで状態を確認
