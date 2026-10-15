package org.quantaphi.bubbles;

/**
 * Assembles adjacent Vosk final clauses into one conversational turn.
 * Speech recognizers finalize individual phrases at short pauses; without
 * this buffer Bubbles submits half of the owner's sentence as a new request.
 * Mutated on the Android main thread, independent of the audio decoder.
 */
final class SpeechTurnBuffer {
    private final StringBuilder text = new StringBuilder();
    void append(String phrase) {
        if (phrase == null) return;
        String next = phrase.replaceAll("\\s+", " ").trim();
        if (next.isEmpty()) return;
        if (text.length() > 0) text.append(' ');
        text.append(next, 0, Math.min(next.length(), Math.max(0, 1800 - text.length())));
    }
    boolean hasPending() {return text.length() > 0;}
    String take() {
        String result = text.toString().trim();
        text.setLength(0);
        return result;
    }
    void clear() {text.setLength(0);}
}
