# Instalar en una TV Hisense con VIDAA

VIDAA no tiene modo desarrollador oficial. La comunidad ha encontrado que la TV
expone una función interna, `Hisense_installApp()`, que añade una web como app con
su icono en el menú. El truco es que esa función **solo funciona si la página se
sirve desde el dominio `vidaahub.com`**. Para conseguirlo se engaña a la TV con el
DNS: durante la instalación, tu PC responde por `vidaahub.com` y le sirve una
página con un botón de "instalar".

> Esto no es oficial. Si funciona depende del modelo y de la versión del firmware.
> Si en tu TV la función no está disponible, no hay forma de instalarlo y toca el
> stick (ver el final).

## Paso 1 — Publica el launcher en internet

La app tiene que estar en una URL pública para que la TV la cargue cada vez que
se abre. Lo más fácil es GitHub Pages:

1. En GitHub, repositorio `marcuscuss/tv` → **Settings → Pages**.
2. En "Build and deployment", Source: **Deploy from a branch**.
3. Branch: la rama donde está este código, carpeta `/ (root)`. Guarda.
4. A los pocos minutos tendrás: `https://marcuscuss.github.io/tv/`
5. Ábrela en el PC para comprobar que carga.

## Paso 2 — Instala con una herramienta de la comunidad

No escribas tú el servidor: usa uno ya hecho. El flujo es el mismo en todos.

**Opción A (más sencilla, un solo comando con Docker):**
[`arashbehmand/vidaa-custom-app`](https://github.com/arashbehmand/vidaa-custom-app)
— levanta DNS + web en un contenedor. En su `config` pones el nombre, el icono
y la URL del Paso 1.

**Opción B (sin Docker, Python):**
[`trialuser/vidaa-appstore`](https://github.com/trialuser/vidaa-appstore)
— un `server.py`; editas un `index.html` con tu app y lo arrancas con permisos de
administrador.

**Opción C (la más moderna, soporta TVs nuevas):**
[`weinzii/vidaa-edge`](https://github.com/weinzii/vidaa-edge)
— detecta automáticamente el método viejo (`Hisense_installApp`) o el nuevo
(escribir en `Appinfo.json`), útil si tu firmware es reciente y el método clásico
falla.

En todas, los datos de tu app son:

| Campo | Valor |
| --- | --- |
| Nombre | `Joi` |
| URL | `https://marcuscuss.github.io/tv/` |
| Icono | un PNG cuadrado 220–400 px (`installer/icon.png` de este repo) |

## Paso 3 — El proceso en la TV

1. Arranca la herramienta en el PC. Te dirá la IP de tu PC (algo como `192.168.1.40`).
2. En la TV: **Ajustes → Red** → pon el **DNS manual** = la IP del PC.
3. Abre el **navegador de la TV** y entra en `https://vidaahub.com/`.
4. Acepta el aviso de certificado (es normal, es autofirmado).
5. Pulsa **Instalar** en la app. Debería aparecer en el menú de apps.
6. **Importante:** vuelve a **Ajustes → Red** y **quita el DNS manual** (déjalo en
   automático), o la TV solo tendrá internet con tu PC encendido.
7. Reinicia la TV. El launcher ya estará entre tus apps.

Una vez instalado, la TV carga la app desde GitHub. Para cambiar diseño o apps,
edita este repo y haz push: la TV coge la versión nueva sola, sin reinstalar.

## Si tu VIDAA no deja (plan B)

Si la función no existe en tu firmware, la alternativa es un reproductor por HDMI
(Google TV, Chromecast con Google TV, Fire TV). Ahí sí puedo generarte una **app
instalable (APK)** con el launcher completo y ponerla incluso como pantalla de
inicio. Tu Fire Stick viejo probablemente la mueva, porque la app es muy ligera;
si no, un Google TV nuevo cuesta unos 30–40 €.
