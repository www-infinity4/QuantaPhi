package org.quantaphi.bubbles;

/** Spoken output policy: preserve full chat text, omit private ticket identifiers,
 * and keep ordinary spoken answers short enough to interrupt easily.
 */
public final class SpokenReplyText {
    private SpokenReplyText() {}

    public static String forSpeech(String source) {
        return forSpeech(source, true);
    }

    public static String forSpeech(String source, boolean brief) {
        if (source == null || source.trim().isEmpty()) return "";
        String clean = source
            .replaceAll("(?s)\\x60{3}.*?\\x60{3}", " ")
            .replaceAll("!?\\[([^\\]]+)\\]\\(https?://[^)]+\\)", "$1")
            .replaceAll("(?i)(?:https?://|www\\.)\\S+", " ")
            .replaceAll("(?i)\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|org|net|dev|app|io)(?:/\\S*)?", " ")
            // Reference identifiers still appear in the written chat/log.
            .replaceAll("(?i)\\bIW-\\d{8}-[A-Z0-9-]+\\b", " ")
            .replaceAll("(?i)\\bTASK-\\d+\\b", " ")
            .replaceAll("(?i)\\b(?:PR|pull request|issue|ticket|job)\\s*(?:number\\s*|no\\.?\\s*|#\\s*)\\d+[A-Z0-9-]*\\b", " ")
            .replaceAll("(?m)^\\s*(?:[-+•]\\s+|\\d+[.)]\\s+)", " ")
            .replaceAll("[*/\\\\_()\\[\\]{}<>\\x60~|#^]+", " ")
            .replace("&", " and ")
            .replaceAll("\\s+", " ").trim();
        if (!brief) return clean;
        String[] words = clean.isEmpty() ? new String[0] : clean.split("\\s+");
        if (words.length <= 65) return clean;
        StringBuilder prefix = new StringBuilder();
        for (int i = 0; i < 65; i++) {
            if (i > 0) prefix.append(' ');
            prefix.append(words[i]);
        }
        String first = prefix.toString();
        int boundary = Math.max(first.lastIndexOf(". "), Math.max(first.lastIndexOf("? "), first.lastIndexOf("! ")));
        if (boundary > 45) first = first.substring(0, boundary + 1);
        first = first.replaceAll("[,.;!?\\s]+$", "");
        return first + ". More details are in the chat.";
    }
}
