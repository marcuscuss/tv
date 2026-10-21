/*
 * Configuración del launcher. Edita este archivo para cambiar perfiles y apps.
 * Escrito en ES5 para que funcione en navegadores de TV antiguos.
 */
var LAUNCHER_CONFIG = {

  // ---- PERFILES ----
  // Añade más objetos para crear más perfiles. Cada uno puede tener su propio
  // saludo, ciudad del tiempo y vídeo de bienvenida (opcional).
  profiles: [
    {
      id: 'marcos',
      name: 'MARCOS',
      greeting: 'BIENVENIDO',        // texto pequeño encima del nombre
      weather: { place: 'MADRID', lat: 40.4168, lon: -3.7038 },
      // 'local:archivo.mp4' = vídeo copiado en el stick (carpeta Download), a color.
      // Si no está (o estás en el PC), se usa fallbackVideo con el estilo CRT.
      video: 'local:bienvenida.mp4',
      fallbackVideo: 'media/welcome.mp4',
      theme: 'green'                 // green | cyan | amber
    }
    // Ejemplo para otro perfil:
    // { id: 'invitado', name: 'INVITADO', greeting: 'BIENVENIDO', weather:{place:'MADRID',lat:40.41,lon:-3.70}, video:'media/welcome.mp4', theme:'cyan' }
  ],

  // ---- APPS ----
  // icon  -> dibujo estilizado. En el APK se usa la imagen REAL de la app
  //          instalada en la tele; icon + colores es el respaldo (web/PC).
  // label -> nombre tal como se escribe en la tarjeta.
  // bg/fg -> color de fondo y del icono/nombre en la tarjeta (colores de la marca).
  // domain -> web oficial: de ahí se carga el logo original al abrir la página
  //           (no se guarda en el repo). Si no carga, se usa icon.
  // url  -> destino en modo navegador.
  // pkg  -> paquetes Android candidatos (coma): abre la app nativa en el APK.
  apps: [
    { name: 'YOUTUBE', domain: 'youtube.com',     label: 'YouTube', bg: '#ffffff', fg: '#ff0033',     icon: 'youtube', url: 'https://www.youtube.com/tv',
      pkg: 'com.google.android.youtube.tv,com.amazon.firetv.youtube,com.google.android.youtube' },
    { name: 'NETFLIX', domain: 'netflix.com',     label: 'NETFLIX', bg: '#000000', fg: '#e50914',     icon: 'netflix', url: 'https://www.netflix.com',
      pkg: 'com.netflix.ninja' },
    { name: 'PRIME VIDEO', domain: 'primevideo.com', label: 'prime video', bg: '#ffffff', fg: '#0f79af', icon: 'prime',   url: 'https://www.primevideo.com',
      pkg: 'com.amazon.amazonvideo.livingroom,com.amazon.avod,com.amazon.avod.thirdpartyclient' },
    { name: 'DISNEY+', domain: 'disneyplus.com',     label: 'Disney+', bg: '#0b1a4a', fg: '#ffffff',     icon: 'disney',  url: 'https://www.disneyplus.com',
      pkg: 'com.disney.disneyplus' },
    { name: 'SPOTIFY', domain: 'spotify.com',     label: 'Spotify', bg: '#121212', fg: '#1ed760',     icon: 'spotify', url: 'https://open.spotify.com',
      pkg: 'com.spotify.tv.android,com.spotify.music' },
    { name: 'TWITCH', domain: 'twitch.tv',      label: 'Twitch', bg: '#9146ff', fg: '#ffffff',      icon: 'twitch',  url: 'https://www.twitch.tv',
      pkg: 'tv.twitch.android.app' },
    { name: 'MAX', domain: 'max.com',         label: 'max', bg: '#002be7', fg: '#ffffff',         icon: 'max',     url: 'https://play.max.com',
      pkg: 'com.wbd.stream,com.hbo.hbonow' },
    { name: 'NAVEGADOR', domain: 'google.com',   label: 'Internet', bg: '#f1f3f4', fg: '#1a73e8',   icon: 'browser', url: 'https://www.google.com',
      pkg: 'com.amazon.cloud9,com.android.chrome,org.mozilla.tv.firefox' }
  ],

  ticker: [
    'BIENVENIDO DE NUEVO, OPERADOR',
    'LOS DATOS SE HAN CONVERTIDO EN EL BIEN MÁS VALIOSO',
    'TUS DATOS TE PERTENECEN',
    'REACTOR ESTABLE · NIVELES DE RADIACIÓN NOMINALES',
    'ACCESO RESTRINGIDO · SOLO PERSONAL AUTORIZADO',
    'VAULT-TEC LE RECUERDA: MANTENGA LA CALMA'
  ]
};
