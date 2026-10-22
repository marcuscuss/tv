/*
 * Utilidades comunes de los scripts de datos de Joi (Node 20, sin dependencias).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const DAY = 864e5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

/*
 * Guarda data con el campo "actualizado". Si el contenido no ha cambiado, no
 * escribe (y no hay commit), salvo que la fecha guardada tenga más de 24 h:
 * así la tele sabe que la tarea sigue viva y no muestra [SEÑAL DÉBIL].
 */
function writeIfChanged(file, data) {
  const prev = readJson(file, null);
  const strip = (o) => { const c = Object.assign({}, o); delete c.actualizado; return JSON.stringify(c); };
  if (prev && strip(prev) === strip(data) && prev.actualizado &&
      Date.now() - Date.parse(prev.actualizado) < DAY) {
    console.log('  sin cambios: ' + path.relative(ROOT, file));
    return false;
  }
  const out = Object.assign({ actualizado: new Date().toISOString() }, data);
  out.actualizado = new Date().toISOString();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  console.log('  guardado: ' + path.relative(ROOT, file));
  return true;
}

async function getText(url, opts) {
  opts = opts || {};
  const res = await fetch(url, { headers: Object.assign({ 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' }, opts.headers || {}) });
  if (!res.ok) throw new Error(url + ' → HTTP ' + res.status);
  return res.text();
}
async function getJson(url, opts) { return JSON.parse(await getText(url, opts)); }

/* ---------- TMDB (clave v3 o token v4) ---------- */
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';
function tmdbKey() { return (process.env.TMDB_API_KEY || '').trim(); }
async function tmdb(p, params) {
  const key = tmdbKey();
  const url = new URL(TMDB + p);
  const headers = { Accept: 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key;
  else url.searchParams.set('api_key', key);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.set(k, String(v));
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) return res.json();
    if (attempt < 3 && (res.status === 429 || res.status >= 500)) { await sleep(1500 * attempt); continue; }
    throw new Error('TMDB ' + p + ' → HTTP ' + res.status);
  }
}

// Ficha completa con dónde verla en España y tráiler (prioriza español)
async function tmdbFicha(id) {
  const d = await tmdb('/movie/' + id, { language: 'es-ES', append_to_response: 'videos,watch/providers', include_video_language: 'es,en,null' });
  const es = ((d['watch/providers'] || {}).results || {}).ES || {};
  const vids = ((d.videos || {}).results || []).filter((v) => v.site === 'YouTube');
  const pick = (f) => vids.filter(f)[0];
  const tr = pick((v) => v.iso_639_1 === 'es' && v.type === 'Trailer') || pick((v) => v.type === 'Trailer' && v.iso_639_1 === 'en') ||
    pick((v) => v.type === 'Trailer') || pick((v) => v.type === 'Teaser') || vids[0];
  return {
    id: d.id,
    title: d.title || d.original_title,
    original: d.original_title || '',
    year: (d.release_date || '').slice(0, 4),
    release_date: d.release_date || '',
    overview: d.overview || '',
    vote_average: Math.round((d.vote_average || 0) * 10) / 10,
    genres: (d.genres || []).map((g) => g.name),
    genre_ids: (d.genres || []).map((g) => g.id),
    poster: d.poster_path ? IMG + 'w342' + d.poster_path : '',
    backdrop: d.backdrop_path ? IMG + 'w780' + d.backdrop_path : '',
    providers: (es.flatrate || []).map((p) => p.provider_name),
    trailer: tr ? tr.key : '',
  };
}

function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, 'and').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

module.exports = { ROOT, UA, DAY, sleep, readJson, writeIfChanged, getText, getJson, tmdb, tmdbKey, tmdbFicha, IMG, slugify };
