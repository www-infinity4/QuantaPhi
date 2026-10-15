import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('bubbles-stream-voice.js','utf8');
const {encodeSpeechWav,createSpeechSegments,startContinuousVoice}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
import worker,{validateSpeechAudio} from '../workers/bubbles-tools/worker.mjs';
test('silence never creates an upload, speech ends after silence without stopping capture',()=>{
 const clips=[],segments=createSpeechSegments({sampleRate:16000,onClip:c=>clips.push(c)});
 const quiet=new Float32Array(1600),voice=new Float32Array(1600).fill(.1);
 for(let i=0;i<30;i++)segments.push(quiet);
 assert.equal(clips.length,0);
 for(let i=0;i<8;i++)segments.push(voice);
 for(let i=0;i<15;i++)segments.push(quiet);
 assert.equal(clips.length,1);
 for(let i=0;i<8;i++)segments.push(voice);
 for(let i=0;i<15;i++)segments.push(quiet);
 assert.equal(clips.length,2);
});
test('TTS audio never becomes a speech clip',()=>{
 const clips=[],segments=createSpeechSegments({sampleRate:16000,onClip:c=>clips.push(c)});
 for(let i=0;i<20;i++)segments.push(new Float32Array(1600).fill(.4),true);
 for(let i=0;i<10;i++)segments.push(new Float32Array(1600));
 assert.equal(clips.length,0);
});
test('resamples into canonical 16k mono PCM WAV; backend rejects wrong formats and long clips',()=>{
 const wav=encodeSpeechWav([new Float32Array(48000).fill(.1)],48000);
 assert.equal(wav.byteLength,32044);
 assert.equal(validateSpeechAudio(Buffer.from(wav).toString('base64')).length,32044);
 const invalid=Buffer.from(wav);invalid.writeUInt32LE(48000,24);
 assert.throws(()=>validateSpeechAudio(invalid.toString('base64')),/invalid_audio/);
 assert.throws(()=>validateSpeechAudio(Buffer.alloc(500000).toString('base64')),/invalid_audio/);
});
test('transcription requires allowed origin, configured AI and valid WAV',async()=>{
 const make=(audio,origin='https://quantaphi.org')=>new Request('https://tools/v1/transcribe',{method:'POST',headers:{Origin:origin},body:JSON.stringify({audio})});
 let called=0;const env={AI:{run:async(model,input)=>{called++;assert.equal(model,'@cf/openai/whisper-large-v3-turbo');assert.equal(input.language,'en');return{text:'Bubbles hello'}}}};
 const audio=Buffer.from(encodeSpeechWav([new Float32Array(16000).fill(.1)],16000)).toString('base64');
 assert.equal((await worker.fetch(make(audio,'https://other.example'),env)).status,403);
 assert.equal((await worker.fetch(make(audio),{})).status,503);
 assert.equal((await worker.fetch(make('junk'),env)).status,400);
 const good=await (await worker.fetch(make(audio),env)).json();
 assert.equal(good.text,'Bubbles hello');assert.equal(good.stored,false);assert.equal(called,1);
});
test('stream remains connected over multiple utterances, stop aborts transcription and disconnects processing',async()=>{
 let processor,connections=0,disconnects=0;
 const node=()=>({connect(){connections++},disconnect(){disconnects++}});
 class Context{
  sampleRate=16000;
  destination={};
  createMediaStreamSource(){return node()}
  createScriptProcessor(){processor=node();return processor}
  createGain(){return {...node(),gain:{value:1}}}
  async resume(){}
  async close(){this.closed=true}
 }
 const calls=[],texts=[];
 const capture=await startContinuousVoice({stream:{},Context,url:'https://tools/v1/transcribe',onLevel(){},onStatus(){},onTranscript:t=>texts.push(t),isSpeaking:()=>false,
  fetcher:async(url,opts)=>{calls.push(opts);return{ok:true,json:async()=>({ok:true,text:'Bubbles hello'})}}});
 const push=value=>processor.onaudioprocess({inputBuffer:{getChannelData:()=>new Float32Array(1600).fill(value)}});
 for(let i=0;i<8;i++)push(.1);for(let i=0;i<15;i++)push(0);
 await new Promise(r=>setImmediate(r));
 for(let i=0;i<8;i++)push(.1);for(let i=0;i<15;i++)push(0);
 await new Promise(r=>setImmediate(r));
 assert.equal(calls.length,2);assert.equal(texts.length,2);
 assert.equal(connections,3);assert.equal(disconnects,0);
 capture.stop();assert.equal(disconnects,3);assert.equal(processor.onaudioprocess,null);
});

test('long speech reaches Bubbles as a complete thought, not two interruptions',async()=>{
 const captured=[];
 const segments=createSpeechSegments({sampleRate:16000,onClip:(clip,continues)=>captured.push({clip,continues})});
 const voice=new Float32Array(1600).fill(.1),quiet=new Float32Array(1600);
 for(let i=0;i<125;i++)segments.push(voice);
 assert.equal(captured.length,1,'12-second service limit triggers one continuation chunk');
 assert.equal(captured[0].continues,true,'the first chunk is NOT a finished speech turn');
 for(let i=0;i<8;i++)segments.push(voice);
 for(let i=0;i<15;i++)segments.push(quiet);
 assert.equal(captured.length,2);
 assert.equal(captured[1].continues,false,'only the sustained end-of-speech ends the turn');
});
