# Release Command

Prepare a new release version for the Tossue project.

## Arguments

- $ARGUMENTS: Version number (e.g., "0.2.0") or bump type ("patch", "minor", "major")

## Workflow

### 1. Determine New Version

If argument is a bump type (patch/minor/major):
- Read current version from `package.json`
- Calculate new version based on semver

If argument is a version number:
- Validate semver format
- Use as new version

### 2. Update Version Across Packages

Run the bump-version script:
```bash
./scripts/bump-version.sh <new-version>
```

### 3. Update CHANGELOG.md

- Move `[Unreleased]` section to new version header
- Add release date
- Create new empty `[Unreleased]` section
- Ask user to review/edit changelog entries

### 4. Create Release Commit

```bash
git add -A
git commit -m "chore: release v<version>"
```

### 5. Create Git Tag

```bash
git tag -a v<version> -m "Release v<version>"
```

### 6. Push (with confirmation)

Ask user before pushing:
```bash
git push origin <branch> --tags
```

## Notes

- This will trigger GitHub Actions workflows for building extension and helper
- Draft releases will be created automatically on GitHub
- User should review and publish the draft release manually

## Example Usage

```
/release 0.2.0
/release patch
/release minor
```
