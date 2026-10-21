# Joi

Launcher retro-futurista para TV Hisense (estética Fallout / Blade Runner / CRT).
App web estática (HTML + CSS + JS en ES5) pensada para el navegador de VIDAA.

## Probarlo

Abre `index.html` en cualquier navegador. Se escala solo a la pantalla (diseño a 1920x1080).

| Tecla / botón del mando | Acción |
| --- | --- |
| Flechas | Moverse entre canales |
| OK / Enter | Abrir app |
| 1-9 | Abrir esa app directamente |
| Botón rojo / `T` | Cambiar tema (verde, cian, ámbar) |
| Atrás | Cancelar la llamada |

Añade `?lite` a la URL para desactivar el ruido y el parpadeo si la TV va lenta.

## Personalizar

Todo está en `js/config.js`: nombre del operador, ciudad del tiempo, apps (nombre, siglas, texto en japonés y URL) y frases del ticker.

## Llevarlo a la TV

1. Publica la carpeta en un hosting estático (por ejemplo GitHub Pages).
2. Ábrela en el navegador de la TV y guárdala como favorito.
3. Para instalarla como app en VIDAA hacen falta métodos de la comunidad (no oficiales). Si funcionan o no depende del modelo y del firmware.

Nota: desde una página web solo se pueden abrir las versiones web de los servicios.
Netflix, Prime Video y Disney+ no suelen dejarse ver desde el navegador de la TV.
