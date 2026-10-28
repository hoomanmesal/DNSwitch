# DNSwitch Design System

Dark, instrument-panel UI for a small desktop utility (Windows, Linux) that shows and switches DNS. Derived from five network-monitoring references (see [design/references.md](design/references.md)). Tokens live in [src/tokens.css](src/tokens.css); a live component kit is in [design/kit.html](design/kit.html).

> Status: applied to the app (`src/styles.css`, `src/index.html`). Not yet built: the latency dial and signal bars (need a DNS probe) and the Automatic | Manual segmented control; the app uses the ghost "Reset to automatic DNS" button instead.

## 1. Concept

**"Night instrument panel."** DNSwitch is a gauge you can flip. One calm graphite world, one ice-white primary action, and colour reserved for meaning. The DNS address is the hero readout; presets are a list of switchable "channels"; the emblem is a dial/ring.

Feel: precise, quiet, a little technical. Never playful, never neon-everywhere.

## 2. Principles

1. **Colour carries meaning, never decoration.** Neutral ramp everywhere; green = ok/connected, amber = caution/secondary metric, red = error/attention, cyan = live data, violet = ambient glow only.
2. **Numbers are the heroes.** DNS addresses and latencies are large, monospaced, tabular. Labels and units are small and muted.
3. **One primary per screen.** The only filled ice-white element is the main action. Everything else is surface, outline, or ghost.
4. **Raised, not boxed.** Depth from a faint top highlight and soft shadow; borders are 1px hairlines at low opacity.
5. **Large soft radii.** Cards 22px, tiles 14px, actions are pills.
6. **Texture stays behind.** Circuit traces, star dust and glow sit at under 8% contrast behind content.
7. **State is always legible.** Current mode (Automatic/Manual) and active preset are visible without interaction.

## 3. Colour

All values are tokens in `src/tokens.css`.

| Role | Token | Value | Use |
|---|---|---|---|
| App background | `--bg-0` | `#0a0c11` | window, behind everything |
| Panel | `--bg-1` | `#11141b` | page sections |
| Card | `--bg-2` | `#181c25` | cards |
| Raised | `--bg-3` | `#212633` | tiles, inputs, hovered rows |
| Pressed/selected | `--bg-4` | `#2b3141` | pressed states, toggle track |
| Hairline | `--line` / `--line-strong` | white 7% / 14% | decorative card borders and dividers only |
| Control border | `--control-border` | `#6f788c` | borders of inputs, selects, ghost and icon buttons (3.85:1 on card, 3.41:1 on raised) |
| Glass | `--glass` | `rgba(24,28,37,.62)` | translucent preset-row fill (no blur: it sits on a flat card, so blur would be decoration) |
| Text | `--text` | `#eef3fa` | primary text, hero numerals |
| Secondary | `--text-2` | `#a4adbf` | body secondary |
| Tertiary | `--text-3` | `#8a94a8` | labels, units, placeholders (5.6:1 on card, 4.95:1 on raised) |
| Decor | `--text-faint` | `#4a5263` | decoration only; never information |
| **Primary (ice)** | `--ice` / `--ice-ink` | `#e6f0ff` / `#0d1626` | the single filled action, active segment, selected bar |
| On alert | `--on-alert` | `#0d1626` | text on an `--alert` fill (white would be 3.0:1) |
| OK | `--ok` | `#3ddc84` | connected, applied, ACTIVE |
| Warn | `--warn` | `#ffa94d` | secondary metric, caution |
| Alert | `--alert` | `#ff6b5b` | errors, declined, attention outline |
| Data | `--data` | `#4dd6e6` | charts, live latency |
| Glow | `--glow` | `#7b6cff` | ambient background glow only |

Contrast (measured): `--text` on `--bg-2` 15.3:1; `--text-2` 7.6:1; `--text-3` 5.6:1 on `--bg-2` and 4.95:1 on `--bg-3`; signals `--ok`, `--warn`, `--data`, `--alert` are 6.1:1 to 9.8:1 on `--bg-2` and `--alert` is 4.64:1 on `--bg-4`; `--ice-ink` on `--ice` 15.8:1; `--on-alert` on `--alert` 6.0:1. Meaningful control borders use `--control-border` (>= 3:1). `--text-faint` and `--line` fail by design (decoration only).
Tinted backgrounds (`--ok-bg` etc.) are 12% fills paired with the full-strength colour as text/icon.

## 4. Typography

| Style | Font | Size / weight | Use |
|---|---|---|---|
| Display | mono | 40 / 600, tight (1.1) | hero DNS readout |
| Title | sans | 20 / 650 | app title, dialog titles |
| Body | sans | 14 / 450 | text, preset names |
| Label | sans | 12 / 600, uppercase, +0.08em | section labels, stat labels |
| Micro | sans | 11 / 500 | units, captions |
| Numeral | mono, `font-variant-numeric: tabular-nums` | per context | all addresses and latency values |

Sans: Inter Tight, falling back to Segoe UI Variable. Mono: JetBrains Mono, falling back to Cascadia Mono / Consolas. Bundle both as local files (Electron is offline; no CDN).

## 5. Spacing, radius, elevation, motion

- **Spacing:** 4px base (`--s-1..--s-10`). Card padding 20, gap between cards 16, row padding 12 x 14.
- **Radius:** `--r-sm` 8 (inputs), `--r-md` 14 (tiles/rows), `--r-lg` 22 (cards), `--r-pill` (buttons, chips, toggles).
- **Elevation:** `--shadow-card` (cards), `--shadow-tile` (tiles). No outer coloured shadows except status glow (`--shadow-glow-ok` on the LED, `--shadow-glow-alert` on a failed/attention frame).
- **Motion:** 120ms hover/press, 220ms state changes, 900ms dial sweep and bar fills, all `--ease-out`. Needle and numerals animate between values; on apply, the readout cross-counts to the new address. All motion collapses to 0ms under `prefers-reduced-motion`.

## 6. Iconography

1.75px stroke, rounded caps/joins, 20px grid, drawn in `currentColor`. Needed glyphs: wifi, ethernet (shown instead of wifi when the selected interface is wired), shield-check, globe, power, plus, pencil, trash, refresh, chevron, signal-bars (5 segments), arrow-up/down, info. Icon tiles are 36px rounded squares on `--bg-3`.

## 7. Components

### Status chip
Pill, 28px high, 12px label. Variants: `ok` (green text on `--ok-bg`, shield icon, label "Automatic" or "Manual"), `warn`, `alert`, `neutral`. A 6px LED dot may lead the label; the `ok` LED uses `--shadow-glow-ok`.

### Hero readout
Centred block: state chip, SSID (Body, `--text-2`), then the **primary DNS address in Display mono**, then the alternate in Title mono `--text-2`. Replace with "Automatic" in Title sans plus the resolved servers beneath when mode is auto. Count/morph animation between values.

### Stat tile
`--bg-3`, radius 14, padding 12 x 14. Label (Label style) top-left, optional directional arrow top-right (green = good/down, amber = secondary). Value in mono 22/600 with muted unit. Used for Preferred, Alternate, and (future) Latency.

### Dial / ring gauge (emblem)
270 degree arc of segmented ticks on `--bg-3`, progress arc in `--ice`, a 1.5px `--alert` needle with centre hub, value in mono 28 with unit below. In this app it shows **latency to the active DNS server (ms)**, scale 0 to 200. Idle/unknown state: arc empty, value "--". Ring variant (ref 3): 56px circular progress with centred caption, used in preset rows.

### Primary button (pill)
Height 48, full width in cards, `--ice` fill, `--ice-ink` text, 600 weight. Hover: +6% brightness; active: translateY(1px); disabled: 40% opacity, no hover. Exactly one per screen ("Apply" in the custom card, or "Reset to automatic DNS" when that is the main task).

### Secondary / ghost button
Pill, 1px `--line-strong`, transparent, `--text`. Hover fills `--bg-3`. Small variant is 32px high.

### Segmented control
Pill container `--bg-3`, inner active segment `--ice` with `--ice-ink` text. Used for Mode: Automatic | Manual (replaces the separate "Reset to automatic DNS" button in a future iteration).

### Preset row (frosted list, ref 4)
Radius 14, `--glass` fill, 1px `--line`, gap 8. Left to right: 36px icon tile (globe), name (Body 600), IPs (mono 12 `--text-3`), 5-segment signal bar (latency band, optional), right-aligned actions (edit, delete as 28px ghost icons, visible on hover/focus). **Active** row: 1px `--ok` border, `--ok-bg` tint, "ACTIVE" count-pill with `--ok` dot. Click anywhere applies.

### Inputs
`--bg-3` fill, radius 8, 44px high, mono for IP fields, 1px `--line`; focus `--focus-ring`; invalid 1px `--alert` plus helper text in `--alert`. Placeholders in `--text-3`.

### Dialog
Centred, 380px, `--bg-2`, radius 22, `--shadow-card`, backdrop `rgba(5,7,15,.7)` plus 6px blur. Title (Title), fields, right-aligned ghost Cancel + primary Save. Destructive confirm swaps primary for an `--alert` fill with white text.

### Toast
Bottom-centre pill on `--bg-3`, 1px `--ok` (success) or `--alert` (error). Non-interactive (`pointer-events: none`), 2.5s (5s for errors).

### Busy overlay
`--bg-0` at 80% with a 28px ice ring spinner and a Micro caption. Blocks input while a change is applied (a change takes about 5 seconds).

### Banner
Full-width inline alert under the header: `--alert-bg` for blocking issues ("Administrator rights are required..."), `--data-bg` for info.

## 8. Layout blueprint (window 520 x 720, min 440 x 560)

```
Header        [logo]  DNSwitch                 [refresh]
              Connected to <SSID>
Banner        (only when needed)
Hero card     [status chip]
              8.8.8.8            <- Display mono
              8.8.4.4            <- Title mono, --text-2
              [ Dial: latency ]  [ Preferred tile ][ Alternate tile ]
              [ Mode segmented: Automatic | Manual ]
Presets card  PRESETS                          [+ New]
              [row] [row] [row] [row]
Custom card   CUSTOM
              [Preferred input] [Alternate input]
              [ Apply (primary) ]   [ Save as preset (ghost) ]
```
Single column, max content width 560, 16px gutters at min width, no horizontal scroll.

**Window sizes:** default 520 x 720, minimum 440 x 560 (enforced by the window), no maximum.
**Breakpoints (CSS px):** under 860 = single column; 860 and up = two columns (hero sticky on the left, presets and custom stacked on the right, content max 1000, centred). Under 640 tall, spacing and the readout tighten so the hero and primary action stay above the fold. Under 480 wide, the readout drops to 32px and the Apply row stacks. Under 300 wide (about 200% zoom at the minimum window), preset rows wrap (icon hidden, ACTIVE tag and buttons move under the name) and the readout may shrink, so nothing scrolls sideways.
**Shrinking rule:** every grid and flex child that holds text uses `minmax(0, 1fr)` or `min-width: 0` with ellipsis, so long Wi-Fi names, adapter names, preset names and 255.255.255.255 never push a card past the window. The status chip never wraps; the status/adapter row wraps instead. Background: `--bg-0` with a faint `--glow` radial at the top and a 4% circuit-trace SVG pattern.

## 9. States and copy

- **Loading:** hero readout shows "--" and a skeleton shimmer; busy overlay appears only for user-initiated actions, never background refresh.
- **Automatic:** chip "Automatic", readout shows the DHCP-provided servers.
- **Manual:** chip "Manual", active preset highlighted if servers match exactly.
- **Error:** toast plus, for blocking errors, banner. Plain language: "Administrator rights are required to change DNS. Restart DNSwitch as administrator." / "Administrator permission was declined." On Linux: "Permission to change network settings was declined or is not allowed for this account."
- **No network interface:** banner "No active network interfaces. Connect to a network and refresh." Controls disabled.
- **Empty presets:** "No presets yet. Click + New to add one."
- **Voice:** short, literal, no exclamation marks.

## 10. Accessibility

- Every control reachable by keyboard; visible `--focus-ring` (2px ice) on all interactive elements.
- Targets at least 32px (primary actions 44 to 48px).
- Status never relies on colour alone: always a text label (Manual, ACTIVE, error text) plus colour.
- Dialogs trap focus and close on Escape; confirm focuses Cancel first.
- Live regions: toast `role="status"`, banner `role="alert"`.
- Reduced motion honoured.

## 11. Implementation notes (Electron)

- Import `src/tokens.css` first; replace the ad-hoc variables in `src/styles.css` with the token names.
- Keep CSP strict (`default-src 'self'`): local fonts via `@font-face` from `assets/fonts/`, SVG icons inline or as local files, no CDN.
- `backdrop-filter` is used only for the dialog backdrop (6px). Preset rows use a plain translucent fill: blur over a flat card is invisible and rendered unreliably.
- The dial is SVG (arc via `stroke-dasharray`, needle via CSS `transform: rotate`).
- Latency data is **not available yet**: the dial/signal bars need a small main-process probe (time a DNS query against each server). Until built, render the dial in its idle state or omit it.

## 12. Do / don't

- Do keep one ice-filled button per view. Don't add a second.
- Do use green only for ok/connected. Don't use it for decoration or "brand".
- Do put numbers in mono. Don't set addresses in the sans face.
- Do keep texture below 8% contrast. Don't put text on a busy area.
- Don't copy reference artwork (routers, satellites, globes); recreate originals.
