package org.quantaphi.bubbles;

import android.app.Activity;
import android.os.Build;
import android.graphics.Color;
import android.view.View;
import android.view.Window;

/**
 * Force visible light system icons on a dark Android navigation/status strip.
 * The app owns its Activity bars, NOT Chrome, GitHub or X's external UI.
 */
public final class NavigationContrast {
    private NavigationContrast() {}
    public static void apply(Activity activity) {
        if (activity == null) return;
        final Window window = activity.getWindow();
        if (window == null) return;
        final int bar = Color.rgb(43, 30, 51);
        window.setNavigationBarColor(bar);
        window.setStatusBarColor(bar);
        View decor = window.getDecorView();
        if (decor != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            int flags = decor.getSystemUiVisibility();
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            decor.setSystemUiVisibility(flags);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
        }
    }
}
