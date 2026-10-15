package org.quantaphi.bubbles;

public final class ScreenAwarenessCheck {
    private static void check(boolean valid, String message) {
        if (!valid) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        check(ScreenAwareness.refersToScreen("Can you see my screen?"), "screen reference");
        check(ScreenAwareness.refersToScreen("what's on this page?"), "page reference");
        check(ScreenAwareness.refersToScreen("Tap the Search button"), "tap request");
        check(ScreenAwareness.refersToScreen("scroll down"), "scroll request");
        check(!ScreenAwareness.refersToScreen("Tell me about Mozart"), "ordinary chat must not read screen");
        check("Search".equals(ScreenAwareness.tapTarget("tap the Search button")), "exact target label");
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
