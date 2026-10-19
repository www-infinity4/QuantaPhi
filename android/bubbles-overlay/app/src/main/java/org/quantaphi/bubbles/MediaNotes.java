package org.quantaphi.bubbles;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

/** App-private transcripts from approved, eligible Android app playback only. */
final class MediaNotes {
    private static final String LOG = "phone_media_last30";
    private static final String ACTIVE = "phone_media_active";
    private MediaNotes() {}
    static boolean active(Context context) {
        return BrainNotes.prefs(context).getBoolean(ACTIVE, false);
    }
    static void setActive(Context context, boolean on) {
        BrainNotes.prefs(context).edit().putBoolean(ACTIVE, on).apply();
    }
    static synchronized void add(Context context, String words) {
        if (!active(context) || words == null) return;
        String text = words.replaceAll("\\s+", " ").trim();
        if (text.isEmpty()) return;
        if (text.length() > 220) text = text.substring(0, 220);
        SharedPreferences prefs = BrainNotes.prefs(context);
        JSONArray next = new JSONArray();
        try {
            JSONArray previous = new JSONArray(prefs.getString(LOG, "[]"));
            for (int i = Math.max(0, previous.length() - 29); i < previous.length(); i++) {
                JSONObject item = previous.optJSONObject(i);
                if (item != null) next.put(item);
            }
        } catch (Exception ignored) { /* Corrupt text should not leave the phone. */ }
        JSONObject entry = new JSONObject();
        try {
            entry.put("at", System.currentTimeMillis());
            entry.put("text", text);
        } catch (Exception ignored) { return; }
        next.put(entry);
        // Save the latest received phrase independently of the full bounded
        // transcript history so it remains readable after a playback restart.
        prefs.edit().putString(LOG, next.toString())
            .putString("phone_media_last_received", text)
            .putLong("phone_media_last_received_at", System.currentTimeMillis()).apply();
    }
    static synchronized List<String> freshCandidateTexts(Context context, long now, long windowMs) {
        ArrayList<String> matches = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(BrainNotes.prefs(context).getString(LOG, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject item = arr.optJSONObject(i);
                if (item == null) continue;
                long age = now - item.optLong("at", 0L);
                if (age < 0 || age > windowMs) continue;
                String text = item.optString("text", "").trim();
                if (!text.isEmpty()) matches.add("Phone playback: " + text);
            }
        } catch (Exception ignored) { /* Empty context on corruption. */ }
        return matches;
    }
    static boolean available(Context context) {
        return active(context) || !freshCandidateTexts(context, System.currentTimeMillis(), 120000L).isEmpty();
    }
    static String recent(Context context) {
        List<String> all = freshCandidateTexts(context, System.currentTimeMillis(), 24L * 60L * 60L * 1000L);
        return all.isEmpty() ? "No recent app playback transcripts." : String.join("\n", all);
    }
    static void clear(Context context) {
        BrainNotes.prefs(context).edit().remove(LOG)
            .remove("phone_media_last_received").remove("phone_media_last_received_at").apply();
    }
}
