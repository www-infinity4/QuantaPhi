// Local-machine pilot only. Never reverse proxy or expose to a public network.
// The local OS boundary is not StarQuest or signed Brain authentication.
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
import {localChat} from './local-inference-probe.mjs';

const HTML=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Bubbles</title><style>
body{background:#f6f2e9;color:#292724;font:18px/1.6 system-ui,sans-serif;margin:0;padding:20px;letter-spacing:.015em}main{max-width:720px;margin:auto}section{background:white;border:1px solid #d8d0c4;border-radius:16px;padding:20px}h1{font-size:1.6rem}textarea{box-sizing:border-box;width:100%;min-height:130px;font:inherit;padding:12px;border:1px solid #aaa;border-radius:8px}button{font:inherit;min-height:48px;padding:8px 22px;border:0;border-radius:24px;background:#a22229;color:white}button:disabled{opacity:.6}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}small{display:block;margin:12px 0;color:#514c45}
</style></head><body><main><h1>Local Bubbles</h1><section><p>Private-machine text chat pilot. No website login, wallet or repository execution.</p><small>Requires an installed local model. Runtime network isolation must be verified separately. Conversation is not saved by this page.</small><form id="form"><label for="prompt">Message</label><textarea id="prompt" required maxlength="16384"></textarea><button id="send" type="submit">Send</button></form><p id="status" role="status" aria-live="polite">Ready to try a local reply.</p><pre id="reply" aria-live="polite"></pre></section></main><script src="/client.js" defer></script></body></html>`;
const CLIENT=`
const form=document.getElementById('form'),prompt=document.getElementById('prompt'),send=document.getElementById('send'),status=document.getElementById('status'),reply=document.getElementById('reply');
form.addEventListener('submit',async event=>{
 event.preventDefault(); if(send.disabled)return;
 const text=prompt.value;if(!text.trim())return;
 send.disabled=true;status.textContent='Waiting for local model…';
 try{
  const res=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:text}),redirect:'error'});
  const data=await res.json();
  if(!res.ok||data.ok!==true||typeof data.reply!=='string')throw Error('unavailable');
  reply.textContent=data.reply;status.textContent='Local model reply received. No tools executed.';
 }catch{status.textContent='Local reply unavailable. Your message remains in the box.';}
 finally{send.disabled=false;}
});
`;
const HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"};
function send(res,status,type,body){
 res.writeHead(status,{...HEADERS,'Content-Type':type});res.end(body);
}
const json=(res,status,body)=>send(res,status,'application/json; charset=utf-8',JSON.stringify(body));
export function createLocalChatServer({model,chat=localChat}={}){
 if(typeof model!=='string'||! /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}(?::[A-Za-z0-9][A-Za-z0-9_.-]{0,63})?$/.test(model)||/cloud/i.test(model))throw Error('local_model_name_required');
 let busy=false;
 const server=createServer({requestTimeout:20000,headersTimeout:10000},async(req,res)=>{
  const bound=server.address(),host=bound&&typeof bound==='object'?'127.0.0.1:'+bound.port:null;
  if(!host||bound.address!=='127.0.0.1'||req.socket.remoteAddress!=='127.0.0.1'||req.headers.host!==host)
   return json(res,403,{ok:false,error:'local_only'});
  if(req.method==='GET'&&req.url==='/')return send(res,200,'text/html; charset=utf-8',HTML);
  if(req.method==='GET'&&req.url==='/client.js')return send(res,200,'text/javascript; charset=utf-8',CLIENT);
  if(req.method!=='POST'||req.url!=='/chat')return json(res,404,{ok:false,error:'not_found'});
  if(req.headers.origin!=='http://'+host||!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))
   return json(res,403,{ok:false,error:'same_origin_required'});
  if(busy)return json(res,429,{ok:false,error:'local_model_busy'});
  busy=true;
  try{
   // Bound wire bytes too; escaped JSON may exceed raw prompt bytes.
   const limit=100000;let size=0;const chunks=[];
   if(Number(req.headers['content-length'])>limit){req.resume();return json(res,413,{ok:false,error:'prompt_too_large'});}
   for await(const chunk of req){size+=chunk.length;if(size>limit){json(res,413,{ok:false,error:'prompt_too_large'});return;}chunks.push(chunk);}
   let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{return json(res,400,{ok:false,error:'invalid_prompt'});}
   if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==1||typeof data.prompt!=='string'||!data.prompt.trim())
    return json(res,400,{ok:false,error:'invalid_prompt'});
   if(Buffer.byteLength(data.prompt,'utf8')>16384)return json(res,413,{ok:false,error:'prompt_too_large'});
   const result=await chat({model,prompt:data.prompt});
   if(result?.ok!==true||result.model!==model||typeof result.reply!=='string'||Buffer.byteLength(result.reply,'utf8')>65536||result.executionAuthorized!==false||result.productionVerified!==false||result.offlineRuntimeVerified!==false)
    return json(res,502,{ok:false,error:'unverified_local_reply'});
   return json(res,200,{ok:true,reply:result.reply,model,executionAuthorized:false,productionVerified:false,offlineRuntimeVerified:false});
  }catch{if(!res.headersSent)json(res,503,{ok:false,error:'local_model_unavailable'});}
  finally{busy=false;}
 });
 return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=createLocalChatServer({model:process.argv[2]});
 server.listen(8790,'127.0.0.1',()=>console.log('Local Bubbles pilot: http://127.0.0.1:8790'));
}
