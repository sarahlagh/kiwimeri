package io.kiwimeri;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BetterFilesystemPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
