const status=document.getElementById('bubblesPublicXLiveStatus');
const detail=document.getElementById('bubblesPublicXLiveDetail');
const secondary=document.getElementById('bubblesPublicXSecondaryStatus');
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
 }).catch(()=>{
  status.textContent='Reader status not available';
  if(detail)detail.textContent='The browser scan has not been verified here; check the service health or Cloudflare logs.';
  if(secondary)secondary.textContent='Integra read-only context status unavailable; no successful secondary scan is claimed.';
 });
}
