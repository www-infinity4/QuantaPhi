package org.quantaphi.bubbles;
public final class SpeechTurnBufferCheck {
    public static void main(String[] args){
        SpeechTurnBuffer buffer=new SpeechTurnBuffer();
        if(buffer.hasPending()) throw new AssertionError("should start empty");
        buffer.append("please repair");
        buffer.append("the video generator");
        if(!buffer.hasPending()) throw new AssertionError("pending turn lost");
        if(!"please repair the video generator".equals(buffer.take()))
            throw new AssertionError("consecutive clauses were interrupted");
        if(buffer.hasPending())throw new AssertionError("completed turn remained queued");
        buffer.append("old microphone echo");
        buffer.clear();
        if(!"".equals(buffer.take()))throw new AssertionError("stale speaker echo not flushed");
        buffer.append("record");
        if(!"record".equals(buffer.take()))throw new AssertionError("capture command lost");
        System.out.println("SpeechTurnBuffer checks passed");
    }
}
