#!/usr/bin/env node
/*
 * Tenis → bloque "tenis" de data/deportes.json
 *
 * 1) PRINCIPAL: la web de la ATP. Sus páginas de resultados y torneos se
 *    rellenan con JavaScript desde endpoints JSON internos; se abren con
 *    Playwright y se capturan esas respuestas. Un solo intento: si el
 *    anti-bots (Cloudflare) responde 403, se pasa al respaldo sin reintentar.
 *
 *    Endpoints encontrados: ninguno. En la prueba del 22-10-2026, Cloudflare
 *    devolvió 403 "Attention Required" a las dos páginas antes de cargar
 *    ningún JSON. Si algún día responden, el script los imprime en el log
 *    ("ATP JSON: …") para poder llamarlos directamente.
 *
 * 2) RESPALDO (y siempre para la WTA): API no oficial de ESPN
 *    https://site.api.espn.com/apis/site/v2/sports/tennis/{atp|wta}/scoreboard?dates=YYYYMMDD
 *    events (torneos) → groupings (cuadros) → competitions (partidos) → competitors.
 *    Se piden los últimos 10 días (para los partidos anteriores del torneo
 *    actual) y los 3 siguientes.
 *
 * Se descartan partidos de hace más de 2 días (salvo el historial del torneo en
 * curso). Cada bloque lleva su fuente.
 */
'use strict';

const path = require('path');
const { ROOT, readJson, writeIfChanged, getJson, sleep } = require('./lib');

const OUT = path.join(ROOT, 'data', 'deportes.json');
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/tennis/';
const DAY = 864e5;

// Superficie por nombre del torneo (ESPN no la da)
const CESPED = /wimbledon|halle|queen|stuttgart|s-hertogenbosch|libema|eastbourne|mallorca|newport|bad homburg|berlin|nottingham|birmingham/i;
const TIERRA = /roland|french open|monte|madrid|rome|roma|internazionali|barcelona|godo|hamburg|bastad|gstaad|umag|kitzb|munich|bmw open|estoril|geneva|lyon|houston|marrakech|bucharest|buenos aires|rio|santiago|cordoba|charleston|bogota|rabat|strasbourg|parma|palermo|prague|budapest|lausanne|iasi|bastad/i;
function superficie(nombre) { return CESPED.test(nombre) ? 'cesped' : TIERRA.test(nombre) ? 'tierra' : 'dura'; }

function ymd(t) { return new Date(t).toISOString().slice(0, 10).replace(/-/g, ''); }

/* ---------- 1) ATP con Playwright (un intento) ---------- */
async function atp() {
  let chromium;
  try { chromium = require('playwright').chromium; } catch (e) { console.log('ATP: Playwright no instalado, se usa ESPN'); return null; }
  const b = await chromium.launch();
  const found = [];
  try {
    const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' });
    p.on('response', async (r) => {
      if (!/json/.test(r.headers()['content-type'] || '')) return;
      try { found.push({ url: r.url(), body: await r.json() }); } catch (e) { /* no era JSON */ }
    });
    const res = await p.goto('https://www.atptour.com/en/scores/current', { waitUntil: 'domcontentloaded', timeout: 40000 });
    if (!res || res.status() === 403 || /attention required|just a moment/i.test(await p.title())) {
      console.log('ATP: bloqueado por el anti-bots (' + (res && res.status()) + '), se usa ESPN');
      return null;
    }
    await p.waitForTimeout(8000);
    await p.goto('https://www.atptour.com/en/tournaments', { waitUntil: 'domcontentloaded', timeout: 40000 }).catch(() => null);
    await p.waitForTimeout(6000);
  } finally { await b.close(); }
  found.forEach((f) => console.log('ATP JSON: ' + f.url));
  // Sin endpoints conocidos todavía: se usa ESPN para los datos y aquí quedan anotados.
  return found.length ? { endpoints: found.map((f) => f.url) } : null;
}

/* ---------- 2) ESPN ---------- */
async function espnRanks(tour) {
  try {
    const d = await getJson(ESPN + tour + '/rankings');
    const out = {};
    const list = ((d.rankings || [])[0] || {}).ranks || [];
    list.forEach((r) => { if (r.athlete && r.athlete.id) out[r.athlete.id] = r.current; });
    return out;
  } catch (e) { return {}; }
}

function jugador(c, ranks) {
  const a = c.athlete || {};
  const id = c.id || a.id;
  return {
    id,
    nombre: a.displayName || '',
    corto: a.shortName || a.displayName || '',
    pais: (a.flag && a.flag.alt) || '',
    bandera: (a.flag && a.flag.href) || '',
    foto: id ? 'https://a.espncdn.com/i/headshots/tennis/players/full/' + id + '.png' : '',
    ranking: (c.curatedRank && c.curatedRank.current) || ranks[id] || null,
    sets: (c.linescores || []).map((l) => ({ v: l.value, tb: l.tiebreak != null ? l.tiebreak : null, w: !!l.winner })),
    ganador: !!c.winner,
    saca: !!(c.possession || c.serving),
  };
}

async function espnTour(tour, days) {
  const ranks = await espnRanks(tour);
  const torneos = {}, partidos = {};
  for (const day of days) {
    let d;
    try { d = await getJson(ESPN + tour + '/scoreboard?dates=' + day); }
    catch (e) { console.log('AVISO ESPN ' + tour + ' ' + day + ': ' + e.message); continue; }
    for (const ev of d.events || []) {
      torneos[ev.id] = {
        id: ev.id, tour, nombre: ev.name, ciudad: (ev.venue && ev.venue.displayName) || '',
        superficie: superficie(ev.name), inicio: ev.date, fin: ev.endDate, major: !!ev.major,
      };
      for (const g of ev.groupings || []) {
        const gname = (g.grouping && g.grouping.displayName) || '';
        if (!/singles/i.test(gname)) continue;                // solo individuales
        for (const c of g.competitions || []) {
          const st = (c.status && c.status.type) || {};
          partidos[c.id] = {
            id: c.id, tour, torneoId: ev.id, torneo: ev.name, superficie: superficie(ev.name),
            ronda: (c.round && c.round.displayName) || '', pista: (c.venue && c.venue.court) || '',
            fecha: c.startDate || c.date, estado: st.state || 'pre', detalle: st.shortDetail || st.detail || '',
            jugadores: (c.competitors || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((x) => jugador(x, ranks)),
            resumen: ((c.notes || [])[0] || {}).text || '',
          };
        }
      }
    }
    await sleep(250);
  }
  return { torneos: Object.values(torneos), partidos: Object.values(partidos) };
}

async function main() {
  const prev = readJson(OUT, {});
  const now = Date.now();
  const days = [];
  for (let i = -10; i <= 3; i++) days.push(ymd(now + i * DAY));

  let fuenteAtp = 'espn';
  try { const r = await atp(); if (r) fuenteAtp = 'atptour (endpoints en el log) + espn'; }
  catch (e) { console.log('ATP: ' + e.message + ' · se usa ESPN'); }

  const bloques = [];
  for (const tour of ['atp', 'wta']) {
    try { bloques.push(Object.assign({ tour, fuente: tour === 'atp' ? fuenteAtp : 'espn' }, await espnTour(tour, days))); }
    catch (e) { console.log('AVISO ' + tour + ': ' + e.message); }
  }
  if (!bloques.length) { console.log('Tenis: sin datos nuevos, se conserva el bloque anterior'); return; }

  const torneos = [], recientes = [], historial = [];
  const enCurso = new Set();
  for (const b of bloques) {
    for (const t of b.torneos) {
      if (Date.parse(t.fin || t.inicio) >= now - 1 * DAY) { torneos.push(t); enCurso.add(t.id); }
    }
    for (const m of b.partidos) {
      const t = Date.parse(m.fecha);
      if (t >= now - 2 * DAY || m.estado !== 'post') recientes.push(m);
      else if (enCurso.has(m.torneoId)) historial.push(m);     // partidos anteriores del torneo actual
    }
  }
  const byDate = (a, b) => (a.fecha < b.fecha ? -1 : 1);
  // Más ligero para la tele: sin campos que no se usan; el historial, aún más corto
  for (const m of recientes) delete m.resumen;
  const corto = (m) => ({
    id: m.id, torneoId: m.torneoId, ronda: m.ronda, fecha: m.fecha, estado: m.estado,
    jugadores: m.jugadores.map((j) => ({ nombre: j.nombre, corto: j.corto, ranking: j.ranking, foto: j.foto, sets: j.sets.map((x) => ({ v: x.v, w: x.w })), ganador: j.ganador })),
  });
  console.log('Tenis: ' + torneos.length + ' torneos, ' + recientes.length + ' partidos recientes/próximos, ' + historial.length + ' de historial');
  const data = Object.assign({}, prev);
  delete data.actualizado;
  data.tenis = {
    fuentes: bloques.map((b) => b.tour.toUpperCase() + ': ' + b.fuente).join(' · '),
    torneos,
    partidos: recientes.sort(byDate),
    historial: historial.sort(byDate).map(corto),
  };
  writeIfChanged(OUT, data, true);
}

main().catch((e) => { console.error('Error en tenis: ' + e.message); process.exitCode = 1; });
