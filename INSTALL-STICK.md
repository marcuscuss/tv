# Instalar en un stick (Fire TV / Google TV / Android TV)

Esta es la vía recomendada. El launcher va dentro de un **APK** (una app de verdad)
con su icono en el menú de la tele, y desde él se abren las **apps nativas**
(Netflix, YouTube...), no las webs.

## Paso 1 — Conseguir el APK (lo compila GitHub, tú no instalas nada)

El APK se construye solo en los servidores de GitHub cada vez que se actualiza el
proyecto. Para descargarlo:

1. Ve a tu repo → pestaña **Actions**.
2. Entra en la última ejecución de **"Construir APK"** (tiene un ✓ verde cuando
   termina; tarda 2-3 min).
3. Tienes dos formas de bajarlo:
   - **Release (más fácil):** en la portada del repo, a la derecha, en **Releases**,
     abre *HISENSE//TERMINAL (último APK)* y descarga el `.apk`.
   - **Artefacto:** dentro de la ejecución de Actions, abajo en *Artifacts*,
     descarga `HisenseTerminal-APK` (es un zip con el `.apk` dentro).

El enlace directo de descarga (para el Paso 3) será:

```
https://github.com/marcuscuss/tv/releases/download/apk-latest/app-release.apk
```

## Paso 2 — Permitir apps externas en el stick

**Fire TV / Fire Stick:**
1. Ajustes → **My Fire TV** → **Opciones de desarrollador**.
2. Activa **Instalar apps de origen desconocido** (o "Aplicaciones de fuentes
   desconocidas").

**Google TV / Android TV:**
1. Ajustes → **Sistema → Acerca de** → pulsa 7 veces en **Versión de compilación**
   (activa modo desarrollador).
2. Ajustes → **Apps → Seguridad** → permite **fuentes desconocidas** para la app
   que uses en el paso siguiente (Downloader).

## Paso 3 — Pasar el APK a la tele

La forma estándar es la app **Downloader** (gratis en la tienda de ambos sistemas):

1. Instala **Downloader** desde la tienda del stick.
2. Ábrela y, en la barra de dirección, escribe el enlace directo del Paso 1:
   `https://github.com/marcuscuss/tv/releases/download/apk-latest/app-release.apk`
3. Descarga → cuando acabe, pulsa **Instalar**.
4. Listo: **HISENSE//TERMINAL** aparece entre tus apps.

> Alternativa sin Downloader: copia el `.apk` a un USB, o usa la app "Send files to TV"
> desde el móvil. En Google TV también sirve instalarlo por `adb install` si lo conoces.

## Paso 4 — Copiar tu vídeo de bienvenida (opcional)

El vídeo de tu perfil **no está en el repo** (es público). Se copia una vez al stick:

1. Instala **Send Files to TV** en el stick y en el móvil (gratis en ambas tiendas).
2. Con los dos en la misma Wi-Fi, envía `bienvenida.mp4` del móvil a la tele.
   Se guarda en la carpeta **Download** del stick.
3. Abre el launcher. La primera vez pedirá permiso para leer archivos: **Permitir**.

El nombre tiene que ser exactamente `bienvenida.mp4`. Si no lo encuentra, se ve
el vídeo CRT por defecto.

> Alternativa desde el Mac: `adb push bienvenida.mp4 /sdcard/Download/`

## Cómo funciona una vez instalado

- Se abre a pantalla completa, sin barras.
- Al pulsar **OK** sobre una app, abre la **app nativa** de la tele si está instalada.
  Si no lo está, te avisa y abre su web.
- **Atrás** vuelve al launcher.
- El contenido (hora, tiempo, apps) se carga desde internet, así que para cambiar
  diseño o apps solo edito el repo y haz push: no hay que reinstalar el APK.

## Ponerlo como pantalla de inicio (opcional, solo Android TV / Google TV)

Hay apps como **"Customice el inicio"** o launchers que permiten elegir qué se abre
al encender. En Fire TV no se puede cambiar el inicio sin trucos; en Google TV es
más abierto. Si quieres, lo vemos cuando ya lo tengas funcionando.

## Si el stick es muy viejo

Tu Fire Stick antiguo (720p) debería poder instalarlo porque la app es muy ligera,
y de hecho activa solo un "modo ligero" si detecta un navegador interno antiguo.
Si aun así va a tirones, un Google TV nuevo (30-40 €) lo mueve perfecto.
