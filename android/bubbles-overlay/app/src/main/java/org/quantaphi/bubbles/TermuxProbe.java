package org.quantaphi.bubbles;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import org.json.JSONObject;

/** Owner-confirmed, fixed, low-footprint Python diagnostic in the real Termux app.
 * Never runs generated Python, installs packages, or reads private phone data.
 */
final class TermuxProbe {
    static final String PERMISSION = "com.termux.permission.RUN_COMMAND";
    static final String RESULT_ACTION = "org.quantaphi.bubbles.TERMUX_PROBE_RESULT";
    private static final String PREFIX = "/data/data/com.termux/files/usr/bin/";
    private static final String HOME = "/data/data/com.termux/files/home";
    private static final long CALLBACK_DEADLINE_MS = 90000L;

    // The directory is unique to this run, private to Termux and removed by
    // name only. No broad recursive deletion, shared Downloads, or app data wipe.
    // If storage is already low, no temporary file or directory is created.
    static final String SCRIPT = String.join("\n",
        "set -u",
        "echo 'probe=termux-python-v1'",
        "if ! command -v python >/dev/null 2>&1; then echo 'python=not_installed'; exit 127; fi",
        "python --version 2>&1",
        // Reap only an old app-owned directory carrying our marker, and only
        // the two exact files this diagnostic creates. Never recurse through
        // projects, Downloads, credentials, or another application's files.
        "if [ -L \"$HOME/.cache\" ]; then echo 'cleanup=unsafe_cache_symlink'; exit 76; fi",
        "if [ -d \"$HOME/.cache\" ]; then",
        "  find \"$HOME/.cache\" -mindepth 1 -maxdepth 1 -type d -name 'bubbles-probe.????????' -mmin +90 | while IFS= read -r old; do",
        "    if [ -f \"$old/marker\" ] && [ ! -L \"$old/marker\" ] && [ \"$(cat \"$old/marker\")\" = 'bubbles-termux-v1' ]; then",
        "      if [ -f \"$old/probe.py\" ] && [ ! -L \"$old/probe.py\" ]; then rm -f \"$old/probe.py\"; fi",
        "      rm -f \"$old/marker\"",
        "      if rmdir \"$old\" 2>/dev/null; then echo 'cleanup=stale_probe_directory_removed'; else echo 'cleanup=stale_directory_not_empty'; fi",
        "    fi",
        "  done",
        "fi",
        "free_line=$(df -Pk \"$HOME\" 2>/dev/null | tail -n 1)",
        "set -- $free_line",
        "free_kib=${4:-}",
        "case \"$free_kib\" in ''|*[!0-9]*) echo 'storage=unknown'; exit 72;; esac",
        "echo \"free_kib=$free_kib\"",
        "if [ \"$free_kib\" -lt 16384 ]; then echo 'storage=low_no_files_created'; exit 73; fi",
        "umask 077",
        "mkdir -p \"$HOME/.cache\" || exit 71",
        "job=$(mktemp -d \"$HOME/.cache/bubbles-probe.XXXXXXXX\") || exit 71",
        "trap 'rm -f \"$job/probe.py\" \"$job/marker\"; rmdir \"$job\" 2>/dev/null || true' EXIT HUP INT TERM",
        "printf 'bubbles-termux-v1\\n' > \"$job/marker\" || exit 74",
        "printf 'print(\"Bubbles Python works: 2 + 2 =\", 2 + 2)\\n' > \"$job/probe.py\" || exit 74",
        "python \"$job/probe.py\"",
        "code=$?",
        "file_bytes_removed=$(wc -c < \"$job/probe.py\" 2>/dev/null || echo 0)",
        "rm -f \"$job/probe.py\" \"$job/marker\"",
        "rmdir \"$job\" || exit 75",
        "echo \"file_bytes_removed=$file_bytes_removed\"",
        "trap - EXIT HUP INT TERM",
        "echo 'cleanup=verified_job_directory_removed'",
        "exit \"$code\""
    );

    private TermuxProbe() {}
    static boolean installed(Context context) {
        return context.getPackageManager().getLaunchIntentForPackage("com.termux") != null;
    }
    static boolean permitted(Context context) {
        return context.checkSelfPermission(PERMISSION) == PackageManager.PERMISSION_GRANTED;
    }
    private static void record(Context context, String state, String detail, int requestId) {
        try {
            JSONObject receipt = new JSONObject()
                .put("id", requestId).put("state", state)
                .put("detail", detail).put("at", System.currentTimeMillis());
            BrainNotes.prefs(context).edit().putString("termux_probe_receipt", receipt.toString()).apply();
        } catch (Exception ignored) {}
    }
    static JSONObject receipt(Context context) {
        try {
            JSONObject value = new JSONObject(BrainNotes.prefs(context).getString("termux_probe_receipt", "{}"));
            if ("queued".equals(value.optString("state")) &&
                System.currentTimeMillis() - value.optLong("at") > CALLBACK_DEADLINE_MS) {
                record(context, "timed_out_unverified",
                    "No Termux callback arrived. Python execution and cleanup are unverified.", value.optInt("id", 0));
                value = new JSONObject(BrainNotes.prefs(context).getString("termux_probe_receipt", "{}"));
            }
            return value;
        } catch (Exception ignored) { return new JSONObject(); }
    }
    static String run(Context context) {
        if (!installed(context)) {
            record(context, "not_installed", "Termux is not visible or installed on this phone.", 0);
            return "Termux isn't installed or launchable. No test ran.";
        }
        if (!permitted(context)) {
            record(context, "permission_blocked",
                "Grant Bubbles 'Run commands in Termux environment' in Android Additional permissions.", 0);
            return "Bubbles does not have Android's Termux command permission. No test ran.";
        }
        JSONObject current = receipt(context);
        if ("queued".equals(current.optString("state")))
            return "A Python test was already sent. Waiting for Termux's real result.";
        // Only a freshly acknowledged Android owner dialog calls this method.
        int id = (int)(System.currentTimeMillis() & 0x7fffffff);
        Intent callback = new Intent(context, TermuxProbeResultReceiver.class).setAction(RESULT_ACTION);
        callback.putExtra("probe_request_id", id);
        PendingIntent pending = PendingIntent.getBroadcast(context, id, callback,
            PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
        Intent request = new Intent("com.termux.RUN_COMMAND");
        request.setClassName("com.termux", "com.termux.app.RunCommandService");
        request.putExtra("com.termux.RUN_COMMAND_PATH", PREFIX + "sh");
        request.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"-c", SCRIPT});
        request.putExtra("com.termux.RUN_COMMAND_WORKDIR", HOME);
        request.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
        request.putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "Bubbles owner-approved Python test");
        request.putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", pending);
        record(context, "queued", "Command sent; execution is not yet verified.", id);
        try {
            context.startService(request);
            return "Python diagnostic sent to Termux. Waiting for output and a cleanup receipt.";
        } catch (SecurityException error) {
            pending.cancel();
            record(context, "permission_blocked",
                "Termux denied external command. Set allow-external-apps=true in ~/.termux/termux.properties.", id);
            return "Termux blocked external commands. No test was confirmed.";
        } catch (RuntimeException error) {
            pending.cancel();
            record(context, "dispatch_failed", "Android did not dispatch the Termux command.", id);
            return "Android couldn't send the Python diagnostic to Termux.";
        }
    }
    static void saveResult(Context context, int id, String state, String detail) {
        JSONObject latest = receipt(context);
        if (id == 0 || id != latest.optInt("id") || !"queued".equals(latest.optString("state"))) return;
        record(context, state, detail, id);
    }
    static void cancel(Context context) {
        record(context, "owner_cancelled", "The owner did not approve the Python diagnostic.", 0);
    }
}
