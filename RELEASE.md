# Release Process

This document describes how to create a new release of Auto Claude.

## Automated Release Process (Recommended)

We provide an automated script that handles version bumping, git commits, and tagging to ensure version consistency.

### Prerequisites

- Clean git working directory (no uncommitted changes)
- You're on the branch you want to release from (usually `main`)

### Steps

1. **Run the version bump script:**

   ```bash
   # Bump patch version (2.5.5 -> 2.5.6)
   node scripts/bump-version.js patch

   # Bump minor version (2.5.5 -> 2.6.0)
   node scripts/bump-version.js minor

   # Bump major version (2.5.5 -> 3.0.0)
   node scripts/bump-version.js major

   # Set specific version
   node scripts/bump-version.js 2.6.0
   ```

   This script will:
   - ✅ Update `auto-claude-ui/package.json` with the new version
   - ✅ Create a git commit with the version change
   - ✅ Create a git tag (e.g., `v2.5.6`)
   - ⚠️  **NOT** push to remote (you control when to push)

2. **Review the changes:**

   ```bash
   git log -1              # View the commit
   git show v2.5.6         # View the tag
   ```

3. **Push to GitHub:**

   ```bash
   # Push the commit
   git push origin main

   # Push the tag
   git push origin v2.5.6
   ```

4. **Automated builds will trigger:**

   When you push the tag, the GitHub Actions workflow will automatically:

   - ✅ Build the Electron app for all platforms (macOS Intel, macOS ARM64, Windows, Linux)
   - ✅ Generate release artifacts (.dmg, .exe, .AppImage, .deb)
   - ✅ Create `latest.yml` for auto-updater support
   - ✅ Upload artifacts to GitHub releases
   - ✅ Run tests (`test-on-tag.yml`)
   - ✅ Build native module prebuilds (`build-prebuilds.yml`)
   - ✅ Send Discord notification (`discord-release.yml`)

   You can monitor the build progress at: `https://github.com/AndyMik90/Auto-Claude/actions`

5. **Wait for release to be created:**

   The `release.yml` workflow will automatically create a GitHub Release with:
   - Auto-generated changelog
   - All platform installers
   - SHA256 checksums
   - VirusTotal scan results (if API key configured)

   **Note:** You don't need to manually create a release - the workflow does this automatically!

## Manual Release Process (Not Recommended)

If you need to create a release manually, follow these steps **carefully** to avoid version mismatches:

1. **Update `auto-claude-ui/package.json`:**

   ```json
   {
     "version": "2.5.6"
   }
   ```

2. **Commit the change:**

   ```bash
   git add auto-claude-ui/package.json
   git commit -m "chore: bump version to 2.5.6"
   ```

3. **Create and push tag:**

   ```bash
   git tag -a v2.5.6 -m "Release v2.5.6"
   git push origin main
   git push origin v2.5.6
   ```

4. **Create GitHub Release** (same as step 4 above)

## Version Validation

A GitHub Action automatically validates that the version in `package.json` matches the git tag.

If there's a mismatch, the workflow will **fail** with a clear error message:

```
❌ ERROR: Version mismatch detected!

The version in package.json (2.5.0) does not match
the git tag version (2.5.5).

To fix this:
  1. Delete this tag: git tag -d v2.5.5
  2. Update package.json version to 2.5.5
  3. Commit the change
  4. Recreate the tag: git tag -a v2.5.5 -m 'Release v2.5.5'
```

This validation ensures we never ship a release where the updater shows the wrong version.

## Troubleshooting

### Version Mismatch Error

If you see a version mismatch error in GitHub Actions:

1. **Delete the incorrect tag:**
   ```bash
   git tag -d v2.5.6                    # Delete locally
   git push origin :refs/tags/v2.5.6    # Delete remotely
   ```

2. **Use the automated script:**
   ```bash
   node scripts/bump-version.js 2.5.6
   git push origin main
   git push origin v2.5.6
   ```

### Git Working Directory Not Clean

If the version bump script fails with "Git working directory is not clean":

```bash
# Commit or stash your changes first
git status
git add .
git commit -m "your changes"

# Then run the version bump script
node scripts/bump-version.js patch
```

## Release Checklist

Use this checklist when creating a new release:

- [ ] All tests passing on main branch
- [ ] CHANGELOG updated (if applicable)
- [ ] Run `node scripts/bump-version.js <type>`
- [ ] Review commit and tag
- [ ] Push commit and tag to GitHub
- [ ] Monitor GitHub Actions for workflow completion
- [ ] Verify release was created automatically with all artifacts
- [ ] Verify `latest.yml` is present in release assets
- [ ] Verify version validation passed
- [ ] Verify builds completed successfully for all platforms
- [ ] Test the updater shows correct version

## What Gets Released

When you push a tag, the following are automatically built and published:

1. **Electron App Packages** - Built by `release.yml` workflow:
   - macOS Intel (.dmg + .zip)
   - macOS Apple Silicon (.dmg + .zip)
   - Windows (.exe)
   - Linux (.AppImage + .deb)
   - `latest.yml` - Auto-updater metadata file
   - `checksums.sha256` - SHA256 checksums for all artifacts

2. **Native Module Prebuilds** - Built by `build-prebuilds.yml`:
   - Windows node-pty binaries

3. **Notifications**:
   - Discord notification sent to community

## Auto-Updater

The `latest.yml` file is critical for the auto-updater to work properly. This file is **automatically generated** by electron-builder during the release workflow.

### How Auto-Updater Works

1. User runs the packaged Auto-Claude app
2. App checks `https://github.com/AndyMik90/Auto-Claude/releases/download/v{version}/latest.yml`
3. If a newer version exists, app downloads and installs it
4. User is prompted to restart

### Troubleshooting Auto-Updater 404 Errors

If users see a 404 error when checking for updates:

1. **Verify the release workflow ran:**
   - Go to https://github.com/AndyMik90/Auto-Claude/actions
   - Check that `release.yml` completed successfully

2. **Verify `latest.yml` was uploaded:**
   - Go to the release page (e.g., https://github.com/AndyMik90/Auto-Claude/releases/tag/v2.6.0)
   - Confirm `latest.yml` is listed in the assets

3. **If missing:**
   - Re-run the release workflow manually from GitHub Actions
   - Or delete the release and tag, then re-create them following the automated process above

## Version Numbering

We follow [Semantic Versioning (SemVer)](https://semver.org/):

- **MAJOR** version (X.0.0) - Breaking changes
- **MINOR** version (0.X.0) - New features (backward compatible)
- **PATCH** version (0.0.X) - Bug fixes (backward compatible)

Examples:
- `2.5.5 -> 2.5.6` - Bug fix
- `2.5.6 -> 2.6.0` - New feature
- `2.6.0 -> 3.0.0` - Breaking change
