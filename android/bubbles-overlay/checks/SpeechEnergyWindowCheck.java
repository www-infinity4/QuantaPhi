package org.quantaphi.bubbles;

/** Runnable with plain javac; no Android runtime or microphone required. */
public final class SpeechEnergyWindowCheck {
    private static void equal(long expected, long actual, String scenario) {
        if (expected != actual) throw new AssertionError(scenario +
            ": expected " + expected + "ms, got " + actual + "ms");
    }

    public static void main(String[] args) {
        SpeechEnergyWindow evidence = new SpeechEnergyWindow();
        // 4 x 100ms voice frames exceed the existing 320ms transcription gate.
        for (int i = 0; i < 4; i++) evidence.observe(.20f, 1600);
        equal(400, evidence.takeVoicedMillis(), "normal utterance");
        equal(0, evidence.takeVoicedMillis(), "finalization clears evidence");

        // A natural 800ms word gap should not erase the surrounding sentence.
        for (int i = 0; i < 4; i++) evidence.observe(.20f, 1600);
        for (int i = 0; i < 8; i++) evidence.observe(.01f, 1600);
        for (int i = 0; i < 2; i++) evidence.observe(.20f, 1600);
        equal(600, evidence.takeVoicedMillis(), "short conversational pause");

        // Old behavior accumulated 100ms of noise forever: after four bursts
        // hours apart, a bogus final result qualified as speech.
        for (int burst = 0; burst < 4; burst++) {
            evidence.observe(.20f, 1600);
            for (int i = 0; i < 21; i++) evidence.observe(.01f, 1600);
        }
        equal(0, evidence.takeVoicedMillis(), "distant noise never accumulates");

        for (int i = 0; i < 5; i++) evidence.observe(.25f, 1600);
        evidence.reset(); // TTS speaking or playback echo invalidates the evidence.
        equal(0, evidence.takeVoicedMillis(), "speaker echo must be discarded");
        System.out.println("SpeechEnergyWindow: all checks passed");
    }
}
