import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AccountConnections} from '../bubbles-connections.mjs';
const source=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
const view=readFileSync(new URL('../infinity-copilot-card.mjs',import.meta.url),'utf8');
test('Copilot source card mounts in-place, not a GitHub iframe or external website',()=>{
 assert.match(source,/if\(card\.id==='copilot'\)mountInfinityCopilotCard\(item\)/);
 assert.match(source,/if\(card\.id==='copilot'\)mountInfinityCopilotCard\(host\)/);
 assert.doesNotMatch(view,/<iframe|createElement\(['"]iframe|github\.com\/login\b/);
 assert.match(view,/preferPopup:true/);
 assert.match(view,/repository\.read/);
 assert.match(view,/review|GitPal/i);
});
test('GitHub card explicitly opens verified OAuth in popup instead of navigating current tab',async()=>{
 const state='p'.repeat(43),values=new Map(),popup={location:{},closed:false,close(){this.closed=true;}};
 let navigated=false,opened=0,body;
 const root={location:{pathname:'/',assign:()=>navigated=true},
  open:(...args)=>{opened++;assert.equal(args[0],'about:blank');return popup;},
  sessionStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},
  setTimeout:()=>1,clearTimeout(){},addEventListener(){},removeEventListener(){},document:{addEventListener(){},removeEventListener(){}}};
 const client=new AccountConnections({root,token:()=> 'wallet-session',request:async(url,options)=>{
  if(url.endsWith('/start')){
   body=JSON.parse(options.body);
   return Response.json({ok:true,authorizationUrl:'https://github.com/login/oauth/authorize?state='+state,expiresIn:300});
  }
  if(url.endsWith('/handoff/status'))return Response.json({ok:true,status:'pending'});
  throw Error('unexpected endpoint');
 }});
 await client.connect('github',['repository.read','repository.write'],()=>{},{preferPopup:true});
 assert.equal(opened,1);
 assert.equal(navigated,false);
 assert.equal(new URL(popup.location.href).hostname,'github.com');
 assert.deepEqual(body.actions,['repository.read','repository.write']);
 assert.equal(JSON.parse(values.get('bubbles:oauth-pending:v1')).flow,'popup');
 client.cancelConnect();assert.equal(popup.closed,true);
});
