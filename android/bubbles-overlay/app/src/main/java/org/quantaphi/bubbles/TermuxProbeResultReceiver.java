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
        String kind = intent.getStringExtra("probe_kind");
        if (!"shell".equals(kind) && !"python".equals(kind)) return;
        Bundle output = intent.getBundleExtra("result");
        if (output == null) {
            TermuxProbe.saveResult(context, id, kind, "no_callback_result",
                "Termux callback had no result bundle; execution is unverified.");
            return;
        }
        int code = output.getInt("exitCode", -999);
        int serviceError = output.getInt("err", -999);
        String stdout = limited(output.getString("stdout", ""));
        String stderr = limited(output.getString("stderr", ""));
        String error = limited(output.getString("errmsg", ""));
        boolean cleaned = "python".equals(kind) && stdout.contains("cleanup=verified_job_directory_removed");
        boolean success = code == 0 && serviceError == -1 && (
            ("shell".equals(kind) && stdout.contains("probe=termux-shell-v1")
                && stdout.contains("termux=ok")) ||
            ("python".equals(kind) && cleaned
                && stdout.contains("Bubbles Python works: 2 + 2 = 4")));
        String detail = "exit=" + code + "; service=" + serviceError
            + "; cleanup=" + ("shell".equals(kind) ? "not_applicable" : cleaned ? "confirmed" : "not_verified")
            + (stdout.isEmpty() ? "" : "\n" + stdout)
            + (stderr.isEmpty() ? "" : "\nstderr: " + stderr)
            + (error.isEmpty() ? "" : "\nTermux: " + error);
        String state = success ? "passed" : "failed";
        String plain = success
            ? ("shell".equals(kind) ? "Termux shell command completed successfully. No Python was required."
                : "Python works in Termux. Its temporary files were removed.")
            : "The Termux " + kind + " check did not complete successfully.";
        if (!success && (error.contains("allow-external-apps") || stderr.contains("allow-external-apps"))) {
            state = "setup_required";
            plain = "Termux needs one-time permission for external app commands. No check was verified.";
        } else if (!success && "python".equals(kind) && (code == 127 || stdout.contains("python=not_installed"))) {
            state = "python_missing";
            plain = "Python is not available inside Termux. No package installation was attempted.";
        } else if (!success && "python".equals(kind) && (code == 73 || stdout.contains("storage=low_no_files_created"))) {
            state = "storage_low";
            plain = "Storage is too low for a temporary test file. Nothing was installed.";
        } else if (!success && "python".equals(kind) && !cleaned && code != -999) {
            state = "cleanup_unverified";
            plain = "The test did not prove that its temporary folder was removed.";
        }
        TermuxProbe.saveResult(context, id, kind, state, plain + "\nTechnical receipt: " + detail);
    }
}
