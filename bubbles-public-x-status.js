const status=document.getElementById('bubblesPublicXLiveStatus');
const detail=document.getElementById('bubblesPublicXLiveDetail');
const secondary=document.getElementById('bubblesPublicXSecondaryStatus');
const starcraft=document.getElementById('bubblesPublicXStarCraftStatus');
if(status){
 fetch('/api/bubbles/public-x/health',{cache:'no-store'})
 .then(r=>r.ok?r.json():Promise.reject(Error('HTTP '+r.status)))
 .then(v=>{
  const s=v.readStatus||{};
  if(s.status==='public_posts_observed'){
   status.textContent='Cloud browser reading public X posts';
   if(detail)detail.textContent='Last successful check: '+(s.last_success||'unverified')+' · Visible posts: '+(s.visible_count??0)+' · Newly recorded: '+(s.new_count??0)+' · Possible new build requests: '+(s.candidate_count??0);
  }else if(s.status==='manual_browser_verified'){
   status.textContent='Public X browser read verified; next scheduled scan pending';
   if(detail)detail.textContent='Manual check: '+(s.last_success||'unavailable')+' · Posts saved: '+(s.new_count??0)+' · Possible work requests: '+(s.candidate_count??0)+'. Recurring schedule is configured but its first run is not yet verified.';
  }else if(s.status==='blocked'){
   status.textContent='Public X reader cannot currently retrieve the timeline';
   if(detail)detail.textContent='Last checked: '+(s.last_checked||'unknown')+' · Error: '+(s.error||'not specified')+'. An unsuccessful scan does not mean there were no posts.';
  }else{
   status.textContent='Public X reader is configured; awaiting a verified scan';
   if(detail)detail.textContent='Check the first hourly scan receipt before calling it connected.';
  }
  if(secondary){
   const source=Array.isArray(v.sources)?v.sources.find(item=>item.account==='IntegraAI'&&item.authority==='reference_only'):null;
   const sub=source?.readStatus;
   if(sub?.status==='public_posts_observed'){
    secondary.textContent='Integra · read-only context verified: '+(sub.last_success||'unverified')+' · Visible posts: '+(sub.visible_count??0)+' · Newly recorded: '+(sub.new_count??0)+'. This does not authorize builds or X replies.';
   }else if(sub?.status==='blocked'){
    secondary.textContent='Integra · read-only context blocked at '+(sub.last_checked||'unknown')+' · '+(sub.error||'no error detail')+'. Last success: '+(sub.last_success||'none verified')+'. The owner reader has a separate status.';
   }else{
    secondary.textContent='Integra · read-only context not verified yet. This does not affect the owner reader.';
   }
  }
  if(starcraft){
   const source=Array.isArray(v.sources)?v.sources.find(item=>item.account==='StarCraftCo'&&item.authority==='reference_only'):null;
   const sc=source?.readStatus;
   if(sc?.status==='public_posts_observed')starcraft.textContent='StarCraftCo · public context verified: '+(sc.last_success||'unverified')+' · Visible: '+(sc.visible_count??0)+' · New: '+(sc.new_count??0)+'. Read-only, not owner authorization.';
   else if(sc?.status==='blocked')starcraft.textContent='StarCraftCo · public context blocked at '+(sc.last_checked||'unknown')+' · '+(sc.error||'no error detail')+'. Last success: '+(sc.last_success||'none verified')+'.';
   else starcraft.textContent='StarCraftCo · source registered, public scan not yet verified. Other sources remain separate.';
  }
 }).catch(()=>{
  status.textContent='Reader status not available';
  if(detail)detail.textContent='The browser scan has not been verified here; check the service health or Cloudflare logs.';
  if(secondary)secondary.textContent='Integra read-only context status unavailable; no successful secondary scan is claimed.';
  if(starcraft)starcraft.textContent='StarCraftCo context status unavailable; no successful scan is claimed.';
 });
}


const starReferences=document.getElementById('starCraftPublicObservations');
if(starReferences){
 const list=document.getElementById('starCraftPublicObservationList');
 const note=document.getElementById('starCraftPublicObservationStatus');
 fetch('/api/bubbles/public-x/context?account=StarCraftCo',{cache:'no-store'})
 .then(r=>r.ok?r.json():Promise.reject(Error('HTTP '+r.status)))
 .then(data=>{
  if(!list||!note)return;
  const items=Array.isArray(data.observations)?data.observations:[];
  const seen=new Set();
  for(const item of items){
   if(item?.account!=='StarCraftCo'||item?.authority!=='reference_only'||item?.audience!=='general'||item?.source_method!=='tinyfish_public_browser')continue;
   const id=String(item.post_id||'');
   if(!/^\d{15,22}$/.test(id)||item.url!=='https://x.com/StarCraftCo/status/'+id||seen.has(id))continue;
   const summary=String(item.summary||'').trim();
   if(!summary||summary.length>240)continue;
   seen.add(id);
   const li=document.createElement('li');
   const link=document.createElement('a');
   link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';
   link.textContent='Open StarCraftCo post '+id;
   const description=document.createElement('p');
   description.textContent=summary+' · Public-browser reference, not a live X feed';
   li.append(link,description);
   list.appendChild(li);
  }
  note.textContent=seen.size?'Saved reviewed public references: '+seen.size+'. Cloudflare scheduled X scans are tracked separately.':
    'No verified public references are available here. '+(data.observationState==='storage_unavailable'?'Reference storage is unavailable.':'The scheduled public reader may still be blocked.');
 })
 .catch(()=>{if(note)note.textContent='Public reference lookup unavailable. No new X scan or import is claimed.';});
}
