/* One user-authorized microphone stream. Silence stays local; speech clips go
 * to Cloudflare for transcription. Nothing is stored or sent while stopped. */
export function encodeSpeechWav(chunks, inputRate) {
 const length=chunks.reduce((n,c)=>n+c.length,0), samples=new Float32Array(length);
 let offset=0;for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length}
 const rate=16000, count=Math.floor(length*rate/inputRate);
 const buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
 const word=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i))};
 word(0,'RIFF');view.setUint32(4,36+count*2,true);word(8,'WAVE');word(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
 view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);
 view.setUint16(34,16,true);word(36,'data');view.setUint32(40,count*2,true);
 const ratio=inputRate/rate;
 for(let i=0;i<count;i++){
  const start=Math.floor(i*ratio),end=Math.min(length,Math.max(start+1,Math.floor((i+1)*ratio)));
  let sum=0;for(let j=start;j<end;j++)sum+=samples[j];
  const sample=Math.max(-1,Math.min(1,sum/(end-start)));
  view.setInt16(44+i*2,sample<0?sample*32768:sample*32767,true);
 }
 return buffer;
}
export function createSpeechSegments({sampleRate,onClip}) {
 let lead=[],chunks=[],duration=0,quiet=0,voiced=0;
 const reset=()=>{lead=[];chunks=[];duration=0;quiet=0;voiced=0};
 // A 12-second upload limit is not a conversational turn boundary.
 // Continue collecting transcribed segments until the speaker actually pauses.
 const flush=(continues=false)=>{const ready=chunks;const valid=voiced>=.25;reset();if(valid)onClip(ready,continues)};
 return {
  reset,
  push(input,suppressed=false){
   if(suppressed){reset();return 0}
   const copy=new Float32Array(input),seconds=copy.length/sampleRate;
   let sum=0;for(const value of copy)sum+=value*value;
   const level=Math.sqrt(sum/Math.max(1,copy.length)),speech=level>.015;
   if(!chunks.length){
    lead.push(copy);while(lead.length>Math.ceil(.3/seconds))lead.shift();
    if(!speech)return level;
    chunks=lead;lead=[];duration=chunks.reduce((n,c)=>n+c.length/sampleRate,0);
   }else{chunks.push(copy);duration+=seconds}
   if(speech){voiced+=seconds;quiet=0}else quiet+=seconds;
   if(quiet>=1.35)flush(false);
   else if(duration>=12)flush(true);
   return level;
  }
 };
}
export async function startContinuousVoice({stream,onLevel,onTranscript,onStatus,isSpeaking,url,Context,fetcher=fetch}) {
 const Ctx=Context||window.AudioContext||window.webkitAudioContext;
 if(!Ctx)throw Error('Audio processing is unavailable in this browser.');
 const context=new Ctx(),source=context.createMediaStreamSource(stream);
 const processor=context.createScriptProcessor(4096,1,1),silent=context.createGain();
 silent.gain.value=0;
 let stopped=false,inFlight=false,pending=[],controller=null,generation=0,transcriptParts=[];
 const submit=async ({chunks,continues,epoch})=>{
  if(stopped||epoch!==generation)return;
  if(inFlight){if(pending.length<8)pending.push({chunks,continues,epoch});else onStatus('Speech queue full; briefly pause and repeat the last thought.');return}
  inFlight=true;const current=generation;controller=new AbortController();
  const timer=setTimeout(()=>controller?.abort(),20000);
  try{
   onStatus('Understanding your words…');
   const bytes=new Uint8Array(encodeSpeechWav(chunks,context.sampleRate));
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
    body:JSON.stringify({audio:btoa(binary)})});
   const result=await response.json();
   if(!response.ok||!result.ok)throw Error(result.error||'Speech service unavailable');
   if(!stopped&&current===generation&&!isSpeaking()){
    const text=String(result.text||'').trim();
    if(text)transcriptParts.push(text);
    if(!continues){
      const thought=transcriptParts.join(' ').replace(/\\s+/g,' ').trim();
      transcriptParts=[];
      if(thought)onTranscript(thought);
      else onStatus('Listening · no clear words in that clip.');
    }
   }
  }catch(error){transcriptParts=[];if(!stopped)onStatus('Speech connection: '+String(error.message||error).slice(0,100)+'. Microphone remains on.')}
  finally{clearTimeout(timer);controller=null;inFlight=false;if(pending.length&&!stopped){const next=pending.shift();void submit(next)}}
 };
 const segments=createSpeechSegments({sampleRate:context.sampleRate,
  onClip:(chunks,continues)=>void submit({chunks,continues,epoch:generation})});
 processor.onaudioprocess=event=>{
  if(stopped)return;
  const suppressed=isSpeaking();
  if(suppressed){generation++;pending=[];transcriptParts=[];controller?.abort()}
  const level=segments.push(event.inputBuffer.getChannelData(0),suppressed);
  onLevel(level);
 };
 source.connect(processor);processor.connect(silent);silent.connect(context.destination);
 try{await context.resume()}catch(error){source.disconnect();processor.disconnect();silent.disconnect();await context.close();throw error}
 return {
  resume:()=>context.resume(),
  stop(){if(stopped)return;stopped=true;generation++;pending=[];transcriptParts=[];controller?.abort();segments.reset();
   processor.onaudioprocess=null;source.disconnect();processor.disconnect();silent.disconnect();void context.close();}
 };
}
