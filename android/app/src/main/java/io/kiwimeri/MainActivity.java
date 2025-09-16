package io.kiwimeri;

import static java.text.MessageFormat.format;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;

import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BetterFilesystemPlugin.class);
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);

        Logger.debug("Build.VERSION.SDK_INT = " + Build.VERSION.SDK_INT);
        ViewCompat.setOnApplyWindowInsetsListener(this.getBridge().getWebView(), (v, windowInsets) -> {
            try {
                for (int type : List.of(
                        WindowInsetsCompat.Type.systemBars(),
                        WindowInsetsCompat.Type.captionBar(),
                        WindowInsetsCompat.Type.ime(),
                        WindowInsetsCompat.Type.displayCutout(),
                        WindowInsetsCompat.Type.navigationBars(),
                        WindowInsetsCompat.Type.statusBars()
                        )
                ) {
                    Logger.debug("type = " + type);
                    Insets insets = windowInsets.getInsets(type);
                    Logger.debug("insets = " + insets);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        Logger.debug("platform insets = " + insets.toPlatformInsets());
                    }
                }
                Logger.debug(getResources().getDisplayMetrics().toString());

            } catch (Exception e) {
                Logger.error("Error setting insets", e);
            }
            return WindowInsetsCompat.CONSUMED;
        });

    }
}
