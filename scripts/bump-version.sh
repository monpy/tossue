#!/usr/bin/env bash
#
# bump-version.sh - Synchronize version numbers across all packages
#
# Usage:
#   ./scripts/bump-version.sh <new-version>
#
# Example:
#   ./scripts/bump-version.sh 0.2.0
#

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new-version>"
  echo "Example: $0 0.2.0"
  exit 1
fi

NEW_VERSION="$1"

# Validate semver format
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: Version must follow semver format (e.g., 0.2.0, 1.0.0-beta.1)"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Bumping version to $NEW_VERSION across all packages..."
echo ""

# Function to update JSON version using node
update_json_version() {
  local file="$1"
  if [ -f "$file" ]; then
    node -e "
      const fs = require('fs');
      const pkg = JSON.parse(fs.readFileSync('$file', 'utf8'));
      pkg.version = '$NEW_VERSION';
      fs.writeFileSync('$file', JSON.stringify(pkg, null, 2) + '\n');
    "
    echo "  OK $file"
  else
    echo "  SKIP $file not found"
  fi
}

# Function to update TOML version
update_toml_version() {
  local file="$1"
  if [ -f "$file" ]; then
    sed -i.bak "s/^version = \".*\"/version = \"$NEW_VERSION\"/" "$file"
    rm -f "${file}.bak"
    echo "  OK $file"
  else
    echo "  SKIP $file not found"
  fi
}

echo "Updating package.json files:"
update_json_version "$REPO_ROOT/package.json"
update_json_version "$REPO_ROOT/packages/extension/package.json"
update_json_version "$REPO_ROOT/packages/helper/package.json"
update_json_version "$REPO_ROOT/packages/oauth-worker/package.json"
update_json_version "$REPO_ROOT/packages/custom-api-demo/package.json"
update_json_version "$REPO_ROOT/packages/demo-sites/next/package.json"
update_json_version "$REPO_ROOT/packages/demo-sites/nuxt/package.json"

echo ""
echo "Updating manifest.json:"
update_json_version "$REPO_ROOT/packages/extension/manifest.json"

echo ""
echo "Updating Tauri config:"
update_json_version "$REPO_ROOT/packages/helper/src-tauri/tauri.conf.json"

echo ""
echo "Updating Cargo.toml:"
update_toml_version "$REPO_ROOT/packages/helper/src-tauri/Cargo.toml"

echo ""
echo "Done! All packages updated to version $NEW_VERSION"
echo ""
echo "Next steps:"
echo "  1. Update CHANGELOG.md with the new version"
echo "  2. Commit: git add -A && git commit -m 'chore: bump version to v$NEW_VERSION'"
echo "  3. Tag:    git tag -a v$NEW_VERSION -m 'Release v$NEW_VERSION'"
echo "  4. Push:   git push origin main --tags"
