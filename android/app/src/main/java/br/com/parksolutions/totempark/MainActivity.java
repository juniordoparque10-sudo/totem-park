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
        final float scale = getResources().getDisplayMetrics().density;
        final int pad = (int) (24 * scale);

        android.app.Dialog dialog = new android.app.Dialog(this);

        android.graphics.drawable.GradientDrawable border =
            new android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.TL_BR,
                new int[] { 0xFF19C8F4, 0xFF7851EA, 0xFFAA4DF2 }
            );
        border.setCornerRadius(23 * scale);

        android.widget.LinearLayout frame = new android.widget.LinearLayout(this);
        frame.setOrientation(android.widget.LinearLayout.VERTICAL);
        frame.setClipChildren(false);
        frame.setClipToPadding(false);
        frame.setPadding((int)(2 * scale), (int)(2 * scale),
                         (int)(2 * scale), (int)(2 * scale));
        try (java.io.InputStream pngInput = getAssets().open("public/exit_card_navy.png")) {
            android.graphics.Bitmap image = android.graphics.BitmapFactory.decodeStream(pngInput);
            if (image == null) {
                throw new java.io.IOException("PNG da janela nao decodificado");
            }
            android.graphics.drawable.BitmapDrawable glass =
                new android.graphics.drawable.BitmapDrawable(getResources(), image);
            glass.setGravity(android.view.Gravity.FILL);
            frame.setBackground(glass);
        } catch (java.io.IOException error) {
            android.util.Log.w("TotemBasicUniversal", "Fundo da janela indisponivel", error);
            frame.setBackground(border);
        }

        android.widget.LinearLayout card = new android.widget.LinearLayout(this);
        card.setOrientation(android.widget.LinearLayout.VERTICAL);
        card.setGravity(android.view.Gravity.CENTER_HORIZONTAL);
        card.setClipChildren(false);
        card.setClipToPadding(false);
        card.setPadding((int)(12 * scale), (int)(10 * scale), (int)(12 * scale), (int)(10 * scale));

        android.graphics.drawable.GradientDrawable bg =
            new android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.TL_BR,
                new int[] { 0x900A2748, 0x99071732 }
            );
        bg.setCornerRadius(21 * scale);
        card.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        frame.addView(card);

        android.widget.ImageView logo = new android.widget.ImageView(this);
        logo.setScaleType(android.widget.ImageView.ScaleType.FIT_CENTER);
        try (java.io.InputStream input = getAssets().open("public/logo.png")) {
            logo.setImageBitmap(android.graphics.BitmapFactory.decodeStream(input));
        } catch (java.io.IOException error) {
            android.util.Log.w("TotemBasicUniversal", "Logo indisponivel", error);
        }
        card.addView(logo, new android.widget.LinearLayout.LayoutParams(
            (int)(140 * scale), (int)(38 * scale)));

        android.widget.TextView brandName = new android.widget.TextView(this);
        brandName.setText("TOTEM PARK");
        brandName.setTextColor(0xFFF4F7FF);
        brandName.setTextSize(15);
        brandName.setTypeface(null, android.graphics.Typeface.BOLD);
        brandName.setGravity(android.view.Gravity.CENTER);
        brandName.setLetterSpacing(0.025f);
        card.addView(brandName);

        android.widget.TextView tagline = new android.widget.TextView(this);
        tagline.setText("TELAS QUE CONECTAM");
        tagline.setTextColor(0xFF91A5C8);
        tagline.setTextSize(9);
        tagline.setLetterSpacing(0.20f);
        tagline.setGravity(android.view.Gravity.CENTER);
        card.addView(tagline);

        android.view.View divider = new android.view.View(this);
        divider.setBackgroundColor(0xFF354567);
        android.widget.LinearLayout.LayoutParams dividerParams =
            new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                Math.max(1, (int)scale));
        dividerParams.setMargins(0, (int)(6 * scale), 0, (int)(7 * scale));
        card.addView(divider, dividerParams);


        android.widget.TextView title = new android.widget.TextView(this);
        android.text.SpannableString titleText =
            new android.text.SpannableString("Sair do Player?");
        titleText.setSpan(
            new android.text.style.ForegroundColorSpan(0xFFAA81FF),
            8, titleText.length(),
            android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        );
        title.setText(titleText);
        title.setTextSize(21);
        title.setTextColor(0xFFFFFFFF);
        title.setTypeface(null, android.graphics.Typeface.BOLD);
        title.setGravity(android.view.Gravity.CENTER);
        card.addView(title);

        android.widget.TextView message = new android.widget.TextView(this);
        message.setText("A reprodu\u00e7\u00e3o ser\u00e1 encerrada nesta tela.");
        message.setTextColor(0xFFB8C6DF);
        message.setTextSize(12);
        message.setGravity(android.view.Gravity.CENTER);
        message.setPadding(0, (int)(4 * scale), 0, (int)(9 * scale));
        card.addView(message);

        android.widget.LinearLayout actions = new android.widget.LinearLayout(this);
        actions.setOrientation(android.widget.LinearLayout.HORIZONTAL);
        actions.setClipChildren(false);
        actions.setClipToPadding(false);
        actions.setPadding(
            (int)(3 * scale),
            (int)(5 * scale),
            (int)(3 * scale),
            (int)(5 * scale)
        );

        android.widget.TextView continueButton = new android.widget.TextView(this);
        continueButton.setText("Continuar");
        continueButton.setTextColor(0xFFFFFFFF);
        continueButton.setTextSize(12);
        continueButton.setGravity(android.view.Gravity.CENTER);
        continueButton.setFocusable(true);
        continueButton.setClickable(true);
        continueButton.setPadding((int)(8 * scale), (int)(11 * scale), (int)(8 * scale), (int)(11 * scale));

        android.graphics.drawable.GradientDrawable continueBg =
            new android.graphics.drawable.GradientDrawable();
        continueBg.setColor(0xFF12375D);
        continueBg.setCornerRadius(11 * scale);
        continueBg.setStroke(Math.max(1, (int)scale), 0xFF4389D8);
                android.graphics.drawable.GradientDrawable continueFocused =
            new android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.LEFT_RIGHT,
                new int[] { 0xFF0878CD, 0xFF235AE8 }
            );
        continueFocused.setCornerRadius(11 * scale);
        continueFocused.setStroke(Math.max(2, (int)(3 * scale)), 0xFFB8F4FF);

        android.graphics.drawable.StateListDrawable continueStates =
            new android.graphics.drawable.StateListDrawable();
        continueStates.addState(
            new int[] { android.R.attr.state_focused }, continueFocused);
        continueStates.addState(new int[] {}, continueBg);

        continueButton.setBackground(continueStates);
        continueButton.setOnFocusChangeListener((view, focused) -> {
            view.setScaleX(1.0f);
            view.setScaleY(1.0f);
        });
        continueButton.setOnClickListener(view -> dialog.dismiss());

        android.widget.TextView exitButton = new android.widget.TextView(this);
        exitButton.setText("Sair do aplicativo");
        exitButton.setTextColor(0xFFFFFFFF);
        exitButton.setTextSize(12);
        exitButton.setGravity(android.view.Gravity.CENTER);
        exitButton.setFocusable(true);
        exitButton.setClickable(true);
        exitButton.setPadding((int)(8 * scale), (int)(11 * scale), (int)(8 * scale), (int)(11 * scale));

        android.graphics.drawable.GradientDrawable exitBg =
            new android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.LEFT_RIGHT,
                new int[] { 0xFF1599E9, 0xFF8547E5 }
            );
        exitBg.setCornerRadius(11 * scale);
                android.graphics.drawable.GradientDrawable exitFocused =
            new android.graphics.drawable.GradientDrawable(
                android.graphics.drawable.GradientDrawable.Orientation.LEFT_RIGHT,
                new int[] { 0xFF2568ED, 0xFFAB44F7 }
            );
        exitFocused.setCornerRadius(11 * scale);
        exitFocused.setStroke(Math.max(2, (int)(3 * scale)), 0xFFFFFFFF);

        android.graphics.drawable.StateListDrawable exitStates =
            new android.graphics.drawable.StateListDrawable();
        exitStates.addState(
            new int[] { android.R.attr.state_focused }, exitFocused);
        exitStates.addState(new int[] {}, exitBg);

        exitButton.setBackground(exitStates);
        exitButton.setOnFocusChangeListener((view, focused) -> {
            view.setScaleX(1.0f);
            view.setScaleY(1.0f);
        });
        exitButton.setOnClickListener(view -> {
            dialog.dismiss();
            finishAndRemoveTask();
        });

        android.widget.LinearLayout.LayoutParams left =
            new android.widget.LinearLayout.LayoutParams(0, -2, 1);
        left.setMargins(0, 0, (int)(8 * scale), 0);
        actions.addView(continueButton, left);

        android.widget.LinearLayout.LayoutParams right =
            new android.widget.LinearLayout.LayoutParams(0, -2, 1.2f);
        actions.addView(exitButton, right);

                continueButton.setId(android.view.View.generateViewId());
        exitButton.setId(android.view.View.generateViewId());

        continueButton.setNextFocusRightId(exitButton.getId());
        continueButton.setNextFocusLeftId(exitButton.getId());

        exitButton.setNextFocusLeftId(continueButton.getId());
        exitButton.setNextFocusRightId(continueButton.getId());

        card.addView(actions);
        dialog.setContentView(frame);
        dialog.setCanceledOnTouchOutside(false);

        dialog.setOnDismissListener(d -> {
            basicExitDialogVisible = false;
            basicExitDialog = null;
        });

        dialog.setOnShowListener(d -> { continueButton.requestFocus(); });

        dialog.setOnKeyListener((d, keyCode, event) -> {
            if (keyCode == android.view.KeyEvent.KEYCODE_BACK &&
                event.getAction() == android.view.KeyEvent.ACTION_UP) {
                dialog.dismiss();
                return true;
            }
            return false;
        });

        android.view.Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(
                new android.graphics.drawable.ColorDrawable(
                    android.graphics.Color.TRANSPARENT));
            window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            window.addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL);
        }

        basicExitDialog = dialog;
        dialog.show();

        if (window != null) {
            window.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            window.setLayout(
                Math.min((int)(285 * scale),
                    getResources().getDisplayMetrics().widthPixels - (int)(40 * scale)),
                WindowManager.LayoutParams.WRAP_CONTENT
            );
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
