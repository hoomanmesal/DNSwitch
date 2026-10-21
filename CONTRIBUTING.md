# Contributing to DNSwitch

Thanks for helping. Bug reports, ideas and pull requests are welcome.

## Getting set up

Requirements: Node.js 22, and Windows 10 or 11 or Linux with NetworkManager.

```
git clone https://github.com/hoomanmesal/DNSwitch.git
cd DNSwitch
npm install
npm start
```

Run the app from an elevated terminal (Run as administrator) so DNS changes work without a prompt each time.

## Project layout

- `src/` the app: `main.js` (Electron main process), `dns.js` (platform-neutral DNS interface and input validation), `backends/windows.js` (PowerShell), `backends/linux.js` (NetworkManager `nmcli`), `presets.js` (saved presets), `index.html`, `styles.css`, `renderer.js`
- `tests/` unit, UI and layout tests
- `DESIGN.md`, `src/tokens.css` and `design/` the design system; use its tokens instead of new colours or sizes
- `tools/` helper scripts (icon generator, window resizer, release notes)

## Before you open a pull request

```
npm test                 # unit tests, always safe
npm run test:layout      # layout and responsiveness, opens the app window
node tests/ui.test.js    # end to end, elevated shell; changes then restores your Wi-Fi DNS
```

The UI test changes your real DNS settings and restores them at the end. Check your DNS afterwards if a run was interrupted.

## Guidelines

- Keep changes focused; one topic per pull request.
- Match the design system in `DESIGN.md`. UI changes should keep contrast at 4.5:1 for text and 3:1 for control borders, and must not cause sideways scrolling at the minimum window size (440 x 560).
- Never pass user input into a command without validating it (see `checkIndex` and `checkServers` in `src/dns.js`). On Linux, pass arguments to `execFile` as an array, never as a shell string.
- Add or update tests for behaviour you change.
- Write commit messages in the imperative: "Fix chip wrapping", "Add IPv6 validation".
- Add a line under `## [Unreleased]` in `CHANGELOG.md` for anything users would notice.

## Reporting bugs

Open an issue using the bug report form and include your Windows version, the DNSwitch version and steps to reproduce. For security problems, do not open a public issue; see [SECURITY.md](SECURITY.md).
