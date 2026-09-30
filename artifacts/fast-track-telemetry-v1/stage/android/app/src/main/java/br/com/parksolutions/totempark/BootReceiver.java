package br.com.parksolutions.totempark;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (shouldLaunchFromSystemEvent(intent)) {
            if (!isPlayerApp(context)) return;

            launchPlayer(context);
            startBootService(context);

            if (isBootLikeEvent(intent)) {
                schedulePlayerLaunch(context, 3_000, 3003);
                schedulePlayerLaunch(context, 10_000, 3010);
                schedulePlayerLaunch(context, 25_000, 3025);
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
            || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)
            || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action);
    }

    private void launchPlayer(Context context) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(launchIntent);
    }

    private void startBootService(Context context) {
        Intent serviceIntent = new Intent(context, PlayerBootService.class);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
                return;
            }

            context.startService(serviceIntent);
        } catch (IllegalStateException | SecurityException ignored) {
            // Some TV firmwares block background starts during boot. The alarm fallback remains active.
        }
    }

    private void schedulePlayerLaunch(Context context, long delayMillis, int requestCode) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (alarmManager == null) return;

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            launchIntent,
            flags
        );

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
