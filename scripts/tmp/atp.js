const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' });
  const seen = [];
  p.on('response', async (r) => {
    const ct = r.headers()['content-type'] || '';
    if (!/json/.test(ct)) return;
    let body = '';
    try { body = (await r.text()).slice(0, 700); } catch (e) {}
    seen.push(r.status() + ' ' + r.url() + '\n   ' + body.replace(/\s+/g, ' '));
  });
  for (const u of ['https://www.atptour.com/en/scores/current', 'https://www.atptour.com/en/tournaments']) {
    try {
      const res = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 45000 });
      console.log('PAGE', u, res && res.status(), await p.title());
      await p.waitForTimeout(9000);
    } catch (e) { console.log('ERR', u, e.message); }
  }
  console.log(seen.join('\n'));
  await b.close();
})();
