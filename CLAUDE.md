# DNSwitch

Windows 10/11 Electron app (plain JavaScript, CommonJS, no framework, no bundler) that shows and switches IPv4 DNS for the Wi-Fi adapter by running PowerShell. It runs as administrator, so treat every change as security sensitive.

## Layout

- `src/main.js`: main process and IPC (handlers return `{ok, data|error}`)
- `src/dns.js`: every PowerShell call and the input validation
- `src/presets.js`: preset store (`presets.json` in userData)
- `src/preload.js`: the `window.api` bridge
- `src/renderer.js`, `index.html`, `styles.css`, `tokens.css`: the UI

Read `PRODUCT.md` before product decisions and `DESIGN.md` before any UI change. `PRODUCT.md` lists what is undecided (IPv6, DoH/DoT, other Windows versions): ask instead of assuming.

## Testing

- `npm test` runs the unit tests. It works on Linux, even without `npm install`. Run it before every commit and add or update tests for behaviour you change.
- `npm run test:layout` and `node tests/ui.test.js` need Windows with a desktop, and `ui.test.js` changes real DNS. Do not run them in a cloud session. Say in the PR which of them still need to be run on a Windows PC.
- `npm run dist` builds Windows installers; CI does this on `windows-latest`. Do not try it on Linux.

## Rules

- Any value that reaches PowerShell must pass the checks in `src/dns.js` (`isValidIPv4`, integer adapter index). Never interpolate adapter names, preset names or other free text into a script. Add a backend test for any new input path.
- UI: use the tokens in `src/tokens.css` only. Text contrast 4.5:1, control borders 3:1, no sideways scrolling at the 440 x 560 minimum window. Keep `DESIGN.md`, `src/tokens.css` and `design/kit.html` in sync.
- No telemetry and no network calls from the app (`SECURITY.md` promises this). Do not add a dependency for something a few lines can do.
- Add a line under `## [Unreleased]` in `CHANGELOG.md` for anything users would notice.
- Commit messages: short, imperative ("Fix chip wrapping"). One topic per PR; fill in `.github/PULL_REQUEST_TEMPLATE.md`.
- `main` is protected by a required CI check (`test-and-build`). Work on a branch and open a PR. Never push to `main`, never create, move or delete `v*` tags, and never publish a release; releases follow `RELEASE_CHECKLIST.md` and `RELEASING.md`.
- Electron or electron-builder major updates (including Dependabot PRs) need the Windows layout and UI tests before merging: flag them, do not merge them.
- Do not add `"compression": "maximum"` to the build config (it broke the installer).
- Do not invent user research, testimonials or usage data.
