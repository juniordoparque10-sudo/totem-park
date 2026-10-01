package br.com.parksolutions.totempark;

import android.app.UiModeManager;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TotemDevice")
public class TotemDevicePlugin extends Plugin {

    @PluginMethod
    public void getAppInfo(PluginCall call) {
        try {
            String packageName = getContext().getPackageName();
            PackageInfo packageInfo = getContext().getPackageManager().getPackageInfo(packageName, 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? packageInfo.getLongVersionCode()
                : packageInfo.versionCode;

            JSObject result = new JSObject();
            result.put("packageName", packageName);
            result.put("versionCode", versionCode);
            result.put("versionName", packageInfo.versionName == null ? "" : packageInfo.versionName);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException error) {
            call.reject("Unable to read installed application metadata", error);
        }
    }

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
