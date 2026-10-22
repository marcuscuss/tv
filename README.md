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
  (Neón, Desierto, Lluvia o una foto por URL), ciudad del tiempo y si ve la fila de Letterboxd.
- **Botón de avatar** arriba a la derecha: cambiar de perfil, editar o borrar (con confirmación).
- **Letterboxd**: fila de últimas películas vistas; una tarea de GitHub la actualiza cada hora
  (`scripts/letterboxd.py` → `data/letterboxd.json`).

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
