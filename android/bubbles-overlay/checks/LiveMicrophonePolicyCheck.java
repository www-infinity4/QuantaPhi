package org.quantaphi.bubbles;
public final class LiveMicrophonePolicyCheck {
    static final String ORIGIN = "https://quantaphi.org";
    static final String PAGE = ORIGIN + "/bubbles-gpt-live.html?v=1";
    static final String[] AUDIO = {LiveMicrophonePolicy.AUDIO};
    static void check(boolean condition) { if (!condition) throw new AssertionError(); }
    public static void main(String[] args) {
        check(LiveMicrophonePolicy.allows(ORIGIN,PAGE,AUDIO,true,true));
        check(LiveMicrophonePolicy.allows(ORIGIN+":443/",PAGE,AUDIO,true,true));
        for (String origin : new String[]{"http://quantaphi.org", "https://quantaphi.org.evil.test",
                "https://quantaphi.org:444", "https://user@quantaphi.org", "https://quantaphi.org/?x=1",
                "https://quantaphi.org/#x", "null", "file:///bubbles-gpt-live.html"})
            check(!LiveMicrophonePolicy.allows(origin,PAGE,AUDIO,true,true));
        for (String top : new String[]{ORIGIN+"/bubbles.html",ORIGIN+"/%62ubbles-gpt-live.html",
                ORIGIN+"/other/bubbles-gpt-live.html","http://quantaphi.org/bubbles-gpt-live.html",
                "https://evil.test/bubbles-gpt-live.html",ORIGIN+":444/bubbles-gpt-live.html"})
            check(!LiveMicrophonePolicy.allows(ORIGIN,top,AUDIO,true,true));
        check(!LiveMicrophonePolicy.allows(ORIGIN,PAGE,AUDIO,false,true));
        check(!LiveMicrophonePolicy.allows(ORIGIN,PAGE,AUDIO,true,false));
        check(!LiveMicrophonePolicy.allows(ORIGIN,PAGE,null,true,true));
        check(!LiveMicrophonePolicy.allows(ORIGIN,PAGE,new String[]{},true,true));
        check(!LiveMicrophonePolicy.allows(ORIGIN,PAGE,new String[]{LiveMicrophonePolicy.AUDIO,"android.webkit.resource.VIDEO_CAPTURE"},true,true));
        System.out.println("Live microphone origin, path, foreground and audio-only policy passed");
    }
}
