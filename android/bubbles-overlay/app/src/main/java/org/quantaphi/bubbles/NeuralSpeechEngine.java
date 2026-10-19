package org.quantaphi.bubbles;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.speech.tts.TextToSpeech;
import java.util.List;

/**
 * Select a separately installed offline neural Android TTS service for Bubbles.
 * No voice models are bundled or downloaded and the OS default is unchanged.
 * Engine availability is a service check, never an identity/permission proof.
 */
final class NeuralSpeechEngine {
    static final String HAYAI_PACKAGE = "dev.ahmedmohamed.hayaitts";
    static final String TTS_SERVICE_ACTION = "android.intent.action.TTS_SERVICE";

    private NeuralSpeechEngine() {}

    static boolean available(Context context, String packageName) {
        if (packageName == null || packageName.isEmpty()
                || !packageName.matches("[a-zA-Z0-9_.]{3,180}")) return false;
        try {
            Intent service = new Intent(TTS_SERVICE_ACTION).setPackage(packageName);
            List<ResolveInfo> matches = context.getPackageManager()
                    .queryIntentServices(service, PackageManager.MATCH_DEFAULT_ONLY);
            if (matches == null) return false;
            for (ResolveInfo info : matches) {
                if (info != null && info.serviceInfo != null
                        && packageName.equals(info.serviceInfo.packageName)) return true;
            }
        } catch (RuntimeException ignored) { /* Engine not visible/installed. */ }
        return false;
    }

    static boolean hayaiAvailable(Context context) {
        return available(context, HAYAI_PACKAGE);
    }

    /** Null means use the user's existing Android default engine. */
    static String preferredEngine(Context context) {
        String chosen = context.getSharedPreferences(BubblesVoicePicker.PREFS, Context.MODE_PRIVATE)
                .getString(BubblesVoicePicker.ENGINE, "");
        return available(context, chosen) ? chosen : null;
    }

    /** This selector is Bubbles-only; it never changes Android's default. */
    static boolean useEngine(Context context, String engine) {
        if (!available(context, engine)) return false;
        return context.getSharedPreferences(BubblesVoicePicker.PREFS, Context.MODE_PRIVATE)
                .edit().putString(BubblesVoicePicker.ENGINE, engine)
                .remove(BubblesVoicePicker.VOICE_NAME).commit();
    }

    static boolean useAndroidDefault(Context context) {
        return context.getSharedPreferences(BubblesVoicePicker.PREFS, Context.MODE_PRIVATE)
                .edit().remove(BubblesVoicePicker.ENGINE)
                .remove(BubblesVoicePicker.VOICE_NAME).commit();
    }
}
