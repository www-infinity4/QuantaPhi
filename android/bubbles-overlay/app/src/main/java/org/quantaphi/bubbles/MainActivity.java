package org.quantaphi.bubbles;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final int OVERLAY_REQUEST = 61;
    private static final int PERMISSIONS_REQUEST = 62;
    private TextView state;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(38, 48, 38, 28);
        layout.setBackgroundColor(Color.rgb(17, 31, 57));

        TextView title = new TextView(this);
        title.setText("Bubbles AI");
        title.setTextColor(Color.WHITE);
        title.setTypeface(null, Typeface.BOLD);
        title.setTextSize(31);
        layout.addView(title);

        TextView copy = new TextView(this);
        copy.setText("A floating voice companion, available while other apps are open.\n\nAllow the microphone and the Android overlay permission once. Bubbles then listens for its name—no push-to-talk call button.\n\nYou will see an ongoing microphone notification. Say “Bubbles go quiet” or long-press the orb to mute. Tap the orb to reconnect.");
        copy.setTextColor(Color.rgb(202, 242, 235));
        copy.setTextSize(16);
        copy.setPadding(0, 25, 0, 25);
        layout.addView(copy);

        Button connect = new Button(this);
        connect.setText("Enable the floating Bubbles assistant");
        connect.setOnClickListener(view -> checkAndStart());
        layout.addView(connect);

        Button stop = new Button(this);
        stop.setText("Stop Bubbles and release the microphone");
        stop.setOnClickListener(view -> {
            Intent intent = new Intent(this, BubblesService.class);
            intent.setAction(BubblesService.ACTION_STOP);
            startService(intent);
            state.setText("Bubbles stopped; no microphone session is active.");
        });
        layout.addView(stop);

        state = new TextView(this);
        state.setTextColor(Color.WHITE);
        state.setTextSize(14);
        state.setGravity(Gravity.START);
        state.setPadding(0, 20, 0, 0);
        state.setText("Not connected. Permissions are never bypassed.");
        layout.addView(state);

        setContentView(layout);
    }

    private void checkAndStart() {
        if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(this)) {
            state.setText("Approve 'Display over other apps' in Android Settings.");
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, OVERLAY_REQUEST);
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSIONS_REQUEST);
            return;
        }
        // Notifications are requested independently on Android 13+; a service
        // remains user-visible through the Android foreground task manager.
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSIONS_REQUEST);
            return;
        }
        try {
            Intent intent = new Intent(this, BubblesService.class);
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent);
            else startService(intent);
            state.setText("Bubbles started. Say “Bubbles” and your request. The bubble remains visible above other apps.");
        } catch (Exception error) {
            state.setText("Android could not start the microphone service: " + error.getClass().getSimpleName());
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_REQUEST) {
            if (Build.VERSION.SDK_INT >= 23 && Settings.canDrawOverlays(this)) checkAndStart();
            else state.setText("Overlay permission was not granted. No assistant was started.");
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != PERMISSIONS_REQUEST) return;
        for (int result : results) {
            if (result != PackageManager.PERMISSION_GRANTED) {
                state.setText("Permission not granted. Bubbles did not begin microphone capture.");
                return;
            }
        }
        checkAndStart();
    }
}
