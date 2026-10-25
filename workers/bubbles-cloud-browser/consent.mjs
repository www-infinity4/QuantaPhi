import {DurableObject} from 'cloudflare:workers';
import {ContinuationSupervisor} from './continuation.mjs';
// Owner-controlled permission for browser automation; no credentials are created.
// Every automation call must still pass the existing Robot Brain owner verifier.
const FIVE_DAYS_MS=5*24*60*60*1000;
export class BrowserConsentStore extends DurableObject {
 continuation(){
  return new ContinuationSupervisor(this.ctx.storage,this.env,async()=>{
   const a=await this.status(),b=await this.chatgptStatus();
   return {enabled:a.enabled&&b.enabled,expiresAt:Math.min(a.expiresAt||0,b.expiresAt||0)};
  });
 }
 async startContinuation(input){return this.continuation().start(input);}
 async continuationStatus(){return this.continuation().status();}
 async continuationContext(){return this.continuation().context();}
 async stopContinuation(){return this.continuation().stop();}
 async alarm(){
  if(this.continuationTickRunning)return;
  this.continuationTickRunning=true;
  try{await this.continuation().tick();}finally{this.continuationTickRunning=false;}
 }
 async consumerHeartbeat(state){
  if(!['ready','busy'].includes(state))return {ok:false,error:'invalid_consumer_state',status:400};
  if(!(await this.chatgptStatus()).enabled||!(await this.status()).enabled)return {ok:false,error:'existing_five_day_approval_required',status:403};
  await this.ctx.storage.put('owner-message-consumer',{state,seenAt:Date.now()});
  return {ok:true};
 }
 async consumerStatus(){
  if(!(await this.chatgptStatus()).enabled||!(await this.status()).enabled)return {state:'approval_inactive'};
  const record=await this.ctx.storage.get('owner-message-consumer');
  if(!record||!['ready','busy'].includes(record.state)||!Number.isFinite(record.seenAt))return {state:'not_observed'};
  const ageSeconds=Math.max(0,Math.floor((Date.now()-record.seenAt)/1000));
  return {state:ageSeconds>45?'stale':record.state,ageSeconds};
 }
 async status(){
  const record=await this.ctx.storage.get('owner-browser-consent');
  return {ok:true,enabled:!!record?.enabled&&record.expiresAt>Date.now(),
   expiresAt:record?.enabled&&record.expiresAt>Date.now()?record.expiresAt:null,
   scope:['browser.read','browser.navigate','browser.safe_click','browser.safe_type']};
 }
 async enable(){
  const now=Date.now(),record={enabled:true,expiresAt:now+FIVE_DAYS_MS,updatedAt:now};
  await this.ctx.storage.put('owner-browser-consent',record);
  return {ok:true,enabled:true,expiresAt:record.expiresAt,scope:['browser.read','browser.navigate','browser.safe_click','browser.safe_type']};
 }
 async chatgptStatus(){
  const record=await this.ctx.storage.get('owner-chatgpt-bridge-consent');
  const enabled=record?.enabled===true&&record.expiresAt>Date.now();
  return {ok:true,enabled,expiresAt:enabled?record.expiresAt:null,
   scope:['chatgpt.browser.read','chatgpt.browser.navigate','chatgpt.browser.safe_click',
    'chatgpt.browser.safe_type','chatgpt.bubbles.message'],
   channel:'Cloudflare D1 owner-admin bridge',browserActionApprovalSeparate:false};
 }
 async enableChatGPT(){
  const now=Date.now();
  const value={enabled:true,expiresAt:now+FIVE_DAYS_MS,updatedAt:now};
  // The visible approval explicitly covers both ChatGPT and Cloud Browser.
  // Commit both records together so no second hidden approval is required.
  await this.ctx.storage.put({
   'owner-chatgpt-bridge-consent':value,
   'owner-browser-consent':{...value}
  });
  return this.chatgptStatus();
 }
 async revokeChatGPT(){
  await this.ctx.storage.put('owner-chatgpt-bridge-consent',{enabled:false,expiresAt:0,updatedAt:Date.now()});
  await this.stopContinuation();
  return {ok:true,enabled:false,revoked:true};
 }
 async revoke(){
  // Storage transaction makes revocation visible to the next serialized DO request.
  await this.ctx.storage.put('owner-browser-consent',{enabled:false,expiresAt:0,updatedAt:Date.now()});
  await this.stopContinuation();
  return {ok:true,enabled:false,revoked:true};
 }
}
