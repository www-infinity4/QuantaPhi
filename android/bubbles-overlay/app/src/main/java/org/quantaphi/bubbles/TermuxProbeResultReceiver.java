package org.quantaphi.bubbles;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

/** Reads Termux's actual result bundle, never confuses dispatch with success. */
public final class TermuxProbeResultReceiver extends BroadcastReceiver {
    private static String limited(String value) {
        if (value == null) return "";
        // The probe contains no credentials; redact token-like output defensively.
        String masked = value.replaceAll("(?i)(?:ghp_|github_pat_|sk-)[a-zA-Z0-9_-]{10,}", "[redacted]");
        return masked.substring(0, Math.min(masked.length(), 1100));
    }
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !TermuxProbe.RESULT_ACTION.equals(intent.getAction())) return;
        int id = intent.getIntExtra("probe_request_id", 0);
        Bundle output = intent.getBundleExtra("result");
        if (output == null) {
            TermuxProbe.saveResult(context, id, "no_callback_result",
                "Termux callback had no result bundle; Python/cleanup not verified.");
            return;
        }
        int code = output.getInt("exitCode", -999);
        int serviceError = output.getInt("err", -999);
        String stdout = limited(output.getString("stdout", ""));
        String stderr = limited(output.getString("stderr", ""));
        String error = limited(output.getString("errmsg", ""));
        boolean cleaned = stdout.contains("cleanup=verified_job_directory_removed");
        boolean success = code == 0 && serviceError == -1 && cleaned
            && stdout.contains("Bubbles Python works: 2 + 2 = 4");
        String detail = "exit=" + code + "; service=" + serviceError
            + "; cleanup=" + (cleaned ? "confirmed" : "not_verified")
            + (stdout.isEmpty() ? "" : "\n" + stdout)
            + (stderr.isEmpty() ? "" : "\nstderr: " + stderr)
            + (error.isEmpty() ? "" : "\nTermux: " + error);
        TermuxProbe.saveResult(context, id, success ? "passed" : "failed", detail);
    }
}
