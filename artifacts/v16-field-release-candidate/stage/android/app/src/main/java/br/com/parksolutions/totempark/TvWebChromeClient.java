package br.com.parksolutions.totempark;

import android.graphics.Bitmap;
import android.graphics.Color;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/** Removes Android WebView's fallback play poster without changing Capacitor behavior. */
public class TvWebChromeClient extends BridgeWebChromeClient {
    public TvWebChromeClient(Bridge bridge) {
        super(bridge);
    }

    @Override
    public Bitmap getDefaultVideoPoster() {
        Bitmap poster = Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
        poster.eraseColor(Color.TRANSPARENT);
        return poster;
    }
}
