#!/usr/bin/env node
/*
 * Estrenos de cine en España para NEWS WATCH.
 * Pide a TMDB la cartelera (now_playing) y los próximos estrenos (upcoming)
 * con region=ES y language=es-ES, y guarda data/estrenos.json.
 *
 * Necesita la variable TMDB_API_KEY (secreto del repositorio). Vale la
 * "API Key" (v3) o el "API Read Access Token" (v4, empieza por eyJ).
 * Si algo falla, se conserva el archivo anterior. Solo escribe si cambia.
 */
'use strict';

const fs = require('fs');
const path = require('path');

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

async function main() {
  if (!KEY) {
    console.error('Falta TMDB_API_KEY: añádelo en Settings → Secrets and variables → Actions.');
    process.exit(1);
  }
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

  if (!nowPlaying.length && !upcoming.length) throw new Error('TMDB no devolvió películas');

  const data = { region: 'ES', now_playing: nowPlaying, upcoming };
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* no había archivo */ }
  if (prev && JSON.stringify({ ...prev, updated: undefined }) === JSON.stringify({ ...data, updated: undefined })) {
    console.log('Sin cambios en la cartelera');
    return;
  }
  data.updated = new Date().toISOString();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(data, null, 1) + '\n');
  console.log('Guardado: ' + nowPlaying.length + ' en cines, ' + upcoming.length + ' próximamente');
}

main().catch((e) => {
  console.error('Error: ' + e.message + ' · se conserva el archivo anterior');
  process.exit(1);
});
