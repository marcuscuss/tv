#!/usr/bin/env node
/*
 * Descarga de Letterboxd el diario (RSS) y las listas de cada usuario de
 * letterboxd-users.json y lo guarda en data/letterboxd/USUARIO.json para Joi.
 * La tele no puede pedir datos a letterboxd.com (CORS): por eso lo hace esta
 * tarea en GitHub y la web lee el JSON desde su mismo dominio.
 *
 * Sin dependencias (Node 18+, usa fetch). Si algo falla (Letterboxd usa
 * Cloudflare y a veces bloquea), se guarda lo conseguido y se conservan los
 * datos anteriores de lo que haya fallado.
 *
 * Uso: node scripts/letterboxd.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const USERS_FILE = path.join(ROOT, 'letterboxd-users.json');
const OUT_DIR = path.join(ROOT, 'data', 'letterboxd');
const BASE = 'https://letterboxd.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';
const DELAY_MS = 1000;
const MAX_DIARY = 40;
const MAX_LIST_FILMS = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Red: una petición por segundo y User-Agent de navegador ---------- */
let lastRequest = 0;
async function get(url) {
  const wait = lastRequest + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' en ' + url);
  return res.text();
}

/* ---------- Utilidades de texto ---------- */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
function decode(s) {
  return String(s || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (ENTITIES[n.toLowerCase()] != null ? ENTITIES[n.toLowerCase()] : m));
}
function stripTags(html) {
  return decode(String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function cdata(s) {
  const m = /<!\[CDATA\[([\s\S]*?)\]\]>/.exec(s || '');
  return m ? m[1] : (s || '');
}
function tag(xml, name) {
  const re = new RegExp('<' + name.replace(':', '\\:') + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name.replace(':', '\\:') + '>', 'i');
  const m = re.exec(xml);
  return m ? cdata(m[1]).trim() : '';
}
function meta(html, prop) {
  const re1 = new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]*content=["\']([^"\']*)["\']', 'i');
  const re2 = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:property|name)=["\']' + prop + '["\']', 'i');
  const m = re1.exec(html) || re2.exec(html);
  return m ? decode(m[1]).trim() : '';
}
/* Las portadas vienen en varios tamaños; pedimos una de 300x450 (2:3), ligera para la tele. */
function posterSize(url) {
  return (url || '').replace(/-0-\d+-0-\d+-crop/, '-0-300-0-450-crop');
}

/* =====================================================================
   a) DIARIO (RSS)
   ===================================================================== */
function parseRss(xml) {
  const out = [];
  const seen = new Set();
  const items = xml.split(/<item>/i).slice(1).map((s) => s.split(/<\/item>/i)[0]);
  for (const it of items) {
    const title = decode(tag(it, 'letterboxd:filmTitle'));
    if (!title) continue;                                  // listas y otras entradas que no son pelis
    const link = tag(it, 'link');
    const key = link.replace(/\/\d+\/?$/, '/') || title;   // una revisión repetida cuenta una vez
    if (seen.has(key)) continue;
    seen.add(key);
    const desc = tag(it, 'description');
    const img = /<img[^>]+src=["']([^"']+)["']/i.exec(desc);
    // La reseña es el resto del description, sin la portada ni el "Watched on…" automático
    let review = desc.replace(/<p>\s*<img[^>]*>\s*<\/p>/gi, '').replace(/<img[^>]*>/gi, '');
    review = stripTags(review);
    if (/^Watched on\s/i.test(review) && review.split('\n').length === 1) review = '';
    review = review.replace(/^Watched on [^\n]*\n*/i, '').trim();
    const rating = tag(it, 'letterboxd:memberRating');
    out.push({
      title,
      year: tag(it, 'letterboxd:filmYear'),
      rating: rating ? parseFloat(rating) : null,
      watched: tag(it, 'letterboxd:watchedDate'),
      rewatch: /^yes$/i.test(tag(it, 'letterboxd:rewatch')),
      liked: /^yes$/i.test(tag(it, 'letterboxd:memberLike')),
      poster: posterSize(img ? decode(img[1]) : ''),
      review,
      url: link,
    });
    if (out.length >= MAX_DIARY) break;
  }
  return out;
}

/* =====================================================================
   b) LISTAS
   ===================================================================== */
/* De la página /USUARIO/lists/ saca las listas (enlace, nombre, descripción, nº de pelis). */
function parseListsPage(html, user) {
  const lists = [];
  const seen = new Set();
  // Enlaces relativos (/usuario/list/x/) o absolutos (https://letterboxd.com/usuario/list/x/)
  const re = new RegExp('href=["\'](?:https?://letterboxd\\.com)?/' + user + '/list/([^/"\'?#]+)/?["\']', 'gi');
  let m;
  while ((m = re.exec(html))) {
    const slug = m[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    // Bloque de esta lista: desde su enlace hasta el enlace de la siguiente
    const start = m.index;
    const nextRe = new RegExp('href=["\'](?:https?://letterboxd\\.com)?/' + user + '/list/(?!' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/)[^/"\'?#]+/?["\']', 'i');
    const rest = html.slice(start + m[0].length);
    const n = nextRe.exec(rest);
    const block = n ? rest.slice(0, n.index) : rest.slice(0, 4000);
    const nameM = /<h2[^>]*>\s*<a[^>]*>([^<]+)</i.exec(block) || /^[^>]*>\s*([^<\s][^<]{0,199})</.exec(rest);
    const countM = /(\d[\d.,]*)\s*(?:&nbsp;|\s)*films?/i.exec(block);
    const descM = /<div[^>]+class=["'][^"']*body-text[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(block);
    lists.push({
      slug,
      name: nameM ? decode(nameM[1]).trim() : slug.replace(/-/g, ' '),
      count: countM ? parseInt(countM[1].replace(/[.,]/g, ''), 10) : null,
      description: descM ? stripTags(descM[1]) : '',
    });
  }
  return lists;
}

/* De la página de una lista saca los slugs de las pelis (sirve para el HTML antiguo y el nuevo). */
function parseListFilms(html) {
  const slugs = [];
  const re = /data-(?:film-slug|item-slug)=["']([^"']+)["']|data-target-link=["']\/film\/([^/"']+)\/["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const s = m[1] || m[2];
    if (s && slugs.indexOf(s) === -1) slugs.push(s);
    if (slugs.length >= MAX_LIST_FILMS) break;
  }
  return slugs;
}
function parseListMeta(html) {
  const ogDesc = meta(html, 'og:description');
  const countM = /A list of ([\d.,]+) films?/i.exec(ogDesc);
  const aboutM = /About this list:\s*([\s\S]*)$/i.exec(ogDesc);
  return {
    name: meta(html, 'og:title').replace(/\s*[•|‧·]\s*(?:A list by|Letterboxd)[\s\S]*$/i, '').replace(/^.*?['’]s\s+list:\s*/i, '') || '',
    count: countM ? parseInt(countM[1].replace(/[.,]/g, ''), 10) : null,
    description: aboutM ? aboutM[1].trim() : '',
  };
}

/* Ficha de una peli: título, año y portada (JSON-LD de la página; si no, og:image). */
function parseFilmPage(html) {
  let title = '', year = '', poster = '';
  const ld = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (ld) {
    try {
      const j = JSON.parse(ld[1].replace(/\/\*\s*<!\[CDATA\[\s*\*\//, '').replace(/\/\*\s*\]\]>\s*\*\//, '').trim());
      title = j.name || '';
      poster = j.image || '';
      if (j.releasedEvent && j.releasedEvent[0]) year = String(j.releasedEvent[0].startDate || '').slice(0, 4);
    } catch (e) { /* seguimos con las meta */ }
  }
  const og = meta(html, 'og:title') || meta(html, 'twitter:title');
  const ym = /^(.*?)\s*\((\d{4})\)\s*$/.exec(og);
  if (!title) title = ym ? ym[1] : og;
  if (!year && ym) year = ym[2];
  if (!poster) poster = meta(html, 'og:image');
  return { title: decode(title), year, poster: posterSize(poster) };
}

/* =====================================================================
   PROCESO POR USUARIO
   ===================================================================== */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}

async function processUser(user) {
  const file = path.join(OUT_DIR, user + '.json');
  const prev = readJson(file, { user, diary: [], lists: [] });
  const data = { user, profile: BASE + '/' + user + '/', diary: prev.diary || [], lists: prev.lists || [] };
  const log = (msg) => console.log('[' + user + '] ' + msg);

  // Pelis ya conocidas (de listas anteriores): no hace falta volver a pedir su ficha
  const filmCache = {};
  (prev.lists || []).forEach((l) => (l.films || []).forEach((f) => { if (f.slug && f.poster) filmCache[f.slug] = f; }));

  // a) Diario
  try {
    data.diary = parseRss(await get(BASE + '/' + user + '/rss/'));
    log('diario: ' + data.diary.length + ' pelis');
  } catch (e) {
    log('AVISO diario: ' + e.message + ' (se conservan los datos anteriores)');
  }

  // b) Listas
  let lists = null;
  try {
    const listsHtml = await get(BASE + '/' + user + '/lists/');
    lists = parseListsPage(listsHtml, user);
    log('listas encontradas: ' + lists.length);
    if (!lists.length) {
      // Diagnóstico: ¿la página no tiene listas o el formato es otro?
      const t = /<title>([^<]*)<\/title>/i.exec(listsHtml);
      const sample = (listsHtml.match(/href=["'][^"']*\/list\/[^"']*["']/gi) || []).slice(0, 5);
      log('  (página de ' + listsHtml.length + ' bytes, título: "' + (t ? decode(t[1]).trim() : '?') + '", enlaces /list/: ' +
        JSON.stringify(sample) + ', "no lists": ' + /no lists|hasn.t created any lists|no ha creado/i.test(listsHtml) + ')');
    }
  } catch (e) {
    log('AVISO listas: ' + e.message + ' (se conservan las anteriores)');
  }
  if (lists) {
    const prevBySlug = {};
    (prev.lists || []).forEach((l) => { prevBySlug[l.slug] = l; });
    const outLists = [];
    for (const l of lists) {
      const old = prevBySlug[l.slug];
      try {
        const html = await get(BASE + '/' + user + '/list/' + l.slug + '/');
        const metaInfo = parseListMeta(html);
        const slugs = parseListFilms(html);
        const films = [];
        for (const slug of slugs) {
          if (filmCache[slug]) { films.push(filmCache[slug]); continue; }
          try {
            const f = parseFilmPage(await get(BASE + '/film/' + slug + '/'));
            const film = { slug, title: f.title || slug.replace(/-/g, ' '), year: f.year, poster: f.poster, url: BASE + '/film/' + slug + '/' };
            filmCache[slug] = film;
            films.push(film);
          } catch (e) {
            log('  AVISO peli ' + slug + ': ' + e.message);
            const kept = old && (old.films || []).filter((x) => x.slug === slug)[0];
            films.push(kept || { slug, title: slug.replace(/-/g, ' '), year: '', poster: '', url: BASE + '/film/' + slug + '/' });
          }
        }
        outLists.push({
          slug: l.slug,
          name: l.name || metaInfo.name || l.slug,
          description: l.description || metaInfo.description || '',
          count: l.count != null ? l.count : (metaInfo.count != null ? metaInfo.count : films.length),
          url: BASE + '/' + user + '/list/' + l.slug + '/',
          films,
        });
        log('  lista "' + (l.name || l.slug) + '": ' + films.length + ' pelis');
      } catch (e) {
        log('  AVISO lista ' + l.slug + ': ' + e.message + ' (se conserva la anterior)');
        if (old) outLists.push(old);
      }
    }
    data.lists = outLists;
  }

  // c) Guardar solo si ha cambiado
  const json = JSON.stringify(data, null, 1) + '\n';
  let before = '';
  try { before = fs.readFileSync(file, 'utf8'); } catch (e) { /* no existía */ }
  if (json === before) { log('sin cambios'); return false; }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(file, json);
  log('guardado ' + path.relative(ROOT, file));
  return true;
}

async function main() {
  const users = readJson(USERS_FILE, []);
  if (!Array.isArray(users) || !users.length) { console.log('No hay usuarios en letterboxd-users.json'); return; }
  for (const u of users) {
    const user = String(u).trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(user)) { console.log('Usuario no válido: ' + u); continue; }
    try { await processUser(user); } catch (e) { console.log('[' + user + '] ERROR: ' + e.message); }
  }
}

if (require.main === module) main();
module.exports = { parseRss, parseListsPage, parseListFilms, parseListMeta, parseFilmPage };
