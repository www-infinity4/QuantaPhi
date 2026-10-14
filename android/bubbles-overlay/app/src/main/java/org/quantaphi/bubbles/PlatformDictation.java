package org.quantaphi.bubbles;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import java.util.ArrayList;
import java.util.Locale;

/**
 * User-opt-in phone speech service with automatic turn restarts. May use the
 * installed recognition provider's network service; audio handling and privacy
 * follow that provider's policy. This is NOT a persistent single microphone
 * stream: for gapless offline capture choose the bundled Vosk mode instead.
 * No app-level audio data is posted to QuantaPhi's backend.
 */
final class PlatformDictation {
    interface Callbacks {
        void partial(String text);
        void recognized(String text);
        void energy(float level);
        void failure(String explanation);
        void unavailable(String explanation);
    }
    private final Context context;
    private final Callbacks callbacks;
    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private boolean running;
    private int consecutiveErrors;
    private long startedAt;
    private final Runnable retry = this::listen;

    PlatformDictation(Context context, Callbacks callbacks) {
        this.context = context;
        this.callbacks = callbacks;
    }
    static boolean isSupported(Context context) {
        return SpeechRecognizer.isRecognitionAvailable(context);
    }
    boolean start() {
        if (!isSupported(context)) return false;
        if (running) return true;
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(context);
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) {callbacks.energy(.10f);}
                @Override public void onBeginningOfSpeech() {callbacks.energy(.4f);}
                @Override public void onRmsChanged(float db) {
                    callbacks.energy(Math.max(.05f, Math.min(1f, (db + 2) / 13f)));
                }
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onEvent(int type, Bundle params) {}
                @Override public void onPartialResults(Bundle extras) {
                    if (!running) return;
                    String best = best(extras);
                    if (!best.isEmpty()) callbacks.partial(best);
                }
                @Override public void onResults(Bundle extras) {
                    if (!running) return;
                    consecutiveErrors = 0;
                    String best = best(extras);
                    if (!best.isEmpty()) callbacks.recognized(best);
                    next(250);
                }
                @Override public void onError(int code) {
                    if (!running) return;
                    // Expected end-of-phrase/no-match should not be treated as
                    // a provider failure. Continuous use restarts automatically.
                    if (code == SpeechRecognizer.ERROR_NO_MATCH
                            || code == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                        consecutiveErrors = 0;
                        next(250);
                        return;
                    }
                    consecutiveErrors++;
                    String problem = "Phone speech recognizer error " + code;
                    callbacks.failure(problem);
                    if (code == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS
                            || consecutiveErrors >= 5) {
                        stop();
                        callbacks.unavailable(problem + "; returning to offline recognition");
                        return;
                    }
                    next(Math.min(3200, 350 * consecutiveErrors));
                }
            });
            running = true;
            consecutiveErrors = 0;
            listen();
            return true;
        } catch (RuntimeException ex) {
            stop();
            return false;
        }
    }
    private static String best(Bundle extras) {
        if (extras == null) return "";
        ArrayList<String> results = extras.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return results == null || results.isEmpty() || results.get(0) == null
                ? "" : results.get(0).trim();
    }
    private void listen() {
        if (!running || recognizer == null) return;
        try {
            Intent request = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            request.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            request.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.US.toLanguageTag());
            request.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            request.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            // Never force offline mode: the opt-in phone recognizer may use
            // a more accurate speech provider when the device is online.
            request.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false);
            startedAt = android.os.SystemClock.elapsedRealtime();
            recognizer.startListening(request);
        } catch (RuntimeException ex) {
            callbacks.failure("Phone speech service failed to start: " + ex.getClass().getSimpleName());
            stop();
            callbacks.unavailable("Phone speech service unavailable; offline recognition restored");
        }
    }
    private void next(long delayMs) {
        main.removeCallbacks(retry);
        if (running) main.postDelayed(retry, delayMs);
    }
    void stop() {
        running = false;
        main.removeCallbacks(retry);
        if (recognizer != null) {
            try {recognizer.cancel();} catch (RuntimeException ignored) {}
            try {recognizer.destroy();} catch (RuntimeException ignored) {}
            recognizer = null;
        }
    }
}
