// Synthetic owner-host readiness check; never accepts a real conversation,
// credential, remote URL or execution request. A local response is not proof
// that the model runtime itself is configured to operate offline.
import {pathToFileURL} from 'node:url';

export async function probeLocalInference({model,fetcher=fetch}={}){
 if(typeof model!=='string'||! /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}(?::[A-Za-z0-9][A-Za-z0-9_.-]{0,63})?$/.test(model)||/cloud/i.test(model))
  throw Error('local_model_name_required');
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),90000);
 try{
  const response=await fetcher('http://127.0.0.1:11434/api/chat',{
   method:'POST',redirect:'error',signal:controller.signal,
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model,messages:[{role:'user',content:'What is 2 + 2? Reply only with the digit.'}],stream:false,options:{temperature:0,num_predict:128}})
  });
  if(!response.ok)throw Error('local_model_unavailable');
  const payload=await response.json();
  if(payload?.model!==model||payload.done!==true||payload.message?.role!=='assistant'||
   typeof payload.message.content!=='string'||payload.message.content.trim()!=='4'||
   !Number.isSafeInteger(payload.eval_count)||payload.eval_count<1)
   throw Error('local_model_response_unverified');
  return {ok:true,scope:'synthetic-loopback-model-probe',model,generatedTokens:payload.eval_count,
   productionVerified:false,executionAuthorized:false,offlineRuntimeVerified:false};
 }finally{clearTimeout(timer)}
}
// Local text-only chat. No tools, remote fallback, credentials or persistent
// transcript. A local endpoint does not attest that Ollama itself is offline.
export async function localChat({model,prompt,fetcher=fetch}={}){
 if(typeof model!=='string'||! /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}(?::[A-Za-z0-9][A-Za-z0-9_.-]{0,63})?$/.test(model)||/cloud/i.test(model))
  throw Error('local_model_name_required');
 if(typeof prompt!=='string'||!prompt.trim()||Buffer.byteLength(prompt,'utf8')>16384)
  throw Error('local_prompt_invalid');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
 try{
  const response=await fetcher('http://127.0.0.1:11434/api/chat',{
   method:'POST',redirect:'error',signal:controller.signal,
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({model,messages:[
    {role:'system',content:'You are Bubbles, a text-only assistant. Give grounded factual help, acknowledge uncertainty, and do not claim access to tools, devices or personal information. Do not validate unsupported claims about physical or biological effects of software.'},
    {role:'user',content:prompt}],stream:false,options:{temperature:0.2,num_predict:512}})
  });
  if(!response.ok){await response.body?.cancel().catch(()=>{});throw Error('local_model_unavailable');}
  const limit=262144;
  if(Number(response.headers.get('Content-Length'))>limit){await response.body?.cancel().catch(()=>{});throw Error('local_model_response_too_large');}
  if(!response.body)throw Error('local_model_response_unverified');
  const reader=response.body.getReader(),chunks=[];
  let size=0,payload;
  try{
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw Error('local_model_response_too_large');chunks.push(Buffer.from(value));}
   payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
  }catch(error){await reader.cancel().catch(()=>{});if(error?.message==='local_model_response_too_large')throw error;throw Error('local_model_response_unverified');}
  finally{reader.releaseLock();}
  if(payload?.model!==model||payload.done!==true||payload.message?.role!=='assistant'||
    typeof payload.message.content!=='string'||!payload.message.content.trim()||
    Buffer.byteLength(payload.message.content,'utf8')>65536||
    (payload.message.tool_calls!==undefined&&(!Array.isArray(payload.message.tool_calls)||payload.message.tool_calls.length!==0))||
    !Number.isSafeInteger(payload.eval_count)||payload.eval_count<1)
   throw Error('local_model_response_unverified');
  return {ok:true,scope:'local-text-chat',model,reply:payload.message.content,generatedTokens:payload.eval_count,
   productionVerified:false,executionAuthorized:false,offlineRuntimeVerified:false};
 }finally{clearTimeout(timer);}
}
async function readPrompt(){
 const chunks=[];let length=0;
 for await(const chunk of process.stdin){length+=chunk.length;if(length>16384)throw Error('local_prompt_invalid');chunks.push(chunk);}
 return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const operation=process.argv[2]==='--chat'
  ?readPrompt().then(prompt=>localChat({model:process.argv[3],prompt}))
  :probeLocalInference({model:process.argv[2]});
 operation.then(receipt=>console.log(JSON.stringify(receipt)))
  .catch(()=>{console.error('Local model response not verified. No production operation attempted.');process.exitCode=1;});
}
