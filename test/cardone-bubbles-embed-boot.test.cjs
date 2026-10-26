'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ai=fs.readFileSync('bubbles-ai.js','utf8');
const bubblePage=fs.readFileSync('bubbles.html','utf8');
const embed=fs.readFileSync('bubbles-embed.js','utf8');
const cardone=fs.readFileSync('cardone-capital.html','utf8');

test('embed mounts a real touch-scroll thread with Chat history above messages',()=>{
 assert.match(ai,/const chatScroll=create\('div','ba-thread'\)/);
 assert.match(ai,/if\(embedded\)\{\s*\/\/ Chats and messages share a dedicated touch-scrolling viewport\.[\s\S]*?panel\.insertBefore\(chatScroll,conversation\);\s*chatScroll\.append\(conversation\)/);
 assert.match(ai,/chatScroll\.insertBefore\(chatsPanel,conversation\)/);
 assert.doesNotMatch(ai,/chatScroll\.insertBefore\(chatsPanel,chatScroll\)/);
 assert.match(ai,/launcher\.addEventListener\('click'/);
 assert.match(ai,/window\.parent\.postMessage\(\{type:'quantaphi:bubbles:size'/);
});

test('named card chat keeps locally scoped history, resumes, and never auto-clears on reopen',()=>{
 assert.match(ai,/let keepChat=data\(KEEP_HISTORY,true\)===true/);
 assert.match(ai,/const embeddedResume=embedded&&keepChat/);
 assert.match(ai,/const THREAD_INDEX='quantaphi:bubbles:threads:v2'/);
 assert.match(ai,/if\(reopening&&!nativeOverlay&&!embedded\)void startConversation/);
 assert.match(ai,/clearChat\.textContent=embedded\?'New card chat'/);
 assert.match(ai,/chatScroll\.insertBefore\(chatsPanel,conversation\)/);
});

test('recognized speech cannot erase an in-progress typed message',()=>{
 assert.match(ai,/const clearSentComposer=\(\)=>\{if\(!fromVoice&&input\.value\.trim\(\)===spoken\)input\.value='';\}/);
 assert.match(ai,/display\(spoken,'you'\);clearSentComposer\(\)/);
 assert.match(ai,/requireWakeEveryTurn:embedded/);
 assert.match(ai,/if\(embedded\)\{toggle\(!showing\);return\}/);
});

test('Cardone iframe is the existing specialist assistant with versioned scripts',()=>{
 assert.match(cardone,/src="\/bubbles-embed\.js\?v=20261024-embed-shell3"/);
 assert.match(cardone,/data-bubble-id="cardone-westshore-research"/);
 assert.match(cardone,/data-bubble-role="specialist"/);
 assert.match(embed,/iframe\.src=ORIGIN\+'\/bubbles\.html\?'/);
 assert.match(embed,/quantaphi:bubbles:size/);
 assert.match(bubblePage,/bubbles-voice-gate\.js\?v=20261023-cardone-wake1/);
 assert.match(bubblePage,/bubbles-ai\\.js\\?v=[0-9A-Za-z._-]+/);
});

test('public specialist ignores background transcripts even within a conversation window',()=>{
 const sandbox={};sandbox.window=sandbox;
 vm.runInNewContext(fs.readFileSync('bubbles-voice-gate.js','utf8'),sandbox);
 const gate=sandbox.BubblesVoiceGate.create({name:'Real Estate Bubbles',followupMs:30000,requireWakeName:true,requireWakeEveryTurn:true});
 assert.equal(gate.accept('the television says invest now',1000).type,'ignore');
 assert.equal(gate.accept('Bubbles explain the risk',1200).type,'message');
 assert.equal(gate.accept('buy those shares immediately',1250).type,'ignore');
 assert.equal(gate.accept('Real Estate Bubbles what fees are involved',1400).type,'message');
 assert.equal(gate.accept('Bubbles stop listening',1500).type,'mute');
 assert.equal(gate.accept('ignore this voice from across the room',1550).type,'ignore');
 assert.equal(gate.accept('Bubbles what about the disclosures',1800).type,'message');
});


test('embedded orb canvas is transparent so the round launcher has no square backdrop',()=>{
 assert.match(bubblePage,/html\.bubble-iframe\{height:100%;min-height:0;background:transparent!important\}/);
 assert.match(bubblePage,/body\.bubbles-embedded\{background:transparent!important/);
});

test('Cardone questions use read-only issuer research rather than an internal search script',()=>{
 const start=ai.indexOf('const lookupPayload=()=>(cardoneResearch?{');
 const end=ai.indexOf('\n const prompt=',start);
 assert.ok(start>=0&&end>start);
 const question='What assumptions support the projected cashflow, and how are distributions funded?';
 const data=vm.runInNewContext(ai.slice(start,end)+'\nlookupPayload()',{
  cardoneResearch:true,lookupRequest:question,toolRequestId:'test-uuid'
 });
 assert.equal(data.tool,'web.search');
 assert.equal(data.mcp,false);
 assert.match(data.request,/Cardone Capital 10X Westshore South/);
 assert.match(data.researchContext,/original property-investment question/);
 assert.match(data.researchContext,/how are distributions funded/);
 assert.equal(Object.prototype.hasOwnProperty.call(data,'Authorization'),false);
 assert.match(ai,/cardoneReplyUnusable\(rawAnswer\)/);
 assert.match(ai,/cardoneSourceFallback\(request\)/);
});

function testCardoneChat(answer){
 const nodes=[],values=new Map(),calls=[];
 const make=tag=>{
  const e={tag,children:[],dataset:{},style:{setProperty(){}},hidden:false,handlers:{},value:'',
   prepend(...items){this.children.unshift(...items)},before(){},
   append(...items){this.children.push(...items)},
   insertBefore(item,before){const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,item)},
   setAttribute(){},addEventListener(type,handler){this.handlers[type]=handler},focus(){},
   replaceChildren(...items){this.children=items},removeAttribute(){},select(){}};
  nodes.push(e);return e;
 };
 const host=make('div'),document={createElement:make,getElementById:id=>id==='bubblesAICard'?host:null};
 document.body=make('body');document.head=make('head');
 const window={parent:{postMessage(){}},addEventListener(){},innerHeight:780};
 const localStorage={getItem:key=>values.get(key)||null,setItem:(key,v)=>values.set(key,v),removeItem:key=>values.delete(key)};
 const fetch=async(url,opts)=>{calls.push({url,data:JSON.parse(opts.body)});return{ok:true,json:async()=>answer}};
 vm.runInNewContext(ai,{
  document,window,localStorage,URLSearchParams,fetch,AbortController,
  location:{search:'?embed=1&id=cardone-westshore-research&role=specialist&name=Real%20Estate%20Bubbles',origin:'https://quantaphi.org',pathname:'/bubbles.html'},
  crypto:{randomUUID:()=>'cardone-uuid'},navigator:{},setTimeout:()=>1,clearTimeout:()=>{}
 },{timeout:3000});
 return {nodes,values,calls};
}
const settle=async()=>{for(let i=0;i<35;i++)await new Promise(resolve=>setImmediate(resolve))};
test('unfinished tool-script reply becomes useful sourced answer in retained Cardone history',async()=>{
 const h=testCardoneChat({ok:true,output:'I will type search then invoke tool_name: web_search to find the underwriting.',receipt:{tool:'web.search',status:'complete'}});
 const input=h.nodes.find(n=>n.tag==='textarea'&&n.placeholder?.startsWith('Say something'));
 assert.ok(input);
 input.value='What assumptions support the projected cashflow, and how are distributions funded?';
 h.nodes.find(n=>n.className==='ba-composer').handlers.submit({preventDefault(){}});
 await settle();
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].data.tool,'web.search');
 const history=JSON.parse(h.values.get('quantaphi:bubbles:history:v1:cardone-westshore-research'));
 assert.ok(history.some(m=>m.role==='assistant'&&m.text.includes('5% cashflow')));
 assert.ok(history.some(m=>m.role==='assistant'&&m.text.includes('https://invest.cardonecapital.com/')));
 assert.ok(!history.some(m=>m.text.includes('invoke tool_name')));
});
test('valid researched Cardone response is preserved without replacing it with a canned answer',async()=>{
 const h=testCardoneChat({ok:true,output:'Verified issuer excerpts describe a targeted yield rather than a guaranteed payout; the offering documents determine actual distributions.',receipt:{tool:'web.search',status:'complete'},sources:[]});
 const input=h.nodes.find(n=>n.tag==='textarea'&&n.placeholder?.startsWith('Say something'));
 input.value='Explain occupancy and rent assumptions at Westshore';
 h.nodes.find(n=>n.className==='ba-composer').handlers.submit({preventDefault(){}});
 await settle();
 const history=JSON.parse(h.values.get('quantaphi:bubbles:history:v1:cardone-westshore-research'));
 assert.ok(history.some(m=>m.role==='assistant'&&m.text.startsWith('Verified issuer excerpts')));
});

test('closed Cardone bubble cannot expose iframe footer wording or a square document',()=>{
 assert.match(embed,/const orb=document\.createElement\('button'\)/);
 assert.match(embed,/iframe\.style\.setProperty\('display','none','important'\)/);
 assert.match(embed,/iframe\.style\.setProperty\('display',expanded\?'block':'none','important'\)/);
 assert.match(embed,/const bubble=document\.createElement\('span'\)/);
 assert.match(embed,/iframe\.contentWindow\?\.postMessage\(\{type:'quantaphi:bubbles:open',id\},ORIGIN\)/);
 assert.match(bubblePage,/html\.bubble-iframe body > :not\(\.ba-launcher\):not\(\.ba-panel\)\{display:none!important\}/);
 assert.match(bubblePage,/html\.bubble-iframe \.ba-launcher\[aria-expanded="true"\]\{display:none!important\}/);
 assert.match(ai,/if\(embedded\)window\.addEventListener\('message',event=>/);
 assert.match(ai,/event\.source!==window\.parent/);
 assert.match(ai,/event\.data\.id!==bubbleId/);
});
