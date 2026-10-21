package org.quantaphi.bubblesone;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import java.util.ArrayList;
import java.util.Collections;

final class LocalNotebook extends SQLiteOpenHelper {
    LocalNotebook(Context context) { super(context, "bubbles-one-private.db", null, 1); }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, words TEXT NOT NULL, at INTEGER NOT NULL)");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { }
    synchronized void add(String role, String words) {
        if (words == null || words.trim().isEmpty()) return;
        android.content.ContentValues values = new android.content.ContentValues();
        values.put("role", role); values.put("words", words.substring(0, Math.min(6000, words.length())));
        values.put("at", System.currentTimeMillis());
        getWritableDatabase().insertOrThrow("events", null, values);
        getWritableDatabase().execSQL("DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT 2000)");
    }
    synchronized String context() {
        ArrayList<String> turns = new ArrayList<>();
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT role,words FROM events WHERE role IN ('user','assistant') ORDER BY id DESC LIMIT 12", null)) {
            while (cursor.moveToNext()) turns.add(cursor.getString(0) + ": " + cursor.getString(1));
        }
        Collections.reverse(turns);
        StringBuilder b = new StringBuilder("Recent conversation on this device (not proof of external actions):\n");
        for (String turn : turns) b.append(turn, 0, Math.min(turn.length(), 850)).append('\n');
        return b.substring(0, Math.min(b.length(), 9000));
    }
    synchronized String recent() {
        ArrayList<String> lines = new ArrayList<>();
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT role,words FROM events ORDER BY id DESC LIMIT 20", null)) {
            while (cursor.moveToNext()) lines.add(cursor.getString(0) + ": " + cursor.getString(1));
        }
        Collections.reverse(lines);
        StringBuilder b = new StringBuilder();
        for (String line : lines) b.append(line, 0, Math.min(line.length(), 700)).append("\n\n");
        return b.toString();
    }
}
