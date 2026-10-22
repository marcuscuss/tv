# Joi en Google Chromecast

Primero mira qué Chromecast tienes:

- **Chromecast con Google TV** (viene con mando) o **Google TV Streamer** → se puede instalar Joi
  como una app de verdad, igual que en el Fire TV. Sigue la **Opción A**.
- **Chromecast antiguo** (sin mando, solo para "enviar" desde el móvil u ordenador) → no se pueden
  instalar apps. Solo puedes enviarle la web desde Chrome: **Opción B**.

---

## Opción A — Chromecast con Google TV (recomendada)

### 1. Activar el modo desarrollador
1. En la tele: **Ajustes** (rueda dentada arriba a la derecha) → **Sistema** → **Información**.
2. Baja hasta **Compilación del SO de Android TV** y pulsa **OK 7 veces** seguidas.
   Saldrá el aviso "Ya eres desarrollador".

### 2. Instalar Downloader
1. Abre **Google Play** en la tele y busca **Downloader** (el de AFTVnews, icono naranja).
2. Instálalo.

### 3. Permitir que Downloader instale apps
1. **Ajustes → Apps → Seguridad y restricciones → Fuentes desconocidas**.
2. Activa **Downloader**.

### 4. Descargar e instalar Joi
1. Abre **Downloader**. Si pide permiso para archivos, acepta.
2. En la casilla de dirección escribe:
   ```
   https://github.com/marcuscuss/tv/releases/download/apk-latest/app-release.apk
   ```
   y pulsa **Go**.
3. Cuando termine, pulsa **Instalar** y después **Abrir**.
4. Cuando acabe, en Downloader pulsa **Borrar** (Delete) para borrar el APK y no ocupar espacio.

### 5. Tenerla a mano
- Joi aparece en **Tus apps** (pestaña Apps → Ver todas).
- Para ponerla en la fila de favoritos: mantén **OK** sobre Joi → **Añadir a favoritos** (o "Mover").
- Para que el **mando abra Joi**, instala **Button Mapper** desde Google Play y asigna Joi a una pulsación
  larga de un botón (por ejemplo, el de YouTube o Netflix).

### Actualizaciones
Como en el Fire TV, Joi carga la web, así que **los cambios de diseño llegan solos** sin reinstalar.
Solo hay que reinstalar si cambia el APK (te avisaré). En ese caso, **desinstala Joi antes**
(Ajustes → Apps → Joi → Desinstalar) y repite el paso 4.

---

## Opción B — Chromecast antiguo (solo enviar)

1. En el Mac, abre **Google Chrome** y entra en https://marcuscuss.github.io/tv/
2. Menú **⋮** → **Enviar…** (Cast) → elige tu Chromecast → **Fuentes → Enviar pestaña**.
3. Se ve en la tele, pero **se maneja desde el teclado del Mac** (flechas, Enter y Esc).
   El mando de la tele no sirve, y las apps (Netflix, etc.) se abren en el Mac, no en la tele.

Para usarlo de verdad con mando, la Opción A (un Chromecast con Google TV) es la buena.
