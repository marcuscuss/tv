#!/usr/bin/env node
/*
 * Real Madrid → bloque "madrid" de data/deportes.json
 *
 * Fuente principal: football-data.org v4 (/teams/86/matches del mes pasado al
 * que viene), con la clave FOOTBALL_DATA_KEY en la cabecera X-Auth-Token.
 * Una sola petición (el plan gratuito permite 10 por minuto).
 * Respaldo (sin clave o si falla): calendario y resultados de ESPN.
 * Si todo falla, se conserva el bloque anterior.
 */
'use strict';

const path = require('path');
const { ROOT, readJson, writeIfChanged, getJson } = require('./lib');

const OUT = path.join(ROOT, 'data', 'deportes.json');
const KEY = (process.env.FOOTBALL_DATA_KEY || '').trim();
const RM_CREST = 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png';

// Competición → liga de ESPN (para el marcador en vivo de la tele) y cadena en España
const COMP = {
  PD: { nombre: 'LaLiga', espn: 'esp.1', tv: 'movistar' },
  CL: { nombre: 'Champions League', espn: 'uefa.champions', tv: 'movistar' },
  CDR: { nombre: 'Copa del Rey', espn: 'esp.copa_del_rey', tv: 'movistar' },
  SC: { nombre: 'Supercopa', espn: 'esp.super_cup', tv: 'movistar' },
  CWC: { nombre: 'Mundial de Clubes', espn: 'fifa.cwc', tv: 'dazn' },
};
const ESPN_LIGA = {
  'esp.1': 'PD', 'uefa.champions': 'CL', 'esp.copa_del_rey': 'CDR', 'esp.super_cup': 'SC', 'fifa.cwc': 'CWC',
};

function iso(d) { return d.toISOString().slice(0, 10); }

async function footballData() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const d = await getJson('https://api.football-data.org/v4/teams/86/matches?dateFrom=' + iso(from) + '&dateTo=' + iso(to),
    { headers: { 'X-Auth-Token': KEY } });
  return (d.matches || []).map((m) => {
    const local = m.homeTeam.id === 86;
    const rival = local ? m.awayTeam : m.homeTeam;
    const c = COMP[m.competition.code] || { nombre: m.competition.name, espn: '', tv: '' };
    const ft = (m.score || {}).fullTime || {};
    const st = m.status;
    return {
      id: 'fd' + m.id,
      comp: c.nombre,
      compLogo: m.competition.emblem || '',
      liga: c.espn,
      tv: c.tv,
      jornada: m.matchday || null,
      fase: m.stage && m.stage !== 'REGULAR_SEASON' ? m.stage.replace(/_/g, ' ') : '',
      rival: rival.shortName || rival.name,
      rivalEscudo: rival.crest || '',
      escudo: RM_CREST,
      local,
      estadio: m.venue || (local ? 'Santiago Bernabéu' : ''),
      fecha: m.utcDate,
      estado: st === 'FINISHED' || st === 'AWARDED' ? 'post' : (st === 'IN_PLAY' || st === 'PAUSED' ? 'in' : 'pre'),
      aplazado: st === 'POSTPONED' || st === 'SUSPENDED' || st === 'CANCELLED',
      goles: ft.home == null ? null : (local ? ft.home : ft.away),
      golesRival: ft.home == null ? null : (local ? ft.away : ft.home),
    };
  });
}

async function espn() {
  const base = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/teams/86/schedule';
  const out = [];
  for (const url of [base, base + '?fixture=true']) {
    const d = await getJson(url);
    for (const e of d.events || []) {
      const c = (e.competitions || [])[0];
      if (!c) continue;
      const me = c.competitors.filter((x) => x.id === '86')[0];
      const ot = c.competitors.filter((x) => x.id !== '86')[0];
      if (!me || !ot) continue;
      const league = ((e.league || {}).slug) || (c.altGameNote || '');
      const slug = /champions/i.test(e.season && e.season.displayName) ? 'uefa.champions'
        : /copa del rey/i.test(e.season && e.season.displayName) ? 'esp.copa_del_rey'
        : /laliga/i.test(e.season && e.season.displayName) ? 'esp.1' : league;
      const code = ESPN_LIGA[slug];
      const info = COMP[code] || { nombre: (e.season && e.season.displayName || '').replace(/^\d{4}-\d{2}\s*/, ''), espn: slug, tv: '' };
      const st = (c.status || e.status || {}).type || {};
      const logo = (t) => (t.logos && t.logos[0] && t.logos[0].href) || t.logo || '';
      const score = (x) => (x.score && x.score.value != null ? x.score.value : (x.score != null && x.score !== '' ? parseInt(x.score, 10) : null));
      out.push({
        id: 'es' + e.id,
        espnId: e.id,
        comp: info.nombre,
        compLogo: '',
        liga: info.espn,
        tv: info.tv,
        jornada: null,
        fase: (e.seasonType && /phase|round|final/i.test(e.seasonType.name)) ? e.seasonType.name : '',
        rival: ot.team.shortDisplayName || ot.team.displayName,
        rivalEscudo: logo(ot.team),
        escudo: RM_CREST,
        local: me.homeAway === 'home',
        estadio: (c.venue && c.venue.fullName) || '',
        fecha: new Date(e.date).toISOString(),
        estado: st.state || (st.completed ? 'post' : 'pre'),
        aplazado: /postponed|canceled/i.test(st.name || ''),
        goles: st.state === 'pre' ? null : score(me),
        golesRival: st.state === 'pre' ? null : score(ot),
      });
    }
  }
  const seen = new Set();
  return out.filter((m) => !seen.has(m.id) && seen.add(m.id)).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
}

async function main() {
  const prev = readJson(OUT, {});
  let partidos = null, fuente = '';
  if (KEY) {
    try { partidos = await footballData(); fuente = 'football-data.org'; }
    catch (e) { console.log('AVISO football-data: ' + e.message + ' · se prueba ESPN'); }
  } else console.log('Sin FOOTBALL_DATA_KEY: se usa ESPN');
  if (!partidos || !partidos.length) {
    try { partidos = await espn(); fuente = 'espn'; }
    catch (e) { console.log('AVISO ESPN: ' + e.message); }
  }
  if (!partidos || !partidos.length) { console.log('Madrid: sin datos nuevos, se conserva el bloque anterior'); return; }
  // Del mes pasado al que viene
  const desde = Date.now() - 35 * 864e5, hasta = Date.now() + 62 * 864e5;
  partidos = partidos.filter((m) => { const t = Date.parse(m.fecha); return t >= desde && t <= hasta; });
  console.log('Madrid (' + fuente + '): ' + partidos.length + ' partidos');
  const data = Object.assign({}, prev);
  delete data.actualizado;
  data.madrid = { fuente, partidos };
  writeIfChanged(OUT, data, true);
}

main().catch((e) => { console.error('Error en madrid: ' + e.message); process.exitCode = 1; });
