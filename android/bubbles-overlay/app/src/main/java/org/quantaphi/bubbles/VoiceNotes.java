package org.quantaphi.bubbles;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Voice-first, private notes for the native offline fallback.
 * QuantaPhi website notes remain in the website's origin-local storage.
 * Notes are NOT bot instructions and are never financial authorizations.
 */
final class VoiceNotes {
    private static final String KEY = "bubbles-native-voice-notes";
    private static final Pattern START = Pattern.compile(
        "^(?:please\\s+)?(?:(?:start|begin)\\s+)?(?:take|taking|write|make|record)\\s+notes?(?:\\s+now)?[.!?]*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern STOP = Pattern.compile(
        "^(?:please\\s+)?(?:stop|finish|end)\\s+(?:taking|writing|recording)\\s+notes?[.!?]*$", Pattern.CASE_INSENSITIVE);
    private static final Pattern WRITE = Pattern.compile(
        "^(?:(?:please\\s+)?(?:take|make|save|write|record)\\s+(?:a\\s+)?note(?:\\s+that|\\s+of)?|(?:please\\s+)?write\\s+down|remember\\s+that)\\s*[:,\\-]?\\s+(.+)$", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private VoiceNotes() {}

    static String consume(Context context, String utterance) {
        String request = utterance == null ? "" : utterance.trim();
        SharedPreferences prefs = context.getSharedPreferences(KEY, Context.MODE_PRIVATE);
        if (STOP.matcher(request).matches()) {
            prefs.edit().putBoolean("taking", false).apply();
            return "Stopped taking notes. Your saved notes stay on this phone.";
        }
        if (START.matcher(request).matches()) {
            prefs.edit().putBoolean("taking", true).apply();
            return "Taking notes. Tell me what to write down; say stop taking notes to finish.";
        }
        if (request.matches("(?i)^(?:please\\s+)?(?:read|show|list)\\s+(?:my\\s+)?notes?[.!?]*$"))
            return list(prefs);
        Matcher match = WRITE.matcher(request);
        String note = match.matches() ? match.group(1)
            : prefs.getBoolean("taking", false) ? request : "";
        if (note.isEmpty()) return null;
        note = note.replaceAll("[\\p{Cntrl}&&[^\\n\\t]]", " ").trim();
        if (note.isEmpty()) return "There was no note to save.";
        note = note.substring(0, Math.min(1800, note.length()));
        try {
            JSONArray old = new JSONArray(prefs.getString("entries", "[]"));
            JSONArray next = new JSONArray();
            next.put(new JSONObject().put("text", note).put("time", System.currentTimeMillis()));
            for (int i = 0; i < old.length() && i < 49; i++) next.put(old.get(i));
            if (!prefs.edit().putString("entries", next.toString()).commit())
                return "The note was not saved on this phone.";
            return "Saved note: " + note.substring(0, Math.min(150, note.length()));
        } catch (Exception error) { return "Could not save your note on this phone."; }
    }

    private static String list(SharedPreferences prefs) {
        try {
            JSONArray saved = new JSONArray(prefs.getString("entries", "[]"));
            if (saved.length() == 0) return "No notes saved yet on this phone.";
            StringBuilder out = new StringBuilder("Your latest notes: ");
            for (int i = 0; i < Math.min(saved.length(), 5); i++) {
                String entry = saved.getJSONObject(i).optString("text", "");
                out.append(i + 1).append(". ").append(entry, 0, Math.min(160, entry.length())).append("; ");
            }
            return out.toString();
        } catch (Exception error) { return "Notes are unavailable."; }
    }
}
