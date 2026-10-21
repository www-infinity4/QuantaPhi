import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('workers/bubbles-cloud-browser/consent.mjs','utf8')
 .replace("import {DurableObject} from 'cloudflare:workers';","class DurableObject {constructor(ctx){this.ctx=ctx}}");
const {BrowserConsentStore}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function fixture(){const rows=new Map(),writes=[];const store=new BrowserConsentStore({storage:{
 get:async key=>rows.get(key),put:async(key,value)=>{writes.push(key);if(typeof key==='string')rows.set(key,value);else for(const [k,v] of Object.entries(key))rows.set(k,v);}
}});return {store,rows,writes}}
test('one explicit approval enables both grants with one atomic write and same five-day expiry',async()=>{
 const {store,rows,writes}=fixture(),before=Date.now();await store.enableChatGPT();
 assert.equal(writes.length,1);assert.equal(typeof writes[0],'object');
 const a=await store.status(),b=await store.chatgptStatus();
 assert.equal(a.enabled,true);assert.equal(b.enabled,true);assert.equal(a.expiresAt,b.expiresAt);
 assert.ok(b.expiresAt>=before+5*86400000&&b.expiresAt<=Date.now()+5*86400000);
 const count=writes.length;await store.chatgptStatus();await store.status();assert.equal(writes.length,count);
});
test('expiry and revocation remain enforced independently without status renewing consent',async()=>{
 const {store,rows}=fixture();await store.enableChatGPT();await store.revoke();
 assert.equal((await store.status()).enabled,false);assert.equal((await store.chatgptStatus()).enabled,true);
 await store.revokeChatGPT();assert.equal((await store.chatgptStatus()).enabled,false);
 rows.set('owner-chatgpt-bridge-consent',{enabled:true,expiresAt:Date.now()-1});
 assert.equal((await store.chatgptStatus()).enabled,false);
});
test('late owner restoration rechecks saved approval without granting new access',()=>{
 const ui=fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
 const poll=ui.slice(ui.indexOf('async function pollChatGPT()'),ui.indexOf('// The session and owner token remain'));
 assert.ok(!poll.includes('||!chatgptApproved'));
 assert.ok(poll.includes("bridgeCall('permission',{action:'status'})"));
 assert.ok(poll.includes("if(saved.enabled!==true)return"));
 assert.ok(!poll.includes("action:'enable'"));
});
