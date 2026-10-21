package com.marcuscuss.tvlauncher;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

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
        });

        web.loadUrl(LAUNCHER_URL);
        hideBars();
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

        @JavascriptInterface
        public boolean isInstalled(String pkg) {
            try { getPackageManager().getPackageInfo(pkg.trim(), 0); return true; }
            catch (Exception e) { return false; }
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
