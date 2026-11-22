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
        if ("br.com.parksolutions.totempark.player.decoderexperiment".equals(getPackageName())) {
            try {
                Class<?> diagnosticClass = Class.forName("br.com.parksolutions.totempark.DiagnosticExportPlugin");
                registerPlugin(diagnosticClass.asSubclass(Plugin.class));
            } catch (ClassNotFoundException error) {
                throw new IllegalStateException("Plugin de exportação pública ausente no build experimental", error);
            }
        }
        super.onCreate(savedInstanceState);
        installBasicBackHandler();


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

    // BASIC_V5_BACK_CALLBACK
    // Saida voluntaria exclusiva do BASIC V5 experimental.
    private static final String BASIC_V5_PACKAGE =
        "br.com.parksolutions.totempark.player.basichom";
    private static final String BASIC_V5_UNIVERSAL_PACKAGE =
        "br.com.parksolutions.totempark.player.basicv5";

    private boolean basicExitDialogVisible = false;
    private android.app.Dialog basicExitDialog;
    private android.window.OnBackInvokedCallback basicBackCallback;

    private boolean isBasicV5() {
        return BASIC_V5_PACKAGE.equals(getPackageName())
            || BASIC_V5_UNIVERSAL_PACKAGE.equals(getPackageName());
    }

    private boolean isBasicUniversal() {
        return BASIC_V5_UNIVERSAL_PACKAGE.equals(getPackageName());
    }

    private void installBasicBackHandler() {
        if (!isBasicV5()) return;

        if (android.os.Build.VERSION.SDK_INT >= 33) {
            basicBackCallback = () -> showBasicExitDialog();

            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                basicBackCallback
            );
        }
    }

    private void showBasicExitDialog() {
        if (!isBasicV5() ||
            basicExitDialogVisible ||
            isFinishing() ||
            isDestroyed()) {
            return;
        }

        if (isBasicUniversal()) {
            showBasicUniversalExitDialog();
            return;
        }

        basicExitDialogVisible = true;
        String autoStartMessage = "O Totem Park iniciara novamente ao reiniciar o Android.";
        if (isBasicUniversal() && !BasicUniversalPreferences.isAutoStartEnabled(this)) {
            autoStartMessage = "A inicialização automática está desativada.";
        }

        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(this)
            .setTitle("Sair do Totem Park?")
            .setMessage(
                "Deseja fechar o aplicativo? " +
                "O vinculo da TV e as midias armazenadas serao preservados. " +
                autoStartMessage
            )
            .setNegativeButton(
                "Cancelar",
                (dialog, which) -> dialog.dismiss()
            )
            .setPositiveButton(
                "Sair",
                (dialog, which) -> {
                    basicExitDialog = null;
                    finishAndRemoveTask();
                }
            );

        basicExitDialog = builder
            .setOnDismissListener(dialog -> {
                basicExitDialogVisible = false;
                basicExitDialog = null;
            })
            .create();

        basicExitDialog.show();
    }

    private void showBasicUniversalExitDialog() {
        basicExitDialogVisible = true;
        int density = Math.round(getResources().getDisplayMetrics().density);
        int padding = 24 * density;

        android.app.Dialog dialog = new android.app.Dialog(this);
        android.widget.LinearLayout card = new android.widget.LinearLayout(this);
        card.setOrientation(android.widget.LinearLayout.VERTICAL);
        card.setPadding(padding, padding, padding, padding);

        android.graphics.drawable.GradientDrawable background = new android.graphics.drawable.GradientDrawable(
            android.graphics.drawable.GradientDrawable.Orientation.TL_BR,
            new int[] { 0xFF111827, 0xFF17122B }
        );
        background.setCornerRadius(18 * density);
        background.setStroke(2 * density, 0xFF6366F1);
        card.setBackground(background);

        android.widget.TextView brand = new android.widget.TextView(this);
        brand.setText("TOTEM PARK");
        brand.setTextColor(0xFF818CF8);
        brand.setTextSize(13);
        card.addView(brand);

        android.widget.TextView title = new android.widget.TextView(this);
        title.setText("Sair do Player?");
        title.setTextColor(0xFFFFFFFF);
        title.setTextSize(24);
        title.setPadding(0, 8 * density, 0, 8 * density);
        card.addView(title);

        android.widget.TextView message = new android.widget.TextView(this);
        message.setText("A reprodução será encerrada nesta tela.");
        message.setTextColor(0xFFD1D5DB);
        message.setTextSize(16);
        card.addView(message);

        android.widget.LinearLayout actions = new android.widget.LinearLayout(this);
        actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        actions.setGravity(android.view.Gravity.END);
        actions.setPadding(0, 20 * density, 0, 0);

        android.widget.Button continueButton = new android.widget.Button(this);
        continueButton.setText("Continuar");
        continueButton.setFocusable(true);
        continueButton.setOnClickListener(view -> dialog.dismiss());
        actions.addView(continueButton);

        android.widget.Button exitButton = new android.widget.Button(this);
        exitButton.setText("Sair do aplicativo");
        exitButton.setFocusable(true);
        exitButton.setOnClickListener(view -> {
            basicExitDialog = null;
            dialog.dismiss();
            finishAndRemoveTask();
        });
        actions.addView(exitButton);
        card.addView(actions);

        dialog.setContentView(card);
        dialog.setCanceledOnTouchOutside(false);
        dialog.setOnKeyListener((currentDialog, keyCode, event) -> {
            if (keyCode == android.view.KeyEvent.KEYCODE_BACK && event.getAction() == android.view.KeyEvent.ACTION_UP) {
                currentDialog.dismiss();
                return true;
            }
            return false;
        });
        dialog.setOnDismissListener(currentDialog -> {
            basicExitDialogVisible = false;
            basicExitDialog = null;
        });
        dialog.setOnShowListener(currentDialog -> continueButton.requestFocus());

        android.view.Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
            window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            WindowManager.LayoutParams attributes = window.getAttributes();
            attributes.dimAmount = 0.78f;
            window.setAttributes(attributes);
            window.setLayout(Math.min(460 * density, getResources().getDisplayMetrics().widthPixels - 48 * density), WindowManager.LayoutParams.WRAP_CONTENT);
        }

        basicExitDialog = dialog;
        dialog.show();
        if (window != null) {
            window.setLayout(Math.min(460 * density, getResources().getDisplayMetrics().widthPixels - 48 * density), WindowManager.LayoutParams.WRAP_CONTENT);
        }
    }

    @Override
    public boolean dispatchKeyEvent(android.view.KeyEvent event) {
        if (isBasicV5()) {
            int key = event.getKeyCode();

            if (isBasicUniversal() && key == android.view.KeyEvent.KEYCODE_MENU && event.getAction() == android.view.KeyEvent.ACTION_UP) {
                startActivity(new Intent(this, BasicUniversalSettingsActivity.class));
                return true;
            }

            if (key == android.view.KeyEvent.KEYCODE_BACK ||
                key == android.view.KeyEvent.KEYCODE_ESCAPE) {

                if (event.getAction() ==
                    android.view.KeyEvent.ACTION_UP &&
                    !event.isCanceled()) {
                    showBasicExitDialog();
                }

                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onBackPressed() {
        if (isBasicV5()) {
            showBasicExitDialog();
            return;
        }

        super.onBackPressed();
    }

    @Override
    public void onDestroy() {
        if (basicExitDialog != null) {
            basicExitDialog.dismiss();
            basicExitDialog = null;
        }

        if (basicBackCallback != null &&
            android.os.Build.VERSION.SDK_INT >= 33) {

            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(
                basicBackCallback
            );

            basicBackCallback = null;
        }

        super.onDestroy();
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
            || "br.com.parksolutions.totempark.player.loopaudit".equals(getPackageName())
            || BASIC_V5_UNIVERSAL_PACKAGE.equals(getPackageName());
    }
}
