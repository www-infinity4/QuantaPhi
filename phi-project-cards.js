/* Inline Code Phi and Create Phi cards, running the existing Oracle editor. */
(function(){
'use strict';
const host=document.getElementById('phiProjectActions');
if(!host)return;
const pkg=window.PhiProjectPackage;
if(!pkg){host.textContent='Project package service unavailable.';return}
const el=(tag,cls,content)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=content;return x};
const add=(p,c)=>{p.append(c);return c};
const shell=add(host,el('div','pp-deck'));
const getTitle=()=>pkg.active()?.title||'No project selected';
const header=add(host,el('p','pp-footer','Local project packages · No wallet token is minted, billed, or credited by these controls.'));
const editors=[];
function build(kind){
 const code=kind==='code',card=add(shell,el('article','pp-card'));
 card.dataset.workshop=kind;
 const head=add(card,el('header','pp-top'));
 const heading=add(head,el('div','pp-heading'));
 add(heading,el('span','pp-eyebrow','ORACLE OCTAVES · INFINITY 2026® · '+(code?'DESIGN':'ASSET CREATION')));
 add(heading,el('h2','pp-name',code?'Code Phi':'Create Phi'));
 add(head,el('span','pp-orb',code?'φ':'✦')).setAttribute('aria-hidden','true');
 add(card,el('p','pp-description',code?'Edit a real website with Oracle, HTML preview, import, repair and publishing controls.':'Make and import artwork, widgets, cards, files, and media using the real Code Phi creation studio.'));
 const active=add(card,el('p','pp-active'));
 const status=add(card,el('p','pp-status','Choose a project or start a local token draft.'));status.setAttribute('role','status');
 const controls=add(card,el('div','pp-controls'));
 const create=add(controls,el('button','pp-btn pp-plus','＋ New token'));create.type='button';
 const picker=add(controls,el('select','pp-select'));picker.setAttribute('aria-label','Select project token for '+(code?'Code Phi':'Create Phi'));
 const open=add(controls,el('button','pp-btn pp-primary',code?'Open Code Phi':'Open Create Phi'));open.type='button';
 const full=add(controls,el('a','pp-btn pp-link','Full studio ↗'));full.href='/project-workspace/';
 const uploadTile=add(card,el('label','pp-upload-tile'));
 const uploadInput=add(uploadTile,el('input'));uploadInput.type='file';uploadInput.accept='image/png,image/jpeg,image/webp,image/gif,image/avif';uploadInput.multiple=true;uploadInput.setAttribute('aria-label','Add images to '+(code?'Code Phi':'Create Phi')+' project');
 add(uploadTile,el('span','pp-upload-plus','＋'));
 const uploadLabel=add(uploadTile,el('span','pp-upload-caption','Add images from device'));
 const uploadPreview=add(uploadTile,el('img','pp-upload-preview'));uploadPreview.alt='Image selected for project';uploadPreview.hidden=true;
 add(card,el('p','pp-upload-note','Tap + to add images to the active project without entering a filename. Local images are not yet uploaded to Cloudflare.'));
 let tempPreview='';
 uploadInput.addEventListener('change',async()=>{
  const chosen=Array.from(uploadInput.files||[]).slice(0,8);uploadInput.value='';
  if(!chosen.length)return;
  if(!pkg.active()){status.textContent='Start or select a token project before adding images.';return}
  if(tempPreview)URL.revokeObjectURL(tempPreview);
  tempPreview=URL.createObjectURL(chosen[0]);uploadPreview.src=tempPreview;uploadPreview.hidden=false;uploadLabel.textContent='Add more images';
  let count=0,errors=[];
  for(const file of chosen){const result=await pkg.captureFile(file,kind);if(result.ok)count++;else errors.push(result.reason)}
  status.textContent=count+' local image'+(count===1?'':'s')+' saved to '+getTitle()+'.'+(errors.length?' '+errors.join(' '):'');
  refresh();
 });
 const tokenRow=add(card,el('details','pp-token-import'));
 add(tokenRow,el('summary','','Import existing token or project'));
 const walletPick=add(tokenRow,el('select','pp-select'));walletPick.setAttribute('aria-label','Existing confirmed token');
 const apply=add(tokenRow,el('button','pp-btn','Attach existing token'));apply.type='button';
 const file=add(tokenRow,el('input','pp-file'));file.type='file';file.accept='.json,application/json';
 const importButton=add(tokenRow,el('button','pp-btn','Import project JSON'));importButton.type='button';
 const frameWrap=add(card,el('div','pp-frame-wrap'));frameWrap.hidden=true;
 const frame=add(frameWrap,el('iframe','pp-frame'));frame.title=(code?'Code Phi':'Create Phi')+' real Oracle Studio';frame.loading='lazy';
 const refresh=()=>{
  const current=pkg.active(),all=pkg.list();
  picker.replaceChildren();
  add(picker,el('option','',current?'Select another project':'Select project')).value='';
  for(const item of all){const opt=add(picker,el('option','',item.title+' · '+item.assets.length+' assets'));opt.value=item.id;opt.selected=item.id===current?.id}
  active.textContent=current?'Working package: '+current.title+' · '+current.assets.length+' assets · '+(current.tokenId?'Linked token':'Draft token'):
    'Start a token to collect assets into a project.';
 };
 const loadWallet=async()=>{
  const existing=await pkg.tokens();
  walletPick.replaceChildren();
  add(walletPick,el('option','','Choose a saved wallet token')).value='';
  for(const x of existing){const opt=add(walletPick,el('option','',(x.title||'Research token')+' · '+x.id.slice(0,26)));opt.value=x.id}
  if(!existing.length)add(walletPick,el('option','','No confirmed local wallet tokens found')).disabled=true;
 };
 create.addEventListener('click',()=>{
  const project=pkg.newToken(kind==='code'?'New website project':'New asset collection');
  status.textContent=project?'Started a local token draft. Collect images, stories and media into this project.':'Unable to store new token draft.';
  refresh();
 });
 picker.addEventListener('change',()=>{if(pkg.use(picker.value)){status.textContent='Project selected: '+getTitle();refresh()}});
 open.addEventListener('click',()=>{
  const url=pkg.seed(kind);
  if(!url){status.textContent='Create or import a project first.';return}
  frame.src=url;
  frameWrap.hidden=false;open.textContent=code?'Reload Code Phi':'Reload Create Phi';
  status.textContent='Opened Oracle editor for '+getTitle()+'. Source links were passed to the editor; device-uploaded images remain in Project Workspace until imported into the editor.';
 });
 apply.addEventListener('click',async()=>{
  if(!walletPick.value){status.textContent='Select an existing token first.';return}
  const ok=await pkg.attachToken(walletPick.value);
  status.textContent=ok?'Existing token attached. Wallet balance unchanged.':'Could not verify that token in the local wallet history.';
  refresh();
 });
 importButton.addEventListener('click',()=>file.click());
 file.addEventListener('change',async()=>{
  const f=file.files?.[0];if(!f)return;
  if(f.size>500000){status.textContent='Import is limited to 500 KB of project metadata.';return}
  try{const item=pkg.importProject(JSON.parse(await f.text()));status.textContent=item?'Project imported locally with '+item.assets.length+' source items.':'Invalid project file.';refresh()}
  catch{status.textContent='Could not parse this project JSON.'}
  finally{file.value=''}
 });
 addEventListener('phi-projects:changed',refresh);
 refresh();editors.push({refresh,loadWallet});
 }
build('code');build('create');
for(const x of editors)void x.loadWallet();
})();
