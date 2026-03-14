# Extension Architecture

Chrome 拡張機能の技術アーキテクチャを定義する。

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Language | TypeScript | ^5.0 |
| Build | Vite | ^5.0 |
| Extension Plugin | @crxjs/vite-plugin | ^2.0.0-beta |
| UI Framework | Preact | ^10.0 |
| State Management | @preact/signals | ^1.0 |
| CSS | CSS Modules | - |

### Why Preact over React

- バンドルサイズが小さい（~3KB vs ~40KB）
- React 互換の API で学習コストが低い
- Chrome 拡張のパフォーマンスに有利

### Why @crxjs/vite-plugin

- Manifest V3 対応
- HMR（Hot Module Replacement）サポート
- TypeScript の自動設定

## Directory Structure

```
extension/
├── src/
│   ├── background/
│   │   └── index.ts           # Service Worker
│   ├── content/
│   │   └── index.ts           # Content Script
│   ├── sidepanel/
│   │   ├── App.tsx            # Main component
│   │   ├── components/        # UI components
│   │   │   ├── HelperStatus.tsx
│   │   │   ├── ReportForm.tsx
│   │   │   ├── CaptureTools.tsx
│   │   │   ├── ActionTimeline.tsx
│   │   │   └── MarkdownPreview.tsx
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── useTabState.ts
│   │   │   └── useHelper.ts
│   │   ├── store/             # State management
│   │   │   └── signals.ts
│   │   └── index.tsx          # Entry point
│   ├── devtools/
│   │   ├── panel/
│   │   │   └── index.tsx
│   │   └── index.ts
│   ├── shared/
│   │   ├── types/             # Shared type definitions
│   │   │   ├── state.ts
│   │   │   ├── messages.ts
│   │   │   └── api.ts
│   │   └── utils/             # Shared utilities
│   │       ├── messaging.ts
│   │       └── markdown.ts
│   └── styles/
│       └── global.css
├── public/
│   └── icons/
├── manifest.json              # Processed by @crxjs/vite-plugin
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Build Configuration

### vite.config.ts

```ts
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [
    preact(),
    crx({ manifest })
  ],
  build: {
    outDir: "dist",
    sourcemap: process.env.NODE_ENV === "development"
  }
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["chrome"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Migration Phases

### Phase 1: Build Infrastructure

- Vite + TypeScript 環境のセットアップ
- @crxjs/vite-plugin の導入
- 既存 JS ファイルを `.ts` にリネーム（型エラーは許容）
- ビルド・動作確認

### Phase 2: Type Definitions

- 共有型定義の作成（messages, state, api）
- 各ファイルへの型付け
- 型エラーの解消

### Phase 3: Preact Migration (Sidepanel)

- Preact + Signals の導入
- sidepanel.js をコンポーネント分割
- CSS Modules への移行

### Phase 4: DevTools Panel Migration

- devtools-panel.js の Preact 化
- コンポーネント共有の検討

## Message Types

```ts
// src/shared/types/messages.ts
export type MessageType =
  | "GET_ACTIVE_TAB_STATE"
  | "START_AREA_PICKER"
  | "START_CAPTURE_PICKER"
  | "AREA_SELECTED"
  | "CAPTURE_RECT_SELECTED"
  | "ACTION_LOGGED"
  | "CONSOLE_EVENT"
  | "NETWORK_EVENT"
  | "STATE_UPDATED"
  // ... etc

export type Message = {
  type: MessageType;
  tabId?: number;
  payload?: unknown;
};
```

## State Shape

```ts
// src/shared/types/state.ts
export type TabState = {
  selectedArea: SelectedArea | null;
  captureRect: CaptureRect | null;
  actions: UserAction[];
  actionHistoryPast: UserAction[][];
  actionHistoryFuture: UserAction[][];
  consoleEntries: ConsoleEntry[];
  networkEntries: NetworkEntry[];
  screenshotDataUrl: string;
  draft: IssueDraft;
};

export type SelectedArea = {
  url: string;
  pageTitle: string;
  browser: string;
  selector: string;
  xpath: string;
  tagName: string;
  id: string;
  classes: string[];
  role: string;
  ariaLabel: string;
  textSnippet: string;
  rect: Rect;
  framework: FrameworkInfo | null;
  viewport: Viewport;
};

// ... additional types
```

## Development Workflow

```bash
# Install dependencies
cd extension
npm install

# Development with HMR
npm run dev

# Production build
npm run build

# Type check
npm run typecheck
```

## Notes

- Content Script は DOM 操作が中心のため、Preact 化の優先度は低い
- Background Service Worker は状態管理のみのため、TypeScript 化のみで十分
- CSS Modules は sidepanel / devtools-panel のみに適用
