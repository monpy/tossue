# Component Detection Specification

フレームワークコンポーネント情報を要素メタデータに追加する機能の仕様。

## 概要

ブラウザ上でクリック・操作された要素に対して、React / Vue などのフレームワークコンポーネント情報を自動検出し、Issue 報告に含める。

## 対応フレームワーク

| フレームワーク | 検出方法 | 対応状況 |
|---------------|---------|---------|
| React | React Fiber (`__reactFiber$*`) | ✅ 実装済み |
| Vue 3 | `__vueParentComponent` | ✅ 実装済み |
| Next.js | React Fiber 経由 | ✅ 実装済み |
| Nuxt 3 | Vue 3 経由 | ✅ 実装済み |
| DOM フォールバック | data-testid, aria-label, tag.class | ✅ 実装済み |

## データ構造

```ts
type FrameworkInfo = {
  framework: "React" | "Vue" | "DOM";
  selectedComponent: string;        // 直近のコンポーネント名
  componentTrail: string[];         // 親コンポーネントの階層（最大6件）
  filePath?: string;                // ソースファイルパス（将来実装）
};
```

## 検出ロジック

### React / Next.js

1. クリック要素から親方向に DOM ツリーを走査
2. `__reactFiber$*` または `__reactInternalInstance$*` プロパティを検索
3. Fiber ノードから `elementType.displayName` または `elementType.name` を取得
4. 親 Fiber を辿って componentTrail を構築（最大6階層）

```ts
function detectReactInfo(element: Element): FrameworkInfo | null {
  let current = element;
  while (current) {
    const fiber = findReactFiber(current);
    if (fiber) {
      const trail = buildReactComponentTrail(fiber);
      return {
        framework: "React",
        selectedComponent: trail[0] || "",
        componentTrail: trail.slice(0, 6)
      };
    }
    current = current.parentElement;
  }
  return null;
}
```

### Vue 3 / Nuxt 3

1. クリック要素から親方向に DOM ツリーを走査
2. `__vueParentComponent` プロパティを検索
3. Vue instance から `type.name` または `type.__name` を取得
4. 親 instance を辿って componentTrail を構築（最大6階層）

```ts
function detectVueInfo(element: Element): FrameworkInfo | null {
  let current = element;
  while (current) {
    const instance = current.__vueParentComponent;
    if (instance) {
      const trail = buildVueComponentTrail(instance);
      return {
        framework: "Vue",
        selectedComponent: trail[0] || "",
        componentTrail: trail.slice(0, 6)
      };
    }
    current = current.parentElement;
  }
  return null;
}
```

### DOM フォールバック

フレームワークが検出できない場合、DOM 属性から人間が理解しやすい情報を抽出:

1. `data-testid` 属性
2. `aria-label` 属性（40文字以内）
3. `tag.class` 形式（クラス名は最大2つ）

## UI 表示

### Selected Area セクション

```
┌─────────────────────────────────────┐
│ 🎯 HeaderComponent                  │ ← コンポーネント名（優先表示）
│    React                            │ ← フレームワークラベル
│    header#main-header.sticky        │ ← HTML 要素（サブテキスト）
└─────────────────────────────────────┘
```

### Recent Actions タイムライン

```
┌─────────────────────────────────────┐
│ 10:30:15  click                     │
│           SubmitButton              │ ← コンポーネント名
│           "送信"                    │ ← テキストスニペット
└─────────────────────────────────────┘
```

### Markdown 出力

```markdown
### Selected Area

- URL: https://example.com/page
- Element: header#main-header.sticky
- Framework: React
- Component: HeaderComponent
- Component Tree: HeaderComponent > Layout > App

### Recent Actions

1. click | SubmitButton [React] | "送信"
2. input | EmailInput [React] | "user@..."
```

## 制限事項

- Production ビルドでは minify によりコンポーネント名が失われる場合がある
- SSR 初期レンダリング直後は Fiber/instance がアタッチされていない場合がある
- iframe 内の要素は検出対象外

## 将来の拡張（MVP 外）

- ソースマップからのファイルパス取得
- Svelte / SolidJS 対応
- コンポーネント props の収集
