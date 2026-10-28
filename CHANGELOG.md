# Changelog

All notable changes to DNSwitch are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Linux version for systems that use NetworkManager, as a .deb package (adds DNSwitch to the applications menu with its icon) and an AppImage, both x64. Shows and switches DNS for the active network interface; NetworkManager asks for your password when needed. (Linux)

### Changed
- The button that returns DNS to the network's own servers now reads "Reset to automatic DNS", and the status chip reads "Automatic" instead of "Automatic (DHCP)". (Windows, Linux)
- Messages say "network interface" instead of "adapter", for example "No active network interfaces". (Windows, Linux)

### Fixed
- At 200% zoom in the smallest window, the page no longer scrolls sideways: preset rows wrap and the DNS address breaks across lines. (Windows, Linux)
- On a computer with only a wired connection, the app no longer shows a red "No Wi-Fi connection found" warning. (Windows, Linux)
- The interface selector shows an Ethernet icon, instead of the Wi-Fi icon, when a wired connection is selected. (Windows, Linux)
- The app no longer downloads a spellcheck dictionary from Google on first start, so it makes no network connections. (Linux, Windows)
- Updated the bundled Electron runtime to the latest 44.x release, which includes a Chromium certificate-trust security fix. (Windows, Linux)

## [1.0.1] - 2026-10-20

### Changed
- Updated the bundled Electron runtime from 33 to 44 (current Chromium and security fixes). Electron 33 no longer receives security updates, and DNSwitch runs with administrator rights, so it should not stay on an unsupported engine.
- Updated the build tooling (electron-builder 25 to 26).
- Download size is larger because of the newer runtime: about 98 MB for the installer and portable exe (previously about 70 MB).

### Fixed
- The window-based tests no longer hang intermittently when another window covers the app (internal).

## [1.0.0] - 2026-10-20

First release.

### Added
- Shows the DNS configuration of the connected Wi-Fi network: Wi-Fi name, adapter, whether DNS is Automatic (DHCP) or Manual, and the preferred and alternate IPv4 servers. Refreshes every 8 seconds.
- Adapter selector for other active network adapters, defaulting to Wi-Fi.
- DNS presets: Google, Cloudflare, Quad9 and OpenDNS included. Add, edit and delete your own; click one to apply it, and the active preset is highlighted.
- Custom DNS servers (alternate optional) with validation, and "Save as preset".
- "Set automatically (DHCP)" to return to the Windows default.
- Dark interface built on a documented design system (`DESIGN.md`, `design/`), with a bundled font set and app icon.
- Responsive layout: minimum window 440 x 560, single column below 860 px wide and two columns above, long names and addresses truncate instead of overflowing.
- Clear messages when Windows refuses a change without administrator rights.
- Unit tests, an end-to-end UI test and a layout test.

### Known limitations
- IPv4 DNS only; no IPv6, DNS over HTTPS or DNS over TLS.
- Changing DNS needs administrator rights. The behaviour on a PC with User Account Control enabled (a prompt per change) has not been tested.
- The portable build is unsigned, so Windows SmartScreen may warn on first run.

[Unreleased]: https://github.com/hoomanmesal/DNSwitch/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/hoomanmesal/DNSwitch/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/hoomanmesal/DNSwitch/releases/tag/v1.0.0
