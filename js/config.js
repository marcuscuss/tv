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
      // Si no está (o estás en el PC), la bienvenida se queda sin vídeo.
      video: 'local:bienvenida.mp4',
      theme: 'green'                 // green | cyan | amber
    }
    // Ejemplo para otro perfil:
    // { id: 'invitado', name: 'INVITADO', greeting: 'BIENVENIDO', weather:{place:'MADRID',lat:40.41,lon:-3.70}, theme:'cyan' }
  ],

  // ---- APPS ----
  // icon  -> dibujo estilizado. En el APK se usa la imagen REAL de la app
  //          instalada en la tele; icon + colores es el respaldo (web/PC).
  // label -> nombre tal como se escribe en la tarjeta.
  // bg/fg -> color de fondo y del icono/nombre en la tarjeta (colores de la marca).
  // logos  -> logo completo (con nombre): una ruta del proyecto (media/logos/...)
  //           o un nombre de archivo de Wikimedia Commons.
  //           Se cargan al abrir la página (no se guardan en el repo); se prueban
  //           en orden. logoWhite: true lo pinta en blanco (para fondos oscuros).
  // domain -> si ningún logo carga, se usa el icono de su web; y si no, icon.
  // url  -> destino en modo navegador.
  // pkg  -> paquetes Android candidatos (coma): abre la app nativa en el APK.
  apps: [
    { name: 'YOUTUBE', label: 'YouTube', domain: 'youtube.com', icon: 'youtube',
      bg: '#ffffff', fg: '#ff0033', logos: ['YouTube_Logo_2017.svg'],
      url: 'https://www.youtube.com/tv',
      pkg: 'com.google.android.youtube.tv,com.amazon.firetv.youtube,com.google.android.youtube' },
    { name: 'NETFLIX', label: 'Netflix', domain: 'netflix.com', icon: 'netflix',
      bg: '#ffffff', fg: '#e50914', logos: ['Netflix_2015_logo.svg'],
      url: 'https://www.netflix.com',
      pkg: 'com.netflix.ninja' },
    { name: 'PRIME VIDEO', label: 'Prime Video', domain: 'primevideo.com', icon: 'prime',
      bg: 'linear-gradient(135deg,#0b2a6f,#1a73e8)', fg: '#ffffff', logoWhite: true,
      logos: ['media/logos/prime-video.png'],
      url: 'https://www.primevideo.com',
      pkg: 'com.amazon.amazonvideo.livingroom,com.amazon.avod,com.amazon.avod.thirdpartyclient' },
    { name: 'DISNEY+', label: 'Disney+', domain: 'disneyplus.com', icon: 'disney',
      bg: 'linear-gradient(135deg,#071a4a,#1d4fb8)', fg: '#ffffff', logoWhite: true,
      logos: ['Disney+_logo.svg', 'Disney_plus_logo.svg'],
      url: 'https://www.disneyplus.com',
      pkg: 'com.disney.disneyplus' },
    { name: 'SPOTIFY', label: 'Spotify', domain: 'spotify.com', icon: 'spotify',
      bg: '#121212', fg: '#1ed760', logos: ['Spotify_logo_with_text.svg', 'Spotify_logo_without_text.svg'],
      url: 'https://open.spotify.com',
      pkg: 'com.spotify.tv.android,com.spotify.music' },
    { name: 'TWITCH', label: 'Twitch', domain: 'twitch.tv', icon: 'twitch',
      bg: '#0e0e10', fg: '#a970ff',
      logos: ['media/logos/twitch.png'],
      url: 'https://www.twitch.tv',
      pkg: 'tv.twitch.android.app' },
    { name: 'HBO MAX', label: 'HBO Max', domain: 'hbomax.com', icon: 'max',
      bg: 'linear-gradient(135deg,#1c0b6b,#5b2cf0)', fg: '#ffffff', logoWhite: true,
      logos: ['media/logos/hbo-max.png'],
      url: 'https://play.hbomax.com',
      pkg: 'com.wbd.stream,com.hbo.hbonow' },
    { name: 'NAVEGADOR', label: 'Internet', domain: 'google.com', icon: 'browser',
      bg: '#ffffff', fg: '#1a73e8', logos: ['Google_2015_logo.svg'],
      url: 'https://www.google.com',
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
