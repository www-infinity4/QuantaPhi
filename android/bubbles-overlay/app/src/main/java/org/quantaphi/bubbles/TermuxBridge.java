package org.quantaphi.bubbles;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

/** Documented Termux RUN_COMMAND IPC. Runs only after the native owner confirmation. */
final class TermuxBridge {
    private static final String PACKAGE = "com.termux";
    private static final String BIN = "/data/data/com.termux/files/usr/bin/";
    private static final String HOME = "/data/data/com.termux/files/home";
    private static final AtomicInteger NEXT = new AtomicInteger(2000);
    private TermuxBridge() {}

    static boolean installed(Context context) {
        return context.getPackageManager().getLaunchIntentForPackage(PACKAGE) != null;
    }

    static boolean permitted(Context context) {
        return context.checkSelfPermission("com.termux.permission.RUN_COMMAND") == PackageManager.PERMISSION_GRANTED;
    }

    /** A dispatch receipt does NOT establish completion; TermuxResultReceiver reports completion. */
    static String run(Context context, String requestId, String language, String code) {
        if (!requestId.matches("[0-9a-fA-F-]{36}")) return "Invalid command identifier; nothing was executed.";
        if (!installed(context)) return "Termux is not installed on this phone. No code was executed.";
        if (!permitted(context)) return "Android has not granted Bubbles the one-time Termux RUN_COMMAND permission. Open Bubbles settings and choose Allow Termux commands.";
        String name = language == null ? "" : language.trim().toLowerCase(Locale.ROOT);
        String executable, flag;
        switch (name) {
            case "python": case "python3": executable = "python"; flag = "-c"; break;
            case "javascript": case "node": case "js": executable = "node"; flag = "-e"; break;
            case "bash": case "shell": executable = "bash"; flag = "-c"; break;
            case "ruby": executable = "ruby"; flag = "-e"; break;
            case "php": executable = "php"; flag = "-r"; break;
            case "perl": executable = "perl"; flag = "-e"; break;
            case "lua": executable = "lua"; flag = "-e"; break;
            default: return "Unsupported language. Use python, javascript, bash, ruby, php, perl or lua.";
        }
        if (code == null || code.trim().isEmpty() || code.length() > 7000)
            return "Code must contain 1 to 7000 characters.";
        int id = NEXT.incrementAndGet();
        Intent callback = new Intent(context, TermuxResultReceiver.class)
            .setAction(TermuxResultReceiver.ACTION).putExtra("bubbles_request_id", requestId)
            .putExtra("bubbles_language", name);
        PendingIntent pending = PendingIntent.getBroadcast(context, id, callback,
            PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
        Intent command = new Intent("com.termux.RUN_COMMAND");
        command.setClassName(PACKAGE, "com.termux.app.RunCommandService");
        command.putExtra("com.termux.RUN_COMMAND_PATH", BIN + executable);
        command.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{flag, code});
        command.putExtra("com.termux.RUN_COMMAND_WORKDIR", HOME);
        command.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
        command.putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "Bubbles owner-approved " + name);
        command.putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", pending);
        try {
            context.startService(command);
            return null; // Dispatched; wait for callback. Never invent stdout/exit status.
        } catch (SecurityException error) {
            pending.cancel();
            return "Termux rejected external commands. Enable allow-external-apps=true in ~/.termux/termux.properties and grant Bubbles the Android Termux permission.";
        } catch (RuntimeException error) {
            pending.cancel();
            return "Termux did not accept the command (" + error.getClass().getSimpleName() + "). Open Termux, verify its settings, and retry.";
        }
    }
}
