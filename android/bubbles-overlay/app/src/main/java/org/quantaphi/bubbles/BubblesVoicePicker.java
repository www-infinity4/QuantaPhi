package org.quantaphi.bubbles;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.widget.Toast;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Consumer;

/**
 * Lists actual voices supplied by the phone's selected Android TTS engine.
 * Does not download proprietary voices, impersonate ChatGPT Live, or require
 * a paid TTS API. All preferences stay inside Bubbles' private app storage.
 */
final class BubblesVoicePicker {
    static final String PREFS = "bubbles-voice";
    static final String VOICE_NAME = "voice_name";
    static final String ENGINE = "engine_package";

    private final Activity activity;
    private final Consumer<String> status;
    private TextToSpeech preview;

    private BubblesVoicePicker(Activity activity, Consumer<String> status) {
        this.activity = activity;
        this.status = status;
    }

    static void show(Activity activity, Consumer<String> status) {
        new BubblesVoicePicker(activity, status).load();
    }

    private void load() {
        status.accept("Loading voices installed on this phone…");
        preview = new TextToSpeech(activity, result -> new Handler(Looper.getMainLooper()).post(() -> {
            if (preview == null) return;
            if (result != TextToSpeech.SUCCESS) {
                status.accept("Android's speech engine did not initialize. Try another installed TTS engine.");
                close();
                return;
            }
            showVoices();
        }));
    }

    private void showVoices() {
        final Set<Voice> all;
        try { all = preview.getVoices(); }
        catch (Exception error) {
            status.accept("This speech engine could not list its voices.");
            close();
            return;
        }
        if (all == null || all.isEmpty()) {
            status.accept("No voices available. Install/download a voice in Android TTS settings.");
            close();
            return;
        }
        List<Voice> voices = new ArrayList<>(all);
        voices.removeIf(v -> v == null || v.getLocale() == null);
        voices.sort(Comparator.comparingInt((Voice v) -> "en".equals(v.getLocale().getLanguage()) ? 0 : 1)
            .thenComparing(Voice::isNetworkConnectionRequired)
            .thenComparing(v -> v.getLocale().getDisplayName(Locale.US), String.CASE_INSENSITIVE_ORDER)
            .thenComparing(Voice::getName));
        String selected = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
            .getString(VOICE_NAME, "");
        String[] labels = new String[voices.size() + 1];
        labels[0] = (selected.isEmpty() ? "✓ " : "") + "System default voice";
        for (int i = 0; i < voices.size(); i++) {
            Voice v = voices.get(i);
            String label = v.getLocale().getDisplayName(Locale.US) + " · " + v.getName()
                + (v.isNetworkConnectionRequired() ? " · network" : " · on-device");
            labels[i + 1] = (selected.equals(v.getName()) ? "✓ " : "") + label;
        }
        new AlertDialog.Builder(activity)
            .setTitle("Choose Bubbles voice · " + preview.getDefaultEngine())
            .setItems(labels, (dialog, index) -> select(index == 0 ? null : voices.get(index - 1)))
            .setNegativeButton("Cancel", (dialog, which) -> close())
            .setOnCancelListener(dialog -> close())
            .show();
        status.accept("Select a voice to save and hear a sample.");
    }

    private void select(Voice voice) {
        if (preview == null) return;
        String engine = preview.getDefaultEngine();
        String name = voice == null ? "" : voice.getName();
        boolean saved = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE).edit()
            .putString(VOICE_NAME, name)
            .putString(ENGINE, engine == null ? "" : engine)
            .commit();
        if (!saved) {
            status.accept("Could not save the voice preference.");
            close();
            return;
        }
        int ok = voice == null ? preview.setLanguage(Locale.US) : preview.setVoice(voice);
        if (ok < 0) {
            status.accept("Voice chosen, but this engine could not play it. Download the voice data in settings.");
        } else {
            preview.setPitch(1f);
            preview.setSpeechRate(1f);
            preview.speak("Hello. I'm Bubbles. I can help with QuantaPhi and your projects.",
                TextToSpeech.QUEUE_FLUSH, null, "bubbles-voice-sample");
            status.accept("Voice saved. Sample playing. Bubbles will use this voice for spoken replies.");
        }
        // Refresh the active service without stopping its microphone session.
        // If Bubbles is not running, its onStartCommand stops the temporary service.
        try {
            activity.startService(new Intent(activity, BubblesService.class)
                .setAction(BubblesService.ACTION_REFRESH_VOICE));
        } catch (Exception error) {
            status.accept("Voice saved. Restart the Bubbles assistant to apply it.");
        }
        new Handler(Looper.getMainLooper()).postDelayed(this::close, 8000);
    }

    private void close() {
        if (preview != null) {
            preview.stop();
            preview.shutdown();
            preview = null;
        }
    }
}
