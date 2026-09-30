package br.com.parksolutions.totempark;

import android.app.ActivityManager;
import android.app.UiModeManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(TotemDevicePlugin.class);
        if ("br.com.parksolutions.totempark.player.decoderexperiment".equals(getPackageName())
            || "br.com.parksolutions.totempark.player.telemetryperfdiag".equals(getPackageName())) {
            try {
                Class<?> diagnosticClass = Class.forName("br.com.parksolutions.totempark.DiagnosticExportPlugin");
                registerPlugin(diagnosticClass.asSubclass(Plugin.class));
            } catch (ClassNotFoundException error) {
                throw new IllegalStateException("Plugin de exportação pública ausente no build experimental", error);
            }
        }
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);

        if (isTelevision()) {
            getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            getBridge().getWebView().setWebChromeClient(new TvWebChromeClient(getBridge()));
            getBridge().getWebView().setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }

        enableFullscreenMode();
        configureTvKioskMode();
    }

    @Override
    public void onResume() {
        super.onResume();
        enableFullscreenMode();
        configureTvKioskMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);

        if (hasFocus) {
            enableFullscreenMode();
        }
    }

    private void enableFullscreenMode() {
        View decorView = getWindow().getDecorView();

        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private boolean isTelevision() {
        UiModeManager uiModeManager = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        PackageManager packageManager = getPackageManager();

        return (
            uiModeManager != null &&
            uiModeManager.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION
        ) || packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK)
            || packageManager.hasSystemFeature("android.hardware.type.television");
    }

    private void configureTvKioskMode() {
        if (!isPlayerFlavor()) return;

        PackageManager packageManager = getPackageManager();
        ComponentName tvLauncher = new ComponentName(
            this,
            getPackageName() + ".TvLauncherActivity"
        );

        try {
            packageManager.setComponentEnabledSetting(
                tvLauncher,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );
        } catch (IllegalArgumentException error) {
            return;
        }

        DevicePolicyManager devicePolicyManager = (DevicePolicyManager) getSystemService(
            Context.DEVICE_POLICY_SERVICE
        );

        if (devicePolicyManager == null || !devicePolicyManager.isDeviceOwnerApp(getPackageName())) {
            return;
        }

        ComponentName admin = new ComponentName(this, TotemDeviceAdminReceiver.class);
        devicePolicyManager.setLockTaskPackages(admin, new String[] { getPackageName() });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            devicePolicyManager.setLockTaskFeatures(
                admin,
                DevicePolicyManager.LOCK_TASK_FEATURE_NONE
            );
        }

        IntentFilter homeFilter = new IntentFilter(Intent.ACTION_MAIN);
        homeFilter.addCategory(Intent.CATEGORY_HOME);
        homeFilter.addCategory(Intent.CATEGORY_DEFAULT);
        devicePolicyManager.addPersistentPreferredActivity(admin, homeFilter, tvLauncher);

        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        boolean alreadyLocked = activityManager != null
            && activityManager.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;

        if (!alreadyLocked && devicePolicyManager.isLockTaskPermitted(getPackageName())) {
            startLockTask();
        }
    }

    private boolean isPlayerFlavor() {
        return "br.com.parksolutions.totempark".equals(getPackageName())
            || "br.com.parksolutions.totempark.playertest".equals(getPackageName())
            || "br.com.parksolutions.totempark.player.lab".equals(getPackageName())
            || "br.com.parksolutions.totempark.player.linkfix".equals(getPackageName())
            || "br.com.parksolutions.totempark.player.loopaudit".equals(getPackageName());
    }
}
