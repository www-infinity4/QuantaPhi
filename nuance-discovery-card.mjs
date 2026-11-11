import {suggestNuances,reviewDraftRequest} from './nuance-discovery-core.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';
const root=document.getElementById('nuanceDiscoveryCard');
if(root){
 root.innerHTML=`<article class="nd-card" aria-labelledby="nd-title">
  <div class="qcx-art nd-art" data-theme="research" role="img" aria-label="Abstract Infinity OS research motif and the number 41">
   <span class="qcx-art-kicker">INFINITY OS · CART 004 / NUANCES</span>
   <span class="qcx-art-mark">∞ 41</span>
   <span class="qcx-art-name">Original decisions → verified project improvements</span>
  </div>
  <div class="nd-body">
   <p class="nd-kicker">C13B0 · Bubbles Brain · Oracle Octaves</p>
   <h2 id="nd-title">Nuance Discovery</h2>
   <p>Explore actual owner-approved project history. Compare earlier goals with today's QuantaPhi code, without rewriting your preferences or starting unauthorized jobs.</p>
   <div class="nd-timeline" aria-label="Project context">
    <div><strong>Then · 25 Nov 2025</strong><span>Cart 003 Computers, Cart 004 Nuances, 41 carts + 41 monitoring calculators. Full original transcript: import not yet verified.</span></div>
    <div><strong>Now · QuantaPhi</strong><span>Existing signed Brain, owner-only archived audit, Oracle Quick Cards and review-draft path. Source and deployment receipts remain separate.</span></div>
    <div><strong>Next · source-grounded</strong><span>Find a missing import or improvement, cross-check its issue and code, then prepare a review-only engineering draft.</span></div>
   </div>
   <div class="nd-commands">
    <button type="button" id="ndRead">Read my authorized context</button>
    <a href="/#robotBrainOwner" class="nd-link">Owner connection</a>
    <a href="https://github.com/www-infinity4/QuantaPhi/issues/1923" class="nd-link" target="_blank" rel="noopener noreferrer">Project record #1923</a>
   </div>
   <p id="ndStatus" class="nd-status" role="status" aria-live="polite">Source audit has not been requested. No private data has been read.</p>
   <div id="ndResults" class="nd-results" aria-live="polite"></div>
   <div id="ndCardActions"></div>
   <p class="nd-small">Historical excerpts and source IDs are displayed only after owner verification. No private transcript is published in GitHub, and no wallet or deployment action is authorized by this card.</p>
  </div>
 </article>`;
 const status=root.querySelector('#ndStatus'),host=root.querySelector('#ndResults'),button=root.querySelector('#ndRead');
 const BRAIN='https://infinity-brain-clock.marvaseater.workers.dev';
 let active=false,serial=0;
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const getHeaders=()=>{
  const gate=window.QuantaBrainOwner;
  const headers=typeof gate?.currentHeaders==='function'?gate.currentHeaders():null;
  if(!headers?.Authorization)throw Error('Owner wallet not verified here. Connect Robot Brain owner access first.');
  return headers;
 };
 const post=async(url,data,headers)=>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const res=await fetch(url,{method:'POST',cache:'no-store',headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify(data),signal:controller.signal});
   const body=await res.json().catch(()=>({}));
   return {res,body};
  }finally{clearTimeout(timeout)}
 };
 const clearProtected=()=>{
  if(!window.QuantaBrainOwner?.currentHeaders?.()?.Authorization){
   ++serial;host.replaceChildren();status.textContent='Owner session unavailable. Private findings hidden.';
  }
 };
 window.addEventListener('pageshow',clearProtected);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)clearProtected();});
 window.addEventListener('bubbles:owner-locked',clearProtected);
 const refresh=async()=>{
  if(active)return;
  active=true;const requestId=++serial;button.disabled=true;host.replaceChildren();
  status.textContent='Checking the authenticated owner archive (read-only)…';
  try{
   const headers=getHeaders();
   let {res,body}=await post(BRAIN+'/owner/conversation',{mode:'work-audit-reconcile',limit:150,pages:4},headers);
   if(res.status===500&&body?.error==='conversation_sync_failed'){
    ({res,body}=await post(BRAIN+'/owner/conversation',{mode:'work-audit-sweep',limit:150,pages:4},headers));
   }
   if(!res.ok||body?.ok!==true||!['work-audit-sweep','work-audit-reconcile'].includes(body.mode))
    throw Error(String(body?.error||'Owner archive is unavailable; nothing was submitted.').slice(0,130));
   if(getHeaders().Authorization!==headers.Authorization||requestId!==serial)
    throw Error('Owner session changed. No results shown.');
   const suggestions=suggestNuances(body);
   status.textContent='Read '+Number(body.messagesScanned||0)+' owner turns across '+Number(body.pagesScanned||0)+
    ' pages. '+suggestions.length+' source-derived topic(s). '+(body.nextCursor?'Additional archived pages remain. ':'')+
    (body.mode!=='work-audit-reconcile'?'Ticket reconciliation unavailable; draft creation disabled. ':
     body.ticketInventoryTruncated?'Ticket inventory incomplete; draft creation disabled. ':'No jobs dispatched.');
   if(!suggestions.length){
    host.append(node('p','nd-empty','No matching owner requests are in the scanned archive pages. Importing the full original Cart 003/004 thread into your private Bubbles memory is still a separate owner-authorized action.'));
    return;
   }
   for(const suggestion of suggestions){
    const panel=node('section','nd-suggestion');
    panel.append(node('h3','',suggestion.title),node('p','nd-muted',suggestion.mentions+' archived owner mention(s); '+suggestion.evidenceCount+' retained source ID(s).'));
    const detail=node('p','',suggestion.improvement);panel.append(detail);
    for(const constraint of suggestion.constraints.slice(0,2))panel.append(node('p','nd-constraint','Owner constraint: '+constraint));
    if(suggestion.excerpts[0])panel.append(node('blockquote','nd-excerpt','Source excerpt: '+suggestion.excerpts[0]));
    panel.append(node('p','nd-muted','Suggested repository: '+suggestion.repository+' (not independently verified). '+(suggestion.linkedTickets?'Existing linked ticket(s); review first.':'No explicit linked ticket in this audit snapshot.')));
    if(suggestion.existingIssueUrl){
     const existing=node('a','nd-link','Continue existing Infinity OS ticket #1923');
     existing.href=suggestion.existingIssueUrl;existing.target='_blank';existing.rel='noopener noreferrer';
     panel.append(existing);
    }
    const step=node('p','nd-status',suggestion.canDraft?'Review draft available; source verification and owner confirmation still required.':'Discovery only — more source or ticket reconciliation required.');
    if(suggestion.canDraft){
     const action=node('button','nd-draft','Prepare review-only draft');action.type='button';
     action.addEventListener('click',async()=>{
      const request=reviewDraftRequest(suggestion);if(!request)return;
      if(!window.confirm('Create one review-only DRAFT for '+suggestion.title+' in '+suggestion.repository+'? The repository is a suggestion, not yet verified. No GitHub build, wallet action or deployment will start.'))return;
      action.disabled=true;step.textContent='Checking owner source IDs with Robot Brain…';
      try{
       const now=getHeaders();if(now.Authorization!==headers.Authorization)throw Error('Owner session changed.');
       const {res:r,body:saved}=await post(BRAIN+'/work/tickets/create',request,now);
       if(!r.ok||saved?.ok!==true||!saved.ticket?.id||
        saved.ticket.repository!==request.repository||saved.ticket.context?.auditCandidateId!==request.auditCandidateId||
        saved.startRequested===true||saved.ticket.status!=='draft')
        throw Error(String(saved?.error||'Draft receipt not confirmed.'));
       step.textContent='Verified draft ticket '+saved.ticket.id+(saved.deduplicated?' (existing draft).':'.')+
        ' No engineering execution started.';
      }catch(error){step.textContent='No draft confirmed: '+String(error.message||error).slice(0,140);action.disabled=false;}
     });
     panel.append(action);
    }
    panel.append(step);host.append(panel);
   }
  }catch(error){status.textContent='Owner context not read: '+String(error.message||error).slice(0,155);
   host.replaceChildren(node('p','nd-empty','No private archive data or job draft was displayed. Verify the owner wallet in the existing Robot Brain card, then retry.'));}
  finally{active=false;button.disabled=false;}
 };
 button.addEventListener('click',()=>void refresh());
 mountCardActions(root.querySelector('#ndCardActions'),{
  id:'infinity-nuances',name:'Nuance Discovery',kind:'Research',category:'Research',
  route:'/#nuanceDiscoveryCard',description:'Cart 004 Nuance Discovery for owner-authorized archived project context.'
 },{showPreview:false,showOriginal:false});
}
