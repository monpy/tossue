# Tossue

Tossue is a browser extension prototype for collecting structured bug context and turning it into GitHub issues that humans and AI can both work with.

## Docs

- [Product overview](docs/product-overview.md)
- [Manual testing guide](docs/manual-testing.md)

## Repository Layout

- `extension/`: Manifest V3 extension prototype
- `helper/`: Tauri-based local helper app for `gh` integration
- `docs/`: product background, scope, and testing notes

## Quick Start

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the `extension` folder
5. Start the helper app in `helper/` if you want direct GitHub issue creation
