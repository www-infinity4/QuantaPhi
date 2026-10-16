package org.quantaphi.bubbles;
public final class PhoneToolPolicyCheck {
    static void check(boolean ok) { if (!ok) throw new AssertionError(); }
    public static void main(String[] args) {
        check(PhoneToolPolicy.providerUrl("https://aws.console.saas.ibm.com/account"));
        check(PhoneToolPolicy.providerUrl("gemini.google.com/app"));
        for (String url : new String[]{"http://ibm.com", "https://ibm.com.evil.example", "https://ibm.com@evil.example", "https://evil.example/ibm.com", "https://gemini.google.com.evil.example", "https://ibm.com:8080"})
            check(!PhoneToolPolicy.providerUrl(url));
        check(PhoneToolPolicy.promptField("Enter a prompt here"));
        check(PhoneToolPolicy.promptField("Message"));
        check(!PhoneToolPolicy.promptField("Email address"));
        check(!PhoneToolPolicy.promptField("Chat password"));
        check(PhoneToolPolicy.blockedControl("Upgrade plan"));
        check(PhoneToolPolicy.blockedControl("Authorize"));
        check(!PhoneToolPolicy.blockedControl("Send message"));
        System.out.println("Phone provider and prompt-field boundaries passed");
    }
}
