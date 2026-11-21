package br.com.parksolutions.totempark;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BasicBootReceiver extends BroadcastReceiver {

    private static final String TAG = "TotemBasicBoot";
    private static final String BASIC_PACKAGE =
        "br.com.parksolutions.totempark.player.basichom";

    @Override
    public void onReceive(Context context, Intent event) {

        if (!BASIC_PACKAGE.equals(context.getPackageName())) {
            return;
        }

        if (event == null ||
            !Intent.ACTION_BOOT_COMPLETED.equals(event.getAction())) {
            return;
        }

        Log.i(TAG, "BOOT_COMPLETED recebido pelo BASIC V5");

        try {
            Intent launch = new Intent(context, MainActivity.class);

            launch.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_CLEAR_TOP
            );

            context.startActivity(launch);

            Log.i(TAG, "Tentativa unica de abrir MainActivity enviada");

        } catch (RuntimeException error) {
            Log.e(TAG, "Android bloqueou abertura apos boot", error);
        }
    }
}