# Release Process

This document describes the versioning strategy and release procedures for the Tossue project.

## Versioning Policy

The Tossue project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (SemVer):

- **MAJOR** version (X.0.0): Breaking changes
- **MINOR** version (0.X.0): New features (backward compatible)
- **PATCH** version (0.0.X): Bug fixes (backward compatible)

### Version Format

- Versions are tagged as: `vX.Y.Z` (e.g., `v0.1.0`, `v1.0.0`)
- Pre-release versions use: `vX.Y.Z-alpha`, `vX.Y.Z-beta`, `vX.Y.Z-rc.1`

## Project Components and Versioning

The Tossue monorepo contains multiple packages that should maintain synchronized versioning:

| Package | Path | Type | Status |
|---------|------|------|--------|
| tossue (root) | `.` | Monorepo Root | Primary version source |
| tossue-extension | `packages/extension/` | Chrome Extension | Should match root version |
| tossue-helper | `packages/helper/` | Tauri Desktop App | Should match root version |
| @tossue/oauth-worker | `packages/oauth-worker/` | Cloudflare Worker | Should match root version |
| tossue-custom-api-demo | `packages/custom-api-demo/` | Demo Server | Should match root version |
| @tossue/demo-next | `packages/demo-sites/next/` | Demo App | Should match root version |
| @tossue/demo-nuxt | `packages/demo-sites/nuxt/` | Demo App | Should match root version |

**Current Status**: All packages are at version `0.1.0`

## Release Checklist

### Pre-Release Steps

- [ ] **Ensure main branch is ready**
  - All features are merged to `main` or target branch
  - All tests are passing
  - Code review is completed

- [ ] **Update CHANGELOG.md**
  - Document all changes under the new version header
  - Follow the [Keep a Changelog](https://keepachangelog.com/) format
  - Organize changes into: Added, Changed, Deprecated, Removed, Fixed, Security
  - Update the Unreleased section if there are pending changes

- [ ] **Version Synchronization**
  - Root package: `package.json` version
  - Extension: `packages/extension/package.json` and `packages/extension/manifest.json`
  - Helper: `packages/helper/package.json`
  - OAuth Worker: `packages/oauth-worker/package.json`
  - Demo servers: `packages/demo-sites/*/package.json`
  - Custom API Demo: `packages/custom-api-demo/package.json`

- [ ] **Verify Build**
  ```bash
  npm run build:extension
  npm run build:helper
  # or for individual packages
  npm run build -w packages/extension
  npm run tauri:build -w packages/helper
  ```

- [ ] **Type Checking**
  ```bash
  npm run typecheck:extension
  npm run typecheck -w packages/oauth-worker
  tsc --noEmit -w packages/custom-api-demo
  ```

### Release Steps

- [ ] **Create Release Branch** (if using release branches)
  ```bash
  git checkout -b release/v0.2.0
  ```

- [ ] **Commit Version Updates**
  ```bash
  git add package.json packages/*/package.json packages/extension/manifest.json
  git commit -m "chore: Bump version to v0.2.0"
  ```

- [ ] **Create and Push Git Tag**
  ```bash
  git tag -a v0.2.0 -m "Release v0.2.0"
  git push origin main --tags
  # or if using release branch
  git push origin release/v0.2.0
  ```

- [ ] **Create GitHub Release**
  - Go to GitHub Releases page
  - Click "Draft a new release"
  - Select the tag you just created
  - Title: `Release v0.2.0`
  - Copy relevant section from CHANGELOG.md as description
  - Attach release artifacts if applicable
  - Click "Publish release"

### Post-Release Steps

- [ ] **Monitor for Issues**
  - Watch GitHub issues for bug reports
  - Monitor deployment logs

- [ ] **Announce Release**
  - Update project documentation
  - Announce in relevant channels (if applicable)

- [ ] **Plan Next Release**
  - Update CHANGELOG.md with `[Unreleased]` section
  - Plan next version number and features

## Extension Release Process

### Chrome Web Store Release

1. **Build the extension**
   ```bash
   npm run build:extension
   ```

2. **Prepare distribution package**
   - The built extension is in `packages/extension/dist/`
   - Create a zip file: `tossue-extension-v0.2.0.zip`

3. **Upload to Chrome Web Store**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Select your app
   - Click "Package" and upload the new zip file
   - Fill in version notes (use CHANGELOG entries)
   - Submit for review

4. **Monitor Review Status**
   - Track the review status in the developer dashboard
   - Address any reviewer comments
   - Re-submit if needed

### Extension Version Update Details

- Update `packages/extension/package.json`:
  ```json
  {
    "name": "tossue-extension",
    "version": "0.2.0"
  }
  ```

- Update `packages/extension/manifest.json`:
  ```json
  {
    "name": "Tossue",
    "version": "0.2.0"
  }
  ```

## Helper Release Process

### Desktop App Release

1. **Build the helper**
   ```bash
   npm run build:helper
   ```

2. **Locate Build Artifacts**
   - macOS: `packages/helper/src-tauri/target/release/bundle/macos/`
   - Windows: `packages/helper/src-tauri/target/release/bundle/msi/`
   - Linux: `packages/helper/src-tauri/target/release/bundle/deb/`

3. **Create Release Assets**
   - Bundle and sign artifacts according to platform requirements
   - Generate checksums (SHA256)

4. **Publish to GitHub Releases**
   - Upload build artifacts
   - Include platform-specific installation instructions
   - Add changelog entries

### Helper Version Update Details

- Update `packages/helper/package.json`:
  ```json
  {
    "name": "tossue-helper",
    "version": "0.2.0"
  }
  ```

- Tauri automatically manages version in `src-tauri/tauri.conf.json`

## OAuth Worker Release Process

### Cloudflare Worker Deployment

1. **Ensure version is updated**
   ```json
   {
     "name": "@tossue/oauth-worker",
     "version": "0.2.0"
   }
   ```

2. **Deploy to Cloudflare**
   ```bash
   npm run deploy -w @tossue/oauth-worker
   ```

3. **Verify Deployment**
   - Test OAuth flow with the deployed worker
   - Verify request handling

## Demo Sites Release Process

1. **Update demo site versions**
   - `packages/demo-sites/next/package.json`
   - `packages/demo-sites/nuxt/package.json`

2. **Build demo sites** (if hosting)
   ```bash
   npm run build -w @tossue/demo-next
   npm run build -w @tossue/demo-nuxt
   ```

3. **Deploy** (if hosting on external platform)
   - Deploy Next.js demo to Vercel or similar
   - Deploy Nuxt demo to appropriate hosting

## Version Synchronization Policy

All packages in the monorepo maintain **synchronized versioning** — every package shares the same version number. This simplifies version tracking, makes releases clearer for users, and reduces confusion about compatibility.

Use the `scripts/bump-version.sh` script to ensure all packages are updated consistently.

> **Note**: If independent versioning is ever needed (e.g., the extension and helper diverge significantly), this policy should be revisited.

## Automated CI/CD

### GitHub Actions Workflows

The project includes two GitHub Actions workflows that trigger on version tags (`v*`):

#### 1. Build Extension (`.github/workflows/build-extension.yml`)
- Runs type checking and builds the Chrome extension
- Creates a zip package for Chrome Web Store upload
- Generates SHA256 checksums
- Attaches artifacts to GitHub Releases (as draft)

#### 2. Release Helper (`.github/workflows/release-helper.yml`)
- Builds the Tauri helper app for multiple platforms:
  - macOS (Apple Silicon / Intel)
  - Linux (x86_64, .deb / .AppImage)
  - Windows (x86_64, .msi / .exe)
- Generates SHA256 checksums for all artifacts
- Creates a draft GitHub Release with all platform binaries

### Triggering a Release

```bash
# Tag and push to trigger both workflows
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin main --tags
```

Both workflows can also be triggered manually via the GitHub Actions UI (`workflow_dispatch`).

## Version Bump Script

Use the `scripts/bump-version.sh` script to synchronize versions across all packages:

```bash
# Bump all packages to a new version
./scripts/bump-version.sh 0.2.0
```

This script updates:
- All `package.json` files (root + all packages)
- `packages/extension/manifest.json`
- `packages/helper/src-tauri/tauri.conf.json`
- `packages/helper/src-tauri/Cargo.toml`

## Quick Reference Commands

```bash
# Bump version across all packages
./scripts/bump-version.sh 0.2.0

# Check current versions across all packages
npm list version

# Build all packages
npm run build:extension
npm run build:helper

# Type check all packages
npm run typecheck:extension
npm run typecheck -w @tossue/oauth-worker

# Create a new tag
git tag -a v0.2.0 -m "Release v0.2.0"

# Push tags
git push origin --tags

# View release history
git log --oneline --all --decorate
```

## References

- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [Chrome Web Store Publishing Guidelines](https://developer.chrome.com/docs/webstore/publish/)
- [Tauri Release Documentation](https://tauri.app/v1/guides/distribution/)
- [Cloudflare Workers Deployment](https://developers.cloudflare.com/workers/platform/deployments/)

## Troubleshooting

### Version Mismatch Issues

If versions become out of sync:
1. Identify the source of truth (root package.json)
2. Update all other package versions to match
3. Commit with message: `chore: Synchronize package versions to X.Y.Z`

### Build Failures

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear build caches for extension: `rm -rf packages/extension/dist`
- For helper, clean Rust build: `cd packages/helper && cargo clean`

### Failed Release

If a release fails partway through:
1. Delete the tag locally: `git tag -d v0.2.0`
2. Delete remote tag: `git push origin --delete v0.2.0`
3. Fix the issue
4. Retry release process

---

**Last Updated**: 2026-03-16
**Version**: 1.0
