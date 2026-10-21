package org.quantaphi.bubblesone;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import java.net.URI;

final class AppBridge {
    private AppBridge() {}
    static String findOnPlay(Context context, String name) {
        if (name == null || name.trim().isEmpty()) return "Tell me the app name.";
        String search = name.trim().substring(0, Math.min(80, name.trim().length()));
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://search?q=" + Uri.encode(search)));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { context.startActivity(intent); return "Opened Google Play to look for " + search + ". No application was installed."; }
        catch (RuntimeException unavailable) {
            try {
                Intent browser = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/search?q=" + Uri.encode(search) + "&c=apps"));
                browser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(browser);
                return "Opened Google Play's website. Android controls installations.";
            } catch (RuntimeException error) { return "Could not open the app store."; }
        }
    }
    static String downloadFile(Context context, String raw) {
        try {
            URI url = new URI(raw.trim());
            if (!"https".equalsIgnoreCase(url.getScheme()) || url.getHost() == null
                    || url.getUserInfo() != null || url.getFragment() != null
                    || url.getHost().equalsIgnoreCase("localhost") || url.getHost().endsWith(".local"))
                return "Only direct, public HTTPS file links can be downloaded.";
            String path = url.getPath();
            String base = path == null ? "file" : path.substring(path.lastIndexOf('/') + 1);
            String filename = base.replaceAll("[^a-zA-Z0-9._-]", "_");
            if (filename.isEmpty() || filename.equals(".") || filename.equals("..")) filename = "file";
            filename = "Bubbles-" + System.currentTimeMillis() + "-" + filename.substring(0, Math.min(90, filename.length()));
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url.toASCIIString()));
            request.setTitle("Bubbles file download");
            request.setDescription("Android handles this download; completion is not yet verified.");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "Bubbles/" + filename);
            DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            long id = dm.enqueue(request);
            return "Android accepted download " + id + " into Downloads/Bubbles. It is queued, not verified as saved. Open the notification to check it.";
        } catch (Exception error) { return "The file download could not be queued. Check the HTTPS link and Android downloads."; }
    }
}
