package org.quantaphi.bubbles;

/** JVM-only verification for ChatGPT's foreground-app interface. */
public final class ChatGPTAppPolicyCheck {
    private static void want(String input, ChatGPTAppPolicy.Kind expected) {
        ChatGPTAppPolicy.Request plan=ChatGPTAppPolicy.parse(input);
        if(plan==null||plan.kind!=expected)
            throw new AssertionError(input+" expected "+expected+" got "+(plan==null?"none":plan.kind));
    }
    private static void refuse(String input) {
        if(ChatGPTAppPolicy.parse(input)!=null)
            throw new AssertionError("Unexpected ChatGPT app action: "+input);
    }
    public static void main(String[] args) {
        want("Open ChatGPT",ChatGPTAppPolicy.Kind.OPEN);
        want("Bubbles, show me ChatGPT",ChatGPTAppPolicy.Kind.OPEN);
        want("read this conversation in ChatGPT",ChatGPTAppPolicy.Kind.READ);
        want("Can you summarize the current chat in ChatGPT?",ChatGPTAppPolicy.Kind.READ);
        want("what does this ChatGPT screen say?",ChatGPTAppPolicy.Kind.READ);
        want("tap History in ChatGPT",ChatGPTAppPolicy.Kind.TAP);
        want("scroll down in ChatGPT",ChatGPTAppPolicy.Kind.SCROLL);
        want("type \"Hello Bubbles\" into Message in ChatGPT",ChatGPTAppPolicy.Kind.TYPE);
        ChatGPTAppPolicy.Request type=ChatGPTAppPolicy.parse("type \"Hello Bubbles\" into Message in ChatGPT");
        if(!"Message".equals(type.field)||!"Hello Bubbles".equals(type.value))
            throw new AssertionError("Composer field selection changed.");
        want("read all my ChatGPT conversations",ChatGPTAppPolicy.Kind.ARCHIVE_UNAVAILABLE);
        want("download full ChatGPT history",ChatGPTAppPolicy.Kind.ARCHIVE_UNAVAILABLE);
        refuse("Read the ChatGPT app in the background without my permission");
        refuse("Show me the weather.");
        refuse("tap approve in ChatGPT");
        refuse("type \"12345\" into Password in ChatGPT");
        refuse("send all chats to someone");
        System.out.println("ChatGPT foreground-app policy verified.");
    }
}
