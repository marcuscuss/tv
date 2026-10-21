package com.marcuscuss.tvlauncher;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
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
    private volatile int localPort = -1;   // puerto del mini servidor de vídeo local

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);       // localStorage: recuerda el tema
        s.setMediaPlaybackRequiresUserGesture(false);
        // La página es https y el vídeo local se sirve por http://127.0.0.1
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        web.setBackgroundColor(0xFF020904);
        web.addJavascriptInterface(new TVBridge(), "TVBridge");

        // Que todo se cargue dentro del WebView, no en un navegador externo
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("http")) { view.loadUrl(url); return true; }
                return false;
            }

            // Vía alternativa: la web pide ".../__local__/bienvenida.mp4" y lo servimos aquí.
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                String path = req.getUrl().getPath();
                if (path == null || !path.contains("/__local__/")) return null;
                File f = findLocal(req.getUrl().getLastPathSegment());
                if (f == null) return null;
                return serveFile(f, req.getRequestHeaders().get("Range"));
            }
        });

        startLocalServer();
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

    private String storagePermission() {
        return Build.VERSION.SDK_INT >= 33
            ? "android.permission.READ_MEDIA_VIDEO"
            : Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private boolean hasStoragePermission() {
        if (Build.VERSION.SDK_INT < 23) return true;   // en Android 5 se concede al instalar
        return checkSelfPermission(storagePermission()) == PackageManager.PERMISSION_GRANTED;
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

    /**
     * Mini servidor HTTP solo en 127.0.0.1 (no accesible desde la red) que sirve
     * los vídeos locales. Algunos WebView reproducen el vídeo con un reproductor
     * propio que se salta shouldInterceptRequest; este camino les funciona igual.
     */
    private void startLocalServer() {
        Thread t = new Thread(() -> {
            try {
                ServerSocket ss = new ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"));
                localPort = ss.getLocalPort();
                while (true) {
                    final Socket sock = ss.accept();
                    new Thread(() -> handleLocal(sock)).start();
                }
            } catch (Exception e) {
                localPort = -1;
            }
        });
        t.setDaemon(true);
        t.start();
    }

    private void handleLocal(Socket sock) {
        try {
            BufferedReader r = new BufferedReader(new InputStreamReader(sock.getInputStream()));
            String first = r.readLine();
            if (first == null) { sock.close(); return; }
            String[] parts = first.split(" ");
            String path = parts.length > 1 ? parts[1] : "/";
            String range = null, h;
            while ((h = r.readLine()) != null && !h.isEmpty()) {
                if (h.toLowerCase().startsWith("range:")) range = h.substring(6).trim();
            }
            OutputStream out = sock.getOutputStream();
            File f = findLocal(Uri.decode(path.substring(path.lastIndexOf('/') + 1)));
            if (f == null) {
                out.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".getBytes());
                out.flush(); sock.close(); return;
            }
            long len = f.length(), start = 0, end = len - 1;
            if (range != null && range.startsWith("bytes=")) {
                String[] p = range.substring(6).split("-");
                if (p.length > 0 && !p[0].trim().isEmpty()) start = Long.parseLong(p[0].trim());
                if (p.length > 1 && !p[1].trim().isEmpty()) end = Math.min(Long.parseLong(p[1].trim()), len - 1);
                if (start > end) start = end;
            }
            long count = end - start + 1;
            String hdr = (range != null
                    ? "HTTP/1.1 206 Partial Content\r\nContent-Range: bytes " + start + "-" + end + "/" + len + "\r\n"
                    : "HTTP/1.1 200 OK\r\n")
                + "Content-Type: video/mp4\r\nAccept-Ranges: bytes\r\nContent-Length: " + count
                + "\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n";
            out.write(hdr.getBytes());
            if (!first.startsWith("HEAD")) {
                RandomAccessFile raf = new RandomAccessFile(f, "r");
                raf.seek(start);
                byte[] buf = new byte[64 * 1024];
                long left = count;
                int n;
                while (left > 0 && (n = raf.read(buf, 0, (int) Math.min(buf.length, left))) > 0) {
                    out.write(buf, 0, n);
                    left -= n;
                }
                raf.close();
            }
            out.flush();
            sock.close();
        } catch (Exception e) {
            try { sock.close(); } catch (Exception ignored) {}
        }
    }

    private static final int REQ_STORAGE = 1;

    private void requestStoragePermission() {
        // Desde Android 6 hay que pedirlo en tiempo de ejecución.
        if (Build.VERSION.SDK_INT >= 23 && !hasStoragePermission()) {
            requestPermissions(new String[]{ storagePermission() }, REQ_STORAGE);
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

    /* ---------- Imágenes de apps ---------- */

    /** Pinta un Drawable a PNG (data URI), limitando el ancho a maxW. */
    private static String toDataUri(Drawable d, int maxW) {
        int w = Math.max(1, d.getIntrinsicWidth());
        int h = Math.max(1, d.getIntrinsicHeight());
        if (w > maxW) { h = Math.max(1, h * maxW / w); w = maxW; }
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        d.setBounds(0, 0, w, h);
        d.draw(c);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
        return "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
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
                Intent intent = pm.getLeanbackLaunchIntentForPackage(pkg);
                if (intent == null) intent = pm.getLaunchIntentForPackage(pkg);
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

        /** Estado del vídeo local: "OK", "SIN PERMISO" o "NO ESTÁ EN Download". */
        @JavascriptInterface
        public String videoStatus(String name) {
            if (findLocal(name) != null) return "OK";
            if (!hasStoragePermission()) return "SIN PERMISO";
            return "NO ESTÁ EN Download";
        }

        /** Vuelve a pedir el permiso de archivos. */
        @JavascriptInterface
        public void requestStorage() {
            runOnUiThread(MainActivity.this::requestStoragePermission);
        }

        /** URL del vídeo en el mini servidor local, o "" si no está disponible. */
        @JavascriptInterface
        public String localVideoUrl(String name) {
            return localPort > 0 ? "http://127.0.0.1:" + localPort + "/" + Uri.encode(name) : "";
        }

        @JavascriptInterface
        public boolean isInstalled(String pkg) {
            try { getPackageManager().getPackageInfo(pkg.trim(), 0); return true; }
            catch (Exception e) { return false; }
        }

        /** Icono REAL de la primera app instalada de la lista (data URI PNG), o "". */
        @JavascriptInterface
        public String getIcon(String packagesCsv) {
            if (packagesCsv == null) return "";
            final PackageManager pm = getPackageManager();
            for (String raw : packagesCsv.split(",")) {
                String pkg = raw.trim();
                if (pkg.isEmpty()) continue;
                try { return toDataUri(pm.getApplicationIcon(pkg), 256); }
                catch (Exception e) { /* prueba el siguiente */ }
            }
            return "";
        }

        /**
         * Banner horizontal de TV (el que se ve en el inicio de Android TV) de la
         * primera app instalada que tenga uno, o "".
         */
        @JavascriptInterface
        public String getBanner(String packagesCsv) {
            if (packagesCsv == null) return "";
            final PackageManager pm = getPackageManager();
            for (String raw : packagesCsv.split(",")) {
                String pkg = raw.trim();
                if (pkg.isEmpty()) continue;
                try {
                    Drawable d = null;
                    Intent li = pm.getLeanbackLaunchIntentForPackage(pkg);
                    if (li != null) d = pm.getActivityBanner(li);
                    if (d == null) d = pm.getApplicationBanner(pkg);
                    if (d != null) return toDataUri(d, 640);
                } catch (Exception e) { /* prueba el siguiente */ }
            }
            return "";
        }
    }

    private void toast(final String msg) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
    }

    @Override
    protected void onResume() {
        super.onResume();
        hideBars();
    }

    @Override
    public void onBackPressed() {
        // En un launcher, ATRÁS no cierra la app: se lo pasamos a la web, que decide
        // (cancelar, volver a perfiles...). Un KeyboardEvent sintético no lleva keyCode,
        // por eso llamamos directamente a la función que expone la web.
        if (web != null) {
            web.evaluateJavascript("window.__joiBack && window.__joiBack();", null);
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
