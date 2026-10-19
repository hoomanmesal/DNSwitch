// End-to-end UI test: drives the real Electron app over CDP. Changes real Wi-Fi DNS (restores at end).
// Run from an elevated shell:  node tests/ui.test.js
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');
const electron = require('electron');
const dns = require('../src/dns');

const PORT = 19222;
let failures = 0;
const check = (name, cond, extra) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  -> ' + extra));
  if (!cond) failures++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'dnsw-ud-'));
  // APP_EXE=<path to packaged exe> tests the built app instead of the dev sources.
  const flags = [`--remote-debugging-port=${PORT}`, `--user-data-dir=${userData}`];
  const proc = process.env.APP_EXE
    ? spawn(process.env.APP_EXE, flags, { stdio: 'ignore' })
    : spawn(electron, ['.', ...flags], { cwd: path.join(__dirname, '..'), stdio: 'ignore' });
  const before = await dns.getState();
  const wifi = before.adapters.find((a) => a.isWifi);
  let browser;
  try {
    for (let i = 0; i < 40 && !browser; i++) {
      try { browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}`, defaultViewport: null }); }
      catch { await sleep(500); }
    }
    const page = (await browser.pages()).find((p) => p.url().includes('index.html'));
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    let dialogAnswer = true;
    page.on('dialog', (d) => (dialogAnswer ? d.accept() : d.dismiss()));
    const txt = (sel) => page.$eval(sel, (e) => e.textContent.trim());
    const waitIdle = async () => {
      // busy overlay appears after the click is processed, then disappears when the operation finishes
      await page.waitForSelector('#busy:not(.hidden)', { timeout: 5000 }).catch(() => {});
      await page.waitForSelector('#busy.hidden', { timeout: 60000 });
    };
    const toastText = async () => { await sleep(300); return txt('#toast'); };
    const presetNames = () => page.$$eval('#presets li .nm', (els) => els.map((e) => e.textContent));
    const clickPreset = (name) => page.evaluate((n) => {
      [...document.querySelectorAll('#presets li')].find((li) => li.querySelector('.nm')?.textContent === n).click();
    }, name);
    const clickMini = (name, cls) => page.evaluate((n, c) => {
      [...document.querySelectorAll('#presets li')].find((li) => li.querySelector('.nm')?.textContent === n).querySelector('.' + c).click();
    }, name, cls);

    await page.waitForFunction(() => document.getElementById('cur1').textContent !== '—' && document.getElementById('cur1').textContent !== '-', { timeout: 30000 });
    await sleep(500);

    // --- Initial render
    check('title', (await page.title()) === 'DNSwitch');
    check('ssid shown', (await txt('#ssid')).includes(before.ssid || wifi.description), await txt('#ssid'));
    check('Wi-Fi adapter selected by default', (await page.$eval('#adapter', (e) => e.selectedOptions[0].textContent)).includes('Wi-Fi'));
    check('current servers match system', (await txt('#cur1')) === (wifi.servers[0] || '-'), await txt('#cur1'));
    check('mode badge matches', (await txt('#mode')) === (wifi.mode === 'auto' ? 'Automatic (DHCP)' : 'Manual'));
    check('4 default presets', (await presetNames()).join() === 'Google,Cloudflare,Quad9,OpenDNS', (await presetNames()).join());

    // --- Apply preset
    await clickPreset('Cloudflare');
    await waitIdle(); await sleep(400);
    let s = (await dns.getState()).adapters.find((a) => a.index === wifi.index);
    check('Cloudflare applied to system', s.mode === 'manual' && s.servers.join() === '1.1.1.1,1.0.0.1', JSON.stringify(s));
    check('UI shows Cloudflare servers', (await txt('#cur1')) === '1.1.1.1' && (await txt('#cur2')) === '1.0.0.1');
    check('UI badge Manual', (await txt('#mode')) === 'Manual');
    check('Cloudflare marked ACTIVE', (await page.$$eval('#presets li.active .nm', (e) => e.map((x) => x.textContent))).join() === 'Cloudflare');
    check('auto button enabled when manual', await page.$eval('#auto', (b) => !b.disabled));
    check('success toast', (await toastText()).includes('Applied Cloudflare'), await toastText());

    // --- Switch to another preset
    await clickPreset('Google');
    await waitIdle(); await sleep(400);
    check('Google active only', (await page.$$eval('#presets li.active .nm', (e) => e.map((x) => x.textContent))).join() === 'Google');

    // --- Custom: invalid inputs
    for (const [a, b, label] of [['', '', 'empty'], ['1.2.3', '', 'short'], ['300.1.1.1', '', 'range'], ['1.1.1.1', 'abc', 'bad alt'], ['1.1.1.1', '1.1.1.1', 'same']]) {
      await page.$eval('#c1', (e, v) => (e.value = v), a);
      await page.$eval('#c2', (e, v) => (e.value = v), b);
      await page.click('#apply-custom'); await sleep(250);
      check('custom invalid rejected: ' + label, (await page.$eval('#toast', (e) => e.classList.contains('error'))), await txt('#toast'));
    }
    s = (await dns.getState()).adapters.find((a) => a.index === wifi.index);
    check('invalid custom did not change DNS', s.servers.join() === '8.8.8.8,8.8.4.4', s.servers.join());

    // --- Custom: single server valid
    await page.$eval('#c1', (e) => (e.value = ' 9.9.9.9 '));
    await page.$eval('#c2', (e) => (e.value = ''));
    await page.click('#apply-custom'); await waitIdle(); await sleep(500);
    s = (await dns.getState()).adapters.find((a) => a.index === wifi.index);
    check('custom single server applied', s.servers.join() === '9.9.9.9', s.servers.join() + ' toast=' + (await txt('#toast')) + ' busy=' + (await page.$eval('#busy', (e) => e.className)));
    check('UI alternate shows dash', ['-', '—'].includes(await txt('#cur2')));

    // --- Custom with Enter key
    await page.$eval('#c1', (e) => (e.value = '4.4.4.4'));
    await page.$eval('#c2', (e) => (e.value = '4.4.8.8'));
    await page.focus('#c2'); await page.keyboard.press('Enter'); await waitIdle(); await sleep(500);
    s = (await dns.getState()).adapters.find((a) => a.index === wifi.index);
    check('Enter key applies custom', s.servers.join() === '4.4.4.4,4.4.8.8', s.servers.join());

    // --- Save custom as preset (prefilled dialog)
    await page.click('#save-custom'); await sleep(300);
    check('dialog opens prefilled', (await page.$eval('#p-1', (e) => e.value)) === '4.4.4.4' && (await page.$eval('#p-2', (e) => e.value)) === '4.4.8.8');
    await page.type('#p-name', 'Mine');
    await page.click('#dlg-save'); await sleep(500);
    check('preset saved + listed', (await presetNames()).includes('Mine'));
    check('new preset immediately ACTIVE', (await page.$$eval('#presets li.active .nm', (e) => e.map((x) => x.textContent))).join() === 'Mine');

    // --- Dialog validation
    await page.click('#add-preset'); await sleep(200);
    await page.type('#p-name', 'mine'); await page.type('#p-1', '5.5.5.5');
    await page.click('#dlg-save'); await sleep(300);
    check('duplicate name error shown, dialog stays open', (await txt('#dlg-err')).includes('already exists') && (await page.$eval('#dlg', (d) => d.open)));
    await page.$eval('#p-name', (e) => (e.value = ''));
    await page.click('#dlg-save'); await sleep(300);
    check('empty name error', (await txt('#dlg-err')).includes('name is required'), await txt('#dlg-err'));
    await page.$eval('#p-name', (e) => (e.value = 'Bad'));
    await page.$eval('#p-1', (e) => (e.value = '1.2.3'));
    await page.click('#dlg-save'); await sleep(300);
    check('invalid IP error', (await txt('#dlg-err')).includes('Preferred'), await txt('#dlg-err'));
    await page.click('#dlg-cancel'); await sleep(200);
    check('cancel closes dialog w/o adding', !(await page.$eval('#dlg', (d) => d.open)) && !(await presetNames()).includes('Bad'));
    await page.keyboard.press('Escape');

    // --- Edit preset
    await clickMini('Mine', 'mini'); await sleep(300);
    check('edit dialog prefilled', (await page.$eval('#p-name', (e) => e.value)) === 'Mine');
    await page.$eval('#p-name', (e) => (e.value = 'Mine2'));
    await page.$eval('#p-1', (e) => (e.value = '6.6.6.6'));
    await page.$eval('#p-2', (e) => (e.value = ''));
    await page.click('#dlg-save'); await sleep(500);
    const names = await presetNames();
    check('preset renamed', names.includes('Mine2') && !names.includes('Mine'), names.join());
    check('edited preset no longer ACTIVE', (await page.$$eval('#presets li.active', (e) => e.length)) === 0);
    await clickPreset('Mine2'); await waitIdle(); await sleep(500);
    s = (await dns.getState()).adapters.find((a) => a.index === wifi.index);
    check('edited preset applies single server', s.servers.join() === '6.6.6.6', s.servers.join());

    // --- Delete preset (cancel then accept)
    await clickMini('Mine2', 'del'); await sleep(300);
    check('confirm dialog shown', await page.$eval('#confirm', (d) => d.open));
    await page.click('#confirm-no'); await sleep(300);
    check('delete cancelled keeps preset', (await presetNames()).includes('Mine2') && !(await page.$eval('#confirm', (d) => d.open)));
    await clickMini('Mine2', 'del'); await sleep(300);
    await page.keyboard.press('Escape'); await sleep(300);
    check('Escape cancels delete', (await presetNames()).includes('Mine2'));
    await clickMini('Mine2', 'del'); await sleep(300);
    await page.click('#confirm-yes'); await sleep(500);
    check('delete removes preset', !(await presetNames()).includes('Mine2'));
    s = (await dns.getState()).adapters.find((a) => a.index === wifi.index);
    check('deleting active preset leaves DNS untouched', s.servers.join() === '6.6.6.6');

    // --- Automatic
    await page.click('#auto'); await waitIdle(); await sleep(800);
    s = (await dns.getState()).adapters.find((a) => a.index === wifi.index);
    check('automatic: system back to DHCP', s.mode === 'auto' && s.servers.length > 0, JSON.stringify(s));
    check('automatic: UI badge', (await txt('#mode')) === 'Automatic (DHCP)');
    check('automatic: button disabled', await page.$eval('#auto', (b) => b.disabled));
    check('automatic: no ACTIVE preset', (await page.$$eval('#presets li.active', (e) => e.length)) === 0);

    // --- Refresh picks up external change
    await dns.applyDns(wifi.index, ['208.67.222.222', '208.67.220.220']);
    await page.click('#refresh'); await waitIdle(); await sleep(500);
    check('refresh detects external change + OpenDNS ACTIVE', (await txt('#cur1')) === '208.67.222.222' && (await page.$$eval('#presets li.active .nm', (e) => e.map((x) => x.textContent))).join() === 'OpenDNS');

    // --- Persistence across restart is checked via file
    const saved = JSON.parse(fs.readFileSync(path.join(userData, 'presets.json'), 'utf8'));
    check('presets persisted to disk', saved.length === 4 && !saved.some((p) => p.name.startsWith('Mine')));

    // --- Delete all presets -> empty state
    for (const n of await presetNames()) { await clickMini(n, 'del'); await sleep(250); await page.click('#confirm-yes'); await sleep(250); }
    check('empty state message', (await txt('#presets')).includes('No presets yet'));

    // --- Layout sanity at small size + mobile-ish width
    await page.setViewport({ width: 440, height: 560 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    check('no horizontal overflow at min width', !overflow);
    check('no console/page errors', errors.length === 0, errors.join(' | '));
  } catch (e) {
    console.log('FAIL exception ->', e.stack);
    failures++;
  } finally {
    try { if (browser) await browser.disconnect(); } catch {}
    proc.kill();
    if (process.env.APP_EXE) { try { require('child_process').execSync('taskkill /F /IM "DNSwitch*.exe" /T', { stdio: 'ignore' }); } catch {} }
    // restore original DNS
    if (wifi) await dns.applyDns(wifi.index, wifi.mode === 'manual' ? wifi.servers : null);
    const after = (await dns.getState()).adapters.find((a) => a.index === wifi.index);
    console.log('restored:', after.mode, after.servers.join());
    console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
    process.exit(failures ? 1 : 0);
  }
})();
