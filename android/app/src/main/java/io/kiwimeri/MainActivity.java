package io.kiwimeri;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BetterFilesystemPlugin.class);
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);

        ViewCompat.setOnApplyWindowInsetsListener(this.getBridge().getWebView(), (v, windowInsets) -> {
            if (Build.VERSION.SDK_INT < 35) {
                try {
                    Insets insets = getDeviceInsets(windowInsets, this);
                    String js =
                            "document.documentElement.style.setProperty('--safe-area-inset-top', '" + insets.top + "px');" +
                                    "document.documentElement.style.setProperty('--safe-area-inset-bottom', '" + insets.bottom + "px');" +
                                    "document.documentElement.style.setProperty('--safe-area-inset-left', '" + insets.left + "px');" +
                                    "document.documentElement.style.setProperty('--safe-area-inset-right', '" + insets.right + "px');";
                    bridge.getWebView().evaluateJavascript(js, null);
                } catch (Exception e) {
                    Logger.error("Error setting insets", e);
                }
            }
            return WindowInsetsCompat.CONSUMED;
        });

    }

    public Insets getDeviceInsets(WindowInsetsCompat windowInsets, AppCompatActivity activity) {
        try {
            Insets insets = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            float density = activity.getResources().getDisplayMetrics().density;;
            int topInset = (int) (insets.top / density);
            int bottomInset = (int) (insets.bottom / density);
            int leftInset = (int) (insets.left / density);
            int rightInset = (int) (insets.right / density);
            return Insets.of(leftInset, topInset, rightInset, bottomInset);
        } catch (Exception e) {
            Logger.error("Error getting insets", e);
            return Insets.of(0, 0, 0, 0);
        }
    }

}
