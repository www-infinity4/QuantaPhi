package org.quantaphi.bubbles;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.Executor;

/**
 * Offline speech-output plumbing: recognized text -> LocalBrainSession ->
 * streaming transcript + coherent sentence chunks for a local TTS engine.
 *
 * This class never opens an HTTP connection, records audio, grants permissions,
 * or triggers a Robot Brain/Android action. Its caller must explicitly select
 * local conversation mode AFTER native capture/tool intents are handled.
 *
 * The ui executor MUST serialize callbacks on the Android main thread.
 * This is the pipeline adapter, not a model or an installed TTS engine.
 */
public final class LocalVoiceBridge {
    public interface Surface {
        /** Render a generated text fragment in the existing floating chat. */
        void onText(String fragment);
        /** Queue a complete phrase for the installed/offline speech engine. */
        void onSpeechChunk(String phrase);
        /** Display actual inference outcome; never invent a completed turn. */
        void onFinished(LocalBrainSession.Status status);
    }

    private final LocalBrainSession session;
    private final Executor ui;

    public LocalVoiceBridge(LocalBrainSession session, Executor mainThreadExecutor) {
        this.session = Objects.requireNonNull(session, "session");
        this.ui = Objects.requireNonNull(mainThreadExecutor, "mainThreadExecutor");
    }

    public LocalBrainSession.Status submit(String transcript, Surface surface) {
        Objects.requireNonNull(surface, "surface");
        final SpeechBuffer speech = new SpeechBuffer();
        return session.submit(transcript, new LocalBrainSession.Listener() {
            @Override public void onToken(String fragment) {
                // LocalBrainSession executes its token callbacks on a worker.
                final List<String> sentences = speech.append(fragment);
                ui.execute(() -> {
                    surface.onText(fragment);
                    for (String sentence : sentences) surface.onSpeechChunk(sentence);
                });
            }

            @Override public void onFinished(LocalBrainSession.Status status, String completeText) {
                // Never speak a trailing incomplete response if generation failed.
                final String tail = status == LocalBrainSession.Status.COMPLETE
                        ? speech.finish() : "";
                ui.execute(() -> {
                    if (!tail.isEmpty()) surface.onSpeechChunk(tail);
                    surface.onFinished(status);
                });
            }
        });
    }

    public void cancel() { session.cancel(); }
    public boolean isReady() { return session.isReady(); }

    /**
     * Speech synthesis is sentence/chunk based, not token based. Streaming token
     * callbacks can split any word, while playback needs a useful text span.
     */
    static final class SpeechBuffer {
        private static final int MAX_CHUNK_CHARS = 180;
        private final StringBuilder pending = new StringBuilder();

        List<String> append(String fragment) {
            List<String> ready = new ArrayList<>();
            if (fragment == null || fragment.isEmpty()) return ready;
            pending.append(fragment);
            while (true) {
                int boundary = sentenceBoundary();
                if (boundary < 0 && pending.length() >= MAX_CHUNK_CHARS) {
                    boundary = pending.lastIndexOf(" ", MAX_CHUNK_CHARS - 1);
                    if (boundary < 24) boundary = MAX_CHUNK_CHARS;
                    else boundary += 1;
                }
                if (boundary <= 0) break;
                String phrase = pending.substring(0, boundary).trim();
                pending.delete(0, boundary);
                if (!phrase.isEmpty()) ready.add(phrase);
            }
            return ready;
        }

        private int sentenceBoundary() {
            for (int i = 0; i < pending.length(); i++) {
                char value = pending.charAt(i);
                if (value != '.' && value != '!' && value != '?') continue;
                if (i + 1 < pending.length()) {
                    char next = pending.charAt(i + 1);
                    if (!Character.isWhitespace(next)) continue;
                }
                return i + 1;
            }
            return -1;
        }

        String finish() {
            String finalPhrase = pending.toString().trim();
            pending.setLength(0);
            return finalPhrase;
        }
    }
}
