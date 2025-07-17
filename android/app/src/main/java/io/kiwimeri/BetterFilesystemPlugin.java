package io.kiwimeri;

import android.os.Environment;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BetterFilesystem")
public class BetterFilesystemPlugin extends Plugin {

    @PluginMethod()
    public void exportToFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        String appDir = call.getString("appDir", "KiwimeriApp");

        if (fileName == null || content == null) {
            call.reject("missing parameter fileName or content");
            return;
        }

        // TODO handle permissions request
        // TODO file picker

        try {
            File androidDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
            if (androidDir.exists() || androidDir.mkdirs()) {
                File parent = new File(androidDir, appDir);
                File file = new File(parent, fileName);
                if (file.getParentFile().exists() || (file.getParentFile().mkdirs())) {
                    writeToFile(call, file, content);
                } else {
                    call.reject("Parent folder doesn't exist");
                }
            } else {
                call.reject("Invalid directory");
            }
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    private void writeToFile(PluginCall call, File file, String data) throws IOException {
        boolean isBase64 = Boolean.TRUE.equals(call.getBoolean("isBase64", false));
        boolean append = true;
        try (FileOutputStream fos = new FileOutputStream(file, append)) {
            if (!isBase64) {
                fos.write(data.getBytes(StandardCharsets.UTF_8));
            } else {
                byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
                fos.write(bytes);
            }
        }
        call.resolve(new JSObject().put("success", true));
    }
}
