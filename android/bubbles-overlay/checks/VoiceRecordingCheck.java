package org.quantaphi.bubbles;
import java.io.*;
import java.nio.file.*;
import java.nio.*;
public final class VoiceRecordingCheck {
    public static void main(String[] args) throws Exception {
        File dir = Files.createTempDirectory("bubbles-wav-check").toFile();
        VoiceRecording writer = new VoiceRecording();
        if (writer.finish() != null) throw new AssertionError("Idle finish must be safe");
        writer.start(dir);
        try { writer.start(dir); throw new AssertionError("Concurrent recording accepted"); }
        catch (IllegalStateException expected) {}
        writer.append(new short[]{0, 32767, -32768, -1}, 4);
        writer.pause();
        if (!writer.isPaused()) throw new AssertionError("Recorder did not pause");
        writer.append(new short[]{101, 202}, 2); // Pause must not add frames.
        writer.resume();
        if (writer.isPaused()) throw new AssertionError("Recorder did not resume");
        File file = writer.finish();
        byte[] data = Files.readAllBytes(file.toPath());
        ByteBuffer header = ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN);
        if (!new String(data, 0, 4, "US-ASCII").equals("RIFF") || !new String(data, 8, 8, "US-ASCII").equals("WAVEfmt "))
            throw new AssertionError("Invalid WAV signature");
        if (header.getInt(4) != data.length - 8 || header.getInt(24) != 16000 || header.getInt(40) != 8 || data.length != 52)
            throw new AssertionError("Invalid WAV lengths or sample rate");
        if (header.getShort(44) != 0 || header.getShort(46) != 32767 || header.getShort(48) != -32768 || header.getShort(50) != -1)
            throw new AssertionError("PCM sample values changed");
        if (writer.active() || writer.finish() != null) throw new AssertionError("Finish is not idempotent");
        writer.start(dir); if (writer.finish() != null) throw new AssertionError("Empty capture published");
        writer.start(dir);
        short[] second = new short[16000];
        for (int i = 0; i < 300; i++) writer.append(second, second.length);
        try { writer.append(new short[]{1}, 1); throw new AssertionError("Recording limit missing"); }
        catch (IllegalStateException expected) {}
        File bounded = writer.finish();
        if (bounded.length() != 9600044) throw new AssertionError("Bounded WAV was not finalized");
        for (File child : dir.listFiles()) child.delete(); dir.delete();
        System.out.println("VoiceRecording checks passed");
    }
}
