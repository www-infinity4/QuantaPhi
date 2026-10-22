package org.quantaphi.bubbles;

import android.content.Context;
import android.util.AtomicFile;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

/** Owner-device-only crash recovery for the currently visible Bubbles chat.
 * No JavaScript bridge is installed: the native side pulls data only from the
 * first-party, HTTPS /bubbles.html WebView after a trusted origin check.
 * Wallet tokens, browser cookies, imported archives and tool payloads are
 * never placed in this journal. The user can turn conversation history off.
 */
final class NativeChatJournal {
    private static final int MAX_BYTES = 160 * 1024;
    private static final int MAX_MESSAGES = 60;
    private final AtomicFile journal;

    NativeChatJournal(Context context) {
        journal = new AtomicFile(new File(context.getFilesDir(), "bubbles-recent-chat.json"));
    }
    synchronized String read() {
        try (FileInputStream stream = journal.openRead()) {
            byte[] bytes = new byte[MAX_BYTES + 1];
            int total = 0, n;
            while (total < bytes.length
                    && (n = stream.read(bytes, total, bytes.length - total)) != -1) total += n;
            if (total > MAX_BYTES) return "";
            String candidate = new String(bytes, 0, total, StandardCharsets.UTF_8);
            return valid(candidate) ? candidate : "";
        } catch (Exception ignored) { return ""; }
    }
    synchronized void write(String snapshot) throws Exception {
        if (!valid(snapshot)) throw new IllegalArgumentException("Invalid Bubbles history snapshot");
        FileOutputStream output = null;
        try {
            output = journal.startWrite();
            output.write(snapshot.getBytes(StandardCharsets.UTF_8));
            journal.finishWrite(output);
        } catch (Exception error) {
            if (output != null) journal.failWrite(output);
            throw error;
        }
    }
    synchronized void clear() {
        journal.delete();
    }
    static boolean valid(String snapshot) {
        if (snapshot == null || snapshot.isEmpty()
                || snapshot.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) return false;
        try {
            JSONObject data = new JSONObject(snapshot);
            String thread = data.optString("thread", "");
            if (!thread.matches("[A-Za-z0-9_-]{10,80}")) return false;
            JSONArray messages = data.optJSONArray("messages");
            if (messages == null || messages.length() > MAX_MESSAGES) return false;
            for (int i = 0; i < messages.length(); i++) {
                JSONObject message = messages.optJSONObject(i);
                if (message == null || !message.optString("id", "").matches("[a-zA-Z0-9_-]{8,100}")
                        || !("user".equals(message.optString("role")) || "assistant".equals(message.optString("role")))
                        || message.optString("text", "").length() > 2200
                        || message.optString("text", "").trim().isEmpty()) return false;
            }
            return true;
        } catch (Exception ignored) { return false; }
    }
}
