package org.quantaphi.bubbles;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.AudioPlaybackConfiguration;
import android.os.Handler;
import java.util.List;

/**
 * Observes phone MEDIA/GAME playback as a distinct source from microphone PCM.
 * This is not speaker identification: it can reject TV/app playback in a
 * conservative mode, but cannot prove which human is speaking.
 */
final class PlaybackAwareness {
    private final AudioManager manager;
    private final AudioManager.AudioPlaybackCallback callback;
    private volatile boolean externalMedia;
    PlaybackAwareness(Context context, Handler main) {
        manager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        callback = new AudioManager.AudioPlaybackCallback() {
            @Override public void onPlaybackConfigChanged(List<AudioPlaybackConfiguration> configs) {
                boolean active = false;
                if (configs != null) for (AudioPlaybackConfiguration config : configs) {
                    // getActivePlaybackConfigurations() contains active sessions;
                    // isActive() itself is hidden from ordinary Android apps.
                    int usage = config.getAudioAttributes().getUsage();
                    if (usage == AudioAttributes.USAGE_MEDIA || usage == AudioAttributes.USAGE_GAME) {
                        active = true;
                        break;
                    }
                }
                externalMedia = active;
            }
        };
        if (manager != null) {
            manager.registerAudioPlaybackCallback(callback, main);
            callback.onPlaybackConfigChanged(manager.getActivePlaybackConfigurations());
        }
    }
    boolean mediaPlaying() {
        return externalMedia || (manager != null && manager.isMusicActive());
    }
    void close() {
        if (manager != null) manager.unregisterAudioPlaybackCallback(callback);
        externalMedia = false;
    }
}
