package org.quantaphi.bubbles;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.app.ActivityManager;
import android.content.ComponentCallbacks2;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioPlaybackCaptureConfiguration;
import android.media.AudioRecord;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;

/**
 * Phone playback recognition: dedicated Android MediaProjection audio source.
 * It NEVER opens a second microphone or sends raw audio to Bubbles chat.
 * A separate foreground notification and explicit Android permission are
 * required; there is no arbitrary five-minute timeout while consent remains.
 * Android/app playback policies may produce silence even during active media.
 */
public final class PhonePlaybackService extends Service {
    static final String STOP = "org.quantaphi.bubbles.PHONE_PLAYBACK_STOP";
    private static final String CHANNEL = "bubbles_phone_playback";
    private static final int NOTIFY_ID = 519;
    private final Handler main = new Handler(Looper.getMainLooper());
    private MediaProjection projection;
    private MediaProjection.Callback projectionCallback;
    private AudioRecord playback;
    private Thread worker;
    private volatile boolean running;
    private Model leasedModel;
    private volatile boolean memoryStopped;

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        if (projection != null || worker != null) return START_NOT_STICKY;
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.createNotificationChannel(new NotificationChannel(CHANNEL,
            "Bubbles phone playback listener", NotificationManager.IMPORTANCE_LOW));
        PendingIntent stop = PendingIntent.getService(this, 81,
            new Intent(this, PhonePlaybackService.class).setAction(STOP),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification status = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentTitle("Bubbles · listening to eligible phone audio")
            .setContentText("Transcribing locally · separate from Bubbles microphone")
            .setOngoing(true)
            .addAction(android.R.drawable.ic_media_pause, "Stop phone audio", stop).build();
        try {
            if (Build.VERSION.SDK_INT < 29)
                throw new IllegalStateException("Phone audio capture requires Android 10 or newer");
            startForeground(NOTIFY_ID, status, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
            Intent consent = Build.VERSION.SDK_INT >= 33
                ? intent.getParcelableExtra("consent", Intent.class)
                : intent.getParcelableExtra("consent");
            if (consent == null || intent.getIntExtra("result", 0) != Activity.RESULT_OK)
                throw new SecurityException("Phone audio capture not authorized");
            // On low-RAM phones the WebView, one Vosk recognizer, and a second
            // playback recognizer can exceed the process memory budget. Keep
            // the owner's main conversation alive instead of crashing the APK.
            ActivityManager am = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
            if (am != null) {
                ActivityManager.MemoryInfo info = new ActivityManager.MemoryInfo();
                am.getMemoryInfo(info);
                if (info.lowMemory) {
                    memoryStopped = true;
                    throw new IllegalStateException("Insufficient available RAM for playback transcription");
                }
            }
            leasedModel = BubblesService.borrowVoiceModel();
            if (leasedModel == null)
                throw new IllegalStateException("Start Bubbles voice and let its offline model finish loading first");
            projection = ((MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE))
                .getMediaProjection(Activity.RESULT_OK, consent);
            projectionCallback = new MediaProjection.Callback() {
                @Override public void onStop() {
                    main.post(() -> {
                        BrainNotes.prefs(PhonePlaybackService.this).edit()
                            .putString("phone_media_state", "Android stopped phone playback capture").apply();
                        stopSelf();
                    });
                }
            };
            projection.registerCallback(projectionCallback, main);
            // Exclude Bubbles' own spoken status/TTS to avoid a recursive echo.
            AudioPlaybackCaptureConfiguration capture = new AudioPlaybackCaptureConfiguration.Builder(projection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .excludeUid(getApplicationInfo().uid)
                .build();
            int minimum = AudioRecord.getMinBufferSize(16000, AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT);
            if (minimum <= 0) throw new IllegalStateException("Playback PCM format unavailable");
            playback = new AudioRecord.Builder()
                .setAudioPlaybackCaptureConfig(capture)
                .setAudioFormat(new AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(16000).setChannelMask(AudioFormat.CHANNEL_IN_MONO).build())
                .setBufferSizeInBytes(Math.max(8192, minimum))
                .build();
            if (playback.getState() != AudioRecord.STATE_INITIALIZED)
                throw new IllegalStateException("Playback recorder unavailable");
            playback.startRecording();
            running = true;
            MediaNotes.setActive(this, true);
            BrainNotes.prefs(this).edit().putString("phone_media_state",
                "Listening to eligible app media and game sound; no fixed session timer").apply();
            final AudioRecord source = playback;
            final Model model = leasedModel;
            worker = new Thread(() -> {
                final SpeechEnergyWindow energy = new SpeechEnergyWindow();
                short[] pcm = new short[1600]; // 100 ms frames
                try (Recognizer decoder = new Recognizer(model, 16000f)) {
                    while (running) {
                        int count = source.read(pcm, 0, pcm.length);
                        if (count < 0) throw new IllegalStateException("Phone audio read interrupted");
                        if (count == 0) continue;
                        double total = 0;
                        for (int i = 0; i < count; i++) total += (double)pcm[i] * pcm[i];
                        float level = Math.min(1f, (float)Math.sqrt(total / count) / 6000f);
                        energy.observe(level, count);
                        if (decoder.acceptWaveForm(pcm, count)) {
                            String text = new JSONObject(decoder.getResult()).optString("text", "");
                            if (SpeechTranscriptGate.plausible(text, energy.takeVoicedMillis()))
                                MediaNotes.add(this, text);
                        }
                    }
                } catch (Throwable error) {
                    // A second native recognizer can exhaust Java/native heap
                    // under memory pressure. Stop THIS optional lane, retain
                    // saved text, and leave Bubbles' primary microphone alive.
                    if (running) {
                        final String reason = error instanceof OutOfMemoryError
                            ? "Background audio stopped to protect memory"
                            : "Phone audio listener failed: " + error.getClass().getSimpleName();
                        main.post(() -> BrainNotes.prefs(this).edit()
                            .putString("phone_media_state", reason)
                            .putString("phone_media_last_failure", reason).apply());
                    }
                } finally {
                    BubblesService.releaseVoiceModel(model);
                    if (running) main.post(this::stopSelf);
                }
            }, "Bubbles-phone-playback-transcription");
            worker.start();
        } catch (Exception error) {
            BrainNotes.prefs(this).edit().putString("phone_media_state",
                "Phone audio could not start: " + error.getClass().getSimpleName()
                  + (error.getMessage() == null ? "" : " — " + error.getMessage())).apply();
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    @Override public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL && !memoryStopped) {
            memoryStopped = true;
            BrainNotes.prefs(this).edit().putString("phone_media_state",
                "Background audio paused because the phone needs memory; saved notes remain available").apply();
            main.post(this::stopSelf);
        }
    }
    @Override public void onLowMemory() {
        super.onLowMemory();
        if (!memoryStopped) {
            memoryStopped = true;
            BrainNotes.prefs(this).edit().putString("phone_media_state",
                "Background audio stopped under low memory; saved notes remain available").apply();
            main.post(this::stopSelf);
        }
    }

    @Override public void onDestroy() {
        running = false;
        MediaNotes.setActive(this, false);
        if (playback != null) {
            try { playback.stop(); } catch (Exception ignored) {}
            try { playback.release(); } catch (Exception ignored) {}
            playback = null;
        }
        if (projection != null) {
            try {
                if (projectionCallback != null) projection.unregisterCallback(projectionCallback);
                projection.stop();
            } catch (RuntimeException ignored) {}
            projection = null;
        }
        // If the worker never started, return its model lease here.
        if (worker == null && leasedModel != null) BubblesService.releaseVoiceModel(leasedModel);
        leasedModel = null;
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
