import {DurableObject} from 'cloudflare:workers';
// Owner-controlled permission for browser automation; no credentials are created.
// Every automation call must still pass the existing Robot Brain owner verifier.
const FIVE_DAYS_MS=5*24*60*60*1000;
export class BrowserConsentStore extends DurableObject {
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
 async revoke(){
  // Storage transaction makes revocation visible to the next serialized DO request.
  await this.ctx.storage.put('owner-browser-consent',{enabled:false,expiresAt:0,updatedAt:Date.now()});
  return {ok:true,enabled:false,revoked:true};
 }
}
