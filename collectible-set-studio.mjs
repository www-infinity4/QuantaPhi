/* User-selected local files only. No gallery scans, uploads, purchases or unlocked paid image bytes. */
import {eligibleCreatorSuggestion,evaluateSetDraft,creatorSetEconomy,createSetBrief} from './collectible-set-core.mjs';
const root=document.getElementById('collectibleStudio');
if(root){
 const $=id=>document.getElementById(id), accepted=new Set(['image/jpeg','image/png','image/webp']);
 const status=$('studioStatus'),idea=$('setSuggestion'),panel=$('draftPanel'),cover=$('freeCover'),items=$('draftPieces');
 const maxBytes=8*1024*1024,maxPieces=30;
 let objectUrls=[],lastBrief='';
 const clearUrls=()=>{for(const url of objectUrls)URL.revokeObjectURL(url);objectUrls=[];lastBrief='';};
 const safeFile=file=>Boolean(file&&accepted.has(file.type)&&file.size>0&&file.size<=maxBytes);
 const suggestion=()=>{
  idea.hidden=!eligibleCreatorSuggestion({consent:$('privateOptIn').checked,
   imageCount:$('pieceFiles').files.length,scope:'selected-files'});
 };
 const sha=async file=>{
  const b=await file.arrayBuffer();
  const raw=new Uint8Array(await crypto.subtle.digest('SHA-256',b));
  return 'sha256:'+Array.from(raw,x=>x.toString(16).padStart(2,'0')).join('');
 };
 $('pieceFiles').addEventListener('change',suggestion);
 $('privateOptIn').addEventListener('change',suggestion);
 $('clearSet').addEventListener('click',()=>{
  clearUrls();$('setForm').reset();panel.hidden=true;idea.hidden=true;cover.replaceChildren();items.replaceChildren();
  status.textContent='Local image choices cleared. No upload occurred.';
 });
 $('setForm').addEventListener('submit',async e=>{
  e.preventDefault();clearUrls();panel.hidden=true;cover.replaceChildren();items.replaceChildren();
  const chosen=[...$('pieceFiles').files],coverFile=$('coverFile').files[0];
  if(!safeFile(coverFile)||chosen.length<2||chosen.length>maxPieces||!chosen.every(safeFile)){
   status.textContent='Choose one separate cover and 2–30 JPEG/PNG/WebP collectibles, each under 8 MB.';return;
  }
  status.textContent='Checking selected image fingerprints locally…';
  try{
   const coverDigest=await sha(coverFile),fingerprints=await Promise.all(chosen.map(sha));
   const entries=chosen.map((file,i)=>({id:'draft-'+(i+1),digest:fingerprints[i],
     rights:$('canPublish').checked?'original':'unknown',imageReady:true}));
   const draft=evaluateSetDraft({title:$('setName').value,creatorId:'draft-owner',items:entries,
     freeCover:{id:'free-cover',digest:coverDigest},consent:$('canPublish').checked});
   if(!draft.complete){status.textContent='Draft needs changes: '+draft.errors.join(', ').replaceAll('_',' ')+'. No payment or publication occurred.';return;}
   const picture=document.createElement('img');
   picture.alt='Free creator cover preview';
   const coverUrl=URL.createObjectURL(coverFile);objectUrls.push(coverUrl);picture.src=coverUrl;cover.append(picture);
   for(let i=0;i<chosen.length;i++){
    const li=document.createElement('li'),title=document.createElement('strong'),detail=document.createElement('small');
    title.textContent='Collectible '+(i+1)+' · 1 Star Coin (planned)';
    detail.textContent='Locked for future public viewers · author preview only · fingerprint '+fingerprints[i].slice(7,19)+'…';
    li.append(title,detail);items.append(li);
   }
   const plan=creatorSetEconomy({pieceCount:chosen.length,unitCost:1,freePreview:true});
   $('setQuote').textContent='1 free cover + '+plan.paidPieces+' separate collectibles · '+plan.totalStarCoins+' Star Coins to unlock all (proposed only; payments unavailable).';
   lastBrief=createSetBrief({title:$('setName').value,pieces:chosen.length,category:$('setTheme').value});
   panel.hidden=false;
   status.textContent='Local preview ready. Creator rights confirmation received; public publication still needs independent review and server validation.';
  }catch{status.textContent='Could not inspect these images locally. No files were uploaded or coins charged.';}
 });
 $('copyBrief').addEventListener('click',async()=>{
  if(!lastBrief){status.textContent='Create your draft first.';return;}
  try{await navigator.clipboard.writeText(lastBrief);status.textContent='The GPT build brief was copied. Image files were not shared.';}
  catch{status.textContent='Clipboard unavailable. Your files remain local.';}
 });
 window.addEventListener('pagehide',clearUrls,{once:true});
}
