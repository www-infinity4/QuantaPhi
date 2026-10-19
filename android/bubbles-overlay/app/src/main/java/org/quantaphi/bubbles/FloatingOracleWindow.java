package org.quantaphi.bubbles;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.webkit.PermissionRequest;
import android.app.AlertDialog;
import android.content.pm.PackageManager;
import android.Manifest;
import org.json.JSONTokener;
import org.json.JSONObject;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
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
    private TextView status;
    private Button retryButton;
    private Button liveBack;
    private boolean livePage;
    private PermissionRequest livePermission;
    private AlertDialog livePermissionDialog;
    private WebView website;
    private boolean websiteReady = false;
    private boolean robotOwnerConnected = false;
    private long lastRobotStatusAt = 0L;
    private String lastCaptureSnapshot = "";
    private long lastPhonePollAt;
    private boolean phoneCommandRunning;
    // Keep follow-ups in order while the web assistant is loading or busy.
    // One slot silently replaced the first instruction with the second.
    private static final class QueuedMessage {
        final String text;
        final String evidence;
        final String id = java.util.UUID.randomUUID().toString();
        QueuedMessage(String text) { this(text, ""); }
        QueuedMessage(String text, String evidence) { this.text = text; this.evidence = evidence; }
    }
    private int loadGeneration = 0;
    // Bound automatic recovery if Android kills the WebView renderer.
    private int rendererFailures = 0;
    private long lastRendererFailureAt = 0L;
    private final java.util.ArrayDeque<QueuedMessage> pendingSpeech = new java.util.ArrayDeque<>();
    private final java.util.ArrayDeque<QueuedMessage> pendingTyped = new java.util.ArrayDeque<>();
    private boolean dispatchInFlight = false, typedDispatchInFlight = false;
    private long speechDispatchAt = 0L, typedDispatchAt = 0L;
    private static final String SITE_URL = "https://quantaphi.org/bubbles.html?nativeOverlay=1"; // paired through ordinary chat input
    private static final String SITE_HOST = "quantaphi.org";

    private final Runnable update = new Runnable() {
        @Override public void run() {
            if (root == null) return;
            if (livePage && trustedLive(website)) {
                final int generation = loadGeneration;
                website.evaluateJavascript("Boolean(window.BubblesLiveVoice && window.BubblesLiveVoice.inCall())", result -> {
                    if (generation == loadGeneration && livePage && trustedLive(website)
                            && "false".equals(result)) service.releaseLiveMicrophone();
                });
            } else if (websiteReady) {
                // A WebView navigation can lose an evaluateJavascript callback.
                // Retry the queued turn instead of permanently blocking Bubbles.
                long now = android.os.SystemClock.elapsedRealtime();
                if (dispatchInFlight && now - speechDispatchAt > 15000L) dispatchInFlight = false;
                if (typedDispatchInFlight && now - typedDispatchAt > 15000L) typedDispatchInFlight = false;
                deliverQueuedSpeech();
                deliverQueuedText();
                pollWebsiteReply();
            }
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
        TextView title = text("Bubbles", 21, INK);
        title.setSingleLine(true);
        title.setTypeface(null, Typeface.BOLD);
        header.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        liveBack = button("Live voice", false);
        liveBack.setMinHeight(dp(44));
        liveBack.setContentDescription("Open GPT-Live owner setup");
        liveBack.setOnClickListener(v -> {
            if (website == null) return;
            if (livePage) {
                stopLiveCall();
                website.loadUrl(SITE_URL + "&v=" + BuildConfig.VERSION_NAME);
            } else website.loadUrl("https://quantaphi.org/bubbles-gpt-live.html?v=" + BuildConfig.VERSION_NAME);
        });
        header.addView(liveBack);
        Button close = button("✕", false);
        close.setContentDescription("Close floating Oracle conversation");
        close.setOnClickListener(v -> hide());
        header.addView(close);
        page.addView(header);

        status = text("● Listening", 13, Color.rgb(51, 112, 85));
        status.setPadding(0, dp(8), 0, dp(5));
        page.addView(status);
        retryButton = button("Retry website connection", false);
        retryButton.setOnClickListener(v -> {
            if (website == null) {
                // A crashed WebView cannot be loaded again; create a new one.
                rendererFailures = 0;
                createWebsite(page);
            } else {
                showWebsite(false);
                status.setText("Connecting to QuantaPhi Bubbles… Your queued messages are retained.");
                website.loadUrl(SITE_URL + "&v=" + BuildConfig.VERSION_NAME);
            }
        });
        page.addView(retryButton);
        // The website owns the only composer and conversation. Never substitute
        // a second local chat when loading, offline, or owner sync is unavailable.
        createWebsite(page);

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
            ui.post(update);
            return true;
        } catch (RuntimeException ex) {
            root = null;
            return false;
        }
    }
    /** The website remains the only chat UI. Reuse this setup after a
     * renderer crash without resetting queued speech, typed messages or IDs.
     * A remote page update does not confer new native Android permissions. */
    private void createWebsite(LinearLayout page) {
        try {
            website = new WebView(service);
            website.setVisibility(View.GONE);
            website.setBackgroundColor(BACKGROUND);
            // WebView owns a persistent first-party session (cookies and DOM storage).
            // Chrome's separate wallet secrets are never copied or bundled in the APK.
            android.webkit.CookieManager cookies = android.webkit.CookieManager.getInstance();
            cookies.setAcceptCookie(true);
            cookies.setAcceptThirdPartyCookies(website, false);
            WebSettings settings = website.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            // Do not reuse a stale owner-code form from an earlier deployment.
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            // Owner voice commands may start the registered in-chat radio player.
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setAllowFileAccess(false);
            // Keep arbitrary content:// navigation disabled. Android's SAF
            // chooser explicitly grants the user-selected file to the web input.
            settings.setAllowContentAccess(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            website.setWebChromeClient(new WebChromeClient() {
                @Override public void onPermissionRequest(PermissionRequest request) {
                    if (!allowLiveMicrophone(request)) { request.deny(); return; }
                    denyLivePermission();
                    livePermission = request;
                    try {
                        livePermissionDialog = new AlertDialog.Builder(service,
                                android.R.style.Theme_Material_Light_Dialog_Alert)
                            .setTitle("GPT-Live microphone")
                            .setMessage("Use the microphone for this live call? Ordinary Bubbles listening will pause. Existing audio and screen recordings must be stopped first.")
                            .setNegativeButton("Cancel", (dialog, which) -> denyLivePermission())
                            .setPositiveButton("Use microphone", (dialog, which) -> {
                                if (livePermission != request) return;
                                if (!allowLiveMicrophone(request) || !service.prepareLiveMicrophone()) {
                                    denyLivePermission();
                                    android.widget.Toast.makeText(service,
                                        "Stop active recordings before starting a live call", android.widget.Toast.LENGTH_LONG).show();
                                    return;
                                }
                                livePermission = null;
                                livePermissionDialog = null;
                                try { request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE}); }
                                catch (RuntimeException error) { service.releaseLiveMicrophone(); request.deny(); }
                            }).create();
                        livePermissionDialog.setOnCancelListener(dialog -> denyLivePermission());
                        livePermissionDialog.getWindow().setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY);
                        livePermissionDialog.show();
                    } catch (RuntimeException error) { denyLivePermission(); }
                }
                @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                    if (livePermission == request) {
                        livePermission = null;
                        if (livePermissionDialog != null) livePermissionDialog.dismiss();
                        livePermissionDialog = null;
                    }
                }
                // Respect the WEBSITE file input's accept type. The old
                // image-only override prevented selecting ChatGPT/Gemini JSON.
                @Override public boolean onShowFileChooser(WebView webView,
                        android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                    boolean historyJson = false;
                    String[] accepts = params.getAcceptTypes();
                    if (accepts == null) accepts = new String[0];
                    for (String type : accepts) {
                        if (type != null && (type.contains("json") || type.contains(".json")))
                            historyJson = true;
                    }
                    return service.openFilePicker(callback, historyJson);
                }
            });
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
                @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                    denyLivePermission();
                    service.releaseLiveMicrophone();
                    livePage = false;
                    if (liveBack != null) { liveBack.setText("Live voice"); liveBack.setContentDescription("Open GPT-Live owner setup"); }
                    loadGeneration++;
                    dispatchInFlight = false;
                    typedDispatchInFlight = false;
                    showWebsite(false);
                }
                @Override public void onPageFinished(WebView view, String url) {
                    Uri location = Uri.parse(url);
                    if (trustedLive(view)) {
                        livePage = true;
                        websiteReady = false;
                        view.setVisibility(View.VISIBLE);
                        status.setVisibility(View.GONE);
                        retryButton.setVisibility(View.GONE);
                        liveBack.setText("Chat");
                        liveBack.setContentDescription("End live call and return to Bubbles chat");
                        return;
                    }
                    if (!"https".equals(location.getScheme()) || !SITE_HOST.equals(location.getHost())
                            || !"/bubbles.html".equals(location.getPath())) {
                        showWebsite(false);
                        return;
                    }
                    // Persist only the site's own Set-Cookie updates; do not clear
                    // the authenticated WebView profile when collapsing or reopening.
                    android.webkit.CookieManager.getInstance().flush();
                    // The installed APK, not Chrome or the SIM, securely remembers
                    // the last server-verified wallet in AndroidKeyStore. When the
                    // WebView's own storage has been cleared it can restore that
                    // same account without copying a browser cookie or minting a
                    // replacement identity. Other selected accounts are untouched.
                    NativeWalletVault.synchronize(service, view);
                    // Old live deployments are not treated as capable. Never send a
                    // work command to a guessed JS endpoint.
                    pollBridgeReady(view, loadGeneration, 0);
                }
                @Override public void onReceivedError(WebView view, WebResourceRequest request,
                                                       WebResourceError error) {
                    if (request.isForMainFrame()) {
                        showWebsite(false);
                        status.setText("QuantaPhi Bubbles could not load. Check your connection and tap Retry. Your queued messages are retained.");
                    }
                }

                @Override public boolean onRenderProcessGone(WebView view,
                        android.webkit.RenderProcessGoneDetail detail) {
                    denyLivePermission();
                    service.releaseLiveMicrophone();
                    livePage = false;
                    // Android may terminate the shared WebView renderer while the
                    // foreground microphone/orb are healthy. This callback MUST
                    // consume the crash or Android terminates Bubbles entirely.
                    if (view != website) return true;
                    loadGeneration++;
                    showWebsite(false);
                    dispatchInFlight = false;
                    typedDispatchInFlight = false;
                    if (root != null) root.removeView(view);
                    website = null;
                    view.destroy();
                    final long now = android.os.SystemClock.elapsedRealtime();
                    if (now - lastRendererFailureAt > 60000L) rendererFailures = 0;
                    lastRendererFailureAt = now;
                    if (++rendererFailures <= 3) {
                        status.setText("Bubbles display stopped; reconnecting. Your messages are retained.");
                        ui.postDelayed(() -> {
                            if (root != null && website == null) createWebsite(root);
                        }, Math.min(4000L, rendererFailures * 750L));
                    } else {
                        status.setText("Bubbles display repeatedly stopped. Tap Retry to reopen it.");
                    }
                    return true;
                }
            });
            page.addView(website, new LinearLayout.LayoutParams(-1, 0, 1));
            website.loadUrl(SITE_URL + "&v=" + BuildConfig.VERSION_NAME);
        } catch (RuntimeException error) {
            // Keep the failure visible; never open a different assistant.
            website = null;
            status.setText("Android WebView could not open Bubbles. Update Android System WebView and reopen Bubbles.");
            retryButton.setEnabled(false);
        }
    }

    private boolean trustedLive(WebView view) {
        return view != null && view == website && LiveMicrophonePolicy.allows(
            "https://quantaphi.org", String.valueOf(view.getUrl()),
            new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE}, true, true);
    }
    private boolean allowLiveMicrophone(PermissionRequest request) {
        return root != null && website != null && LiveMicrophonePolicy.allows(
            String.valueOf(request.getOrigin()), String.valueOf(website.getUrl()), request.getResources(),
            root.isShown() && livePage,
            service.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED);
    }
    private void denyLivePermission() {
        PermissionRequest request = livePermission;
        livePermission = null;
        if (livePermissionDialog != null) livePermissionDialog.dismiss();
        livePermissionDialog = null;
        if (request != null) request.deny();
    }
    void stopLiveCall() {
        denyLivePermission();
        if (trustedLive(website)) {
            final WebView view = website;
            final int generation = loadGeneration;
            try {
                view.evaluateJavascript("Boolean(window.BubblesLiveVoice && (window.BubblesLiveVoice.stop(), true))", result -> {
                    if (view != website || generation != loadGeneration) return;
                    if ("true".equals(result)) service.releaseLiveMicrophone();
                    else view.loadUrl(SITE_URL + "&v=" + BuildConfig.VERSION_NAME);
                });
            } catch (RuntimeException error) {
                // Navigation/destruction releases WebView media even when an
                // older page has no lifecycle helper. Never resume Vosk here.
                view.loadUrl(SITE_URL + "&v=" + BuildConfig.VERSION_NAME);
            }
        } else service.releaseLiveMicrophone();
    }
    private boolean trustedChat(WebView view) {
        if (view == null || view != website || root == null) return false;
        Uri location = Uri.parse(String.valueOf(view.getUrl()));
        return "https".equals(location.getScheme()) && SITE_HOST.equals(location.getHost())
            && "/bubbles.html".equals(location.getPath());
    }
    private void pollBridgeReady(WebView view, int generation, int attempt) {
        if (generation != loadGeneration || !trustedChat(view)) return;
        view.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.isNativeOverlay"
            + " && typeof window.QuantaBubbles.sendNativeSpeech==='function'"
            + " && typeof window.QuantaBubbles.sendNativeText==='function')", result -> {
                if (generation != loadGeneration || !trustedChat(view)) return;
                if ("true".equals(result)) showWebsite(true);
                else if (attempt < 20) ui.postDelayed(() -> pollBridgeReady(view, generation, attempt + 1), 250);
                else {
                    showWebsite(false);
                    status.setText("Bubbles website loaded but its chat connection is not ready. Tap Retry; queued messages are retained.");
                }
            });
    }

    boolean sendSpoken(String text) { return sendSpoken(text, ""); }

    boolean sendSpoken(String text, String evidence) {
        if (root == null || text == null || text.trim().isEmpty()) return false;
        if (pendingSpeech.size() >= 24) {
            status.setText("Bubbles has 24 unprocessed voice requests. Please open chat to check the connection.");
            return false;
        }
        // Queue every complete turn. A busy first reply must not erase the next.
        String safeText = text.trim().substring(0, Math.min(1800, text.trim().length()));
        String safeEvidence = evidence == null ? "" : evidence.substring(0, Math.min(900, evidence.length()));
        pendingSpeech.addLast(new QueuedMessage(safeText, safeEvidence));
        if (!websiteReady) status.setText("Connecting to QuantaPhi Bubbles; holding your requests…");
        deliverQueuedSpeech();
        return true;
    }

    private void showWebsite(boolean ready) {
        websiteReady = ready && root != null && website != null;
        if (!websiteReady) { robotOwnerConnected = false; lastCaptureSnapshot = ""; phoneCommandRunning = false; }
        if (website != null) website.setVisibility(websiteReady ? View.VISIBLE : View.GONE);
        if (retryButton != null) retryButton.setVisibility(websiteReady ? View.GONE : View.VISIBLE);
        if (status != null) {
            status.setVisibility(websiteReady ? View.GONE : View.VISIBLE);
            if (!websiteReady) status.setText("Connecting to QuantaPhi Bubbles… If it does not load, tap Retry.");
        }
        if (websiteReady) {
            status.setText("● QuantaPhi Bubbles · full website brain, notes & chat");
            if (!pendingSpeech.isEmpty()) deliverQueuedSpeech();
            if (!pendingTyped.isEmpty()) deliverQueuedText();
            // The visible Android foreground service owns recognition; the
            // website only coordinates an owner-scoped lease, never mutes it.
            claimMicrophone();
        }
    }

    private void deliverQueuedSpeech() {
        if (!websiteReady || website == null || pendingSpeech.isEmpty() || dispatchInFlight) return;
        final QueuedMessage item = pendingSpeech.peekFirst();
        final String spoken = item.text;
        final int generation = loadGeneration;
        dispatchInFlight = true;
        speechDispatchAt = android.os.SystemClock.elapsedRealtime();
        // JSON quoting prevents recognized speech from becoming executable JS.
        website.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.sendNativeSpeech("
            + JSONObject.quote(spoken) + "," + JSONObject.quote(item.id) + "," + JSONObject.quote(item.evidence) + "))", result -> {
                if (generation != loadGeneration || !trustedChat(website)) return;
                dispatchInFlight = false;
                if ("true".equals(result) && item == pendingSpeech.peekFirst()) {
                    pendingSpeech.pollFirst();
                    if (!pendingSpeech.isEmpty()) ui.post(this::deliverQueuedSpeech);
                }
            });
    }

    boolean sendTyped(String text) {
        if (root == null || text == null || text.trim().isEmpty()) return false;
        if (pendingTyped.size() >= 24) {
            status.setText("Bubbles has 24 unprocessed text requests. Please check the connection.");
            return false;
        }
        pendingTyped.addLast(new QueuedMessage(text.trim().substring(0, Math.min(1800, text.trim().length()))));
        deliverQueuedText();
        return true;
    }
    boolean sendScreenEvidence(String question, String observation, boolean typed) {
        if (root == null || question == null || question.trim().isEmpty()) return false;
        java.util.ArrayDeque<QueuedMessage> queue = typed ? pendingTyped : pendingSpeech;
        if (queue.size() >= 24) return false;
        String evidence = observation == null || observation.trim().isEmpty()
            ? "Android returned no readable screen text." : observation;
        queue.addLast(new QueuedMessage(question.substring(0, Math.min(1800, question.length())),
            evidence.substring(0, Math.min(ScreenAwareness.MAX_OBSERVATION, evidence.length()))));
        if (typed) deliverQueuedText(); else deliverQueuedSpeech();
        return true;
    }

    private void deliverQueuedText() {
        if (!websiteReady || website == null || pendingTyped.isEmpty() || typedDispatchInFlight) return;
        final QueuedMessage item = pendingTyped.peekFirst();
        final String message = item.text;
        final int generation = loadGeneration;
        typedDispatchInFlight = true;
        typedDispatchAt = android.os.SystemClock.elapsedRealtime();
        website.evaluateJavascript(
            "Boolean(window.QuantaBubbles && window.QuantaBubbles.sendNativeText("
                + JSONObject.quote(message) + "," + JSONObject.quote(item.id) + "," + JSONObject.quote(item.evidence) + "))", result -> {
                if (generation != loadGeneration || !trustedChat(website)) return;
                typedDispatchInFlight = false;
                if ("true".equals(result) && item == pendingTyped.peekFirst()) {
                    pendingTyped.pollFirst();
                    if (!pendingTyped.isEmpty()) ui.post(this::deliverQueuedText);
                }
            });
    }
    void claimMicrophone() {
        if (websiteReady && website != null) website.evaluateJavascript("window.QuantaBubbles && window.QuantaBubbles.claimNativeVoice()", null);
    }
    private void pollWebsiteReply() {
        if (!websiteReady || website == null) return;
        if (trustedChat(website) && android.os.SystemClock.elapsedRealtime() - lastPhonePollAt > 800L) {
            lastPhonePollAt = android.os.SystemClock.elapsedRealtime();
            website.evaluateJavascript("window.QuantaBubbles && window.QuantaBubbles.syncNativePhoneStatus("
                + PhoneToolController.status().toString() + ")", null);
            if (!phoneCommandRunning) {
                phoneCommandRunning = true;
                final int generation = loadGeneration;
                website.evaluateJavascript("window.QuantaBubbles && window.QuantaBubbles.takeNativePhoneCommand()", payload -> {
                    if (generation != loadGeneration || !trustedChat(website)) { phoneCommandRunning = false; return; }
                    try {
                        Object raw = new JSONTokener(payload == null ? "null" : payload).nextValue();
                        if (!(raw instanceof String) || ((String)raw).isEmpty()) { phoneCommandRunning = false; return; }
                        JSONObject task = new JSONObject((String)raw);
                        JSONObject command = task.getJSONObject("command");
                        String localGeneration = task.getString("generation");
                        boolean restore = hideForScreenRead();
                        ui.postDelayed(() -> {
                            JSONObject receipt = BrainLearningService.runPhoneTool(command, localGeneration);
                            restoreAfterScreenRead(restore);
                            phoneCommandRunning = false;
                            if (generation != loadGeneration || !trustedChat(website)) return;
                            website.evaluateJavascript("window.QuantaBubbles && window.QuantaBubbles.completeNativePhoneCommand("
                                + receipt.toString() + ")", null);
                        }, 160L);
                    } catch (Exception error) { phoneCommandRunning = false; }
                });
            }
        }
        // The native foreground services are the authority for capture state.
        // Send only short state labels/booleans; never expose local media paths,
        // Android permissions, or owner credentials to the hosted page.
        org.json.JSONObject captureState = new org.json.JSONObject();
        android.content.SharedPreferences prefs = BrainNotes.prefs(service);
        try {
            captureState.put("screenActive", prefs.getBoolean("capture_active", false));
            captureState.put("screenRecording", prefs.getBoolean("capture_recording", false));
            captureState.put("soundActive", prefs.getBoolean("audio_active", false));
            captureState.put("nativeRecorder", true);
            String readState = prefs.getString("screen_state", "");
            captureState.put("simInspection", true);
            captureState.put("screenSharing", service.isScreenSharing());
            captureState.put("readState", readState.substring(0, Math.min(1800, readState.length())));
            captureState.put("screenState", prefs.getString("capture_state", "").substring(0,
                Math.min(160, prefs.getString("capture_state", "").length())));
            captureState.put("soundState", prefs.getString("audio_state", "").substring(0,
                Math.min(160, prefs.getString("audio_state", "").length())));
        } catch (org.json.JSONException ignored) {}
        String snapshot = captureState.toString();
        if (!snapshot.equals(lastCaptureSnapshot)) {
            lastCaptureSnapshot = snapshot;
            website.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.syncNativeCaptureStatus("
                + snapshot + "))", null);
        }
        long now = android.os.SystemClock.elapsedRealtime();
        if (now - lastRobotStatusAt > 2000L) {
            lastRobotStatusAt = now;
            website.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.ownerToolConnected())",
                value -> robotOwnerConnected = "true".equals(value));
        }
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
        // First-party website composer does not possess Android MediaProjection.
        // Drain only declared local capture intents and run the SAME native command
        // parser used by microphone speech; Android consent is never bypassed.
        website.evaluateJavascript(
            "window.QuantaBubbles && window.QuantaBubbles.drainNativeCaptureRequest()", payload -> {
                if (!websiteReady || payload == null || "null".equals(payload)) return;
                try {
                    Object raw = new JSONTokener(payload).nextValue();
                    if (!(raw instanceof String) || ((String) raw).isEmpty()) return;
                    String command = new JSONObject((String) raw).optString("text", "");
                    if (command.isEmpty() || command.length() > 1800) return;
                    VoiceCaptureCommands.Command capture = VoiceCaptureCommands.parse(command);
                    if (capture == null) {
                        status.setText("Android could not recognize a recording command.");
                        return;
                    }
                    service.startService(new Intent(service, BubblesService.class)
                        .setAction(BubblesService.ACTION_TEXT).putExtra("text", command));
                } catch (Exception error) {
                    status.setText("Android capture request failed: " + error.getClass().getSimpleName());
                }
            });
        website.evaluateJavascript("window.QuantaBubbles && window.QuantaBubbles.drainNativeScreenRequest()", payload -> {
            if (!websiteReady || payload == null || "null".equals(payload)) return;
            try {
                Object decoded = new JSONTokener(payload).nextValue();
                if (!(decoded instanceof String) || ((String)decoded).isEmpty()) return;
                String question = new JSONObject((String)decoded).optString("text", "");
                if (question.isEmpty() || question.length() > 1800 || !(service.isScreenSharing() || ScreenAwareness.sharingCommand(question) != 0 || ScreenAwareness.refersToScreen(question) || SimNetworkCommands.matches(question))) return;
                service.startService(new Intent(service, BubblesService.class)
                    .setAction(BubblesService.ACTION_TEXT).putExtra("text", question));
            } catch (Exception error) {
                status.setText("Android could not read the requested screen.");
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
        // A transient website owner-lease/network failure is NOT permission to
        // stop Android's foreground microphone. That silenced every follow-up
        // after the first instruction and made spoken "stop recording" unusable.
        // Keep the native microphone running until the user explicitly mutes it.
        website.evaluateJavascript("Boolean(window.QuantaBubbles && window.QuantaBubbles.voiceConflict())", value -> {
            if ("true".equals(value)) status.setText(
                "Robot Brain voice sync unavailable · Android listening remains active");
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
        stopLiveCall();
        if (root != null) root.setVisibility(View.GONE);
    }
    boolean hideForScreenRead() {
        boolean wasVisible = root != null && root.getVisibility() == View.VISIBLE;
        hide();
        return wasVisible;
    }
    void restoreAfterScreenRead(boolean wasVisible) {
        if (wasVisible && root != null) root.setVisibility(View.VISIBLE);
    }

    void close() {
        stopLiveCall();
        PhoneToolController.stop();
        loadGeneration++;
        ui.removeCallbacks(update);
        gptWork.shutdownNow();
        websiteReady = false;
        pendingSpeech.clear();
        pendingTyped.clear();
        dispatchInFlight = false;
        typedDispatchInFlight = false;
        if (root != null) {
            try { manager.removeView(root); } catch (RuntimeException ignored) {}
            root = null;
        }
        if (website != null) {
            android.webkit.CookieManager.getInstance().flush();
            website.stopLoading();
            website.loadUrl("about:blank");
            website.destroy();
            website = null;
        }
    }
}
