package org.quantaphi.bubbles;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Local, deterministic commands: a voice model must not invent capture permission. */
final class VoiceCaptureCommands {
    static final class Command {
        final String action;
        final int intervalSeconds, durationSeconds;
        Command(String action, int intervalSeconds, int durationSeconds) {
            this.action = action; this.intervalSeconds = intervalSeconds; this.durationSeconds = durationSeconds;
        }
    }
    private static final Pattern INTERVAL = Pattern.compile(
        "\\bevery\\s+(?:(\\d{1,2})|(two|three|four|five|ten|fifteen|thirty|few))\\s+seconds?\\b");
    private static final Pattern DURATION = Pattern.compile(
        "\\bfor\\s+(?:the\\s+)?(?:next\\s+)?(?:(\\d{1,2})|(one|two|three|four|five))\\s+(minutes?|seconds?)\\b");
    private VoiceCaptureCommands() {}

    static Command parse(String text) {
        if (text == null) return null;
        String q = text.toLowerCase(Locale.ROOT).replaceAll("[,.!?]+", " ").replaceAll("\\s+", " ").trim();
        q = q.replaceFirst("^(?:please\\s+)?", "");
        if (q.matches("^(?:stop|end|finish|cancel)\\s+(?:the\\s+)?(?:screen\\s+)?(?:capture|recording|screenshots?|video)(?:\\s+now)?$")
                && q.contains("screen")) return new Command("screen_stop", 0, 0);
        if (q.matches("^(?:stop|end|finish|save)\\s+(?:the\\s+)?(?:audio|sound|microphone|voice)?\\s*recording(?:\\s+now)?$")
                || q.matches("^(?:stop|end|finish|save)\\s+(?:audio|sound|microphone)(?:\\s+now)?$"))
            return new Command("sound_stop", 0, 0);
        if (q.matches("^(?:record|start recording|record sound|record audio|start audio recording|start sound recording|record my voice)$"))
            return new Command("sound_start", 0, 0);
        if (q.matches("^(?:record|start|take|capture|make|shoot)\\s+(?:a\\s+)?(?:camera|selfie)\\s*(?:video|recording)?(?:\\s+.*)?$"))
            return new Command("camera_video", 0, 0);
        if (q.matches("^(?:stop|end|finish|cancel)\\s+(?:the\\s+)?(?:screen\\s+)?(?:video|capture|screenshots?)(?:\\s+now)?$"))
            return new Command("screen_stop", 0, 0);
        boolean screen = q.matches("^(?:take|capture|make|start|record|grab|save)\\s+(?:a\\s+)?(?:the\\s+)?(?:screen|screenshot|screen\\s*shot)(?:\\b.*)?$")
            || q.matches("^(?:take|capture|make|start|record|grab|save)\\s+(?:a\\s+)?(?:screen\\s+)?(?:capture|screenshots?)(?:\\b.*)?$");
        if (!screen) return null;
        if (q.matches(".*\\b(?:video|screen recording|screen video)\\b.*")
                && !q.contains("screenshot") && !q.contains("screen shot"))
            return new Command("screen_video", 0, 300);
        Matcher interval = INTERVAL.matcher(q);
        boolean repeating = interval.find() || q.contains("every few seconds") || q.contains("repeatedly") || q.contains("multiple screenshots");
        if (!repeating) return new Command("screen_image", 0, 0);
        int seconds = interval.hitEnd() && !q.contains("every") ? 5 : 5;
        if (interval.reset().find()) seconds = number(interval.group(1), interval.group(2), 5);
        seconds = Math.max(2, Math.min(60, seconds));
        Matcher duration = DURATION.matcher(q);
        int durationSeconds = 300;
        if (duration.find()) {
            int amount = number(duration.group(1), duration.group(2), 5);
            durationSeconds = amount * (duration.group(3).startsWith("minute") ? 60 : 1);
        }
        durationSeconds = Math.max(10, Math.min(300, durationSeconds));
        // Bound a timed session to at most sixty screenshots and 5 minutes.
        seconds = Math.max(seconds, (durationSeconds + 59) / 60);
        return new Command("screen_sequence", seconds, durationSeconds);
    }
    private static int number(String digits, String word, int otherwise) {
        if (digits != null) return Integer.parseInt(digits);
        if (word == null) return otherwise;
        switch (word) {
            case "one": return 1; case "two": return 2; case "three": return 3;
            case "four": return 4; case "five": case "few": return 5;
            case "ten": return 10; case "fifteen": return 15; case "thirty": return 30;
            default: return otherwise;
        }
    }
}
