package org.quantaphi.bubbles;

/** Runnable without Android SDK: assert that only Termux's completed callback proves success. */
public final class TermuxReceiptPolicyCheck {
    private static void check(boolean actual, boolean expected, String caseName) {
        if (actual != expected) throw new AssertionError(caseName + ": " + actual);
    }

    public static void main(String[] args) {
        String shell = "probe=termux-shell-v1\ntermux=ok\n";
        String python = "probe=termux-python-v1\nBubbles Python works: 2 + 2 = 4\ncleanup=verified_job_directory_removed\n";
        check(TermuxReceiptPolicy.succeeded("shell", 0, -1, shell), true, "shell success without Python");
        check(TermuxReceiptPolicy.succeeded("python", 0, -1, python), true, "Python verified with cleanup");
        check(TermuxReceiptPolicy.succeeded("shell", 1, -1, shell), false, "nonzero exit");
        check(TermuxReceiptPolicy.succeeded("shell", 0, 0, shell), false, "service rejection");
        check(TermuxReceiptPolicy.succeeded("shell", 0, -1, "dispatch accepted"), false, "dispatch is not success");
        check(TermuxReceiptPolicy.succeeded("shell", 0, -1, null), false, "no result");
        check(TermuxReceiptPolicy.succeeded("shell", 0, -1, python), false, "wrong markers");
        check(TermuxReceiptPolicy.succeeded("python", 0, -1, shell), false, "wrong kind");
        check(TermuxReceiptPolicy.succeeded("python", 0, -1, "Bubbles Python works: 2 + 2 = 4"), false, "missing cleanup");
        check(TermuxReceiptPolicy.succeeded("python", 127, -1, "python=not_installed"), false, "Python missing");
        check(TermuxReceiptPolicy.succeeded("ruby", 0, -1, shell), false, "unsupported kind");
        System.out.println("Termux callback verdicts passed");
    }
}
