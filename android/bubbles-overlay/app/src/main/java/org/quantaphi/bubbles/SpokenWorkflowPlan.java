package org.quantaphi.bubbles;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Bounded, user-authored steps. No language model interprets screen text as commands. */
final class SpokenWorkflowPlan {
    enum Kind { OPEN, TAP, TYPE, SCROLL, WAIT }
    static final class Step {
        final Kind kind;
        final String target;
        final String value;
        Step(Kind kind, String target, String value) {
            this.kind = kind; this.target = target; this.value = value;
        }
    }
    final List<Step> steps;
    private SpokenWorkflowPlan(List<Step> steps) {
        this.steps = Collections.unmodifiableList(new ArrayList<>(steps));
    }
    static boolean stopCommand(String request) {
        if (request == null) return false;
        return request.trim().toLowerCase(Locale.ROOT).replaceAll("[.!?]+$", "")
            .matches("(?:stop|cancel|abort|end|halt)(?: the| my| this)? (?:phone |android |bubbles )?(?:task|workflow|job)"
                + "|(?:stop|cancel|abort) (?:doing|that task|what you're doing)");
    }
    static boolean statusCommand(String request) {
        if (request == null) return false;
        return request.trim().toLowerCase(Locale.ROOT).replaceAll("[.!?]+$", "")
            .matches("(?:phone |android |bubbles )?(?:task|workflow|job) status|(?:how is|check) (?:the |my )?(?:phone |android )?(?:task|job)(?: going)?");
    }
    static boolean looksLikeSequence(String request) {
        return request != null && request.toLowerCase(Locale.ROOT).matches("(?s).+\\s+(?:and\\s+)?then\\s+.+");
    }
    static SpokenWorkflowPlan parse(String utterance) {
        if (utterance == null || utterance.length() > 1000 || !looksLikeSequence(utterance)) return null;
        String q = utterance.trim().replaceFirst("(?i)^(?:please\\s+|do these steps[: ]+|on my phone[, ]+)+", "");
        String[] parts = q.split("(?i)[,;]?\\s+(?:and\\s+)?then\\s+");
        if (parts.length < 2 || parts.length > 8) return null;
        ArrayList<Step> steps = new ArrayList<>();
        for (String raw : parts) {
            String part = raw.trim().replaceFirst("(?i)^please\\s+", "").replaceFirst("[.!?]+$", "");
            if (part.length() < 4 || part.length() > 240) return null;
            Matcher open = Pattern.compile("(?i)^(?:open|launch|switch to|bring up)\\s+(?:the\\s+)?(.+?)(?:\\s+app)?$").matcher(part);
            Matcher tap = Pattern.compile("(?i)^(?:tap|press|click|select)\\s+(?:on\\s+)?(?:the\\s+)?(.+?)(?:\\s+button|\\s+link|\\s+option)?$").matcher(part);
            Matcher type = Pattern.compile("(?i)^(?:type|enter|write)\\s+(.+?)\\s+(?:into|in)\\s+(?:the\\s+)?(.+?)(?:\\s+(?:field|box|input))?$").matcher(part);
            Matcher scroll = Pattern.compile("(?i)^scroll\\s+(up|down)(?:\\s+(?:on|in)\\s+(?:the|this|my)\\s+(?:page|app|screen))?$").matcher(part);
            Matcher wait = Pattern.compile("(?i)^wait\\s+(?:for|until)\\s+(?:the\\s+)?(.+?)(?:\\s+(?:appears|is visible|shows up))?$").matcher(part);
            if (open.matches()) steps.add(new Step(Kind.OPEN, open.group(1).trim(), ""));
            else if (tap.matches()) steps.add(new Step(Kind.TAP, tap.group(1).trim(), ""));
            else if (type.matches()) steps.add(new Step(Kind.TYPE, type.group(2).trim(), type.group(1).trim()));
            else if (scroll.matches()) steps.add(new Step(Kind.SCROLL, scroll.group(1).toLowerCase(Locale.ROOT), ""));
            else if (wait.matches()) steps.add(new Step(Kind.WAIT, wait.group(1).trim(), ""));
            else return null; // No AI guesses, hidden gestures or arbitrary UI actions.
        }
        if (steps.size() != parts.length) return null;
        for (Step step : steps) {
            if (step.target.length() > 80 || step.target.isEmpty()
                    || (step.kind == Kind.TYPE && (step.value.isEmpty() || step.value.length() > 160))) return null;
            if (step.kind != Kind.OPEN && step.kind != Kind.SCROLL && ScreenAwareness.sensitive(step.target)) return null;
        }
        return new SpokenWorkflowPlan(steps);
    }
}
