package org.quantaphi.bubbles;

import android.os.Bundle;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityNodeInfo;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** In-memory consent: restart, Stop, screen lock or ten minutes ends access.
 * Called only on the UI thread by the verified first-party WebView bridge.
 * No password, clipboard, cookie, coordinate or arbitrary Android API tool.
 */
final class PhoneToolController {
    private static long until;
    private static String generation = "", observation = "", page = "";
    private static long observedAt;
    private static int sends;
    private static final List<AccessibilityNodeInfo> targets = new ArrayList<>();
    private static final List<String> identities = new ArrayList<>();
    static void start() {
        stop(); until = SystemClock.elapsedRealtime() + 600000;
        generation = UUID.randomUUID().toString(); sends = 0;
    }
    static void stop() { until = 0; generation = ""; invalidate(); }
    static void invalidate() {
        for (AccessibilityNodeInfo n : targets) n.recycle();
        targets.clear(); identities.clear(); observation = "";
    }
    static JSONObject status() {
        JSONObject out = new JSONObject();
        try {
            boolean enabled = SystemClock.elapsedRealtime() < until && BrainLearningService.isConnected();
            if (!enabled) stop();
            out.put("enabled", enabled).put("generation", generation)
                .put("remainingMs", enabled ? until - SystemClock.elapsedRealtime() : 0);
        } catch (Exception ignored) {}
        return out;
    }
    private static String label(AccessibilityNodeInfo n) {
        java.util.LinkedHashSet<String> parts = new java.util.LinkedHashSet<>();
        for (CharSequence value : new CharSequence[]{n.getContentDescription(), n.getHintText(), n.isEditable() ? null : n.getText()})
            if (value != null && !value.toString().trim().isEmpty()) parts.add(value.toString().trim());
        return String.join(" ", parts);
    }
    private static String identity(AccessibilityNodeInfo n) {
        return n.getWindowId() + "|" + n.getClassName() + "|" + n.getViewIdResourceName() + "|" + label(n);
    }
    private static String browserAddress(AccessibilityNodeInfo root) {
        for (String id : new String[]{"com.android.chrome:id/url_bar", "com.android.chrome:id/location_bar_edit_text"}) {
            List<AccessibilityNodeInfo> nodes = root.findAccessibilityNodeInfosByViewId(id);
            String address = "";
            for (AccessibilityNodeInfo n : nodes) {
                if (n.isVisibleToUser() && n.getText() != null) address = n.getText().toString();
                n.recycle();
            }
            if (!address.isEmpty()) return address;
        }
        return "";
    }
    private static void collect(AccessibilityNodeInfo node, JSONArray nodes, int depth, int[] count, boolean inPage) throws Exception {
        if (node == null || depth > 30 || count[0]++ >= 400 || nodes.length() >= 180 || nodes.toString().length() > 25000
                || !node.isVisibleToUser() || node.isPassword()) return;
        boolean web = inPage || "android.webkit.WebView".contentEquals(node.getClassName() == null ? "" : node.getClassName());
        String shown = label(node).trim();
        if (web && (!shown.isEmpty() || node.isEditable() || node.isScrollable())) {
            int id = targets.size();
            targets.add(AccessibilityNodeInfo.obtain(node)); identities.add(identity(node));
            nodes.put(new JSONObject().put("target", id).put("label", shown.substring(0, Math.min(1000, shown.length())))
                .put("tap", node.isClickable() && node.isEnabled() && !PhoneToolPolicy.blockedControl(shown))
                .put("type", node.isEditable() && node.isEnabled() && PhoneToolPolicy.promptField(shown))
                .put("scroll", node.isScrollable()));
        }
        for (int i = 0; i < node.getChildCount() && nodes.length() < 180; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) try { collect(child, nodes, depth + 1, count, web); } finally { child.recycle(); }
        }
    }
    static JSONObject execute(BrainLearningService service, JSONObject command, String expectedGeneration) {
        JSONObject receipt = new JSONObject();
        AccessibilityNodeInfo root = null;
        try {
            receipt.put("id", command.optString("id"));
            if (!status().optBoolean("enabled") || !generation.equals(expectedGeneration)) throw new Exception("phone_control_off");
            android.app.KeyguardManager lock = (android.app.KeyguardManager) service.getSystemService(android.content.Context.KEYGUARD_SERVICE);
            android.os.PowerManager power = (android.os.PowerManager) service.getSystemService(android.content.Context.POWER_SERVICE);
            if (lock.isKeyguardLocked() || !power.isInteractive()) { stop(); throw new Exception("phone_locked_session_ended"); }
            root = service.currentRoot();
            if (root == null || !"com.android.chrome".contentEquals(root.getPackageName())) throw new Exception("open_provider_in_chrome");
            String address = browserAddress(root);
            if (!PhoneToolPolicy.providerUrl(address)) { invalidate(); throw new Exception("IBM_or_Gemini_address_not_verified_keep_address_bar_visible"); }
            String action = command.optString("action");
            if ("read".equals(action)) {
                invalidate(); JSONArray nodes = new JSONArray();
                collect(root, nodes, 0, new int[]{0}, false);
                observation = UUID.randomUUID().toString(); observedAt = SystemClock.elapsedRealtime(); page = address;
                return receipt.put("ok", true).put("result", new JSONObject().put("observation", observation)
                    .put("page", page).put("nodes", nodes).put("untrusted", true));
            }
            if (observation.isEmpty() || !observation.equals(command.optString("observation"))
                    || SystemClock.elapsedRealtime() - observedAt > 15000 || !page.equals(address)) throw new Exception("fresh_phone_read_required");
            int id = command.optInt("target", -1);
            if (id < 0 || id >= targets.size()) throw new Exception("unknown_phone_target");
            AccessibilityNodeInfo n = targets.get(id);
            if (!n.refresh() || !n.isVisibleToUser() || !n.isEnabled() || n.isPassword()
                    || n.getWindowId() != root.getWindowId() || !identity(n).equals(identities.get(id))) throw new Exception("phone_target_changed_read_again");
            boolean done;
            if ("type".equals(action)) {
                String text = command.optString("text");
                if (!n.isEditable() || !PhoneToolPolicy.promptField(label(n)) || text.trim().isEmpty() || text.length() > 6000) throw new Exception("only_visible_chat_prompt_fields_can_be_typed");
                Bundle args = new Bundle(); args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
                done = n.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args);
            } else if ("tap".equals(action)) {
                if (!n.isClickable() || PhoneToolPolicy.blockedControl(label(n))) throw new Exception("control_needs_owner_on_phone");
                if (label(n).toLowerCase(java.util.Locale.ROOT).matches("(?s).*\\b(send|run|submit)\\b.*") && ++sends > 10) throw new Exception("provider_send_limit_reached");
                done = n.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            } else if ("scroll_up".equals(action) || "scroll_down".equals(action)) {
                if (!n.isScrollable()) throw new Exception("target_not_scrollable");
                done = n.performAction("scroll_down".equals(action) ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
            } else throw new Exception("unsupported_phone_action");
            invalidate();
            return receipt.put("ok", done).put("result", new JSONObject().put("action", action)
                .put("androidAccepted", done).put("verifiedNextScreen", false));
        } catch (Exception error) {
            invalidate();
            try { receipt.put("ok", false).put("error", error.getMessage() == null ? "phone_action_failed" : error.getMessage()); } catch (Exception ignored) {}
            return receipt;
        } finally { if (root != null) root.recycle(); }
    }
    private PhoneToolController() {}
}
