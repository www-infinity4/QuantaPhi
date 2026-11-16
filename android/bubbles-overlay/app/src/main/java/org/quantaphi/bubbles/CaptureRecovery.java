package org.quantaphi.bubbles;

import android.content.ContentResolver;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import java.io.File;
import java.io.IOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Recover valid, unexported MP4s after a recorder/exporter process interruption.
 * Runs only when the capture service is absent, without opening a microphone or
 * requesting screen sharing again. Never deletes, uploads, or edits originals.
 */
final class CaptureRecovery {
    private static final AtomicBoolean WORKING = new AtomicBoolean(false);
    private CaptureRecovery() {}

    static void recover(Context context) {
        if (ScreenCaptureService.isRunning() || !WORKING.compareAndSet(false, true)) return;
        final Context app = context.getApplicationContext();
        Thread worker = new Thread(() -> {
            int recovered = 0, incomplete = 0, failures = 0;
            try {
                File directory = new File(app.getFilesDir(), "captures");
                File[] candidates = directory.listFiles(file -> file.isFile()
                    && file.getName().matches("screen-[0-9]+\\.mp4"));
                if (candidates == null || candidates.length == 0) return;
                Arrays.sort(candidates, Comparator.comparingLong(File::lastModified).reversed());
                // Bound work on a low-RAM Motorola; later launches can retry.
                int count = Math.min(12, candidates.length);
                SharedPreferences prefs = BrainNotes.prefs(app);
                for (int i = 0; i < count; i++) {
                    if (ScreenCaptureService.isRunning()) return;
                    File video = candidates[i];
                    try {
                        if (!isPlayable(video)) {
                            incomplete++;
                            continue;
                        }
                        if (alreadyPublished(app.getContentResolver(), video.getName()))
                            continue;
                        Uri uri = CapturePublisher.publish(app, video, "video/mp4");
                        // Persist a receipt only after MediaStore finished its copy.
                        prefs.edit().putString("capture_recovered_" + video.getName(),
                            uri.toString()).apply();
                        recovered++;
                    } catch (Exception error) {
                        // A pending or incomplete recording stays in private storage.
                        failures++;
                    }
                }
                if (recovered > 0 || incomplete > 0 || failures > 0) {
                    String status = recovered + " prior recording(s) recovered to Movies/Bubbles"
                        + (incomplete > 0 ? "; " + incomplete + " unfinished video(s) retained" : "")
                        + (failures > 0 ? "; " + failures + " video(s) could not be exported" : "");
                    prefs.edit().putString("capture_recovery_state", status).apply();
                }
            } finally {
                WORKING.set(false);
            }
        }, "Bubbles-recording-recovery");
        worker.setDaemon(true);
        worker.start();
    }

    /** Check for a readable finalized video track, not merely an .mp4 name. */
    static boolean isPlayable(File video) {
        if (video == null || !video.isFile() || video.length() <= 1024L) return false;
        MediaExtractor extractor = new MediaExtractor();
        try {
            extractor.setDataSource(video.getAbsolutePath());
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                MediaFormat format = extractor.getTrackFormat(i);
                String mime = format.getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.startsWith("video/")) {
                    extractor.selectTrack(i);
                    return extractor.getSampleTime() >= 0;
                }
            }
        } catch (Exception ignored) {
            // MediaRecorder may have died before writing the MP4 index.
        } finally {
            extractor.release();
        }
        return false;
    }

    /** Query the user's existing Movies/Bubbles entries to avoid duplicate exports. */
    private static boolean alreadyPublished(ContentResolver resolver, String name) throws IOException {
        String path = Environment.DIRECTORY_MOVIES + "/Bubbles/";
        String[] columns = { MediaStore.MediaColumns._ID, MediaStore.MediaColumns.SIZE };
        String where = MediaStore.MediaColumns.DISPLAY_NAME + "=? AND "
            + MediaStore.MediaColumns.RELATIVE_PATH + "=? AND "
            + MediaStore.MediaColumns.IS_PENDING + "=0";
        try (Cursor cursor = resolver.query(MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                columns, where, new String[]{name, path}, null)) {
            if (cursor == null) throw new IOException("Cannot verify existing recordings");
            while (cursor.moveToNext()) {
                if (cursor.getLong(1) > 0L) return true;
            }
            return false;
        } catch (RuntimeException error) {
            // Fail closed rather than duplicating an already saved recording.
            throw new IOException("Cannot inspect the phone media library", error);
        }
    }
}
