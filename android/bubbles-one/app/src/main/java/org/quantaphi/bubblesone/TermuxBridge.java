package org.quantaphi.bubblesone;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

/** Termux's documented RUN_COMMAND API; no shell impersonation or private-file access. */
final class TermuxBridge {
    private static final String PACKAGE = "com.termux";
    private static final String BIN = "/data/data/com.termux/files/usr/bin/";
    private static final String HOME = "/data/data/com.termux/files/home";
    private static final AtomicInteger NEXT = new AtomicInteger(1100);
    private TermuxBridge() {}
    static boolean installed(Context context) {
        return context.getPackageManager().getLaunchIntentForPackage(PACKAGE) != null;
    }
    static String open(Context context) {
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(PACKAGE);
        if (launch == null) return "Termux is not installed. You can install its official current release first.";
        try {
            context.startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            return "Termux opened. This is its actual terminal, not a fake terminal inside Bubbles.";
        } catch (RuntimeException error) {
            return "Android could not open Termux.";
        }
    }
    static String run(Context context, String language, String code) {
        if (!installed(context)) return "Termux is not installed.";
        if (context.checkSelfPermission("com.termux.permission.RUN_COMMAND") != PackageManager.PERMISSION_GRANTED)
            return "Android has not granted Bubbles permission to run commands in Termux. Open Bubbles One app permissions and allow the additional Termux permission.";
        String name = language == null ? "" : language.trim().toLowerCase(Locale.US);
        String executable, flag;
        switch (name) {
            case "python": case "python3": executable = "python"; flag = "-c"; break;
            case "javascript": case "node": case "js": executable = "node"; flag = "-e"; break;
            case "bash": case "shell": case "sh": executable = "bash"; flag = "-c"; break;
            case "ruby": executable = "ruby"; flag = "-e"; break;
            case "php": executable = "php"; flag = "-r"; break;
            case "perl": executable = "perl"; flag = "-e"; break;
            case "lua": executable = "lua"; flag = "-e"; break;
            default: return "This language is not connected yet. Supported runners: Python, JavaScript, Bash, Ruby, PHP, Perl and Lua, when installed in Termux.";
        }
        if (code == null || code.trim().isEmpty() || code.length() > 7000) return "Code must contain 1–7000 characters.";
        int id = NEXT.incrementAndGet();
        Intent callback = new Intent(context, TermuxResultReceiver.class).setAction("org.quantaphi.bubblesone.TERMUX_RESULT");
        callback.putExtra("bubbles_command_id", id);
        callback.putExtra("bubbles_language", name);
        PendingIntent pending = PendingIntent.getBroadcast(context, id, callback,
                PendingIntent.FLAG_ONE_SHOT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0));
        Intent command = new Intent("com.termux.RUN_COMMAND");
        command.setClassName(PACKAGE, "com.termux.app.RunCommandService");
        command.putExtra("com.termux.RUN_COMMAND_PATH", BIN + executable);
        command.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{flag, code});
        command.putExtra("com.termux.RUN_COMMAND_WORKDIR", HOME);
        command.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
        command.putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "Bubbles approved " + name);
        command.putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", pending);
        try {
            context.startService(command);
            return "Sent your approved " + name + " request to Termux. Execution is not confirmed until Termux returns its output.";
        } catch (SecurityException error) {
            pending.cancel();
            return "Termux did not authorize this app. In Termux, enable allow-external-apps=true in ~/.termux/termux.properties and grant Android's Termux command permission to Bubbles.";
        } catch (RuntimeException error) {
            pending.cancel();
            return "Termux did not accept the command. Open Termux and check its external-app permission.";
        }
    }
}
