package org.quantaphi.bubbles;

/** JDK-only checks for the conservative device-playback decision boundary. */
public final class SpeechSourceGateCheck {
    private static void check(boolean actual, boolean expected) {
        if(actual != expected) throw new AssertionError("Unexpected playback-gate decision");
    }
    public static void main(String[] args) {
        check(SpeechSourceGate.mayDispatch(false, true, false), false);
        check(SpeechSourceGate.mayDispatch(false, true, true), true);
        check(SpeechSourceGate.mayDispatch(false, false, false), true);
        check(SpeechSourceGate.mayDispatch(true, true, false), true);
    }
}
