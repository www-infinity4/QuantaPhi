/* Infinity Platinum web start: exact destinations and honest local project receipts. */
(function(){
'use strict';
const core=window.InfinityPlatinumCore,packageApi=window.PhiProjectPackage;
const nativePlatinum=/InfinityPlatinumMobile\//i.test(navigator.userAgent||'');
const $=id=>document.getElementById(id),node=(tag,cls,content)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el;
};
const status=$('pl-status'),tiles=$('pl-tiles'),empty=$('pl-empty');
const editor=$('pl-edit'),editForm=$('pl-edit-form'),address=$('pl-address');
let editing='',currentPreview='';
const addressDraftKey='infinity-platinum:address-draft:v1',noteDraftKey='infinity-platinum:note-draft:v1';
try{const saved=localStorage.getItem(addressDraftKey);if(saved)address.value=saved}catch{}
address.addEventListener('input',()=>{try{localStorage.setItem(addressDraftKey,address.value)}catch{}});
$('pl-note').addEventListener('input',()=>{if(!editing)try{localStorage.setItem(noteDraftKey,$('pl-note').value)}catch{}});

if(!core){status.textContent='Infinity Platinum could not load the URL validator; links are disabled.';return}
function say(text){status.textContent=String(text)}
function launch(url,title){
 const normalized=core.validUrl(url);
 if(!normalized){say('Blocked: invalid or unsupported URL. Only real HTTP(S) pages can open.');return false}
 core.remember(normalized,title);
 showResume();
 if(nativePlatinum){location.assign(normalized);return true}
 const a=node('a');a.href=normalized;a.target='_blank';a.rel='noopener noreferrer';
 a.hidden=true;document.body.append(a);a.click();a.remove();
 say('Opening the exact destination in a browser tab: '+normalized);
 return true;
}
function showResume(){
 const item=core.last(),section=$('pl-resume');
 section.hidden=!item;if(!item)return;
 $('pl-resume-title').textContent=item.title||new URL(item.url).hostname;
 $('pl-resume-url').textContent=item.url;
 $('pl-resume-button').onclick=()=>launch(item.url,item.title);
}
function projectStatus(){
 const el=$('pl-active-project');
 if(!packageApi){el.textContent='Code Phi project adapter is unavailable. Collect and Build are disabled; saved tiles still work.';return}
 const p=packageApi.active();
 el.textContent=p?('Active local project: '+p.title+' · '+p.assets.length+' collected assets. Saved in this browser only.'):
  'No project yet. Collect automatically creates one local project draft; no wallet or Cloudflare mint.';
}
function ensureProject(){
 if(!packageApi?.capture||!packageApi?.seed||!packageApi?.newToken)return null;
 return packageApi.active()||packageApi.newToken('Infinity Platinum collection');
}
function capture(item){
 const project=ensureProject();
 if(!project)return {ok:false,reason:'Code Phi project adapter unavailable. No asset was collected.'};
 const receipt=packageApi.capture({kind:'source',title:item.title,sourceUrl:item.url,
   description:item.note||'Collected from Infinity Platinum',originCard:'infinity-platinum'});
 projectStatus();return receipt;
}
function collect(item,build=false){
 const result=capture(item);
 if(!result?.ok){say('Collect failed: '+(result?.reason||'Unknown project error')+' No success claimed.');return false}
 if(!build){say((result.duplicate?'Already in':'Collected into')+' your project: '+item.title+'. '+(result.duplicate?'No duplicate created.':'Local source saved.'));return true}
 const link=packageApi.seed('code');
 if(!link){say('Source collected, but the Code Phi editor adapter could not open. Your project remains saved locally.');return false}
 say('Source collected. Opening real Code Phi editor with this project’s source manifest.');
 location.assign(link);return true;
}
function mark(text){return node('span','pl-monogram',String(text||'P').slice(0,1))}
function thumb(tile){
 const area=node('div','pl-image'),letter=mark(tile.title),url=new URL(tile.url);
 area.append(letter);
 if(tile.preview){
  const screenshot=node('img');screenshot.alt='Your saved preview for '+tile.title;screenshot.src=tile.preview;
  screenshot.onerror=()=>{screenshot.remove();letter.hidden=false};
  screenshot.onload=()=>{letter.hidden=true};
  area.append(screenshot);
 }
 const favicon=node('img','pl-favicon');favicon.alt='';favicon.loading='lazy';
 favicon.src=url.origin+'/favicon.ico';
 favicon.onerror=()=>favicon.remove();
 area.append(favicon);return area;
}
function button(row,label,action,cls=''){
 const b=node('button',cls,label);b.type='button';b.addEventListener('click',action);row.append(b);return b;
}
function openEditor(item=null){
 editing=item?.id||'';currentPreview=item?.preview||'';
 $('pl-edit-title').textContent=item?'Edit this website':'Save a website preview';
 $('pl-title').value=item?.title||'';
 $('pl-url').value=item?.url||core.validUrl(address.value)||'';
 $('pl-note').value=item?.note||(!item?(localStorage.getItem(noteDraftKey)||''):'');
 $('pl-image').value='';
 editor.hidden=false;
 $('pl-title').focus();
}
function closeEditor(){editor.hidden=true;editing='';currentPreview='';}
function refresh(){
 const saved=core.read();tiles.replaceChildren();empty.hidden=saved.length>0;
 for(const t of saved){
  const article=node('article','pl-tile');article.dataset.tileId=t.id;
  article.append(thumb(t));
  const body=node('div','pl-tile-body');
  body.append(node('h3','',t.title),node('p','pl-tile-url',t.url));
  if(t.note)body.append(node('p','pl-tile-note',t.note));
  const actions=node('div','pl-tile-buttons');
  const open=node('a','pl-open','Open ↗');
  open.href=t.url;open.target=nativePlatinum?'_self':'_blank';open.rel='noopener noreferrer';
  open.addEventListener('click',()=>{core.remember(t.url,t.title);showResume()});
  actions.append(open);
  button(actions,'Collect',()=>collect(t));
  button(actions,'Build',()=>collect(t,true));
  button(actions,'Edit',()=>openEditor(t));
  button(actions,'Remove',()=>{
   if(!confirm('Remove this Platinum tile? Your collected project assets will not be deleted.'))return;
   const ok=core.remove(t.id);
   say(ok?'Tile removed. Your other projects were preserved.':'Unable to remove tile from this browser.');refresh();
  });
  body.append(actions);article.append(body);tiles.append(article);
 }
 showResume();projectStatus();
}
function imagePreview(file){
 return new Promise((resolve,reject)=>{
  if(!file)return resolve('');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>6_000_000)
   return reject(Error('Choose a JPG, PNG or WebP under 6 MB.'));
  const source=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
   try{
    const scale=Math.min(1,420/img.naturalWidth,236/img.naturalHeight),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    let encoded=canvas.toDataURL('image/jpeg',.68);
    if(encoded.length>104000){
     canvas.width=Math.max(1,Math.round(canvas.width*.65));
     canvas.height=Math.max(1,Math.round(canvas.height*.65));
     canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
     encoded=canvas.toDataURL('image/jpeg',.45);
    }
    if(encoded.length>104000)throw Error('This preview does not fit local storage. Try a smaller image.');
    resolve(encoded);
   }catch(e){reject(e)}finally{URL.revokeObjectURL(source)}
  };
  img.onerror=()=>{URL.revokeObjectURL(source);reject(Error('Cannot read that preview image.'))};
  img.src=source;
 });
}
$('pl-open-form').addEventListener('submit',event=>{
 event.preventDefault();
 const action=core.destination(address.value);
 if(!action){say('Enter a real web address or a search topic. Unsafe URL schemes are blocked.');return}
 launch(action.url,action.query||action.url);
});
$('pl-new').addEventListener('click',()=>openEditor());
$('pl-close').addEventListener('click',closeEditor);
$('pl-cancel').addEventListener('click',closeEditor);
editor.addEventListener('click',e=>{if(e.target===editor)closeEditor()});
editForm.addEventListener('submit',async event=>{
 event.preventDefault();
 const url=core.validUrl($('pl-url').value);
 if(!url){say('Tile not saved: enter a valid HTTP(S) website URL.');return}
 const submit=editForm.querySelector('button[type=submit]');
 submit.disabled=true;
 try{
  const file=$('pl-image').files?.[0];
  const preview=file?await imagePreview(file):currentPreview;
  const result=core.save({id:editing||undefined,url,title:$('pl-title').value,
   note:$('pl-note').value,preview});
  if(!result.ok){say(result.reason);return}
  if(!editing)try{localStorage.removeItem(noteDraftKey)}catch{}
  closeEditor();say('Website preview saved locally: '+result.item.title+'.');refresh();
 }catch(e){say('Could not save preview: '+String(e.message||e))}
 finally{submit.disabled=false}
});
$('pl-project').addEventListener('click',()=>{
 if(!packageApi?.newToken){say('Project adapter unavailable; no project was created.');return}
 const p=packageApi.newToken('Infinity Platinum collection');
 say(p?'Local project created: '+p.title+'. Collect a tile to add a real source.':'Unable to save a new project on this device.');
 projectStatus();
});
window.addEventListener('storage',e=>{if([core.KEY,core.RESUME,'quantaphi:asset-projects:v1','quantaphi:active-asset-project:v1'].includes(e.key))refresh()});
window.addEventListener('phi-projects:changed',projectStatus);
// Exposed to the native Android shell only after it verifies the HTTPS first-party
// origin. It is never registered as a JavaScript interface on third-party sites.
window.InfinityPlatinumApp=Object.freeze({
 collectFromNative:(raw,title,build=false)=>{
  if(!nativePlatinum)return {ok:false,reason:'Native Platinum browser required.'};
  const url=core.validUrl(raw);
  if(!url)return {ok:false,reason:'Unsafe source URL rejected.'};
  const item={url,title:String(title||new URL(url).hostname).slice(0,140)};
  const tile=core.read().find(t=>t.url===url);
  if(!tile){
   const saved=core.save(item);
   if(!saved.ok)return {ok:false,reason:saved.reason};
  }
  const receipt=capture({...item,note:'Collected from the Android Platinum browser'});
  if(!receipt?.ok)return {ok:false,reason:receipt?.reason||'Project collection failed'};
  if(build){
   const link=packageApi?.seed?.('code');
   if(!link)return {ok:false,reason:'Collected locally; Code Phi editor not connected.'};
   setTimeout(()=>location.assign(link),160);
  }
  refresh();
  return {ok:true,collected:true,builder:build===true,duplicate:receipt.duplicate===true};
 }
});
if(nativePlatinum){
 const hint=document.querySelector('.pl-find .pl-note');
 if(hint)hint.textContent='You are browsing inside Infinity Platinum for Android. Collected pages stay in this app’s first-party project workspace; no Chrome passwords or history are copied.';
}
const incoming=new URLSearchParams(location.search),collected=incoming.get('collect');
if(collected&&collected.length<2050&&core.validUrl(collected)){
 address.value=collected;
 say('Website link received. Select Save website or Collect to keep it; nothing has been collected automatically.');
}
refresh();
})();