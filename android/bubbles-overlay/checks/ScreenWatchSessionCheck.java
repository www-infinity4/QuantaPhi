package org.quantaphi.bubbles;

/** Standalone JVM checks; no screenshot, API token or Android consent mocked. */
public final class ScreenWatchSessionCheck {
    private static void check(boolean value) { if (!value) throw new AssertionError("Screen watch regression"); }
    public static void main(String[] args) {
        ScreenWatchSession session = new ScreenWatchSession();
        check(!session.isActive(10000));
        session.start(10000);
        check(session.isActive(10000));
        check(session.needsSample(10000));
        session.observe(10000, "News about tomorrow");
        check("News about tomorrow".equals(session.recent(10000)));
        check(!session.needsSample(11000));
        session.observe(11000, "ignored");
        check("News about tomorrow".equals(session.recent(11000)));
        session.observe(12001, "updated viewport");
        check("updated viewport".equals(session.recent(12001)));
        check(session.recent(24002).isEmpty());
        session.observe(26000, "x".repeat(5000));
        check(session.recent(26000).length() == 1600);
        check(!session.isActive(310000));
        session.stop();
        check(session.recent(30000).isEmpty());
        session.start(40000);
        check(session.recent(40000).isEmpty());
        System.out.println("Screen watch expiry and in-memory snapshot checks passed");
    }
}
