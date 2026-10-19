# DNSwitch

A small Windows desktop app to view and change the DNS servers of your Wi-Fi connection.

- Shows the current DNS (automatic or manual) for the connected Wi-Fi adapter
- Save DNS presets (Google, Cloudflare, Quad9, OpenDNS included) and switch with one click
- Enter custom servers, or reset to automatic (DHCP, the Windows default)

## Run

```
npm install
npm start
```

Changing DNS needs administrator rights. If the app is not elevated, Windows shows a UAC prompt on each change;
start the app from an elevated terminal to avoid that.

## Test

```
npm test                 # unit tests (no system changes)
node tests/ui.test.js    # end-to-end UI test; needs an elevated shell, changes then restores Wi-Fi DNS
```

## Build a portable exe

```
npm run dist
```
