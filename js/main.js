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
  var VERSION = 'v8';
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
    // "BIENVENIDO" pequeño encima y el nombre grande; nombres largos se encogen para caber.
    $('hero-hello').textContent = profile.greeting || 'BIENVENIDO';
    var nm = $('hero-name');
    nm.textContent = profile.name;
    nm.style.fontSize = Math.min(150, Math.floor(1150 / (profile.name.length * 0.9))) + 'px';
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
      startTicker(); startGlobe();
    }
  }

  /* ---------- Vídeo de bienvenida ----------
     Lista de fuentes que se prueban en orden: si una da error o no arranca en
     unos segundos, pasa a la siguiente. Para el vídeo del stick hay dos vías
     (mini servidor local e interceptación) porque cada WebView reproduce distinto. */
  var videoToken = 0;
  function vstat(text) {
    if (!bridge) text = '';                        // el aviso es para el stick; en la web no
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
        // Además del .mp4 probamos un .webm con el mismo nombre, por si el
        // motor del stick no reproduce H.264.
        var names = [name], st = 'NO ENCONTRADO', any = false;
        if (/\.mp4$/i.test(name)) names.push(name.replace(/\.mp4$/i, '.webm'));
        for (var n = 0; n < names.length; n++) {
          var s = 'NO ENCONTRADO';
          try {
            s = bridge.videoStatus ? bridge.videoStatus(names[n])
              : (bridge.hasLocalVideo(names[n]) ? 'OK' : 'NO ENCONTRADO');
          } catch (e) {}
          if (n === 0) st = s;
          if (s !== 'OK') continue;
          any = true;
          var ext = names[n].split('.').pop().toUpperCase(), u = '';
          try { u = bridge.localVideoUrl ? bridge.localVideoUrl(names[n]) : ''; } catch (e) {}
          if (u) list.push({ src: u, color: true, tag: 'LOCAL ' + ext });
          list.push({ src: '__local__/' + names[n], color: true, tag: 'LOCAL-2 ' + ext });
        }
        if (!any) {
          vstat('VÍDEO: ' + st);
          if (st === 'SIN PERMISO') { try { bridge.requestStorage(); } catch (e) {} }
        }
      }
      if (profile.fallbackVideo) {
        list.push({ src: profile.fallbackVideo, color: false, tag: 'CRT MP4' });
        list.push({ src: profile.fallbackVideo.replace(/\.mp4$/i, '.webm'), color: false, tag: 'CRT WEBM' });
      }
    } else if (src) {
      list.push({ src: src, color: false, tag: 'URL' });
    }
    list.reasons = [];
    playVideo(list, 0, ++videoToken);
  }
  // Códigos de error de <video>: 1 abortado, 2 red, 3 decodificación, 4 formato no soportado
  var VERR = { 1: 'ABORTADO', 2: 'RED', 3: 'DECODIFICAR', 4: 'FORMATO' };
  function playVideo(list, i, token) {
    var v = $('hero-video'), hero = v.parentNode;
    if (token !== videoToken) return;              // se pidió otro vídeo entretanto
    if (i >= list.length) {
      v.style.display = 'none';
      // El aviso dice qué le pasó a cada intento, para saber dónde atacar.
      if (list.length) vstat('VÍDEO FALLA · ' + list.reasons.join(' · '));
      return;
    }
    var item = list[i], done = false, progress = '';
    function next(why) {
      if (done || token !== videoToken) return;
      done = true;
      list.reasons.push(item.tag + ': ' + why);
      log('> VÍDEO ' + item.tag + ' FALLA: ' + why);
      playVideo(list, i + 1, token);
    }
    v.onplaying = function () {
      if (done || token !== videoToken) return;
      done = true;
      log('> VÍDEO ' + item.tag + ' OK');
      if (item.color) vstat('');
      // Suena el de respaldo: dejamos a la vista por qué fallaron los anteriores.
      else if (list.reasons.length) vstat('VÍDEO · ' + list.reasons.join(' · ') + ' → ' + item.tag + ' OK');
    };
    // Hasta dónde llega: ayuda a ver si descarga pero no decodifica, etc.
    v.onloadedmetadata = function () { progress = 'META ' + v.videoWidth + 'x' + v.videoHeight; };
    v.onloadeddata = function () { progress = 'DATOS'; };
    v.oncanplay = function () { progress = 'LISTO SIN PLAY'; try { v.play(); } catch (e) {} };
    v.onerror = function () {
      var c = v.error ? v.error.code : 0;
      next('ERR ' + c + (VERR[c] ? ' ' + VERR[c] : ''));
    };
    hero.classList.toggle('video-color', item.color);
    v.style.display = '';
    v.muted = true;
    v.src = item.src;
    try { v.load(); } catch (e) {}
    var pr = v.play();
    if (pr && pr.catch) pr.catch(function (e) {
      if (e && e.name === 'NotAllowedError') next('AUTOPLAY BLOQUEADO');
    });
    // El stick es lento: le damos 15 s y, si para entonces no hay error, decimos hasta dónde llegó.
    setTimeout(function () { next('NO ARRANCA' + (progress ? ' (' + progress + ')' : ' (NADA)')); }, 15000);
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
      // Respaldo sin imagen real: tarjeta con el color de la marca, icono y nombre.
      var brand = app.bg
        ? ' brand" style="background:' + app.bg + ';color:' + app.fg
        : '';
      el.innerHTML =
        '<div class="tile-top"><span>CH-' + pad(i + 1) + '</span><span>' + (i < 9 ? '[' + (i + 1) + ']' : '') + '</span></div>' +
        '<div class="tile-ico' + brand + '">' + ico +
          (app.bg ? '<span class="brand-label"' + ((app.label || app.name).length > 9 ? ' style="font-size:30px"' : '') + '>' + (app.label || app.name) + '</span>' : '') + '</div>' +
        '<div class="tile-name">' + (app.label || app.name) + '</div>';
      el.addEventListener('click', function () { setFocus(i); launch(i); });
      el.addEventListener('mouseenter', function () { setFocus(i); });
      grid.appendChild(el);
      tiles.push(el);
      // 1º la imagen de la app instalada en el stick; si no hay, el logo oficial de su web.
      if (!(bridge && app.pkg && applyRealArt(el, app)) && app.domain) applyWebLogo(el, app);
    });
  }

  /* Logo original cargado desde internet al abrir la página (no se guarda en el
     repo), con el mismo servicio que usan los navegadores para los iconos de las
     webs. Si no llega o es demasiado pequeño, se queda el icono estilizado. */
  function applyWebLogo(el, app) {
    var img = new Image();
    img.onload = function () {
      if (img.naturalWidth < 64) return;             // icono genérico o de baja calidad
      var box = el.querySelector('.tile-ico');
      box.className += ' has-logo';
      box.innerHTML = '';
      box.appendChild(img);
    };
    img.className = 'brand-logo';
    img.alt = '';
    img.src = 'https://www.google.com/s2/favicons?sz=256&domain=' + encodeURIComponent(app.domain);
  }

  /* Dentro del APK: la tarjeta entera pasa a ser la imagen REAL de la app, como en
     el inicio del stick. Primero el banner horizontal de TV; si la app no tiene,
     su icono grande sobre un fondo de su propio color. Sin textos. */
  function applyRealArt(el, app) {
    var banner = '', icon = '';
    try { banner = bridge.getBanner ? bridge.getBanner(app.pkg) : ''; } catch (e) {}
    if (!banner) { try { icon = bridge.getIcon ? bridge.getIcon(app.pkg) : ''; } catch (e) {} }
    if (!banner && !icon) return false;              // no instalada: probamos el logo de su web
    el.className += ' has-art' + (banner ? ' has-banner' : ' has-icon');
    var art = document.createElement('div');
    art.className = 'tile-art';
    art.innerHTML = '<img src="' + (banner || icon) + '" alt="">';
    el.appendChild(art);
    if (!banner) tintFromIcon(art, icon);
    return true;
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
