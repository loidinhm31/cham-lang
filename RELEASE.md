# Release Process

This document describes how to create a new release for Code Notes.

## Version Management

The app version is synchronized across multiple files:

**Desktop:**

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

**Android:**

- `src-tauri/gen/android/app/tauri.properties`
  - `versionName`: Human-readable version (e.g., "0.1.1")
  - `versionCode`: Integer code auto-calculated from version
    - Formula: `(major × 10000) + (minor × 1000) + patch`
    - Examples: `0.1.0` → `1000`, `0.1.1` → `1001`, `1.0.0` → `10000`

## Creating a New Release

### 1. Bump the Version

Use the version bump script to update all version files at once:

```bash
# Bump patch version (0.1.0 → 0.1.1)
pnpm run version patch

# Bump minor version (0.1.0 → 0.2.0)
pnpm run version minor

# Bump major version (0.1.0 → 1.0.0)
pnpm run version major

# Set specific version
pnpm run version 1.2.3
```

### 2. Commit and Tag

After bumping the version, commit and tag the release:

```bash
# Add changes
git add .

# Commit with version message
git commit -m "chore: bump version to v0.1.1"

# Create a tag
git tag v0.1.1

# Push commits and tags
git push && git push --tags
```

### 3. GitHub Actions

When you push a tag starting with `v`, GitHub Actions will automatically:

- Build the app for Windows and Linux
- Create a GitHub release draft
- Upload the installers as release assets
- Generate updater JSON for auto-updates

### 4. Publish the Release

1. Go to [GitHub Releases](https://github.com/YOUR_USERNAME/YOUR_REPO/releases)
2. Find the draft release
3. Edit the release notes if needed
4. Click "Publish release"

## Manual Build

To build locally without creating a release:

```bash
# Development build
pnpm tauri dev

# Production build
pnpm tauri build

# Android build
pnpm tauri android build
```

## Version Conventions

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version: incompatible API changes
- **MINOR** version: new functionality (backwards compatible)
- **PATCH** version: bug fixes (backwards compatible)

### Examples

- `0.1.0` → `0.1.1`: Bug fix
- `0.1.0` → `0.2.0`: New feature
- `0.1.0` → `1.0.0`: Major release or breaking changes
