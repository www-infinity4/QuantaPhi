import org.quantaphi.bubbles.LearningPolicy;

public final class LearningPolicyCheck {
    static void check(boolean value) {if(!value)throw new AssertionError("Learning policy failed");}
    public static void main(String[] args) {
        check("learn_chatgpt".equals(LearningPolicy.key("com.openai.chatgpt")));
        check("learn_x".equals(LearningPolicy.key("com.twitter.android")));
        check("learn_gemini".equals(LearningPolicy.key("com.google.android.apps.bard")));
        for(String app:new String[]{"com.android.chrome","com.bank.app","com.twitter.android.fake","com.google.android.googlequicksearchbox","",null})
            check(LearningPolicy.key(app)==null);
        check(LearningPolicy.clean(null).isEmpty());
        check("hello world".equals(LearningPolicy.clean(" hello\n world ")));
        check(LearningPolicy.clean("a".repeat(6000)).length()==4000);
        System.out.println("Brain app allowlist and bounded note checks passed");
    }
}
