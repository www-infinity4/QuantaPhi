package org.quantaphi.bubblesone;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.UUID;

public final class MainActivity extends Activity {
    private TextView status;
    private boolean requestedOverlay;
    private static final int MIC_REQUEST = 11, TERMUX_REQUEST = 12, FILE_REQUEST = 13;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        NavigationContrast.apply(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(36, 50, 36, 36);
        root.setBackgroundColor(0xfff8f5fc);
        TextView heading = new TextView(this);
        heading.setText("Bubbles One"); heading.setTextSize(30); heading.setTextColor(0xff45236c);
        root.addView(heading);
        TextView intro = new TextView(this);
        intro.setText("One setup. One floating Bubbles assistant. Your conversation stays available while you use other apps.\n\nTo bring in a video from your recorder, use that app's Share option and choose Bubbles One.");
        intro.setTextSize(17); intro.setPadding(0, 26, 0, 24);
        root.addView(intro);
        Button setup = new Button(this);
        setup.setText("Set up Bubbles");
        setup.setOnClickListener(v -> {
            getSharedPreferences("bubbles-one", MODE_PRIVATE).edit().putBoolean("enabled", true).apply();
            proceed();
        });
        root.addView(setup);
        status = new TextView(this); status.setTextSize(16); status.setPadding(0, 24, 0, 0);
        status.setText("Android will ask separately for microphone and display-over-apps access. These system permissions cannot be silently granted.");
        root.addView(status);
        setContentView(root);
        handleVideoShare(getIntent());
        handleOtherShare(getIntent());
        maybePick(getIntent());
        if (getSharedPreferences("bubbles-one", MODE_PRIVATE).getBoolean("enabled", false)) proceed();
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent); setIntent(intent); handleVideoShare(intent); handleOtherShare(intent); maybePick(intent);
    }
    @Override protected void onResume() {
        super.onResume();
        if (requestedOverlay && Settings.canDrawOverlays(this)) {
            requestedOverlay = false; proceed();
        }
    }
    private void proceed() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            status.setText("Allow Android microphone access to speak with Bubbles.");
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MIC_REQUEST);
            return;
        }
        if (!Settings.canDrawOverlays(this)) {
            status.setText("Allow Bubbles One to appear over other apps, then return here.");
            requestedOverlay = true;
            Intent setting = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName()));
            startActivity(setting);
            return;
        }
        // The app-level Setup action requests Termux's custom Android grant if installed.
        // The separate allow-external-apps switch belongs to Termux itself.
        if (TermuxBridge.installed(this) && checkSelfPermission("com.termux.permission.RUN_COMMAND")
                != PackageManager.PERMISSION_GRANTED
                && !getSharedPreferences("bubbles-one", MODE_PRIVATE).getBoolean("termux_grant_prompted", false)) {
            getSharedPreferences("bubbles-one", MODE_PRIVATE).edit().putBoolean("termux_grant_prompted", true).apply();
            requestPermissions(new String[]{"com.termux.permission.RUN_COMMAND"}, TERMUX_REQUEST);
            return;
        }
        Intent assistant = new Intent(this, AssistantService.class);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(assistant); else startService(assistant);
        status.setText("Bubbles is ready. Tap its floating circle to chat. You can leave this screen.");
    }
    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == TERMUX_REQUEST) { proceed(); return; }
        if (requestCode == MIC_REQUEST) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) proceed();
            else status.setText("Microphone access was not granted. Bubbles will not start without it.");
        }
    }
    private void maybePick(Intent intent) {
        if (intent != null && intent.getBooleanExtra("pick_file", false)) {
            intent.removeExtra("pick_file");
            Intent chooser = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
            startActivityForResult(chooser, FILE_REQUEST);
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == FILE_REQUEST && result == RESULT_OK && data != null && data.getData() != null) {
            FileInbox.importFile(this, data.getData(), status);
        }
    }
    private void handleOtherShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())
                || intent.getType() == null || intent.getType().startsWith("video/")) return;
        Uri uri = Build.VERSION.SDK_INT >= 33
            ? intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class)
            : (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (uri != null) FileInbox.importFile(this, uri, status);
        else if ("text/plain".equals(intent.getType())) {
            String shared = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (shared != null) {
                LocalNotebook notes = new LocalNotebook(this);
                try { notes.add("shared", shared.substring(0, Math.min(2500, shared.length()))); }
                finally { notes.close(); }
                AssistantService.refreshIntegration("Text shared into Bubbles.");
            }
        }
    }
    private void handleVideoShare(Intent intent) {
        if (!Intent.ACTION_SEND.equals(intent.getAction()) || intent.getType() == null
                || !intent.getType().startsWith("video/")) return;
        Uri source;
        if (Build.VERSION.SDK_INT >= 33) source = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        else source = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (source == null || !"content".equals(source.getScheme())) return;
        status.setText("Importing the finished video shared by your recorder…");
        // An ACTION_SEND Uri carries the sender's temporary read grant. Never
        // scan arbitrary apps' live private files or claim an active capture.
        new Thread(() -> {
            try {
                File dir = new File(getFilesDir(), "shared-videos");
                if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Cannot create video folder");
                File destination = new File(dir, "recorder-" + UUID.randomUUID() + ".mp4");
                long total = 0L;
                try (InputStream in = getContentResolver().openInputStream(source);
                     FileOutputStream out = new FileOutputStream(destination)) {
                    if (in == null) throw new IllegalStateException("Video is unavailable");
                    byte[] buf = new byte[65536]; int n;
                    while ((n = in.read(buf)) != -1) {
                        total += n;
                        if (total > 512L * 1024L * 1024L) throw new IllegalStateException("Video exceeds 512 MB");
                        out.write(buf, 0, n);
                    }
                } catch (Exception error) { destination.delete(); throw error; }
                if (total == 0) { destination.delete(); throw new IllegalStateException("Shared video was empty"); }
                new LocalNotebook(this).add("video", "Recorder video received: " + destination.getName() + " (" + total + " bytes). This is a saved file, not live screen access.");
                runOnUiThread(() -> status.setText("Video imported into private Bubbles storage. This does not mean the video has been analyzed."));
            } catch (Exception error) {
                runOnUiThread(() -> status.setText("The recorder's video could not be imported: " + error.getClass().getSimpleName()));
            }
        }, "Bubbles-video-import").start();
    }
}
