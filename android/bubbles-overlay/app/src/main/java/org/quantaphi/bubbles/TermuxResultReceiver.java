package org.quantaphi.bubbles;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

/** Termux's returned result is evidence; intent dispatch by itself is not. */
public final class TermuxResultReceiver extends BroadcastReceiver {
    static final String ACTION = "org.quantaphi.bubbles.TERMUX_RESULT";
    private static String safe(String value) {
        if (value == null) return "";
        String clean = value.replaceAll("(?i)(?:github_pat_|ghp_|sk-)[a-zA-Z0-9_\\-]{10,}", "[private token]")
            .replaceAll("(?i)authorization:\\s*bearer\\s+[^\\s]+", "Authorization: [private token]")
            .replaceAll("(?i)(?:api[_-]?key|token|secret)\\s*[=:]\\s*[^\\s]+", "credential=[private]");
        return clean.substring(0, Math.min(4000, clean.length()));
    }
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !ACTION.equals(intent.getAction())) return;
        String id = intent.getStringExtra("bubbles_request_id");
        if (id == null || !id.matches("[0-9a-fA-F-]{36}")) return;
        Bundle result = intent.getBundleExtra("result");
        String report;
        if (result == null) report = "Termux returned no execution evidence. Do not treat this as success.";
        else {
            int exit = result.getInt("exitCode", -999), err = result.getInt("err", -999);
            String out = safe(result.getString("stdout", ""));
            String stderr = safe(result.getString("stderr", ""));
            report = "Termux " + safe(intent.getStringExtra("bubbles_language"))
                + " completed: exit code " + exit + ", service code " + err
                + (out.isEmpty() ? "" : "\\nOutput:\\n" + out)
                + (stderr.isEmpty() ? "" : "\\nError output:\\n" + stderr)
                + (result.getString("errmsg", "").isEmpty() ? "" : "\\nTermux error: " + safe(result.getString("errmsg", "")));
        }
        BrainNotes.prefs(context).edit().putString("last_termux_receipt", report).apply();
        FloatingOracleWindow.onTermuxResult(id, report);
    }
}
