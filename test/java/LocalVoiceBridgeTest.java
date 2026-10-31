import org.quantaphi.bubbles.LocalBrainPort;
import org.quantaphi.bubbles.LocalBrainSession;
import org.quantaphi.bubbles.LocalVoiceBridge;

import java.util.ArrayList;
import java.util.List;

/** JVM-only test: no phone, network, Android, model files, or API keys. */
public final class LocalVoiceBridgeTest {
    private static int checks;
    static void check(boolean value, String meaning) {
        checks++;
        if (!value) throw new AssertionError(meaning);
    }

    static final class FakeEngine implements LocalBrainPort {
        boolean loaded;
        int calls;
        FakeEngine(boolean loaded) { this.loaded = loaded; }
        public boolean isReady() { return loaded; }
        public void generate(String prompt, TokenSink sink) {
            calls++;
            sink.onToken("Hello");
            sink.onToken(" there! How");
            sink.onToken(" are you?");
            sink.onToken(" I am here");
            sink.onToken(" to help");
        }
        public void cancel() {}
        public void close() {}
    }

    static final class Surface implements LocalVoiceBridge.Surface {
        final StringBuilder transcript = new StringBuilder();
        final List<String> phrases = new ArrayList<>();
        LocalBrainSession.Status status;
        public void onText(String fragment) { transcript.append(fragment); }
        public void onSpeechChunk(String phrase) { phrases.add(phrase); }
        public void onFinished(LocalBrainSession.Status value) { status = value; }
    }

    public static void main(String[] args) {
        FakeEngine loaded = new FakeEngine(true);
        LocalVoiceBridge bridge = new LocalVoiceBridge(
                new LocalBrainSession(loaded, Runnable::run), Runnable::run);
        Surface visible = new Surface();
        check(bridge.isReady(), "actual engine readiness is exposed");
        check(bridge.submit("Tell me something", visible) == LocalBrainSession.Status.STARTED,
            "ready model starts");
        check(visible.transcript.toString().equals("Hello there! How are you? I am here to help"),
            "raw token order preserved");
        check(visible.phrases.size() == 3, "speech is grouped, not one utterance per token");
        check(visible.phrases.get(0).equals("Hello there!"), "first spoken sentence");
        check(visible.phrases.get(1).equals("How are you?"), "second spoken sentence");
        check(visible.phrases.get(2).equals("I am here to help"), "final incomplete sentence flushed");
        check(visible.status == LocalBrainSession.Status.COMPLETE, "completion surfaced");
        check(loaded.calls == 1, "one local inference request");

        FakeEngine missing = new FakeEngine(false);
        LocalVoiceBridge absent = new LocalVoiceBridge(
                new LocalBrainSession(missing, Runnable::run), Runnable::run);
        Surface failed = new Surface();
        check(!absent.isReady(), "missing model not reported ready");
        check(absent.submit("Do not use cloud", failed) == LocalBrainSession.Status.MODEL_UNAVAILABLE,
            "missing model fails closed");
        check(failed.status == LocalBrainSession.Status.MODEL_UNAVAILABLE,
            "absence visible to UI");
        check(failed.phrases.isEmpty() && failed.transcript.length() == 0 && missing.calls == 0,
            "missing model cannot produce fake speech or invoke any fallback");
        System.out.println("LocalVoiceBridge: " + checks + " assertions passed");
    }
}
