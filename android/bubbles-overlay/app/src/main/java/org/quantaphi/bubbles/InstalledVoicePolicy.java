package org.quantaphi.bubbles;

import android.speech.tts.Voice;
import java.util.Locale;
import java.util.Set;

/**
 * Uses an installed speech engine's metadata to prefer high-quality English
 * voices that work without network access. Android's "high quality" flag does
 * not prove the voice is neural; a model and engine must be verified separately.
 * This policy downloads nothing, makes no API call and never replaces a
 * person's explicitly selected voice.
 */
final class InstalledVoicePolicy {
    private InstalledVoicePolicy() {}

    static Voice bestOfflineEnglish(Set<Voice> voices) {
        if (voices == null) return null;
        Voice winner = null;
        int highest = Integer.MIN_VALUE;
        for (Voice voice : voices) {
            if (voice == null || voice.getLocale() == null
                    || voice.isNetworkConnectionRequired()
                    || !"en".equals(voice.getLocale().getLanguage())
                    || voice.getQuality() < Voice.QUALITY_HIGH) continue;
            String country = voice.getLocale().getCountry();
            int accent = "GB".equalsIgnoreCase(country) ? 60
                    : "US".equalsIgnoreCase(country) ? 35 : 0;
            int quality = voice.getQuality() == Voice.QUALITY_VERY_HIGH ? 50 : 20;
            // Low latency matters for short, interruptible spoken answers.
            int latency = Math.max(0, Voice.LATENCY_VERY_HIGH - voice.getLatency());
            int score = accent + quality + latency;
            if (score > highest || (score == highest && winner != null
                    && voice.getName().compareTo(winner.getName()) < 0)) {
                winner = voice;
                highest = score;
            }
        }
        return winner;
    }

    static String description(Voice voice) {
        if (voice == null) return "System voice";
        String quality = voice.getQuality() >= Voice.QUALITY_HIGH
                ? "high-quality engine voice" : "standard engine voice";
        String network = voice.isNetworkConnectionRequired()
                ? "network required" : "available offline";
        return quality + " · " + network;
    }
}
