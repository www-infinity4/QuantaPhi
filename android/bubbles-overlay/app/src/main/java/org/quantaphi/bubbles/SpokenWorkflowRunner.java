package org.quantaphi.bubbles;

import android.app.KeyguardManager;
import android.content.Context;
import android.os.Handler;
import android.os.PowerManager;
import android.os.SystemClock;
import java.util.function.BiConsumer;

/**
 * Owner-spoken deterministic phone job: observe -> perform one authored step ->
 * observe the next target. Never plan from third-party app content.
 * No blind repeated taps, password entry, OS permission approval or money actions.
 */
final class SpokenWorkflowRunner {
    private static final long STEP_TIMEOUT_MS = 12000L;
    private static final long JOB_TIMEOUT_MS = 120000L;
    private final Context context;
    private final Handler main;
    private final BiConsumer<String, Boolean> notify;
    private SpokenWorkflowPlan plan;
    private boolean running, verifyingOpen, verifyingType;
    private int index;
    private long stepStart, jobStart;
    private String expectedPackage = "", latest = "No UI job started.";
    private boolean lastActionVerified;
    private final Runnable pulse = this::tick;

    SpokenWorkflowRunner(Context context, Handler main, BiConsumer<String, Boolean> notify) {
        this.context = context; this.main = main; this.notify = notify;
    }

    boolean isRunning() { return running; }
    String status() { return latest; }

    void start(SpokenWorkflowPlan next) {
        if (next == null) return;
        if (running) {
            notify.accept("A UI job is already running. Say stop the task before starting another.", true);
            return;
        }
        if (!BrainLearningService.isConnected()) {
            update("Bubbles screen control is off. Enable Brain workflow learning in Android Accessibility.", true);
            return;
        }
        this.plan = next;
        this.running = true;
        this.verifyingOpen = false;
        this.verifyingType = false;
        this.index = 0;
        this.expectedPackage = "";
        this.lastActionVerified = false;
        this.jobStart = SystemClock.elapsedRealtime();
        this.stepStart = jobStart;
        update("UI job started. " + next.steps.size() + " owner-spoken steps.", false);
        main.post(pulse);
    }

    void cancel() {
        if (!running) { update("No UI job is running.", true); return; }
        running = false;
        main.removeCallbacks(pulse);
        update("UI job stopped. No remaining steps were sent.", true);
    }

    private void update(String message, boolean terminal) {
        latest = message;
        BrainNotes.prefs(context).edit()
            .putString("workflow_state", terminal ? "stopped" : "working")
            .putString("workflow_receipt", message)
            .putInt("workflow_step", index)
            .apply();
        notify.accept(message, terminal);
    }

    private void fail(String message) {
        running = false;
        main.removeCallbacks(pulse);
        update("UI job stopped at step " + (index + 1) + "/" + plan.steps.size()
            + ": " + message, true);
    }

    private void advance(boolean verified) {
        lastActionVerified = verified;
        index++;
        verifyingOpen = false;
        verifyingType = false;
        stepStart = SystemClock.elapsedRealtime();
        latest = "UI job working. " + index + "/" + plan.steps.size() + " steps accepted.";
        BrainNotes.prefs(context).edit()
            .putString("workflow_receipt", latest)
            .putInt("workflow_step", index).apply();
        if (index == plan.steps.size()) {
            running = false;
            update(verified
                ? "UI job finished. " + index + " steps accepted; final visible state verified."
                : "UI steps sent. Last action accepted by Android; final screen result unverified.", true);
            return;
        }
        main.postDelayed(pulse, 500L);
    }

    private void again() { main.postDelayed(pulse, 400L); }

    private void tick() {
        if (!running) return;
        long now = SystemClock.elapsedRealtime();
        if (now - jobStart > JOB_TIMEOUT_MS) { fail("overall time limit reached"); return; }
        if (now - stepStart > STEP_TIMEOUT_MS) { fail("expected visible control did not appear"); return; }
        if (!BrainLearningService.isConnected()) { fail("Accessibility was disconnected"); return; }
        KeyguardManager lock = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if ((lock != null && lock.isKeyguardLocked()) || power == null || !power.isInteractive()) {
            fail("phone locked or screen off"); return;
        }
        SpokenWorkflowPlan.Step step = plan.steps.get(index);
        String foreground = BrainLearningService.workflowForegroundPackage();
        if (step.kind == SpokenWorkflowPlan.Kind.OPEN) {
            if (!verifyingOpen) {
                String pkg = AppControlBridge.packageForName(context, step.target);
                if (pkg == null) { fail("installed app name not uniquely found"); return; }
                String result = AppControlBridge.tryLaunch(context, "open " + step.target);
                if (result == null || !result.startsWith("Requested ")) {
                    fail("Android did not accept app launch"); return;
                }
                expectedPackage = pkg;
                verifyingOpen = true;
                again();
            } else if (expectedPackage.equals(foreground)) advance(true);
            else again();
            return;
        }
        if (foreground.isEmpty()) { again(); return; }
        if (expectedPackage.isEmpty()) expectedPackage = foreground; // user started in this app
        if (!expectedPackage.equals(foreground)) {
            fail("another app appeared; navigation not authorised for it"); return;
        }
        switch (step.kind) {
            case WAIT:
                if (BrainLearningService.workflowLabelVisible(step.target)) advance(true);
                else again();
                break;
            case TAP: {
                String result = BrainLearningService.performRequestedAction("tap " + step.target);
                if (result != null && result.startsWith("Tap sent to ")) advance(false);
                else if (result != null && (result.startsWith("I cannot find ")
                        || result.startsWith("The visible label "))) again();
                else fail(result == null ? "tap control unavailable" : result);
                break;
            }
            case TYPE: {
                if (verifyingType) {
                    if (BrainLearningService.workflowTypedValueVisible(step.target, step.value)) advance(true);
                    else again(); // Do not submit duplicate keystrokes after Android accepted SET_TEXT.
                    break;
                }
                String result = BrainLearningService.workflowType(step.target, step.value);
                if ("TYPE_VERIFIED".equals(result)) advance(true);
                else if ("TYPE_UNVERIFIED".equals(result)) { verifyingType = true; again(); }
                else if ("FIELD_NOT_FOUND".equals(result)) again();
                else fail("text was not verified in the requested field (" + result + ")");
                break;
            }
            case SCROLL: {
                String result = BrainLearningService.performRequestedAction("scroll " + step.target);
                if (result != null && result.startsWith("Scroll ")) advance(false);
                else if ("No scrollable area is visible.".equals(result)) again();
                else fail(result == null ? "scroll unavailable" : result);
                break;
            }
            default: fail("unsupported step");
        }
    }
}
