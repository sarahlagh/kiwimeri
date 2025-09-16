package io.kiwimeri;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Environment;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "BetterFilesystem", permissions = {
        @Permission(
                strings = {Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE},
                alias = "storage"
        )
})
public class BetterFilesystemPlugin extends Plugin {

    private static class StreamedFile {
        OutputStream out;
    }
    private int idCount = 1;
    private static final Map<Integer, StreamedFile> streamedFiles = new HashMap<>();


    @PluginMethod()
    public void exportToFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        String mimeType = call.getString("mimeType");
        Integer streamId = call.getInt("streamId");
        boolean requestFilePicker = Boolean.TRUE.equals(call.getBoolean("requestFilePicker", true));

        if (fileName == null || content == null || mimeType == null) {
            call.reject("parameters fileName, content or mimeType are mandatory");
            return;
        }

        // if already streaming
        if (streamId != null) {
            Logger.debug("existing streamId = " + streamId);
            if (!streamedFiles.containsKey(streamId)) {
                call.reject("invalid streamId");
                return;
            }
            writeToFile(call, streamId, streamedFiles.get(streamId), content);
            call.resolve(new JSObject().put("success", true).put("streamId", streamId));
            return;
        }

        // else, start streaming
        if (requestFilePicker) {
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(mimeType);
            intent.putExtra(Intent.EXTRA_TITLE, fileName);
            startActivityForResult(call, intent, "filePickerCallback");
        } else {
            if (!isStoragePermissionGranted()) {
                requestAllPermissions(call, "permsCallback");
            } else {
                exportToFileCallback(call);
            }
        }
    }

    @ActivityCallback
    private void filePickerCallback(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        String content = call.getString("content");
        if (result.getResultCode() == Activity.RESULT_OK) {
            try {
                OutputStream out = this.getContext().getContentResolver().openOutputStream(result.getData().getData());
                int streamId = openStream(out);
                Logger.debug("init streamId = " + streamId);
                writeToFile(call, streamId, streamedFiles.get(streamId), content);
                call.resolve(new JSObject().put("success", true).put("streamId", streamId));

            } catch (Exception e) {
                Logger.error("Error writing to file", e);
                call.reject(e.getMessage());
            }
        } else {
            call.resolve(new JSObject().put("success", false));
        }

    }

    @PermissionCallback
    private void permsCallback(PluginCall call) {
        if (isStoragePermissionGranted()) {
            exportToFileCallback(call);
        } else {
            call.reject("Permission is required to write to storage");
        }
    }

    private void exportToFileCallback(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        String appDir = call.getString("appDir", "KiwimeriApp");
        boolean overwrite = Boolean.TRUE.equals(call.getBoolean("overwrite", false));
        try {
            File androidDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
            if (!androidDir.exists() && !androidDir.mkdirs()) {
                call.reject("Invalid directory");
                return;
            }
            File parent = new File(androidDir, appDir);
            File file = new File(parent, fileName);
            if (!file.getParentFile().exists() && !file.getParentFile().mkdirs()) {
                call.reject("Parent folder doesn't exist");
                return;
            }
            OutputStream out;
            if (file.exists() && !overwrite) { // if file with same name exist, try to create a copy
                File copy = getCopy(fileName, parent);
                out = new FileOutputStream(copy, true);
            } else {
                out = new FileOutputStream(file, true);
            }
            int streamId = openStream(out);
            Logger.debug("init streamId = " + streamId);
            writeToFile(call, streamId, streamedFiles.get(streamId), content);
            call.resolve(new JSObject().put("success", true).put("streamId", streamId));
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @NonNull
    private File getCopy(String fileName, File parent) {
        String[] parts = fileName.split("\\.", 2);
        int i = 1;
        File copy;
        do {
            StringBuilder sb = new StringBuilder(fileName.length() + 3);
            sb.append(parts[0]);
            sb.append(" (").append(i++).append(")");
            if (parts.length > 1) {
                sb.append(".").append(parts[1]);
            }
            copy = new File(parent, sb.toString());
        } while (copy.exists());
        return copy;
    }

    private void writeOut(PluginCall call, OutputStream out, String data) throws IOException {
        boolean isBase64 = Boolean.TRUE.equals(call.getBoolean("isBase64", false));
        if (!isBase64) {
            out.write(data.getBytes(StandardCharsets.UTF_8));
        } else {
            byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
            out.write(bytes);
        }
    }

    private void writeToFile(PluginCall call, int streamId, StreamedFile streamedFile, String data) {
        boolean eof = Boolean.TRUE.equals(call.getBoolean("eof", true));
        try {
            writeOut(call, streamedFile.out, data);
            if (eof) {
                streamedFile.out.close();
                streamedFiles.remove(streamId);
                Logger.debug("successfully removed streamId = " + streamId);
            }

        } catch (IOException e) {
            Logger.error("Error writing to file", e);
            try { streamedFile.out.close(); } catch (Exception e2) { /* ignore */ }
            streamedFiles.remove(streamId);
            call.reject(e.getMessage());
        }
    }

    private int openStream(OutputStream out) {
        int streamId = idCount++;
        StreamedFile streamedFile = new StreamedFile();
        streamedFile.out = out;
        streamedFiles.put(streamId, streamedFile);
        return streamId;
    }

    private boolean isStoragePermissionGranted() {
        return Build.VERSION.SDK_INT >= 30 || getPermissionState("storage") == PermissionState.GRANTED;
    }


}
