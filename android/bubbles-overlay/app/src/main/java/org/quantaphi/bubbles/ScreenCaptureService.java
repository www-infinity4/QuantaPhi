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

/** A separate, visibly foregrounded capture session started after Android consent. */
public final class ScreenCaptureService extends Service {
    static final String STOP = "org.quantaphi.bubbles.CAPTURE_STOP";
    private final Handler main = new Handler(Looper.getMainLooper());
    private MediaProjection projection;
    private VirtualDisplay display;
    private MediaRecorder recorder;
    private ImageReader images;
    private File file;
    private boolean finished, recordingStarted;

    @Override public int onStartCommand(Intent intent, int flags, int id) {
        if (intent == null || STOP.equals(intent.getAction())) { finishCapture(); return START_NOT_STICKY; }
        if (projection != null) return START_NOT_STICKY;
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
            projection.registerCallback(new MediaProjection.Callback() {
                @Override public void onStop() { finishCapture(); }
            }, main);
            android.util.DisplayMetrics metrics = new android.util.DisplayMetrics();
            ((android.view.WindowManager) getSystemService(WINDOW_SERVICE)).getDefaultDisplay().getRealMetrics(metrics);
            int width = Math.max(2, (metrics.widthPixels / 2) * 2);
            int height = Math.max(2, (metrics.heightPixels / 2) * 2);
            File directory = new File(getFilesDir(), "captures"); directory.mkdirs();
            boolean screenshot = intent.getBooleanExtra("screenshot", false);
            if (screenshot) {
                file = new File(directory, "screen-" + System.currentTimeMillis() + ".png");
                images = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);
                images.setOnImageAvailableListener(reader -> {
                    if (finished) return;
                    try (Image image = reader.acquireLatestImage()) {
                        if (image == null) return;
                        Image.Plane plane = image.getPlanes()[0];
                        int paddedWidth = plane.getRowStride() / plane.getPixelStride();
                        Bitmap padded = Bitmap.createBitmap(paddedWidth, image.getHeight(), Bitmap.Config.ARGB_8888);
                        padded.copyPixelsFromBuffer(plane.getBuffer());
                        Bitmap bitmap = Bitmap.createBitmap(padded, 0, 0, image.getWidth(), image.getHeight());
                        try (FileOutputStream output = new FileOutputStream(file)) { bitmap.compress(Bitmap.CompressFormat.PNG, 100, output); }
                        if (bitmap != padded) bitmap.recycle(); padded.recycle();
                        savePath("image/png");
                        main.post(this::finishCapture);
                    } catch (Exception error) { fail(error); }
                }, main);
                display = projection.createVirtualDisplay("Bubbles screenshot", width, height, metrics.densityDpi,
                        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, images.getSurface(), null, main);
                main.postDelayed(this::finishCapture, 15000);
            } else {
                // Downscale recordings on the Moto G Pure rather than encode full-resolution frames.
                float scale = Math.min(1f, 720f / width);
                width = Math.max(2, ((int) (width * scale) / 2) * 2);
                height = Math.max(2, ((int) (height * scale) / 2) * 2);
                file = new File(directory, "screen-" + System.currentTimeMillis() + ".mp4");
                recorder = new MediaRecorder();
                recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
                recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
                recorder.setVideoSize(width, height);
                recorder.setVideoFrameRate(24); recorder.setVideoEncodingBitRate(2500000);
                recorder.setMaxDuration(300000); recorder.setMaxFileSize(100 * 1024 * 1024);
                recorder.setOnInfoListener((r, what, extra) -> main.post(this::finishCapture));
                recorder.setOutputFile(file.getAbsolutePath()); recorder.prepare();
                display = projection.createVirtualDisplay("Bubbles recording", width, height, metrics.densityDpi,
                        DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, recorder.getSurface(), null, main);
                recorder.start(); recordingStarted = true;
                BrainNotes.prefs(this).edit().putString("capture_state", "Screen video recording; microphone audio is a separate WAV when enabled").apply();
                main.postDelayed(this::finishCapture, 300000);
            }
        } catch (Exception error) { fail(error); }
        return START_NOT_STICKY;
    }
    private void savePath(String type) {
        BrainNotes.prefs(this).edit().putString("capture_path", file.getAbsolutePath())
                .putString("capture_type", type).putString("capture_state", "Saved " + file.getName()).apply();
    }
    private void fail(Exception error) {
        BrainNotes.prefs(this).edit().putString("capture_state", "Capture failed: " + error.getClass().getSimpleName()).apply();
        finishCapture();
    }
    private void finishCapture() {
        if (finished) return;
        finished = true;
        main.removeCallbacksAndMessages(null);
        if (recorder != null) {
            boolean valid = false;
            if (recordingStarted) {
                try { recorder.stop(); valid = true; } catch (Exception ignored) {}
            }
            recorder.release(); recorder = null;
            if (valid) savePath("video/mp4"); else if (file != null) file.delete();
        }
        if (display != null) { display.release(); display = null; }
        if (images != null) { images.close(); images = null; }
        if (projection != null) { projection.stop(); projection = null; }
        try { startService(new Intent(this, BubblesService.class).setAction(BubblesService.ACTION_SAVE_AUDIO)); }
        catch (Exception ignored) {}
        stopForeground(STOP_FOREGROUND_REMOVE); stopSelf();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() { finishCapture(); super.onDestroy(); }
}
