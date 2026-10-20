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
    static final String PAUSE = "org.quantaphi.bubbles.CAPTURE_PAUSE";
    static final String RESUME = "org.quantaphi.bubbles.CAPTURE_RESUME";
    private final Handler main = new Handler(Looper.getMainLooper());
    private MediaProjection projection;
    private VirtualDisplay display;
    private MediaRecorder recorder;
    private ImageReader images;
    private File file;
    private VoiceRecording sharedAudio;
    private File capturedAudio;
    private boolean finished, recordingStarted, recordingPaused;
    private int pendingPublications = 0;
    // Do not tear down the service while MediaRecorder is still stopping on the worker.
    private boolean finalizingMedia;
    private final ExecutorService mediaExport = Executors.newSingleThreadExecutor();
    private File sequenceDirectory;
    private int captureCount;
    private long lastCaptureAt, sequenceIntervalMs;
    // Keep video running until Stop, Android revokes screen sharing, or the phone
    // runs low on storage. Do not put a hidden five-minute timer on user video.
    private static final long MIN_CAPTURE_FREE_BYTES = 200L * 1024L * 1024L;
    private final Runnable storageGuard = new Runnable() {
        @Override public void run() {
            if (finished || !recordingStarted) return;
            // Saving needs room for the joined audio/video MP4 AND its Gallery
            // copy, in addition to the in-progress video and audio files.
            long exportReserve = MIN_CAPTURE_FREE_BYTES + 2L * (file == null ? 0L : file.length());
            if (getFilesDir().getUsableSpace() < exportReserve) {
                stopReason("Recording stopped to preserve space for saving the video.");
                finishCapture();
                return;
            }
            main.postDelayed(this, 15000L);
        }
    };
    private void stopReason(String reason) {
        BrainNotes.prefs(this).edit().putString("capture_stop_reason", reason).apply();
    }

    @Override public int onStartCommand(Intent intent, int flags, int id) {
        if (intent == null || STOP.equals(intent.getAction())) { finishCapture(); return START_NOT_STICKY; }
        if (PAUSE.equals(intent.getAction()) || RESUME.equals(intent.getAction())) {
            boolean pause = PAUSE.equals(intent.getAction());
            if (finished || recorder == null || !recordingStarted) {
                BrainNotes.prefs(this).edit().putString("capture_state",
                    "No screen video recording to " + (pause ? "pause" : "resume")).apply();
                return START_NOT_STICKY;
            }
            if (pause == recordingPaused) return START_NOT_STICKY;
            try {
                if (pause) {
                    recorder.pause();
                    BubblesService.setScreenAudioPaused(true);
                } else {
                    recorder.resume();
                    BubblesService.setScreenAudioPaused(false);
                }
                recordingPaused = pause;
                BrainNotes.prefs(this).edit().putBoolean("capture_paused", pause)
                    .putString("capture_state", pause ? "Screen recording paused" : "Screen recording resumed").apply();
            } catch (RuntimeException error) {
                BrainNotes.prefs(this).edit().putString("capture_state",
                    "Could not " + (pause ? "pause" : "resume") + " screen video").apply();
            }
            return START_NOT_STICKY;
        }
        if (projection != null || finished) return START_NOT_STICKY;
        // Own the screen/video path here. No third-party recorder or overlay
        // controls, and no second microphone AudioRecord: share Bubbles PCM.
        // Android MediaProjection consent is still required for each session.
        if (!intent.getBooleanExtra("screenshot", false)
                && !BubblesService.isSessionRunning()) {
            BrainNotes.prefs(this).edit().putString("capture_state",
                "Enable Bubbles microphone listening before recording screen video").apply();
            stopSelf();
            return START_NOT_STICKY;
        }
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
            BrainNotes.prefs(this).edit().putBoolean("capture_active", true).putBoolean("capture_recording", false).putBoolean("capture_paused", false)
                    .putString("capture_stop_reason", "").putString("capture_state", "Screen capture authorized; starting").apply();
            projection.registerCallback(new MediaProjection.Callback() {
                @Override public void onStop() {
                    if (!finished) stopReason("Android ended screen sharing.");
                    finishCapture();
                }
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
                // A screen recording is one MP4 with microphone sound, not a
                // silent MP4 plus a separate WAV hidden in Music. Android owns
                // the screen permission; microphone permission is checked here.
                if (checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)
                        != android.content.pm.PackageManager.PERMISSION_GRANTED)
                    throw new SecurityException("Microphone permission required for screen video");
                if (getFilesDir().getUsableSpace() < MIN_CAPTURE_FREE_BYTES)
                    throw new IOException("Phone storage is too low to start screen recording");
                recorder = new MediaRecorder();
                // Vosk remains the only microphone client throughout recording.
                // Encode its shared PCM after capture, then publish one MP4.
                recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
                recorder.setVideoSize(width, height);
                recorder.setVideoFrameRate(24); recorder.setVideoEncodingBitRate(2500000);
                // No fixed recording duration or 100 MB file ceiling.
                // Android can still end projection; notification always offers Stop.
                recorder.setOnErrorListener((r, what, extra) -> main.post(() -> {
                    if (!finished) stopReason("Android recorder reported a recording error (" + what + ").");
                    finishCapture();
                }));
                recorder.setOutputFile(file.getAbsolutePath()); recorder.prepare();
                display = projection.createVirtualDisplay("Bubbles recording", width, height, metrics.densityDpi,
                        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, recorder.getSurface(), null, main);
                sharedAudio = BubblesService.beginScreenAudio();
                recorder.start(); recordingStarted = true;
                BrainNotes.prefs(this).edit().putBoolean("capture_recording", true)
                    .putString("capture_state", "Recording screen + microphone into one MP4; Stop saves to Movies/Bubbles").apply();
                main.postDelayed(storageGuard, 15000L);
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
                String soundWarning = "";
                if (type.startsWith("video/")) {
                    if (audio == null) {
                        soundWarning = " · video only; shared microphone audio unavailable";
                    } else {
                        try {
                            SharedScreenAudioMuxer.combine(completed, audio);
                        } catch (Exception soundError) {
                            // Never lose an otherwise valid screen video just because
                            // the phone's AAC encoder/muxer cannot process its audio.
                            soundWarning = " · video only; microphone processing failed";
                            BrainNotes.prefs(this).edit().putString("capture_export_error",
                                "Sound processing: " + soundError.getClass().getSimpleName()).apply();
                        }
                    }
                }
                android.net.Uri saved = CapturePublisher.publish(this, completed, type);
                if (audio != null && soundWarning.isEmpty()) audio.delete();
                String library = type.startsWith("video/") ? "Movies" : "Pictures";
                BrainNotes.prefs(this).edit().putString("capture_uri", saved.toString()).apply();
                outcome = "Saved " + completed.getName() + " to " + library + "/Bubbles" + soundWarning;
            } catch (Exception error) {
                outcome = "Gallery export failed (" + error.getClass().getSimpleName()
                    + "); original remains in Bubbles private storage";
                BrainNotes.prefs(this).edit().putString("capture_export_error",
                    error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage()).apply();
            }
            // Preserve the actual stop reason alongside the gallery save receipt.
            String reason = BrainNotes.prefs(this).getString("capture_stop_reason", "");
            if (!reason.isEmpty()) outcome += " · " + reason;
            BrainNotes.prefs(this).edit().putString("capture_state", outcome).apply();
            main.post(() -> {
                pendingPublications--;
                stopIfPublished();
            });
        });
    }
    private void stopIfPublished() {
        if (!finished || finalizingMedia || pendingPublications > 0) return;
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
        mediaExport.shutdown();
    }
    private void fail(Exception error) {
        String detail = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
        stopReason("Capture failed: " + detail.substring(0, Math.min(150, detail.length())));
        BrainNotes.prefs(this).edit().putString("capture_state", BrainNotes.prefs(this).getString("capture_stop_reason", "")).apply();
        finishCapture();
    }
    private void finishCapture() {
        // Android may deliver Stop from speech, the notification and the
        // projection callback close together. Only the first owns cleanup.
        if (finished) return;
        finished = true;
        BrainNotes.prefs(this).edit().putBoolean("capture_active", false)
            .putBoolean("capture_recording", false).putBoolean("capture_paused", false).apply();
        main.removeCallbacksAndMessages(null);
        if (sequenceDirectory != null) {
            BrainNotes.prefs(this).edit().putString("capture_state", "Screen series finished: "
                + captureCount + " screenshots saved locally").apply();
        }
        if (recorder != null) {
            // MediaRecorder.stop(), AAC encoding and Gallery export are expensive
            // on the Moto G Pure. They must NEVER block the Android main thread.
            final MediaRecorder stoppingRecorder = recorder; recorder = null;
            final VoiceRecording stoppingAudio = sharedAudio; sharedAudio = null;
            final VirtualDisplay stoppingDisplay = display; display = null;
            final MediaProjection stoppingProjection = projection; projection = null;
            final boolean wasStarted = recordingStarted;
            final boolean wasPaused = recordingPaused;
            final File video = file;
            finalizingMedia = true;
            BrainNotes.prefs(this).edit().putString("capture_state",
                "Stopping video and processing recording…").apply();
            mediaExport.execute(() -> {
                File sound = null;
                boolean validVideo = false;
                try {
                    if (stoppingAudio != null) sound = stoppingAudio.finish();
                } catch (Exception error) {
                    BrainNotes.prefs(this).edit().putString("capture_export_error",
                        "Shared microphone finalization: " + error.getClass().getSimpleName()).apply();
                } finally {
                    BubblesService.setScreenAudioPaused(false);
                }
                try {
                    if (wasStarted) {
                        if (wasPaused) stoppingRecorder.resume();
                        stoppingRecorder.stop();
                        validVideo = true;
                    }
                } catch (RuntimeException error) {
                    stopReason("Android video finalization failed (" + error.getClass().getSimpleName() + ").");
                } finally {
                    try { stoppingRecorder.release(); } catch (RuntimeException ignored) {}
                    try { if (stoppingDisplay != null) stoppingDisplay.release(); } catch (RuntimeException ignored) {}
                    try { if (stoppingProjection != null) stoppingProjection.stop(); } catch (RuntimeException ignored) {}
                }
                if (validVideo) {
                    capturedAudio = sound;
                    savePath("video/mp4");
                } else {
                    // Don't destroy potentially recoverable raw footage.
                    String reason = BrainNotes.prefs(this).getString("capture_stop_reason", "");
                    BrainNotes.prefs(this).edit().putString("capture_state",
                        "Video could not finalize; unfinished file kept in Bubbles private storage"
                        + (reason.isEmpty() ? "" : " · " + reason)).apply();
                }
                main.post(() -> {
                    finalizingMedia = false;
                    stopIfPublished();
                });
            });
            return;
        }
        // Screenshot mode and partially-started sessions need no video encoder.
        BubblesService.setScreenAudioPaused(false);
        if (sharedAudio != null) {
            try { sharedAudio.finish(); } catch (Exception ignored) {}
            sharedAudio = null;
        }
        if (display != null) {
            try { display.release(); } catch (RuntimeException ignored) {}
            display = null;
        }
        if (images != null) { images.close(); images = null; }
        if (projection != null) {
            try { projection.stop(); } catch (RuntimeException ignored) {}
            projection = null;
        }
        stopIfPublished();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        if (!finished) finishCapture();
        mediaExport.shutdown();
        super.onDestroy();
    }
}
