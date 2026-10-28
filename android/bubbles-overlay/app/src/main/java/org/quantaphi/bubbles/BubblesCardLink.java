package org.quantaphi.bubbles;

import android.net.Uri;
import java.util.List;

/**
 * Explicit Android VIEW entry point for a QuantaPhi Quick Card.
 *
 * A link is never an instruction to type, post, spend, record, or sign in.
 * Only one bounded card identifier is passed to the existing Bubbles web chat,
 * which resolves it against its own registered first-party card catalog.
 */
final class BubblesCardLink {
    private BubblesCardLink() {}

    static boolean validCardId(String id) {
        return id != null && id.length() >= 1 && id.length() <= 90
                && id.matches("[a-zA-Z0-9_-]{1,90}");
    }

    static String cardId(Uri uri) {
        if (uri == null || !"quantaphi-bubbles".equals(uri.getScheme())
                || !"card".equals(uri.getHost()) || uri.getPort() != -1
                || uri.getUserInfo() != null || uri.getQuery() != null
                || uri.getFragment() != null) return null;
        List<String> segments = uri.getPathSegments();
        if (segments.size() != 1) return null;
        String id = segments.get(0);
        return validCardId(id) ? id : null;
    }
}
