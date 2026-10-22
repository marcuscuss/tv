# Joi

Launcher para TV (Fire TV, Google TV, navegador) con estética de tele CRT y cintas VHS.
Todo está en un único `index.html`: sin frameworks, sin build y sin librerías,
en JavaScript ES5 y CSS sin grid ni variables, para navegadores de TV antiguos.

Web: https://marcuscuss.github.io/tv/

## Qué hace

- **¿Quién está viendo?** al abrir: perfiles con avatar de color e inicial, y "+ Añadir perfil".
- **Marco de tele**: esquinas redondeadas, viñeteado, líneas de barrido y algo de ruido. Cabecera fija
  (HOME, timecode desde que se abrió la app, logo, APPS / NEWS WATCH / PROFILE) y pie con hora, tiempo y perfil.
- **Transición LOADING** entre secciones (barra |||| y porcentaje, menos de 0,8 s).
- **APPS**: carrusel de cintas VHS con las favoritas del perfil. OK = [PLAY TAPE] abre la app.
  La última cinta, "Todas las apps", abre la cuadrícula completa (mantener OK o botón de color: ★ favorita).
  Debajo, las filas de Letterboxd.
- **NEWS WATCH**: estrenos de cine en España. ◀▶ cambia de carátula, ▲▼ EN CINES / PRÓXIMAMENTE, OK abre la ficha.
- **PROFILE**: editar perfil, favoritas y orden, modo ligero (AUTO / SÍ / NO), cambiar o borrar perfil.
- **Modo ligero**: si la tele no tiene 3D o va lenta (se mide al arrancar), carrusel plano, globo quieto y sin ruido.
- **ATRÁS** vuelve a la sección anterior; solo sale de la app desde APPS.

## Colores y tipografías

Todos los colores están en el bloque `/* PALETA */` al principio del CSS de `index.html`.
Las tipografías van en `assets/fonts` (familias `JoiDisplay` y `JoiMono`); mientras no estén, se usan Georgia y Courier.
Logos en `assets/logos`.

## Estrenos (NEWS WATCH)

`.github/workflows/estrenos.yml` ejecuta `scripts/estrenos.js` cada 12 horas (y a mano desde Actions):
pide a TMDB `now_playing` y `upcoming` de España y guarda `data/estrenos.json`. Necesita el secreto
`TMDB_API_KEY` (Settings → Secrets and variables → Actions). Si falla, se conserva el archivo anterior.

## Letterboxd

La tele no puede pedir datos a letterboxd.com (CORS), así que una tarea de GitHub
(`.github/workflows/letterboxd.yml`) ejecuta `scripts/letterboxd.js` cada 6 horas (y a mano desde
Actions). Lee los usuarios de `letterboxd-users.json` y guarda `data/letterboxd/USUARIO.json`.
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

Ver `INSTALL-STICK.md`. El APK carga esta web, así que los cambios llegan sin reinstalar.
