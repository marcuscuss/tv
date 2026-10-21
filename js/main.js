/*
 * JOI - launcher retro para TV.
 * ES5 a propósito: los navegadores de TV pueden ser Chromium antiguos.
 */
(function () {
  'use strict';

  var CFG = window.LAUNCHER_CONFIG;
  var ICONS = window.LAUNCHER_ICONS;
  var COLS = 4;
  var THEMES = [
    { id: 'green', label: 'PIP-GREEN' },
    { id: 'cyan',  label: 'REPLICANT CYAN' },
    { id: 'amber', label: 'VEGAS AMBER' }
  ];
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, RED: 403, T: 84, P: 80 };
  var BACK = [8, 27, 461, 10009];

  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage');
  var bridge = window.TVBridge;         // existe solo dentro del APK
  var focusIndex = 0, tiles = [], themeIndex = 0, launchTimer = null, startTime = 0;
  var profile = null, pfIndex = 0, screen = 'profile';  // 'profile' | 'launcher'

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function store(k, v) {
    try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); }
    catch (e) {} return null;
  }

  /* ---------- Escalado ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + s + ')';
    stage.style.left = ((window.innerWidth - 1920 * s) / 2) + 'px';
    stage.style.top = ((window.innerHeight - 1080 * s) / 2) + 'px';
  }

  /* ---------- Temas ---------- */
  function applyTheme(i) {
    themeIndex = (i + THEMES.length) % THEMES.length;
    for (var t = 0; t < THEMES.length; t++) document.body.classList.remove('theme-' + THEMES[t].id);
    document.body.classList.add('theme-' + THEMES[themeIndex].id);
    $('theme-name').textContent = THEMES[themeIndex].label;
    store('launcher.theme', THEMES[themeIndex].id);
  }
  function themeIndexById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return i;
    return 0;
  }

  /* ========== PANTALLA DE PERFILES ========== */
  function buildProfiles() {
    var list = $('profile-list');
    list.innerHTML = '';
    CFG.profiles.forEach(function (p, i) {
      var el = document.createElement('div');
      el.className = 'profile-card';
      var initials = p.name.substring(0, 2);
      el.innerHTML =
        '<div class="pc-avatar"><span>' + initials + '</span></div>' +
        '<div class="pc-name">' + p.name + '</div>' +
        '<div class="pc-id dim small">ID-' + pad(i + 1) + '</div>';
      el.addEventListener('click', function () { pfIndex = i; selectProfile(); });
      el.addEventListener('mouseenter', function () { setProfileFocus(i); });
      list.appendChild(el);
    });
    var last = store('launcher.profile');
    for (var j = 0; j < CFG.profiles.length; j++) if (CFG.profiles[j].id === last) pfIndex = j;
    setProfileFocus(pfIndex);
  }
  function setProfileFocus(i) {
    pfIndex = (i + CFG.profiles.length) % CFG.profiles.length;
    var cards = $('profile-list').children;
    for (var k = 0; k < cards.length; k++) cards[k].className = 'profile-card' + (k === pfIndex ? ' focused' : '');
  }
  function selectProfile() {
    profile = CFG.profiles[pfIndex];
    store('launcher.profile', profile.id);
    startLauncher();
  }

  /* ========== LAUNCHER ========== */
  function startLauncher() {
    screen = 'launcher';
    $('profile-screen').classList.add('hidden');
    $('launcher').classList.remove('hidden');
    startTime = Date.now();

    $('op-name').textContent = profile.name;
    $('operator').textContent = profile.name;
    $('hero-title').textContent = profile.welcome || ('BIENVENIDO ' + profile.name);
    $('sec-code').textContent = Math.floor(10000 + Math.random() * 89999) + '-D-' + Math.floor(1000 + Math.random() * 8999);
    applyTheme(themeIndexById(store('launcher.theme') || profile.theme || 'green'));

    // Vídeo de bienvenida (bucle, silenciado)
    var v = $('hero-video'), hero = v.parentNode, src = profile.video, color = false;
    if (src && src.indexOf('local:') === 0) {
      var name = src.substring(6);
      var found = false;
      try { found = !!(bridge && bridge.hasLocalVideo && bridge.hasLocalVideo(name)); } catch (e) {}
      // El APK sirve esta ruta leyendo el archivo del stick.
      if (found) { src = '__local__/' + name; color = true; }
      else src = profile.fallbackVideo;
    }
    hero.classList.toggle('video-color', color);
    if (src) {
      v.style.display = '';
      v.muted = true;
      if (v.getAttribute('src') !== src) v.src = src;
      var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
    } else { v.style.display = 'none'; }

    if (!tiles.length) buildGrid();
    setFocus(0);
    ['TERMLINK :: SESIÓN ' + profile.name, 'AUTENTICACIÓN OK', 'CARGANDO ' + CFG.apps.length + ' CANALES', 'SISTEMA LISTO'].forEach(log);

    loadWeather();
    if (!startLauncher._once) {
      startLauncher._once = true;
      tickClock(); setInterval(tickClock, 1000);
      setInterval(function () { if (screen === 'launcher') log(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]); }, 7000);
      setInterval(function () {
        var n = 3 + Math.floor(Math.random() * 3);
        $('signal').textContent = new Array(n + 1).join('▮') + new Array(6 - n).join('▯');
      }, 3000);
      setInterval(loadWeather, 15 * 60 * 1000);
      startTicker(); startGlobe(); scheduleGlitch();
    }
  }

  function backToProfiles() {
    screen = 'profile';
    $('launcher').classList.add('hidden');
    $('profile-screen').classList.remove('hidden');
    var v = $('hero-video'); try { v.pause(); } catch (e) {}
    setProfileFocus(pfIndex);
  }

  /* ---------- Grid ---------- */
  function buildGrid() {
    var grid = $('grid');
    CFG.apps.forEach(function (app, i) {
      var el = document.createElement('div');
      el.className = 'tile';
      var ico = (ICONS[app.icon] || ICONS._default);
      el.innerHTML =
        '<div class="tile-top"><span>CH-' + pad(i + 1) + '</span><span>' + (i < 9 ? '[' + (i + 1) + ']' : '') + '</span></div>' +
        '<div class="tile-ico">' + ico + '</div>' +
        '<div class="tile-name">' + app.name + '</div>';
      el.addEventListener('click', function () { setFocus(i); launch(i); });
      el.addEventListener('mouseenter', function () { setFocus(i); });
      grid.appendChild(el);
      tiles.push(el);
      // Dentro del APK: intenta sustituir por el icono REAL de la app instalada.
      if (bridge && bridge.getIcon && app.pkg) {
        try {
          var data = bridge.getIcon(app.pkg);
          if (data) {
            var box = el.querySelector('.tile-ico');
            box.innerHTML = '<img class="app-real" src="' + data + '" alt="">';
          }
        } catch (e) {}
      }
    });
  }
  function setFocus(i) {
    if (i < 0 || i >= tiles.length) return;
    tiles[focusIndex].classList.remove('focused');
    focusIndex = i; tiles[i].classList.add('focused');
    $('sel-name').textContent = '[' + CFG.apps[i].name + ']';
  }
  function move(dx, dy) {
    var col = focusIndex % COLS, next = focusIndex;
    if (dx) { if (col + dx >= 0 && col + dx < COLS) next = focusIndex + dx; }
    else { next = focusIndex + dy * COLS; }
    if (next >= 0 && next < tiles.length && next !== focusIndex) {
      setFocus(next); log('> CANAL ' + pad(next + 1) + ' :: ' + CFG.apps[next].name);
    }
  }

  /* ---------- Lanzar ---------- */
  function openApp(app) {
    if (bridge && app.pkg) {
      try { if (bridge.launchApp(app.pkg)) return; } catch (e) {}
      try { bridge.toastMsg(app.name + ' no está instalada'); } catch (e) {}
      try { bridge.openUrl(app.url); return; } catch (e) {}
    }
    window.location.href = app.url;
  }
  function launch(i) {
    if (launchTimer) return;
    var app = CFG.apps[i];
    $('calling-name').textContent = app.name;
    $('calling').classList.remove('hidden');
    log('> DIALING ' + (app.pkg && bridge ? app.pkg.split(',')[0] : app.url));
    var bar = $('calling-bar'), t0 = Date.now(), dur = bridge ? 700 : 1400;
    launchTimer = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / dur);
      bar.style.width = Math.round(p * 100) + '%';
      if (p >= 1) {
        clearInterval(launchTimer); launchTimer = null; openApp(app);
        setTimeout(function () { $('calling').classList.add('hidden'); bar.style.width = '0'; }, 400);
      }
    }, 50);
  }
  function cancelLaunch() {
    if (!launchTimer) return false;
    clearInterval(launchTimer); launchTimer = null;
    $('calling').classList.add('hidden'); $('calling-bar').style.width = '0';
    log('> LLAMADA CANCELADA'); return true;
  }

  /* ---------- Teclado ---------- */
  function onKey(e) {
    var k = e.keyCode;
    if (BACK.indexOf(k) !== -1) {
      e.preventDefault();
      if (cancelLaunch()) return;
      if (screen === 'launcher') { backToProfiles(); return; }
      try { window.close(); } catch (err) {}
      return;
    }
    if (screen === 'profile') {
      if (k === KEY.LEFT) setProfileFocus(pfIndex - 1);
      else if (k === KEY.RIGHT) setProfileFocus(pfIndex + 1);
      else if (k === KEY.ENTER) selectProfile();
      else return;
      e.preventDefault(); return;
    }
    if (launchTimer) return;
    switch (k) {
      case KEY.LEFT:  move(-1, 0); break;
      case KEY.RIGHT: move(1, 0); break;
      case KEY.UP:    move(0, -1); break;
      case KEY.DOWN:  move(0, 1); break;
      case KEY.ENTER: launch(focusIndex); break;
      case KEY.P:     backToProfiles(); break;
      case KEY.RED: case KEY.T: applyTheme(themeIndex + 1); log('> TEMA :: ' + THEMES[themeIndex].label); break;
      default:
        var n = (k >= 49 && k <= 57) ? k - 48 : (k >= 97 && k <= 105) ? k - 96 : 0;
        if (n && n <= tiles.length) { setFocus(n - 1); launch(n - 1); } else return;
    }
    e.preventDefault();
  }

  /* ---------- Reloj / log / tiempo / ticker / globo ---------- */
  var DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  var MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  function tickClock() {
    var d = new Date();
    $('clock').textContent = pad(d.getHours()) + (d.getSeconds() % 2 ? ' ' : ':') + pad(d.getMinutes());
    $('date').textContent = DAYS[d.getDay()] + ' ' + pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    $('hero-time').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
    var up = Math.floor((Date.now() - startTime) / 1000);
    $('uptime').textContent = pad(Math.floor(up / 3600)) + ':' + pad(Math.floor(up / 60) % 60) + ':' + pad(up % 60);
  }

  var LOG_MAX = 8;
  function log(text) {
    var box = $('log'); if (!box) return;
    var d = new Date(), line = document.createElement('div');
    line.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + text;
    box.appendChild(line);
    while (box.children.length > LOG_MAX) box.removeChild(box.firstChild);
  }
  var AMBIENT = [
    'PING NODO-111 ... OK', 'SCAN BIOMÉTRICO ... SUJETO VERIFICADO', 'RAD LEVEL 0.03 mSv/h',
    'CACHE DE CANALES SINCRONIZADA', 'SIN NUEVOS MODELOS EN LA RED', 'TEMPERATURA NÚCLEO 41°C',
    'TERMLINK PROTOCOL v4.2', 'ENLACE SATÉLITE ESTABLE'
  ];

  function startTicker() {
    var el = $('ticker-text');
    el.textContent = CFG.ticker.join('   ///   ') + '   ///   ';
    el.textContent += el.textContent;
    var x = 0, last = Date.now();
    function step() {
      var now = Date.now(); x -= (now - last) * 0.09; last = now;
      var half = el.offsetWidth / 2; if (half && -x >= half) x += half;
      el.style.transform = 'translateX(' + x + 'px)';
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function startGlobe() {
    var svg = $('globe'), NS = 'http://www.w3.org/2000/svg', R = 90;
    var g = document.createElementNS(NS, 'g'); g.setAttribute('transform', 'rotate(-18)'); svg.appendChild(g);
    function add(tag, attrs) { var el = document.createElementNS(NS, tag); for (var a in attrs) el.setAttribute(a, attrs[a]); g.appendChild(el); return el; }
    add('circle', { cx: 0, cy: 0, r: R });
    [-60, -30, 0, 30, 60].forEach(function (lat) {
      var rad = lat * Math.PI / 180;
      add('ellipse', { cx: 0, cy: -R * Math.sin(rad), rx: R * Math.cos(rad), ry: R * Math.cos(rad) * 0.18 });
    });
    add('line', { x1: 0, y1: -R - 12, x2: 0, y2: R + 12 });
    var meridians = []; for (var i = 0; i < 6; i++) meridians.push(add('ellipse', { cx: 0, cy: 0, rx: R, ry: R }));
    var angle = 0;
    setInterval(function () {
      angle += 0.04;
      for (var m = 0; m < meridians.length; m++) meridians[m].setAttribute('rx', Math.abs(R * Math.sin(angle + m * Math.PI / meridians.length)).toFixed(1));
    }, 66);
  }

  var WCODES = { 0:'DESPEJADO',1:'CASI DESPEJADO',2:'NUBES DISPERSAS',3:'NUBLADO',45:'NIEBLA',48:'NIEBLA HELADA',51:'LLOVIZNA',53:'LLOVIZNA',55:'LLOVIZNA DENSA',61:'LLUVIA LIGERA',63:'LLUVIA',65:'LLUVIA FUERTE',71:'NIEVE LIGERA',73:'NIEVE',75:'NIEVE FUERTE',80:'CHUBASCOS',81:'CHUBASCOS',82:'CHUBASCOS FUERTES',95:'TORMENTA',96:'TORMENTA',99:'TORMENTA' };
  function loadWeather() {
    var w = profile && profile.weather; if (!w) return;
    $('w-place').textContent = w.place;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.open-meteo.com/v1/forecast?latitude=' + w.lat + '&longitude=' + w.lon + '&current_weather=true');
    xhr.onload = function () {
      try {
        var cw = JSON.parse(xhr.responseText).current_weather;
        $('w-temp').textContent = Math.round(cw.temperature) + '°';
        $('w-desc').textContent = WCODES[cw.weathercode] || 'CÓDIGO ' + cw.weathercode;
        log('> METEO OK :: ' + Math.round(cw.temperature) + '°C');
      } catch (e) { log('> METEO :: RESPUESTA CORRUPTA'); }
    };
    xhr.onerror = function () { log('> METEO :: SIN CONEXIÓN'); };
    xhr.send();
  }

  function scheduleGlitch() {
    setTimeout(function () {
      var t = $('hero-title'); t.classList.remove('glitch'); void t.offsetWidth; t.classList.add('glitch');
      scheduleGlitch();
    }, 4000 + Math.random() * 6000);
  }

  /* ---------- Arranque ---------- */
  function boot() {
    var lite = /lite/.test(window.location.search);
    if (!lite && bridge) { var m = /Chrome\/(\d+)/.exec(navigator.userAgent); if (m && parseInt(m[1], 10) < 70) lite = true; }
    if (lite) document.body.classList.add('lite');
    fit();
    window.addEventListener('resize', fit);
    document.addEventListener('keydown', onKey);
    buildProfiles();
    window.addEventListener('pageshow', function () { $('calling').classList.add('hidden'); $('calling-bar').style.width = '0'; });
  }
  boot();
})();
