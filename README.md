# Tossue

Tossue is a browser extension for collecting structured bug context and turning it into GitHub issues that humans and AI can both work with.

## Docs

- [Product overview](docs/product-overview.md)
- [Extension architecture](docs/extension-architecture.md)
- [Manual testing guide](docs/manual-testing.md)
- [Contributing guide](docs/contributing.md)

## Repository Layout

This is a monorepo managed with npm workspaces.

```
packages/
├── extension/     # Chrome extension (Manifest V3)
├── helper/        # Tauri-based local helper app for gh integration
└── demo-sites/    # Demo sites for testing
    ├── nuxt/      # Nuxt 3 (Vue 3) demo - port 3000
    └── next/      # Next.js 15 (React 19) demo - port 3001
```

## Prerequisites

- Node.js 18+
- npm 9+
- Rust (for helper app)

## Quick Start

### Install Dependencies

```bash
npm install
```

### Extension Development

```bash
# Build the extension
npm run build:extension

# Or with HMR (Hot Module Replacement)
npm run dev:extension
```

Then load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select `packages/extension/dist`

### Helper App Development

```bash
# Run the helper app in development mode
npm run dev:helper

# Build for production
npm run build:helper
```

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev:extension` | Start extension dev server with HMR |
| `npm run build:extension` | Build extension for production |
| `npm run typecheck:extension` | Run TypeScript type checking |
| `npm run dev:helper` | Start helper app in dev mode |
| `npm run build:helper` | Build helper app for production |
| `npm run dev:demo:nuxt` | Start Nuxt demo site (port 3000) |
| `npm run dev:demo:next` | Start Next.js demo site (port 3001) |

## Debugging

### Extension

1. Build the extension: `npm run build:extension`
2. Load `packages/extension/dist` in Chrome
3. Open DevTools on the side panel or any page
4. Check the Console for errors
5. Use `chrome://extensions` to inspect the service worker

### HMR Development

For faster development with hot reload:

```bash
npm run dev:extension
```

Changes to sidepanel and devtools panel will auto-reload. Note that content scripts and background service worker changes require a manual extension reload.

## Demo Sites

DevTools Bridge 機能をテストするためのデモサイトが用意されています。

```bash
# Nuxt 3 デモサイト (Vue 3)
npm run dev:demo:nuxt   # http://localhost:3000

# Next.js デモサイト (React 19)
npm run dev:demo:next   # http://localhost:3001
```

デモサイトでは以下をテストできます：
- **Network Errors**: 500/404 エラーのシミュレート
- **Console Errors**: console.error/warn のキャプチャ
- **Runtime Exceptions**: 未キャッチ例外のキャプチャ
- **Component Tracking**: Vue/React コンポーネントの検出

詳細は [packages/demo-sites/README.md](packages/demo-sites/README.md) を参照してください。
