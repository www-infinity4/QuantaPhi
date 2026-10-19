package org.quantaphi.bubbles;

import android.accessibilityservice.AccessibilityService;
import android.graphics.Bitmap;
import android.hardware.HardwareBuffer;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.Display;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityWindowInfo;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

/**
 * Owner-enabled Accessibility bridge. Screen is inspected only for a direct user
 * request; unedited input fields, passwords, system dialogs and private text
 * are excluded. OCR images are held in memory and discarded after one request.
 */
public final class BrainLearningService extends AccessibilityService {
    static final String ACCESS_OFF = "SCREEN_ACCESS_OFF";
    private static WeakReference<BrainLearningService> active = new WeakReference<>(null);
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService screenWorker = Executors.newSingleThreadExecutor();

    @Override protected void onServiceConnected() {
        super.onServiceConnected();
        active = new WeakReference<>(this);
    }
    static boolean isConnected() { return active.get() != null; }
    private static boolean allowed(AccessibilityNodeInfo node) {
        if (node == null) return false;
        CharSequence name = node.getPackageName();
        String pkg = name == null ? "" : name.toString();
        return !pkg.isEmpty() && !pkg.startsWith("org.quantaphi.bubbles")
            && !pkg.equals("com.android.systemui") && !pkg.equals("com.android.settings");
    }
    /** Prefer the foreground app, but skip the Bubbles floating overlay. */
    AccessibilityNodeInfo currentRoot() {
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (allowed(root)) return root;
        if (root != null) root.recycle();
        for (AccessibilityWindowInfo window : getWindows()) {
            if (window.getType() != AccessibilityWindowInfo.TYPE_APPLICATION) continue;
            AccessibilityNodeInfo candidate = window.getRoot();
            if (allowed(candidate)) return candidate;
            if (candidate != null) candidate.recycle();
        }
        return null;
    }
    static String currentVisibleText() {
        BrainLearningService service = active.get();
        if (service == null) return "";
        AccessibilityNodeInfo root = service.currentRoot();
        if (root == null) return "";
        try {
            StringBuilder result = new StringBuilder();
            service.collect(root, result, new int[]{0}, 0);
            return result.toString().trim();
        } catch (RuntimeException error) { return ""; }
        finally { root.recycle(); }
    }
    /** Android 12+ accessibility screenshots need no separate MediaProjection dialog.
     * Android may still redact protected windows and the user must enable Accessibility. */
    static void inspectNow(Consumer<String> callback) {
        inspectNow("", callback);
    }
    static void inspectNow(String question, Consumer<String> callback) {
        inspectNow(question, () -> {}, callback);
    }
    static void inspectNow(String question, Runnable frameCaptured, Consumer<String> callback) {
        BrainLearningService service = active.get();
        if (service == null) { frameCaptured.run(); callback.accept(ACCESS_OFF); return; }
        service.inspect(question, frameCaptured, callback);
    }
    private void inspect(String question, Runnable frameCaptured, Consumer<String> callback) {
        // A WebView or our own Bubbles screen can have no exposed text tree.
        // Do not misdiagnose that as missing permission; still try the Android
        // Accessibility screenshot API already approved by the user.
        AccessibilityNodeInfo root = currentRoot();
        final String textObservation;
        final String observedAt = java.time.Instant.now().toString();
        if (root == null) {
            textObservation = "Screen access connected. Text tree unavailable; checking screenshot.";
        } else {
            String app;
            String visible;
            try {
                app = String.valueOf(root.getPackageName());
                StringBuilder text = new StringBuilder();
                collect(root, text, new int[]{0}, 0);
                visible = text.toString().trim();
            } finally { root.recycle(); }
            textObservation = "Fresh Android screen observation at " + observedAt + ". Current viewport only; refresh after scrolling.\nForeground app: " + app + "\nVisible accessible text: "
                + (visible.isEmpty() ? "[none exposed]" : visible.substring(0, Math.min(2100, visible.length())));
        }
        if (Build.VERSION.SDK_INT < 30) { frameCaptured.run(); callback.accept(textObservation); return; }
        try {
            takeScreenshot(Display.DEFAULT_DISPLAY, getMainExecutor(), new TakeScreenshotCallback() {
                @Override public void onSuccess(ScreenshotResult result) {
                    frameCaptured.run();
                    Bitmap copy = null;
                    HardwareBuffer buffer = result.getHardwareBuffer();
                    try {
                        Bitmap hardware = Bitmap.wrapHardwareBuffer(buffer, result.getColorSpace());
                        if (hardware != null) {
                            copy = hardware.copy(Bitmap.Config.ARGB_8888, false);
                            hardware.recycle();
                        }
                    } catch (RuntimeException ignored) { /* Text still available. */ }
                    finally { buffer.close(); }
                    if (copy == null) { callback.accept(textObservation); return; }
                    final Bitmap pixels = copy;
                    screenWorker.execute(() -> {
                        String ocr;
                        String visual = "";
                        try { ocr = CaptureReader.readBitmap(pixels); }
                        catch (Exception error) { ocr = "[Screenshot OCR unavailable]"; }
                        try { if (!question.isEmpty()) visual = ScreenVision.describe(pixels, question); }
                        finally { pixels.recycle(); }
                        final String extracted = ocr;
                        final String description = visual;
                        main.post(() -> callback.accept("Frame captured at " + observedAt + "\nCurrent screen visual description: "
                            + description + "\n" + textObservation + "\nOn-screen screenshot OCR: "
                            + extracted.substring(0, Math.min(2400, extracted.length()))));
                    });
                }
                @Override public void onFailure(int code) {
                    frameCaptured.run();
                    callback.accept(textObservation + "\nScreenshot OCR unavailable (Android code " + code + ").");
                }
            });
        } catch (RuntimeException error) { frameCaptured.run(); callback.accept(textObservation + "\nScreenshot access unavailable."); }
    }
    /**
     * One explicit owner-requested click in DU Recorder only.
     * Never click Android system consent, a WebView, a wallet control or another
     * app. This API returns a SENT action rather than claiming video is saved.
     */
    static String tapDuRecorderControl(String action) {
        BrainLearningService service = active.get();
        if (service == null) return "DU button unavailable: Bubbles screen access is not enabled.";
        if (!"start".equals(action) && !"stop".equals(action) && !"toggle".equals(action))
            return "Unsupported DU action.";
        try {
            java.util.List<AccessibilityWindowInfo> windows = service.getWindows();
            if (windows == null) return "DU window not visible.";
            ArrayList<AccessibilityNodeInfo> matches = new ArrayList<>();
            try {
                // Each matched window, including DU's floating control, must
                // itself report DU's package on its root Accessibility node.
                for (AccessibilityWindowInfo window : windows) {
                    AccessibilityNodeInfo root = window.getRoot();
                    if (root == null) continue;
                    try {
                        if (!DuRecorderBridge.PACKAGE.contentEquals(root.getPackageName())) continue;
                        service.findDuControls(root, action, matches, 0);
                    } finally { root.recycle(); }
                }
                if (matches.size() != 1) return matches.isEmpty()
                    ? "DU start/stop control not exposed by Accessibility."
                    : "DU has multiple matching controls; manual selection required.";
                AccessibilityNodeInfo node = AccessibilityNodeInfo.obtain(matches.get(0));
                try {
                    for (int depth = 0; node != null && depth < 7; depth++) {
                        if (node.isClickable() && node.isEnabled() && node.isVisibleToUser()) {
                            boolean sent = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            return sent ? "DU tap sent: " + action + " (recording state not yet verified)."
                                : "DU refused the control tap.";
                        }
                        AccessibilityNodeInfo parent = node.getParent();
                        node.recycle(); node = parent;
                    }
                    return "DU control has no accessible clickable button.";
                } finally { if (node != null) node.recycle(); }
            } finally { for (AccessibilityNodeInfo n : matches) n.recycle(); }
        } catch (RuntimeException error) {
            return "DU control unavailable: " + error.getClass().getSimpleName();
        }
    }

    /** State evidence: visible DU-owned Stop control after pressing Record. */
    static boolean duControlVisible(String action) {
        BrainLearningService service = active.get();
        if (service == null || (!"start".equals(action) && !"stop".equals(action))) return false;
        try {
            java.util.List<AccessibilityWindowInfo> windows = service.getWindows();
            if (windows == null) return false;
            ArrayList<AccessibilityNodeInfo> matches = new ArrayList<>();
            try {
                for (AccessibilityWindowInfo window : windows) {
                    AccessibilityNodeInfo root = window.getRoot();
                    if (root == null) continue;
                    try {
                        if (DuRecorderBridge.PACKAGE.contentEquals(root.getPackageName()))
                            service.findDuControls(root, action, matches, 0);
                    } finally { root.recycle(); }
                }
                return matches.size() == 1;
            } finally { for (AccessibilityNodeInfo node : matches) node.recycle(); }
        } catch (RuntimeException error) { return false; }
    }

    private void findDuControls(AccessibilityNodeInfo node, String action,
            ArrayList<AccessibilityNodeInfo> matches, int depth) {
        if (node == null || depth > 20 || !node.isVisibleToUser() || node.isPassword()) return;
        String packageName = String.valueOf(node.getPackageName());
        if (!DuRecorderBridge.PACKAGE.equals(packageName)) return;
        String label = String.valueOf(node.getText() == null ? "" : node.getText()).trim().toLowerCase(Locale.ROOT);
        String desc = String.valueOf(node.getContentDescription() == null
            ? "" : node.getContentDescription()).trim().toLowerCase(Locale.ROOT);
        // Only explicit recording labels, no guessing from anonymous ImageViews,
        // coordinates or generic 'allow', 'ok', 'confirm', 'start now' dialogs.
        boolean startLabel = label.matches("record|start recording|start record|rec")
            || desc.matches("record|start recording|start record|rec");
        boolean stopLabel = label.matches("stop recording|stop record|stop")
            || desc.matches("stop recording|stop record|stop");
        boolean exact = "start".equals(action) ? startLabel : "stop".equals(action)
            ? stopLabel : startLabel || stopLabel;
        if (exact) matches.add(AccessibilityNodeInfo.obtain(node));
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child == null) continue;
            try { findDuControls(child, action, matches, depth + 1); }
            finally { child.recycle(); }
        }
    }

    /**
     * One explicit owner-requested click in XRecorder only.
     * Never click Android system consent, a WebView, a wallet control or another
     * app. This API returns a SENT action rather than claiming video is saved.
     */
    static String tapXRecorderControl(String action) {
        BrainLearningService service = active.get();
        if (service == null) return "XRecorder button unavailable: Bubbles screen access is not enabled.";
        if (!"start".equals(action) && !"stop".equals(action) && !"toggle".equals(action))
            return "Unsupported XRecorder action.";
        try {
            java.util.List<AccessibilityWindowInfo> windows = service.getWindows();
            if (windows == null) return "XRecorder window not visible.";
            ArrayList<AccessibilityNodeInfo> matches = new ArrayList<>();
            try {
                // Each matched window, including XRecorder's floating control, must
                // itself report XRecorder's package on its root Accessibility node.
                for (AccessibilityWindowInfo window : windows) {
                    AccessibilityNodeInfo root = window.getRoot();
                    if (root == null) continue;
                    try {
                        if (!XRecorderBridge.PACKAGE.contentEquals(root.getPackageName())) continue;
                        service.findXControls(root, action, matches, 0);
                    } finally { root.recycle(); }
                }
                if (matches.size() != 1) return matches.isEmpty()
                    ? "XRecorder start/stop control not exposed by Accessibility."
                    : "XRecorder has multiple matching controls; manual selection required.";
                AccessibilityNodeInfo node = AccessibilityNodeInfo.obtain(matches.get(0));
                try {
                    for (int depth = 0; node != null && depth < 7; depth++) {
                        if (node.isClickable() && node.isEnabled() && node.isVisibleToUser()) {
                            boolean sent = node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                            return sent ? "XRecorder tap sent: " + action + " (recording state not yet verified)."
                                : "XRecorder refused the control tap.";
                        }
                        AccessibilityNodeInfo parent = node.getParent();
                        node.recycle(); node = parent;
                    }
                    return "XRecorder control has no accessible clickable button.";
                } finally { if (node != null) node.recycle(); }
            } finally { for (AccessibilityNodeInfo n : matches) n.recycle(); }
        } catch (RuntimeException error) {
            return "XRecorder control unavailable: " + error.getClass().getSimpleName();
        }
    }

    /** State evidence: visible XRecorder-owned Stop control after pressing Record. */
    static boolean xControlVisible(String action) {
        BrainLearningService service = active.get();
        if (service == null || (!"start".equals(action) && !"stop".equals(action))) return false;
        try {
            java.util.List<AccessibilityWindowInfo> windows = service.getWindows();
            if (windows == null) return false;
            ArrayList<AccessibilityNodeInfo> matches = new ArrayList<>();
            try {
                for (AccessibilityWindowInfo window : windows) {
                    AccessibilityNodeInfo root = window.getRoot();
                    if (root == null) continue;
                    try {
                        if (XRecorderBridge.PACKAGE.contentEquals(root.getPackageName()))
                            service.findXControls(root, action, matches, 0);
                    } finally { root.recycle(); }
                }
                return matches.size() == 1;
            } finally { for (AccessibilityNodeInfo node : matches) node.recycle(); }
        } catch (RuntimeException error) { return false; }
    }

    private void findXControls(AccessibilityNodeInfo node, String action,
            ArrayList<AccessibilityNodeInfo> matches, int depth) {
        if (node == null || depth > 20 || !node.isVisibleToUser() || node.isPassword()) return;
        String packageName = String.valueOf(node.getPackageName());
        if (!XRecorderBridge.PACKAGE.equals(packageName)) return;
        String label = String.valueOf(node.getText() == null ? "" : node.getText()).trim().toLowerCase(Locale.ROOT);
        String desc = String.valueOf(node.getContentDescription() == null
            ? "" : node.getContentDescription()).trim().toLowerCase(Locale.ROOT);
        // Only explicit recording labels, no guessing from anonymous ImageViews,
        // coordinates or generic 'allow', 'ok', 'confirm', 'start now' dialogs.
        boolean startLabel = label.matches("record|start recording|start record|rec")
            || desc.matches("record|start recording|start record|rec");
        boolean stopLabel = label.matches("stop recording|stop record|stop")
            || desc.matches("stop recording|stop record|stop");
        boolean exact = "start".equals(action) ? startLabel : "stop".equals(action)
            ? stopLabel : startLabel || stopLabel;
        if (exact) matches.add(AccessibilityNodeInfo.obtain(node));
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child == null) continue;
            try { findXControls(child, action, matches, depth + 1); }
            finally { child.recycle(); }
        }
    }

    /** Deterministic, single, explicitly voiced/typed tap. Never tap risky controls. */
    static String performRequestedAction(String phrase) {
        BrainLearningService service = active.get();
        if (service == null) return ACCESS_OFF;
        String direction = ScreenAwareness.scrollDirection(phrase);
        String target = ScreenAwareness.tapTarget(phrase);
        if (direction == null && target == null) return null;
        AccessibilityNodeInfo root = service.currentRoot();
        if (root == null) return "I cannot access the foreground app. Close Bubbles' full panel and open the app.";
        try {
            if (direction != null) {
                AccessibilityNodeInfo scroll = service.findScrollable(root, 0);
                if (scroll == null) return "No scrollable area is visible.";
                try {
                    boolean sent = scroll.performAction("down".equals(direction)
                        ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
                    return sent ? "Scroll " + direction + " sent to the visible app." : "The app refused to scroll.";
                } finally { scroll.recycle(); }
            }
            if (ScreenAwareness.sensitive(target)) return "I will not activate a payment, security, deletion or confirmation control automatically.";
            ArrayList<AccessibilityNodeInfo> matches = new ArrayList<>();
            service.findLabel(root, target.toLowerCase(Locale.ROOT), matches, 0);
            try {
                if (matches.size() != 1) return matches.isEmpty()
                    ? "I cannot find one visible control labelled " + target + "."
                    : "There are several matching controls; please be more specific.";
                AccessibilityNodeInfo current = AccessibilityNodeInfo.obtain(matches.get(0));
                try {
                    for (int i=0; i<7 && current != null; i++) {
                        if (current.isClickable() && current.isEnabled()) {
                            return current.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                                ? "Tap sent to " + target + ". The next screen has not yet been verified."
                                : "The app refused the tap on " + target + ".";
                        }
                        AccessibilityNodeInfo parent = current.getParent();
                        current.recycle();
                        current = parent;
                    }
                    return "The visible label " + target + " has no accessible tap action.";
                } finally { if (current != null) current.recycle(); }
            } finally { for (AccessibilityNodeInfo match : matches) match.recycle(); }
        } catch (RuntimeException error) {
            return "The Android screen action failed; no success was confirmed.";
        } finally { root.recycle(); }
    }

    /** Only the currently foreground, owner-visible app may be controlled. */
    static String workflowForegroundPackage() {
        BrainLearningService service = active.get();
        if (service == null) return "";
        AccessibilityNodeInfo root = service.currentRoot();
        if (root == null) return "";
        try { return String.valueOf(root.getPackageName()); }
        finally { root.recycle(); }
    }

    /** Deterministic label matching, never screen coordinates or model guesses. */
    private void workflowMatches(AccessibilityNodeInfo node, String target,
            ArrayList<AccessibilityNodeInfo> out, boolean editableOnly, int depth) {
        if (node == null || depth > 26 || out.size() > 2 || !node.isVisibleToUser()
                || node.isPassword()) return;
        if (node.isEnabled() && (!editableOnly || node.isEditable())) {
            String needle = target.trim().toLowerCase(Locale.ROOT);
            CharSequence text = editableOnly ? null : node.getText();
            CharSequence hint = node.getHintText();
            CharSequence desc = node.getContentDescription();
            String[] labels = new String[] {
                text == null ? "" : text.toString().trim().toLowerCase(Locale.ROOT),
                hint == null ? "" : hint.toString().trim().toLowerCase(Locale.ROOT),
                desc == null ? "" : desc.toString().trim().toLowerCase(Locale.ROOT)
            };
            for (String label : labels) {
                if (!label.isEmpty() && (needle.equals(label) || label.startsWith(needle + " "))) {
                    out.add(AccessibilityNodeInfo.obtain(node));
                    break;
                }
            }
        }
        for (int i = 0; i < node.getChildCount() && out.size() <= 2; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) try { workflowMatches(child, target, out, editableOnly, depth + 1); }
            finally { child.recycle(); }
        }
    }

    static boolean workflowLabelVisible(String target) {
        BrainLearningService service = active.get();
        if (service == null || ScreenAwareness.sensitive(target)) return false;
        AccessibilityNodeInfo root = service.currentRoot();
        if (root == null) return false;
        ArrayList<AccessibilityNodeInfo> matches = new ArrayList<>();
        try {
            service.workflowMatches(root, target, matches, false, 0);
            return matches.size() == 1;
        } finally {
            for (AccessibilityNodeInfo item : matches) item.recycle();
            root.recycle();
        }
    }

    /** Poll post-action text without sending a second keystroke. */
    static boolean workflowTypedValueVisible(String target, String expected) {
        BrainLearningService service = active.get();
        if (service == null || ScreenAwareness.sensitive(target)) return false;
        AccessibilityNodeInfo root = service.currentRoot();
        if (root == null) return false;
        ArrayList<AccessibilityNodeInfo> matches = new ArrayList<>();
        try {
            service.workflowMatches(root, target, matches, true, 0);
            return matches.size() == 1 && matches.get(0).getText() != null
                && expected.contentEquals(matches.get(0).getText());
        } finally {
            for (AccessibilityNodeInfo item : matches) item.recycle();
            root.recycle();
        }
    }

    static String workflowType(String target, String value) {
        BrainLearningService service = active.get();
        if (service == null) return "ACCESS_OFF";
        if (ScreenAwareness.sensitive(target) || value == null || value.trim().isEmpty()
                || value.length() > 160) return "FIELD_BLOCKED";
        AccessibilityNodeInfo root = service.currentRoot();
        if (root == null) return "FIELD_NOT_FOUND";
        ArrayList<AccessibilityNodeInfo> matches = new ArrayList<>();
        try {
            service.workflowMatches(root, target, matches, true, 0);
            if (matches.isEmpty()) return "FIELD_NOT_FOUND";
            if (matches.size() != 1) return "FIELD_AMBIGUOUS";
            AccessibilityNodeInfo item = matches.get(0);
            int inputType = item.getInputType();
            int typeClass = inputType & android.text.InputType.TYPE_MASK_CLASS;
            int variation = inputType & android.text.InputType.TYPE_MASK_VARIATION;
            if (item.isPassword()
                    || (typeClass == android.text.InputType.TYPE_CLASS_TEXT
                        && (variation == android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
                            || variation == android.text.InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
                            || variation == android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD))
                    || (typeClass == android.text.InputType.TYPE_CLASS_NUMBER
                        && variation == android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD))
                return "FIELD_BLOCKED";
            android.os.Bundle data = new android.os.Bundle();
            data.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value);
            boolean sent = item.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, data);
            if (!sent) return "TYPE_REFUSED";
            // Confirmation is local; do not include typed contents in receipts.
            if (item.refresh() && item.getText() != null && value.contentEquals(item.getText()))
                return "TYPE_VERIFIED";
            return "TYPE_UNVERIFIED";
        } catch (RuntimeException error) { return "TYPE_REFUSED"; }
        finally {
            for (AccessibilityNodeInfo item : matches) item.recycle();
            root.recycle();
        }
    }

    private AccessibilityNodeInfo findScrollable(AccessibilityNodeInfo node, int depth) {
        if (node == null || depth > 25 || !node.isVisibleToUser() || node.isPassword()) return null;
        if (node.isScrollable()) return AccessibilityNodeInfo.obtain(node);
        for (int i=0; i<node.getChildCount(); i++) {
            AccessibilityNodeInfo child=node.getChild(i);
            if (child != null) {
                try {
                    AccessibilityNodeInfo found=findScrollable(child, depth+1);
                    if (found != null) return found;
                } finally { child.recycle(); }
            }
        }
        return null;
    }
    private void findLabel(AccessibilityNodeInfo node, String label, ArrayList<AccessibilityNodeInfo> out, int depth) {
        if (node == null || depth > 25 || out.size() > 4 || !node.isVisibleToUser() || node.isPassword() || node.isEditable()) return;
        CharSequence text=node.getText(), description=node.getContentDescription();
        String shown=text == null ? "" : LearningPolicy.clean(text.toString()).toLowerCase(Locale.ROOT);
        String spoken=description == null ? "" : LearningPolicy.clean(description.toString()).toLowerCase(Locale.ROOT);
        if (shown.equals(label) || spoken.equals(label)) out.add(AccessibilityNodeInfo.obtain(node));
        for (int i=0; i<node.getChildCount() && out.size()<=4; i++) {
            AccessibilityNodeInfo child=node.getChild(i);
            if (child != null) try { findLabel(child,label,out,depth+1); } finally { child.recycle(); }
        }
    }
    private String pendingApp = "";
    private final Runnable capture = () -> {
        String key=LearningPolicy.key(pendingApp);
        if(key==null || !BrainNotes.prefs(this).getBoolean(key,false))return;
        AccessibilityNodeInfo root=currentRoot();
        if(root==null)return;
        try {
            if(!pendingApp.equals(String.valueOf(root.getPackageName())))return;
            StringBuilder out=new StringBuilder();
            collect(root,out,new int[]{0},0);
            BrainNotes.add(this,pendingApp,out.toString());
        } finally { root.recycle(); }
    };
    @Override public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_VIEW_SCROLLED
                && "com.android.chrome".contentEquals(event.getPackageName() == null ? "" : event.getPackageName()))
            PhoneToolController.invalidate();
        main.removeCallbacks(capture);
        String app=String.valueOf(event.getPackageName());
        String key=LearningPolicy.key(app);
        if(key==null || !BrainNotes.prefs(this).getBoolean(key,false))return;
        pendingApp=app; main.postDelayed(capture,1200);
    }
    private void collect(AccessibilityNodeInfo node,StringBuilder out,int[] count,int depth) {
        if(node==null || depth>30 || count[0]++>180 || out.length()>=LearningPolicy.MAX_TEXT)return;
        if(!node.isVisibleToUser() || node.isPassword() || node.isEditable())return;
        CharSequence value=node.getText();
        if(value!=null)out.append(LearningPolicy.clean(value.toString())).append('\n');
        for(int i=0;i<node.getChildCount() && out.length()<LearningPolicy.MAX_TEXT;i++) {
            AccessibilityNodeInfo child=node.getChild(i);
            if(child!=null)try { collect(child,out,count,depth+1); } finally { child.recycle(); }
        }
    }
    @Override public void onInterrupt() {main.removeCallbacks(capture); PhoneToolController.stop();}
    @Override public void onDestroy() {
        PhoneToolController.stop();
        main.removeCallbacks(capture);
        screenWorker.shutdownNow();
        if(active.get()==this)active.clear();
        super.onDestroy();
    }
    static org.json.JSONObject runPhoneTool(org.json.JSONObject command, String generation) {
        BrainLearningService service = active.get();
        if (service != null) return PhoneToolController.execute(service, command, generation);
        org.json.JSONObject receipt = new org.json.JSONObject();
        try { receipt.put("id", command.optString("id")).put("ok", false).put("error", ACCESS_OFF); }
        catch (Exception ignored) {}
        return receipt;
    }
}
