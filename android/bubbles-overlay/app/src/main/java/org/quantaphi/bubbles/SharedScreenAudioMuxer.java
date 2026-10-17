package org.quantaphi.bubbles;

import android.media.*;
import java.io.*;
import java.nio.ByteBuffer;

/** Encodes the existing voice PCM, then adds it to the screen video off the UI thread. */
final class SharedScreenAudioMuxer {
    static void combine(File video, File wav) throws Exception {
        File audio = File.createTempFile("screen-audio-", ".m4a", video.getParentFile());
        File joined = File.createTempFile("screen-joined-", ".mp4", video.getParentFile());
        boolean complete = false;
        try {
            encode(wav, audio);
            MediaMuxer mux = new MediaMuxer(joined.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            MediaExtractor picture = new MediaExtractor(), sound = new MediaExtractor();
            boolean started = false;
            try {
                picture.setDataSource(video.getAbsolutePath()); sound.setDataSource(audio.getAbsolutePath());
                int v = track(picture, "video/"), a = track(sound, "audio/");
                picture.selectTrack(v); sound.selectTrack(a);
                int outV = mux.addTrack(picture.getTrackFormat(v)), outA = mux.addTrack(sound.getTrackFormat(a));
                mux.start(); started = true;
                copy(picture, mux, outV); copy(sound, mux, outA);
                mux.stop(); started = false;
            } finally {
                picture.release(); sound.release();
                if (started) try { mux.stop(); } catch (RuntimeException ignored) {}
                mux.release();
            }
            // Keep original video and PCM on any failure. Rename is on the same filesystem.
            if (!joined.renameTo(video)) throw new IOException("Could not finalize screen audio/video");
            complete = true;
        } finally {
            audio.delete();
            if (!complete) joined.delete();
        }
    }
    private static int track(MediaExtractor input, String prefix) throws IOException {
        for (int i = 0; i < input.getTrackCount(); i++)
            if (input.getTrackFormat(i).getString(MediaFormat.KEY_MIME).startsWith(prefix)) return i;
        throw new IOException("Missing " + prefix + " track");
    }
    private static void copy(MediaExtractor input, MediaMuxer output, int track) throws IOException {
        // Screen encoder is bounded to 720 px; still honor advertised input size.
        MediaFormat format = input.getTrackFormat(input.getSampleTrackIndex());
        int capacity = format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)
            ? Math.max(4 * 1024 * 1024, format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)) : 4 * 1024 * 1024;
        ByteBuffer buffer = ByteBuffer.allocate(capacity);
        MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
        int frames = 0;
        while (input.getSampleTime() >= 0) {
            buffer.clear(); int size = input.readSampleData(buffer, 0);
            if (size < 0) break;
            if (size > capacity) throw new IOException("Oversize media sample");
            info.set(0, size, input.getSampleTime(), input.getSampleFlags());
            output.writeSampleData(track, buffer, info); frames++; input.advance();
        }
        if (frames == 0) throw new IOException("Empty media track");
    }
    private static void encode(File wav, File output) throws Exception {
        MediaCodec codec = MediaCodec.createEncoderByType("audio/mp4a-latm");
        MediaMuxer mux = null;
        boolean codecStarted = false, muxStarted = false;
        try (RandomAccessFile pcm = new RandomAccessFile(wav, "r")) {
            if (pcm.length() <= 44) throw new IOException("No microphone frames recorded");
            pcm.seek(44); // VoiceRecording writes fixed 16 kHz, mono, signed PCM16 WAV.
            MediaFormat format = MediaFormat.createAudioFormat("audio/mp4a-latm", 16000, 1);
            format.setInteger(MediaFormat.KEY_AAC_PROFILE, MediaCodecInfo.CodecProfileLevel.AACObjectLC);
            format.setInteger(MediaFormat.KEY_BIT_RATE, 64000);
            codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE);
            codec.start(); codecStarted = true;
            mux = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            boolean inputEnded = false, ended = false; long samples = 0;
            int track = -1; long lastProgress = android.os.SystemClock.elapsedRealtime();
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            while (!ended) {
                if (android.os.SystemClock.elapsedRealtime() - lastProgress > 15000)
                    throw new IOException("Audio encoder stalled");
                if (!inputEnded) {
                    int slot = codec.dequeueInputBuffer(10000);
                    if (slot >= 0) {
                        ByteBuffer buffer = codec.getInputBuffer(slot); buffer.clear();
                        int count = (int)Math.min(pcm.length() - pcm.getFilePointer(), buffer.remaining() & ~1);
                        byte[] bytes = new byte[count]; pcm.readFully(bytes); buffer.put(bytes);
                        inputEnded = pcm.getFilePointer() == pcm.length();
                        codec.queueInputBuffer(slot, 0, count, samples * 1000000L / 16000,
                            inputEnded ? MediaCodec.BUFFER_FLAG_END_OF_STREAM : 0);
                        samples += count / 2; lastProgress = android.os.SystemClock.elapsedRealtime();
                    }
                }
                int slot = codec.dequeueOutputBuffer(info, 10000);
                if (slot == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) {
                    track = mux.addTrack(codec.getOutputFormat()); mux.start(); muxStarted = true;
                    lastProgress = android.os.SystemClock.elapsedRealtime();
                } else if (slot >= 0) {
                    try {
                        if (info.size > 0 && (info.flags & MediaCodec.BUFFER_FLAG_CODEC_CONFIG) == 0) {
                            if (!muxStarted) throw new IOException("Audio format unavailable");
                            mux.writeSampleData(track, codec.getOutputBuffer(slot), info);
                        }
                        ended = (info.flags & MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0;
                        lastProgress = android.os.SystemClock.elapsedRealtime();
                    } finally { codec.releaseOutputBuffer(slot, false); }
                }
            }
            if (!muxStarted) throw new IOException("No encoded audio track");
            mux.stop(); muxStarted = false;
        } finally {
            if (codecStarted) try { codec.stop(); } catch (RuntimeException ignored) {}
            codec.release();
            if (mux != null) {
                if (muxStarted) try { mux.stop(); } catch (RuntimeException ignored) {}
                mux.release();
            }
        }
    }
}
