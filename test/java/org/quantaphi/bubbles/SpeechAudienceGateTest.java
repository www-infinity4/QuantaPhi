package org.quantaphi.bubbles;

public final class SpeechAudienceGateTest {
    private static void check(boolean good,String why) {
        if (!good) throw new AssertionError(why);
    }
    public static void main(String[] args) {
        String[] petTalk={"Good dog!", "Sit!", "Stay, buddy", "come here",
            "Who's a good boy?", "Dogs, sit!", "want a treat?", "leave it"};
        for(String value:petTalk)
            check(SpeechAudienceGate.clearlyPetDirected(value,false,false),
                "Pet speech must stay local: "+value);
        String[] requests={"Search the weather", "Tell me how to care for dogs",
            "Can you fix my website Bubbles?", "Record the screen", "What's playing on Infinity Radio?"};
        for(String value:requests)
            check(!SpeechAudienceGate.clearlyPetDirected(value,false,false),
                "Normal conversational task must still work: "+value);
        check(!SpeechAudienceGate.clearlyPetDirected("Good dog",true,false),"Named Bubbles request");
        check(!SpeechAudienceGate.clearlyPetDirected("Good dog",false,true),"Typed message");
        System.out.println("Speech audience tests passed");
    }
}
