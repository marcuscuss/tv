/*
 * Iconos estilizados (originales) en nuestra estética CRT.
 * Son símbolos de categoría, no reproducciones de logos de marca.
 * En el APK, encima de esto se muestra el icono REAL de la app instalada.
 * Trazo con currentColor -> se tiñen con el tema.
 */
var LAUNCHER_ICONS = (function () {
  function svg(inner) {
    return '<svg class="app-ico" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
           '<g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' +
           inner + '</g></svg>';
  }
  return {
    // Pantalla con triángulo de reproducción (vídeo)
    youtube: svg('<rect x="14" y="24" width="72" height="52" rx="10"/><path d="M44 40 L62 50 L44 60 Z" fill="currentColor" stroke="none"/>'),
    // Tira de película (streaming)
    netflix: svg('<rect x="26" y="14" width="48" height="72" rx="4"/><line x1="26" y1="30" x2="74" y2="30"/><line x1="26" y1="50" x2="74" y2="50"/><line x1="26" y1="70" x2="74" y2="70"/><line x1="40" y1="14" x2="40" y2="86"/><line x1="60" y1="14" x2="60" y2="86"/>'),
    // Flecha de reproducción sobre arco (vídeo bajo demanda)
    prime: svg('<path d="M40 36 L64 50 L40 64 Z" fill="currentColor" stroke="none"/><path d="M22 72 Q50 86 78 72"/>'),
    // Estrella fugaz + destello (contenido familiar)
    disney: svg('<path d="M50 24 L56 44 L76 44 L60 56 L66 76 L50 64 L34 76 L40 56 L24 44 L44 44 Z"/>'),
    // Ecualizador (música)
    spotify: svg('<line x1="30" y1="62" x2="30" y2="44"/><line x1="42" y1="66" x2="42" y2="34"/><line x1="54" y1="62" x2="54" y2="40"/><line x1="66" y1="68" x2="66" y2="30"/>'),
    // Bocadillo de chat (directos)
    twitch: svg('<path d="M22 24 H78 V62 H54 L40 76 V62 H22 Z"/><line x1="46" y1="38" x2="46" y2="50"/><line x1="60" y1="38" x2="60" y2="50"/>'),
    // Doble chevron (reproducción)
    max: svg('<path d="M30 32 L48 50 L30 68"/><path d="M52 32 L70 50 L52 68"/>'),
    // Globo con meridianos (navegador)
    browser: svg('<circle cx="50" cy="50" r="30"/><ellipse cx="50" cy="50" rx="13" ry="30"/><line x1="20" y1="50" x2="80" y2="50"/><line x1="24" y1="36" x2="76" y2="36"/><line x1="24" y1="64" x2="76" y2="64"/>'),
    // Respaldo genérico
    _default: svg('<rect x="22" y="22" width="56" height="56" rx="8"/><path d="M42 40 L60 50 L42 60 Z" fill="currentColor" stroke="none"/>')
  };
})();
