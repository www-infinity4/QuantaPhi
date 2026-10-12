package org.quantaphi.bubbles;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/** Device-local, bounded notes. Capture never performs a network request. */
final class BrainNotes {
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("brain_companion", Context.MODE_PRIVATE); }
    static synchronized void add(Context c, String app, String text) {
        text = LearningPolicy.clean(text);
        if (text.length() < 20) return;
        try {
            JSONArray old = new JSONArray(prefs(c).getString("notes", "[]"));
            if (old.length()>0 && text.equals(old.getJSONObject(0).optString("text"))
                    && app.equals(old.getJSONObject(0).optString("app"))) return;
            JSONArray next = new JSONArray();
            next.put(new JSONObject().put("app",app).put("time",System.currentTimeMillis()).put("text",text));
            for (int i=0; i<old.length() && i<29; i++) next.put(old.get(i));
            prefs(c).edit().putString("notes",next.toString()).apply();
        } catch (Exception ignored) {}
    }
    static String recent(Context c) {
        StringBuilder out = new StringBuilder();
        try {
            JSONArray notes = new JSONArray(prefs(c).getString("notes","[]"));
            for (int i=0;i<notes.length() && out.length()<10000;i++) {
                JSONObject n=notes.getJSONObject(i);
                out.append(n.optString("app")).append(" @ ").append(n.optLong("time"))
                    .append(": ").append(n.optString("text")).append("\n\n");
            }
        } catch (Exception ignored) {}
        return out.substring(0,Math.min(10000,out.length()));
    }
    static synchronized void receipt(Context c,String request,JSONObject result) {
        try {
            JSONObject receipt=result.getJSONObject("receipt");
            receipt.put("request",LearningPolicy.clean(request));
            receipt.put("output",LearningPolicy.clean(result.optString("output")));
            receipt.put("sources",result.optJSONArray("sources"));
            JSONArray old=new JSONArray(prefs(c).getString("tool_receipts","[]")),next=new JSONArray();
            next.put(receipt);
            for(int i=0;i<old.length() && i<29;i++)next.put(old.get(i));
            prefs(c).edit().putString("tool_receipts",next.toString()).apply();
        } catch(Exception ignored) {}
    }
}
