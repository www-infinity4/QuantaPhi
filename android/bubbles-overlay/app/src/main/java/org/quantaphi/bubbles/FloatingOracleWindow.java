package org.quantaphi.bubbles;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import org.json.JSONTokener;
import org.json.JSONObject;
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
    // Oracle Octaves visual tokens (light fallback; the actual site supplies its CSS).
    private static final int BACKGROUND = Color.rgb(251, 247, 238);
    private static final int PRIMARY = Color.rgb(181, 48, 39);
    private static final int LIGHT = Color.rgb(255, 255, 255);
    private static final int INK = Color.rgb(49, 37, 41);
    private static final int MUTED = Color.rgb(101, 85, 102);
    private static final int LINE = Color.rgb(222, 208, 197);
    private final BubblesService service;
    private final WindowManager manager;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final java.util.concurrent.ExecutorService gptWork=java.util.concurrent.Executors.newSingleThreadExecutor();
    private boolean gptBusy=false;
    private LinearLayout root;
    private TextView conversation, status, hearing;
    private ScrollView scroll;
    private EditText input;
    private View controls, hearingNative, composerNative;
    private WebView website;
    private boolean websiteReady = false;
    private String pendingSpeech = "";
    private String pendingTyped = "";
    private boolean dispatchInFlight = false;
    private Button muteButton;
    private long pendingSince = 0L;
    private static final String SITE_URL = "https://quantaphi.org/bubbles.html?nativeOverlay=1";
    private static final String SITE_HOST = "quantaphi.org";
    private String lastHistory = "";
    private final Runnable update = new Runnable() {
        @Override public void run() {
            if (root == null) return;
            if (websiteReady) {
                deliverQueuedSpeech();
                deliverQueuedText();
                pollWebsiteReply();
            }
            String history = OracleChatActivity.renderHistory(service);
            if (!lastHistory.equals(history)) {
                lastHistory = history;
                conversation.setText(history);
                scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
            }
            String voice = BrainNotes.prefs(service).getString("voice_state", "starting");
            if (muteButton != null) muteButton.setText("muted".equals(voice) ? "Mic on" : "Mic off");
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
        b.setTextColor(primary ? LIGHT : INK);
        b.setBackground(shape(primary ? PRIMARY : LIGHT, 20, primary ? 0 : LINE));
        b.setElevation(dp(2));
        return b;
    }
    boolean show() {
        if (root != null) {
            root.setVisibility(View.VISIBLE);
            return true;
        }
        LinearLayout page = new LinearLayout(service);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(16), dp(14), dp(16), dp(14));
        page.setBackground(shape(BACKGROUND, 22, LINE));

        LinearLayout header = new LinearLayout(service);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = text("ORACLE OCTAVES  /  BUBBLES", 21, INK);
        title.setTypeface(null, Typeface.BOLD);
        header.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        muteButton = button("Mic off", false);
        muteButton.setContentDescription("Mute or resume Bubbles microphone; text chat still works");
        muteButton.setOnClickListener(v -> {
            boolean muted = "muted".equals(BrainNotes.prefs(service).getString("voice_state", ""));
            service.startService(new Intent(service, BubblesService.class)
                .setAction(muted ? BubblesService.ACTION_RESUME : BubblesService.ACTION_MUTE));
        });
        header.addView(muteButton);
        Button close = button("✕", false);
        close.setContentDescription("Close floating Oracle conversation");
        close.setOnClickListener(v -> hide());
        header.addView(close);
        page.addView(header);

        status = text("● Listening", 13, Color.rgb(51, 112, 85));
        status.setPadding(0, dp(8), 0, dp(5));
        page.addView(status);
        hearing = text("Listening. Speak naturally; typing is optional.", 13, MUTED);
        hearing.setMaxLines(3);
        page.addView(hearing);

        LinearLayout controls = new LinearLayout(service);
        this.controls = controls;
        this.hearingNative = hearing;
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
        scroll.setBackground(shape(LIGHT, 16, LINE));
        conversation = text("Your conversation appears here.", 16, INK);
        conversation.setPadding(dp(12), dp(12), dp(12), dp(12));
        conversation.setTextIsSelectable(true);
        scroll.addView(conversation);
        page.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout composer = new LinearLayout(service);
        this.composerNative = composer;
        composer.setGravity(Gravity.CENTER_VERTICAL);
        composer.setPadding(0, dp(10), 0, 0);
        input = new EditText(service);
        input.setSingleLine(false);
        input.setMinLines(1);
        input.setMaxLines(3);
        input.setTextColor(INK);
        input.setHintTextColor(MUTED);
        input.setTextSize(15);
        input.setHint("Optional typed message…");
        input.setBackground(shape(LIGHT, 15, LINE));
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
        // Prefer the real QuantaPhi Bubbles application: its AI request builder,
        // owner-wallet authorization, Robot Brain tickets, message actions and
        // notes are identical to the site. Keep native chat as offline fallback.
        try {
            website = new WebView(service);
            website.setVisibility(View.GONE);
            website.setBackgroundColor(BACKGROUND);
            WebSettings settings = website.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setAllowFileAccess(false);
            settings.setAllowContentAccess(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            website.setWebChromeClient(new WebChromeClient()); // no microphone or camera grants
            website.setWebViewClient(new WebViewClient() {
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    if (!request.isForMainFrame()) return false;
                    Uri target = request.getUrl();
                    if ("https".equals(target.getScheme()) && SITE_HOST.equals(target.getHost()))
                        return false;
                    // No intent:, file:, content: or javascript: navigation inside the overlay.
                    if ("https".equals(target.getScheme())) {
                        try {service.startActivity(new Intent(Intent.ACTION_VIEW, target)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));}
                        catch (RuntimeException ignored) {}
                    }
                    return true;
                }
                @Override public void onPageFinished(WebView view, String url) {
                    Uri location = Uri.parse(url);
                    if (!"https".equals(location.getScheme()) || !SITE_HOST.equals(location.getHost())
                            || !"/bubbles.html".equals(location.getPath())) {
                        showWebsite(false);
                        return;
                    }
                    // Old live deployments are not treated as capable. Never send a
                    // work command to a guessed JS endpoint.
                    view.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.isNativeOverlay)",
                        result -> showWebsite("true".equals(result)));
                }
                @Override public void onReceivedError(WebView view, WebResourceRequest request,
                                                       WebResourceError error) {
                    if (request.isForMainFrame()) {
                        showWebsite(false);
                        status.setText("QuantaPhi unavailable · local Oracle chat is still ready");
                    }
                }
            });
            page.addView(website, new LinearLayout.LayoutParams(-1, 0, 1));
            website.loadUrl(SITE_URL);
        } catch (RuntimeException error) {
            // WebView might be unavailable or outdated; native capture and chat work.
            website = null;
            status.setText("Website chat unavailable · local Oracle chat ready");
        }

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
    boolean sendSpoken(String text) {
        if (website == null) return false;
        // Keep speech on the shared assistant while its first-party page loads.
        // Falling back here previously sent owners to an unrelated submit button.
        if (!websiteReady) status.setText("Connecting to QuantaPhi Bubbles; holding your request…");
        pendingSpeech = String.valueOf(text).trim().substring(0, Math.min(1800, text.trim().length()));
        pendingSince = android.os.SystemClock.elapsedRealtime();
        deliverQueuedSpeech();
        return true;
    }

    private void showWebsite(boolean ready) {
        websiteReady = ready && root != null && website != null;
        if (website != null) website.setVisibility(websiteReady ? View.VISIBLE : View.GONE);
        if (scroll != null) scroll.setVisibility(websiteReady ? View.GONE : View.VISIBLE);
        if (composerNative != null) composerNative.setVisibility(websiteReady ? View.GONE : View.VISIBLE);
        if (controls != null) controls.setVisibility(websiteReady ? View.GONE : View.VISIBLE);
        if (hearingNative != null) hearingNative.setVisibility(websiteReady ? View.GONE : View.VISIBLE);
        if (websiteReady) {
            status.setText("● QuantaPhi Bubbles · full website brain, notes & chat");
            if (!pendingSpeech.isEmpty()) deliverQueuedSpeech();
            if (!pendingTyped.isEmpty()) deliverQueuedText();
        }
    }

    private void deliverQueuedSpeech() {
        if (!websiteReady || website == null || pendingSpeech.isEmpty() || dispatchInFlight) return;
        if (android.os.SystemClock.elapsedRealtime() - pendingSince > 20000L) {
            pendingSpeech = "";
            status.setText("Speech request timed out; nothing was submitted.");
            return;
        }
        final String spoken = pendingSpeech;
        dispatchInFlight = true;
        // JSON quoting prevents recognized speech from becoming executable JS.
        website.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.sendNativeSpeech("
            + JSONObject.quote(spoken) + "))", result -> {
                dispatchInFlight = false;
                if ("true".equals(result) && spoken.equals(pendingSpeech)) pendingSpeech = "";
            });
    }

    boolean sendTyped(String text) {
        if (website == null || text == null || text.trim().isEmpty()) return false;
        pendingTyped = text.trim().substring(0, Math.min(1800, text.trim().length()));
        deliverQueuedText();
        return true;
    }
    private void deliverQueuedText() {
        if (!websiteReady || website == null || pendingTyped.isEmpty()) return;
        final String message = pendingTyped;
        website.evaluateJavascript(
            "Boolean(window.QuantaBubbles && window.QuantaBubbles.sendNativeText("
                + JSONObject.quote(message) + "))", result -> {
                if ("true".equals(result) && message.equals(pendingTyped)) pendingTyped = "";
            });
    }
    void claimMicrophone() {
        if (websiteReady && website != null) website.evaluateJavascript("window.QuantaBubbles && window.QuantaBubbles.claimNativeVoice()", null);
    }
    private void pollWebsiteReply() {
        if (!websiteReady || website == null) return;
        website.evaluateJavascript("window.QuantaBubbles && window.QuantaBubbles.setNativeGPTAvailable("
                + (ChatGPTSignIn.hasPlan(service) ? "true" : "false") + ")", null);
        website.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.takeNativeGPTLogin())", result -> {
            if(!websiteReady || !"true".equals(result))return;
            Intent open = new Intent(service, MainActivity.class).putExtra("open_chatgpt_signin",true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            try{service.startActivity(open);}catch(Exception error){
                status.setText("Could not open ChatGPT sign-in settings.");
            }
        });
        if(!gptBusy)website.evaluateJavascript(
            "window.QuantaBubbles && window.QuantaBubbles.drainNativeGPTRequest()", payload -> {
                if(!websiteReady || gptBusy || payload==null || "null".equals(payload))return;
                try {
                    Object decoded=new JSONTokener(payload).nextValue();
                    if(!(decoded instanceof String) || ((String)decoded).isEmpty())return;
                    JSONObject task=new JSONObject((String)decoded);
                    String id=task.optString("id","");
                    String prompt=task.optString("prompt","");
                    if(!id.matches("[0-9a-fA-F-]{36}") || prompt.isEmpty() || prompt.length()>18000)return;
                    gptBusy=true;
                    gptWork.execute(() -> {
                        String answer="",error="";
                        try {
                            if(!ChatGPTSignIn.hasPlan(service))throw new IllegalStateException("ChatGPT plan not authorized");
                            answer=ChatGPTSignIn.ask(service,prompt);
                        }catch(Exception problem){
                            error=String.valueOf(problem.getMessage());
                            if(error.length()>140)error=error.substring(0,140);
                        }
                        final String result=answer,problem=error;
                        ui.post(() -> {
                            gptBusy=false;
                            if(websiteReady&&website!=null){
                                website.evaluateJavascript(
                                  "Boolean(window.QuantaBubbles&&window.QuantaBubbles.finishNativeGPTRequest("
                                  +JSONObject.quote(id)+","+JSONObject.quote(result)+","+JSONObject.quote(problem)+"))",null);
                            }
                        });
                    });
                }catch(Exception ignored){}
            });
        website.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.voiceConflict())", value -> {
            if ("true".equals(value)) service.pauseSharedMicrophone();
        });
        website.evaluateJavascript("window.QuantaBubbles && window.QuantaBubbles.drainNativeReply()",
            raw -> {
                if (!websiteReady || raw == null || "null".equals(raw)) return;
                try {
                    Object value = new JSONTokener(raw).nextValue();
                    if (value instanceof String && !((String) value).isEmpty())
                        service.speakWebsiteReply(((String) value).substring(0, Math.min(2200, ((String) value).length())));
                } catch (Exception ignored) {}
            });
    }

    /** Collapsing the overlay preserves the first-party chat and bot session.
     * Only service shutdown destroys the WebView and releases resources.
     */
    void hide() {
        if (root != null) root.setVisibility(View.GONE);
    }

    void close() {
        ui.removeCallbacks(update);
        gptWork.shutdownNow();
        websiteReady = false;
        pendingSpeech = "";
        pendingTyped = "";
        dispatchInFlight = false;
        if (root != null) {
            try { manager.removeView(root); } catch (RuntimeException ignored) {}
            root = null;
        }
        if (website != null) {
            website.stopLoading();
            website.loadUrl("about:blank");
            website.destroy();
            website = null;
        }
    }
}
