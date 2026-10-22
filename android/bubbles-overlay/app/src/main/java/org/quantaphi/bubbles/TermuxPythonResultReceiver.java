package org.quantaphi.bubbles;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

/** Only a real Termux callback can mark the fixed diagnostic as executed. */
public final class TermuxPythonResultReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !TermuxPythonProbe.RESULT_ACTION.equals(intent.getAction())) return;
        Bundle result = intent.getBundleExtra("result");
        String receipt;
        if (result == null) {
            receipt = "Termux returned no Python execution receipt. Not confirmed.";
        } else {
            int exit = result.getInt("exitCode", -999);
            int serviceError = result.getInt("err", -999);
            String output = result.getString("stdout", "");
            String error = result.getString("stderr", "");
            boolean ran = exit == 0 && serviceError == -1
                    && output.contains("BUBBLES_PROBE_OK=True");
            boolean cleaned = output.contains("TEMP_REMOVED=True");
            String version = "unavailable", free = "unavailable";
            for (String line : output.split("\\r?\\n")) {
                if (line.startsWith("PYTHON_VERSION=")) version = line.substring("PYTHON_VERSION=".length());
                if (line.startsWith("TERMUX_FREE_BYTES=")) free = line.substring("TERMUX_FREE_BYTES=".length());
            }
            receipt = "Bubbles → Termux Python: " + (ran && cleaned ? "verified" : "not verified")
                    + ". Exit code " + exit + ", Termux service code " + serviceError
                    + ", Python " + version + ", free bytes " + free
                    + ", temporary folder removed " + (cleaned ? "yes" : "not confirmed")
                    + (error.isEmpty() ? "" : ". Error: " + error.substring(0, Math.min(error.length(), 180)));
        }
        BrainNotes.prefs(context).edit().putString("termux_python_receipt", receipt).apply();
        BubblesService.reportTermuxPythonReceipt(context, receipt);
    }
}
