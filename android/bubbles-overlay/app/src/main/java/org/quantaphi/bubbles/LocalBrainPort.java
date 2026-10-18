package org.quantaphi.bubbles;

/**
 * On-device language model boundary. Implementations must not make network
 * requests or perform authenticated account, wallet, or Robot Brain actions.
 *
 * The offline engine is NOT bundled by this interface. A future llama.cpp
 * binding must provide a real implementation and load a user-approved GGUF.
 */
public interface LocalBrainPort extends AutoCloseable {
    /** True only when the native runtime and its model are actually loaded. */
    boolean isReady();

    /** Locally generated text fragments, in order. */
    void generate(String prompt, TokenSink tokens) throws Exception;

    /** Best-effort interruption of a currently executing local generation. */
    void cancel();

    @Override void close() throws Exception;

    interface TokenSink {
        void onToken(String text);
    }
}
