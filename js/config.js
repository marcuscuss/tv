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
      welcome: 'BIENVENIDO MARCOS',
      weather: { place: 'MADRID', lat: 40.4168, lon: -3.7038 },
      // 'local:archivo.mp4' = vídeo copiado en el stick (carpeta Download), a color.
      // Si no está (o estás en el PC), se usa fallbackVideo con el estilo CRT.
      video: 'local:bienvenida.mp4',
      fallbackVideo: 'media/welcome.mp4',
      theme: 'green'                 // green | cyan | amber
    }
    // Ejemplo para otro perfil:
    // { id: 'invitado', name: 'INVITADO', welcome: 'BIENVENIDO', weather:{place:'MADRID',lat:40.41,lon:-3.70}, video:'media/welcome.mp4', theme:'cyan' }
  ],

  // ---- APPS ----
  // icon -> dibujo estilizado (nuestra estética). En el APK se usa el icono REAL
  //         de la app instalada en la tele; icon es el respaldo.
  // url  -> destino en modo navegador.
  // pkg  -> paquetes Android candidatos (coma): abre la app nativa en el APK.
  apps: [
    { name: 'YOUTUBE',     icon: 'youtube', url: 'https://www.youtube.com/tv',
      pkg: 'com.google.android.youtube.tv,com.amazon.firetv.youtube,com.google.android.youtube' },
    { name: 'NETFLIX',     icon: 'netflix', url: 'https://www.netflix.com',
      pkg: 'com.netflix.ninja' },
    { name: 'PRIME VIDEO', icon: 'prime',   url: 'https://www.primevideo.com',
      pkg: 'com.amazon.amazonvideo.livingroom,com.amazon.avod,com.amazon.avod.thirdpartyclient' },
    { name: 'DISNEY+',     icon: 'disney',  url: 'https://www.disneyplus.com',
      pkg: 'com.disney.disneyplus' },
    { name: 'SPOTIFY',     icon: 'spotify', url: 'https://open.spotify.com',
      pkg: 'com.spotify.tv.android,com.spotify.music' },
    { name: 'TWITCH',      icon: 'twitch',  url: 'https://www.twitch.tv',
      pkg: 'tv.twitch.android.app' },
    { name: 'MAX',         icon: 'max',     url: 'https://play.max.com',
      pkg: 'com.wbd.stream,com.hbo.hbonow' },
    { name: 'NAVEGADOR',   icon: 'browser', url: 'https://www.google.com',
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
