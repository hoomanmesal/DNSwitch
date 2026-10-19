# Releasing DNSwitch

Releases use [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **PATCH** (1.0.0 to 1.0.1): bug fixes only.
- **MINOR** (1.0.0 to 1.1.0): new features that keep working as before.
- **MAJOR** (1.0.0 to 2.0.0): changes that break existing behaviour, such as a different presets file format.
- **Pre-release**: add a suffix, for example `1.1.0-beta.1`. The workflow marks any tag containing `-` as a pre-release.

Do the work in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) first; this file covers the tagging mechanics.

A release is a git tag `vX.Y.Z`. Pushing the tag builds the installer and the portable exe on GitHub and attaches them, with checksums, to a **draft** release. Nothing is public until you press Publish.

## Steps

1. Make sure `main` is green (the CI badge in the README) and you have run the local tests on the final code:
   ```
   npm test
   node tests/ui.test.js      # elevated shell
   npm run test:layout
   ```
2. In `CHANGELOG.md`, rename `## [Unreleased]` content into a new section `## [X.Y.Z] - YYYY-MM-DD` (Added, Changed, Fixed, Removed), leave an empty `## [Unreleased]` above it, and update the link references at the bottom.
3. Set the same version in `package.json` (`"version": "X.Y.Z"`; `npm version X.Y.Z --no-git-tag-version` does it and updates the lockfile).
4. Commit and push:
   ```
   git add CHANGELOG.md package.json package-lock.json
   git commit -m "Release X.Y.Z"
   git push origin main
   ```
5. Wait for CI on that commit to pass, then tag and push the tag:
   ```
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```
6. Open the **Actions** tab and wait for the **Release** run. It fails early if the tag does not match `package.json` or if `CHANGELOG.md` has no section for the version.
7. Open **Releases**, open the draft, and check: the notes read well, the three files are attached (`*-setup.exe`, `*-portable.exe`, `SHA256SUMS.txt`), and download plus run the installer once.
8. Press **Publish release**.

## If something is wrong

- **Before publishing:** delete the draft release and the tag, fix the problem, and tag again:
  ```
  git tag -d vX.Y.Z
  git push origin :refs/tags/vX.Y.Z
  ```
- **After publishing:** never move or delete a published tag. Fix forward with a new patch release (`vX.Y.Z+1`) and mention the problem in its notes. If a release is dangerous, edit it and tick "Set as a pre-release" or delete it, and publish the fix.
- **Fixing an old version:** branch from its tag (`git switch -c release/1.0.x v1.0.0`), apply the fix, bump to `1.0.1`, and tag from that branch.

## Verifying a download

Each release includes `SHA256SUMS.txt`. Compare it with:

```powershell
Get-FileHash .\DNSwitch-X.Y.Z-setup.exe -Algorithm SHA256
```

## Not set up yet

- **Code signing:** builds are unsigned, so Windows SmartScreen warns on first run. Options when it matters: [SignPath Foundation](https://signpath.org/) (free for open source) or a purchased code-signing certificate stored as a GitHub Actions secret.
- **Auto-update:** not included. It would use `electron-updater` with the installer build.

## Repository protection

Two GitHub rulesets are active (Settings, Rules):

- **Protect main:** `main` cannot be deleted or force-pushed, and changes must pass the `test-and-build` CI check. The repository owner can bypass, so direct pushes and the release commit still work.
- **Protect release tags:** tags matching `v*` cannot be moved, updated or deleted. Only the owner can bypass, which is what makes "delete the draft and its tag" possible before a release is published.

Never use the bypass to rewrite a published release tag; ship a new patch version instead.

