// Production passkey endpoint verification, read-only except deliberately
// rejected unauthenticated requests. Never reads owner addresses or wallet keys.
import {pathToFileURL} from 'node:url';

export const LIVE_PATH='https://quantaphi.org/api/quant-mail/passkeys/status';
const API='https://quantaphi.org/api/quant-mail/passkeys';

function requireValue(condition,error){
 if(!condition)throw new Error(error);
}
async function parseJson(response){
 requireValue(response&&typeof response.status==='number','passkey_response_missing');
 let body;
 try{body=await response.json();}catch{throw new Error('passkey_status_not_json');}
 return body;
}
export async function verifyQuantMailLive({request=fetch,base=API}={}){
 requireValue(typeof request==='function','passkey_fetch_not_available');
 const result=await request(base+'/status',{method:'GET',cache:'no-store',
  headers:{'Accept':'application/json'}});
 const body=await parseJson(result);
 requireValue(result.status===200,'passkey_status_http_'+result.status);
 requireValue(body?.ok===true&&body.rpId==='quantaphi.org','passkey_status_invalid');
 requireValue(typeof body.enabled==='boolean'&&
  body.registrationReady===body.enabled&&body.loginReady===body.enabled,
  'passkey_status_inconsistent');
 requireValue(body.aliases===undefined&&body.owner===undefined&&
  body.ownerAccountId===undefined,'passkey_private_owner_data_exposed');
 const cache=result.headers?.get?.('Cache-Control')||'';
 requireValue(cache.includes('no-store'),'passkey_status_cacheable');
 const originAttack=await request(base+'/register/begin',{
  method:'POST',headers:{Origin:'https://not-quantaphi.example','Content-Type':'application/json'},
  body:JSON.stringify({alias:'random@quantaphi.org'})
 });
 requireValue(originAttack.status===403,'passkey_cross_origin_denial_missing');
 const unknownOrigin=await request(base+'/register/begin',{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({alias:'random@quantaphi.org'})
 });
 requireValue(unknownOrigin.status===403,'passkey_no_origin_denial_missing');
 // No keys or secrets are read or modified; this is a negative-path smoke test.
 return {ok:true,serverReached:true,enabled:body.enabled,originDenied:true,
  noOriginDenied:true,rpId:body.rpId};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 verifyQuantMailLive().then(result=>{
  process.stdout.write('Live Quant Mail passkey endpoint checked: '+JSON.stringify(result)+'\n');
 }).catch(error=>{
  process.stderr.write('::error::Quant Mail passkey deployment not verified: '+String(error.message||error)+'\n');
  process.exitCode=1;
 });
}
