/* Bubbles user-owned social tag control. A name is not an account credential. */
(()=>{'use strict';
 const root=document.getElementById('bubblePersonalSocial');if(!root)return;
 const by=id=>document.getElementById(id);
 const name=by('bubblePersonalName'),tag=by('bubblePersonalTag'),provider=by('bubblePersonalProvider');
 const account=by('bubblePersonalAccount'),status=by('bubblePersonalStatus'),proof=by('bubblePersonalProof');
 const items=by('bubblePersonalInbox');
 const API='https://infinity-brain-clock.marvaseater.workers.dev/bubble/personal-social';
 const controls=[...root.querySelectorAll('button[data-bubble-operation]')];
 function loadName(){
  let profile={};try{profile=JSON.parse(localStorage.getItem('quantaphi:bubbles:config:v1')||'{}')}catch{}
  name.value=String(profile.alias||'Bubbles').slice(0,38);
  updateTag();
 }
 function updateTag(){
  const cleaned=name.value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
   .toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,32);
  tag.textContent=cleaned.length>=2?'#'+cleaned:'Enter a name';
 }
 function walletToken(){
  let session;try{session=JSON.parse(localStorage.getItem('starquest_session')||'null')}catch{}
  const key=String(session?.username||session?.key||'').toLowerCase();
  if(!key)throw Error('Connect your Unified Wallet first.');
  let value=localStorage.getItem('starquest_ledger_device_v1:'+key)||'';
  try{value=JSON.parse(value).deviceToken||value}catch{}
  if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(value))throw Error('Your authenticated wallet session is missing.');
  return value;
 }
 async function invoke(action,payload={}){
  const response=await fetch(API,{method:'POST',mode:'cors',cache:'no-store',
   headers:{'Content-Type':'application/json',Authorization:'Bearer '+walletToken()},
   body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(30000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw Error(data.error||'Social operation not available');
  return data;
 }
 name.addEventListener('input',updateTag);
 window.addEventListener('bubbles:name-updated',e=>{
  const alias=String(e.detail?.alias||'').trim().slice(0,38);
  if(alias){name.value=alias;updateTag()}
 });
 provider.addEventListener('change',()=>{
  account.placeholder=provider.value==='x'?'@YourXhandle':'Numeric Facebook Page ID';
 });
 for(const btn of controls)btn.addEventListener('click',async()=>{
  const action=btn.dataset.bubbleOperation;
  controls.forEach(b=>b.disabled=true);status.textContent='Checking '+action+'…';
  try{
   if(action==='connect'){
    if(name.value.trim().length<2)throw Error('Enter a bubble name first.');
    // Sync the editable Bubbles name without inventing a separate persona identity.
    if(typeof window.CustomEvent==='function')window.dispatchEvent(new window.CustomEvent('bubbles:personal-name-request',{detail:{alias:name.value.trim().slice(0,38)}}));
   }
   const data=await invoke(action,action==='connect'?{
    name:name.value.trim(),provider:provider.value,accountId:account.value.trim()
   }:{});
   if(action==='connect'){
    proof.textContent=data.verifyText||'Facebook Page permissions are not connected yet.';
    status.textContent=data.status==='awaiting_proof_post'?
     'Post the exact verification sentence from your X account, then select Verify.':'Provider authorization pending.';
   }else if(action==='verify'){
    proof.textContent='';status.textContent='Account verified for '+data.tag+'. You may scan this account for your hashtag.';
   }else if(action==='scan'){
    status.textContent='Checked '+data.matched+' posts, recorded '+data.created+' new suggestions. GPT reviewed up to '+(data.modelReviewed||0)+' new proposals. No jobs or edits executed.';
   }else if(action==='inbox'){
    items.replaceChildren();
    const rows=Array.isArray(data.commands)?data.commands:[];
    status.textContent=rows.length+' personal hashtag suggestions.';
    for(const row of rows){
     const item=document.createElement('article'),p=document.createElement('p'),small=document.createElement('small');
     p.textContent=String(row.suggestion||'').slice(0,2200);
     small.textContent=String(row.status||'new')+' · '+String(row.command_tag||'')+
      ' · GPT: '+String(row.gpt_status||'needs_review')+
      ' · Placement: '+String(row.proposed_placement||'community-review');
     item.append(p,small);
     if(/^https:\/\/x\.com\/i\/status\/[0-9]{1,24}$/.test(row.source_url||'')){
      const source=document.createElement('a');source.href=row.source_url;source.target='_blank';
      source.rel='noopener noreferrer';source.textContent='Original X post';item.append(source);
     }
     items.append(item);
    }
   }
  }catch(error){status.textContent='Not completed: '+String(error.message||error).slice(0,150)}
  finally{controls.forEach(b=>b.disabled=false)}
 });
 loadName();
})();
