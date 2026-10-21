import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('workers/bubbles-cloud-browser/consent.mjs','utf8');
const transformed=source.replace("import {DurableObject} from 'cloudflare:workers';",'').replace('export class BrowserConsentStore','class BrowserConsentStore')+'\nthis.BrowserConsentStore=BrowserConsentStore;';
const context={DurableObject:class{},Date:{now:()=>1000000},console};
vm.runInNewContext(transformed,context);
function instance(){
 const records=new Map();
 const x=new context.BrowserConsentStore();
 x.ctx={storage:{get:async k=>records.get(k),put:async(k,v)=>records.set(k,v)}};
 return x;
}
test('five-day permission is explicit, scope-limited, expires, and revokes on server',async()=>{
 const s=instance();
 assert.equal((await s.status()).enabled,false);
 const approved=await s.enable();
 assert.equal(approved.expiresAt,1000000+5*24*60*60*1000);
 assert.equal((await s.status()).enabled,true);
 assert.equal(approved.scope.includes('wallet.write'),false);
 assert.equal(approved.scope.includes('github.write'),false);
 context.Date.now=()=>approved.expiresAt;
 assert.equal((await s.status()).enabled,false);
 context.Date.now=()=>1000001;
 await s.revoke();assert.equal((await s.status()).enabled,false);
});
test('browser-only grant cannot bypass owner verification and manual viewing continues',()=>{
 const code=readFileSync('workers/bubbles-cloud-browser/worker.mjs','utf8');
 const ui=readFileSync('bubbles-cloud-browser.mjs','utf8');
 assert.match(code,/browser_consent_required/);
 assert.match(code,/\['read','navigate','click','type','viewport'\]/);
 assert.match(code,/owner\(request,env\)/);
 assert.match(code,/return browserTool\(request,env\)/);
 assert.match(ui,/Allow browser assistant · 5 days/);
 assert.match(ui,/Revoke browser assistant access/);
 assert.doesNotMatch(ui,/localStorage\.setItem.*Authorization/);
});
