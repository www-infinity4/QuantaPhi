const status=document.getElementById('bubblesPublicXLiveStatus');
const detail=document.getElementById('bubblesPublicXLiveDetail');
if(status){
 fetch('/api/bubbles/public-x/health',{cache:'no-store'})
 .then(r=>r.ok?r.json():Promise.reject(Error('HTTP '+r.status)))
 .then(v=>{
  const s=v.readStatus||{};
  if(s.status==='public_posts_observed'){
   status.textContent='Cloud browser reading public X posts';
   if(detail)detail.textContent='Last successful check: '+(s.last_success||'unverified')+' · Visible posts: '+(s.visible_count??0)+' · Newly recorded: '+(s.new_count??0)+' · Possible new build requests: '+(s.candidate_count??0);
  }else if(s.status==='blocked'){
   status.textContent='Public X reader cannot currently retrieve the timeline';
   if(detail)detail.textContent='Last checked: '+(s.last_checked||'unknown')+' · Error: '+(s.error||'not specified')+'. An unsuccessful scan does not mean there were no posts.';
  }else{
   status.textContent='Public X reader is configured; awaiting a verified scan';
   if(detail)detail.textContent='Check the first hourly scan receipt before calling it connected.';
  }
 }).catch(()=>{
  status.textContent='Reader status not available';
  if(detail)detail.textContent='The browser scan has not been verified here; check the service health or Cloudflare logs.';
 });
}
