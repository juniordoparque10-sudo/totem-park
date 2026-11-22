package br.com.parksolutions.totempark;

import android.content.Context;
import android.content.SharedPreferences;

public final class BasicUniversalPreferences {
    static final String PREFERENCES_NAME = "totem_basic_v5_universal";
    static final String AUTO_START_KEY = "auto_start_enabled";

    private BasicUniversalPreferences() {}

    public static boolean isAutoStartEnabled(Context context) {
        return preferences(context).getBoolean(AUTO_START_KEY, true);
    }

    public static void setAutoStartEnabled(Context context, boolean enabled) {
        preferences(context).edit().putBoolean(AUTO_START_KEY, enabled).apply();
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }
}
