package org.quantaphi.bubbles;

/**
 * Records recent microphone energy for a single Vosk utterance.
 * Vosk can finalize plausible words after quiet room sounds. Never carry
 * sporadic noises over an unlimited listening session as evidence of speech.
 * This is an acoustic plausibility check, not speaker identification.
 *
 * Only the microphone decoder thread accesses this object.
 */
final class SpeechEnergyWindow {
    private static final int SAMPLE_RATE = 16000;
    private static final long MAX_VOICED_SAMPLES = SAMPLE_RATE * 30L;
    private static final long QUIET_RESET_SAMPLES = SAMPLE_RATE * 2L;
    private long voicedSamples;
    private long quietSamples;

    void observe(float energy, int count) {
        if (count <= 0) return;
        if (energy > .08f) {
            quietSamples = 0L;
            voicedSamples = Math.min(MAX_VOICED_SAMPLES, voicedSamples + count);
        } else {
            quietSamples = Math.min(QUIET_RESET_SAMPLES, quietSamples + count);
            if (quietSamples >= QUIET_RESET_SAMPLES) voicedSamples = 0L;
        }
    }

    long takeVoicedMillis() {
        long milliseconds = voicedSamples * 1000L / SAMPLE_RATE;
        reset();
        return milliseconds;
    }

    void reset() {
        voicedSamples = 0L;
        quietSamples = 0L;
    }
}
