package org.quantaphi.bubbles;

/** Android-independent regression checks of text actually sent to speech. */
public final class SpokenReplyTextCheck {
    private static void same(String actual, String expected) {
        if (!expected.equals(actual))
            throw new AssertionError("Expected <" + expected + "> but got <" + actual + ">");
    }
    public static void main(String[] args) {
        same(SpokenReplyText.forSpeech("**The forecast** (Omaha) / *today*"),
            "The forecast Omaha today");
        same(SpokenReplyText.forSpeech("[Check progress](https://quantaphi.org/status) and https://example.com/job"),
            "Check progress and");
        same(SpokenReplyText.forSpeech("Here is a list:\n- One\n* Two\n(Three) / Four"),
            "Here is a list: One Two Three Four");
        same(SpokenReplyText.forSpeech("A & B {green} [yellow] <blue>"),
            "A and B green yellow blue");
        same(SpokenReplyText.forSpeech("Ticket IW-20261013-AABBCCDD and TASK-2, PR #629 queued"),
            "Ticket and , queued");
        String verbose = "Useful answer. " + "explanation ".repeat(100);
        String brief = SpokenReplyText.forSpeech(verbose);
        if (brief.split(" ").length > 78 || !brief.endsWith("More details are in the chat."))
            throw new AssertionError("Long Android spoken reply was not shortened");
        if (!SpokenReplyText.forSpeech(verbose, false).contains("explanation explanation"))
            throw new AssertionError("Full text should be available outside short speech mode");
        same(SpokenReplyText.forSpeech(null), "");
        String fence = String.valueOf((char)96).repeat(3);
        same(SpokenReplyText.forSpeech("Intro "+ " " + fence + "skip / * (code)" + fence + " Outro"), "Intro Outro");
    }
}
