# Security policy

DNSwitch changes system network settings and runs with administrator rights, so security reports matter.

## Supported versions

Only the latest release receives fixes.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability** (https://github.com/hoomanmesal/DNSwitch/security/advisories/new). Include what you found, the steps to reproduce it, the version of DNSwitch and your Windows version.

You can expect an acknowledgement within a few days and a fix or a decision as soon as it is reasonable. You will be credited in the release notes unless you prefer not to be.

## What is in scope

- Running unintended commands through the PowerShell calls (command injection via DNS values, adapter names or preset names)
- Changing DNS on an adapter the user did not choose
- Ways to make the app write outside its own settings folder
- Problems in the release build or its checksums

## Good to know

- The app makes no network connections of its own and has no accounts or telemetry.
- Presets are stored locally in the app's user-data folder in `presets.json`.
- Releases are currently unsigned. Verify downloads with `SHA256SUMS.txt` from the release page.
