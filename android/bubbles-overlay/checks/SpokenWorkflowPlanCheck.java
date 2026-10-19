package org.quantaphi.bubbles;

public final class SpokenWorkflowPlanCheck {
    private static void require(boolean condition, String description) {
        if (!condition) throw new AssertionError(description);
    }
    public static void main(String[] args) {
        SpokenWorkflowPlan p=SpokenWorkflowPlan.parse(
            "open Chrome then tap Search then type kittens into Search then wait for Results");
        require(p != null && p.steps.size() == 4, "full spoken sequence");
        require(p.steps.get(0).kind == SpokenWorkflowPlan.Kind.OPEN, "app opening");
        require(p.steps.get(1).kind == SpokenWorkflowPlan.Kind.TAP, "tap step");
        require(p.steps.get(2).kind == SpokenWorkflowPlan.Kind.TYPE, "type step");
        require("kittens".equals(p.steps.get(2).value), "owner-supplied input unchanged");
        require(p.steps.get(3).kind == SpokenWorkflowPlan.Kind.WAIT, "wait verification");
        require(SpokenWorkflowPlan.stopCommand("stop the task"), "stop voice");
        require(SpokenWorkflowPlan.statusCommand("task status"), "status voice");
        require(SpokenWorkflowPlan.parse("tap Pay then press Confirm") == null, "payment blocked");
        require(SpokenWorkflowPlan.parse("open Chrome then type password into password") == null, "password blocked");
        require(SpokenWorkflowPlan.parse("open Chrome then exploit login") == null, "unsupported rejected");
        require(SpokenWorkflowPlan.parse("open Chrome") == null, "single existing action unaffected");
        require(SpokenWorkflowPlan.parse("open Chrome then tap Search then buy stuff") == null, "no partial execute");
        require(SpokenWorkflowPlan.parse("tap Search then wait for Results") != null, "foreground app workflow");
        System.out.println("Spoken workflow policy checks passed");
    }
}
