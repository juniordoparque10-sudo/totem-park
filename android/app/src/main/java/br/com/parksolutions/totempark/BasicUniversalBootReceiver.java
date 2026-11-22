package br.com.parksolutions.totempark;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BasicUniversalBootReceiver extends BroadcastReceiver {
    private static final String TAG = "TotemBasicUniversal";
    private static final String UNIVERSAL_PACKAGE = "br.com.parksolutions.totempark.player.basicv5";
    private static final String QUICKBOOT_POWERON = "android.intent.action.QUICKBOOT_POWERON";

    @Override
    public void onReceive(Context context, Intent event) {
        if (context == null || event == null || !UNIVERSAL_PACKAGE.equals(context.getPackageName())) return;
        String action = event.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
            && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            && !QUICKBOOT_POWERON.equals(action)) return;
        if (!BasicUniversalPreferences.isAutoStartEnabled(context)) {
            Log.i(TAG, "Inicializacao automatica desativada pelo usuario.");
            return;
        }

        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_SINGLE_TOP
            | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        try {
            context.startActivity(launch);
            Log.i(TAG, "Tentativa unica de iniciar o BASIC V5 enviada.");
        } catch (RuntimeException error) {
            Log.w(TAG, "Android bloqueou a abertura automatica do BASIC V5.", error);
        }
    }
}
