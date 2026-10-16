'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=pathName=>fs.readFileSync(path.join(__dirname,'..',pathName),'utf8');

test('QuantaPhi mounts Bubbles beside Media Star and loads all versioned assets',()=>{
 const html=source('index.html');
 const order=['/phi-story-writer.js?','/bubbles-ai.js?'].map(k=>html.indexOf(k));
 assert.ok(order.every(i=>i>0),'Both scripts load');
 assert.ok(order[0]<order[1]);
 assert.ok(html.includes('/bubbles-ai.css?'));
 assert.ok(html.includes('/phi-story-writer.css?'));
 assert.match(html,/id="bubblesAICard"/);
 assert.ok(html.indexOf('id="mediaStarCreator"')<html.indexOf('id="bubblesAICard"'));
 assert.ok(html.includes('href="#bubblesAICard"'));
});

test('image-to-story flow inspects real picture bytes; no filename-based story guessing',()=>{
 const writer=source('phi-story-writer.js'),adapter=source('phi-visual-render.js'),css=source('phi-story-writer.css');
 assert.doesNotThrow(()=>new vm.Script(writer));
 assert.match(writer,/upload\.accept='image\/jpeg,image\/png,image\/webp'/);
 assert.match(writer,/MAX_SOURCE_BYTES=10\*1024\*1024/);
 assert.match(writer,/const sourceFile=\$\('#sw-source-image'\)\.files\?\.\[0\]\|\|null/);
 assert.match(writer,/await prepareSource\(sourceFile\)/);
 assert.match(writer,/window\.PhiVisualRender\.inspect\(prepared\)/);
 assert.match(writer,/visualEvidence\.length<25/);
 assert.match(writer,/visualEvidence\?'This source image/);
 assert.match(writer,/await picture\('source:'\+id,prepared\)/);
 assert.match(writer,/showOriginal\(id\)/);
 assert.match(writer,/void illustrate\(active\)/);
 assert.match(adapter,/async function inspect\(file\)/);
 assert.match(adapter,/jsonResponse\('\/v1\/image-read'/);
 assert.match(css,/\.sw-source-preview/);
 assert.doesNotMatch(writer,/Image name: '\+sourceFile\.name/);
});

test('Bubbles has real AI chat and opt-in browser speech rather than simulated replies',()=>{
 const code=source('bubbles-ai.js'),css=source('bubbles-ai.css');
 assert.doesNotThrow(()=>new vm.Script(code));
 assert.match(code,/\/v1\/chat/);
 assert.match(code,/await fetch\(AI/);
 assert.match(code,/if\(!response\.ok\|\|json\.ok===false\)throw/);
 assert.match(code,/navigator\.mediaDevices\.getUserMedia/);
 assert.match(code,/module\.startContinuousVoice/);
 assert.match(code,/onTranscript:heardTranscript/);
 assert.match(code,/new SpeechSynthesisUtterance/);
 assert.match(code,/if\(config\.voice/);
 assert.match(code,/config\.role/);
 assert.match(code,/localStorage\.setItem/);
 assert.match(css,/position:fixed/);
 assert.match(css,/\.ba-messages/);
});

test('Bubbles never impersonates account sign-in or grants unverified repository rights',()=>{
 const code=source('bubbles-ai.js');
 assert.match(code,/Official website ChatGPT sign-in requires partner registration/);
 assert.match(code,/Only real tool receipts prove repository creation, code writes, Actions, tests, merges or deployment/);
 assert.match(code,/const headers=window\.QuantaBrainOwner\?await window\.QuantaBrainOwner\.ready:null/);
 assert.match(code,/if\(!headers\?\.Authorization\)return/);
 assert.match(code,/if\(embedded\)throw Error\('Guest embed bubbles cannot access the owner Robot Brain\.'\)/);
 assert.match(code,/ownerHeaders=headers;ownerReady=true;workButton\.hidden=nativeOverlay/);
 assert.match(code,/workButton\.addEventListener\('click'/);
 assert.match(code,/context:\{kind:'robot-directions'/);
 assert.match(code,/approval='explicit-click'/);
 assert.match(code,/No confirmed ticket/);
 assert.match(code,/Only real tool receipts prove repository creation/);
 assert.doesNotMatch(code,/github\.com\/login\/oauth\/authorize\?/);
 assert.doesNotMatch(code,/https:\/\/api\.github\.com\/repos\/.*\/contents/);
 assert.doesNotMatch(code,/ANTHROPIC_API_KEY|OPENAI_API_KEY|ghp_/);
});

test('existing StarCoin ledger and no-refresh artwork behavior are untouched by new features',()=>{
 const writer=source('phi-story-writer.js'),bubbles=source('bubbles-ai.js');
 assert.match(writer,/window\.QuantaStarCredit\?\.\('star'/);
 assert.match(writer,/window\.QuantaStarCredit\?\.\('collect'/);
 assert.match(writer,/window\.QuantaStarCredit\?\.\('share'/);
 assert.doesNotMatch(bubbles,/QuantaStarCredit|mintQuant|mintToken/);
});


test('published Bubbles embed stays inside a checked-origin floating frame',()=>{
 const code=source('bubbles-embed.js');
 const html=source('bubbles.html');
 const css=source('bubbles-ai.css');
 assert.doesNotThrow(()=>new vm.Script(code));
 assert.match(html,/id="bubblesAICard"/);
 assert.match(html,/bubbles-ai\.js\?v=/);
 assert.match(html,/body\.bubbles-embedded \.ba-launcher/);
 assert.match(css,/\.ba-panel/);
 const events=new Map();
 const child={};
 const iframe={style:{},dataset:{},contentWindow:child,addEventListener:(event,fn)=>events.set('iframe:'+event,fn),setAttribute(){}};
 let appended=null;
 let listener=null;
 const document={
  currentScript:{dataset:{bubbleRole:'singer',bubbleId:'my_page',bubbleName:'Choir helper',bubbleInstructions:'Original singing exercises'}},
  createElement:type=>{assert.equal(type,'iframe');return iframe},
  body:{appendChild:value=>{appended=value}}
 };
 const window={addEventListener:(event,fn)=>{if(event==='message')listener=fn}};
 vm.runInNewContext(code,{document,window,URLSearchParams,Set});
 assert.equal(appended,iframe);
 const url=new URL(iframe.src);
 assert.equal(url.origin,'https://quantaphi.org');
 assert.equal(url.pathname,'/bubbles.html');
 assert.equal(url.searchParams.get('role'),'singer');
 assert.equal(url.searchParams.get('id'),'my_page');
 assert.equal(url.searchParams.get('name'),'Choir helper');
 assert.equal(url.searchParams.get('instructions'),'Original singing exercises');
 assert.equal(iframe.style.width,undefined);
 listener({origin:'https://evil.example',source:child,data:{type:'quantaphi:bubbles:size',open:true}});
 assert.equal(iframe.style.width,undefined,'cross-origin frames may not expand');
 listener({origin:'https://quantaphi.org',source:{},data:{type:'quantaphi:bubbles:size',open:true}});
 assert.equal(iframe.style.width,undefined,'unrelated frames may not expand');
 listener({origin:'https://quantaphi.org',source:child,data:{type:'quantaphi:bubbles:size',open:true}});
 assert.match(iframe.style.width,/min\(425px/);
 listener({origin:'https://quantaphi.org',source:child,data:{type:'quantaphi:bubbles:size',open:false}});
 assert.equal(iframe.style.width,'70px');
});

test('multiple Bubbles embeds isolate notes and never inherit owner authorization',()=>{
 const code=source('bubbles-ai.js');
 assert.match(code,/const bubbleId=embedded/);
 assert.match(code,/const NOTES='quantaphi:bubbles:notes:v1'\+\(bubbleId\?':'\+bubbleId:''\)/);
 assert.match(code,/const CONFIG='quantaphi:bubbles:config:v1'\+\(bubbleId\?':'\+bubbleId:''\)/);
 assert.match(code,/async function connectOwner\(\)\{\s*if\(embedded\)return/);
 assert.match(code,/if\(embedded\)throw Error\('Guest embed bubbles cannot access the owner Robot Brain\.'\)/);
 assert.match(code,/window\.parent\.postMessage\(\{type:'quantaphi:bubbles:size',open:showing\},'\*'\)/);
 assert.match(code,/const markup='<script async src="https:\/\/quantaphi\.org\/bubbles-embed\.js"/);
 assert.match(code,/function xmlAttr\(value\)/);
 assert.match(code,/await navigator\.clipboard\.writeText\(markup\)/);
 assert.match(code,/Never put passwords, API keys or private notes/);
 assert.doesNotMatch(source('bubbles-embed.js'),/localStorage|document\.cookie|Authorization:|owner_token/);
});


test('embedded Bubbles programming persists user-chosen role instead of overwriting it on reload',()=>{
 const code=source('bubbles-ai.js');
 function execute(map){
  const nodes=[];
  const make=tag=>{
   const e={tag,children:[],dataset:{},style:{},hidden:false,handlers:{},value:'',
    append(...items){for(const item of items){this.children.push(item);item.parent=this}},
    insertBefore(item,before){const at=this.children.indexOf(before);this.children.splice(at<0?this.children.length:at,0,item);item.parent=this},
    setAttribute(){},addEventListener(type,callback){this.handlers[type]=callback},focus(){},
    replaceChildren(...items){this.children=items},removeAttribute(){},select(){}};
   nodes.push(e);return e;
  };
  const host=make('host'),body=make('body'),parentMessages=[];
  const document={getElementById:id=>id==='bubblesAICard'?host:null,createElement:make,body};
  const window={parent:{postMessage:msg=>parentMessages.push(msg)}};
  const localStorage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
  const context={document,window,localStorage,location:{search:'?embed=1&id=alice&role=singer&name=Songbird',origin:'https://quantaphi.org',pathname:'/bubbles.html'},URLSearchParams,crypto:{randomUUID:()=> 'test-note-id'},navigator:{},setTimeout:fn=>fn()};
  vm.runInNewContext(code,context,{timeout:1500});
  return{nodes,host,body,parentMessages};
 }
 const storage=new Map();
 const a=execute(storage);
 const node=(nodes,tag,text)=>nodes.find(x=>x.tag===tag&&(!text||x.textContent===text));
 const programmer=a.nodes.find(x=>x.className==='ba-program');
 assert.ok(programmer,'embedded role editor must be inside visible chat panel');
 const settings=a.nodes.find(x=>x.className==='ba-settings');
 assert.equal(settings.parent,programmer);
 const role=a.nodes.find(x=>x.id==='ba-role'),alias=a.nodes.find(x=>x.id==='ba-alias');
 assert.equal(role.value,'singer');
 role.value='specialist';alias.value='Expert visitor';
 const saveButton=node(a.nodes,'button','Save bubble role');
 saveButton.handlers.click();
 const saved=JSON.parse(storage.get('quantaphi:bubbles:config:v1:alice'));
 assert.equal(saved.role,'specialist');
 assert.equal(saved.alias,'Expert visitor');
 const b=execute(storage);
 assert.equal(b.nodes.find(x=>x.id==='ba-role').value,'specialist','previous user choice must override the embed URL default');
 assert.equal(b.nodes.find(x=>x.id==='ba-alias').value,'Expert visitor');
 assert.equal(b.nodes.some(x=>x.textContent==='Send approved request to Robot Brain'&&x.hidden===false),false,'external iframe has no owner controls');
});

test('reply actions take notes and prepare work without sending unapproved robot tickets',async()=>{
 const code=source('bubbles-ai.js'),nodes=[],values=new Map(),calls=[];
 const make=tag=>{
  const e={tag,children:[],dataset:{},style:{},hidden:false,handlers:{},value:'',
   append(...items){this.children.push(...items)},insertBefore(item,before){this.children.splice(this.children.indexOf(before),0,item)},
   setAttribute(){},addEventListener(type,fn){this.handlers[type]=fn},focus(){},replaceChildren(...items){this.children=items},removeAttribute(){},select(){}};
  nodes.push(e);return e;
 };
 const document={createElement:make,getElementById:id=>id==='bubblesAICard'?host:null};
 const host=make('div');document.body=make('body');
 const window={parent:{postMessage(){}},SpeechRecognition:null,webkitSpeechRecognition:null};
 const localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const fetch=async(url)=>{
  calls.push(url);
  return{ok:true,json:async()=>({ok:true,output:'Here is a practical plan to update the README and run tests.'})};
 };
 vm.runInNewContext(code,{document,window,localStorage,URLSearchParams,
  location:{search:'?embed=1&id=work-cards&role=github',origin:'https://quantaphi.org',pathname:'/bubbles.html'},
  crypto:{randomUUID:()=>'saved-note'},navigator:{},fetch,AbortController,setTimeout:()=>1,clearTimeout:()=>{}},{timeout:1500});
 const get=(tag,txt)=>nodes.find(e=>e.tag===tag&&e.textContent===txt);
 const chatInput=nodes.find(e=>e.tag==='textarea'&&e.placeholder?.startsWith('Say something'));
 assert.ok(chatInput);
 chatInput.value='Draft a repository update';
 nodes.find(e=>e.className==='ba-composer').handlers.submit({preventDefault(){}});
 for(let tick=0;tick<3;tick++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calls.length,1,'only the approved AI chat endpoint is called');
 const noteAction=nodes.find(e=>e.tag==='button'&&e.className==='ba-miniaction'&&e.textContent==='Save note');
 assert.ok(noteAction,'assistant reply has a note action');
 noteAction.handlers.click();
 assert.ok(values.has('quantaphi:bubbles:notes:v1:work-cards'),'assistant reply note was saved');
 const notes=JSON.parse(values.get('quantaphi:bubbles:notes:v1:work-cards'));
 assert.equal(notes[0].text,'Here is a practical plan to update the README and run tests.');
 const draft=get('button','Make work draft');
 draft.handlers.click();
 const work=nodes.find(e=>e.tag==='textarea'&&e.placeholder?.startsWith('Say fix a card'));
 assert.equal(work.value,notes[0].text);
 const submit=get('button','Send approved request to Robot Brain');
 assert.equal(submit.hidden,true);
 assert.equal(calls.length,1,'copying a work draft does not submit it');
 const saveHistory=nodes.find(e=>e.tag==='input'&&e.type==='checkbox'&&e.handlers.change?.toString().includes('keepChat'));
 assert.ok(saveHistory);
 saveHistory.checked=true;saveHistory.handlers.change();
 const history=JSON.parse(values.get('quantaphi:bubbles:history:v1:work-cards'));
 assert.equal(history.length,2);
 assert.equal(history[0].role,'user');
 get('button','Clear this view').handlers.click();
 assert.equal(values.has('quantaphi:bubbles:history:v1:work-cards'),false);
 assert.ok(values.has('quantaphi:bubbles:notes:v1:work-cards'),'clearing chat never destroys notes');
});

test('Vertigo Macro Zoom maps actual controls without fake permission or local notes resurrection',()=>{
 const js=source('bubbles-ai.js'),css=source('bubbles-ai.css');
 assert.match(js,/DJ Vertigo · Macro Zoom/);
 assert.match(js,/settingsMap=\[/);
 assert.match(js,/locate\(\)/);
 assert.match(js,/Switch the main Bubbles role/);
 assert.match(js,/notes=\[\];renderNotes\(\)/);
 assert.match(js,/window\.confirm\('Delete only the device-local Bubbles notes/);
 assert.doesNotMatch(js,/Android settings successfully changed|phone storage cleared/);
 assert.match(css,/\.ba-macro-role/);
});
