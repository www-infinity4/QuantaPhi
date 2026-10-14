/* Oracle Octaves · owner-only report of source-backed bot tasks. */
(function(){
 'use strict';
 const root=document.getElementById('robotDirections');
 if(!root)return;
 const panel=document.createElement('section');
 panel.className='robot-work-report';panel.setAttribute('aria-label','Verified bot work report');
 const bar=document.createElement('div');bar.className='robot-work-actions';
 const make=(tag,label)=>{const e=document.createElement(tag);e.textContent=label;return e};
 const report=make('button','Report'),top=make('button','Top 10 tasks');
 report.type='button';top.type='button';bar.append(report,top);
 const stamp=make('small','Waiting for verified task records.');
 const prose=make('div','');prose.className='robot-work-prose';prose.setAttribute('aria-live','polite');
 panel.append(bar,stamp,prose);
 const form=root.querySelector('textarea');
 if(form)form.before(panel);else root.prepend(panel);
 const API='https://infinity-brain-clock.marvaseater.workers.dev';
 let mode='report',busy=false,enabled=true;
 const clean=(value,limit=240)=>String(value||'').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').slice(0,limit);
 function ordered(tickets){
  const rows=[];
  for(const ticket of Array.isArray(tickets)?tickets:[]){
   if(ticket?.context?.kind!=='robot-directions')continue;
   for(const job of ticket.context.color_jobs||[]){
    const status=clean(job.status||'queued',35),progress=job.progress||{};
    const tier=['working','running','leased'].includes(status)?0:['ready','queued'].includes(status)?1:status==='blocked'?2:3;
    rows.push({id:clean(ticket.id,80)+'/'+clean(job.id,45),title:clean(job.title,150),agent:clean(job.agent||'unassigned',65),repository:clean(job.repository||'unresolved repository',100),status,tier,priority:Number(job.queue_priority)||0,summary:clean(progress.summary,320),next:clean(progress.next,200),blocker:clean(progress.blocker,200),when:Date.parse(progress.attemptedAt||job.last_inspected_at||'')||Number(ticket.updated_at)||0});
   }
  }
  return rows.sort((a,b)=>a.tier-b.tier||b.priority-a.priority||b.when-a.when).slice(0,10);
 }
 function write(rows,earnings){
  const active=rows.filter(r=>r.tier===0).length,when=new Date().toLocaleString();
  const lines=['Bot activity report — '+when+'. '+active+' of the '+rows.length+' displayed jobs have a recorded active status. Jobs still queued are not running.'];
  const names={'pink-panther':'Pink Panther',greenbeans:'Greenbeans',blueberry:'Blueberry','purple-pearl':'Purple Pearl'};
  const state={working:'marked working',leased:'leased to the runner',running:'running',queued:'waiting for execution',ready:'ready to be claimed',blocked:'blocked',complete:'recorded complete',committed_unverified:'committed, awaiting live verification',deployed_verified:'live deployment verified'};
  rows.forEach((r,i)=>{
   let sentence=(i+1)+'. '+(names[r.agent]||r.agent)+' — '+(state[r.status]||r.status)+'. Task: '+r.title+'. Repository: '+r.repository+'.';
   sentence+=' '+(r.summary?'Latest recorded finding: '+r.summary+'.':'No individual work receipt has been recorded yet.');
   if(r.blocker)sentence+=' Blocker: '+r.blocker+'.';else if(r.next)sentence+=' Next: '+r.next+'.';
   lines.push(sentence+' Reference: '+r.id+'.');
  });
  if(!rows.length)lines.push('No owner tasks were returned. This is not evidence of active bot work.');
  const counts=earnings?.counts;
  if(earnings?.ok&&counts)lines.push('Automatic reward audit: '+(Number(counts.paid)||0)+' paid work receipts; '+(Number(counts.eligibleUnpaid)||0)+' eligible but unpaid; '+(Number(counts.unverified)||0)+' unverified or blocked; '+(Number(counts.failedRetry)||0)+' delayed retries. This report does not issue payments.');
  else lines.push('Reward-status endpoint could not be verified; no payment is assumed.');
  prose.replaceChildren();for(const line of lines){const p=make('p',line);prose.append(p)}
  stamp.textContent='Verified owner ticket snapshot · '+when+'. Refresh every 30 seconds while this page is open.';
 }
 async function pull(requested=mode){
  mode=requested;if(busy||!enabled)return;busy=true;
  try{
   const owner=window.QuantaBrainOwner;
   if(!owner)throw Error('Robot Brain owner session not available');
   const headers=await owner.ready;
   if(!headers)throw Error('Owner session not verified');
   const res=await fetch(API+'/work/tickets/list',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!res.ok)throw Error('Ticket service unavailable ('+res.status+')');
   const json=await res.json();if(!json.ok||!Array.isArray(json.tickets))throw Error('Ticket response invalid');
   const earnings=await fetch(API+'/work/earnings/status',{headers,cache:'no-store',signal:AbortSignal.timeout(12000)}).then(r=>r.ok?r.json():null).catch(()=>null);
   write(ordered(json.tickets),earnings);
  }catch(e){stamp.textContent='Last report could not be verified.';prose.replaceChildren(make('p',clean(e.message,130)+'. Previously saved jobs are not deleted.'))}
  finally{busy=false}
 }
 report.addEventListener('click',()=>pull('report'));
 top.addEventListener('click',()=>pull('top'));
 window.addEventListener('quantaphi:robot-directions',()=>pull());
 window.addEventListener('pagehide',()=>{enabled=false});
 setInterval(()=>{if(document.visibilityState==='visible')pull()},30000);
 void pull();
})();
