package org.quantaphi.bubbles;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.text.InputType;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The floating orb opens this small Oracle-style text conversation, not the
 * settings / capture-control screen. Chat stays local to this device.
 * OpenAI OAuth tokens are never exposed in the chat UI or sent to our Worker.
 */
public final class OracleChatActivity extends Activity {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView transcript, status;
    private ScrollView scroll;
    private EditText input;
    private String lastRendered = "";
    private final Runnable refresh = new Runnable() {
        @Override public void run() {
            if (transcript == null) return;
            final String current = renderHistory(OracleChatActivity.this);
            if (!lastRendered.equals(current)) {
                lastRendered = current;
                transcript.setText(current);
                scroll.post(() -> scroll.fullScroll(ScrollView.FOCUS_DOWN));
            }
            String voice = BrainNotes.prefs(OracleChatActivity.this).getString("voice_state", "not started");
            String provider = BrainNotes.prefs(OracleChatActivity.this).getString("ai_provider", "Oracle");
            status.setText("Microphone: " + voice + "  |  Assistant: " + provider);
            handler.postDelayed(this, 500);
        }
    };

    private static final int WHITE = Color.rgb(245, 240, 255);
    private static final int LAVENDER = Color.rgb(182, 145, 246);
    private static final int DARK = Color.rgb(23, 18, 38);

    private TextView label(String text, int size, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setPadding(16, 12, 16, 12);
        return view;
    }
    private Button button(String text) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextColor(WHITE);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(85, 59, 126)));
        return b;
    }
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setBackgroundColor(DARK);
        page.setPadding(12, 20, 12, 8);
        TextView heading = label("ORACLE  /  BUBBLES", 23, WHITE);
        heading.setTypeface(null, Typeface.BOLD);
        page.addView(heading);
        status = label("Connecting to assistant…", 13, LAVENDER);
        page.addView(status);

        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        Button silence = button("Stop talking");
        silence.setOnClickListener(v -> sendAction(BubblesService.ACTION_STOP_SPEAKING));
        controls.addView(silence, new LinearLayout.LayoutParams(0, -2, 1));
        Button listen = button("Resume listening");
        listen.setOnClickListener(v -> sendAction(BubblesService.ACTION_RESUME));
        controls.addView(listen, new LinearLayout.LayoutParams(0, -2, 1));
        page.addView(controls);

        scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        transcript = label("Your conversation appears here.", 16, WHITE);
        transcript.setTextIsSelectable(true);
        scroll.addView(transcript);
        page.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout composer = new LinearLayout(this);
        composer.setOrientation(LinearLayout.HORIZONTAL);
        composer.setGravity(Gravity.BOTTOM);
        input = new EditText(this);
        input.setHint("Message Oracle…");
        input.setHintTextColor(Color.rgb(173, 157, 190));
        input.setTextColor(WHITE);
        input.setBackgroundTintList(android.content.res.ColorStateList.valueOf(LAVENDER));
        input.setMinLines(1);
        input.setMaxLines(4);
        input.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE
                | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        composer.addView(input, new LinearLayout.LayoutParams(0, -2, 1));
        Button send = button("Send");
        send.setOnClickListener(v -> sendMessage());
        composer.addView(send);
        page.addView(composer);

        Button account = button("Wallet / ChatGPT connection & settings");
        account.setOnClickListener(v -> startActivity(new Intent(this, MainActivity.class)));
        page.addView(account);
        setContentView(page);
    }
    private void sendAction(String action) {
        try {
            startService(new Intent(this, BubblesService.class).setAction(action));
        } catch (Exception e) {
            status.setText("Bubbles is not running. Enable it from the app first.");
        }
    }
    private void sendMessage() {
        String message = input.getText().toString().trim();
        if (message.isEmpty()) return;
        if (message.length() > 1800) {
            status.setText("Please keep your message below 1,800 characters.");
            return;
        }
        try {
            startService(new Intent(this, BubblesService.class)
                    .setAction(BubblesService.ACTION_TEXT).putExtra("text", message));
            input.setText("");
            ((InputMethodManager) getSystemService(INPUT_METHOD_SERVICE))
                    .hideSoftInputFromWindow(input.getWindowToken(), 0);
        } catch (Exception e) {
            status.setText("Enable Bubbles before sending a message.");
        }
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
    @Override protected void onResume() {
        super.onResume();
        handler.post(refresh);
    }
    @Override protected void onPause() {
        handler.removeCallbacks(refresh);
        super.onPause();
    }
}
