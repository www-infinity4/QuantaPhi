package org.quantaphi.bubbles;

public final class ChromeControlPolicyCheck {
    private static void require(boolean ok, String reason) {
        if (!ok) throw new AssertionError(reason);
    }
    public static void main(String[] args) {
        require(ChromeControlPolicy.isChromeRequest("read Chrome page"), "read Chrome");
        require("read this screen".equals(ChromeControlPolicy.screenPhrase("read Chrome page")), "read normalized");
        require(ChromeControlPolicy.isChromeRequest("tap Search in Chrome"), "tap Chrome");
        require("tap Search".equals(ChromeControlPolicy.screenPhrase("tap Search in Chrome")), "tap target normalized");
        require(ChromeControlPolicy.isChromeRequest("scroll down in Chrome"), "scroll Chrome");
        require("scroll down".equals(ChromeControlPolicy.screenPhrase("scroll down in Chrome")), "scroll normalized");
        require(!ChromeControlPolicy.isChromeRequest("tap Search"), "ordinary apps unaffected");
        require(!ChromeControlPolicy.isChromeRequest("read my wallet"), "no implicit screen access");
        require(!ChromeControlPolicy.isChromeRequest("open a random site in Chrome"), "no arbitrary web navigation");
        require("tap Pay".equals(ChromeControlPolicy.screenPhrase("tap Pay in Chrome")), "sensitive tap remains policy blocked downstream");
        System.out.println("Chrome control policy checks passed");
    }
}
