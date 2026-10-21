/*
 * Configuración del launcher. Edita este archivo para cambiar apps, nombre y ciudad.
 * Escrito en ES5 para que funcione en navegadores de TV antiguos.
 */
var LAUNCHER_CONFIG = {
  operator: 'OPERADOR',

  // Coordenadas para el tiempo (Open-Meteo, no necesita API key).
  weather: { place: 'MADRID', lat: 40.4168, lon: -3.7038 },

  // Tema inicial: 'green' (Fallout), 'cyan' (Blade Runner), 'amber' (New Vegas)
  theme: 'green',

  // code: lo que se ve grande en la tarjeta. jp: subtítulo en japonés.
  // url: a dónde se navega al pulsar OK.
  apps: [
    { name: 'YOUTUBE',     code: 'YT',  jp: 'ユーチューブ',     url: 'https://www.youtube.com/tv' },
    { name: 'NETFLIX',     code: 'NF',  jp: 'ネットフリックス', url: 'https://www.netflix.com' },
    { name: 'PRIME VIDEO', code: 'PV',  jp: 'プライム',         url: 'https://www.primevideo.com' },
    { name: 'DISNEY+',     code: 'D+',  jp: 'ディズニー',       url: 'https://www.disneyplus.com' },
    { name: 'SPOTIFY',     code: 'SP',  jp: 'スポティファイ',   url: 'https://open.spotify.com' },
    { name: 'TWITCH',      code: 'TW',  jp: 'ツイッチ',         url: 'https://www.twitch.tv' },
    { name: 'MAX',         code: 'MX',  jp: 'マックス',         url: 'https://play.max.com' },
    { name: 'NAVEGADOR',   code: 'WWW', jp: 'ブラウザ',         url: 'https://www.google.com' }
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
