package org.quantaphi.bubbles;

/** Runs on plain Java as well as in Android CI, without a phone. */
public final class BubblesPanelCommandsCheck {
    private static void expected(String words, String alias, BubblesPanelCommands.Action action) {
        BubblesPanelCommands.Action found = BubblesPanelCommands.parse(words, alias);
        if (found != action) throw new AssertionError(words+" was "+found+" not "+action);
    }
    public static void main(String[] args) {
        for (String words : new String[]{"Bubbles", "Hey Bubbles", "Bubbles open",
             "Bubbles come out", "open Bubbles", "show Bubbles", "bring up bubbles"})
            expected(words, "Brain", BubblesPanelCommands.Action.SHOW);
        for (String words : new String[]{"Bubbles hideaway", "Bubbles, hide away",
             "Bubbles go away", "hide Bubbles", "put bubbles away", "hideaway",
             "hide away", "Bubbles close"})
            expected(words, "Brain", BubblesPanelCommands.Action.HIDE);
        expected("Hey Brain", "Brain", BubblesPanelCommands.Action.SHOW);
        expected("Brain hideaway", "Brain", BubblesPanelCommands.Action.HIDE);
        expected("BrainXYZ", "Brain.*", BubblesPanelCommands.Action.NONE);
        for (String words : new String[]{"the bubbles are nice", "Bubblegum",
             "record bubbles", "Bubbles record", "Bubbles go find a file",
             "someone said bubbles in a song", "no bubbles here"})
            expected(words, "Brain", BubblesPanelCommands.Action.NONE);
        if (!BubblesPanelCommands.requiresWake("hideaway")
            || BubblesPanelCommands.requiresWake("Bubbles hideaway"))
            throw new AssertionError("Unaddressed hideaway must be gated by the recent user session");
        System.out.println("Bubbles wake and hideaway command checks passed");
    }
}
