package org.quantaphi.bubbles;

import java.util.Locale;
import java.util.regex.Pattern;

/** Only short explicit panel controls belong here; no model or owner job involved. */
final class BubblesPanelCommands {
    enum Action { NONE, SHOW, HIDE }
    private BubblesPanelCommands() {}

    static Action parse(String transcript, String configuredName) {
        String spoken = transcript == null ? "" : transcript.toLowerCase(Locale.ROOT)
            .replaceAll("[,.!?]+", " ").replaceAll("\\s+", " ").trim();
        if (spoken.isEmpty() || spoken.length() > 100) return Action.NONE;
        String name = configuredName == null ? "" : configuredName.trim().toLowerCase(Locale.ROOT);
        String targets = "(?:bubbles(?: ai)?|bubble ai"
            + (name.isEmpty() || name.length() > 32 ? "" : "|" + Pattern.quote(name)) + ")";
        String addressed = "(?:(?:hey|hi|hello|okay|ok)\\s+)?" + targets;
        if (spoken.matches("^(?:" + addressed + ")(?:\\s+(?:open|show|appear|come out|pop up|wake up|come here))?$")
            || spoken.matches("^(?:open|show|bring up|pull up|wake up|call)\\s+" + targets + "$"))
            return Action.SHOW;
        if (spoken.matches("^(?:" + addressed
            + ")\\s+(?:hideaway|hide away|hide|go away|go hideaway|go hide away|close|disappear|minimi[sz]e|go to sleep)$")
            || spoken.matches("^(?:hide|close|minimi[sz]e|put away)\\s+" + targets + "$")
            || spoken.matches("^put\\s+" + targets + "\\s+away$")
            || spoken.matches("^(?:hideaway|hide away)$"))
            return Action.HIDE;
        return Action.NONE;
    }

    static boolean requiresWake(String transcript) {
        String value = transcript == null ? "" : transcript.trim().toLowerCase(Locale.ROOT);
        return value.equals("hideaway") || value.equals("hide away");
    }
}
