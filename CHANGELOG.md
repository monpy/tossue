# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project aims to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-16

### Added
- **Extension & Helper Architecture**: Established monorepo structure with npm workspaces containing:
  - `packages/extension`: Chrome extension for debugging context collection
  - `packages/helper`: Tauri desktop application for supplementary debugging features
  - `packages/oauth-worker`: Cloudflare Worker for OAuth2 flow handling
  - `packages/custom-api-demo`: Custom API demo server
  - `packages/demo-sites`: Next.js and Nuxt demo applications

- **Core Features**:
  - Collect structured debugging context from browser pages
  - Draft GitHub issues for AI-assisted bug fixing
  - DevTools Bridge for communication between extension and helper
  - Sidebar panel (side_panel) UI for issue management
  - Network and Console error capture

- **UI Components & Framework**:
  - Preact-based component system for sidepanel and DevTools panel
  - Preact Signals for reactive state management
  - UnoCSS for utility-first styling
  - Responsive and compact UI design
  - Timeline visualization for debugging events

- **Component Detection**:
  - React/Next.js component detection via page context
  - Vue 3/Nuxt 3 component detection via page context
  - Component trail in timeline visualization
  - Support for both user-defined and built-in components

- **Issue Creation & Settings**:
  - Multiple issue creation modes (issue mode, selection mode, etc.)
  - Settings tab for configuration
  - Label selection and custom label support
  - Repository selection from connected GitHub account
  - Helper integration status display
  - Inline setting display based on mode selection

- **Custom Scripts & File Upload**:
  - Custom script configuration for file attachment uploads
  - Support for arbitrary script execution with settings
  - Script enable/disable toggle with status indicator
  - Integration with Helper for extended functionality

- **Authentication**:
  - Persistent token authentication between Helper and Extension
  - GitHub OAuth2 support via dedicated OAuth worker
  - GitHub API integration for repository and issue management

- **Build Infrastructure**:
  - Vite + TypeScript build system for extension
  - Tauri framework for desktop helper application
  - ESM module support across packages
  - HMR (Hot Module Replacement) for development

### Fixed
- Network/Console error capture via page context injection
- TypeScript type checking across monorepo
- Tauri capabilities configuration for tray-icon feature
- Component detection for Vue 3/Nuxt 3 frameworks
- Custom component filtering (exclude built-in components)
- PICKER_CANCELLED message forwarding to sidepanel
- Settings window resizing and close button in Helper

### Changed
- Migrated from single-package to monorepo structure (npm workspaces)
- Refactored settings UI with inline mode-specific configuration
- Timeline styling improvements
- Label UI redesign with compact chip display and underline colors
- CaptureTools status display and mutual exclusivity handling
- Label section display based on Helper connection status
- Settings window improvements in Helper (resizable, closeable)
- Mode selection now displays related settings inline

### Removed
- Legacy build artifacts from source control (added to .gitignore)

---

## Repository Information

- **Repository**: [monpy/tossue](https://github.com/monpy/tossue)
- **Initial Commit**: March 14, 2026
- **Current Version**: 0.1.0 (Alpha)
- **Status**: Active Development

### Key Project Components

| Component | Version | Type | Purpose |
|-----------|---------|------|---------|
| tossue (root) | 0.1.0 | Monorepo | Workspace root |
| tossue-extension | 0.1.0 | Chrome Extension | Browser debugging context collection |
| tossue-helper | 0.1.0 | Tauri App | Desktop companion application |
| @tossue/oauth-worker | 0.1.0 | Worker | OAuth2 flow handler |
| tossue-custom-api-demo | 0.1.0 | Demo Server | Custom API demonstration |

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
