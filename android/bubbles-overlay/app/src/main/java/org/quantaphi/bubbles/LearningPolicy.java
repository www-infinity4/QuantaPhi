package org.quantaphi.bubbles;

/** Pure policy shared by capture and its JVM checks. */
public final class LearningPolicy {
    public static final int MAX_TEXT = 4000;
    public static String key(String app) {
        if ("com.openai.chatgpt".equals(app)) return "learn_chatgpt";
        if ("com.twitter.android".equals(app)) return "learn_x";
        if ("com.google.android.apps.bard".equals(app)) return "learn_gemini";
        return null;
    }
    public static String clean(String value) {
        String text = value == null ? "" : value.replaceAll("\\s+", " ").trim();
        return text.substring(0, Math.min(MAX_TEXT, text.length()));
    }
    private LearningPolicy() {}
}
