package com.marcuscuss.tvlauncher;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Envoltorio de pantalla completa que carga el launcher web y le da un puente
 * para abrir las apps NATIVAS de la tele (Netflix, YouTube...) por su paquete.
 */
public class MainActivity extends Activity {

    // El launcher se sirve desde GitHub Pages. ?app avisa a la web de que corre dentro del APK.
    private static final String LAUNCHER_URL = "https://marcuscuss.github.io/tv/?app";

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);

        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);       // localStorage: recuerda el tema
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.setBackgroundColor(0xFF020904);
        web.addJavascriptInterface(new TVBridge(), "TVBridge");

        // Que todo se cargue dentro del WebView, no en un navegador externo
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http")) { view.loadUrl(url); return true; }
                return false;
            }

            // La web pide ".../__local__/bienvenida.mp4": lo servimos desde el stick.
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                String path = req.getUrl().getPath();
                if (path == null || !path.contains("/__local__/")) return null;
                File f = findLocal(req.getUrl().getLastPathSegment());
                if (f == null) return null;
                return serveFile(f, req.getRequestHeaders().get("Range"));
            }
        });

        requestStoragePermission();
        web.loadUrl(LAUNCHER_URL);
        hideBars();
    }

    /* ---------- Vídeo local ---------- */

    /** Busca el archivo en la carpeta propia de la app, en Download y en Movies. */
    private File findLocal(String name) {
        if (name == null || name.contains("/") || name.contains("..")) return null;
        File[] dirs = {
            getExternalFilesDir(null),
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)
        };
        for (File dir : dirs) {
            if (dir == null) continue;
            File f = new File(dir, name);
            if (f.isFile() && f.canRead()) return f;
        }
        return null;
    }

    /** Devuelve el archivo al WebView, con soporte de "Range" para que el vídeo pueda hacer bucle. */
    private WebResourceResponse serveFile(File f, String range) {
        try {
            long len = f.length();
            long start = 0;
            if (range != null && range.startsWith("bytes=")) {
                String s = range.substring(6).split("-")[0].trim();
                if (!s.isEmpty()) start = Math.min(Long.parseLong(s), Math.max(0, len - 1));
            }
            FileInputStream in = new FileInputStream(f);
            long skipped = 0;
            while (skipped < start) {
                long n = in.skip(start - skipped);
                if (n <= 0) break;
                skipped += n;
            }
            Map<String, String> headers = new HashMap<>();
            headers.put("Accept-Ranges", "bytes");
            headers.put("Content-Length", String.valueOf(len - start));
            headers.put("Access-Control-Allow-Origin", "*");
            if (range != null) {
                headers.put("Content-Range", "bytes " + start + "-" + (len - 1) + "/" + len);
                return new WebResourceResponse("video/mp4", null, 206, "Partial Content", headers, in);
            }
            return new WebResourceResponse("video/mp4", null, 200, "OK", headers, in);
        } catch (Exception e) {
            return null;
        }
    }

    private static final int REQ_STORAGE = 1;

    private void requestStoragePermission() {
        // En Android 5 el permiso se concede al instalar; desde Android 6 hay que pedirlo.
        if (Build.VERSION.SDK_INT >= 23) {
            String perm = Build.VERSION.SDK_INT >= 33
                ? "android.permission.READ_MEDIA_VIDEO"
                : Manifest.permission.READ_EXTERNAL_STORAGE;
            if (checkSelfPermission(perm) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{ perm }, REQ_STORAGE);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        // Con el permiso ya concedido, recargamos para que aparezca el vídeo.
        if (code == REQ_STORAGE && results.length > 0
                && results[0] == PackageManager.PERMISSION_GRANTED && web != null) {
            web.reload();
        }
    }

    /** Puente JS -> Android. La web lo llama como TVBridge.launchApp(...) */
    private class TVBridge {
        /** Recibe una lista de paquetes candidatos separados por coma y abre el primero instalado. */
        @JavascriptInterface
        public boolean launchApp(String packagesCsv) {
            if (packagesCsv == null) return false;
            final PackageManager pm = getPackageManager();
            for (String raw : packagesCsv.split(",")) {
                String pkg = raw.trim();
                if (pkg.isEmpty()) continue;
                Intent intent = pm.getLaunchIntentForPackage(pkg);
                if (intent != null) {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    return true;
                }
            }
            return false;
        }

        /** Abre una URL en el navegador del sistema (fallback). */
        @JavascriptInterface
        public void openUrl(String url) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception e) {
                toast("No hay navegador para abrir: " + url);
            }
        }

        @JavascriptInterface
        public void toastMsg(final String msg) { toast(msg); }

        /** ¿Está copiado en el stick el vídeo con este nombre? */
        @JavascriptInterface
        public boolean hasLocalVideo(String name) {
            return findLocal(name) != null;
        }

        @JavascriptInterface
        public boolean isInstalled(String pkg) {
            try { getPackageManager().getPackageInfo(pkg.trim(), 0); return true; }
            catch (Exception e) { return false; }
        }

        /**
         * Devuelve el icono REAL de la primera app instalada de la lista, como
         * data URI (PNG base64), para mostrarlo en el launcher. "" si ninguna.
         */
        @JavascriptInterface
        public String getIcon(String packagesCsv) {
            if (packagesCsv == null) return "";
            final PackageManager pm = getPackageManager();
            for (String raw : packagesCsv.split(",")) {
                String pkg = raw.trim();
                if (pkg.isEmpty()) continue;
                try {
                    android.graphics.drawable.Drawable d = pm.getApplicationIcon(pkg);
                    int w = Math.max(1, d.getIntrinsicWidth());
                    int h = Math.max(1, d.getIntrinsicHeight());
                    if (w > 128) { h = h * 128 / w; w = 128; }
                    android.graphics.Bitmap bmp = android.graphics.Bitmap.createBitmap(
                        w, h, android.graphics.Bitmap.Config.ARGB_8888);
                    android.graphics.Canvas c = new android.graphics.Canvas(bmp);
                    d.setBounds(0, 0, w, h);
                    d.draw(c);
                    java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
                    bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out);
                    String b64 = android.util.Base64.encodeToString(out.toByteArray(), android.util.Base64.NO_WRAP);
                    return "data:image/png;base64," + b64;
                } catch (Exception e) { /* prueba el siguiente */ }
            }
            return "";
        }
    }

    private void toast(final String msg) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
    }

    /** Al volver de una app o pulsar HOME, recargamos para refrescar hora/tiempo. */
    @Override
    protected void onResume() {
        super.onResume();
        hideBars();
    }

    @Override
    public void onBackPressed() {
        // En un launcher, ATRÁS no debe cerrar la app: lo mandamos a la web.
        if (web != null) {
            web.evaluateJavascript(
                "(function(){var e=new KeyboardEvent('keydown',{keyCode:27,which:27});document.dispatchEvent(e);})();",
                null);
        }
    }

    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }
}
