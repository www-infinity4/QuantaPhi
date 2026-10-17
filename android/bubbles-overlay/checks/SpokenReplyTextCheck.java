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
        same(SpokenReplyText.forSpeech(null), "");
        String fence = String.valueOf((char)96).repeat(3);
        same(SpokenReplyText.forSpeech("Intro "+ " " + fence + "skip / * (code)" + fence + " Outro"), "Intro Outro");
    }
}
