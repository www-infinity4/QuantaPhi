package org.quantaphi.bubbles;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/** Optional on-device text notes from the SAME microphone stream.
 * No second microphone, server upload, identity recognition, or silent activation.
 */
final class RoomNotes {
    static final String ENABLED = "room_notes_enabled";
    private static final String LOG = "room_notes_last30";
    private RoomNotes() {}

    static boolean enabled(Context context) {
        return BrainNotes.prefs(context).getBoolean(ENABLED, false);
    }

    static void setEnabled(Context context, boolean on) {
        BrainNotes.prefs(context).edit().putBoolean(ENABLED, on)
            .putBoolean(RoomContextFusion.ENABLED, on && BrainNotes.prefs(context).getBoolean(RoomContextFusion.ENABLED, false)).apply();
    }

    static synchronized void add(Context context, String transcript) {
        if (!enabled(context) || transcript == null) return;
        String text = transcript.replaceAll("\\s+", " ").trim();
        if (text.isEmpty()) return;
        if (text.length() > 220) text = text.substring(0, 220);
        SharedPreferences prefs = BrainNotes.prefs(context);
        JSONArray next = new JSONArray();
        try {
            JSONArray old = new JSONArray(prefs.getString(LOG, "[]"));
            int first = Math.max(0, old.length() - 29);
            for (int i = first; i < old.length(); i++) {
                JSONObject item = old.optJSONObject(i);
                if (item != null) next.put(item);
            }
        } catch (Exception ignored) { /* Corrupted notes never leave the device. */ }
        JSONObject entry = new JSONObject();
        try { entry.put("at", System.currentTimeMillis()); entry.put("text", text); }
        catch (Exception ignored) { return; }
        next.put(entry);
        prefs.edit().putString(LOG, next.toString()).apply();
    }

    static synchronized String recent(Context context) {
        StringBuilder out = new StringBuilder();
        try {
            JSONArray arr = new JSONArray(BrainNotes.prefs(context).getString(LOG, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item != null) out.append(new java.util.Date(item.optLong("at", 0))).append(" — ")
                    .append(item.optString("text", "")).append('\n');
            }
        } catch (Exception ignored) { return "Room notes cannot be read."; }
        return out.length() == 0 ? "No room transcripts saved." : out.toString();
    }

    /** Only fresh entries are candidates for the optional third context lane. */
    static synchronized java.util.List<String> freshCandidateTexts(Context context, long nowMs, long maxAgeMs) {
        java.util.ArrayList<String> fresh = new java.util.ArrayList<>();
        try {
            JSONArray arr = new JSONArray(BrainNotes.prefs(context).getString(LOG, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item == null) continue;
                long age = nowMs - item.optLong("at", 0L);
                if (age < 0 || age > maxAgeMs) continue;
                String words = item.optString("text", "").trim();
                if (!words.isEmpty()) fresh.add(words);
            }
        } catch (Exception ignored) { /* Corrupt local notes grant no context. */ }
        return fresh;
    }

    static void clear(Context context) {
        BrainNotes.prefs(context).edit().remove(LOG).apply();
    }
}
