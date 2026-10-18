package org.quantaphi.bubbles;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.widget.TextView;

/** Android picker grants read access to owner-selected media only.
 * CapCut owns its editor and any extraction operation.
 */
final class CapCutBridge {
    static final String PACKAGE = "com.lemon.lvoverseas";
    private CapCutBridge() {}
    static void openSelected(Activity activity, Uri uri, String mime, TextView status) {
        if (uri == null) return;
        if (mime == null || (!mime.startsWith("video/") && !mime.startsWith("audio/"))) {
            status.setText("Choose a video or audio file.");
            return;
        }
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType(mime);
        send.putExtra(Intent.EXTRA_STREAM, uri);
        send.setClipData(ClipData.newUri(activity.getContentResolver(), "Selected clip", uri));
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        send.setPackage(PACKAGE);
        try {
            if (send.resolveActivity(activity.getPackageManager()) != null) {
                activity.startActivity(send);
                status.setText("Clip opened in CapCut. Edit or extract its audio there.");
                return;
            }
            Intent launch = activity.getPackageManager().getLaunchIntentForPackage(PACKAGE);
            if (launch != null) {
                activity.startActivity(launch);
                status.setText("CapCut opened; select the clip in its editor.");
            } else status.setText("CapCut isn't installed or its editor isn't available.");
        } catch (RuntimeException error) {
            status.setText("CapCut couldn't open this clip. Try Share from Android Files.");
        }
    }
}
