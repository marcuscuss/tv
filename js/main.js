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
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, RED: 403, YELLOW: 405, T: 84, P: 80, L: 76 };
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
  // Tamaño real de la pantalla. Algunos WebView de TV (Fire TV) dan medidas
  // distintas según la API, o 0 al arrancar: nos quedamos con la menor válida.
  function viewSize() {
    var de = document.documentElement;
    var ws = [window.innerWidth, de && de.clientWidth, window.screen && window.screen.width];
    var hs = [window.innerHeight, de && de.clientHeight, window.screen && window.screen.height];
    function minValid(a) {
      var m = 0;
      for (var i = 0; i < a.length; i++) if (a[i] > 0 && (!m || a[i] < m)) m = a[i];
      return m;
    }
    return { w: minValid(ws) || 1920, h: minValid(hs) || 1080 };
  }

  function fit() {
    var v = viewSize();
    var s = Math.min(v.w / 1920, v.h / 1080);
    var t = 'scale(' + s + ')';
    stage.style.webkitTransformOrigin = '0 0';
    stage.style.webkitTransform = t;   // WebView antiguos solo entienden la versión -webkit-
    stage.style.transform = t;
    stage.style.left = ((v.w - 1920 * s) / 2) + 'px';
    stage.style.top = ((v.h - 1080 * s) / 2) + 'px';
    fit.info = v.w + 'x' + v.h + ' @' + (window.devicePixelRatio || 1) + ' x' + s.toFixed(2);
    showDiag(s);
  }

  // Etiqueta de diagnóstico arriba a la izquierda (zona que siempre se ve):
  // versión del código y todas las medidas que da el WebView.
  var VERSION = 'v6';
  function showDiag(s) {
    var d = $('diag');
    if (!d) return;
    if (!/diag/.test(window.location.search)) { d.style.display = 'none'; return; }   // solo con ?diag
    var de = document.documentElement, vv = window.visualViewport;
    d.textContent = VERSION +
      ' | inner ' + window.innerWidth + 'x' + window.innerHeight +
      ' | client ' + (de ? de.clientWidth + 'x' + de.clientHeight : '-') +
      ' | screen ' + (window.screen ? window.screen.width + 'x' + window.screen.height : '-') +
      ' | vv ' + (vv ? Math.round(vv.width) + 'x' + Math.round(vv.height) + ' z' + vv.scale : '-') +
      ' | dpr ' + (window.devicePixelRatio || 1) +
      ' | escala ' + s.toFixed(3);
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

    setupVideo();

    if (!tiles.length) buildGrid();
    setFocus(0);
    ['TERMLINK :: SESIÓN ' + profile.name, 'AUTENTICACIÓN OK', 'PANTALLA ' + (fit.info || '?'), 'CARGANDO ' + CFG.apps.length + ' CANALES', 'SISTEMA LISTO'].forEach(log);

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

  /* ---------- Vídeo de bienvenida ----------
     Lista de fuentes que se prueban en orden: si una da error o no arranca en
     unos segundos, pasa a la siguiente. Para el vídeo del stick hay dos vías
     (mini servidor local e interceptación) porque cada WebView reproduce distinto. */
  var videoToken = 0;
  function vstat(text) {
    var el = $('vstat');
    el.textContent = text || '';
    el.style.display = text ? '' : 'none';
  }
  function setupVideo() {
    var src = profile.video, list = [];
    vstat('');
    if (src && src.indexOf('local:') === 0) {
      var name = src.substring(6);
      if (bridge) {
        var st = 'NO ENCONTRADO';
        try {
          st = bridge.videoStatus ? bridge.videoStatus(name)
             : (bridge.hasLocalVideo(name) ? 'OK' : 'NO ENCONTRADO');
        } catch (e) {}
        if (st === 'OK') {
          var u = '';
          try { u = bridge.localVideoUrl ? bridge.localVideoUrl(name) : ''; } catch (e) {}
          if (u) list.push({ src: u, color: true, tag: 'LOCAL' });
          list.push({ src: '__local__/' + name, color: true, tag: 'LOCAL-2' });
        } else {
          vstat('VÍDEO: ' + st);
          if (st === 'SIN PERMISO') { try { bridge.requestStorage(); } catch (e) {} }
        }
      }
      if (profile.fallbackVideo) list.push({ src: profile.fallbackVideo, color: false, tag: 'CRT' });
    } else if (src) {
      list.push({ src: src, color: false, tag: 'URL' });
    }
    playVideo(list, 0, ++videoToken);
  }
  function playVideo(list, i, token) {
    var v = $('hero-video'), hero = v.parentNode;
    if (token !== videoToken) return;              // se pidió otro vídeo entretanto
    if (i >= list.length) {
      v.style.display = 'none';
      if (list.length) vstat('VÍDEO: NINGUNA FUENTE FUNCIONA');
      return;
    }
    var item = list[i], done = false;
    function next(why) {
      if (done || token !== videoToken) return;
      done = true;
      log('> VÍDEO ' + item.tag + ' FALLA: ' + why);
      playVideo(list, i + 1, token);
    }
    v.onplaying = function () {
      if (done || token !== videoToken) return;
      done = true;
      log('> VÍDEO ' + item.tag + ' OK');
      if (item.color) vstat('');                   // si era el CRT de respaldo, se queda el aviso
    };
    v.onerror = function () { next('ERROR ' + (v.error ? v.error.code : '?')); };
    hero.classList.toggle('video-color', item.color);
    v.style.display = '';
    v.muted = true;
    v.src = item.src;
    try { v.load(); } catch (e) {}
    var pr = v.play();
    if (pr && pr.catch) pr.catch(function (e) { if (e && e.name === 'NotAllowedError') next('BLOQUEADO'); });
    setTimeout(function () { next('NO ARRANCA'); }, 7000);
  }

  function backToProfiles() {
    screen = 'profile';
    $('launcher').classList.add('hidden');
    $('profile-screen').classList.remove('hidden');
    videoToken++;                                  // corta los intentos de vídeo pendientes
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
      if (bridge && app.pkg) applyRealArt(el, app);
    });
  }

  /* Dentro del APK: la tarjeta entera pasa a ser la imagen REAL de la app, como en
     el inicio del stick. Primero el banner horizontal de TV; si la app no tiene,
     su icono grande sobre un fondo de su propio color. Sin textos. */
  function applyRealArt(el, app) {
    var banner = '', icon = '';
    try { banner = bridge.getBanner ? bridge.getBanner(app.pkg) : ''; } catch (e) {}
    if (!banner) { try { icon = bridge.getIcon ? bridge.getIcon(app.pkg) : ''; } catch (e) {} }
    if (!banner && !icon) return;                    // no instalada: se queda el icono estilizado
    el.className += ' has-art' + (banner ? ' has-banner' : ' has-icon');
    var art = document.createElement('div');
    art.className = 'tile-art';
    art.innerHTML = '<img src="' + (banner || icon) + '" alt="">';
    el.appendChild(art);
    if (!banner) tintFromIcon(art, icon);
  }

  // Fondo de la tarjeta = color del propio icono (miramos los bordes, que suelen
  // ser el fondo del logo). Si no se puede, se queda el fondo oscuro.
  function tintFromIcon(box, src) {
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas'), w = img.width, h = img.height;
        c.width = w; c.height = h;
        var g = c.getContext('2d'); g.drawImage(img, 0, 0);
        var pts = [[0.5, 0.06], [0.06, 0.5], [0.94, 0.5], [0.5, 0.94], [0.2, 0.2]];
        for (var i = 0; i < pts.length; i++) {
          var d = g.getImageData(Math.floor(w * pts[i][0]), Math.floor(h * pts[i][1]), 1, 1).data;
          if (d[3] > 200) { box.style.backgroundColor = 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')'; return; }
        }
      } catch (e) {}
    };
    img.src = src;
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
  function goBack() {
    if (cancelLaunch()) return;
    if (screen === 'launcher') { backToProfiles(); return; }
    try { window.close(); } catch (err) {}
  }
  window.__joiBack = goBack;   // el APK llama aquí cuando se pulsa ATRÁS en el mando

  function onKey(e) {
    var k = e.keyCode;
    if (BACK.indexOf(k) !== -1) {
      e.preventDefault();
      goBack();
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
      case KEY.YELLOW: case KEY.L:
        var on = !document.body.classList.contains('lite');
        document.body.classList.toggle('lite', on);
        store('launcher.lite', on ? '1' : '0');
        log('> MODO ' + (on ? 'LIGERO' : 'COMPLETO') + ' (reabre para aplicarlo entero)');
        break;
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

  // Animación CSS (la mueve la GPU) en vez de recalcular la posición en cada fotograma.
  function startTicker() {
    var el = $('ticker-text');
    el.textContent = CFG.ticker.join('   ///   ') + '   ///   ';
    el.textContent += el.textContent;
    var secs = Math.max(20, Math.round(el.offsetWidth / 2 / 90));   // ~90 px por segundo
    var anim = 'ticker ' + secs + 's linear infinite';
    el.style.webkitAnimation = anim;
    el.style.animation = anim;
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
    var lite = document.body.classList.contains('lite');
    setInterval(function () {
      angle += lite ? 0.12 : 0.04;
      for (var m = 0; m < meridians.length; m++) meridians[m].setAttribute('rx', Math.abs(R * Math.sin(angle + m * Math.PI / meridians.length)).toFixed(1));
    }, lite ? 200 : 66);   // en modo ligero gira a saltos, gastando 3 veces menos
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
      if (document.body.classList.contains('lite')) { scheduleGlitch(); return; }
      var t = $('hero-title'); t.classList.remove('glitch'); void t.offsetWidth; t.classList.add('glitch');
      scheduleGlitch();
    }, 4000 + Math.random() * 6000);
  }

  /* ---------- Arranque ---------- */
  function boot() {
    // Modo ligero: por defecto dentro de la app (sticks con poca potencia).
    // ?lite lo fuerza, ?full lo quita, y la tecla amarilla / L lo alterna y lo recuerda.
    var saved = store('launcher.lite');
    var lite = saved !== null ? saved === '1' : !!bridge;
    if (/lite/.test(window.location.search)) lite = true;
    if (/full/.test(window.location.search)) lite = false;
    if (lite) document.body.classList.add('lite');
    fit();
    window.addEventListener('resize', fit);
    window.addEventListener('load', fit);
    // El WebView a veces informa del tamaño final un poco después de arrancar.
    setTimeout(fit, 300); setTimeout(fit, 1000); setTimeout(fit, 2500);
    document.addEventListener('keydown', onKey);
    buildProfiles();
    window.addEventListener('pageshow', function () { $('calling').classList.add('hidden'); $('calling-bar').style.width = '0'; });
  }
  boot();
})();
