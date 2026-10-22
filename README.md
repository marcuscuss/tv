# Joi

Launcher para TV (Hisense VIDAA, Fire TV, Google TV) con estética Blade Runner 2049.
Todo está en un único `index.html`: sin frameworks, sin build y sin librerías,
en JavaScript ES5 y CSS sin grid ni variables, para navegadores de TV antiguos.

Web: https://marcuscuss.github.io/tv/

## Qué hace

- **¿Quién está viendo?** al abrir: perfiles con avatar de color e inicial, y "+ Añadir perfil".
  Viene seleccionado el último perfil usado.
- **Crear y editar perfiles** con un teclado propio en pantalla (A–Z, Ñ, espacio, borrar, OK).
- **Cada perfil guarda lo suyo**: nombre, color, qué apps salen y en qué orden, fondo
  (Neón, Desierto, Lluvia o una foto por URL), ciudad del tiempo y usuario de Letterboxd.
- **Botón de avatar** arriba a la derecha: cambiar de perfil, editar o borrar (con confirmación).
- **Favoritas y "Todas las apps"**: la fila principal muestra las favoritas del perfil; al final,
  "Todas las apps" abre la cuadrícula completa. Allí OK abre la app y mantener OK (o un botón de
  color, o F en el PC) la añade o quita de favoritas.
- **Letterboxd** (usuario opcional por perfil): filas "Visto recientemente" (con estrellas y ♥) y
  una por cada lista; OK abre la ficha con la reseña. Las carátulas se cargan poco a poco.

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
