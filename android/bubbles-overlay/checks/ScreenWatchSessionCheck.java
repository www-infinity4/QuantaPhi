package org.quantaphi.bubbles;

/** Verifies there is no time-based shutdown of owner-enabled live vision. */
public final class ScreenWatchSessionCheck {
    private static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        ScreenWatchSession watch = new ScreenWatchSession();
        check(!watch.isActive(10_000L), "idle until activated");
        watch.start(10_000L);
        check(watch.isActive(10_000L), "enabled");
        check(watch.needsSample(10_000L), "instant first text observation");
        watch.observe(10_000L, "Initial screen");
        check(watch.recent(10_000L).equals("Initial screen"), "first context");
        check(!watch.needsSample(10_500L), "brief sample interval");
        watch.observe(11_050L, "New screen");
        check(watch.recent(11_050L).equals("New screen"), "updated context");
        check(watch.needsVisual(11_050L), "first visual frame ready");
        watch.visualStarted(11_050L);
        watch.observeVisual(11_200L, "A map and route buttons are visible");
        check(watch.recentVisual(11_200L).contains("map and route"), "full image understanding retained");
        check(!watch.needsVisual(12_000L), "only one request per vision window");
        // No 5m / 10m / 15m timeout or any other arbitrary watch expiration.
        check(watch.isActive(11_000_000_000L), "continues while Bubbles is operating");
        watch.observe(11_000_000_000L, "Still watching");
        check(watch.recent(11_000_000_000L).equals("Still watching"), "observations continue");
        watch.stop();
        check(!watch.isActive(11_000_000_001L), "explicit stop");
        check(watch.recent(11_000_000_001L).isEmpty(), "stop clears text");
        check(watch.recentVisual(11_000_000_001L).isEmpty(), "stop clears visual context");
        System.out.println("Always-on Bubbles screen vision session checks passed");
    }
}
