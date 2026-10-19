# Reference study

Five Dribbble shots were studied (screenshots and video frames) to derive the design language in `../DESIGN.md`.
We take **principles, palette character, and component anatomy**, and recreate everything as original work. No imagery, icons, router/satellite renders, or layouts are copied.

| # | Shot | Author | Type | What we took |
|---|------|--------|------|--------------|
| 1 | [Wi-Fi Router Management App UI, Dark Mode](https://dribbble.com/shots/26427318-Wi-Fi-Router-Management-App-UI-Dark-Mode) | IbraHim | Image | Surfaces, ice CTA, raised cards, gauge, striped bar chart |
| 2 | [Internet Speed Test App UI, Network Monitor](https://dribbble.com/shots/27737025-Internet-Speed-Test-App-UI-Network-Monitor) | Mavero Studio | Image | Status chip, big readout, stat tiles, needle, power button, circuit backdrop |
| 3 | [Gradient Network Explorer UI Design](https://dribbble.com/shots/26981433-Gradient-Network-Explorer-UI-Design) | Nexaideas | Video | Violet glow, mono numerals, segmented tabs, ring gauge, live-feed list |
| 4 | [Real-Time Satellite Network Intelligence](https://dribbble.com/shots/27144507-Real-Time-Satellite-Network-Intelligence) | George Railean | Video | Frosted list rows, icon tiles, signal-bar glyph, count pills, ruler scale |
| 5 | [Satellite Operations Dashboard UI](https://dribbble.com/shots/27164543-Satellite-Operations-Dashboard-UI-Data-Visualization-for-Space) | George Railean | Video | Glass panels, 1px hairlines, red attention outline, dense table, data-line chart |

## 1. Wi-Fi Router Management (dark mode)
- **Surfaces:** neutral charcoal, three steps (page ~#1c1c1c, card ~#262626, tile ~#2e2e2e). Cards are large-radius and *raised* with a faint top highlight, not outlined.
- **Primary color is not a hue.** The CTA ("Connect To Device"), the active bottom-nav "+" button and the selected bar in the chart are all a pale ice-white fill with dark text. Everything else is greyscale. This restraint is the signature.
- **Green** is used only for positive deltas (+82%, arrow).
- **Gauge:** half-circle tick dial with numeric scale, a soft pill-shaped "needle" housing the live value and unit.
- **Chart:** vertical bars drawn as diagonal-hatched grey; the selected one turns solid ice and gets a tooltip pill.
- **Controls:** full-width pill button; minimal toggle; underline-only text fields with tiny caption labels; circular icon buttons.

## 2. Internet Speed Test / Network Monitor
- **Near-black graphite** with a faint **circuit-trace pattern** and a dim world map behind the content, used as texture, never as content.
- **Status chip:** "Connected" in green text on a green-tinted pill with a shield icon.
- **Hero readout:** large white bold tabular numerals (01:48:08) with a small muted IP line beneath.
- **Stat tiles:** small dark tiles, label top-left in muted text, value in bold with unit in muted; a coloured arrow top-right (green = download, orange = upload).
- **Dial:** thick arc segments, white progress arc, a **thin red needle**, centre hub. Current value large under the dial with its state word ("Uploading") above and unit below.
- **Power control:** tall pill track with a round knob and a tiny green LED over the label ("STOP").
- **Secondary action:** wide low-contrast grey pill ("Stop Test").

## 3. Gradient Network Explorer (video)
- **Space-black with violet/indigo glow** (#6c63ff range); globe made of dots; thin connecting arcs.
- **Monospace numerals** for metrics (32, 500,000, 3.21 Bn); tiny coloured icon chip beside each label.
- **Segmented pill tabs** (Nodes / Latency) with the active segment filled light.
- **Legend card** with 5 violet steps for latency buckets; **ring gauge** with centred caption.
- **Live list:** monospace rows with an icon dot, title and a dim sub-line, in a scrolling side panel.

## 4. Satellite and Network Intelligence (video)
- **Slate-teal frosted glass** rows (blurred, translucent, 1px light edge), stacked with generous gap.
- **Row anatomy:** icon tile (rounded square) / name / throughput in muted small text with a **5-segment signal bar** / right-aligned **count pill** with a red dot.
- **Ruler scale** with ticks and labels on the side for time/range.
- **Hero imagery:** cyan light beams on one side, orange-red arcs on the other, which is the cyan = healthy / orange-red = congested colour language.

## 5. Satellite Operations Dashboard (video)
- **Deep navy-teal panels**, 1px hairline borders, small caps labels, dense tables with tiny text.
- **Red outlined highlight** (glowing 1px red frame with soft bloom) marks the object that needs attention.
- **Data chart:** thin multi-colour lines (cyan, orange, green) with diamond markers at points and a faint grid, with axis labels in tiny muted text.
- **Control cluster:** circular D-pad, speed readouts in big numerals with small unit.

## Cross-cutting patterns
1. **One calm neutral ramp; colour only carries meaning** (ok / warn / alert / data).
2. **Big numerals are the heroes**, with tiny muted units and labels.
3. **Soft, large radii; raised or frosted surfaces; hairline borders.**
4. **A dial or ring as the emblem** of live measurement, with a thin accent needle or arc.
5. **Pill-shaped actions and segmented controls**; a single filled ice primary per screen.
6. **Subtle environmental texture** (circuit traces, star dust, glow) behind content, never competing with it.
