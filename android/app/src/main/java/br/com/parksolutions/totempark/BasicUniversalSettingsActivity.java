package br.com.parksolutions.totempark;

import android.app.Activity;
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

        Button close = new Button(this);
        close.setText("Voltar ao Player");
        close.setOnClickListener(view -> finish());
        layout.addView(close);
        setContentView(layout);
    }
}
