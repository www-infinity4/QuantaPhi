package org.quantaphi.bubbles;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Compatibility entry point for notifications; opens the retained website chat.
 * Local legacy history is preserved but no longer rendered as another chat.
 * OpenAI OAuth tokens are never exposed in the chat UI or sent to our Worker.
 */
public final class OracleChatActivity extends Activity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Notification and legacy entry points open the same retained website
        // window as the orb. No second native composer or transcript UI.
        if (BubblesService.isSessionRunning()) {
            startService(new Intent(this, BubblesService.class).setAction(BubblesService.ACTION_OPEN_CHAT));
        } else {
            startActivity(new Intent(this, MainActivity.class));
        }
        finish();
    }
    /**
     * Persistent, bounded local transcript; nothing is uploaded solely to
     * populate the window. Do not put tokens, passwords, or wallet IDs here.
     */
    public static synchronized void append(Context context, String role, String message) {
        if (message == null || message.isEmpty()) return;
        if (!"You".equals(role) && !"Oracle".equals(role)) return;
        try {
            JSONArray history = readHistory(context);
            history.put(new JSONObject().put("role", role)
                    .put("text", message.substring(0, Math.min(2200, message.length()))));
            JSONArray bounded = new JSONArray();
            for (int i = Math.max(0, history.length() - 30); i < history.length(); i++)
                bounded.put(history.getJSONObject(i));
            BrainNotes.prefs(context).edit().putString("oracle_chat_history", bounded.toString()).apply();
        } catch (Exception ignored) { /* An invalid local history must not break voice replies. */ }
    }
    private static JSONArray readHistory(Context context) {
        try {
            return new JSONArray(BrainNotes.prefs(context).getString("oracle_chat_history", "[]"));
        } catch (Exception ignored) {return new JSONArray();}
    }
    static String renderHistory(Context context) {
        JSONArray data = readHistory(context);
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < data.length(); i++) {
            JSONObject item = data.optJSONObject(i);
            if (item == null) continue;
            out.append(item.optString("role", "Oracle")).append("\n")
                    .append(item.optString("text", "")).append("\n\n");
        }
        return out.length() == 0 ? "Type a message below or talk to Bubbles.\nTap Stop talking whenever you want silence." : out.toString();
    }
}
