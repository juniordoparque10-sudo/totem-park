package br.com.parksolutions.totempark;

import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "DiagnosticExport")
public class DiagnosticExportPlugin extends Plugin {
    private Uri lastSavedUri;

    @PluginMethod
    public void save(PluginCall call) {
        String fileName = call.getString("fileName", "");
        String data = call.getString("data", "");
        if (!fileName.matches("totempark-sidecar-perf-[0-9]{8}-[0-9]{6}\\.json") || data.isEmpty()) {
            call.reject("Nome ou conteúdo de diagnóstico inválido");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Exportação pública requer Android 10 ou superior neste build experimental");
            return;
        }

        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
        try {
            call.resolve(saveToMediaStore(fileName, bytes));
        } catch (Exception error) {
            lastSavedUri = null;
            call.reject("ERRO DE EXPORTAÇÃO: " + error.getMessage());
        }
    }

    private JSObject saveToMediaStore(String fileName, byte[] bytes) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();
        String relativePath = Environment.DIRECTORY_DOCUMENTS + "/TotemPark/";
        Uri collection = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri uri = resolver.insert(collection, values);
        if (uri == null) throw new Exception("MediaStore não criou o arquivo");
        try {
            try (OutputStream output = resolver.openOutputStream(uri, "w")) {
                if (output == null) throw new Exception("MediaStore não abriu o arquivo para escrita");
                output.write(bytes);
                output.flush();
            }
            ContentValues ready = new ContentValues();
            ready.put(MediaStore.MediaColumns.IS_PENDING, 0);
            if (resolver.update(uri, ready, null, null) != 1) throw new Exception("MediaStore não confirmou o arquivo");

            long verifiedBytes = 0;
            try (InputStream input = resolver.openInputStream(uri)) {
                if (input == null) throw new Exception("Arquivo público não pode ser relido");
                byte[] buffer = new byte[8192];
                int read;
                while ((read = input.read(buffer)) != -1) verifiedBytes += read;
            }
            if (verifiedBytes <= 0 || verifiedBytes != bytes.length) {
                throw new Exception("Tamanho público inválido: " + verifiedBytes + " / " + bytes.length);
            }
            String storedName = null;
            try (Cursor cursor = resolver.query(uri, new String[] { MediaStore.MediaColumns.DISPLAY_NAME }, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) storedName = cursor.getString(0);
            }
            if (!fileName.equals(storedName)) throw new Exception("Nome público não corresponde à exportação atual");

            lastSavedUri = uri;
            JSObject result = new JSObject();
            result.put("fileName", storedName);
            result.put("folder", relativePath);
            result.put("sizeBytes", verifiedBytes);
            result.put("uri", uri.toString());
            result.put("packageName", getContext().getPackageName());
            result.put("fallback", false);
            return result;
        } catch (Exception error) {
            resolver.delete(uri, null, null);
            throw error;
        }
    }

    @PluginMethod
    public void shareLast(PluginCall call) {
        if (lastSavedUri == null) {
            call.reject("Exporte um diagnóstico público antes de compartilhar");
            return;
        }
        try {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("application/json");
            send.putExtra(Intent.EXTRA_STREAM, lastSavedUri);
            send.setClipData(ClipData.newRawUri("Diagnóstico Totem Park", lastSavedUri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(Intent.createChooser(send, "Compartilhar diagnóstico JSON"));
            call.resolve();
        } catch (Exception error) {
            call.reject("Compartilhamento indisponível: " + error.getMessage());
        }
    }
}
