# DNSwitch

[![CI](https://github.com/hoomanmesal/DNSwitch/actions/workflows/ci.yml/badge.svg)](https://github.com/hoomanmesal/DNSwitch/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/hoomanmesal/DNSwitch)](https://github.com/hoomanmesal/DNSwitch/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

See the DNS servers of your Wi-Fi connection and switch them in one click.

- Shows the current DNS (automatic or manual) for the connected Wi-Fi adapter
- Save DNS presets (Google, Cloudflare, Quad9, OpenDNS included) and switch with one click
- Enter custom servers, or reset to automatic (DHCP)
- Runs on Windows 10/11 and on Linux with NetworkManager

## Download

Get the latest version from the [Releases page](https://github.com/hoomanmesal/DNSwitch/releases/latest):

| File | What it is |
|---|---|
| `DNSwitch-<version>-setup.exe` | Installer. Installs for your user, adds Start menu and desktop shortcuts, and can be uninstalled from Windows Settings. |
| `DNSwitch-<version>-portable.exe` | Single file, no install. Run it from anywhere. |
| `SHA256SUMS.txt` | Checksums to verify your download. |

Requires Windows 10 or 11 (64-bit). DNSwitch asks for administrator permission when it starts, because Windows only lets administrators change DNS.

### Linux

DNSwitch on Linux needs NetworkManager (`nmcli`), which most desktop distributions use. It changes DNS through NetworkManager, so your system may ask for your password when you apply a change; the app itself does not run as root.

| File | What it is |
|---|---|
| `DNSwitch-<version>-amd64.deb` | Package for Ubuntu, Debian, Mint and other Debian-based systems. Adds DNSwitch to your applications menu with its icon. |
| `DNSwitch-<version>-x86_64.AppImage` | Single file, no install, for any distribution. |

```
sudo apt install ./DNSwitch-*-amd64.deb       # .deb
chmod +x DNSwitch-*.AppImage && ./DNSwitch-*.AppImage   # AppImage
```

The AppImage is not added to your applications menu by itself, so GNOME shows a generic icon in the dock. Use the .deb, or add the AppImage with a tool such as Gear Lever, to get the DNSwitch icon.

**Windows SmartScreen:** the app is not code-signed yet, so Windows may show "Windows protected your PC". Choose **More info**, then **Run anyway**. You can compare the file's checksum with `SHA256SUMS.txt` first:

```powershell
Get-FileHash .\DNSwitch-1.1.0-setup.exe -Algorithm SHA256
```

## Run from source

```
npm install
npm start
```

Start it from an elevated terminal (Run as administrator), otherwise Windows asks for permission on each change.

## Limits

- IPv4 DNS only. If your router also hands out IPv6 DNS servers, your system can still use those; DNSwitch does not change them.
- A VPN that pushes its own DNS servers can override the servers you set.
- On Linux, DNSwitch needs NetworkManager. Systems that only use systemd-networkd or other tools are not supported yet.

## Test

```
npm test                 # unit tests (no system changes)
node tests/ui.test.js    # end-to-end UI test; needs an elevated shell, changes then restores Wi-Fi DNS
npm run test:layout      # window min size, overflow at 7 sizes + zoom, stress content (no DNS changes)
APP_EXE=<path to exe>    # set this env var to run either UI test against a packaged app
```

On Linux, `npm run test:live` runs the live backend test (changes then restores the DNS of the active Wi-Fi connection).

## Build

```
npm run dist
```

Produces the installer and the portable exe in `dist/`. On Linux, `npm run dist:linux` builds the AppImage and the .deb.

Running from source on Ubuntu 24.04 or later: if `npm start` stops with "The SUID sandbox helper binary was found, but is not configured correctly", give Electron's sandbox helper the owner it needs (again after each `npm install` that downloads Electron):

```
sudo chown root:root node_modules/electron/dist/chrome-sandbox
sudo chmod 4755 node_modules/electron/dist/chrome-sandbox
```

Do not use `--no-sandbox` instead. Releases are built by GitHub Actions; see [RELEASING.md](RELEASING.md).

## Project docs

- [CHANGELOG.md](CHANGELOG.md): what changed in each version
- [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md): the design system and product context
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) and [RELEASING.md](RELEASING.md): how releases are prepared and published
- [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md)

## License

[MIT](LICENSE)
