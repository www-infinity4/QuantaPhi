import {AccountConnections,resolveConnectorWalletToken} from './bubbles-connections.mjs';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
export function mountInfinityCopilotCard(host){
 if(!host)return;
 const style=el('style','');
 style.textContent=`.infc{background:#fff;color:#202c39;border:1px solid #d8e2ee;border-radius:17px;padding:14px;display:grid;gap:12px;font:inherit}
 .infc button,.infc select,.infc textarea{font:inherit}.infc button{border:1px solid #c5d5e4;border-radius:12px;padding:10px 13px;background:#eaf3ff;color:#153c6b;font-weight:750;cursor:pointer}
 .infc button:disabled{opacity:.5;cursor:not-allowed}.infc .primary{background:#1666c1;color:white;border-color:#1666c1}
 .infc .tabs{display:flex;gap:5px;flex-wrap:wrap}.infc .tabs button[aria-selected=true]{background:#183a59;color:white}
 .infc textarea,.infc select{width:100%;box-sizing:border-box;border:1px solid #b6c7d8;border-radius:11px;padding:11px;background:white;color:#1d2a37}
 .infc textarea{min-height:95px;resize:vertical}.infc .muted{color:#526478;font-size:.91em}.infc .pr{border:1px solid #dbe5ec;border-radius:12px;padding:11px;display:grid;gap:8px}
 .infc .buttons{display:flex;gap:7px;flex-wrap:wrap}.infc .status{border-top:1px solid #dce5ef;padding-top:9px;white-space:pre-wrap}
 .infc button:focus-visible,.infc textarea:focus-visible,.infc select:focus-visible{outline:3px solid #eaa63c;outline-offset:2px}`;
 const card=el('section','infc'),title=el('h3','','Infinity Copilot · Build Studio'),
  summary=el('p','muted','GitHub signs you in securely. Build and review work here without opening the full GitHub website.'),
  status=el('p','status','Checking your existing connection…');
 status.setAttribute('role','status');
 const sign=el('button','primary','Sign in with GitHub');sign.type='button';
 const refresh=el('button','','Refresh PRs');refresh.type='button';
 const connection=el('div','buttons');connection.append(sign,refresh);
 const account=el('p','muted','Not signed in');
 const repo=el('select','');repo.setAttribute('aria-label','Authorized GitHub repository');
 const textarea=el('textarea','');textarea.maxLength=4000;textarea.placeholder='Copilot, build me a webpage that…';textarea.setAttribute('aria-label','Copilot build instruction');
 const send=el('button','primary','Ask Copilot to build a PR');send.type='button';
 const modes=el('div','tabs'),prlist=el('div','');
 let mode='copilot',client=null,active=null,repos=[],busy=false;
 for(const [key,label] of [['copilot','Copilot'],['gitpal','GitPal · Review'],['gitpro','GitPro · Merge']]){
  const b=el('button','',label);b.type='button';b.dataset.mode=key;b.setAttribute('aria-selected',String(key===mode));
  b.addEventListener('click',()=>{mode=key;for(const node of modes.children)node.setAttribute('aria-selected',String(node.dataset.mode===mode));renderMode();void loadPrs();});modes.append(b);
 }
 const setStatus=message=>{status.textContent=message;};
 const selected=()=>repos.find(r=>r.name===repo.value);
 function renderMode(){
  send.hidden=mode!=='copilot';textarea.placeholder=mode==='copilot'?'Copilot, build me a webpage that…':'Describe the changes you want on a PR below…';
  prlist.hidden=mode==='copilot';
 }
 const call=async(path,body)=>{if(!client)client=new AccountConnections({token:()=>resolveConnectorWalletToken()});return client.call(path,body)};
 function renderRepos(){
  repo.replaceChildren();
  for(const r of repos){const option=el('option','',r.name+(r.permissions?.write?'':' · read only'));option.value=r.name;repo.append(option);}
  send.disabled=!repos.some(r=>r.permissions?.write);
  refresh.disabled=!repos.length;
 }
 async function load(){
  if(busy)return;busy=true;refresh.disabled=true;sign.disabled=true;
  try{
   const [catalog,accounts]=await Promise.all([call('/catalog'),call('/accounts')]);
   const config=catalog.providers?.find(p=>p.id==='github');
   active=(accounts.accounts||[]).find(a=>a.provider==='github'&&a.status==='connected'&&a.expiresAt>Date.now()+30000)||null;
   sign.hidden=false;sign.textContent=active?'Reconnect GitHub':'Sign in with GitHub';sign.disabled=!config?.configured;
   account.textContent=active?'Signed in to GitHub · '+active.label:(config?.configured?'GitHub sign-in required':'GitHub connector setup is not active');
   if(!active){repos=[];renderRepos();prlist.replaceChildren();setStatus('Connect your wallet and authorize GitHub in the popup. No passwords are collected by Infinity.');return;}
   const data=await call('/github/repositories',{id:active.id});
   repos=(data.repositories||[]).filter(r=>r.permissions?.read===true);
   renderRepos();setStatus(repos.length?'Ready. Choose a repository to work in.':'No authorized repositories found for this GitHub installation.');
   if(repos.length)await loadPrs();
  }catch(error){setStatus('Connection unavailable: '+String(error.message||error).slice(0,125));}
  finally{busy=false;sign.disabled=false;refresh.disabled=false;}
 }
 async function loadPrs(){
  const r=selected();prlist.replaceChildren();if(!active||!r)return;
  try{
   const data=await call('/github/copilot',{id:active.id,repository:r.name,action:'prs'});
   for(const pr of data.prs||[]){
    const row=el('article','pr'),head=el('strong','', '#'+pr.number+' · '+pr.title),
      info=el('p','muted',pr.draft?'Draft · not ready to merge':'Review changes and required checks before merging'),buttons=el('div','buttons');
    row.append(head,info);
    if(mode!=='copilot'){
     const comment=el('button','','Send instructions');
     comment.type='button';
     comment.addEventListener('click',async()=>{
      if(!r.permissions?.write){setStatus('Repository write permission required.');return;}
      const instruction=textarea.value.trim();if(instruction.length<3){setStatus('Enter your changes in the text box first.');return;}
      comment.disabled=true;try{const result=await call('/github/copilot',{id:active.id,repository:r.name,action:'feedback',prNumber:pr.number,prompt:instruction});
       setStatus('Comment recorded on PR #'+result.pr+'. This does not guarantee an automatic Copilot reply.');textarea.value='';
      }catch(e){setStatus('Instruction not posted: '+e.message)}finally{comment.disabled=false;}
     });buttons.append(comment);
    }
    if(mode==='gitpro'&&r.permissions?.write){
     const merge=el('button','primary','Review gates & merge');merge.type='button';
     merge.addEventListener('click',async()=>{
      const expected='MERGE '+r.name+'#'+pr.number;
      if(window.prompt('Type exactly '+expected+' to merge after all checks pass:')!==expected){setStatus('Merge cancelled.');return;}
      merge.disabled=true;try{const result=await call('/github/copilot',{id:active.id,repository:r.name,action:'merge',prNumber:pr.number,confirmation:expected});
       setStatus('PR #'+result.pr+' merged. Commit '+result.commit);await loadPrs();
      }catch(e){setStatus('Merge blocked: '+e.message)}finally{merge.disabled=false;}
     });buttons.append(merge);
    }
    row.append(buttons);prlist.append(row);
   }
   if(!prlist.childNodes.length)prlist.append(el('p','muted','No open PRs in this repository.'));
  }catch(e){setStatus('Pull requests unavailable: '+e.message);}
 }
 sign.addEventListener('click',async()=>{
  if(busy)return;
  try{
   if(!client)client=new AccountConnections({token:()=>resolveConnectorWalletToken()});
   await client.connect('github',['repository.read','repository.write'],(error,a)=>{
     if(error)setStatus('GitHub authorization did not finish: '+error.message);
     else {setStatus('GitHub verified: '+a.label);void load();}
   },{preferPopup:true});
   setStatus('Authorize in the GitHub popup. This card stays open.');
  }catch(e){setStatus('Could not open GitHub authorization popup: '+e.message);}
 });
 repo.addEventListener('change',()=>void loadPrs());
 refresh.addEventListener('click',()=>void loadPrs());
 send.addEventListener('click',async()=>{
  const r=selected(),prompt=textarea.value.trim();
  if(!active||!r?.permissions?.write){setStatus('Sign in and select a writable repository first.');return;}
  if(prompt.length<12){setStatus('Describe the build in at least twelve characters.');return;}
  if(!window.confirm('Create an issue and assign Copilot in '+r.name+'? A PR will be created only if GitHub Copilot accepts and completes the job.'))return;
  send.disabled=true;
  try{const result=await call('/github/copilot',{id:active.id,repository:r.name,action:'build',prompt,nonce:crypto.randomUUID()});
   setStatus(result.notice+' GitHub issue #'+result.issue+'.');textarea.value='';await loadPrs();
  }catch(e){setStatus('Build request not confirmed: '+e.message)}finally{send.disabled=false;}
 });
 card.append(style,title,summary,connection,account,repo,modes,textarea,send,prlist,status);
 host.append(card);renderMode();void load();
}
