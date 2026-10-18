/* Public community proposals are suggestions, never owner work orders. */
(()=>{'use strict';
const form=document.getElementById('communityUpgradeForm');if(!form)return;
const idea=document.getElementById('communityUpgradeIdea'),name=document.getElementById('communityUpgradeName');
const status=document.getElementById('communityUpgradeStatus'),submit=form.querySelector('button[type="submit"]');
form.addEventListener('submit',async(event)=>{
 event.preventDefault();
 const proposal=idea.value.trim(),label=name.value.trim();
 if(proposal.length<15||proposal.length>2200){status.textContent='Describe the issue or improvement in 15–2200 characters.';return}
 submit.disabled=true;status.textContent='Sending your suggestion for review…';
 try{
  const response=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/community/upgrade',{
   method:'POST',mode:'cors',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({suggestion:proposal,name:label,website_field:''}),
   signal:AbortSignal.timeout(18000)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw Error(result.error||'Suggestion service unavailable');
  status.textContent=result.status==='duplicate'?'This suggestion is already recorded.':
   'Suggestion received for review. No site change or StarCoin reward has been promised.';
  if(result.status!=='duplicate')idea.value='';
 }catch(err){status.textContent='Suggestion was not confirmed saved: '+String(err.message||err).slice(0,110)+'. Try again after the service is connected.'}
 finally{submit.disabled=false}
});
})();
