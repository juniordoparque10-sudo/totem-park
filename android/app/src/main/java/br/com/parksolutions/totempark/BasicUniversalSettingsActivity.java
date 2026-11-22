package br.com.parksolutions.totempark;

import android.app.Activity;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.TextView;

public class BasicUniversalSettingsActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int padding = Math.round(24 * getResources().getDisplayMetrics().density);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(padding, padding, padding, padding);
        layout.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        TextView title = new TextView(this);
        title.setText("Configurações do Totem Park BASIC V5");
        title.setTextSize(22);
        layout.addView(title);

        Switch autoStart = new Switch(this);
        autoStart.setText("Iniciar automaticamente com o Android");
        autoStart.setChecked(BasicUniversalPreferences.isAutoStartEnabled(this));
        autoStart.setOnCheckedChangeListener((button, enabled) ->
            BasicUniversalPreferences.setAutoStartEnabled(this, enabled));
        layout.addView(autoStart);

        TextView note = new TextView(this);
        note.setText("A abertura após o boot depende das permissões e restrições do fabricante do aparelho.");
        layout.addView(note);

        TextView buildInfo = new TextView(this);
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? packageInfo.getLongVersionCode()
                : packageInfo.versionCode;
            buildInfo.setText(
                "Perfil: BASIC V5\n" +
                "Pacote: " + getPackageName() + "\n" +
                "VersionName: " + packageInfo.versionName + "\n" +
                "VersionCode: " + versionCode + "\n" +
                "Build ID: " + BuildConfig.TOTEM_BUILD_ID + "\n" +
                "Compilado em: " + BuildConfig.TOTEM_BUILD_TIMESTAMP
            );
        } catch (Exception error) {
            buildInfo.setText("Perfil: BASIC V5\nPacote: " + getPackageName());
        }
        layout.addView(buildInfo);

        Button close = new Button(this);
        close.setText("Voltar ao Player");
        close.setOnClickListener(view -> finish());
        layout.addView(close);
        setContentView(layout);
    }
}
