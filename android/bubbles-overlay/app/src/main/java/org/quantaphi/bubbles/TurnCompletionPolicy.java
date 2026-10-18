package org.quantaphi.bubbles;

import java.util.Locale;

/** A Vosk final result is a phrase boundary, not proof the person finished. */
final class TurnCompletionPolicy {
    private TurnCompletionPolicy() {}
    static long waitMillis(String words) {
        if (words == null || words.trim().isEmpty()) return 1000L;
        String speech = words.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        String content = speech.replaceFirst("^(?:(?:hey|hi|hello|okay|ok)\\s+)?(?:bubbles(?:\\s+ai)?|bubble\\s+ai)[\\s,:]+", "");
        if (VoiceCaptureCommands.parse(content) != null) return 0L;
        if (speech.matches("(?s).*\\b(?:um+|uh+|erm+|hmm+|let me think|what was i saying|i forgot|hang on|hold on|give me a second|wait a minute|where was i)\\b.*"))
            return 11000L;
        if (speech.matches("(?s).*\\b(?:and|or|but|because|so|if|when|while|unless|although|which|that|who|whose|to|for|of|on|in|at|with|from|about|as|a|an|the|my|your|our|his|her|their|is|are|was|were|have|has|had|will|would|could|should|can|do|does|did|it|we|i|you)\\s*$"))
            return 8500L;
        if (speech.matches("(?s).*(?:\\bi (?:want|need|think|wonder|was thinking|was trying|am trying|would like)\\b.*|\\b(?:kind of|sort of|you know|something like|the thing is)\\b.*)"))
            return 4900L;
        int terms = content.split(" ").length;
        if (terms >= 18) return 2500L;
        if (terms <= 2) return 1600L;
        return 950L;
    }
    static long onNewPartial(String pending, String partial) {
        if (partial != null && !partial.trim().isEmpty())
            return Math.max(1800L, waitMillis(pending));
        return waitMillis(pending);
    }
}
