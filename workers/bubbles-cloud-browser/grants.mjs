// Separate five-day Browser Run delegation. Never a GitHub, Cloudflare API,
// Robot Brain owner, or wallet credential.
import {DurableObject} from 'cloudflare:workers';
const DAYS5=5*24*60*60*1000;
const CODE_MS=120000;
const base64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const random=()=>base64(crypto.getRandomValues(new Uint8Array(32)));
const digest=async text=>base64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))));
export class BrowserGrantStore extends DurableObject {
 async create(){
  const now=Date.now(),code=random(),key='code:'+await digest(code);
  await this.ctx.storage.transaction(async tx=>{
   const previous=await tx.get('current-code');
   if(previous?.key)await tx.delete(previous.key);
   await tx.put(key,{expiresAt:now+CODE_MS,epoch:await tx.get('epoch')||0});
   await tx.put('current-code',{key,expiresAt:now+CODE_MS});
  });
  return {code,expiresInSeconds:120,durationDays:5,scope:['browser.navigate','browser.read','browser.safe_interact']};
 }
 async redeem(code){
  if(typeof code!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(code))return {ok:false,error:'grant_invalid_or_expired'};
  const key='code:'+await digest(code),token='bcb_'+random(),sessionKey='grant:'+await digest(token);
  const now=Date.now(),expiresAt=now+DAYS5;
  const ok=await this.ctx.storage.transaction(async tx=>{
   const pair=await tx.get(key);
   if(!pair||pair.expiresAt<=now||pair.epoch!==(await tx.get('epoch')||0))return false;
   await tx.delete(key);
   await tx.put(sessionKey,{expiresAt,epoch:pair.epoch,scopes:['browser.navigate','browser.read','browser.safe_interact']});
   await tx.put('latest',{expiresAt});
   return true;
  });
  return ok?{ok:true,token,expiresAt,scope:'browser-only'}:{ok:false,error:'grant_invalid_or_expired'};
 }
 async verify(token){
  if(!/^bcb_[A-Za-z0-9_-]{43}$/.test(token||''))return {ok:false};
  const record=await this.ctx.storage.get('grant:'+await digest(token));
  return record?.expiresAt>Date.now()&&record.epoch===(await this.ctx.storage.get('epoch')||0)
   ?{ok:true,expiresAt:record.expiresAt,scope:'browser-only'}:{ok:false};
 }
 async status(){
  const latest=await this.ctx.storage.get('latest');
  return {ok:true,lastGrantExpiresAt:latest?.expiresAt||null,canRevoke:true,durationDays:5};
 }
 async revoke(){
  const current=await this.ctx.storage.get('epoch')||0;
  await this.ctx.storage.put('epoch',current+1);
  await this.ctx.storage.delete('current-code');
  await this.ctx.storage.delete('latest');
  return {ok:true,revoked:true};
 }
}
