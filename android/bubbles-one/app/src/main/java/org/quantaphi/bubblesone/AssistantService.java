package org.quantaphi.bubblesone;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.*;
import android.provider.Settings;
import android.speech.*;
import android.speech.tts.*;
import android.view.*;
import android.view.inputmethod.InputMethodManager;
import android.widget.*;
import java.util.*;
import java.util.concurrent.*;

public final class AssistantService extends Service implements RecognitionListener {
    private static final String CHANNEL = "bubbles_one_voice";
    private static volatile AssistantService current;
    static void refreshIntegration(String message) {
        AssistantService service = current;
        if (service != null) service.main.post(() -> {
            if (!service.destroyed) { service.refreshText(); service.updateStatus(message.length() > 180 ? "Termux result received in chat." : message); }
        });
    }
    private static final String STOP = "org.quantaphi.bubblesone.STOP";
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private final ArrayDeque<String> pending = new ArrayDeque<>();
    private final Runnable restart = this::listen;
    private LocalNotebook notebook;
    private WindowManager windows;
    private WindowManager.LayoutParams orbParams;
    private TextView orb;
    private LinearLayout panel;
    private TextView conversation, state;
    private ScrollView scroll;
    private SpeechRecognizer recognizer;
    private TextToSpeech voice;
    private boolean destroyed, listening, busy, speaking, voiceReady;
    private int speechErrors, followupTurns;
    private long followupUntil;
    private String lastReply = "";

    @Override public void onCreate() {
        super.onCreate();
        notebook = new LocalNotebook(this);
        current = this;
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL, "Bubbles voice", NotificationManager.IMPORTANCE_LOW));
        voice = new TextToSpeech(this, code -> {
            voiceReady = code == TextToSpeech.SUCCESS && voice != null
                    && voice.setLanguage(Locale.US) >= TextToSpeech.LANG_AVAILABLE;
            if (voiceReady) voice.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { }
                @Override public void onDone(String id) { main.post(() -> finishSpeaking(id)); }
                @Override public void onError(String id) { main.post(() -> finishSpeaking(id)); }
            });
            else main.post(() -> updateStatus("No working Android voice is installed. Text chat remains available."));
        });
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && STOP.equals(intent.getAction())) {
            getSharedPreferences("bubbles-one", MODE_PRIVATE).edit().putBoolean("enabled", false).apply();
            stopSelf(); return START_NOT_STICKY;
        }
        if (!getSharedPreferences("bubbles-one", MODE_PRIVATE).getBoolean("enabled", false)
                || checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
                || !Settings.canDrawOverlays(this)) {
            stopSelf(); return START_NOT_STICKY;
        }
        Notification notification = notification();
        if (Build.VERSION.SDK_INT >= 29) startForeground(900, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        else startForeground(900, notification);
        if (orb == null) showOrb();
        if (recognizer == null) initRecognition();
        return START_STICKY;
    }
    private Notification notification() {
        Intent stop = new Intent(this, AssistantService.class).setAction(STOP);
        PendingIntent stopAction = PendingIntent.getService(this, 0, stop,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent openAction = PendingIntent.getActivity(this, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new Notification.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.ic_btn_speak_now)
                .setContentTitle("Bubbles One · listening")
                .setContentText("Tap floating circle to chat · private notes on this phone")
                .setContentIntent(openAction).setOngoing(true)
                .addAction(android.R.drawable.ic_delete, "Stop Bubbles", stopAction).build();
    }
    private int dp(int size) { return (int)(getResources().getDisplayMetrics().density * size + .5f); }
    private GradientDrawable background(int color, int radius) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(color); drawable.setCornerRadius(dp(radius)); return drawable;
    }
    private void showOrb() {
        windows = (WindowManager) getSystemService(WINDOW_SERVICE);
        orb = new TextView(this);
        orb.setText("B"); orb.setTextSize(25); orb.setGravity(Gravity.CENTER);
        orb.setTextColor(Color.WHITE); orb.setBackground(background(0xff6732aa, 80));
        orb.setContentDescription("Bubbles One. Tap for chat, drag to move.");
        orbParams = new WindowManager.LayoutParams(dp(58), dp(58),
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        orbParams.gravity = Gravity.TOP | Gravity.LEFT;
        orbParams.x = Math.max(0, getResources().getDisplayMetrics().widthPixels - dp(62));
        orbParams.y = dp(230);
        orb.setOnTouchListener(new View.OnTouchListener() {
            private float downX, downY; private int originX, originY;
            private boolean dragged;
            @Override public boolean onTouch(View view, android.view.MotionEvent event) {
                if (event.getAction() == MotionEvent.ACTION_DOWN) {
                    downX = event.getRawX(); downY = event.getRawY();
                    originX = orbParams.x; originY = orbParams.y; dragged = false; return true;
                }
                if (event.getAction() == MotionEvent.ACTION_MOVE) {
                    int x = (int)(event.getRawX() - downX), y = (int)(event.getRawY() - downY);
                    if (Math.abs(x) + Math.abs(y) > dp(10)) dragged = true;
                    if (dragged) {
                        orbParams.x = Math.max(0, Math.min(getResources().getDisplayMetrics().widthPixels - dp(58), originX + x));
                        orbParams.y = Math.max(0, Math.min(getResources().getDisplayMetrics().heightPixels - dp(58), originY + y));
                        windows.updateViewLayout(orb, orbParams);
                    }
                    return true;
                }
                if (event.getAction() == MotionEvent.ACTION_UP) {
                    if (!dragged) togglePanel();
                    return true;
                }
                return false;
            }
        });
        windows.addView(orb, orbParams);
    }
    private TextView label(String text, int size) {
        TextView view = new TextView(this); view.setText(text);
        view.setTextSize(size); view.setTextColor(0xff382747); return view;
    }
    private void togglePanel() {
        if (panel != null) {
            windows.removeView(panel); panel = null; conversation = null; state = null; scroll = null;
            return;
        }
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(14), dp(12), dp(14), dp(14));
        root.setBackground(background(0xfffaf7fc, 22));
        LinearLayout header = new LinearLayout(this);
        header.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = label("Bubbles One", 21);
        header.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1));
        Button hide = new Button(this); hide.setText("Hide"); hide.setAllCaps(false);
        hide.setOnClickListener(v -> togglePanel());
        header.addView(hide);
        root.addView(header);
        // One optional in-chat workspace shortcut; natural language remains primary.
        Button apps = new Button(this); apps.setText("Apps & Code"); apps.setAllCaps(false);
        apps.setOnClickListener(v -> showAppsHelp());
        root.addView(apps);
        state = label("Listening for Bubbles…", 13); root.addView(state);
        scroll = new ScrollView(this);
        conversation = label(notebook.recent(), 16);
        conversation.setPadding(0, dp(12), 0, dp(12));
        scroll.addView(conversation);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout composer = new LinearLayout(this);
        EditText input = new EditText(this);
        input.setHint("Talk to Bubbles or type here"); input.setSingleLine(false);
        input.setMaxLines(3); input.setTextSize(16);
        composer.addView(input, new LinearLayout.LayoutParams(0, -2, 1));
        Button send = new Button(this); send.setText("Send"); send.setAllCaps(false);
        send.setOnClickListener(v -> {
            String words = input.getText().toString().trim();
            if (words.isEmpty()) return;
            input.setText("");
            submit(words);
        });
        composer.addView(send);
        root.addView(composer);
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                Math.min(getResources().getDisplayMetrics().widthPixels - dp(12), dp(440)),
                Math.min(getResources().getDisplayMetrics().heightPixels - dp(100), dp(610)),
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        params.y = dp(28);
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;
        panel = root; windows.addView(panel, params);
        updateStatus(listening ? "Listening. Say Bubbles to start talking." : "Voice checking; type any time.");
    }
    private void refreshText() {
        if (conversation == null) return;
        conversation.setText(notebook.recent());
        if (scroll != null) scroll.post(() -> scroll.fullScroll(View.FOCUS_DOWN));
    }
    private void updateStatus(String message) { if (state != null) state.setText(message); }
    private void initRecognition() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            updateStatus("Android speech recognition is unavailable. Type in the chat.");
            return;
        }
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(this);
            listen();
        } catch (RuntimeException error) {
            updateStatus("Speech recognizer could not start. Type in chat.");
        }
    }
    private void listen() {
        if (destroyed || recognizer == null || speaking || listening) return;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return;
        Intent request = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        request.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        request.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US");
        request.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        try {
            listening = true;
            recognizer.startListening(request);
            updateStatus("Listening. Say Bubbles, then your question.");
        } catch (RuntimeException error) {
            listening = false;
            scheduleListen(2500);
        }
    }
    private void scheduleListen(long delay) {
        if (destroyed || speaking) return;
        main.removeCallbacks(restart);
        main.postDelayed(restart, delay);
    }
    @Override public void onReadyForSpeech(Bundle params) { speechErrors = 0; }
    @Override public void onBeginningOfSpeech() { updateStatus("Listening to you…"); }
    @Override public void onRmsChanged(float rms) { }
    @Override public void onBufferReceived(byte[] buffer) { }
    @Override public void onEndOfSpeech() { updateStatus("Finishing what you said…"); }
    @Override public void onError(int error) {
        listening = false;
        if (speaking || destroyed) return;
        long delay = Math.min(8000, 1000L * (1 + Math.min(7, ++speechErrors)));
        if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
            updateStatus("Android microphone permission is unavailable. Reopen setup.");
            return;
        }
        if (error == SpeechRecognizer.ERROR_CLIENT || error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY)
            updateStatus("Voice restarting. Text still works.");
        scheduleListen(delay);
    }
    @Override public void onResults(Bundle results) {
        listening = false;
        ArrayList<String> choices = results == null ? null :
                results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (choices != null && !choices.isEmpty()) processSpeech(choices.get(0));
        scheduleListen(900);
    }
    @Override public void onPartialResults(Bundle partial) { }
    @Override public void onEvent(int type, Bundle params) { }
    private void processSpeech(String heard) {
        if (heard == null) return;
        String words = heard.trim();
        java.util.regex.Matcher wake = java.util.regex.Pattern.compile(
                "(?i)^(?:(?:hey|okay|ok|hi)\\s+)?bubbles(?:\\s+one)?\\b[,:.!?\\s]*(.*)$").matcher(words);
        boolean addressed = wake.matches();
        if (addressed) {
            words = wake.group(1).trim();
            followupTurns = 0;
            followupUntil = android.os.SystemClock.elapsedRealtime() + 30000L;
        } else if (android.os.SystemClock.elapsedRealtime() <= followupUntil && followupTurns < 4) {
            followupTurns++;
        } else return;
        if (words.isEmpty()) { say("I'm listening."); return; }
        submit(words);
    }
    private void showAppsHelp() {
        notebook.add("tool", "Apps & Code: say open Termux; run python: print(2+2); run javascript: console.log(2+2); find Calculator on Google Play; import a file; or download https://example.com/guide.pdf. Custom code must be approved. Android controls installing apps. GitHub and Cloudflare writes need separate owner authorization.");
        refreshText(); updateStatus("Apps & Code instructions added to the conversation.");
    }
    private void confirmCode(String language, String code) {
        android.app.AlertDialog dialog = new android.app.AlertDialog.Builder(this)
            .setTitle("Run " + language + " in Termux?")
            .setMessage("This code will run with your Termux account permissions. Check it before approving.\n\n" + code.substring(0, Math.min(code.length(), 1600)))
            .setNegativeButton("Cancel", (d, which) -> { notebook.add("tool", "Termux code was not run; owner cancelled."); refreshText(); })
            .setPositiveButton("Run code", (d, which) -> reply(TermuxBridge.run(this, language, code)))
            .create();
        if (dialog.getWindow() != null) dialog.getWindow().setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY);
        dialog.show();
    }
    private void confirmDownload(String url) {
        android.app.AlertDialog dialog = new android.app.AlertDialog.Builder(this)
            .setTitle("Download this file?")
            .setMessage(url + "\n\nAndroid will manage the download. This does not install an APK or open the downloaded code.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Download", (d, which) -> reply(AppBridge.downloadFile(this, url)))
            .create();
        if (dialog.getWindow() != null) dialog.getWindow().setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY);
        dialog.show();
    }
    private void askToImportFile() {
        try {
            Intent intent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("pick_file", true);
            startActivity(intent);
            updateStatus("Android file picker requested; choose a file to import into Bubbles.");
        } catch (RuntimeException e) { reply("Android could not open the file picker."); }
    }
    private void submit(String words) {
        if (destroyed || words == null || words.trim().isEmpty()) return;
        final String utterance = words.trim();
        notebook.add("user", utterance);
        refreshText();
        String lower = utterance.toLowerCase(Locale.US);
        // These are real local Android tools, not a language model pretending it used them.
        if (lower.matches("^(?:please )?(?:open|launch|show)(?: the)? termux[.!?]?$")) {
            reply(TermuxBridge.open(this)); return;
        }
        if (lower.matches("^(?:apps(?: and| &) code|apps help|termux help|developer help)[.!?]?$")) {
            showAppsHelp(); return;
        }
        if (lower.matches("^(?:please )?(?:import|upload|attach|pick|choose)(?: a| the)? file[.!?]?$")) {
            askToImportFile(); return;
        }
        java.util.regex.Matcher appSearch = java.util.regex.Pattern.compile(
            "(?i)^(?:find|search(?: for)?|install|download|get)\\s+(?:the\\s+)?(.{2,80}?)\\s+(?:app\\s+)?(?:on|from|in)\\s+(?:google\\s+)?play(?:\\s+store)?[.!?]?$").matcher(utterance);
        if (appSearch.matches()) { reply(AppBridge.findOnPlay(this, appSearch.group(1))); return; }
        java.util.regex.Matcher codeRun = java.util.regex.Pattern.compile(
            "(?is)^(?:please\\s+)?(?:run|execute)\\s+(python3?|javascript|js|node|bash|shell|sh|ruby|php|perl|lua)\\s*:\\s*(.{1,7000})$").matcher(utterance);
        if (codeRun.matches()) { confirmCode(codeRun.group(1), codeRun.group(2)); return; }
        java.util.regex.Matcher download = java.util.regex.Pattern.compile(
            "(?i)^(?:please\\s+)?download\\s+(https://\\S{4,500})$").matcher(utterance);
        if (download.matches()) { confirmDownload(download.group(1)); return; }
        if (lower.startsWith("remember that ") || lower.startsWith("make a note ")) {
            String note = utterance.substring(lower.startsWith("remember that ") ? 14 : 12).trim();
            if (note.isEmpty()) { say("What would you like me to remember?"); return; }
            notebook.add("note", note);
            reply("Saved that note privately on this phone."); return;
        }
        if (lower.matches("^(?:start|begin|stop) (?:the )?(?:screen )?recording[.!?]?$")) {
            reply("Use your separate screen recorder. When it finishes, share its video to Bubbles One. I cannot claim its recording started without a real integration.");
            return;
        }
        if (pending.size() >= 8) { reply("I still have earlier questions to answer. Please repeat that one."); return; }
        pending.addLast(utterance);
        runNext();
    }
    private void runNext() {
        if (destroyed || busy || pending.isEmpty()) return;
        busy = true;
        String question = pending.removeFirst(), history = notebook.context();
        updateStatus("Thinking about your question…");
        network.execute(() -> {
            String response;
            try { response = CloudChat.ask(question, history); }
            catch (Exception error) { response = "I couldn't get an AI answer. Your question was saved, but I haven't completed it. Please retry."; }
            final String answer = response;
            main.post(() -> {
                busy = false;
                if (destroyed) return;
                reply(answer);
                runNext();
            });
        });
    }
    private void reply(String answer) {
        notebook.add("assistant", answer); refreshText();
        say(answer);
    }
    private void say(String answer) {
        if (destroyed) return;
        updateStatus("Bubbles answered.");
        lastReply = answer;
        if (voice == null || !voiceReady) { scheduleListen(600); return; }
        speaking = true; main.removeCallbacks(restart);
        if (recognizer != null && listening) {
            try { recognizer.cancel(); } catch (RuntimeException ignored) { }
            listening = false;
        }
        String id = UUID.randomUUID().toString();
        // Speak short, human-readable text; long technical detail remains on screen.
        String spoken = answer.replaceAll("https?://\\S+", "a source link")
                .replaceAll("[*_#`]", "").replaceAll("\\s+", " ").trim();
        if (spoken.length() > 550) spoken = spoken.substring(0, 550);
        int result = voice.speak(spoken, TextToSpeech.QUEUE_FLUSH, null, id);
        if (result != TextToSpeech.SUCCESS) { speaking = false; scheduleListen(750); }
    }
    private void finishSpeaking(String id) {
        if (destroyed) return;
        speaking = false;
        scheduleListen(700);
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        destroyed = true;
        current = null;
        main.removeCallbacksAndMessages(null);
        if (recognizer != null) { try { recognizer.cancel(); recognizer.destroy(); } catch (RuntimeException ignored) { } }
        if (voice != null) voice.shutdown();
        if (windows != null && panel != null) { try { windows.removeView(panel); } catch (RuntimeException ignored) { } }
        if (windows != null && orb != null) { try { windows.removeView(orb); } catch (RuntimeException ignored) { } }
        network.shutdownNow();
        if (notebook != null) notebook.close();
        super.onDestroy();
    }
}
