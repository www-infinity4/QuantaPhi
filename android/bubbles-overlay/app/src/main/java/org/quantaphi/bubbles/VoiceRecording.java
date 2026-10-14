package org.quantaphi.bubbles;

import java.io.File;
import java.io.RandomAccessFile;

/** Shares the already-open 16 kHz PCM stream; never opens a second microphone. */
final class VoiceRecording {
    private RandomAccessFile output;
    private File file;
    private long bytes;
    synchronized void start(File directory) throws Exception {
        if (output != null) throw new IllegalStateException("A recording is already active");
        directory.mkdirs();
        file = File.createTempFile("audio-", ".wav", directory);
        output = new RandomAccessFile(file, "rw");
        output.write(new byte[44]);
        bytes = 0;
    }
    synchronized boolean active() { return output != null; }
    synchronized void append(short[] samples, int count) throws Exception {
        if (output == null) return;
        // Five-minute bound; caller receives an error and finalizes the actual file.
        if (bytes + count * 2L > 16000L * 2 * 300) throw new IllegalStateException("Five-minute recording limit reached");
        byte[] data = new byte[count * 2];
        for (int i = 0; i < count; i++) {
            data[i * 2] = (byte) samples[i];
            data[i * 2 + 1] = (byte) (samples[i] >> 8);
        }
        output.write(data);
        bytes += data.length;
    }
    synchronized File finish() throws Exception {
        if (output == null) return null;
        RandomAccessFile out = output;
        output = null;
        try {
            out.seek(0);
            out.writeBytes("RIFF"); little(out, bytes + 36, 4);
            out.writeBytes("WAVEfmt "); little(out, 16, 4); little(out, 1, 2);
            little(out, 1, 2); little(out, 16000, 4); little(out, 32000, 4);
            little(out, 2, 2); little(out, 16, 2);
            out.writeBytes("data"); little(out, bytes, 4);
        } finally { out.close(); }
        if (bytes == 0) { file.delete(); return null; }
        return file;
    }
    private static void little(RandomAccessFile out, long value, int count) throws Exception {
        for (int i = 0; i < count; i++) out.write((int) (value >> (8 * i)) & 255);
    }
}
