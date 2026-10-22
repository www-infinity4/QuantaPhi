package org.quantaphi.bubbles;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import java.security.SecureRandom;

/**
 * A deliberately fixed, tiny Termux/Python readiness probe for the ORIGINAL Bubbles APK.
 * No downloaded scripts, shell, package installation, or arbitrary web-provided commands.
 * Explicitly addressed "Bubbles, test Python" is the authorization for this probe only.
 */
final class TermuxPythonProbe {
    static final String RESULT_ACTION = "org.quantaphi.bubbles.TERMUX_PYTHON_RESULT";
    private static final String PACKAGE = "com.termux";
    private static final String PERMISSION = "com.termux.permission.RUN_COMMAND";
    private static final String PREFIX = "/data/data/com.termux/files/usr/bin/";
    private static final String HOME = "/data/data/com.termux/files/home";

    private TermuxPythonProbe() {}

    static boolean isRequest(String words) {
        return words != null && words.trim().matches(
                "(?i)^(?:please\\s+)?(?:test|check)\\s+(?:my\\s+)?python(?:\\s+in\\s+termux)?[.!?]*$");
    }

    static String request(Context context) {
        if (context.getPackageManager().getLaunchIntentForPackage(PACKAGE) == null)
            return "Termux is not installed or cannot be opened. Bubbles did not run Python.";
        if (context.checkSelfPermission(PERMISSION) != PackageManager.PERMISSION_GRANTED)
            return "Termux command permission is blocked. In Android Settings, open Bubbles app permissions, then Additional permissions, and allow Run commands in Termux environment.";
        // This script is immutable. TemporaryDirectory removes only its own scratch folder
        // on normal completion, including after a Python exception inside the context block.
        // No broad deletion, external downloads, package installs or arbitrary arguments.
        String script =
                "import os, pathlib, shutil, sys, tempfile\\n" +
                "home = os.path.expanduser('~')\\n" +
                "print('PYTHON_VERSION=' + sys.version.split()[0])\\n" +
                "print('TERMUX_FREE_BYTES=' + str(shutil.disk_usage(home).free))\\n" +
                "with tempfile.TemporaryDirectory(prefix='bubbles-probe-') as scratch:\\n" +
                "    p = pathlib.Path(scratch) / 'probe.txt'\\n" +
                "    p.write_text('OK')\\n" +
                "    print('BUBBLES_PROBE_OK=' + str(p.read_text() == 'OK'))\\n" +
                "print('TEMP_REMOVED=' + str(not os.path.exists(scratch)))\\n";
        int id = new SecureRandom().nextInt(1_000_000_000);
        Intent response = new Intent(context, TermuxPythonResultReceiver.class)
                .setAction(RESULT_ACTION).putExtra("probe_id", id);
        PendingIntent callback = PendingIntent.getBroadcast(context, id, response,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_CANCEL_CURRENT |
                (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
        Intent command = new Intent("com.termux.RUN_COMMAND");
        command.setClassName(PACKAGE, "com.termux.app.RunCommandService");
        command.putExtra("com.termux.RUN_COMMAND_PATH", PREFIX + "python");
        command.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"-B", "-c", script});
        command.putExtra("com.termux.RUN_COMMAND_WORKDIR", HOME);
        command.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
        command.putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "Bubbles Python readiness test");
        command.putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", callback);
        try {
            context.startService(command);
            return "Bubbles sent the Python test to Termux. Awaiting its real exit code and cleanup receipt.";
        } catch (SecurityException blocked) {
            callback.cancel();
            return "Termux refused command access. Set allow-external-apps=true in ~/.termux/termux.properties and grant Bubbles the additional Android permission.";
        } catch (RuntimeException error) {
            callback.cancel();
            return "Termux could not start the Python test; no successful execution was reported.";
        }
    }
}
