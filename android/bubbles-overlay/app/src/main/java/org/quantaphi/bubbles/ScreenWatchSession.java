package org.quantaphi.bubbles;

/** In-memory, explicitly started, bounded screen-text watch. No network,
 * disk, projection-token caching or autonomous AI/tool requests.
 * Mutated on the native Bubbles main thread.
 */
final class ScreenWatchSession {
    static final long MAX_DURATION_MS = 300_000L;
    static final long SAMPLE_INTERVAL_MS = 2_000L;
    private long startedAt, lastSampleAt;
    private boolean active;
    private String latest = "";

    void start(long now) {
        active = true;
        startedAt = now;
        lastSampleAt = now - SAMPLE_INTERVAL_MS;
        latest = "";
    }
    boolean isActive(long now) {
        return active && now >= startedAt && now - startedAt < MAX_DURATION_MS;
    }
    boolean needsSample(long now) {
        return isActive(now) && now - lastSampleAt >= SAMPLE_INTERVAL_MS;
    }
    void observe(long now, String visibleText) {
        if (!needsSample(now)) return;
        lastSampleAt = now;
        String bounded = visibleText == null ? "" : visibleText.trim();
        // A single changing viewport excerpt, not a transcript or screen log.
        latest = bounded.substring(0, Math.min(1600, bounded.length()));
    }
    String recent(long now) {
        return isActive(now) && now - lastSampleAt <= 8_000L ? latest : "";
    }
    void stop() {
        active = false;
        latest = "";
        startedAt = 0L;
        lastSampleAt = 0L;
    }
}
