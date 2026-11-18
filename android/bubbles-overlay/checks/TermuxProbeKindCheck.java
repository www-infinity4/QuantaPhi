package org.quantaphi.bubbles;

/** Runnable with plain javac/java, no Android device, SDK or Termux package. */
public final class TermuxProbeKindCheck {
    private static void expect(String phrase, String expected) {
        String actual = TermuxProbeKind.fromUserText(phrase);
        if (expected == null ? actual != null : !expected.equals(actual))
            throw new AssertionError(phrase + " -> " + actual + " expected " + expected);
    }
    public static void main(String[] args) {
        for (String phrase : new String[] {
            "check termux", "Bubbles, check termux", "please verify termux", "test termux!"
        }) expect(phrase, "shell");
        for (String phrase : new String[] {
            "check termux python", "Bubbles, verify termux python",
            "test python in termux", "please check python"
        }) expect(phrase, "python");
        for (String phrase : new String[] {
            "do not check termux", "install python in termux", "run rm -rf /",
            "what is termux?", "explain check termux", "check termux and delete files"
        }) expect(phrase, null);
        System.out.println("Termux request classification passed");
    }
}
