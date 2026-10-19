package org.quantaphi.bubbles;

import java.util.Locale;

/**
 * Deliberately spoken Chrome-page actions only. Chrome never exposes a DOM API
 * to Android Bubbles: Accessibility must inspect the current visible window.
 * This policy provides no credentials, arbitrary URL navigation or hidden taps.
 */
final class ChromeControlPolicy {
    private ChromeControlPolicy() {}

    static boolean isChromeRequest(String request) {
        if (request == null) return false;
        String q = request.trim().toLowerCase(Locale.ROOT).replaceAll("[.!?]+$", "");
        if (q.matches("(?:please )?(?:read|describe|summarize|inspect) (?:the |my )?(?:current )?chrome(?: page| tab| screen)?")) return true;
        return q.matches("(?:please )?(?:tap|click|press|select|scroll)\\b.{1,100}\\s+(?:in|on) chrome");
    }

    static String screenPhrase(String request) {
        if (!isChromeRequest(request)) return request;
        String q = request.trim().replaceAll("[.!?]+$", "");
        if (q.toLowerCase(Locale.ROOT).matches("(?:please )?(?:read|describe|summarize|inspect) .*chrome.*"))
            return "read this screen";
        return q.replaceFirst("(?i)\\s+(?:in|on) chrome$", "").trim();
    }
}
