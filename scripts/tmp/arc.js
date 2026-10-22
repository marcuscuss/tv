// Sonda temporal: graba arcmarumo.com para estudiar sus animaciones
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'tmp-ref';
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, recordVideo: { dir: OUT, size: { width: 1280, height: 720 } } });
  const p = await ctx.newPage();
  const assets = [];
  p.on('response', async (r) => {
    const u = r.url(), ct = r.headers()['content-type'] || '';
    assets.push(r.status() + ' ' + ct.split(';')[0] + ' ' + u);
    if (/javascript|css/.test(ct) && /arcmarumo/.test(u)) {
      try { const t = await r.text(); fs.writeFileSync(OUT + '/' + u.split('/').pop().split('?')[0].slice(-60), t); } catch (e) {}
    }
  });
  p.on('console', (m) => assets.push('CONSOLE ' + m.type() + ' ' + m.text().slice(0, 200)));
  let n = 0;
  const shot = async (tag) => { await p.screenshot({ path: OUT + '/' + String(n++).padStart(3, '0') + '-' + tag + '.jpg', quality: 70 }); };
  await p.goto('https://www.arcmarumo.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (let i = 0; i < 16; i++) { await p.waitForTimeout(500); await shot('intro'); }
  fs.writeFileSync(OUT + '/page.html', await p.content());
  const texts = await p.evaluate(() => Array.from(document.querySelectorAll('a,button,[role=button],nav *')).map((e) => (e.innerText || '').trim()).filter(Boolean).slice(0, 80));
  fs.writeFileSync(OUT + '/textos.txt', texts.join('\n'));
  // Carrusel: flechas y rueda
  for (const k of ['ArrowRight', 'ArrowRight', 'ArrowLeft']) {
    await p.keyboard.press(k);
    for (let i = 0; i < 6; i++) { await p.waitForTimeout(150); await shot('key-' + k); }
  }
  await p.mouse.move(800, 450);
  for (let j = 0; j < 2; j++) {
    await p.mouse.wheel(0, 400);
    for (let i = 0; i < 6; i++) { await p.waitForTimeout(150); await shot('wheel'); }
  }
  // Hover y clic en la cinta central
  await p.mouse.move(800, 430);
  await p.waitForTimeout(600); await shot('hover');
  await p.mouse.click(800, 430);
  for (let i = 0; i < 10; i++) { await p.waitForTimeout(300); await shot('click'); }
  // Navegación por el menú
  for (const label of ['NEWS WATCH', 'PROFILE', 'CONTACT', 'HOME']) {
    try {
      await p.getByText(label, { exact: false }).first().click({ timeout: 4000 });
      for (let i = 0; i < 10; i++) { await p.waitForTimeout(350); await shot('menu-' + label.replace(/\s/g, '')); }
    } catch (e) { assets.push('NO MENU ' + label + ': ' + e.message.slice(0, 80)); }
  }
  fs.writeFileSync(OUT + '/assets.txt', assets.join('\n'));
  await ctx.close();
  await b.close();
})().catch((e) => { console.log('ERR', e); process.exitCode = 0; });
