# DNSwitch

[![CI](https://github.com/hoomanmesal/DNSwitch/actions/workflows/ci.yml/badge.svg)](https://github.com/hoomanmesal/DNSwitch/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/hoomanmesal/DNSwitch)](https://github.com/hoomanmesal/DNSwitch/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

See the DNS servers of your Wi-Fi connection and switch them in one click.

- Shows the current DNS (automatic or manual) for the connected Wi-Fi adapter
- Save DNS presets (Google, Cloudflare, Quad9, OpenDNS included) and switch with one click
- Enter custom servers, or reset to automatic (DHCP, the Windows default)

## Download

Get the latest version from the [Releases page](https://github.com/hoomanmesal/DNSwitch/releases/latest):

| File | What it is |
|---|---|
| `DNSwitch-<version>-setup.exe` | Installer. Installs for your user, adds Start menu and desktop shortcuts, and can be uninstalled from Windows Settings. |
| `DNSwitch-<version>-portable.exe` | Single file, no install. Run it from anywhere. |
| `SHA256SUMS.txt` | Checksums to verify your download. |

Requires Windows 10 or 11 (64-bit). DNSwitch asks for administrator permission when it starts, because Windows only lets administrators change DNS.

**Windows SmartScreen:** the app is not code-signed yet, so Windows may show "Windows protected your PC". Choose **More info**, then **Run anyway**. You can compare the file's checksum with `SHA256SUMS.txt` first:

```powershell
Get-FileHash .\DNSwitch-1.0.0-setup.exe -Algorithm SHA256
```

## Run from source

```
npm install
npm start
```

Start it from an elevated terminal (Run as administrator), otherwise Windows asks for permission on each change.

## Test

```
npm test                 # unit tests (no system changes)
node tests/ui.test.js    # end-to-end UI test; needs an elevated shell, changes then restores Wi-Fi DNS
npm run test:layout      # window min size, overflow at 7 sizes + zoom, stress content (no DNS changes)
APP_EXE=<path to exe>    # set this env var to run either UI test against a packaged app
```

## Build

```
npm run dist
```

Produces the installer and the portable exe in `dist/`. Releases are built by GitHub Actions; see [RELEASING.md](RELEASING.md).

## Project docs

- [CHANGELOG.md](CHANGELOG.md): what changed in each version
- [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md): the design system and product context
- [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md)

## License

[MIT](LICENSE)
