# Joi

Launcher para TV (Fire TV, Google TV, navegador) con estética de tele CRT y cintas VHS.
Todo está en un único `index.html`: sin frameworks, sin build y sin librerías,
en JavaScript ES5 y CSS sin grid ni variables, para navegadores de TV antiguos.

Web: https://marcuscuss.github.io/tv/

## Qué hace

- **Encendido CRT** al abrir (una línea blanca que se abre) y apagado al salir (la imagen se cierra en un punto).
- **¿Quién está viendo?**: perfiles con avatar, teclado propio en pantalla y ajustes por perfil.
- **Canales con zapping**: CH 01 APPS · CH 02 NEWS WATCH · CH 03 CINE · CH 04 DEPORTES.
  Números 1-4, CH+/CH- (o RePág/AvPág) y ▲▼ en los bordes cambian de canal, con medio segundo de
  estática y el número de canal en verde fósforo. La cabecera marca el canal con ■.
- **CH 01 APPS**: carrusel de cintas VHS de las favoritas, cinta "¿Qué vemos hoy?" y "Todas las apps";
  debajo, la fila DEPORTES.
- **CH 02 NEWS WATCH**: estrenos de cine en España alrededor del globo.
- **CH 03 CINE**: "Porque te gustó…", filas por género, temáticas y Letterboxd. Cada peli lleva dónde verla
  ([NETFLIX] [MAX]…), botón VER EN… y [TRÁILER]. ROJO: solo lo que puedo ver ya. VERDE: ¿Qué vemos hoy?
- **CH 04 DEPORTES**: HOY · TENIS · REAL MADRID con tarjetas tipo Apple Sports, marcador en vivo (ESPN cada
  20 s mientras hay partido), partidos anteriores, últimos/próximos del Madrid, aviso de ÚLTIMA HORA y mini
  marcador en el ticker.
- **Salvapantallas** a los 5 minutos: portadas con fundido y Ken Burns, o el marcador si hay partido.
- **Temáticas por fecha**: Halloween, Navidad (nieve y cuenta atrás de Nochevieja), San Valentín, Oscars y verano.
- **PROFILE**: plataformas, jugadores seguidos, temática, sonido y modo ligero.
- Cada canal tiene en el pie la leyenda de las teclas de color. ATRÁS vuelve; solo sale desde CH 01.

## Pruebas en el navegador

- `?fecha=2026-10-31` simula otro día (temáticas). `?fecha=2026-12-31T23:59:50` para Nochevieja.
- `?demo=tenis` o `?demo=madrid` simulan un partido en vivo que cambia cada 5 s.
- `?saver=5` lanza el salvapantallas a los 5 segundos.
- Teclado del PC: números = canales, R/G/Y/B = botones de color, Esc = atrás.

## Datos (capa lenta)

`.github/workflows/datos.yml` se ejecuta cada 6 horas (y a mano desde Actions). Cada fuente es un script de
`scripts/` que escribe su JSON en `data/` con el campo `actualizado`; si una falla, conserva su JSON anterior.
Si un JSON tiene más de 48 h, la tele muestra [SEÑAL DÉBIL].

| Script | Fuente | Archivo |
| --- | --- | --- |
| letterboxd.js | RSS y listas de Letterboxd | data/letterboxd/USUARIO.json |
| estrenos.js | TMDB (o SensaCine sin clave) | data/estrenos.json |
| recomendaciones.js | TMDB + lo visto en Letterboxd | data/recomendaciones.json |
| madrid.js | football-data.org (o ESPN sin clave) | data/deportes.json → madrid |
| tenis.js | web de la ATP (un intento) y ESPN; WTA por ESPN | data/deportes.json → tenis |

Secretos en Settings → Secrets and variables → Actions: `TMDB_API_KEY` y `FOOTBALL_DATA_KEY`.

La capa en vivo de deportes la consulta la propia tele en ESPN, que permite CORS: no hace falta proxy.

## Letterboxd

La tele no puede pedir datos a letterboxd.com (CORS), así que la tarea de datos ejecuta
`scripts/letterboxd.js`. Lee los usuarios de `letterboxd-users.json` y guarda `data/letterboxd/USUARIO.json`.
Para añadir un usuario nuevo, añádelo a ese archivo. Si Letterboxd bloquea alguna petición,
se conservan los datos anteriores de esa parte.

Los perfiles se guardan en `localStorage` del aparato. Si no hay o falla, la app funciona igual
y empieza pidiendo crear un perfil.

## Mando

| Tecla | Acción |
| --- | --- |
| Flechas | Moverse |
| OK | Elegir |
| Atrás | Volver / cancelar (en el teclado, borra la última letra) |

En el editor de apps: **OK** coge una app para moverla con ▲▼ y **◀▶** la muestra u oculta.

## Configurar apps

En el bloque `CONFIG` de `index.html` está la lista global de apps (nombre, colores, logos,
web y paquete Android). Los perfiles solo eligen cuáles se muestran y en qué orden.

## En el stick

Ver `INSTALL-STICK.md` (Fire TV) o `INSTALL-CHROMECAST.md` (Chromecast). El APK carga esta web, así que los cambios llegan sin reinstalar.
