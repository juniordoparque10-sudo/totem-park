package br.com.parksolutions.totempark;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;

public class PlayerBootService extends Service {
    private static final String PLAYER_PACKAGE = "br.com.parksolutions.totempark";
    private static final String PLAYER_LAB_PACKAGE = "br.com.parksolutions.totempark.player.lab";
    private static final String PLAYER_LINK_FIX_PACKAGE = "br.com.parksolutions.totempark.player.linkfix";
    private static final String PLAYER_LOOP_AUDIT_PACKAGE = "br.com.parksolutions.totempark.player.loopaudit";
    private static final String CHANNEL_ID = "totempark_player_boot";
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!PLAYER_PACKAGE.equals(getPackageName())
            && !PLAYER_LAB_PACKAGE.equals(getPackageName())
            && !PLAYER_LINK_FIX_PACKAGE.equals(getPackageName())
            && !PLAYER_LOOP_AUDIT_PACKAGE.equals(getPackageName())) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }

        startForeground(4401, createNotification());
        scheduleLaunchAttempts(startId);

        return START_NOT_STICKY;
    }

    private void scheduleLaunchAttempts(int startId) {
        long[] delays = new long[] { 0L, 3_000L, 10_000L, 25_000L, 45_000L };

        for (long delay : delays) {
            handler.postDelayed(this::launchPlayer, delay);
        }

        handler.postDelayed(() -> stopSelf(startId), 50_000L);
    }

    private void launchPlayer() {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);

        try {
            startActivity(launchIntent);
        } catch (RuntimeException ignored) {
            // The launcher alias and alarm fallback still keep the Player recoverable.
        }
    }

    private Notification createNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Totem Park Player",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Retomada automatica do Player na Smart TV.");

            NotificationManager manager = (NotificationManager) getSystemService(
                Context.NOTIFICATION_SERVICE
            );

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);

        return builder
            .setSmallIcon(R.drawable.ic_player_notification)
            .setContentTitle("Totem Park Player")
            .setContentText("Preparando exibicao da TV.")
            .setOngoing(false)
            .build();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
