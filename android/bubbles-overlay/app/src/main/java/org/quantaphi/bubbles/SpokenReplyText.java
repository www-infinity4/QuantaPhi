package org.quantaphi.bubbles;

/** Convert Markdown replies to natural speech without changing visible chat text. */
public final class SpokenReplyText {
    private SpokenReplyText() {}

    public static String forSpeech(String source) {
        if (source == null || source.trim().isEmpty()) return "";
        return source
            .replaceAll("(?s)\\x60{3}.*?\\x60{3}", " ")
            .replaceAll("!?\\[([^\\]]+)\\]\\(https?://[^)]+\\)", "$1")
            .replaceAll("(?i)(?:https?://|www\\.)\\S+", " ")
            .replaceAll("(?i)\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|org|net|dev|app|io)(?:/\\S*)?", " ")
            .replaceAll("(?m)^\\s*(?:[-+•]\\s+|\\d+[.)]\\s+)", " ")
            .replaceAll("[*/\\\\_()\\[\\]{}<>\\x60~|#^]+", " ")
            .replace("&", " and ")
            .replaceAll("\\s+", " ")
            .trim();
    }
}
