package org.quantaphi.bubbles;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** A *visible-app* companion, not a ChatGPT account-history API.
 * The owner asks in natural language; Android Accessibility supplies only
 * the foreground app's current viewport after the owner enables it.
 * This parser emits intent, never an action or a permission by itself.
 */
final class ChatGPTAppPolicy {
    static final String PACKAGE = "com.openai.chatgpt";
    enum Kind { OPEN, READ, TAP, SCROLL, TYPE, ARCHIVE_UNAVAILABLE }
    static final class Request {
        final Kind kind;
        final String screenPhrase, field, value;
        Request(Kind kind, String screenPhrase, String field, String value) {
            this.kind = kind; this.screenPhrase = screenPhrase;
            this.field = field; this.value = value;
        }
    }
    private static final String APP = "(?:chat\\s*gpt)(?:\\s+app)?";
    private static final Pattern OPEN = Pattern.compile(
        "^(?:open|launch|show|bring up|switch to|go to|pull up)\\s+(?:(?:the|my)\\s+)?"+APP+"[.!?]*$",
        Pattern.CASE_INSENSITIVE);
    private static final Pattern TYPE = Pattern.compile(
        "^(?:type|enter|put)\\s+[\\\"“](.{1,160})[\\\"”]\\s+(?:in|into)\\s+(?:the\\s+)?(.{1,80}?)\\s+(?:in|on|inside)\\s+(?:the\\s+)?"+APP+"[.!?]*$",
        Pattern.CASE_INSENSITIVE);
    private static final Pattern TAP = Pattern.compile(
        "^(?:tap|click|press|select)\\s+(?:on\\s+)?(?:the\\s+)?(.{1,80}?)\\s+(?:in|on|inside)\\s+(?:the\\s+)?"+APP+"[.!?]*$",
        Pattern.CASE_INSENSITIVE);
    private static final Pattern SCROLL = Pattern.compile(
        "^scroll\\s+(up|down)(?:\\s+(?:in|on|inside)\\s+(?:the\\s+)?"+APP+")[.!?]*$",
        Pattern.CASE_INSENSITIVE);
    private ChatGPTAppPolicy() {}

    static Request parse(String speech) {
        if (speech == null || speech.length() > 600) return null;
        final String text = speech.trim()
            .replaceFirst("(?i)^(?:(?:hey|okay|please|bubbles)[,\\s]+)+", "")
            .replaceFirst("(?i)^(?:can|could|would|will) you\\s+(?:please\\s+)?", "").trim();
        if (text.isEmpty() || !text.toLowerCase(Locale.ROOT)
            .replace(" ", "").contains("chatgpt")) return null;
        if (OPEN.matcher(text).matches()) return new Request(Kind.OPEN,"","","");
        // A phone viewport is not an archive. Never pretend to enumerate
        // private background threads by guessing from the currently open page.
        if (text.matches("(?is).*\\b(?:all|every|entire|complete|full|download|export)\\b.*\\b(?:history|conversations|chats|data)\\b.*")
            || text.matches("(?is).*\\b(?:history|conversations|chats|data)\\b.*\\b(?:all|every|entire|complete|full|download|export)\\b.*"))
            return new Request(Kind.ARCHIVE_UNAVAILABLE,"","","");
        Matcher match = TYPE.matcher(text);
        if (match.matches() && !ScreenAwareness.sensitive(match.group(2)))
            return new Request(Kind.TYPE,"",match.group(2).trim(),match.group(1));
        match = TAP.matcher(text);
        if (match.matches() && !ScreenAwareness.sensitive(match.group(1)))
            return new Request(Kind.TAP,"tap "+match.group(1).trim(),"","");
        match = SCROLL.matcher(text);
        if (match.matches())return new Request(Kind.SCROLL,"scroll "+match.group(1).toLowerCase(Locale.ROOT),"","");
        // A read request must explicitly identify the currently visible
        // conversation or ChatGPT screen; silent learning remains disabled.
        if (text.matches("(?is).*\\b(?:read|review|explain|summari[sz]e|describe|what\\s+(?:is|does|do)|what's)\\b.*")
            && text.matches("(?is).*\\b(?:screen|visible|current|open|this|here|page|conversation|message|chat)\\b.*"))
            return new Request(Kind.READ,"","","");
        return null;
    }
}
