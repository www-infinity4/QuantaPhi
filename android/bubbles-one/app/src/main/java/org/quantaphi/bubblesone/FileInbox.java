package org.quantaphi.bubblesone;

import android.app.Activity;
import android.net.Uri;
import android.widget.TextView;
import java.io.*;
import java.util.UUID;

/** Copies an Android-approved file into private chat inbox, never executes it. */
final class FileInbox {
    private FileInbox() {}
    static void importFile(Activity activity, Uri uri, TextView status) {
        if (!"content".equals(uri.getScheme())) {
            status.setText("Choose a file from Android's file provider.");
            return;
        }
        status.setText("Importing the file you selected…");
        new Thread(() -> {
            File target = null;
            try {
                File folder = new File(activity.getFilesDir(), "inbox");
                if (!folder.exists() && !folder.mkdirs()) throw new IOException("Private folder unavailable");
                String label = "shared-" + UUID.randomUUID();
                target = new File(folder, label + ".bin"); long total = 0L;
                try (InputStream in = activity.getContentResolver().openInputStream(uri);
                     FileOutputStream out = new FileOutputStream(target)) {
                    if (in == null) throw new IOException("No file stream");
                    byte[] bytes = new byte[32768]; int n;
                    while ((n = in.read(bytes)) != -1) {
                        total += n;
                        if (total > 64L * 1024L * 1024L) throw new IOException("File exceeds 64 MB");
                        out.write(bytes, 0, n);
                    }
                }
                if (total <= 0) throw new IOException("File is empty");
                LocalNotebook notebook = new LocalNotebook(activity);
                try { notebook.add("file", "Imported Android-shared file " + label +
                    ", " + total + " bytes. Private inbox; not installed, parsed, or uploaded."); }
                finally { notebook.close(); }
                final long size = total;
                activity.runOnUiThread(() -> {
                    status.setText("File imported into Bubbles private inbox (" + size + " bytes).");
                    AssistantService.refreshIntegration("Imported file is now in Bubbles chat history.");
                });
            } catch (Exception e) {
                if (target != null) target.delete();
                activity.runOnUiThread(() -> status.setText("File import failed. No successful import was recorded."));
            }
        }, "Bubbles-file-inbox").start();
    }
}
