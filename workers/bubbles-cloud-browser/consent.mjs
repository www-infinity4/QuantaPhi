import {DurableObject} from 'cloudflare:workers';
import {executeServerAssist} from './server-assist.mjs';
// Owner-controlled permission for browser automation; no credentials are created.
// Every automation call must still pass the existing Robot Brain owner verifier.
const FIVE_DAYS_MS=5*24*60*60*1000;
export class BrowserConsentStore extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;this.assistRunning=false;}
 async enqueueServerAssist(id){
  if(!/^chatgpt_assist_[0-9]{1,24}_[0-9]$/.test(id))throw Error('invalid_server_job');
  if(!(await this.chatgptStatus()).enabled||!(await this.status()).enabled)throw Error('consent_revoked');
  await this.ctx.storage.put('assist_job:'+id,id);
  await this.ctx.storage.setAlarm(Date.now()+1);
 }
 async alarm(){
  if(this.assistRunning)return;
  this.assistRunning=true;
  try{
   const jobs=await this.ctx.storage.list({prefix:'assist_job:',limit:1});
   const first=jobs.entries().next().value;if(!first)return;
   const [key,id]=first;
   // Recovery alarm survives a runtime restart. The database claim prevents
   // duplicate execution; an interrupted operation is explicitly blocked.
   await this.ctx.storage.setAlarm(Date.now()+120000);
   await executeServerAssist({id,db:this.env.BRIDGE_DB,store:this,fetcher:(url,options)=>{
    if(!this.env.TOOLS?.fetch)throw Error('bubbles_tools_binding_missing');
    return this.env.TOOLS.fetch(url,options);
   }});
   await this.ctx.storage.delete(key);
   await this.ctx.storage.setAlarm(Date.now()+1);
  }finally{this.assistRunning=false;}
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
  return {ok:true,enabled:false,revoked:true};
 }
 async revoke(){
  // Storage transaction makes revocation visible to the next serialized DO request.
  await this.ctx.storage.put('owner-browser-consent',{enabled:false,expiresAt:0,updatedAt:Date.now()});
  return {ok:true,enabled:false,revoked:true};
 }
}
