/* Local Phi project page: source packages, not a wallet or public publisher. */
(function(){
'use strict';
const host=document.getElementById('phiProjectPage'),pkg=window.PhiProjectPackage;
if(!host||!pkg)return;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const append=(p,c)=>{p.append(c);return c};
const controls=append(host,el('div','pwp-panel'));
append(controls,el('h2','','Project tokens & collections'));
const note=append(controls,el('p','pwp-note','Start a local project token draft or import a confirmed Infinity research token. No wallet credit is created here.'));
const row=append(controls,el('div','pwp-actions'));
const add=append(row,el('button','pwp-action','＋ New token'));add.type='button';
const name=append(row,el('input','pwp-input'));name.placeholder='Project title';name.maxLength=110;name.setAttribute('aria-label','Project title');
const rename=append(row,el('button','pwp-action','Rename'));rename.type='button';
const exportButton=append(row,el('button','pwp-action','Export package JSON'));exportButton.type='button';
const file=append(row,el('input','pwp-input'));file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Import project JSON');
const tokenRow=append(controls,el('div','pwp-actions'));
const wallets=append(tokenRow,el('select','pwp-input'));wallets.setAttribute('aria-label','Select existing Infinity token');
const attach=append(tokenRow,el('button','pwp-action','Import wallet token'));attach.type='button';
const status=append(controls,el('p','pwp-note',''));status.setAttribute('role','status');
const projects=append(host,el('div','pwp-panel'));
append(projects,el('h2','','Your projects'));
const tabs=append(projects,el('div','pwp-actions'));
const details=append(host,el('div','pwp-panel'));
const items=append(details,el('div','pwp-assets'));
const uploadTile=append(details,el('label','pwp-upload'));
const imagePicker=append(uploadTile,el('input'));imagePicker.type='file';imagePicker.accept='image/png,image/jpeg,image/webp,image/gif,image/avif';imagePicker.multiple=true;imagePicker.setAttribute('aria-label','Add images from device');
append(uploadTile,el('span','pwp-upload-plus','＋'));
const uploadText=append(uploadTile,el('span','pwp-upload-text','Add images'));
const uploadThumb=append(uploadTile,el('img','pwp-upload-thumb'));uploadThumb.alt='Selected image preview';uploadThumb.hidden=true;
append(details,el('p','pwp-note','Tap + to choose images from your phone or computer. Files are kept on this device until cloud storage is connected.'));
const sourceForm=append(details,el('form','pwp-actions'));
const url=append(sourceForm,el('input','pwp-input'));url.placeholder='https:// website or source link (not a filename)';url.type='url';url.required=true;
const title=append(sourceForm,el('input','pwp-input'));title.placeholder='Source title';title.required=true;
const kind=append(sourceForm,el('select','pwp-input'));
for(const [value,label] of [['image','Image'],['video','Video'],['audio','Audio'],['story','Story'],['link','Website / reference']]){const o=append(kind,el('option','',label));o.value=value}
const addSource=append(sourceForm,el('button','pwp-action','＋ Add source'));addSource.type='submit';
let renderVersion=0,previewUrls=[],tileUrl='';
function releasePreviews(){for(const u of previewUrls)URL.revokeObjectURL(u);previewUrls=[]}
async function displaySavedImage(img,id,version){
 try{
  const address=await window.PhiProjectFiles?.objectUrl(id);
  if(!address)return;
  if(version!==renderVersion||!img.isConnected){URL.revokeObjectURL(address);return}
  previewUrls.push(address);img.src=address;img.hidden=false;
 }catch{img.alt='Image cannot be loaded from local device storage.'}
}
function render(){
 const version=++renderVersion;releasePreviews();
 const p=pkg.active();
 tabs.replaceChildren();
 for(const x of pkg.list()){
  const b=append(tabs,el('button','pwp-action'+(p?.id===x.id?' is-active':''),x.title+' ('+x.assets.length+')'));
  b.type='button';b.addEventListener('click',()=>pkg.use(x.id));
 }
 items.replaceChildren();
 if(!p){append(items,el('p','','No project selected. Start a token above.'));name.value='';return}
 name.value=p.title;
 append(items,el('h3','',''+p.title));
 append(items,el('p','pwp-note',p.assets.length+' collected sources · '+(p.tokenId?'Linked token '+p.tokenId:'Local draft '+p.draftTokenId)+'.'));
 if(!p.assets.length){append(items,el('p','','Collect an image in TerriPhi/PetriPhi or add a source below.'))}
 for(const asset of p.assets){
  const card=append(items,el('article','pwp-asset'));
  if(asset.imageUrl||asset.localAssetId){
   const img=append(card,el('img'));img.alt=asset.title;img.loading='lazy';img.referrerPolicy='no-referrer';
   if(asset.imageUrl)img.src=asset.imageUrl;
   else{img.hidden=true;void displaySavedImage(img,asset.localAssetId,version)}
  }
  const copy=append(card,el('div'));
  append(copy,el('strong','',asset.title));
  append(copy,el('p','pwp-note',asset.kind+(asset.year?' · '+asset.year:'')+(asset.license?' · '+asset.license:'')));
  if(asset.sourceUrl){
   const link=append(copy,el('a','','Open original source ↗'));link.href=asset.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
  }else append(copy,el('p','pwp-note','Uploaded on this device · '+(asset.fileName||'Image')+' · not yet backed up to the cloud'));
 }
}
async function walletOptions(){
 wallets.replaceChildren();const o=append(wallets,el('option','','Choose existing wallet token'));o.value='';
 for(const x of await pkg.tokens()){const option=append(wallets,el('option','',(x.title||'Saved token')+' · '+x.id.slice(0,30)));option.value=x.id}
}
add.onclick=()=>{const p=pkg.newToken(name.value||'New project');status.textContent=p?'Created local project token draft '+p.id+'.':'Cannot save project on this device.'};
rename.onclick=()=>{status.textContent=pkg.rename(name.value)?'Project renamed.':'Choose a project first.'};
exportButton.onclick=()=>{
 const p=pkg.active();
 status.textContent=pkg.download()?(p.assets.some(x=>x.localAssetId)?'Project source JSON exported. Device images are not included in the JSON; keep their originals.':'Project source JSON exported.'):'Choose a project first.';
};
file.onchange=async()=>{const f=file.files?.[0];if(!f)return;try{if(f.size>500000)throw Error('File exceeds 500 KB');
 const result=pkg.importProject(JSON.parse(await f.text()));status.textContent=result?'Imported '+result.assets.length+' sources.':'Not a supported asset project.'}
 catch(e){status.textContent='Import error: '+String(e.message).slice(0,100)}finally{file.value=''}};
attach.onclick=async()=>{status.textContent=await pkg.attachToken(wallets.value)?'Linked an existing locally confirmed token; wallet unchanged.':'Select a verified token and project.'};
imagePicker.addEventListener('change',async()=>{
 const chosen=Array.from(imagePicker.files||[]).slice(0,8);
 imagePicker.value='';
 if(!chosen.length)return;
 if(!pkg.active()){status.textContent='Tap New token first to choose a project for the images.';return}
 if(tileUrl)URL.revokeObjectURL(tileUrl);
 tileUrl=URL.createObjectURL(chosen[0]);uploadThumb.src=tileUrl;uploadThumb.hidden=false;uploadText.textContent='Add more images';
 let added=0,errors=[];
 for(const picked of chosen){
  const result=await pkg.captureFile(picked,'project-workspace');
  if(result.ok)added++;else errors.push(result.reason);
 }
 status.textContent=added+' image'+(added===1?'':'s')+' added to '+(pkg.active()?.title||'project')+'.'+(errors.length?' '+errors.join(' '):'');
});
sourceForm.onsubmit=e=>{e.preventDefault();const result=pkg.capture({kind:kind.value,title:title.value,sourceUrl:url.value,imageUrl:kind.value==='image'?url.value:''});
 status.textContent=result.ok?(result.duplicate?'That source is already collected.':'Source added to the active package.'):result.reason;
 if(result.ok){url.value='';title.value=''}
};
window.addEventListener('phi-projects:changed',render);
render();void walletOptions();
})();
