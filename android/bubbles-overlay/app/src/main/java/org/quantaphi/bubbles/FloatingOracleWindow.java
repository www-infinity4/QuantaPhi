package org.quantaphi.bubbles;

import android.content.Context;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/**
 * Actual floating Oracle conversation window, owned by the visible Bubbles
 * foreground service. An overlay tap opens this immediately, without Android
 * background activity launch restrictions or leaving the current app.
 * Recognition continues while the panel is open; typing is optional.
 */
final class FloatingOracleWindow {
    private static final int BACKGROUND = Color.rgb(22, 18, 36);
    private static final int PURPLE = Color.rgb(108, 75, 178);
    private static final int LIGHT = Color.rgb(249, 246, 255);
    private static final int MUTED = Color.rgb(196, 180, 219);
    private final BubblesService service;
    private final WindowManager manager;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private LinearLayout root;
    private TextView conversation, status, hearing;
    private ScrollView scroll;
    private EditText input;
    private String lastHistory = "";
    private final Runnable update = new Runnable() {
        @Override public void run() {
            if (root == null) return;
            String history = OracleChatActivity.renderHistory(service);
            if (!lastHistory.equals(history)) {
                lastHistory = history;
                conversation.setText(history);
                scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
            }
            String voice = BrainNotes.prefs(service).getString("voice_state", "starting");
            String provider = BrainNotes.prefs(service).getString("ai_provider", "Oracle");
            status.setText("● " + voice + "   •   " + provider);
            String partial = BrainNotes.prefs(service).getString("last_partial", "");
            String heard = BrainNotes.prefs(service).getString("last_heard", "");
            hearing.setText(partial.isEmpty()
                    ? (heard.isEmpty() ? "Listening. Speak naturally; typing is optional." : "Heard: " + heard)
                    : "Hearing: " + partial);
            ui.postDelayed(this, 400);
        }
    };

    FloatingOracleWindow(BubblesService service, WindowManager manager) {
        this.service = service;
        this.manager = manager;
    }
    private int dp(float value) {
        return Math.round(value * service.getResources().getDisplayMetrics().density);
    }
    private GradientDrawable shape(int fill, float radius, int stroke) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        if (stroke != 0) drawable.setStroke(dp(1), stroke);
        return drawable;
    }
    private TextView text(String value, int size, int color) {
        TextView t = new TextView(service);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(color);
        return t;
    }
    private Button button(String value, boolean primary) {
        Button b = new Button(service);
        b.setText(value);
        b.setAllCaps(false);
        b.setTextSize(13);
        b.setMinHeight(0);
        b.setMinimumHeight(0);
        b.setPadding(dp(9), dp(8), dp(9), dp(8));
        b.setTextColor(LIGHT);
        b.setBackground(shape(primary ? PURPLE : Color.rgb(55, 45, 79), 14, 0));
        b.setElevation(dp(2));
        return b;
    }
    boolean show() {
        if (root != null) return true;
        LinearLayout page = new LinearLayout(service);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(16), dp(14), dp(16), dp(14));
        page.setBackground(shape(BACKGROUND, 22, Color.rgb(103, 75, 161)));

        LinearLayout header = new LinearLayout(service);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = text("ORACLE  /  BUBBLES", 21, LIGHT);
        title.setTypeface(null, Typeface.BOLD);
        header.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        Button close = button("✕", false);
        close.setContentDescription("Close floating Oracle conversation");
        close.setOnClickListener(v -> close());
        header.addView(close);
        page.addView(header);

        status = text("● Listening", 13, Color.rgb(170, 248, 215));
        status.setPadding(0, dp(8), 0, dp(5));
        page.addView(status);
        hearing = text("Listening. Speak naturally; typing is optional.", 13, MUTED);
        hearing.setMaxLines(3);
        page.addView(hearing);

        LinearLayout controls = new LinearLayout(service);
        controls.setPadding(0, dp(12), 0, dp(9));
        Button stop = button("Stop speaking", true);
        stop.setOnClickListener(v -> service.startService(
                new Intent(service, BubblesService.class).setAction(BubblesService.ACTION_STOP_SPEAKING)));
        controls.addView(stop, new LinearLayout.LayoutParams(0, -2, 1));
        Button resume = button("Listen", false);
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(0, -2, 1);
        rp.leftMargin = dp(8);
        resume.setOnClickListener(v -> service.startService(
                new Intent(service, BubblesService.class).setAction(BubblesService.ACTION_RESUME)));
        controls.addView(resume, rp);
        page.addView(controls);

        scroll = new ScrollView(service);
        scroll.setFillViewport(true);
        scroll.setBackground(shape(Color.rgb(32, 26, 52), 12, 0));
        conversation = text("Your conversation appears here.", 16, LIGHT);
        conversation.setPadding(dp(12), dp(12), dp(12), dp(12));
        conversation.setTextIsSelectable(true);
        scroll.addView(conversation);
        page.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout composer = new LinearLayout(service);
        composer.setGravity(Gravity.CENTER_VERTICAL);
        composer.setPadding(0, dp(10), 0, 0);
        input = new EditText(service);
        input.setSingleLine(false);
        input.setMinLines(1);
        input.setMaxLines(3);
        input.setTextColor(LIGHT);
        input.setHintTextColor(MUTED);
        input.setTextSize(15);
        input.setHint("Optional typed message…");
        input.setBackground(shape(Color.rgb(49, 39, 72), 15, Color.rgb(97, 76, 128)));
        input.setPadding(dp(12), dp(9), dp(12), dp(9));
        composer.addView(input, new LinearLayout.LayoutParams(0, -2, 1));
        Button send = button("Send", true);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-2, -2);
        sp.leftMargin = dp(8);
        send.setOnClickListener(v -> {
            String message = input.getText().toString().trim();
            if (message.isEmpty()) return;
            if (message.length() > 1800) {
                hearing.setText("Please use fewer than 1,800 characters.");
                return;
            }
            service.startService(new Intent(service, BubblesService.class)
                    .setAction(BubblesService.ACTION_TEXT).putExtra("text", message));
            input.setText("");
            InputMethodManager keyboard = (InputMethodManager) service.getSystemService(Context.INPUT_METHOD_SERVICE);
            if (keyboard != null) keyboard.hideSoftInputFromWindow(input.getWindowToken(), 0);
        });
        composer.addView(send, sp);
        page.addView(composer);

        int width = Math.min(service.getResources().getDisplayMetrics().widthPixels - dp(24), dp(550));
        int height = Math.min((int)(service.getResources().getDisplayMetrics().heightPixels * .74f), dp(680));
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                width, height, WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
                android.graphics.PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.CENTER;
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        try {
            manager.addView(page, params);
            root = page;
            lastHistory = "";
            ui.post(update);
            return true;
        } catch (RuntimeException ex) {
            root = null;
            return false;
        }
    }
    void close() {
        ui.removeCallbacks(update);
        if (root != null) {
            try { manager.removeView(root); } catch (RuntimeException ignored) {}
            root = null;
        }
    }
}
