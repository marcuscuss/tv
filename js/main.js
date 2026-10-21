/*
 * HISENSE//TERMINAL - launcher retro para TV.
 * ES5 a propósito: los navegadores de VIDAA pueden ser versiones antiguas de Chromium.
 */
(function () {
  'use strict';

  var CFG = window.LAUNCHER_CONFIG;
  var COLS = 4;
  var THEMES = [
    { id: 'green', label: 'PIP-GREEN' },
    { id: 'cyan',  label: 'REPLICANT CYAN' },
    { id: 'amber', label: 'VEGAS AMBER' }
  ];
  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
    BACK: [8, 27, 461, 10009], RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406, T: 84
  };

  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage');
  var focusIndex = 0;
  var tiles = [];
  var themeIndex = 0;
  var launchTimer = null;
  var startTime = Date.now();

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { /* almacenamiento no disponible */ }
    return null;
  }

  /* ---------- Escalado a la pantalla ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + s + ')';
    stage.style.left = ((window.innerWidth - 1920 * s) / 2) + 'px';
    stage.style.top = ((window.innerHeight - 1080 * s) / 2) + 'px';
  }

  /* ---------- Temas ---------- */
  function applyTheme(i) {
    themeIndex = (i + THEMES.length) % THEMES.length;
    var body = document.body;
    for (var t = 0; t < THEMES.length; t++) body.classList.remove('theme-' + THEMES[t].id);
    body.classList.add('theme-' + THEMES[themeIndex].id);
    $('theme-name').textContent = THEMES[themeIndex].label;
    store('launcher.theme', THEMES[themeIndex].id);
  }

  function initialTheme() {
    var saved = store('launcher.theme') || CFG.theme;
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === saved) return i;
    return 0;
  }

  /* ---------- Grid de apps ---------- */
  function buildGrid() {
    var grid = $('grid');
    CFG.apps.forEach(function (app, i) {
      var el = document.createElement('div');
      el.className = 'tile';
      el.innerHTML =
        '<div class="tile-top"><span>CH-' + pad(i + 1) + '</span><span>' + (i < 9 ? '[' + (i + 1) + ']' : '') + '</span></div>' +
        '<div class="tile-code">' + app.code + '</div>' +
        '<div><div class="tile-name">' + app.name + '</div><div class="tile-jp">' + app.jp + '</div></div>';
      el.addEventListener('click', function () { setFocus(i); launch(i); });
      el.addEventListener('mouseenter', function () { setFocus(i); });
      grid.appendChild(el);
      tiles.push(el);
    });
  }

  function setFocus(i) {
    if (i < 0 || i >= tiles.length) return;
    tiles[focusIndex].classList.remove('focused');
    focusIndex = i;
    tiles[i].classList.add('focused');
    $('sel-name').textContent = '[' + CFG.apps[i].name + ']';
  }

  function move(dx, dy) {
    var col = focusIndex % COLS;
    var next = focusIndex;
    if (dx) {
      if (col + dx >= 0 && col + dx < COLS) next = focusIndex + dx;
    } else {
      next = focusIndex + dy * COLS;
    }
    if (next >= 0 && next < tiles.length && next !== focusIndex) {
      setFocus(next);
      log('> CANAL ' + pad(next + 1) + ' :: ' + CFG.apps[next].name);
    }
  }

  /* ---------- Lanzar app ---------- */
  function launch(i) {
    if (launchTimer) return;
    var app = CFG.apps[i];
    $('calling-name').textContent = app.name;
    $('calling').classList.remove('hidden');
    log('> DIALING ' + app.url);

    var bar = $('calling-bar');
    var t0 = Date.now();
    var duration = 1400;
    launchTimer = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / duration);
      bar.style.width = Math.round(p * 100) + '%';
      if (p >= 1) {
        clearInterval(launchTimer);
        launchTimer = null;
        window.location.href = app.url;
      }
    }, 50);
  }

  function cancelLaunch() {
    if (!launchTimer) return false;
    clearInterval(launchTimer);
    launchTimer = null;
    $('calling').classList.add('hidden');
    $('calling-bar').style.width = '0';
    log('> LLAMADA CANCELADA');
    return true;
  }

  /* ---------- Teclado / mando ---------- */
  function onKey(e) {
    var k = e.keyCode;
    if (KEY.BACK.indexOf(k) !== -1) {
      if (cancelLaunch()) e.preventDefault();
      return;
    }
    if (launchTimer) return;

    switch (k) {
      case KEY.LEFT:  move(-1, 0); break;
      case KEY.RIGHT: move(1, 0); break;
      case KEY.UP:    move(0, -1); break;
      case KEY.DOWN:  move(0, 1); break;
      case KEY.ENTER: launch(focusIndex); break;
      case KEY.RED: case KEY.T:
        applyTheme(themeIndex + 1);
        log('> TEMA :: ' + THEMES[themeIndex].label);
        break;
      default:
        // 1-9 en teclado normal o numérico
        var n = (k >= 49 && k <= 57) ? k - 48 : (k >= 97 && k <= 105) ? k - 96 : 0;
        if (n && n <= tiles.length) { setFocus(n - 1); launch(n - 1); }
        else return;
    }
    e.preventDefault();
  }

  /* ---------- Reloj y uptime ---------- */
  var DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
  var MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  function tickClock() {
    var d = new Date();
    $('clock').textContent = pad(d.getHours()) + (d.getSeconds() % 2 ? ' ' : ':') + pad(d.getMinutes());
    $('date').textContent = DAYS[d.getDay()] + ' ' + pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    var up = Math.floor((Date.now() - startTime) / 1000);
    $('uptime').textContent = pad(Math.floor(up / 3600)) + ':' + pad(Math.floor(up / 60) % 60) + ':' + pad(up % 60);
  }

  /* ---------- Log del sistema ---------- */
  var LOG_MAX = 8;
  function log(text) {
    var box = $('log');
    var d = new Date();
    var line = document.createElement('div');
    line.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ' ' + text;
    box.appendChild(line);
    while (box.children.length > LOG_MAX) box.removeChild(box.firstChild);
  }

  var AMBIENT = [
    'PING VAULT-111 ... OK',
    'SCAN VOIGHT-KAMPFF ... SUJETO HUMANO',
    'RAD LEVEL 0.03 mSv/h',
    'CACHE DE CANALES SINCRONIZADA',
    'TYRELL CORP :: SIN NUEVOS MODELOS',
    'NEXUS-6 NO DETECTADO EN LA RED',
    'TEMPERATURA NÚCLEO 41°C',
    'ROBCO TERMLINK PROTOCOL v4.2'
  ];

  /* ---------- Ticker ---------- */
  function startTicker() {
    var el = $('ticker-text');
    el.textContent = CFG.ticker.join('   ///   ') + '   ///   ';
    el.textContent += el.textContent;
    var x = 0;
    var last = Date.now();
    function step() {
      var now = Date.now();
      x -= (now - last) * 0.09;
      last = now;
      var half = el.offsetWidth / 2;
      if (half && -x >= half) x += half;
      el.style.transform = 'translateX(' + x + 'px)';
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Globo wireframe ---------- */
  function startGlobe() {
    var svg = $('globe');
    var NS = 'http://www.w3.org/2000/svg';
    var R = 90;
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', 'rotate(-18)');
    svg.appendChild(g);

    function add(tag, attrs) {
      var el = document.createElementNS(NS, tag);
      for (var a in attrs) el.setAttribute(a, attrs[a]);
      g.appendChild(el);
      return el;
    }

    add('circle', { cx: 0, cy: 0, r: R });
    [-60, -30, 0, 30, 60].forEach(function (lat) {
      var rad = lat * Math.PI / 180;
      add('ellipse', { cx: 0, cy: -R * Math.sin(rad), rx: R * Math.cos(rad), ry: R * Math.cos(rad) * 0.18 });
    });
    add('line', { x1: 0, y1: -R - 12, x2: 0, y2: R + 12 });

    var meridians = [];
    for (var i = 0; i < 6; i++) meridians.push(add('ellipse', { cx: 0, cy: 0, rx: R, ry: R }));
    var dots = [];
    for (var j = 0; j < 4; j++) dots.push(add('circle', { r: 4, 'class': 'g-dot' }));

    var angle = 0;
    setInterval(function () {
      angle += 0.04;
      for (var m = 0; m < meridians.length; m++) {
        var a = angle + m * Math.PI / meridians.length;
        meridians[m].setAttribute('rx', Math.abs(R * Math.sin(a)).toFixed(1));
      }
      for (var d = 0; d < dots.length; d++) {
        var b = angle + d * 1.7;
        var lat = (d - 1.5) * 0.45;
        var visible = Math.cos(b) > 0;
        dots[d].setAttribute('cx', (R * Math.cos(lat) * Math.sin(b)).toFixed(1));
        dots[d].setAttribute('cy', (-R * Math.sin(lat)).toFixed(1));
        dots[d].style.opacity = visible ? 1 : 0.2;
      }
    }, 66);
  }

  /* ---------- Tiempo (Open-Meteo) ---------- */
  var WEATHER_CODES = {
    0: 'DESPEJADO', 1: 'CASI DESPEJADO', 2: 'NUBES DISPERSAS', 3: 'NUBLADO',
    45: 'NIEBLA', 48: 'NIEBLA HELADA', 51: 'LLOVIZNA', 53: 'LLOVIZNA', 55: 'LLOVIZNA DENSA',
    61: 'LLUVIA LIGERA', 63: 'LLUVIA', 65: 'LLUVIA FUERTE', 71: 'NIEVE LIGERA', 73: 'NIEVE', 75: 'NIEVE FUERTE',
    80: 'CHUBASCOS', 81: 'CHUBASCOS', 82: 'CHUBASCOS FUERTES', 95: 'TORMENTA', 96: 'TORMENTA/GRANIZO', 99: 'TORMENTA/GRANIZO'
  };

  function loadWeather() {
    var w = CFG.weather;
    $('w-place').textContent = w.place;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.open-meteo.com/v1/forecast?latitude=' + w.lat + '&longitude=' + w.lon + '&current_weather=true');
    xhr.onload = function () {
      try {
        var cw = JSON.parse(xhr.responseText).current_weather;
        $('w-temp').textContent = Math.round(cw.temperature) + '°';
        $('w-desc').textContent = WEATHER_CODES[cw.weathercode] || 'CÓDIGO ' + cw.weathercode;
        log('> METEO OK :: ' + Math.round(cw.temperature) + '°C');
      } catch (e) { log('> METEO :: RESPUESTA CORRUPTA'); }
    };
    xhr.onerror = function () { log('> METEO :: SIN CONEXIÓN'); };
    xhr.send();
  }

  /* ---------- Glitch periódico del título ---------- */
  function scheduleGlitch() {
    setTimeout(function () {
      var t = $('hero-title');
      t.classList.remove('glitch');
      void t.offsetWidth;
      t.classList.add('glitch');
      scheduleGlitch();
    }, 4000 + Math.random() * 6000);
  }

  /* ---------- Arranque ---------- */
  function boot() {
    if (/lite/.test(window.location.search)) document.body.classList.add('lite');
    fit();
    window.addEventListener('resize', fit);
    document.addEventListener('keydown', onKey);

    $('operator').textContent = CFG.operator;
    $('sec-code').textContent = Math.floor(10000 + Math.random() * 89999) + '-D-' + Math.floor(1000 + Math.random() * 8999);
    applyTheme(initialTheme());
    buildGrid();
    setFocus(0);

    ['ROBCO INDUSTRIES (TM) TERMLINK', 'BOOT SEQUENCE ... OK', 'CARGANDO ' + CFG.apps.length + ' CANALES', 'SISTEMA LISTO'].forEach(log);

    tickClock();
    setInterval(tickClock, 1000);
    setInterval(function () { log(AMBIENT[Math.floor(Math.random() * AMBIENT.length)]); }, 7000);
    setInterval(function () {
      var n = 3 + Math.floor(Math.random() * 3);
      $('signal').textContent = new Array(n + 1).join('▮') + new Array(6 - n).join('▯');
    }, 3000);

    startTicker();
    startGlobe();
    loadWeather();
    setInterval(loadWeather, 15 * 60 * 1000);
    scheduleGlitch();

    // Si volvemos con "atrás" del navegador, cerrar el modal
    window.addEventListener('pageshow', function () {
      $('calling').classList.add('hidden');
      $('calling-bar').style.width = '0';
    });
  }

  boot();
})();
