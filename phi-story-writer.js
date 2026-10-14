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
let active=null,busy=false,artUrl='',artBusy=false,sourcePreviewUrl='';
const MAX_SOURCE_BYTES=10*1024*1024;

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
 const upload=make('input','sw-field');upload.type='file';upload.id='sw-source-image';upload.accept='image/jpeg,image/png,image/webp';upload.setAttribute('aria-label','Upload a picture to inspire the story');
 const photo=make('img','sw-source-preview');photo.id='sw-source-preview';photo.alt='Selected story source picture';photo.hidden=true;
 const photoNote=make('p','sw-muted','Optional: upload a picture and Oracle will inspect visible details before writing. No filename guessing. PNG, JPG or WebP, up to 10 MB.');photoNote.id='sw-source-note';
 // Optional suggestions use this user's own retained Bubbles messages.
 // No ChatGPT conversation content is inferred from a ChatGPT sign-in.
 const personalRow=make('section','sw-personal-row');personalRow.id='sw-personal-ideas';
 const personalize=make('input','');personalize.type='checkbox';personalize.id='sw-personalize';
 personalize.checked=read('quantaPhi:storyWriter:personalize:v1',false)===true;
 const personalizeLabel=make('label','sw-personal-label');
 personalizeLabel.append(personalize,make('span','','Use my Bubbles conversation to suggest story openings'));
 const personalIdeas=make('div','sw-personal-choices');personalIdeas.setAttribute('aria-live','polite');
 const privacyNote=make('p','sw-muted','Off unless you choose it. Suggestions stay in this browser; your ChatGPT sign-in does not reveal ChatGPT history.');
 personalRow.append(personalizeLabel,personalIdeas,privacyNote);
 async function refreshPersonalIdeas(){
  personalIdeas.replaceChildren();
  if(!personalize.checked)return;
  const memory=window.BubblesMemory;
  if(!memory?.enabled){personalIdeas.append(make('p','sw-muted','Enable Remember my conversation inside Bubbles to use your previous topics.'));return}
  try{
   const turns=(await memory.recent(160)).filter(m=>m.role==='user'&&m.text.length>=16);
   const candidates=[];
   const seen=new Set();
   for(const turn of turns.slice().reverse()){
    const raw=turn.text.replace(/https?:\\/\\/\\S+/g,'').replace(/\\s+/g,' ').trim();
    if(/\\b(password|passphrase|pin number|credit card|bank account|bearer token|api key|secret key|social security)\\b/i.test(raw))continue;
    const idea=raw.split(/[.!?]/)[0].replace(/^(please|can you|i want|i need|tell me about|find|search for|explain|what is|make|create|build|fix|repair)\\s+/i,'').slice(0,110).trim();
    if(idea.length<15||idea.length>110)continue;
    const normalized=idea.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    if(!normalized||seen.has(normalized))continue;
    seen.add(normalized);candidates.push(idea);
    if(candidates.length===4)break;
   }
   if(!candidates.length){personalIdeas.append(make('p','sw-muted','No suitable saved Bubbles topics yet. You can still write a story without history.'));return}
   for(const [index,topic] of candidates.entries()){
    const genre=['Mystery','Science fiction','Adventure','Ghost story'][index%4];
    const prompt='Write an original '+genre.toLowerCase()+' story inspired by this topic: '+topic+'. Surprise me with an imaginative plot.';
    const button=make('button','sw-personal-idea',topic);
    button.type='button';button.setAttribute('aria-label','Start a '+genre+' story from '+topic);
    button.addEventListener('click',()=>{idea.value=prompt;type.value=genre;idea.focus()});
    personalIdeas.append(button);
   }
  }catch{personalIdeas.append(make('p','sw-muted','History is unavailable on this device. Your manual story inputs still work.'))}
 }
 personalize.addEventListener('change',()=>{store('quantaPhi:storyWriter:personalize:v1',personalize.checked);void refreshPersonalIdeas()});
 const go=make('button','sw-primary','Write story + create image');go.type='button';go.id='sw-write';
 const viewStories=make('button','sw-view-stories','View Stories');viewStories.type='button';viewStories.id='sw-view-stories';
 viewStories.setAttribute('aria-controls','sw-saved-library');viewStories.setAttribute('aria-expanded','false');
 const notice=make('p','sw-notice','');notice.id='sw-notice';notice.setAttribute('role','status');
 form.append(make('label','sw-label','Describe your story'),idea,personalRow,make('label','sw-label','Keywords (optional)'),keys,make('label','sw-label','Picture to write about (optional)'),upload,photo,photoNote,options,go,viewStories,notice);
 const section=make('section','sw-card sw-output');section.id='sw-output';section.hidden=true;
 const header=make('div','sw-result-head');header.append(make('span','sw-eyebrow','YOUR ORIGINAL STORY'),make('h3','sw-title',''));
 const sourceArt=make('img','sw-art sw-original-photo');sourceArt.id='sw-original-photo';sourceArt.alt='Original picture submitted by the storyteller';sourceArt.hidden=true;
 const sourceCaption=make('p','sw-muted sw-original-caption','Your original uploaded picture');sourceCaption.id='sw-original-caption';sourceCaption.hidden=true;
 const art=make('img','sw-art');art.id='sw-art';art.alt='AI illustration of the story';art.hidden=true;
 const artStatus=make('p','sw-art-status','');artStatus.id='sw-art-status';
 const body=make('div','sw-story');body.id='sw-body';
 const controls=make('div','sw-actions');
 for(const [id,label]of [['sw-star','☆ Star +0.1 ★'],['sw-collect','Collect +0.1 ★'],['sw-share','Share +0.1 ★'],['sw-copy-story','Copy story'],['sw-fix','Fix illustration'],['sw-retry-image','Retry image']]){
   const b=make('button','',''+label);b.type='button';b.id=id;controls.append(b);
 }
 const rewardStatus=make('p','sw-reward-status','A verified Star, Collect, or Share submits a separate +0.1 StarCoin receipt.');rewardStatus.id='sw-reward-status';rewardStatus.setAttribute('role','status');
 const history=make('section','sw-card sw-history');history.id='sw-saved-library';history.hidden=true;
 history.append(make('strong','','Your saved stories'));
 const picker=make('select','sw-field');picker.id='sw-history';picker.setAttribute('aria-label','Open a saved Story Writer draft');
 const exportBtn=make('button','','Download story text backup');exportBtn.type='button';exportBtn.id='sw-export';
 const historyState=make('p','sw-muted','Loading saved stories…');historyState.id='sw-history-state';
 const library=make('div','sw-library');library.id='sw-library';library.setAttribute('aria-label','Saved stories available to read');
 history.append(picker,library,exportBtn,historyState);
 section.append(header,sourceArt,sourceCaption,art,artStatus,body,controls,rewardStatus);
 root.append(form,section,history);
 void refreshPersonalIdeas();
 $('#sw-write').addEventListener('click',()=>void writeStory());
 upload.addEventListener('change',previewSource);
 $('#sw-star').addEventListener('click',star);
 $('#sw-collect').addEventListener('click',collect);
 $('#sw-share').addEventListener('click',()=>void share());
 $('#sw-copy-story').addEventListener('click',()=>void copy());
 $('#sw-fix').addEventListener('click',()=>void fix());
 $('#sw-retry-image').addEventListener('click',()=>void illustrate(active));
 picker.addEventListener('change',()=>openSavedStory(picker.value)); 
 viewStories.addEventListener('click',()=>{
  const show=history.hidden;history.hidden=!show;
  viewStories.textContent=show?'Hide Stories':'View Stories';
  viewStories.setAttribute('aria-expanded',String(show));
  if(show){historyList();history.scrollIntoView({block:'start',behavior:'smooth'});}
 });
 exportBtn.addEventListener('click',exportStories);
 historyList();
}
function note(message){$('#sw-notice').textContent=message;const status=$('#sw-reward-status');if(status)status.textContent=message}
function openSavedStory(id){
 active=stories.find(s=>s.id===id)||null;
 if(!active)return;
 renderStory();
 $('#sw-output').scrollIntoView({block:'start',behavior:'smooth'});
}
function historyList(){
 const picker=$('#sw-history');picker.replaceChildren();
 const empty=make('option','','Choose a saved story');empty.value='';picker.append(empty);
 for(const s of stories){const o=make('option','',s.title||'Untitled');o.value=s.id;picker.append(o)}
 if(active)picker.value=active.id;
 picker.disabled=!stories.length;
 const exportBtn=$('#sw-export');if(exportBtn)exportBtn.disabled=!stories.length;
 const library=$('#sw-library');library.replaceChildren();
 for(const s of stories){
  const row=make('article','sw-library-item');
  const h=make('h4','',s.title||'Untitled Story');
  const date=make('p','sw-muted',String(s.createdAt||'').slice(0,10));
  const teaser=make('p','sw-library-teaser',String(s.body||'').replace(/\\s+/g,' ').slice(0,175));
  const open=make('button','sw-library-open','Read full story');open.type='button';
  open.addEventListener('click',()=>openSavedStory(s.id));
  row.append(h,date,teaser,open);library.append(row);
 }
 if(!stories.length)library.append(make('p','sw-muted','Write a story to see it here.'));
 const status=$('#sw-history-state');
 if(status)status.textContent=stories.length
  ?stories.length+' stories saved on this device (browser storage + IndexedDB backup). Cloud backup is not connected.'
  :'No saved stories were found in this browser. Cloud backup is not connected.';
}
async function persistDraft(story){
 const database=await db();
 try{return await new Promise((resolve,reject)=>{
  const tx=database.transaction('drafts','readwrite');tx.objectStore('drafts').put(story);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error||Error('Draft backup failed'));
 })}finally{database.close()}
}
async function saveStory(story){
 stories=[story,...stories.filter(x=>x.id!==story.id)];
 const savedLocal=store(KEY,stories.slice(0,25));
 let savedBackup=false;
 try{savedBackup=await persistDraft(story)}catch(error){console.warn('Story Writer draft backup unavailable',error)}
 historyList();
 if(!savedLocal&&!savedBackup)note('Device storage is full or blocked. Copy your story before leaving this page.');
 return savedLocal||savedBackup;
}
async function recoverDrafts(){
 let database;
 try{
  database=await db();
  const recovered=await new Promise((resolve,reject)=>{
   const tx=database.transaction('drafts','readonly'),req=tx.objectStore('drafts').getAll();
   req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error||Error('Cannot restore drafts'));
  });
  const before=new Set(stories.map(s=>s.id));
  const combined=new Map();
  for(const story of [...recovered,...stories]){
   if(story&&typeof story.id==='string'&&typeof story.body==='string')combined.set(story.id,story);
  }
  stories=[...combined.values()].sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0));
  if(stories.length)store(KEY,stories.slice(0,25));
  if(stories.length)await new Promise((resolve,reject)=>{
   const tx=database.transaction('drafts','readwrite'),object=tx.objectStore('drafts');
   for(const story of stories)object.put(story);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Draft migration failed'));
  });
  historyList();
  const restored=stories.filter(s=>!before.has(s.id)).length;
  if(restored)note('Recovered '+restored+' saved story draft(s) from this browser’s backup.');
 }catch(error){
  console.warn('Story Writer browser backup is unavailable',error);
  historyList();
 }finally{database?.close()}
}
function exportStories(){
 if(!stories.length)return note('No saved story text to export yet.');
 const payload={format:'phi-story-writer-text-backup-v1',exportedAt:new Date().toISOString(),stories};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='phi-story-writer-backup.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
 note('Story text backup prepared. Keep the downloaded file safe; images are stored separately.');
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
  const req=indexedDB.open('phi-story-writer-images-v1',2);
  req.onupgradeneeded=()=>{
   if(!req.result.objectStoreNames.contains('images'))req.result.createObjectStore('images',{keyPath:'id'});
   if(!req.result.objectStoreNames.contains('drafts'))req.result.createObjectStore('drafts',{keyPath:'id'});
  };
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
async function prepareSource(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Select a PNG, JPG or WebP picture.');
 if(file.size>MAX_SOURCE_BYTES)throw Error('That picture exceeds 10 MB. Choose a smaller one.');
 if(file.size<=2_700_000)return file;
 // Cloudflare vision currently accepts up to 3 MB, even when the UI accepts 10 MB.
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Picture resize unavailable on this browser');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Cannot prepare picture')),'image/jpeg',.82));
  if(blob.size>2_900_000)throw Error('Picture remains too large for the image reader');
  return new File([blob],'story-source.jpg',{type:'image/jpeg'});
 }finally{bitmap.close?.()}
}
function previewSource(){
 const photo=$('#sw-source-preview'),file=$('#sw-source-image').files?.[0];
 if(sourcePreviewUrl){URL.revokeObjectURL(sourcePreviewUrl);sourcePreviewUrl=''}
 photo.hidden=true;photo.removeAttribute('src');
 if(!file){$('#sw-source-note').textContent='No picture selected. You can still write from an idea or keywords.';return}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>MAX_SOURCE_BYTES){
  $('#sw-source-image').value='';note('Picture must be PNG/JPG/WebP, 10 MB or smaller.');return;
 }
 sourcePreviewUrl=URL.createObjectURL(file);photo.src=sourcePreviewUrl;photo.hidden=false;
 $('#sw-source-note').textContent='Selected picture: '+file.name+'. Oracle will read its visible content before composing your story.';
}
function showOriginal(id){
 const img=$('#sw-original-photo'),caption=$('#sw-original-caption');
 img.hidden=true;caption.hidden=true;img.removeAttribute('src');
 if(!id)return;
 getPicture('source:'+id).then(blob=>{if(active?.id!==id||!blob)return;const src=URL.createObjectURL(blob);img.src=src;img.hidden=false;caption.hidden=false;img.onload=()=>URL.revokeObjectURL(src);}).catch(()=>{});
}
function renderStory(){
 const section=$('#sw-output');section.hidden=!active;if(!active){showArt(null);return}
 $('.sw-title').textContent=active.title;const body=$('#sw-body');body.replaceChildren();
 // Preserve the author’s complete text, including single-newline paragraphs.
 for(const paragraph of active.body.split(/\n\s*\n|\n(?=[^\n])/).map(x=>x.trim()).filter(Boolean)){body.append(make('p','',paragraph))}
 $('#sw-collect').textContent=read(COLLECT,[]).some(x=>x.key==='story-writer|'+active.id)?'Collected ✓':'Collect +0.1 ★';
 $('#sw-star').textContent=read(STARS,[]).includes(active.id)?'★ Starred':'☆ Star +0.1 ★';
 $('#sw-art-status').textContent=active.imageStatus||'Illustration will appear here when the renderer finishes.';
 showArt(null);const id=active.id;showOriginal(id);
 getPicture(id).then(blob=>{if(active?.id===id&&blob)showArt(blob)}).catch(()=>{});
 historyList();
}
async function writeStory(){
 if(busy||artBusy)return;
 const idea=$('#sw-idea').value.trim(),keys=$('#sw-keys').value.trim(),genre=$('#sw-genre').value,words=Number($('#sw-length').value)||900;
 const sourceFile=$('#sw-source-image').files?.[0]||null;
 if(!idea&&!keys&&!sourceFile){note('Start with an idea, keywords, or upload a picture.');return}
 busy=true;$('#sw-write').disabled=true;
 let prepared=null,visualEvidence='';
 try{
  if(sourceFile){
   note('Oracle is reading the picture before writing…');
   prepared=await prepareSource(sourceFile);
   if(typeof window.PhiVisualRender?.inspect!=='function')throw Error('Cloudflare image reader is unavailable. Your picture was not analyzed.');
   visualEvidence=String(await window.PhiVisualRender.inspect(prepared)||'').trim();
   if(visualEvidence.length<25)throw Error('Image reader did not describe the picture. No story was invented from the filename.');
  }
 }catch(error){note('Picture reading could not finish: '+String(error?.message||error).slice(0,160));busy=false;$('#sw-write').disabled=false;return}
 const id=(crypto.randomUUID?.()||Date.now().toString(36)),prompt=[
 'You are the Story Writer in QuantaPhi. Write a completely original, polished fictional story driven by the user.',
 'Produce a surprising opening, vividly different characters, scenes that advance the plot, a meaningful reveal, and a satisfying ending. Avoid generic summaries, repetition, filler or disclaimers.',
 'Treat these as FICTION; do not pretend invented details are verified facts.',
 'Return ONLY valid JSON with keys "title", "story", "illustration". The story value must contain fully written prose with paragraphs separated by two newline characters.',
 'The illustration value describes ONE striking scene from this exact story, with composition, lighting, period details, subject and atmosphere. Do not include words or titles in the painted image.',
 'Genre: '+genre,'Length target: '+words+' words','Opening idea: '+idea,'Keywords: '+keys,
 visualEvidence?'This source image was inspected by a visual model. Build the narrative around what it visibly depicts, using the user’s creative instructions. Distinguish visible evidence from fictional invention. Never identify a real person from appearance alone. Visible content:\\n'+visualEvidence:'',
 sourceFile?'The uploaded picture is the main subject even when the opening idea is blank.':'',
 'Write now.'
 ].join('\n');
 note('Oracle is writing your original story…');
 try{
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),65000);
  let response;try{response=await fetch(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'oracle-story-writer',requireCloudflare:true}}),signal:controller.signal})}finally{clearTimeout(timeout)}
  const data=await response.json().catch(()=>({}));if(!response.ok||data.ok===false)throw Error(String(data.error||'GPT did not return a completed story'));
  const parsed=parseStory(takeText(data),idea||keys);
  if(parsed.body.length<250)throw Error('GPT returned an incomplete story. Please try Write Story again.');
  active={id,title:parsed.title,body:parsed.body,scene:parsed.scene,idea,keywords:keys,genre,photoBased:Boolean(prepared),visualEvidence:visualEvidence.slice(0,1600),createdAt:new Date().toISOString(),imageStatus:'Preparing your illustration…'};
  if(prepared){try{await picture('source:'+id,prepared)}catch(error){note('Original source image could not be saved: '+String(error?.message||error))}}
  const saved=await saveStory(active);renderStory();
  note(saved?'Story written and saved on this device. Creating its image…':'Story written, but local storage failed. Copy your story before leaving.');
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
 try{
  if(typeof window.PhiStoryShare?.create!=='function')throw Error('The full-story reader is unavailable');
  const url=await window.PhiStoryShare.create({kind:'fiction',title:active.title,body:active.body,summary:teaser});
  const data={title:active.title,text:teaser,url};
  if(navigator.share)await navigator.share(data);
  else if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(teaser+' '+url);
  else throw Error('Sharing not supported on this device');
  const reward=window.QuantaStarCredit?.('share','story-writer:'+active.id+':'+Date.now(),{key:'story-writer|'+active.id,title:active.title,story:teaser,type:'Fantasy'});
  note('Shared a link to the complete story.'+creditStatus(reward,'Share'))
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
void recoverDrafts();
})();