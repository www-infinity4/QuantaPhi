package org.quantaphi.bubbles;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.graphics.*;
import android.hardware.display.*;
import android.media.*;
import android.media.projection.*;
import android.os.*;
import java.io.*;
import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** A separate, visibly foregrounded capture session started after Android consent. */
public final class ScreenCaptureService extends Service {
    static final String STOP = "org.quantaphi.bubbles.CAPTURE_STOP";
    private final Handler main = new Handler(Looper.getMainLooper());
    private MediaProjection projection;
    private VirtualDisplay display;
    private MediaRecorder recorder;
    private ImageReader images;
    private File file;
    private VoiceRecording sharedAudio;
    private File capturedAudio;
    private boolean finished, recordingStarted;
    private int pendingPublications = 0;
    private final ExecutorService mediaExport = Executors.newSingleThreadExecutor();
    private File sequenceDirectory;
    private int captureCount;
    private long lastCaptureAt, sequenceIntervalMs;

    @Override public int onStartCommand(Intent intent, int flags, int id) {
        if (intent == null || STOP.equals(intent.getAction())) { finishCapture(); return START_NOT_STICKY; }
        if (projection != null || finished) return START_NOT_STICKY;
        // Screen video is captured directly by Bubbles after Android consent.
        // The assistant's speech recognizer remains the sole microphone client.
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        nm.createNotificationChannel(new NotificationChannel("bubbles_capture", "Bubbles screen capture", NotificationManager.IMPORTANCE_LOW));
        PendingIntent stop = PendingIntent.getService(this, 12, new Intent(this, ScreenCaptureService.class).setAction(STOP),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification = new Notification.Builder(this, "bubbles_capture")
                .setSmallIcon(android.R.drawable.ic_menu_camera).setContentTitle("Bubbles screen capture")
                .setContentText("Capture active · tap Stop to save").setOngoing(true)
                .addAction(android.R.drawable.ic_delete, "Stop capture", stop).build();
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(512, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            else startForeground(512, notification);
            Intent consent = Build.VERSION.SDK_INT >= 33 ? intent.getParcelableExtra("consent", Intent.class) : intent.getParcelableExtra("consent");
            if (consent == null || intent.getIntExtra("result", 0) != Activity.RESULT_OK) throw new IllegalStateException("Screen sharing was not approved");
            projection = ((MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE))
                    .getMediaProjection(Activity.RESULT_OK, consent);
            BrainNotes.prefs(this).edit().putBoolean("capture_active", true).putBoolean("capture_recording", false)
                    .putString("capture_state", "Screen capture authorized; starting").apply();
            projection.registerCallback(new MediaProjection.Callback() {
                @Override public void onStop() { finishCapture(); }
            }, main);
            android.util.DisplayMetrics metrics = new android.util.DisplayMetrics();
            ((android.view.WindowManager) getSystemService(WINDOW_SERVICE)).getDefaultDisplay().getRealMetrics(metrics);
            int width = Math.max(2, (metrics.widthPixels / 2) * 2);
            int height = Math.max(2, (metrics.heightPixels / 2) * 2);
            File directory = new File(getFilesDir(), "captures"); directory.mkdirs();
            boolean screenshot = intent.getBooleanExtra("screenshot", false);
            int intervalSeconds = intent.getIntExtra("interval_seconds", 0);
            int durationSeconds = intent.getIntExtra("duration_seconds", 0);
            final boolean sequence = screenshot && intervalSeconds > 0 && durationSeconds > 0;
            if (screenshot) {
                if (sequence) {
                    intervalSeconds = Math.max(2, Math.min(60, intervalSeconds));
                    durationSeconds = Math.max(10, Math.min(300, durationSeconds));
                    sequenceIntervalMs = 1000L * intervalSeconds;
                    sequenceDirectory = new File(directory, "screen-series-" + System.currentTimeMillis());
                    if (!sequenceDirectory.mkdirs()) throw new IOException("Could not create capture folder");
                } else {
                    file = new File(directory, "screen-" + System.currentTimeMillis() + ".png");
                }
                images = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
                images.setOnImageAvailableListener(reader -> {
                    if (finished) return;
                    try (Image image = reader.acquireLatestImage()) {
                        if (image == null) return;
                        long now = SystemClock.elapsedRealtime();
                        if (sequence && captureCount > 0 && now - lastCaptureAt < sequenceIntervalMs) return;
                        if (sequence && captureCount >= 60) { main.post(this::finishCapture); return; }
                        Image.Plane plane = image.getPlanes()[0];
                        int paddedWidth = plane.getRowStride() / plane.getPixelStride();
                        Bitmap padded = Bitmap.createBitmap(paddedWidth, image.getHeight(), Bitmap.Config.ARGB_8888);
                        padded.copyPixelsFromBuffer(plane.getBuffer());
                        Bitmap bitmap = Bitmap.createBitmap(padded, 0, 0, image.getWidth(), image.getHeight());
                        if (sequence) {
                            int targetWidth = Math.min(720, bitmap.getWidth());
                            int targetHeight = Math.max(1, Math.round(bitmap.getHeight() * targetWidth / (float)bitmap.getWidth()));
                            Bitmap small = Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true);
                            file = new File(sequenceDirectory, String.format(java.util.Locale.ROOT, "screen-%03d.jpg", captureCount + 1));
                            try (FileOutputStream output = new FileOutputStream(file)) {
                                if (!small.compress(Bitmap.CompressFormat.JPEG, 75, output))
                                    throw new IOException("Could not encode screenshot");
                            }
                            if (small != bitmap) small.recycle();
                            lastCaptureAt = now;
                            captureCount++;
                            savePath("image/jpeg");
                            BrainNotes.prefs(this).edit().putString("capture_series_dir", sequenceDirectory.getAbsolutePath())
                                .putInt("capture_count", captureCount)
                                .putString("capture_state", "Screen series: " + captureCount + " saved locally").apply();
                        } else {
                            try (FileOutputStream output = new FileOutputStream(file)) { bitmap.compress(Bitmap.CompressFormat.PNG, 100, output); }
                            savePath("image/png");
                        }
                        if (bitmap != padded) bitmap.recycle(); padded.recycle();
                        if (!sequence || captureCount >= 60) main.post(this::finishCapture);
                    } catch (Exception error) { fail(error); }
                }, main);
                display = projection.createVirtualDisplay("Bubbles screenshot", width, height, metrics.densityDpi,
                        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, images.getSurface(), null, main);
                BrainNotes.prefs(this).edit().putBoolean("capture_recording", true).putString("capture_state",
                    sequence ? "Capturing screenshots every " + intervalSeconds + " seconds for up to "
                        + durationSeconds + " seconds · one approved session" : "Taking screenshot…").apply();
                main.postDelayed(this::finishCapture, sequence ? durationSeconds * 1000L : 15000L);
            } else {
                // Downscale recordings on the Moto G Pure rather than encode full-resolution frames.
                float scale = Math.min(1f, 720f / width);
                width = Math.max(2, ((int) (width * scale) / 2) * 2);
                height = Math.max(2, ((int) (height * scale) / 2) * 2);
                file = new File(directory, "screen-" + System.currentTimeMillis() + ".mp4");
                // Video-only MediaRecorder avoids taking the microphone away from
                // Vosk/voice commands. Audio mixing is not claimed for this build.
                recorder = new MediaRecorder();
                // Vosk remains the only microphone client throughout recording.
                // Encode its shared PCM after capture, then publish one MP4.
                recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
                recorder.setVideoSize(width, height);
                recorder.setVideoFrameRate(24); recorder.setVideoEncodingBitRate(2500000);
                recorder.setMaxDuration(3600000); recorder.setMaxFileSize(1024L * 1024 * 1024);
                recorder.setOnInfoListener((r, what, extra) -> main.post(this::finishCapture));
                recorder.setOutputFile(file.getAbsolutePath()); recorder.prepare();
                display = projection.createVirtualDisplay("Bubbles recording", width, height, metrics.densityDpi,
                        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, recorder.getSurface(), null, main);
                recorder.start(); recordingStarted = true;
                BrainNotes.prefs(this).edit().putBoolean("capture_recording", true)
                    .putString("capture_state", "Recording screen; Bubbles voice remains active. Stop saves MP4 to Movies/Bubbles").apply();
                main.postDelayed(this::finishCapture, 3600000L);
            }
        } catch (Exception error) { fail(error); }
        return START_NOT_STICKY;
    }
    /** Publish in the Android media library before stopping the foreground service.
     * A private app directory alone is invisible to Gallery/Files on Android 12.
     */
    private void savePath(String type) {
        final File completed = file;
        if (completed == null || !completed.isFile()) return;
        pendingPublications++;
        BrainNotes.prefs(this).edit().putString("capture_path", completed.getAbsolutePath())
            .putString("capture_type", type).putString("capture_state", "Saving " + completed.getName()
                + " to phone library…").apply();
        final File audio = type.startsWith("video/") ? capturedAudio : null;
        mediaExport.execute(() -> {
            String outcome;
            try {
                android.net.Uri saved = CapturePublisher.publish(this, completed, type);
                if (audio != null) audio.delete();
                String library = type.startsWith("video/") ? "Movies" : "Pictures";
                BrainNotes.prefs(this).edit().putString("capture_uri", saved.toString()).apply();
                outcome = "Saved " + completed.getName() + " to " + library + "/Bubbles";
            } catch (Exception error) {
                outcome = "Gallery export failed (" + error.getClass().getSimpleName()
                    + "); original remains in Bubbles private storage";
                BrainNotes.prefs(this).edit().putString("capture_export_error",
                    error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage()).apply();
            }
            // Preserve the user's definitive save/failure status for each capture.
            BrainNotes.prefs(this).edit().putString("capture_state", outcome).apply();
            main.post(() -> {
                pendingPublications--;
                stopIfPublished();
            });
        });
    }
    private void stopIfPublished() {
        if (!finished || pendingPublications > 0) return;
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
        mediaExport.shutdown();
    }
    private void fail(Exception error) {
        BrainNotes.prefs(this).edit().putString("capture_state", "Capture failed: " + error.getClass().getSimpleName()).apply();
        finishCapture();
    }
    private void finishCapture() {
        if (finished) return;
        finished = true;
        BrainNotes.prefs(this).edit().putBoolean("capture_active", false).putBoolean("capture_recording", false).apply();
        main.removeCallbacksAndMessages(null);
        if (sequenceDirectory != null) {
            BrainNotes.prefs(this).edit().putString("capture_state", "Screen series finished: "
                + captureCount + " screenshots saved locally").apply();
        }
        if (sharedAudio != null) {
            try { capturedAudio = sharedAudio.finish(); }
            catch (Exception error) {
                BrainNotes.prefs(this).edit().putString("capture_export_error", "Shared microphone finalization failed").apply();
            }
            sharedAudio = null;
        }
        if (recorder != null) {
            boolean valid = false;
            if (recordingStarted) {
                try { recorder.stop(); valid = true; } catch (Exception ignored) {}
            }
            recorder.release(); recorder = null;
            if (valid) savePath("video/mp4");
            else {
                if (file != null) file.delete();
                BrainNotes.prefs(this).edit().putString("capture_state",
                    "Screen recording did not finalize; no video was saved").apply();
            }
        }
        if (display != null) { display.release(); display = null; }
        if (images != null) { images.close(); images = null; }
        if (projection != null) { projection.stop(); projection = null; }
        // The MP4 owns its audio track. Do not unexpectedly stop and save a
        // separate microphone recording the user may have started independently.
        // MediaStore copies can take longer than stopping MediaRecorder.
        // Keep the capture service alive until Gallery publication completes.
        stopIfPublished();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        if (!finished) finishCapture();
        mediaExport.shutdown();
        super.onDestroy();
    }
}
