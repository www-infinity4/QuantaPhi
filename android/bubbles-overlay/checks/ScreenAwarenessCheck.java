package org.quantaphi.bubbles;

public final class ScreenAwarenessCheck {
    private static void check(boolean valid, String message) {
        if (!valid) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        check(ScreenAwareness.sharingCommand("start screen sharing") == 1, "start refreshed screen session");
        check(ScreenAwareness.sharingCommand("watch my screen") == 1, "natural sharing command");
        check(ScreenAwareness.sharingCommand("stop screen sharing") == -1, "end sharing");
        check(ScreenAwareness.sharingCommand("always watch everything on my phone") == 1, "owner continuous vision");
        check(ScreenAwareness.sharingCommand("turn on continuous screen vision") == 1, "persistent vision");
        check(ScreenAwareness.sharingCommand("stop screen watching") == -1, "stop vision");
        check(ScreenAwareness.sharingCommand("turn off screen vision") == -1, "explicit disable");
        check(ScreenAwareness.sharingCommand("tell me about a screen") == 0, "ordinary conversation is not sharing consent");
        check(ScreenAwareness.attach("read", "x".repeat(6000)+"BOTTOM").contains("BOTTOM"), "retain lower-screen evidence beyond legacy cutoff");
        check(ScreenAwareness.refersToScreen("Can you see my screen?"), "screen reference");
        check(ScreenAwareness.refersToScreen("what's on this page?"), "page reference");
        check(ScreenAwareness.refersToScreen("Tap the Search button"), "tap request");
        check(ScreenAwareness.refersToScreen("scroll down"), "scroll request");
        check(!ScreenAwareness.refersToScreen("Tell me about Mozart"), "ordinary chat must not read screen");
        check(ScreenAwareness.refersToScreen("Research the story I'm looking at"), "current story reference");
        check(ScreenAwareness.refersToScreen("Research article the story I am reading"), "natural article reference");
        check(ScreenAwareness.refersToScreen("Research what I'm reading"), "reading reference");
        check(!ScreenAwareness.refersToScreen("Research the RadioShack history article"), "named public research must not request the screen");
        check("Search".equals(ScreenAwareness.tapTarget("tap the Search button")), "exact target label");
        check("Search".equals(ScreenAwareness.tapTarget("Can you tap the Search button?")), "conversational tap request");
        check("down".equals(ScreenAwareness.scrollDirection("Could you please scroll down?")), "conversational scroll request");
        check("down".equals(ScreenAwareness.scrollDirection("scroll down")), "scroll direction");
        check(ScreenAwareness.sensitive("Buy"), "block purchases");
        check(ScreenAwareness.sensitive("Delete account"), "block deletion");
        check(!ScreenAwareness.sensitive("Search"), "allow non-destructive navigation");
        String evidence=ScreenAwareness.attach("Read this screen", "A visible result");
        check(evidence.contains("A visible result"), "attach approved screen data");
        check(evidence.contains("untrusted"), "mark screen text untrusted");
        check(!evidence.contains("completed a tap"), "no fabricated action");
        System.out.println("ScreenAwarenessCheck passed");
    }
}
