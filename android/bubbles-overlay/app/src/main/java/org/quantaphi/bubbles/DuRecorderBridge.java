package org.quantaphi.bubbles;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.widget.Toast;

/**
 * User-facing handoff to the already-installed original DU Recorder.
 * DU has no verified public recording-control API; no invented broadcasts,
 * binder calls, package-private permissions or reusable MediaProjection grants.
 * Accessible controls are tapped only in verified DU windows if Android
 * Accessibility has been explicitly enabled by the owner.
 */
final class DuRecorderBridge {
    static final String PACKAGE = "com.duapps.recorder";
    private DuRecorderBridge() {}

    static boolean installed(Context context) {
        return context.getPackageManager().getLaunchIntentForPackage(PACKAGE) != null;
    }

    static void request(Context context, String action, Handler main) {
        if (!"start".equals(action) && !"stop".equals(action) && !"toggle".equals(action))
            throw new IllegalArgumentException("Unsupported DU control");
        if (!installed(context)) {
            report(context, "Original DU Recorder is not installed/visible to Bubbles. No recording started.");
            return;
        }
        if (("start".equals(action) || "toggle".equals(action))
                && BrainNotes.prefs(context).getBoolean("capture_active", false)) {
            report(context, "Bubbles capture is already active. Stop and save that session before opening DU Recorder.");
            return;
        }
        // Android does not support sharing a projection approval with a different
        // recorder. Avoid simultaneous projection sessions disrupting both apps.
        if (!"stop".equals(action) && MediaNotes.active(context)) {
            report(context, "Stop Bubbles phone-audio listening before starting DU Recorder; Android capture sessions can conflict.");
            return;
        }
        String current = BrainLearningService.tapDuRecorderControl(action);
        if (current.startsWith("DU tap sent:")) {
            report(context, current);
            return;
        }
        if ("stop".equals(action)) {
            report(context, "DU stop button not accessible. Open DU Recorder's floating control to stop; Bubbles did not stop it.");
            return;
        }
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(PACKAGE);
        if (launch == null) {
            report(context, "DU Recorder launch activity unavailable; no recording started.");
            return;
        }
        try {
            context.startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP));
            report(context, "DU Recorder opened; looking for its visible recording control.");
            main.postDelayed(() -> {
                String after = BrainLearningService.tapDuRecorderControl(action);
                report(context, after.startsWith("DU tap sent:")
                    ? after : "DU Recorder opened. Its floating Start/Stop button is still needed; automatic control was not verified.");
            }, 700L);
        } catch (RuntimeException error) {
            report(context, "Could not open DU Recorder: " + error.getClass().getSimpleName());
        }
    }

    static void report(Context context, String text) {
        BrainNotes.prefs(context).edit()
            .putString("du_recorder_state", text)
            .putString("capture_state", text).apply();
        Toast.makeText(context, text, Toast.LENGTH_LONG).show();
    }
}
