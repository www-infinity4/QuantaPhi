package org.quantaphi.bubbles;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.media.MediaMuxer;
import java.io.File;
import java.io.IOException;
import java.nio.ByteBuffer;

/**
 * Lossless MP4 clip extraction of Bubbles' own screen+mic recording.
 * Uses sync-frame boundaries; does not re-encode, alter, or delete the source.
 */
final class CaptureClipEditor {
    private CaptureClipEditor() {}

    static File trim(File source, File output, int fromSecond, int untilSecond) throws IOException {
        if (source == null || !source.isFile() || source.length() <= 0)
            throw new IOException("Record and save a screen video before clipping");
        if (output == null || output.equals(source) || fromSecond < 0
                || untilSecond <= fromSecond || untilSecond - fromSecond > 300)
            throw new IOException("Clip range must be valid and at most five minutes");
        MediaMetadataRetriever metadata = new MediaMetadataRetriever();
        long durationMs;
        int orientation = 0;
        try {
            metadata.setDataSource(source.getAbsolutePath());
            String duration = metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            if (duration == null) throw new IOException("Video duration is unknown");
            durationMs = Long.parseLong(duration);
            String degrees = metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);
            if (degrees != null) orientation = Integer.parseInt(degrees);
        } finally { metadata.release(); }
        if (fromSecond * 1000L >= durationMs) throw new IOException("Clip begins after video ends");
        long startUs = fromSecond * 1000000L;
        long finishUs = Math.min(durationMs * 1000L, untilSecond * 1000000L);
        MediaExtractor tracks = new MediaExtractor();
        MediaMuxer muxer = null;
        boolean succeeded = false, started = false;
        try {
            tracks.setDataSource(source.getAbsolutePath());
            int count = tracks.getTrackCount();
            int[] selected = new int[count];
            for (int i = 0; i < count; i++) selected[i] = -1;
            int video = -1, audio = -1;
            for (int i = 0; i < count; i++) {
                MediaFormat format = tracks.getTrackFormat(i);
                String mime = format.getString(MediaFormat.KEY_MIME);
                if (mime == null) continue;
                if (video < 0 && mime.startsWith("video/")) video = i;
                else if (audio < 0 && mime.startsWith("audio/")) audio = i;
            }
            if (video < 0) throw new IOException("The recording has no video track");
            // Determine exact video-keyframe time before writing any other track.
            tracks.selectTrack(video);
            tracks.seekTo(startUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC);
            long anchorUs = tracks.getSampleTime();
            if (anchorUs < 0 || anchorUs >= finishUs)
                throw new IOException("No video keyframe exists in that clip");
            tracks.unselectTrack(video);
            muxer = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            if (orientation == 0 || orientation == 90 || orientation == 180 || orientation == 270)
                muxer.setOrientationHint(orientation);
            selected[video] = muxer.addTrack(tracks.getTrackFormat(video));
            if (audio >= 0) selected[audio] = muxer.addTrack(tracks.getTrackFormat(audio));
            muxer.start(); started = true;
            int videoFrames = 0;
            for (int i = 0; i < count; i++) {
                if (selected[i] < 0) continue;
                tracks.selectTrack(i);
                tracks.seekTo(anchorUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC);
                ByteBuffer buffer = ByteBuffer.allocateDirect(4 * 1024 * 1024);
                MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
                while (true) {
                    long sampleUs = tracks.getSampleTime();
                    if (sampleUs < 0 || sampleUs >= finishUs) break;
                    if (sampleUs < anchorUs) { if (!tracks.advance()) break; continue; }
                    if (tracks.getSampleSize() > buffer.capacity())
                        throw new IOException("Video sample exceeds safe clip buffer");
                    buffer.clear();
                    int size = tracks.readSampleData(buffer, 0);
                    if (size < 0) break;
                    info.offset = 0;
                    info.size = size;
                    info.presentationTimeUs = sampleUs - anchorUs;
                    info.flags = tracks.getSampleFlags();
                    muxer.writeSampleData(selected[i], buffer, info);
                    if (i == video) videoFrames++;
                    if (!tracks.advance()) break;
                }
                tracks.unselectTrack(i);
            }
            if (videoFrames == 0) throw new IOException("No video frames written");
            muxer.stop(); started = false;
            muxer.release(); muxer = null;
            succeeded = true;
            return output;
        } catch (RuntimeException error) {
            throw new IOException("Could not trim MP4 safely: " + error.getClass().getSimpleName(), error);
        } finally {
            tracks.release();
            if (muxer != null) {
                if (started) try { muxer.stop(); } catch (RuntimeException ignored) { succeeded = false; }
                muxer.release();
            }
            if (!succeeded) output.delete();
        }
    }
}
