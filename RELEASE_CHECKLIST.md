# Release checklist

Everything to do before, during and after a DNSwitch release. [RELEASING.md](RELEASING.md) explains the tagging mechanics; this file is the work that must be finished and checked first. Copy the quick list into the release issue or PR and tick it off.

## Quick list

- [ ] Version and scope decided (patch, minor or major)
- [ ] Open Dependabot PRs reviewed; Electron or electron-builder updates tested before merging
- [ ] `main` is clean and CI is green
- [ ] Local tests pass on the final code (unit, layout, UI) and DNS was restored afterwards
- [ ] `npm run dist` succeeds; both exes are the expected size
- [ ] Portable exe passes layout and UI tests; installer installs, runs and uninstalls cleanly
- [ ] Manual checks done (see section 4)
- [ ] `CHANGELOG.md`, `package.json` and docs updated for the version
- [ ] Release commit pushed, CI green, tag pushed
- [ ] Draft release checked: three files, notes, checksums, smoke test of the downloaded exe
- [ ] Published; latest release and README links verified

## 1. Decide the release

- Choose the version with [Semantic Versioning](https://semver.org/): patch for fixes, minor for features, major for breaking changes. Suffix `-beta.1` or `-rc.1` for pre-releases.
- List what is going in. Anything unfinished or untested stays out; the release is whatever is on `main`.
- Review open Dependabot pull requests. A new Electron major version or an electron-builder major can change window behaviour, the installer, or the build, so merge it only after sections 2 and 3 pass with it. Close updates you are not ready for.
- Check open issues for anything that should block the release.

## 2. Test locally on the final code

Prerequisites: an **elevated** terminal (Run as administrator), Node 22, and no leftover app processes:

```powershell
Get-Process electron,DNSwitch* -ErrorAction SilentlyContinue | Stop-Process -Force
```

Run the tests **one at a time, never in parallel**:

```
git status                    # must be clean
npm ci
npm test                      # unit tests, no system changes
npm run test:layout           # window min size, 7 viewport sizes, stress content, zoom (no DNS changes)
node tests/ui.test.js         # end to end; changes your real Wi-Fi DNS and restores it
```

- The UI test changes real DNS settings. If a run is interrupted, DNS can be left on a test server. Afterwards confirm it is back to what it was:
  ```powershell
  Get-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4
  ```
  To return to automatic: `node -e "require('./src/dns').applyDns(<ifIndex>, null)"` or use the app's "Reset to automatic DNS" button.
- A test that fails once and passes on a clean rerun is a flake; note it. A test that fails twice is a bug: fix it before releasing.
- Optional but useful: `LIVE=1 node --test tests/backend.test.js` runs the backend against the real adapter.

## 3. Build and verify the artifacts

```
npm run dist
```

- Expect `dist/DNSwitch-<version>-setup.exe` and `dist/DNSwitch-<version>-portable.exe`, each about 98 MB with Electron 44 (it was about 70 MB on Electron 33). A change of more than about 10 MB without an Electron update means something unintended was packaged; look at `dist/win-unpacked` before going on.
- Do **not** add `"compression": "maximum"` to the build config: it crashed the installer and saved nothing.
- Admin setting: `dist/win-unpacked/DNSwitch.exe` must contain `requireAdministrator` (the app asks for permission once at launch).
- Test the **portable exe** with the same suites (kill stray processes between runs):
  ```
  set APP_EXE=D:\path\to\DNSwitch-<version>-portable.exe
  node tests/layout.test.js
  node tests/ui.test.js
  ```
- Test the **installer**: silent install to a scratch folder, run the tests against the installed exe, then uninstall.
  ```powershell
  $d = "$env:TEMP\dnsw-installtest"
  Start-Process .\dist\DNSwitch-<version>-setup.exe -ArgumentList '/S',"/D=$d" -Wait   # exit code 0
  # APP_EXE=$d\DNSwitch.exe, run layout and UI tests
  Start-Process "$d\Uninstall DNSwitch.exe" -ArgumentList '/S' -Wait
  ```
  Afterwards `$d\DNSwitch.exe` must be gone and no `DNSwitch` shortcut left on the Desktop or in the Start menu.

## 4. Manual checks automation cannot do

- [ ] **A PC with User Account Control turned on** (the development PC has it off, so this path is still untested): the app shows one UAC prompt at launch; choosing No closes it cleanly; after Yes, applying a preset works with no further prompts.
- [ ] Windows display scaling at 125% and 150%: nothing clipped, text readable.
- [ ] A PC with more than one active adapter (Wi-Fi plus Ethernet or VPN): the adapter selector lists them and changes only the chosen one.
- [ ] Look at the real window once at the default size and at the minimum size (440 x 560).
- [ ] Switch Wi-Fi networks while the app is open: the name and DNS update within a few seconds.
- [ ] Fresh Windows profile or a clean machine if available: first launch, presets seeded, nothing crashes.

## 5. Update documents and metadata

- [ ] `CHANGELOG.md`: move the `[Unreleased]` entries into `## [X.Y.Z] - YYYY-MM-DD` (Added, Changed, Fixed, Removed), leave an empty `[Unreleased]` above it, update the compare links at the bottom. The release workflow fails if this section is missing.
- [ ] `package.json` and `package-lock.json`: `npm version X.Y.Z --no-git-tag-version`. The tag must match this version exactly.
- [ ] `README.md`: download names and the example checksum command still match the new version.
- [ ] If the UI or tokens changed: `DESIGN.md`, `src/tokens.css` and `design/kit.html` agree, and the published Claude design system is updated to match.
- [ ] If DNS handling changed: `SECURITY.md` and `PRODUCT.md` limits still describe reality; user input must still pass validation before reaching PowerShell.
- [ ] Known limitations in `CHANGELOG.md` are still true (IPv4 only, unsigned build, UAC path untested).

## 6. Commit, tag, publish

```
git add CHANGELOG.md package.json package-lock.json README.md
git commit -m "Release X.Y.Z"
git push origin main
```

- [ ] Wait for CI on that commit to go green.
- [ ] `git tag -a vX.Y.Z -m "vX.Y.Z"` then `git push origin vX.Y.Z`.
- [ ] The Release workflow creates a **draft**. Check it:
  - the draft has `*-setup.exe`, `*-portable.exe` and `SHA256SUMS.txt`
  - the notes match the changelog section
  - download the files and compare `Get-FileHash <file> -Algorithm SHA256` with `SHA256SUMS.txt`
  - run the layout and UI tests (or at least launch and apply a preset) against the **downloaded** portable exe, not your local build
- [ ] Publish: `gh release edit vX.Y.Z --draft=false --latest` (or the Publish button).
- [ ] Verify: `gh release view vX.Y.Z`, the Releases page shows it as Latest, README badges and download link work.

## 7. After the release

- [ ] Confirm your own Windows DNS is back to its normal setting.
- [ ] Look at the Dependabot PRs that arrived during the release.
- [ ] Watch new issues for a day or two; a regression is fixed with a patch release, never by moving the tag.

## If the release is wrong

- **Draft or just tagged, not published:** delete the draft and the tag (`git tag -d vX.Y.Z`, `git push origin :refs/tags/vX.Y.Z`), fix, and tag again.
- **Published:** never move or delete the tag. Ship a patch release with the fix and mention the problem in its notes. For a dangerous build, mark it as a pre-release or delete the release, then publish the fix.
