import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('national 21+ directory card is registered once and loaded from homepage',()=>{
 const html=read('index.html'),deck=read('oracle-card-deck.js');
 assert.equal((html.match(/id="cannabisDirectoryCard"/g)||[]).length,1);
 assert.equal((deck.match(/\['cannabisDirectoryCard'/g)||[]).length,1);
 assert.match(html,/cannabis-directory-card\.mjs\?v=20261101-national1/);
 assert.match(html,/cannabis-directory-card\.css\?v=20261101-national1/);
});
test('store source requests happen only after a per-visit display acknowledgment',()=>{
 const js=read('cannabis-directory-card.mjs');
 assert.match(js,/let acknowledged=false/);
 assert.match(js,/if\(!acknowledged\|\|loading\)return/);
 assert.match(js,/enter\.addEventListener\('click',\(\)=>\{acknowledged=true/);
 assert.match(js,/X-Visitor-21-Acknowledged':'true'/);
 assert.match(js,/credentials:'omit',cache:'no-store'/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|walletBalance|SSN|birthdate/);
 assert.doesNotMatch(js,/oracle:activate/);
});
test('unrated, organic medical-only source UI contains no paid product creative',()=>{
 const js=read('cannabis-directory-card.mjs');
 assert.match(js,/row\.medical_only\?'MEDICAL PROGRAM ONLY/);
 assert.match(js,/Unrated · no independent customer-experience evidence reviewed/);
 assert.match(js,/x\.sponsored===false/);
 assert.match(js,/safeUrl\(row\.source_url\)/);
 assert.doesNotMatch(js,/image\.src|product_image|price\s*=|checkout|THC potency/);
});
test('mobile controls and reduced-motion handling are present',()=>{
 const css=read('cannabis-directory-card.css');
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});

test('21+ directory does not persist a view or click in Oracle telemetry',()=>{
 const deck=read('oracle-card-deck.js'),css=read('cannabis-directory-card.css');
 assert.match(deck,/function nonProfiling\(entry\)/);
 assert.match(deck,/if\(!nonProfiling\(entry\)\)void import/);
 assert.match(deck,/if\(!nonProfiling\(entry\)\)\{/);
 assert.match(deck,/if\(!active\|\|nonProfiling\(active\)/);
 assert.match(css,/\.oracle-card-deck-active:not\(\.oracle-shelf-open\) main\.app > #cannabisDirectoryCard\{display:none!important\}/);
 assert.doesNotMatch(read('cannabis-directory-card.mjs'),/setInterval\(/);
});
test('directory pagination retries, captures filters and reopens safely during pending requests',async()=>{
 class Node{
  constructor(tag='div'){this.tag=tag;this.children=[];this.listeners={};this.dataset={};this.hidden=false;this.value='';}
  append(...nodes){this.children.push(...nodes)}
  setAttribute(k,v){this[k]=v}
  removeAttribute(k){delete this[k]}
  addEventListener(k,fn){this.listeners[k]=fn}
  click(){this.listeners.click?.({preventDefault(){}})}
 }
 const root=new Node(),pending=[];
 const document={
  getElementById:id=>id==='cannabisDirectoryCard'?root:null,
  createElement:tag=>new Node(tag)
 };
 runInNewContext(read('cannabis-directory-card.mjs'),{
  document,URL,URLSearchParams,AbortSignal,encodeURIComponent,
  fetch:(url,opts)=>new Promise((resolve,reject)=>pending.push({url,opts,resolve,reject}))
 });
 const [,,,,gate,form,status,listing,nav,hide]=root.children;
 const [enter]=gate.children,[state,city,query,submit]=form.children;
 const [prev,count,next]=nav.children;
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const respond=(i,items,has_more=false,medical_only=false)=>pending[i].resolve({ok:true,json:async()=>({items,has_more,medical_only})});
 const item=(name)=>({name,address:'100 Main',city:'Denver',state:'CO',source_name:'Official source',source_url:'https://example.org/store',sponsored:false});
 enter.click();
 assert.equal(pending.length,1);
 respond(0,[item('A'),item('B')],true);
 await flush();
 state.value='IA';city.value='Des Moines';
 next.click();next.click();
 assert.equal(pending.length,2);
 const params1=new URL(pending[1].url,'https://example.org').searchParams;
 assert.equal(params1.get('state'),'CO');assert.equal(params1.get('page'),'1');
 pending[1].reject(new Error('network'));
 await flush();
 next.click();
 assert.equal(new URL(pending[2].url,'https://example.org').searchParams.get('page'),'1');
 respond(2,[item('C')],true);
 await flush();
 next.click(); // request page 2, then hide and reopen before it completes
 assert.equal(new URL(pending[3].url,'https://example.org').searchParams.get('page'),'2');
 hide.click();enter.click();
 assert.equal(pending.length,5);
 assert.equal(new URL(pending[4].url,'https://example.org').searchParams.get('state'),'IA');
 respond(3,[item('STALE')]);
 respond(4,[{...item('Iowa medical'),medical_only:true}],false,true);
 await flush();
 assert.equal(listing.children[1].textContent,'Iowa medical');
 assert.match(status.textContent,/IA.*Medical program only/);
 assert.equal(submit.disabled,false);
});
