package org.quantaphi.bubbles;

/** Prevent ambient phone playback from silently dispatching chat or code jobs. */
final class SpeechSourceGate {
    private SpeechSourceGate() {}
    static boolean mayDispatch(boolean typed, boolean phonePlaybackActive, boolean directlyAddressed) {
        // Typed controls are user-originated. Microphone utterances received
        // while media plays are ambiguous unless Bubbles was directly addressed.
        return typed || !phonePlaybackActive || directlyAddressed;
    }
}
