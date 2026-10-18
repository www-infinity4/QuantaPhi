package org.quantaphi.bubbles;

/** Plain JVM checks for the exact speech intents used on Android. */
public final class VoiceCaptureCommandsCheck {
    private static void expect(String spoken, String action) {
        VoiceCaptureCommands.Command c = VoiceCaptureCommands.parse(spoken);
        if (c == null || !action.equals(c.action))
            throw new AssertionError(spoken + ": expected " + action + ", got " +
                (c == null ? "chat" : c.action));
    }
    private static void noCapture(String spoken) {
        if (VoiceCaptureCommands.parse(spoken) != null)
            throw new AssertionError("Normal speech must not start recording: " + spoken);
    }
    public static void main(String[] args) {
        expect("record", "screen_video");
        expect("start recording", "screen_video");
        expect("please record my voice", "sound_start");
        expect("record audio", "sound_start");
        expect("stop", "capture_stop");
        expect("stop it", "capture_stop");
        expect("stop recording", "capture_stop");
        expect("pause recording", "screen_pause");
        expect("Bubbles pause screen recording", "screen_pause");
        expect("resume recording", "screen_resume");
        expect("continue the screen recording", "screen_resume");
        expect("unpause my recording", "screen_resume");
        expect("is the recorder on", "capture_status");
        expect("are you recording", "capture_status");
        expect("did the recording save", "capture_status");
        expect("recording status", "capture_status");
        expect("please stop sound recording", "sound_stop");
        expect("stop the screen recording", "screen_stop");
        expect("record my screen", "screen_video");
        expect("can you record my screen", "screen_video");
        expect("start screen recording", "screen_video");
        expect("turn on my screen recorder", "screen_video");
        expect("Bubbles can you please start the screen recorder", "screen_video");
        expect("I need you to record what's on my phone screen", "screen_video");
        expect("please screen record", "screen_video");
        expect("stop my screen recorder", "screen_stop");
        expect("please turn off the screen recorder", "screen_stop");
        expect("turn on video", "camera_video");
        expect("record a video", "screen_video");
        expect("film this", "camera_video");
        expect("take a screenshot", "screen_image");
        expect("take screenshots every five seconds for five minutes", "screen_sequence");
        noCapture("can you explain the video to me");
        noCapture("what happened to the camera");
        noCapture("how do I record my screen?");
        noCapture("talk to my robot brain");
        noCapture("stop listening"); // separate deliberate microphone mute intent
        System.out.println("Bubbles voice capture intent checks passed");
    }
}
