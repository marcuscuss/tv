// Sonda temporal: estructura de ESPN, CORS, Letterboxd y ATP
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const cut = (o, n) => JSON.stringify(o, null, 0).slice(0, n || 2500);
async function j(u, h) { const r = await fetch(u, { headers: Object.assign({ 'User-Agent': UA }, h || {}) }); return { r, d: await r.json().catch(() => null) }; }
(async () => {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  console.log('### CORS');
  for (const u of ['https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard', 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard']) {
    const r = await fetch(u, { headers: { Origin: 'https://marcuscuss.github.io', 'User-Agent': UA } });
    console.log(u, r.status, 'ACAO=', r.headers.get('access-control-allow-origin'), 'cache=', r.headers.get('cache-control'));
  }
  console.log('### ESPN TENIS');
  for (const tour of ['atp', 'wta']) {
    const { d } = await j('https://site.api.espn.com/apis/site/v2/sports/tennis/' + tour + '/scoreboard?dates=' + day);
    console.log(tour, 'keys', Object.keys(d || {}), 'events', d && d.events && d.events.length);
    const ev = d && d.events && d.events[0];
    if (ev) {
      console.log('event keys', Object.keys(ev), cut({ name: ev.name, date: ev.date, venue: ev.venue, major: ev.major }, 600));
      const g = (ev.groupings || [])[0];
      console.log('groupings', (ev.groupings || []).map((x) => x.grouping && x.grouping.displayName));
      const c = g && g.competitions && g.competitions[0];
      console.log('competition', cut(c, 4000));
    }
  }
  console.log('### ESPN FUTBOL');
  for (const u of ['https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/teams/86/schedule',
    'https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/86/schedule',
    'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/teams/86/schedule?fixture=true']) {
    const { r, d } = await j(u);
    console.log(u, r.status, d && Object.keys(d), d && d.events && d.events.length);
    if (d && d.events && d.events[0]) console.log(cut(d.events[0], 3000));
  }
  const { d: sb } = await j('https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard');
  if (sb && sb.events && sb.events[0]) console.log('SCOREBOARD event', cut(sb.events[0], 3500));
  console.log('### LETTERBOXD films');
  const h = await (await fetch('https://letterboxd.com/marcus_cus/films/page/1/', { headers: { 'User-Agent': UA } })).text();
  console.log('len', h.length, 'slug', (h.match(/data-film-slug="/g) || []).length, 'item-slug', (h.match(/data-item-slug="/g) || []).length,
    'target', (h.match(/data-target-link="/g) || []).length);
  const i = h.indexOf('poster-container'); console.log(h.slice(i - 100, i + 1500));
  console.log('pagination', (h.match(/\/films\/page\/(\d+)\//g) || []).slice(-5));
  console.log('### LETTERBOXD RSS tmdb');
  const rss = await (await fetch('https://letterboxd.com/marcus_cus/rss/', { headers: { 'User-Agent': UA } })).text();
  console.log((rss.match(/<tmdb:[^>]+>[^<]*<\/tmdb:[^>]+>/g) || []).slice(0, 4));
})().catch((e) => console.log('ERR', e));
