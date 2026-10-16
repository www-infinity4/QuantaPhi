package org.quantaphi.bubbles;

import java.util.Locale;

/**
 * Checks offline recognition against actual microphone energy. Vosk can return
 * fluent text even when only fan noise, silence or residual speaker audio was
 * heard. Nothing rejected here is forwarded to the site, Robot Brain or TTS.
 * Typed commands are deliberately not filtered.
 */
final class SpeechTranscriptGate {
    private SpeechTranscriptGate() {}

    static boolean plausible(String raw, long voicedMillis) {
        if (raw == null || voicedMillis < 320L) return false;
        String value = raw.trim().replaceAll("\\s+", " ");
        if (value.isEmpty() || value.length() > 1800) return false;
        // The user can paste tokens/codes in the composer, but a long random
        // sequence should never be synthesized by the microphone pipeline.
        if (value.matches("(?i).*(?:[0-9a-f]{32,}|[0-9]{12,}).*")) return false;
        String[] tokens = value.toLowerCase(Locale.ROOT).split(" ");
        String last = "";
        int repeats = 0;
        for (String token : tokens) {
            String word = token.replaceAll("[^\\p{L}\\p{N}]", "");
            if (word.isEmpty()) continue;
            if (word.equals(last)) repeats++;
            else { last = word; repeats = 1; }
            if (repeats >= 4) return false; // "who who who who ..."
        }
        return true;
    }
}
