package br.com.parksolutions.totempark;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.UiModeManager;
import android.content.pm.PackageManager;
import android.content.res.Configuration;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (
            Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())
        ) {
            if (!isTelevision(context)) return;

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            context.startActivity(launchIntent);
        }
    }

    private boolean isTelevision(Context context) {
        UiModeManager uiModeManager = (UiModeManager) context
            .getSystemService(Context.UI_MODE_SERVICE);
        PackageManager packageManager = context.getPackageManager();

        return (
            uiModeManager != null &&
            uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION
        ) || packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
            || packageManager.hasSystemFeature("android.hardware.type.television");
    }
}
