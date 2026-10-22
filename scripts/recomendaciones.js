#!/usr/bin/env node
/*
 * Recomendaciones de CH 03 CINE → data/recomendaciones.json
 *
 *  - "PORQUE TE GUSTÓ …": de mi diario de Letterboxd, las pelis con nota ≥ 4.5
 *    (el RSS trae tmdb:movieId); para las 6 más recientes, /movie/{id}/recommendations.
 *  - Por género (/discover/movie, vote_count ≥ 300, mejor nota primero).
 *  - Temáticas: navideñas (keyword 207317) y románticas (10749).
 *  - "TU TERROR": las de terror que ya he visto.
 *  - Excluye lo ya visto: diario + todas las páginas de /USUARIO/films/
 *    (caché en data/letterboxd/USUARIO-vistas.json; si falla, se usa la caché).
 *  - Cada peli lleva dónde verla en España (flatrate) y el tráiler de YouTube.
 *
 * Necesita TMDB_API_KEY. Sin clave, no toca el archivo anterior.
 */
'use strict';

const path = require('path');
const { ROOT, sleep, readJson, writeIfChanged, getText, tmdb, tmdbKey, tmdbFicha, IMG, slugify } = require('./lib');

const USERS = readJson(path.join(ROOT, 'letterboxd-users.json'), ['marcus_cus']);
const USER = String(USERS[0] || 'marcus_cus').toLowerCase();
const OUT = path.join(ROOT, 'data', 'recomendaciones.json');
const VISTAS = path.join(ROOT, 'data', 'letterboxd', USER + '-vistas.json');
const DIARIO = path.join(ROOT, 'data', 'letterboxd', USER + '.json');

const GENEROS = [
  { id: 27, nombre: 'Terror' },
  { id: 53, nombre: 'Thriller' },
  { id: 878, nombre: 'Ciencia ficción' },
  { id: 28, nombre: 'Acción' },
  { id: 35, nombre: 'Comedia' },
  { id: 18, nombre: 'Drama' },
];
const POR_FILA = 14;

/* ---------- Pelis vistas en Letterboxd (todas las páginas) ---------- */
async function vistas() {
  const cache = readJson(VISTAS, { slugs: [] });
  try {
    const slugs = [];
    let last = 1;
    for (let n = 1; n <= last && n <= 80; n++) {
      const html = await getText('https://letterboxd.com/' + USER + '/films/page/' + n + '/');
      const re = /data-(?:film|item)-slug="([^"]+)"|data-target-link="\/film\/([^"\/]+)\/"/g;
      let m;
      while ((m = re.exec(html))) { const s = m[1] || m[2]; if (slugs.indexOf(s) === -1) slugs.push(s); }
      if (n === 1 && !/data-(film|item)-slug|data-target-link/.test(html)) {
        const t = /<title>([^<]*)<\/title>/i.exec(html);
        throw new Error('la página no trae pelis (' + html.length + ' bytes, título: ' + (t ? t[1].trim() : '?') + ')');
      }
      const pages = (html.match(/\/films\/page\/(\d+)\//g) || []).map((x) => parseInt(x.replace(/\D/g, ''), 10));
      last = Math.max(last, ...pages, 1);
      await sleep(1000);
    }
    if (!slugs.length) throw new Error('no se encontró ninguna peli');
    console.log('Vistas en Letterboxd: ' + slugs.length);
    writeIfChanged(VISTAS, { usuario: USER, slugs: slugs.sort() });
    return slugs;
  } catch (e) {
    console.log('AVISO vistas: ' + e.message + ' · se usa la caché (' + (cache.slugs || []).length + ')');
    return cache.slugs || [];
  }
}

async function main() {
  if (!tmdbKey()) { console.log('Sin TMDB_API_KEY: no se generan recomendaciones (se conserva el archivo anterior)'); return; }
  const diario = (readJson(DIARIO, {}).diary || []);
  const prev = readJson(OUT, {});
  const slugs = new Set(await vistas());
  const vistosId = new Set(diario.map((f) => f.tmdbId).filter(Boolean));

  function visto(m) {
    if (vistosId.has(m.id)) return true;
    const y = (m.release_date || '').slice(0, 4);
    for (const t of [m.title, m.original_title]) {
      const s = slugify(t);
      if (s && (slugs.has(s) || slugs.has(s + '-' + y))) return true;
    }
    return false;
  }
  function basicos(list) {
    return (list || []).filter((m) => m && !m.adult && m.poster_path && !visto(m));
  }

  // Fichas (con plataformas y tráiler), con caché en memoria
  const fichas = {};
  async function ficha(id) {
    if (!fichas[id]) { fichas[id] = await tmdbFicha(id).catch(() => null); await sleep(40); }
    return fichas[id];
  }
  async function completar(list) {
    const out = [];
    for (const m of list.slice(0, POR_FILA)) { const f = await ficha(m.id); if (f) out.push(f); }
    return out;
  }

  // 1) Porque te gustó…
  const favoritas = diario.filter((f) => f.tmdbId && f.rating != null && f.rating >= 4.5)
    .sort((a, b) => (a.watched < b.watched ? 1 : -1));
  const usadas = new Set();
  const porque = [];
  for (const f of favoritas) {
    if (usadas.has(f.tmdbId) || porque.length >= 6) continue;
    usadas.add(f.tmdbId);
    try {
      const r = await tmdb('/movie/' + f.tmdbId + '/recommendations', { language: 'es-ES' });
      const items = await completar(basicos(r.results));
      if (items.length) porque.push({ titulo: 'Porque te gustó ' + f.title, base: { id: f.tmdbId, title: f.title }, items });
    } catch (e) { console.log('AVISO recomendaciones de ' + f.title + ': ' + e.message); }
  }
  console.log('Filas "porque te gustó": ' + porque.length);

  // 2) Por género
  async function discover(params) {
    const out = [];
    for (let page = 1; page <= 2 && out.length < POR_FILA; page++) {
      const r = await tmdb('/discover/movie', Object.assign({ language: 'es-ES', region: 'ES', include_adult: 'false', page }, params));
      out.push(...basicos(r.results));
    }
    return completar(out);
  }
  const generos = [];
  for (const g of GENEROS) {
    try {
      const items = await discover({ with_genres: g.id, 'vote_count.gte': 300, sort_by: 'vote_average.desc' });
      generos.push({ id: g.id, nombre: g.nombre, items });
    } catch (e) {
      console.log('AVISO género ' + g.nombre + ': ' + e.message);
      const old = (prev.generos || []).filter((x) => x.id === g.id)[0];
      if (old) generos.push(old);
    }
  }

  // 3) Temáticas
  const tematicas = Object.assign({}, prev.tematicas || {});
  try { tematicas.navidad = await discover({ with_keywords: 207317, 'vote_count.gte': 100, sort_by: 'popularity.desc' }); }
  catch (e) { console.log('AVISO navidad: ' + e.message); }
  try { tematicas.romance = await discover({ with_genres: 10749, 'vote_count.gte': 300, sort_by: 'vote_average.desc' }); }
  catch (e) { console.log('AVISO romance: ' + e.message); }

  // 4) Tu terror: las del diario con género Terror (27)
  const tuTerror = [];
  for (const f of diario) {
    if (!f.tmdbId) continue;
    const d = await ficha(f.tmdbId);
    if (d && d.genre_ids.indexOf(27) !== -1 && !tuTerror.some((x) => x.id === d.id)) {
      tuTerror.push(Object.assign({}, d, { rating: f.rating, liked: f.liked }));
    }
  }

  const limpia = (l) => l.map((m) => { const c = Object.assign({}, m); delete c.genre_ids; delete c.original; return c; });
  const data = {
    usuario: USER,
    porque: porque.map((p) => Object.assign({}, p, { items: limpia(p.items) })),
    generos: generos.map((g) => Object.assign({}, g, { items: limpia(g.items) })),
    tematicas: { navidad: limpia(tematicas.navidad || []), romance: limpia(tematicas.romance || []) },
    tu_terror: limpia(tuTerror),
  };
  if (!data.porque.length && !data.generos.some((g) => g.items.length)) throw new Error('TMDB no devolvió recomendaciones');
  writeIfChanged(OUT, data);
}

main().catch((e) => { console.error('Error en recomendaciones: ' + e.message + ' · se conserva el archivo anterior'); process.exitCode = 1; });
