package org.quantaphi.bubbles;

import java.net.URI;
import java.util.Locale;

/** Shared pure policy for the opt-in provider conversation tool. */
final class PhoneToolPolicy {
    static boolean providerUrl(String address) {
        if (address == null) return false;
        try {
            String value = address.trim();
            if (!value.contains("://")) value = "https://" + value;
            URI uri = new URI(value);
            String host = uri.getHost();
            return "https".equals(uri.getScheme()) && uri.getUserInfo() == null
                && (uri.getPort() == -1 || uri.getPort() == 443) && host != null
                && (host.equals("gemini.google.com") || host.equals("ibm.com") || host.endsWith(".ibm.com"));
        } catch (Exception ignored) { return false; }
    }
    static boolean promptField(String label) {
        String s = label == null ? "" : label.toLowerCase(Locale.ROOT);
        return !s.matches("(?s).*\\b(password|passcode|email|username|otp|verification|credit|card|payment|search|address)\\b.*")
            && s.matches("(?s).*\\b(prompt|message|ask|chat|question|reply|input-area)\\b.*");
    }
    static boolean blockedControl(String label) {
        return label == null || label.trim().isEmpty() || ScreenAwareness.sensitive(label)
            || label.toLowerCase(Locale.ROOT).matches("(?s).*\\b(upgrade|subscribe|billing|grant|share|publish|login|log in|log out|sign out|connect account|api key|token|download|attach|upload|clear|trash|archive)\\b.*");
    }
    private PhoneToolPolicy() {}
}
