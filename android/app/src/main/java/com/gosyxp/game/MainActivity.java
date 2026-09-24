package com.gosyxp.game;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bridge.getWebView().getSettings().setJavaScriptEnabled(true);
        bridge.getWebView().getSettings().setDomStorageEnabled(true);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge == null || bridge.getWebView() == null) {
                    passBackToAndroid();
                    return;
                }
                bridge.getWebView().evaluateJavascript(
                    "window.blackoutHandleBack ? window.blackoutHandleBack() : false",
                    handled -> {
                        if (!"true".equals(handled)) passBackToAndroid();
                    }
                );
            }

            private void passBackToAndroid() {
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }
}
