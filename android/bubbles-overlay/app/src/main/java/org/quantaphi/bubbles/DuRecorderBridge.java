package org.quantaphi.bubbles;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.widget.Toast;
import java.util.function.Consumer;

/** Controls the installed DU Recorder without faking Android permission or recording state. */
final class DuRecorderBridge {
    static final String PACKAGE = "com.duapps.recorder";
    private DuRecorderBridge() {}
    static boolean installed(Context context) {
        return context.getPackageManager().getLaunchIntentForPackage(PACKAGE) != null;
    }
    static boolean recordingVerified(Context context) {
        return BrainNotes.prefs(context).getBoolean("du_recorder_verified", false);
    }
    static void request(Context context, String action, Handler main) {
        request(context, action, main, null);
    }
    static void request(Context context, String action, Handler main, Consumer<String> feedback) {
        if (!"start".equals(action) && !"stop".equals(action) && !"toggle".equals(action))
            throw new IllegalArgumentException("Unsupported DU control");
        if (!installed(context)) {
            update(context, "unavailable", "DU Recorder is not installed.", false);
            return;
        }
        if (!"stop".equals(action) && BrainNotes.prefs(context).getBoolean("capture_active", false)) {
            update(context, "blocked", "Finish current screen capture first.", false);
            return;
        }
        if (!"stop".equals(action) && MediaNotes.active(context)) {
            update(context, "blocked", "Stop phone audio capture before recording.", false);
            return;
        }
        if ("start".equals(action) && recordingVerified(context)) {
            if (feedback != null) feedback.accept("recording");
            return;
        }
        if ("toggle".equals(action)) action = recordingVerified(context) ? "stop" : "start";
        final String wanted = action;
        update(context, wanted.equals("start") ? "starting" : "stopping",
            wanted.equals("start") ? "Starting…" : "Stopping…", false);
        String tapped = BrainLearningService.tapDuRecorderControl(wanted);
        if (tapped.startsWith("DU tap sent:")) {
            verify(context, wanted, main, feedback, 0);
            return;
        }
        if ("stop".equals(wanted)) {
            update(context, "needs_tap", "Tap DU's Stop control.", false);
            return;
        }
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(PACKAGE);
        if (launch == null) {
            update(context, "unavailable", "DU isn't ready.", false);
            return;
        }
        try {
            context.startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP));
            main.postDelayed(() -> {
                String result = BrainLearningService.tapDuRecorderControl(wanted);
                if (result.startsWith("DU tap sent:")) verify(context, wanted, main, feedback, 0);
                else update(context, "needs_tap", "Tap DU to record.", false);
            }, 650L);
        } catch (RuntimeException error) {
            update(context, "unavailable", "DU couldn't open.", false);
        }
    }
    private static void verify(Context context, String wanted, Handler main, Consumer<String> feedback, int attempt) {
        main.postDelayed(() -> {
            boolean visible = BrainLearningService.duControlVisible("start".equals(wanted) ? "stop" : "start");
            if (visible) {
                boolean recording = "start".equals(wanted);
                update(context, recording ? "recording" : "stopped",
                    recording ? "Recording." : "Stopped.", recording);
                if (feedback != null) feedback.accept(recording ? "recording" : "stopped");
            } else if (attempt < 5) {
                verify(context, wanted, main, feedback, attempt + 1);
            } else update(context, "needs_tap",
                "start".equals(wanted) ? "Check DU's recording control." : "Check DU's Stop control.", false);
        }, 400L);
    }
    private static void update(Context context, String phase, String message, boolean verified) {
        BrainNotes.prefs(context).edit()
            .putString("du_recorder_phase", phase)
            .putString("du_recorder_state", message)
            .putBoolean("du_recorder_verified", verified).apply();
        if ("blocked".equals(phase) || "unavailable".equals(phase))
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
    }
}
