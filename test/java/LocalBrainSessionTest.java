import org.quantaphi.bubbles.LocalBrainPort;
import org.quantaphi.bubbles.LocalBrainSession;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;

/** Run with javac/java; no Android dependencies or network needed. */
public final class LocalBrainSessionTest {
    static class FakeEngine implements LocalBrainPort {
        boolean ready;
        boolean cancelled;
        int calls;
        FakeEngine(boolean ready) { this.ready = ready; }
        public boolean isReady() { return ready; }
        public void generate(String prompt, TokenSink tokens) {
            calls++;
            tokens.onToken("Hello");
            tokens.onToken(" Bubbles");
        }
        public void cancel() { cancelled = true; }
        public void close() {}
    }
    static class Recorder implements LocalBrainSession.Listener {
        final List<String> parts = new ArrayList<>();
        LocalBrainSession.Status result;
        String answer;
        public void onToken(String value) { parts.add(value); }
        public void onFinished(LocalBrainSession.Status status, String value) {
            result = status; answer = value;
        }
    }
    static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) {
        Executor sameThread = Runnable::run;
        FakeEngine absent = new FakeEngine(false);
        Recorder noModel = new Recorder();
        LocalBrainSession disabled = new LocalBrainSession(absent, sameThread);
        require(disabled.submit("Hello", noModel) == LocalBrainSession.Status.MODEL_UNAVAILABLE,
            "missing model must fail closed");
        require(absent.calls == 0 && noModel.answer.equals(""),
            "missing model must not invent an answer or execute an engine");
        FakeEngine loaded = new FakeEngine(true);
        LocalBrainSession session = new LocalBrainSession(loaded, sameThread);
        Recorder answer = new Recorder();
        require(session.submit("Hi", answer) == LocalBrainSession.Status.STARTED, "accepted");
        require(answer.result == LocalBrainSession.Status.COMPLETE, "completed");
        require(answer.answer.equals("Hello Bubbles") && answer.parts.size() == 2, "tokens");
        require(loaded.calls == 1, "exactly one execution");
        Recorder invalid = new Recorder();
        require(session.submit("  ", invalid) == LocalBrainSession.Status.INVALID_REQUEST,
            "empty request rejected");
        require(loaded.calls == 1, "invalid prompt not run");
        System.out.println("LocalBrainSession: 8 assertions passed");
    }
}
