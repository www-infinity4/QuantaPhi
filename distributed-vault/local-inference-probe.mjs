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
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 probeLocalInference({model:process.argv[2]}).then(receipt=>console.log(JSON.stringify(receipt)))
  .catch(()=>{console.error('Local model readiness not verified. No production operation attempted.');process.exitCode=1;});
}
