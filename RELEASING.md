# Publishing a New Version

This guide covers how to publish releases for REST in Peace using GitHub Actions and Tauri's auto-updater.

## First-Time Setup

These steps only need to be done once.

### 1. Generate the Updater Signing Key

The signing key is used to verify that updates are authentic. A key pair has already been generated and the public key is configured in `src-tauri/tauri.conf.json`.

If you ever need to regenerate it:

```bash
bun run tauri signer generate -w ~/.tauri/rest-in-peace.key
```

This prints a **public key** to the console and saves the **private key** to `~/.tauri/rest-in-peace.key`. Replace the `pubkey` value in `src-tauri/tauri.conf.json` with the new public key.

> **Warning:** Changing the public key means older app versions cannot verify updates signed with the new key. Users on older versions would need to manually download the new version.

### 2. Add GitHub Repository Secrets

Go to your repository on GitHub: **Settings > Secrets and variables > Actions** and create these secrets:

| Secret | Value |
|--------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | The full contents of `~/.tauri/rest-in-peace.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password you chose during key generation (leave empty if none) |

### 3. Create the GitHub Actions Workflow

Create the file `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  release:
    permissions:
      contents: write
    strategy:
      matrix:
        include:
          - platform: windows-latest
            args: ""
          # Uncomment to add more platforms:
          # - platform: macos-latest
          #   args: "--target aarch64-apple-darwin"
          # - platform: macos-latest
          #   args: "--target x86_64-apple-darwin"
          # - platform: ubuntu-22.04
          #   args: ""
    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: bun install

      - uses: dtolnay/rust-toolchain@stable

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: "v__VERSION__"
          releaseBody: "See the assets to download and install this version."
          releaseDraft: true
          prerelease: false
```

The `tauri-action` will:
- Build the app for each platform in the matrix
- Sign the update bundles with your private key
- Create a draft GitHub release with the installers and a `latest.json` file (used by the auto-updater)

## Publishing a Release

Follow these steps every time you want to publish a new version.

### 1. Bump the Version

Update the version in both files to the same value:

- `package.json` — `"version"` field
- `src-tauri/tauri.conf.json` — `"version"` field

Use [semantic versioning](https://semver.org/) (e.g., `0.2.0`, `1.0.0`, `1.1.0`).

### 2. Commit and Tag

```bash
git add package.json src-tauri/tauri.conf.json
git commit -m "Bump version to 0.2.0"
git tag v0.2.0
git push origin main --tags
```

### 3. Wait for the Build

Pushing the tag triggers the GitHub Actions workflow. You can monitor progress in your repository under **Actions**.

### 4. Publish the Release

Once the workflow completes:

1. Go to your repository's **Releases** page on GitHub
2. Find the draft release created by the action
3. Edit the release notes if desired
4. Click **Publish release**

After publishing, the `latest.json` file at `https://github.com/LeanZo/rest-in-peace/releases/latest/download/latest.json` is updated automatically. Existing app installations will detect the new version on their next update check.

## How Auto-Update Works

1. On app startup (if auto-update is enabled in settings), the app fetches `latest.json` from the GitHub releases endpoint
2. If a newer version is found, the update is downloaded in the background
3. Once downloaded, a green **Update** button appears in the top bar and on the Settings > Updates page
4. The user clicks the button to restart and apply the update

## Troubleshooting

- **Build fails in CI:** Check that `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets are set correctly
- **Update not detected:** Ensure the version in `tauri.conf.json` was actually incremented and the release is published (not draft)
- **Signature verification fails:** The public key in `tauri.conf.json` must match the private key used to sign the build. If you regenerated keys, users on old versions must manually update
