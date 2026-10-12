/* Project packages: local-first asset manifests, never wallet mints. */
(function(root){
'use strict';
if(root.PhiProjectPackage)return;
const KEY='quantaphi:asset-projects:v1', ACTIVE='quantaphi:active-asset-project:v1', LIMIT=70,MAX_ASSETS=240;
const clean=(s,max=400)=>String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,max);
const uid=()=>root.crypto?.randomUUID?.()||('p'+Date.now().toString(36)+Math.random().toString(36).slice(2));
const safeUrl=s=>{const raw=String(s||'').trim();if(!raw)return'';try{const u=new URL(raw,location.origin);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return''}};
function read(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.id==='string').slice(0,LIMIT):[]}catch{return[]}}
function notice(){root.dispatchEvent(new CustomEvent('phi-projects:changed'))}
function write(items){try{localStorage.setItem(KEY,JSON.stringify(items.slice(0,LIMIT)));notice();return true}catch{return false}}
const list=()=>read();
const active=()=>read().find(p=>p.id===localStorage.getItem(ACTIVE))||null;
function use(id){if(!read().some(p=>p.id===id))return false;try{localStorage.setItem(ACTIVE,id);notice();return true}catch{return false}}
function newToken(title='New project'){
 const now=new Date().toISOString(),id='draft-'+uid();
 const record={schema:'phi-asset-project/v1',id,draftTokenId:id,tokenId:'',tokenStatus:'local-draft',
  title:clean(title,110)||'New project',createdAt:now,updatedAt:now,assets:[]};
 if(!write([record,...read()]))return null;
 use(id);return record;
}
function rename(title){const p=active();if(!p)return false;const all=read(),item=all.find(x=>x.id===p.id);item.title=clean(title,110)||item.title;item.updatedAt=new Date().toISOString();return write(all)}
async function tokens(){
 const ledger=root.QuantaUnifiedTokenLedger;
 if(typeof ledger?.load!=='function')return [];
 try{return (await ledger.load()).filter(t=>t?.id&&t.cloudStatus==='saved'&&t.cloudTokenId).map(t=>({id:String(t.id),cloudTokenId:t.cloudTokenId||'',title:clean(t.query||t.title,110)})).slice(0,400)}
 catch{return []}
}
async function attachToken(tokenId){
 const id=clean(tokenId,150),wallet=(await tokens()).find(t=>t.id===id||t.cloudTokenId===id),p=active();
 if(!p||!wallet)return false;
 const all=read(),project=all.find(x=>x.id===p.id);
 project.tokenId=wallet.id;project.tokenStatus='linked-local-wallet-record';
 project.updatedAt=new Date().toISOString();return write(all);
}
function normalized(item){
 const kind=clean(item?.kind||item?.type||'source',34).toLowerCase();
 const url=safeUrl(item?.sourceUrl||item?.url||item?.href||item?.media||'');
 const image=safeUrl(item?.imageUrl||item?.src||item?.image||'');
 const title=clean(item?.title||item?.name||'Collected asset',160);
 if(!url&&!image)return null;
 const source=url||image;
 return {id:clean(item?.id,100)||kind+'|'+source,kind,title,sourceUrl:source,imageUrl:image,
  description:clean(item?.description||item?.story||item?.text,650),
  license:clean(item?.license,280),year:Number.isInteger(item?.year)?item.year:null,
  originCard:clean(item?.originCard||item?.generator||'',65),collectedAt:new Date().toISOString()};
}
function capture(item){
 const p=active();if(!p)return {ok:false,reason:'Start or select a project token first.'};
 const asset=normalized(item);if(!asset)return {ok:false,reason:'No usable source URL in this collection.'};
 const all=read(),project=all.find(x=>x.id===p.id);
 if(project.assets.some(x=>x.kind===asset.kind&&x.sourceUrl===asset.sourceUrl))return {ok:true,duplicate:true,project};
 if(project.assets.length>=MAX_ASSETS)return {ok:false,reason:'Project is full; export it before collecting more.'};
 project.assets.push(asset);project.updatedAt=new Date().toISOString();
 if(!write(all))return {ok:false,reason:'Local storage unavailable; export your project.'};
 return {ok:true,duplicate:false,project};
}
function download(){
 const p=active();if(!p)return false;
 const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='Phi-project-'+p.id.slice(0,36)+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),800);return true;
}
function importProject(json){
 if(!json||json.schema!=='phi-asset-project/v1'||!Array.isArray(json.assets))return null;
 const assets=json.assets.slice(0,MAX_ASSETS).map(normalized).filter(Boolean);
 const now=new Date().toISOString(),id='draft-'+uid();
 const project={schema:'phi-asset-project/v1',id,draftTokenId:id,tokenId:'',tokenStatus:'local-draft',
  title:clean(json.title,110)||'Imported project',createdAt:now,updatedAt:now,assets};
 if(!write([project,...read()]))return null;
 use(id);return project;
}
function seed(mode='code'){
 const p=active();if(!p)return null;
 const tokenId=p.tokenId||'',query=clean(p.title,100)+(tokenId?'':' (project '+p.id.slice(-6)+')');
 const sources=p.assets.slice(-24).map(x=>({title:x.title,sourceUrl:x.sourceUrl,image:x.imageUrl,extract:(x.description||'')+(x.license?' · '+x.license:'')}));
 try{localStorage.setItem('omniPhi:codeSeed:v1',JSON.stringify({query,tokenId,sources,overview:'Asset package '+p.title+' with '+p.assets.length+' collected source items. Build from cited and licensed items.'}));}
 catch{return null}
 const u=new URL('/omni-phi/code/',location.origin);
 u.searchParams.set('q',query);
 if(tokenId)u.searchParams.set('token',tokenId);
 u.searchParams.set('from','quanta');
 if(mode==='create')u.hash='mediaStudio';
 return u.pathname+u.search+u.hash;
}
root.addEventListener('quantaphi:collected',event=>{if(active()&&event?.detail)capture(event.detail)});
root.addEventListener('storage',event=>{if(event.key===KEY||event.key===ACTIVE)notice()});
root.PhiProjectPackage=Object.freeze({list,active,use,newToken,rename,tokens,attachToken,capture,download,importProject,seed});
})(window);
