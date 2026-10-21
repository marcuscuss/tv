/*
 * Configuración del launcher. Edita este archivo para cambiar apps, nombre y ciudad.
 * Escrito en ES5 para que funcione en navegadores de TV antiguos.
 *
 * Cada app tiene:
 *   name, code, jp  -> lo que se ve en pantalla
 *   url             -> a dónde ir en modo navegador (PC / navegador de la TV)
 *   pkg             -> paquetes Android candidatos (coma); dentro del APK abre la
 *                      app NATIVA. Se prueban en orden y se abre el primero instalado.
 */
var LAUNCHER_CONFIG = {
  operator: 'OPERADOR',

  // Coordenadas para el tiempo (Open-Meteo, no necesita API key).
  weather: { place: 'MADRID', lat: 40.4168, lon: -3.7038 },

  // Tema inicial: 'green' (Fallout), 'cyan' (Blade Runner), 'amber' (New Vegas)
  theme: 'green',

  apps: [
    { name: 'YOUTUBE',     code: 'YT',  jp: 'ユーチューブ',     url: 'https://www.youtube.com/tv',
      pkg: 'com.google.android.youtube.tv,com.amazon.firetv.youtube,com.google.android.youtube' },
    { name: 'NETFLIX',     code: 'NF',  jp: 'ネットフリックス', url: 'https://www.netflix.com',
      pkg: 'com.netflix.ninja' },
    { name: 'PRIME VIDEO', code: 'PV',  jp: 'プライム',         url: 'https://www.primevideo.com',
      pkg: 'com.amazon.amazonvideo.livingroom,com.amazon.avod,com.amazon.avod.thirdpartyclient' },
    { name: 'DISNEY+',     code: 'D+',  jp: 'ディズニー',       url: 'https://www.disneyplus.com',
      pkg: 'com.disney.disneyplus' },
    { name: 'SPOTIFY',     code: 'SP',  jp: 'スポティファイ',   url: 'https://open.spotify.com',
      pkg: 'com.spotify.tv.android,com.spotify.music' },
    { name: 'TWITCH',      code: 'TW',  jp: 'ツイッチ',         url: 'https://www.twitch.tv',
      pkg: 'tv.twitch.android.app' },
    { name: 'MAX',         code: 'MX',  jp: 'マックス',         url: 'https://play.max.com',
      pkg: 'com.wbd.stream,com.hbo.hbonow' },
    { name: 'NAVEGADOR',   code: 'WWW', jp: 'ブラウザ',         url: 'https://www.google.com',
      pkg: 'com.amazon.cloud9,com.android.chrome,org.mozilla.tv.firefox' }
  ],

  ticker: [
    'BIENVENIDO DE NUEVO, OPERADOR',
    'LOS DATOS SE HAN CONVERTIDO EN EL BIEN MÁS VALIOSO',
    'TUS DATOS TE PERTENECEN',
    'REACTOR ESTABLE · NIVELES DE RADIACIÓN NOMINALES',
    'PROHIBIDA LA ENTRADA A REPLICANTES NO AUTORIZADOS',
    'VAULT-TEC LE RECUERDA: MANTENGA LA CALMA'
  ]
};
