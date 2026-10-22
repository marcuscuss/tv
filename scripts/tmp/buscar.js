// Temporal: busca en Wikimedia Commons logos de plataformas y baja los candidatos
const fs = require('fs');
const UA = 'JoiLauncher/1.0 (logos de plataformas; uso personal)';
const Q = {
  movistar: ['Movistar Plus+ logo', 'Movistar+ logo', 'Movistar Plus logo'],
  filmin: ['Filmin logo'],
  skyshowtime: ['SkyShowtime logo'],
  atresplayer: ['Atresplayer logo', 'ATRESplayer'],
  dazn: ['DAZN logo'],
  appletv: ['Apple TV logo 2024', 'Apple TV+ logo'],
};
(async () => {
  fs.mkdirSync('assets/logos/cand', { recursive: true });
  for (const [id, qs] of Object.entries(Q)) {
    let n = 0;
    for (const q of qs) {
      const u = 'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=8&format=json&srsearch=' + encodeURIComponent(q);
      const d = await (await fetch(u, { headers: { 'User-Agent': UA } })).json().catch(() => ({}));
      for (const r of ((d.query || {}).search || [])) {
        const t = r.title.replace(/^File:/, '');
        if (!/\.(svg|png)$/i.test(t) || n >= 6) continue;
        const res = await fetch('https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(t) + (/png$/i.test(t) ? '?width=600' : ''), { headers: { 'User-Agent': UA } });
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const f = 'assets/logos/cand/' + id + '-' + (++n) + '.' + t.split('.').pop().toLowerCase();
        fs.writeFileSync(f, buf);
        fs.appendFileSync('assets/logos/cand/lista.txt', f + '  <-  ' + t + '\n');
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
})();
