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
    private AccessibilityNodeInfo currentRoot() {
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
        BrainLearningService service = active.get();
        if (service == null) { callback.accept(ACCESS_OFF); return; }
        service.inspect(callback);
    }
    private void inspect(Consumer<String> callback) {
        // A WebView or our own Bubbles screen can have no exposed text tree.
        // Do not misdiagnose that as missing permission; still try the Android
        // Accessibility screenshot API already approved by the user.
        AccessibilityNodeInfo root = currentRoot();
        final String textObservation;
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
            textObservation = "Foreground app: " + app + "\nVisible accessible text: "
                + (visible.isEmpty() ? "[none exposed]" : visible.substring(0, Math.min(2100, visible.length())));
        }
        if (Build.VERSION.SDK_INT < 30) { callback.accept(textObservation); return; }
        try {
            takeScreenshot(Display.DEFAULT_DISPLAY, getMainExecutor(), new TakeScreenshotCallback() {
                @Override public void onSuccess(ScreenshotResult result) {
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
                        try { ocr = CaptureReader.readBitmap(pixels); }
                        catch (Exception error) { ocr = "[Screenshot OCR unavailable]"; }
                        finally { pixels.recycle(); }
                        final String extracted = ocr;
                        main.post(() -> callback.accept(textObservation + "\nOn-screen screenshot OCR: "
                            + extracted.substring(0, Math.min(1200, extracted.length()))));
                    });
                }
                @Override public void onFailure(int code) {
                    callback.accept(textObservation + "\nScreenshot OCR unavailable (Android code " + code + ").");
                }
            });
        } catch (RuntimeException error) { callback.accept(textObservation + "\nScreenshot access unavailable."); }
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
    @Override public void onInterrupt() {main.removeCallbacks(capture);}
    @Override public void onDestroy() {
        main.removeCallbacks(capture);
        screenWorker.shutdownNow();
        if(active.get()==this)active.clear();
        super.onDestroy();
    }
}
