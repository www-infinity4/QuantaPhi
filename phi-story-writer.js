/* Story Writer: original user-directed fiction + automatic Phi image illustration.
   Text drafts are browser-local; image blobs are stored in IndexedDB.
   No StarCoin is credited until a real action is recorded by the existing payout ledger. */
(function(){
'use strict';
const root=document.getElementById('phiStoryWriter');if(!root)return;
const KEY='quantaPhi:storyWriter:drafts:v1',COLLECT='quantaPhiCollected',STARS='quantaPhi:storyWriter:stars:v1';
const AI='https://infinity-rogers.marvaseater.workers.dev/v1/chat';
const $=s=>root.querySelector(s);
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
let stories=read(KEY,[]);if(!Array.isArray(stories))stories=[];
let active=null,busy=false,artUrl='',artBusy=false;
function ui(){
 root.innerHTML='';
 const form=make('section','sw-card sw-create');
 form.append(make('div','sw-eyebrow','ORACLE OCTAVES · CREATIVE STUDIO'),make('h2','','Story Writer'),make('p','sw-copy','Give GPT an opening idea, keywords, or a whole scene. Write an original story and automatically illustrate it.'));
 const idea=make('textarea','sw-field');idea.id='sw-idea';idea.rows=4;idea.maxLength=3000;idea.placeholder='Example: An old lighthouse begins sending signals from a century in the future…';idea.setAttribute('aria-label','Story opening or description');
 const keys=make('input','sw-field');keys.id='sw-keys';keys.maxLength=500;keys.placeholder='Keywords: fog, time, secrets, ocean';keys.setAttribute('aria-label','Story keywords');
 const options=make('div','sw-options');
 const type=make('select','sw-field');type.id='sw-genre';type.setAttribute('aria-label','Story genre');
 for(const name of ['Mystery','Adventure','Science fiction','Ghost story','Fantasy','Historical fiction','Comedy','Drama','Anything goes']){const o=make('option','',name);o.value=name;type.append(o)}
 const length=make('select','sw-field');length.id='sw-length';length.setAttribute('aria-label','Story length');
 for(const [value,label] of [['500','Short story'],['900','Full story'],['1500','Long story']]){const o=make('option','',label);o.value=value;length.append(o)}
 options.append(type,length);
 const go=make('button','sw-primary','Write story + create image');go.type='button';go.id='sw-write';
 const notice=make('p','sw-notice','');notice.id='sw-notice';notice.setAttribute('role','status');
 form.append(make('label','sw-label','Describe your story'),idea,make('label','sw-label','Keywords (optional)'),keys,options,go,notice);
 const section=make('section','sw-card sw-output');section.id='sw-output';section.hidden=true;
 const header=make('div','sw-result-head');header.append(make('span','sw-eyebrow','YOUR ORIGINAL STORY'),make('h3','sw-title',''));
 const art=make('img','sw-art');art.id='sw-art';art.alt='AI illustration of the story';art.hidden=true;
 const artStatus=make('p','sw-art-status','');artStatus.id='sw-art-status';
 const body=make('div','sw-story');body.id='sw-body';
 const controls=make('div','sw-actions');
 for(const [id,label]of [['sw-star','☆ Star +0.1 ★'],['sw-collect','Collect +0.1 ★'],['sw-share','Share +0.1 ★'],['sw-copy-story','Copy story'],['sw-fix','Fix illustration'],['sw-retry-image','Retry image']]){
   const b=make('button','',''+label);b.type='button';b.id=id;controls.append(b);
 }
 const rewardStatus=make('p','sw-reward-status','A verified Star, Collect, or Share submits a separate +0.1 StarCoin receipt.');rewardStatus.id='sw-reward-status';rewardStatus.setAttribute('role','status');
 const history=make('section','sw-card sw-history');history.append(make('strong','','Your saved drafts'));
 const picker=make('select','sw-field');picker.id='sw-history';picker.setAttribute('aria-label','Open a saved Story Writer draft');
 history.append(picker,make('p','sw-muted','Drafts and illustrations are saved on this device. Cloud backup is not connected.'));
 section.append(header,art,artStatus,body,controls,rewardStatus);
 root.append(form,section,history);
 $('#sw-write').addEventListener('click',()=>void writeStory());
 $('#sw-star').addEventListener('click',star);
 $('#sw-collect').addEventListener('click',collect);
 $('#sw-share').addEventListener('click',()=>void share());
 $('#sw-copy-story').addEventListener('click',()=>void copy());
 $('#sw-fix').addEventListener('click',()=>void fix());
 $('#sw-retry-image').addEventListener('click',()=>void illustrate(active));
 picker.addEventListener('change',()=>{active=stories.find(x=>x.id===picker.value)||null;renderStory();});
 historyList();
}
function note(message){$('#sw-notice').textContent=message;const status=$('#sw-reward-status');if(status)status.textContent=message}
function historyList(){
 const picker=$('#sw-history');picker.replaceChildren();
 const empty=make('option','','Choose a draft to reopen');empty.value='';picker.append(empty);
 for(const s of stories){const o=make('option','',s.title||'Untitled');o.value=s.id;picker.append(o)}
 if(active)picker.value=active.id;
}
function saveStory(story){
 stories=[story,...stories.filter(x=>x.id!==story.id)].slice(0,25);
 if(!store(KEY,stories))note('Draft is visible but browser storage is full. Copy the text to keep it.');
 historyList();
}
function formatTitle(raw,idea){
 return String(raw||idea.split(/[.!?]/)[0]||'Untitled story').replace(/^#+\s*/,'').replace(/^title\s*:/i,'').replace(/["*]/g,'').trim().slice(0,130)||'Untitled story';
}
function takeText(data){
 let value=data?.output_text??data?.output??data?.answer??data?.response??data?.content??data?.message??data?.choices?.[0]?.message?.content??'';
 if(Array.isArray(value))value=value.map(x=>x?.text||x?.content||'').join('\n');
 if(value&&typeof value==='object')value=value.text||value.content||'';
 return String(value||'').trim();
}
function parseStory(raw,idea){
 let text=String(raw||'').replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'').trim(),value;
 try{value=JSON.parse(text)}catch{const p=text.indexOf('{'),end=text.lastIndexOf('}');if(p>=0&&end>p)try{value=JSON.parse(text.slice(p,end+1))}catch{}}
 if(value&&typeof value==='object'){
  const body=String(value.story||value.body||value.full||value.text||'').trim();
  return {title:formatTitle(value.title,idea),body,scene:String(value.illustration||value.imagePrompt||value.scene||'').slice(0,1300)};
 }
 const first=text.split('\n').find(x=>x.trim())||'';
 const title=/^(?:title\s*:\s*|#\s*)(.+)$/i.exec(first)?.[1]||formatTitle('',idea);
 text=text.replace(/^(?:title\s*:.+|#\s+.+)\n?/i,'').replace(/^story\s*:/i,'').trim();
 return{title:formatTitle(title,idea),body:text,scene:''};
}
function db(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB)return reject(Error('Image storage is unavailable'));
  const req=indexedDB.open('phi-story-writer-images-v1',1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('images'))req.result.createObjectStore('images',{keyPath:'id'})};
  req.onerror=()=>reject(req.error||Error('Cannot open illustration storage'));
  req.onsuccess=()=>resolve(req.result);
 });
}
async function picture(id,blob){
 const database=await db();
 try{return await new Promise((resolve,reject)=>{
  const tx=database.transaction('images','readwrite');tx.objectStore('images').put({id,blob});
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('Image save failed'));
 })}finally{database.close()}
}
async function getPicture(id){
 const database=await db();
 try{return await new Promise((resolve,reject)=>{
  const tx=database.transaction('images','readonly');const req=tx.objectStore('images').get(id);
  req.onsuccess=()=>resolve(req.result?.blob||null);req.onerror=()=>reject(req.error||Error('Image read failed'));
 })}finally{database.close()}
}
function showArt(blob){
 if(artUrl){URL.revokeObjectURL(artUrl);artUrl=''}
 const img=$('#sw-art');
 if(blob){artUrl=URL.createObjectURL(blob);img.src=artUrl;img.hidden=false}
 else{img.removeAttribute('src');img.hidden=true}
}
function renderStory(){
 const section=$('#sw-output');section.hidden=!active;if(!active){showArt(null);return}
 $('.sw-title').textContent=active.title;const body=$('#sw-body');body.replaceChildren();
 for(const paragraph of active.body.split(/\n\s*\n/).filter(Boolean)){body.append(make('p','',paragraph))}
 $('#sw-collect').textContent=read(COLLECT,[]).some(x=>x.key==='story-writer|'+active.id)?'Collected ✓':'Collect +0.1 ★';
 $('#sw-star').textContent=read(STARS,[]).includes(active.id)?'★ Starred':'☆ Star +0.1 ★';
 $('#sw-art-status').textContent=active.imageStatus||'Illustration will appear here when the renderer finishes.';
 showArt(null);const id=active.id;
 getPicture(id).then(blob=>{if(active?.id===id&&blob)showArt(blob)}).catch(()=>{});
 historyList();
}
async function writeStory(){
 if(busy||artBusy)return;
 const idea=$('#sw-idea').value.trim(),keys=$('#sw-keys').value.trim(),genre=$('#sw-genre').value,words=Number($('#sw-length').value)||900;
 if(!idea&&!keys){note('Start with an idea or at least one keyword.');return}
 const id=(crypto.randomUUID?.()||Date.now().toString(36)),prompt=[
 'You are the Story Writer in QuantaPhi. Write a completely original, polished fictional story driven by the user.',
 'Produce a surprising opening, vividly different characters, scenes that advance the plot, a meaningful reveal, and a satisfying ending. Avoid generic summaries, repetition, filler or disclaimers.',
 'Treat these as FICTION; do not pretend invented details are verified facts.',
 'Return ONLY valid JSON with keys "title", "story", "illustration". The story value must contain fully written prose with paragraphs separated by two newline characters.',
 'The illustration value describes ONE striking scene from this exact story, with composition, lighting, period details, subject and atmosphere. Do not include words or titles in the painted image.',
 'Genre: '+genre,'Length target: '+words+' words','Opening idea: '+idea,'Keywords: '+keys,
 'Write now.'
 ].join('\n');
 busy=true;$('#sw-write').disabled=true;note('GPT is writing your original story…');
 try{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),65000);
  let response;try{response=await fetch(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'oracle-story-writer',requireCloudflare:true}}),signal:controller.signal})}finally{clearTimeout(timeout)}
  const data=await response.json().catch(()=>({}));if(!response.ok||data.ok===false)throw Error(String(data.error||'GPT did not return a completed story'));
  const parsed=parseStory(takeText(data),idea||keys);
  if(parsed.body.length<250)throw Error('GPT returned an incomplete story. Please try Write Story again.');
  active={id,title:parsed.title,body:parsed.body,scene:parsed.scene,idea,keywords:keys,genre,createdAt:new Date().toISOString(),imageStatus:'Preparing your illustration…'};
  saveStory(active);renderStory();note('Story written and saved on this device. Creating its image…');
  void illustrate(active);
 }catch(error){note('Story writing could not finish: '+String(error?.message||error).slice(0,180))}
 finally{busy=false;$('#sw-write').disabled=false}
}
async function illustrate(story){
 if(!story||artBusy)return;
 const builder=window.PhiImageBuilder;
 if(typeof builder?.generateFromStory!=='function'){$('#sw-art-status').textContent='Image Builder is not connected. Your story was saved.';return}
 artBusy=true;const storyId=story.id;
 const scene=story.scene||'A dramatic key moment from the original fiction: '+story.title+'. '+story.body.slice(0,650);
 const direction=['Illustrate ONE cinematic story scene with no lettering, logos, fake symbols or captions.',scene,'Genre: '+story.genre,'Main context: '+story.idea,'Create an atmospheric, original cover-worthy image, without written words.'].join('\n').slice(0,2800);
 $('#sw-art-status').textContent='Oracle image renderer is creating the illustration…';
 $('#sw-retry-image').disabled=true;$('#sw-fix').disabled=true;
 try{
  const rendered=await builder.generateFromStory(storyId,direction);
  if(!rendered?.result)throw Error('No finished image returned');
  const blob=await window.PhiVisualRender.asBlob(rendered.result);await picture(storyId,blob);
  const found=stories.find(x=>x.id===storyId);if(found){found.imageStatus='Illustration generated and saved on this device.';saveStory(found)}
  if(active?.id===storyId){showArt(blob);$('#sw-art-status').textContent='Illustration generated and saved on this device.'}
 }catch(error){
  const message='Illustration unavailable: '+String(error?.message||error).slice(0,150)+'. Your story is still saved. Retry image when ready.';
  const found=stories.find(x=>x.id===storyId);if(found){found.imageStatus=message;saveStory(found)}
  if(active?.id===storyId)$('#sw-art-status').textContent=message;
 }finally{artBusy=false;$('#sw-retry-image').disabled=false;$('#sw-fix').disabled=false}
}
function creditStatus(result,action){return result?.pending?' '+action+' receipt saved; +0.1 StarCoin awaits ledger confirmation.':result?.awarded?' '+action+' confirmed by ledger.':' '+action+' could not be saved for payout; please check your wallet connection.'}
function star(){
 if(!active)return;
 const selected=read(STARS,[]);if(!Array.isArray(selected))return;
 if(selected.includes(active.id)){
   const card={key:'story-writer|'+active.id,type:'Fantasy',title:active.title,story:active.body.slice(0,4000),keywords:active.keywords,genre:active.genre};
   const receipt=window.QuantaStarCredit?.('star','story-writer|'+active.id,card);
   note('Already starred; retried the original idempotent receipt.'+creditStatus(receipt,'Star'));return
 }
 if(!store(STARS,[...selected,active.id].slice(-1000))){note('Could not save the Star preference; no payout submitted.');return}
 $('#sw-star').textContent='★ Starred';
 const card={key:'story-writer|'+active.id,type:'Fantasy',title:active.title,story:active.body.slice(0,4000),keywords:active.keywords,genre:active.genre};
 let result;try{result=window.QuantaStarCredit?.('star','story-writer|'+active.id,card)}catch(error){console.warn('Story Writer Star reward deferred',error)}
 note('Story starred.'+creditStatus(result,'Star'));
}
function collect(){
 if(!active)return;
 const all=read(COLLECT,[]);if(!Array.isArray(all))return;
 const key='story-writer|'+active.id;
 if(all.some(x=>x.key===key)){
   const existing=all.find(x=>x.key===key),receipt=window.QuantaStarCredit?.('collect',key,existing);
   note('Already collected; retried the original idempotent receipt.'+creditStatus(receipt,'Collect'));return
 }
 const item={key,type:'Story',title:active.title,story:active.body,media:'',sourceUrl:'',createdAt:active.createdAt,collectedAt:new Date().toISOString(),generator:'story-writer',keywords:active.keywords};
 if(!store(COLLECT,[...all,item].slice(-1000))){note('Collection storage is full. Copy your story to preserve it.');return}
 $('#sw-collect').textContent='Collected ✓';
 let reward;try{reward=window.QuantaStarCredit?.('collect',key,item)}catch(e){console.warn('Story Writer credit remains pending',e)}
 window.dispatchEvent(new CustomEvent('quantaphi:collected',{detail:item}));
 note('Collected to My Storybook.'+creditStatus(reward,'Collect'))
}
async function share(){
 if(!active)return;
 const teaser=active.body.replace(/\s+/g,' ').slice(0,160).trim()+'…';
 const u=new URL('/',location.origin);u.searchParams.set('q',[active.title,active.keywords].filter(Boolean).join(' ').slice(0,210));u.hash='phiStoryWriter';
 const data={title:active.title,text:teaser,url:u.href};
 try{
  if(navigator.share)await navigator.share(data);
  else if(navigator.clipboard)await navigator.clipboard.writeText(teaser+' '+u.href);
  else throw Error('Sharing not supported on this device');
  const reward=window.QuantaStarCredit?.('share','story-writer:'+active.id+':'+Date.now(),{key:'story-writer|'+active.id,title:active.title,story:teaser,type:'Fantasy'});
  note('Shared short teaser.'+creditStatus(reward,'Share'))
 }catch(error){note(error?.name==='AbortError'?'Share canceled; no credit submitted.':'Could not share: '+String(error?.message||error))}
}
async function copy(){
 if(!active)return;
 try{await navigator.clipboard.writeText(active.title+'\n\n'+active.body);note('Story copied.')}catch{note('Copy was unavailable; select the text to copy it.')}
}
async function fix(){
 if(!active||artBusy)return;
 const current=window.PhiImageBuilder?.get?.();
 if(current?.artifact?.storyWriterId===active.id&&current.result){
  $('#sw-art-status').textContent='Applying the image reviewer’s corrections and re-rendering…';
  const button=document.querySelector('#phiImageBuilder [data-pi-action="fix"]');
  if(button){button.click();document.getElementById('phiImageBuilder')?.scrollIntoView({behavior:'smooth',block:'start'});return}
 }
 $('#sw-art-status').textContent='Reopening this scene in Image Builder for a fresh corrected illustration…';
 void illustrate(active);
}
window.addEventListener('phi:image:build:done',event=>{
 const info=event.detail||{},storyId=info.storyWriterId;
 if(!storyId||!stories.some(x=>x.id===storyId)||artBusy)return;
 const src=window.PhiImageBuilder?.get?.().result;
 if(!src)return;
 void (async()=>{try{const blob=await window.PhiVisualRender.asBlob(src);await picture(storyId,blob);const row=stories.find(x=>x.id===storyId);if(row){row.imageStatus='Repaired illustration saved on this device.';saveStory(row)}if(active?.id===storyId){showArt(blob);$('#sw-art-status').textContent='Repaired illustration saved on this device.'}}catch(error){console.warn('Story image repair save deferred',error)}})();
});
ui();
})();