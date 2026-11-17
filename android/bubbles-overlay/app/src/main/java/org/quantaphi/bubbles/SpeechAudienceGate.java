package org.quantaphi.bubbles;

import java.util.regex.Pattern;

/**
 * Conservative local audience hints. Android's ASR does not identify speakers,
 * and this is NOT a biometric or reliable pet/person discriminator.
 * Explicitly addressed "Bubbles, ..." always reaches the normal voice path.
 */
final class SpeechAudienceGate {
    private static final Pattern PET_COMMAND = Pattern.compile(
        "^(?:(?:hey|oh|come on)\\s+)?(?:"
        + "good\\s+(?:dog|boy|girl|puppy)|bad\\s+(?:dog|boy|girl)|"
        + "who(?:'s| is)\\s+a\\s+good\\s+(?:dog|boy|girl)|"
        + "sit|stay|heel|fetch|walkies|drop\\s+it|leave\\s+it|"
        + "come\\s+here|come\\s+on\\s+(?:boy|girl)|"
        + "go\\s+potty|outside\\s+time|want\\s+a\\s+treat"
        + ")(?:[\\s,.!?]|$)", Pattern.CASE_INSENSITIVE);
    private static final Pattern PET_NAME = Pattern.compile(
        "^(?:(?:hey|listen|come\\s+here|come\\s+on)\\s+)?"
        + "(?:dogs?|pupp(?:y|ies)|pups?)[\\s,:!]+"
        + "(?:sit|stay|come|heel|stop|wait|down|fetch|quiet)\\b",
        Pattern.CASE_INSENSITIVE);

    static boolean clearlyPetDirected(String text, boolean explicitlyBubbles, boolean typed) {
        if (typed || explicitlyBubbles || text == null) return false;
        String normalized=text.trim().replaceAll("\\s+", " ");
        return PET_COMMAND.matcher(normalized).find() || PET_NAME.matcher(normalized).find();
    }

    private SpeechAudienceGate() {}
}
