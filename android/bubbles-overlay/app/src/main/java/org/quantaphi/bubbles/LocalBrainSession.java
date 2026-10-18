package org.quantaphi.bubbles;

import java.util.Objects;
import java.util.concurrent.CancellationException;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Coordinates one local-only generation on a caller-supplied worker executor.
 *
 * There is deliberately NO HTTP client, cloud fallback, owner-tool dispatcher,
 * or device permission acquisition in this class. The UI must marshal the
 * callback onto Android's main thread before modifying views or playing TTS.
 */
public final class LocalBrainSession {
    public enum Status {
        STARTED, MODEL_UNAVAILABLE, INVALID_REQUEST, BUSY,
        COMPLETE, EMPTY_RESPONSE, CANCELLED, ERROR
    }

    public interface Listener {
        void onToken(String text);
        void onFinished(Status status, String completeText);
    }

    private static final int MAX_INPUT_CHARS = 1800;
    private static final int MAX_RESPONSE_CHARS = 2200;
    private final LocalBrainPort engine;
    private final Executor worker;
    private final AtomicBoolean busy = new AtomicBoolean();
    private final AtomicBoolean cancelled = new AtomicBoolean();

    public LocalBrainSession(LocalBrainPort engine, Executor worker) {
        this.engine = Objects.requireNonNull(engine, "engine");
        this.worker = Objects.requireNonNull(worker, "worker");
    }

    public boolean isReady() {
        return engine.isReady();
    }

    public boolean isBusy() {
        return busy.get();
    }

    /** No user text is sent anywhere when the model is unavailable. */
    public Status submit(String input, Listener listener) {
        Objects.requireNonNull(listener, "listener");
        String prompt = input == null ? "" : input.trim();
        if (prompt.isEmpty() || prompt.length() > MAX_INPUT_CHARS) {
            listener.onFinished(Status.INVALID_REQUEST, "");
            return Status.INVALID_REQUEST;
        }
        if (!engine.isReady()) {
            listener.onFinished(Status.MODEL_UNAVAILABLE, "");
            return Status.MODEL_UNAVAILABLE;
        }
        if (!busy.compareAndSet(false, true)) {
            listener.onFinished(Status.BUSY, "");
            return Status.BUSY;
        }
        cancelled.set(false);
        try {
            worker.execute(() -> run(prompt, listener));
        } catch (RejectedExecutionException rejected) {
            busy.set(false);
            listener.onFinished(Status.ERROR, "");
            return Status.ERROR;
        }
        return Status.STARTED;
    }

    private void run(String prompt, Listener listener) {
        StringBuilder reply = new StringBuilder();
        Status result = Status.COMPLETE;
        try {
            engine.generate(prompt, token -> {
                if (cancelled.get()) throw new CancellationException();
                if (token == null || token.isEmpty()) return;
                int remaining = MAX_RESPONSE_CHARS - reply.length();
                if (remaining <= 0) return;
                String accepted = token.substring(0, Math.min(remaining, token.length()));
                reply.append(accepted);
                listener.onToken(accepted);
            });
            if (cancelled.get()) result = Status.CANCELLED;
            else if (reply.length() == 0) result = Status.EMPTY_RESPONSE;
        } catch (CancellationException expected) {
            result = Status.CANCELLED;
        } catch (Exception | LinkageError failed) {
            result = cancelled.get() ? Status.CANCELLED : Status.ERROR;
        } finally {
            busy.set(false);
        }
        listener.onFinished(result, result == Status.COMPLETE ? reply.toString() : "");
    }

    public void cancel() {
        if (!busy.get()) return;
        cancelled.set(true);
        engine.cancel();
    }
}
