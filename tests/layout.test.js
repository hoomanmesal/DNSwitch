// Layout/responsiveness test against the real Electron window. Does not change DNS.
// Run on a desktop session:  node tests/layout.test.js   (APP_EXE=<exe> to test the packaged app)
const { spawn, execFileSync } = require('child_process');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');
const electron = require('electron');

const PORT = 19231;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Wait for the browser to finish laying out after a viewport change (two frames), then a short grace period.
const settle = async (page) => { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await sleep(400); };
let failures = 0;
const check = (name, cond, extra) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  -> ' + extra));
  if (!cond) failures++;
};
// Resizes the real window and returns "WxH". Windows uses a helper script; elsewhere the page resizes its own window.
let page;
const setWindow = async (w, h) => {
  if (process.platform === 'win32') {
    return execFileSync('powershell', ['-NoProfile', '-File', path.join(__dirname, '..', 'tools', 'set-window.ps1'), String(w), String(h)]).toString().trim();
  }
  // Here resizeTo sets the content width; the title bar is taken out of the height.
  await page.evaluate((w, h) => window.resizeTo(w, h), w, h);
  await sleep(600);
  return page.evaluate(() => `${innerWidth}x${innerHeight}`);
};

(async () => {
  // Keep the window rendering even when another window covers it (see tests/ui.test.js).
  const flags = [`--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(os.tmpdir(), 'dnsw-layout-ud')}`, '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'];
  const proc = process.env.APP_EXE
    ? spawn(process.env.APP_EXE, flags, { stdio: 'ignore' })
    : spawn(electron, ['.', ...flags], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  let browser;
  try {
    for (let i = 0; i < 40 && !browser; i++) {
      try { browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}`, defaultViewport: null }); }
      catch { await sleep(500); }
    }
    page = (await browser.pages()).find((p) => p.url().includes('index.html'));
    await sleep(5000); // a freshly downloaded exe can take a few seconds on first launch

    // Real window: the minimum is enforced, large sizes are accepted
    let m = (await setWindow(300, 300)).match(/(\d+)x(\d+)/);
    if (process.platform === 'win32') {
      check('window min size is exactly 440x560', +m[1] === 440 && +m[2] === 560, m[0]);
    } else {
      // Window size includes the title bar, so compare with what an exact 440x560 request gives.
      check('window min size is exactly 440x560', m[0] === (await setWindow(440, 560)) && +m[1] === 440, m[0]);
    }
    m = (await setWindow(1800, 1000)).match(/(\d+)x(\d+)/);
    check('large window accepted (1800x1000)', +m[1] === 1800 && (process.platform !== 'win32' || +m[2] === 1000), m[0]);
    await setWindow(520, 720);

    const overflow = () => page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const clipped = [];
      for (const e of document.querySelectorAll('body *')) {
        if (e.closest('svg') || e.closest('dialog:not([open])')) continue;
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.position === 'fixed') continue;
        const r = e.getBoundingClientRect();
        if (r.width && r.right > vw + 0.5) clipped.push(e.tagName + '.' + e.className + ' right=' + Math.round(r.right) + ' vw=' + vw);
      }
      return {
        h: document.documentElement.scrollWidth > vw,
        clipped: clipped.slice(0, 4),
        chipH: document.getElementById('mode').getBoundingClientRect().height,
      };
    });

    const sizes = [[424, 521], [504, 681], [700, 700], [859, 700], [884, 761], [1400, 900], [2384, 1561]];
    for (const [w, h] of sizes) {
      await page.setViewport({ width: w, height: h }); await settle(page);
      const r = await overflow();
      check(`no overflow at ${w}x${h}`, !r.h && !r.clipped.length, JSON.stringify(r));
      check(`status chip on one line at ${w}x${h}`, r.chipH < 36, r.chipH);
    }

    // Stress content: long names, widest IPs, many presets, error banner and toast
    await page.evaluate(() => {
      state = {
        ssid: 'Extraordinarily-Long-Wi-Fi-Network-Name-With-Many-Characters-5GHz',
        adapters: [
          { name: 'Wi-Fi with a really long adapter alias that goes on', index: 19, description: 'x', isWifi: true, mode: 'manual', servers: ['255.255.255.255', '255.255.255.254'] },
          { name: 'Ethernet', index: 26, description: 'x', isWifi: false, mode: 'auto', servers: [] },
        ],
      };
      selectedIndex = 19;
      presets = Array.from({ length: 14 }, (_, i) => ({
        id: 'p' + i, name: i === 0 ? 'A preset with the maximum forty chars!!' : 'Preset ' + i,
        primary: '255.255.255.255', secondary: '255.255.255.254',
      }));
      render();
      banner('Administrator rights are required to change DNS. Restart DNSwitch as administrator.');
      toast('Administrator rights are required to change DNS. Restart DNSwitch as administrator.', true);
    });
    for (const [w, h] of sizes) {
      await page.setViewport({ width: w, height: h }); await settle(page);
      const r = await overflow();
      check(`stress content: no overflow at ${w}x${h}`, !r.h && !r.clipped.length, JSON.stringify(r));
    }

    // Wide = two columns, narrow = one column
    const pos = () => page.evaluate(() => {
      const a = document.querySelector('.hero').getBoundingClientRect();
      const p = document.querySelector('main > section:nth-of-type(2)').getBoundingClientRect();
      return { beside: p.left > a.right - 1, below: p.top >= a.bottom - 1 };
    });
    await page.setViewport({ width: 1100, height: 800 }); await settle(page);
    check('wide: presets sit beside the hero', (await pos()).beside);
    await page.setViewport({ width: 500, height: 800 }); await settle(page);
    check('narrow: single column', (await pos()).below);

    // Dialog fits inside the minimum window
    await page.setViewport({ width: 424, height: 521 }); await settle(page);
    await page.evaluate(() => document.getElementById('add-preset').click()); await sleep(300);
    const fits = await page.evaluate(() => {
      const r = document.getElementById('dlg').getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
    });
    check('dialog fits inside the minimum window', fits);
    await page.keyboard.press('Escape');

    // Keyboard focus ring
    await page.setViewport({ width: 504, height: 681 }); await settle(page);
    await page.focus('#apply-custom');
    const ring = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
    check('focus ring visible on buttons', ring && ring !== 'none', ring);

    // Browser zoom at the minimum window (effective viewport shrinks)
    for (const z of [1.25, 1.5, 2]) {
      await page.setViewport({ width: Math.round(424 / z), height: Math.round(521 / z) }); await settle(page);
      const r = await overflow();
      check(`no horizontal overflow at ${Math.round(z * 100)}% zoom`, !r.h, JSON.stringify(r));
    }
  } catch (e) {
    console.log('FAIL exception ->', e.stack);
    failures++;
  } finally {
    try { if (browser) await browser.disconnect(); } catch {}
    proc.kill();
    if (process.env.APP_EXE) { try { execFileSync('taskkill', ['/F', '/IM', 'DNSwitch*.exe', '/T'], { stdio: 'ignore' }); } catch {} }
    console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
    process.exit(failures ? 1 : 0);
  }
})();
