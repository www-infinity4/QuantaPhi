package org.quantaphi.bubbles;

/** Exact owner requests, never model text or incidental mentions, authorize a probe dialog. */
final class TermuxProbeKind {
    private static final String PREFIX = "(?i)^(?:(?:hey[, ]+)?bubbles[, ]+)?(?:please\\s+)?";
    private static final String CHECK = "(?:check|test|verify)(?:\\s+the)?\\s+(?:my\\s+)?";
    private static final String PYTHON = "(?:(?:test|check|verify)(?:\\s+the)?\\s+(?:python(?:\\s+(?:in|with))?\\s+termux|python|termux\\s+python)|(?:run|start|try)(?:\\s+a)?\\s+python\\s+(?:test|diagnostic)|(?:does\\s+python\\s+work|is\\s+python\\s+(?:working|ready))(?:\\s+in\\s+termux)?)";
    private TermuxProbeKind() {}

    static String fromUserText(String text) {
        if (text == null) return null;
        String q = text.trim();
        if (q.matches(PREFIX + CHECK + "termux[.!?]*$")) return "shell";
        if (q.matches(PREFIX + PYTHON + "[.!?]*$")) return "python";
        return null;
    }
}
