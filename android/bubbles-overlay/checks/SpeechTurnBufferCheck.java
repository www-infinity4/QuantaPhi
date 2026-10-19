package org.quantaphi.bubbles;
public final class SpeechTurnBufferCheck {
    public static void main(String[] args){
        SpeechTurnBuffer buffer=new SpeechTurnBuffer();
        if(buffer.hasPending()) throw new AssertionError("should start empty");
        buffer.append("please repair");
        if(!buffer.observePartial("the video"))throw new AssertionError("new speech must extend pause");
        for(int i=0;i<100;i++) {
            if(buffer.observePartial("  the   video  "))
                throw new AssertionError("unchanged decoder partial extended pause forever");
        }
        if(buffer.observePartial(""))throw new AssertionError("silence extended pause");
        if(!buffer.observePartial("the video generator"))throw new AssertionError("continued speech ignored");
        buffer.append("the video generator");
        if(!buffer.observePartial("the video generator"))throw new AssertionError("new phrase was deduplicated against prior phrase");
        if(!buffer.hasPending()) throw new AssertionError("pending turn lost");
        if(!"please repair the video generator".equals(buffer.take()))
            throw new AssertionError("consecutive clauses were interrupted");
        if(buffer.hasPending())throw new AssertionError("completed turn remained queued");
        if(!buffer.observePartial("the video generator"))throw new AssertionError("new turn retained stale partial");
        buffer.append("old microphone echo");
        buffer.clear();
        if(!"".equals(buffer.take()))throw new AssertionError("stale speaker echo not flushed");
        buffer.append("record");
        if(!"record".equals(buffer.take()))throw new AssertionError("capture command lost");
        buffer.append("please explain");
        long deadline=1000;
        // Model the service's 550ms partial poll with a virtual clock. Repeated
        // decoder output must leave a deliverable deadline, not slide forever.
        for(long now=0;now<5500;now+=550) {
            if(buffer.observePartial("the example"))deadline=now+1800;
        }
        if(deadline!=1800)throw new AssertionError("silence starved turn delivery");
        if(!buffer.observePartial("the example again"))throw new AssertionError("new words did not extend listening");
        buffer.clear();
        if(!buffer.observePartial("the example"))throw new AssertionError("explicit reset blocked repeated request");
        System.out.println("SpeechTurnBuffer checks passed");
    }
}
