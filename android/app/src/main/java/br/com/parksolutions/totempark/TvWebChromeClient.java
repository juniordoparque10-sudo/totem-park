package br.com.parksolutions.totempark;

import android.graphics.Bitmap;
import android.graphics.Color;
import android.util.Log;
import android.webkit.ConsoleMessage;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/** Removes Android WebView's fallback play poster without changing Capacitor behavior. */
public class TvWebChromeClient extends BridgeWebChromeClient {
    private static final String DIAGNOSTIC_PREFIX = "TOTEMPARK-DIAG";

    public TvWebChromeClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public Bitmap getDefaultVideoPoster() {
        Bitmap poster = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
        poster.eraseColor(Color.TRANSPARENT);
        return poster;
    }

    @Override
    public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
        String message = consoleMessage != null ? consoleMessage.message() : "";
        if (message != null && message.startsWith(DIAGNOSTIC_PREFIX)) {
            Log.i(DIAGNOSTIC_PREFIX, message);
            return true;
        }
        return super.onConsoleMessage(consoleMessage);
    }
}
