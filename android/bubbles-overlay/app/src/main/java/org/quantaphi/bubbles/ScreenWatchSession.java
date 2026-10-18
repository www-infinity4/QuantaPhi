package org.quantaphi.bubbles;

/** Running-owner-session screen context. There is deliberately NO duration cap.
 * The native Bubbles service stops it on owner stop, permission loss or shutdown.
 * Only current filtered text and the latest short visual model description
 * are retained in RAM; not frames, credentials, or an expanding transcript.
 */
final class ScreenWatchSession {
    static final long SAMPLE_INTERVAL_MS = 1_000L;
    static final long VISUAL_INTERVAL_MS = 3_000L;
    private boolean active;
    private long lastSampleAt, lastVisualAttemptAt, lastVisualAt;
    private String latest = "", visual = "";

    void start(long now) {
        active = true;
        lastSampleAt = now - SAMPLE_INTERVAL_MS;
        lastVisualAttemptAt = now - VISUAL_INTERVAL_MS;
        lastVisualAt = 0;
        latest = "";
        visual = "";
    }
    boolean isActive(long now) { return active; }
    boolean needsSample(long now) {
        return active && now - lastSampleAt >= SAMPLE_INTERVAL_MS;
    }
    void observe(long now, String visibleText) {
        if (!needsSample(now)) return;
        lastSampleAt = now;
        String value = visibleText == null ? "" : visibleText.trim();
        latest = value.substring(0, Math.min(2200, value.length()));
    }
    boolean needsVisual(long now) {
        return active && now - lastVisualAttemptAt >= VISUAL_INTERVAL_MS;
    }
    void visualStarted(long now) { lastVisualAttemptAt = now; }
    void observeVisual(long now, String description) {
        if (!active || description == null || description.trim().isEmpty()) return;
        visual = description.trim().substring(0, Math.min(2200, description.trim().length()));
        lastVisualAt = now;
    }
    String recent(long now) { return active ? latest : ""; }
    String recentVisual(long now) {
        return active && !visual.isEmpty()
            ? "Last processed visual frame at elapsed " + lastVisualAt + " ms: " + visual : "";
    }
    void stop() {
        active = false;
        latest = "";
        visual = "";
        lastSampleAt = lastVisualAttemptAt = lastVisualAt = 0L;
    }
}
