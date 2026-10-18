package org.quantaphi.bubbles;
public final class TurnCompletionPolicyCheck {
    private static void test(boolean good, String reason) {
        if (!good) throw new AssertionError(reason);
    }
    public static void main(String[] ignored) {
        test(TurnCompletionPolicy.waitMillis("record") == 0, "record immediately");
        test(TurnCompletionPolicy.waitMillis("Bubbles record my screen") == 0, "screen record immediately");
        test(TurnCompletionPolicy.waitMillis("stop recording") == 0, "stop immediately");
        test(TurnCompletionPolicy.waitMillis("what time is it in London") <= 1600, "complete request rapid");
        test(TurnCompletionPolicy.waitMillis("I want you to") >= 8000, "unfinished clause");
        test(TurnCompletionPolicy.waitMillis("I forgot what I was saying") >= 9000, "thinking pause");
        test(TurnCompletionPolicy.waitMillis("Bubbles I was thinking about the") >= 8000, "unfinished detailed thought");
        test(TurnCompletionPolicy.onNewPartial("can you explain", "one more") >= 1800, "fresh phonemes extend a turn");
        test("capcut_extract".equals(VoiceCaptureCommands.parse("extract sound from the video").action), "CapCut extraction command");
        test("capcut_edit".equals(VoiceCaptureCommands.parse("edit my video in capcut").action), "CapCut editor command");
        test("screen_video".equals(VoiceCaptureCommands.parse("record").action), "DU record route");
        System.out.println("Adaptive voice and media commands: OK");
    }
}
