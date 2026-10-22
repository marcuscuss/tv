#!/usr/bin/env node
/*
 * Estrenos de cine en España para NEWS WATCH.
 * Pide a TMDB la cartelera (now_playing) y los próximos estrenos (upcoming)
 * con region=ES y language=es-ES, y guarda data/estrenos.json.
 *
 * Con la variable TMDB_API_KEY (secreto del repositorio; vale la "API Key" v3
 * o el "API Read Access Token" v4) usa TMDB. Sin clave, lee la cartelera de
 * SensaCine (en cines y próximos estrenos en España).
 * Si algo falla, se conserva el archivo anterior. Solo escribe si cambia.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { writeIfChanged, tmdbFicha } = require('./lib');

const KEY = (process.env.TMDB_API_KEY || '').trim();
const OUT = path.join(__dirname, '..', 'data', 'estrenos.json');
const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';
const MAX = 20;          // por categoría (la tele enseña 12)

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function tmdb(p, params) {
  const url = new URL(API + p);
  const headers = { Accept: 'application/json' };
  if (KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + KEY;
  else url.searchParams.set('api_key', KEY);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, v);
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.json();
    if (attempt < 3 && (res.status === 429 || res.status >= 500)) { await sleep(1500 * attempt); continue; }
    throw new Error(p + ' → HTTP ' + res.status);
  }
}

async function listPages(p, pages) {
  const out = [];
  for (let page = 1; page <= pages; page++) {
    const d = await tmdb(p, { region: 'ES', language: 'es-ES', page: String(page) });
    out.push(...(d.results || []));
    if (!d.total_pages || page >= d.total_pages) break;
  }
  return out;
}

// Fecha de estreno en cines de España (tipo 3 = cines, 2 = limitado)
async function spainDate(id, fallback) {
  try {
    const d = await tmdb('/movie/' + id + '/release_dates');
    const es = (d.results || []).find((r) => r.iso_3166_1 === 'ES');
    if (es) {
      const rel = es.release_dates.filter((x) => x.type === 3 || x.type === 2)
        .map((x) => x.release_date.slice(0, 10)).sort();
      if (rel.length) return rel[0];
    }
  } catch (e) { /* se usa la fecha general */ }
  return fallback || '';
}

/* ---------- SensaCine (sin clave) ---------- */
const SC = 'https://www.sensacine.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

function clean(t) {
  return String(t || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ').trim();
}
function esDate(t) {
  const m = /(\d{1,2}) de ([a-zé]+) de (\d{4})/i.exec(t || '');
  if (!m || !MESES[m[2].toLowerCase()]) return '';
  return m[3] + '-' + String(MESES[m[2].toLowerCase()]).padStart(2, '0') + '-' + m[1].padStart(2, '0');
}
async function page(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' } });
  if (!res.ok) throw new Error(url + ' → HTTP ' + res.status);
  return res.text();
}
function parseCards(html) {
  const out = [];
  const parts = html.split(/<div class="card entity-card entity-card-list/).slice(1);
  for (const p of parts) {
    const link = /class="meta-title-link"[^>]*href="(\/peliculas\/pelicula-(\d+)\/)"[^>]*>([\s\S]*?)<\/a>/.exec(p);
    if (!link) continue;
    const img = /class="thumbnail-img"[^>]*?(?:data-src|src)="(https:[^"]+)"/.exec(p);
    const info = /meta-body-info">([\s\S]*?)<\/div>/.exec(p);
    const genres = [];
    if (info) {
      const re = /dark-grey-link"[^>]*>([^<]+)</g;
      let g;
      while ((g = re.exec(info[1]))) genres.push(clean(g[1]));
    }
    const note = /stareval-note">\s*([\d,]+)\s*</.exec(p);
    const syn = /class="content-txt[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(p);
    let poster = img ? img[1] : '';
    if (poster && /^data:/.test(poster)) poster = '';
    poster = poster.replace(/\/c_\d+_\d+\//, '/c_342_456/');
    out.push({
      id: 'sc' + link[2],
      title: clean(link[3]),
      release_date: esDate(info ? clean(info[1]) : ''),
      overview: syn ? clean(syn[1]) : '',
      vote_average: note ? Math.round(parseFloat(note[1].replace(',', '.')) * 20) / 10 : 0,
      genres,
      poster,
      backdrop: '',
      url: SC + link[1],
    });
  }
  return out;
}
// La ficha trae sinopsis completa e imagen grande (og:image)
async function enrich(m) {
  try {
    const h = await page(m.url);
    const og = /<meta property="og:image" content="([^"]+)"/.exec(h);
    if (og) m.backdrop = og[1];
    const syn = /<section[^>]*synopsis[\s\S]*?<div class="content-txt[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(h) ||
      /<meta name="description" content="([^"]+)"/.exec(h);
    if (syn && clean(syn[1]).length > m.overview.length) m.overview = clean(syn[1]);
  } catch (e) { /* se queda con lo de la lista */ }
  delete m.url;
  return m;
}
async function sensacine() {
  const today = new Date().toISOString().slice(0, 10);
  let now = [], up = [];
  for (const p of [1, 2]) {
    try { now = now.concat(parseCards(await page(SC + '/peliculas/en-cartelera/cines/' + (p > 1 ? '?page=' + p : '')))); } catch (e) { if (p === 1) throw e; }
  }
  // Próximos estrenos: una página por semana (viernes), las próximas 6 semanas
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 2) % 7));   // viernes de esta semana (o el anterior)
  for (let w = 0; w <= 6; w++) {
    const day = new Date(d.getTime() + w * 7 * 864e5).toISOString().slice(0, 10);
    try { up = up.concat(parseCards(await page(SC + '/peliculas/estrenos/es/week-' + day + '/'))); }
    catch (e) { console.log('Semana ' + day + ': ' + e.message); }
    await sleep(300);
  }
  const seen = new Set();
  const uniq = (l) => l.filter((m) => !seen.has(m.id) && seen.add(m.id));
  now = uniq(now.filter((m) => !m.release_date || m.release_date <= today)).slice(0, MAX);
  up = uniq(up.filter((m) => m.release_date > today))
    .sort((a, b) => (a.release_date < b.release_date ? -1 : 1)).slice(0, MAX);
  console.log('SensaCine: ' + now.length + ' en cines, ' + up.length + ' próximamente');
  for (const m of now.slice(0, 12).concat(up.slice(0, 12))) { await enrich(m); await sleep(400); }
  for (const m of now.concat(up)) delete m.url;
  return { source: 'sensacine', now_playing: now, upcoming: up };
}

async function main() {
  let data;
  if (KEY) data = await fromTmdb();
  else {
    console.log('Sin TMDB_API_KEY: se usa SensaCine');
    data = await sensacine();
  }
  if (!data.now_playing.length && !data.upcoming.length) throw new Error('No se encontraron películas');
  await save(data);
}

async function fromTmdb() {
  const genresRes = await tmdb('/genre/movie/list', { language: 'es-ES' });
  const genres = {};
  for (const g of genresRes.genres || []) genres[g.id] = g.name;

  const today = new Date().toISOString().slice(0, 10);
  const nowRaw = await listPages('/movie/now_playing', 2);
  const upRaw = await listPages('/movie/upcoming', 3);

  async function convert(list, kind) {
    const seen = new Set();
    const out = [];
    for (const m of list) {
      if (seen.has(m.id) || out.length >= MAX * 2) continue;
      seen.add(m.id);
      const date = await spainDate(m.id, m.release_date);
      await sleep(60);
      out.push({
        id: m.id,
        title: m.title || m.original_title,
        release_date: date,
        overview: m.overview || '',
        vote_average: Math.round((m.vote_average || 0) * 10) / 10,
        genres: (m.genre_ids || []).map((g) => genres[g]).filter(Boolean),
        poster: m.poster_path ? IMG + 'w342' + m.poster_path : '',
        backdrop: m.backdrop_path ? IMG + 'w780' + m.backdrop_path : '',
        popularity: m.popularity || 0,
        kind,
      });
    }
    return out;
  }

  let nowPlaying = await convert(nowRaw, 'now');
  let upcoming = await convert(upRaw, 'up');

  // En cines: ya estrenadas en España, primero las más populares.
  nowPlaying = nowPlaying.filter((m) => !m.release_date || m.release_date <= today)
    .sort((a, b) => b.popularity - a.popularity).slice(0, MAX);
  // Próximamente: aún por estrenar, por fecha.
  const inNow = new Set(nowPlaying.map((m) => m.id));
  upcoming = upcoming.filter((m) => m.release_date > today && !inNow.has(m.id))
    .sort((a, b) => (a.release_date < b.release_date ? -1 : 1)).slice(0, MAX);

  for (const m of nowPlaying.concat(upcoming)) { delete m.popularity; delete m.kind; }
  return { source: 'tmdb', now_playing: nowPlaying, upcoming };
}

async function save(data) {
  data.region = 'ES';
  // Con clave de TMDB: dónde verla en España y tráiler de cada estreno
  if (KEY && data.source === 'tmdb') {
    for (const m of data.now_playing.concat(data.upcoming)) {
      try { const f = await tmdbFicha(m.id); m.providers = f.providers; m.trailer = f.trailer; m.fondo = f.fondo; } catch (e) { m.providers = []; m.trailer = ''; }
      await sleep(40);
    }
  }
  if (writeIfChanged(OUT, data)) console.log('Estrenos: ' + data.now_playing.length + ' en cines, ' + data.upcoming.length + ' próximamente');
}

main().catch((e) => {
  console.error('Error en estrenos: ' + e.message + ' · se conserva el archivo anterior');
  process.exitCode = 1;
});
