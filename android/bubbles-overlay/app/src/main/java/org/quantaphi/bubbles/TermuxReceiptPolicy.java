package org.quantaphi.bubbles;

/** Android-independent Termux callback verdict. Dispatch or markers alone never prove execution. */
final class TermuxReceiptPolicy {
    private TermuxReceiptPolicy() {}

    /** Only the still-pending or timed-out SAME request may receive a late result. */
    static boolean acceptsCallback(int id, String kind, int savedId, String savedKind, String savedState) {
        return id > 0 && id == savedId && kind != null && kind.equals(savedKind)
            && ("queued".equals(savedState) || "timed_out_unverified".equals(savedState));
    }

    static boolean succeeded(String kind, int exitCode, int serviceCode, String stdout) {
        if (exitCode != 0 || serviceCode != -1 || stdout == null) return false;
        if ("shell".equals(kind))
            return stdout.contains("probe=termux-shell-v1") && stdout.contains("termux=ok");
        if ("python".equals(kind))
            return stdout.contains("Bubbles Python works: 2 + 2 = 4")
                && stdout.contains("cleanup=verified_job_directory_removed");
        return false;
    }
}
