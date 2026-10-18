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
        // Strip natural conversational introductions before inspecting an action.
        // Voice commands must be handled locally, not forwarded to a text AI
        // which cannot grant Android screen capture permissions.
        q = q.replaceFirst("^(?:(?:hey|hi|hello|okay|ok)\\s+)?(?:bubbles(?:\\s+ai)?|bubble\\s+ai)[\\s,:]+", "");
        q = q.replaceFirst("^(?:please\\s+)?", "");
        q = q.replaceFirst("^(?:(?:can|could|would|will) you\\s+(?:please\\s+)?|i (?:want|need|would like) (?:you )?to\\s+|i (?:want|need) (?:a |the )?|you (?:need|have) to\\s+)", "");
        q = q.replaceFirst("^(?:please\\s+)?", "");
        // Pure status requests read actual service state; they never start a
        // capture or pretend that an Android consent button was pressed.
        if (q.matches("^(?:is (?:the |my )?(?:screen |sound |audio |microphone )?(?:recorder |recording )(?:on|active|running)|is it recording|are you recording|did (?:it|that) record|did (?:the )?recording save|(?:check|show|tell me) (?:the |my )?(?:recording|recorder|capture) status|(?:recording|recorder|capture) status)$"))
            return new Command("capture_status", 0, 0);
        // Precise recording controls never create a new projection or invoke
        // Android's approval dialog. Resume requires an already paused session.
        if (q.matches("^(?:(?:pause|hold|temporarily stop)\\\\s+(?:the |my )?(?:screen |video )?(?:recorder|recording|capture)|pause (?:the |my )?screen|pause video)(?: now)?$"))
            return new Command("screen_pause", 0, 0);
        if (q.matches("^(?:(?:resume|unpause|continue)\\\\s+(?:the |my )?(?:screen |video )?(?:recorder|recording|capture)|resume (?:the |my )?screen|resume video)(?: now)?$"))
            return new Command("screen_resume", 0, 0);
        // Simple 'stop' applies to whatever media capture is actually running.
        // The service checks active sessions; this command does not mute Bubbles.
        if (q.matches("^(?:stop|end|finish|save)(?: now| it| that| recording| the recording| the video| video)?$"))
            return new Command("capture_stop", 0, 0);
        if (q.matches("^(?:stop|end|finish|cancel)\\s+(?:the\\s+)?(?:screen\\s+)?(?:capture|recording|screenshots?|video)(?:\\s+now)?$")
                && q.contains("screen")) return new Command("screen_stop", 0, 0);
        if (q.matches("^(?:(?:stop|end|finish|cancel|turn off|switch off)\\s+(?:(?:the|my)\\s+)?(?:screen\\s+recorder|screen\\s+recording|recording\\s+(?:of\\s+)?(?:the|my)\\s+screen))(?:\\s+now)?$"))
            return new Command("screen_stop", 0, 0);
        // Owner default: saying only "record" means SCREEN + MICROPHONE,
        // one MP4 in Movies/Bubbles, after required Android projection consent.
        // Microphone-only capture remains explicit ("record sound/audio").
        if (q.matches("^(?:record|start recording|begin recording|record a video|record video)$")
                || q.matches("^(?:(?:turn|switch)\\s+on|open|launch|enable|activate|use|run|start|begin)\\s+(?:(?:the|my|a)\\s+)?(?:screen\\s+recorder|screen\\s+recording)(?:\\s+now)?$")
                || q.matches("^(?:screen\\s+record|record\\s+(?:what(?:'s| is)\\s+on\\s+)?(?:my|the|this)\\s+(?:phone\\s+)?(?:screen|display)|start\\s+recording\\s+(?:what(?:'s| is)\\s+)?(?:on\\s+)?(?:my|the)\\s+(?:phone\\s+)?(?:screen|display))(?:\\b.*)?$")
                || q.matches("^(?:start|begin|make|capture)\\s+(?:a\\s+)?video\\s+(?:of\\s+)?(?:my|the|this)\\s+screen(?:\\b.*)?$"))
            return new Command("screen_video", 0, 300);
        if (q.matches("^(?:stop|end|finish|save)\\s+(?:the\\s+)?(?:audio|sound|microphone|voice)?\\s*recording(?:\\s+now)?$")
                || q.matches("^(?:stop|end|finish|save)\\s+(?:audio|sound|microphone)(?:\\s+now)?$"))
            return new Command("sound_stop", 0, 0);
        if (q.matches("^(?:record sound|record audio|start audio recording|start sound recording|start microphone recording|record microphone|record my voice|start recording sound|record this conversation)$"))
            return new Command("sound_start", 0, 0);
        if (q.matches("^(?:record|start|take|capture|make|shoot)\\s+(?:a\\s+)?(?:camera|selfie)\\s*(?:video|recording)?(?:\\s+.*)?$")
                || q.matches("^(?:turn on|start|record|shoot|make|capture)\\s+(?:the |my |a )?(?:camera|video|video camera)(?: recording| recorder)?$")
                || q.matches("^(?:film|videotape)\\s+(?:me|this|that|with my camera)$"))
            return new Command("camera_video", 0, 0);
        if (q.matches("^(?:stop|end|finish|cancel)\\s+(?:the\\s+)?(?:screen\\s+)?(?:video|capture|screenshots?)(?:\\s+now)?$"))
            return new Command("screen_stop", 0, 0);
        // Recording the screen is video, even when the word 'video' is omitted.
        if (q.matches("^(?:record|film|start recording|make a recording of|capture video of)\\s+(?:my |the |this )?screen(?:\\b.*)?$")
                || q.matches("^(?:start|make|capture|record)\\s+(?:a |the )?screen\\s+(?:recording|video)(?:\\b.*)?$"))
            return new Command("screen_video", 0, 300);
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
