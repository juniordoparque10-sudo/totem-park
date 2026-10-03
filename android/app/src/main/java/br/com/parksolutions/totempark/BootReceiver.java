package br.com.parksolutions.totempark;

import android.app.AlarmManager;
import android.app.ActivityOptions;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "TotemParkBoot";
    private static final int IMMEDIATE_LAUNCH_REQUEST_CODE = 3000;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (shouldLaunchFromSystemEvent(intent)) {
            if (!isPlayerApp(context)) return;
            if (Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(intent.getAction())) {
                Log.i(TAG, "LOCKED_BOOT_COMPLETED recebido; aguardando BOOT_COMPLETED para abrir o Player.");
                return;
            }

            launchPlayer(context, IMMEDIATE_LAUNCH_REQUEST_CODE);

            if (isBootLikeEvent(intent)) {
                schedulePlayerLaunch(context, 3_000, 3003);
                schedulePlayerLaunch(context, 10_000, 3010);
                schedulePlayerLaunch(context, 25_000, 3025);
                schedulePlayerLaunch(context, 45_000, 3045);
            }
        }
    }

    private boolean shouldLaunchFromSystemEvent(Intent intent) {
        if (intent == null) return false;

        String action = intent.getAction();

        return Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || Intent.ACTION_SCREEN_ON.equals(action)
            || Intent.ACTION_USER_PRESENT.equals(action)
            || Intent.ACTION_DREAMING_STOPPED.equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action);
    }

    private boolean isBootLikeEvent(Intent intent) {
        if (intent == null) return false;

        String action = intent.getAction();

        return Intent.ACTION_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action);
    }

    private PendingIntent createLaunchPendingIntent(Context context, int requestCode) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        ActivityOptions creatorOptions = ActivityOptions.makeBasic();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            creatorOptions.setPendingIntentCreatorBackgroundActivityStartMode(
                ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
            );
        }

        return PendingIntent.getActivity(
            context,
            requestCode,
            launchIntent,
            flags,
            creatorOptions.toBundle()
        );
    }

    private void launchPlayer(Context context, int requestCode) {
        PendingIntent launchPendingIntent = createLaunchPendingIntent(context, requestCode);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ActivityOptions sendOptions = ActivityOptions.makeBasic();
                sendOptions.setPendingIntentBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                );
                launchPendingIntent.send(context, 0, null, null, null, null, sendOptions.toBundle());
                return;
            }

            launchPendingIntent.send();
        } catch (PendingIntent.CanceledException | RuntimeException error) {
            Log.w(TAG, "Não foi possível abrir o Player pelo PendingIntent.", error);
        }
    }

    private void schedulePlayerLaunch(Context context, long delayMillis, int requestCode) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (alarmManager == null) return;

        PendingIntent pendingIntent = createLaunchPendingIntent(context, requestCode);

        long triggerAtMillis = SystemClock.elapsedRealtime() + delayMillis;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                triggerAtMillis,
                pendingIntent
            );
            return;
        }

        alarmManager.set(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            triggerAtMillis,
            pendingIntent
        );
    }

    private boolean isPlayerApp(Context context) {
        String packageName = context.getPackageName();

        return "br.com.parksolutions.totempark".equals(packageName)
            || "br.com.parksolutions.totempark.playertest".equals(packageName)
            || "br.com.parksolutions.totempark.player.lab".equals(packageName)
            || "br.com.parksolutions.totempark.player.linkfix".equals(packageName)
            || "br.com.parksolutions.totempark.player.loopaudit".equals(packageName);
    }
}
