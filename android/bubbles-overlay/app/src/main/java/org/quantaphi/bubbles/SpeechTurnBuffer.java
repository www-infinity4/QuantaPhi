package org.quantaphi.bubbles;

/**
 * Assembles adjacent Vosk final clauses into one conversational turn.
 * Speech recognizers finalize individual phrases at short pauses; without
 * this buffer Bubbles submits half of the owner's sentence as a new request.
 * Mutated on the Android main thread, independent of the audio decoder.
 */
final class SpeechTurnBuffer {
    private final StringBuilder text = new StringBuilder();
    private String lastPartial = "";
    // Vosk repeats the same partial during silence. Only changed words are
    // evidence of continued dictation; repeats must not rearm the turn timer.
    boolean observePartial(String phrase) {
        String next = phrase == null ? "" : phrase.replaceAll("\\s+", " ").trim();
        if (next.isEmpty() || next.equals(lastPartial)) return false;
        lastPartial = next;
        return true;
    }
    void append(String phrase) {
        if (phrase == null) return;
        String next = phrase.replaceAll("\\s+", " ").trim();
        if (next.isEmpty()) return;
        lastPartial = "";
        if (text.length() > 0) text.append(' ');
        text.append(next, 0, Math.min(next.length(), Math.max(0, 1800 - text.length())));
    }
    boolean hasPending() {return text.length() > 0;}
    String peek() {return text.toString().trim();}
    String take() {
        String result = text.toString().trim();
        clear();
        return result;
    }
    void clear() {text.setLength(0); lastPartial = "";}
}
