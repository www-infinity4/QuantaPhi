package org.quantaphi.bubbles;

import java.net.URI;

/** Microphone-only permission for the visible first-party Live call page. */
final class LiveMicrophonePolicy {
    static final String AUDIO = "android.webkit.resource.AUDIO_CAPTURE";
    static boolean allows(String origin, String topUrl, String[] resources,
                          boolean visible, boolean androidPermission) {
        if (!visible || !androidPermission || resources == null || resources.length != 1
                || !AUDIO.equals(resources[0])) return false;
        try {
            URI top = new URI(topUrl), source = new URI(origin);
            return trusted(top) && "/bubbles-gpt-live.html".equals(top.getRawPath())
                && trusted(source) && (source.getRawPath() == null
                    || source.getRawPath().isEmpty() || "/".equals(source.getRawPath()))
                && source.getRawQuery() == null && source.getRawFragment() == null;
        } catch (Exception invalid) { return false; }
    }
    private static boolean trusted(URI url) {
        return "https".equals(url.getScheme()) && "quantaphi.org".equals(url.getHost())
            && url.getRawUserInfo() == null && (url.getPort() == -1 || url.getPort() == 443);
    }
}
