package br.com.parksolutions.totempark;

import android.app.UiModeManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.res.Configuration;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TotemDevice")
public class TotemDevicePlugin extends Plugin {

    @PluginMethod
    public void getDeviceType(PluginCall call) {
        UiModeManager uiModeManager = (UiModeManager) getContext()
            .getSystemService(Context.UI_MODE_SERVICE);
        PackageManager packageManager = getContext().getPackageManager();

        boolean isTelevision =
            (uiModeManager != null
                && uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION)
            || packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
            || packageManager.hasSystemFeature("android.hardware.type.television");

        JSObject result = new JSObject();
        result.put("isTelevision", isTelevision);
        call.resolve(result);
    }
}
