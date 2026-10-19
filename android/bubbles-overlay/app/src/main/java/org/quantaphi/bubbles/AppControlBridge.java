package org.quantaphi.bubbles;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Launches an installed app only on an explicit owner-issued voice or typed command.
 * UI navigation inside that app remains handled by the opt-in Accessibility bridge.
 * This component cannot grant permissions, access app storage or execute hidden actions.
 */
final class AppControlBridge {
    private static final Pattern OPEN = Pattern.compile(
        "^(?:open|launch|switch to|bring up|go to)\\s+(?:the\\s+)?(.+?)(?:\\s+app)?$",
        Pattern.CASE_INSENSITIVE);
    private AppControlBridge() {}

    static String tryLaunch(Context context, String request) {
        if (request == null) return null;
        Matcher match = OPEN.matcher(request.trim());
        if (!match.matches()) return null;
        String wanted = normalize(match.group(1));
        if (wanted.isEmpty()) return "Tell me which installed app to open.";
        // XRecorder is installed with a generic launcher label on some builds.
        if ("xrecorder".equals(wanted) || "x recorder".equals(wanted)) {
            Intent intent = context.getPackageManager()
                .getLaunchIntentForPackage(XRecorderBridge.PACKAGE);
            return open(context, intent, "XRecorder");
        }
        PackageManager pm = context.getPackageManager();
        Intent query = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> candidates = pm.queryIntentActivities(query, 0);
        Map<String, String> matched = new HashMap<>();
        for (ResolveInfo item : candidates) {
            if (item.activityInfo == null) continue;
            String label = String.valueOf(item.loadLabel(pm));
            if (wanted.equals(normalize(label))) {
                matched.put(item.activityInfo.packageName, label);
            }
        }
        if (matched.isEmpty()) return "I couldn't find an installed app named " + match.group(1) + ".";
        if (matched.size() != 1) return "Several installed apps match that name. Say the full app name.";
        Map.Entry<String, String> found = matched.entrySet().iterator().next();
        return open(context, pm.getLaunchIntentForPackage(found.getKey()), found.getValue());
    }

    /** Resolve one exact visible launcher label before starting a spoken sequence. */
    static String packageForName(Context context, String name) {
        String wanted = normalize(name);
        if ("xrecorder".equals(wanted) || "x recorder".equals(wanted))
            return context.getPackageManager().getLaunchIntentForPackage(XRecorderBridge.PACKAGE) == null
                ? null : XRecorderBridge.PACKAGE;
        PackageManager pm = context.getPackageManager();
        Intent query = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        Map<String, String> matching = new HashMap<>();
        for (ResolveInfo item : pm.queryIntentActivities(query, 0)) {
            if (item.activityInfo != null && wanted.equals(normalize(String.valueOf(item.loadLabel(pm)))))
                matching.put(item.activityInfo.packageName, String.valueOf(item.loadLabel(pm)));
        }
        return matching.size() == 1 ? matching.keySet().iterator().next() : null;
    }

    private static String open(Context context, Intent intent, String label) {
        if (intent == null) return label + " cannot be launched from Bubbles.";
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP));
            // startActivity returning is NOT evidence the UI appeared.
            return "Requested " + label + ". Check the foreground screen to confirm it opened.";
        } catch (RuntimeException error) {
            return "Android did not open " + label + ". Check whether Bubbles can launch apps.";
        }
    }

    private static String normalize(String text) {
        return text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ")
            .replaceAll("\\s+", " ").trim();
    }
}
