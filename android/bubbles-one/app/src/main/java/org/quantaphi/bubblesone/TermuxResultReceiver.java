package org.quantaphi.bubblesone;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

/** Records real Termux completion/exit code, never labels dispatch as success. */
public final class TermuxResultReceiver extends BroadcastReceiver {
    private static String shorten(String value) {
        if (value == null) return "";
        String filtered = value.replaceAll("(?i)(?:github_pat_|ghp_|sk-)[a-zA-Z0-9_\\-]{10,}", "[private token]")
                .replaceAll("(?i)(?:authorization: bearer)\\s+[^\\s]+", "Authorization: [private token]");
        return filtered.substring(0, Math.min(filtered.length(), 5000));
    }
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !"org.quantaphi.bubblesone.TERMUX_RESULT".equals(intent.getAction())) return;
        Bundle result = intent.getBundleExtra("result");
        String language = intent.getStringExtra("bubbles_language");
        int id = intent.getIntExtra("bubbles_command_id", -1);
        String message;
        if (result == null) message = "Termux did not return execution evidence for request " + id + ".";
        else {
            int exit = result.getInt("exitCode", -999), err = result.getInt("err", -999);
            String stdout = shorten(result.getString("stdout", ""));
            String stderr = shorten(result.getString("stderr", ""));
            String error = shorten(result.getString("errmsg", ""));
            message = "Termux " + language + " result (" + id + "): exit " + exit + ", service code " + err
                    + (stdout.isEmpty() ? "" : "\nOutput:\n" + stdout)
                    + (stderr.isEmpty() ? "" : "\nError output:\n" + stderr)
                    + (error.isEmpty() ? "" : "\nService message: " + error);
        }
        LocalNotebook notes = new LocalNotebook(context);
        try { notes.add("tool", message); } finally { notes.close(); }
        AssistantService.refreshIntegration(message);
    }
}
