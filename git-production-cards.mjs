import {AccountConnections,resolveConnectorWalletToken} from './bubbles-connections.mjs';
import {GIT_APP_CARDS,GIT_PRODUCTION_CHAIN,gitRepoUrl,gitCardRoute,nextGitStage,mergedLinePreview} from './git-production-core.mjs';
const node=(tag,cls,label)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(label!==undefined)x.textContent=label;return x};
const css='.igf{background:#fff;border:1px solid #d9e1e9;border-radius:18px;padding:15px;color:#1a2c3e;display:grid;gap:10px;font:inherit}.igf .igf-eyebrow{font-size:.78rem;color:#2861a0;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.igf h3{margin:0;font-size:1.3rem}.igf p{margin:0;line-height:1.5}.igf .igf-muted{color:#526579;font-size:.93rem}.igf select,.igf textarea,.igf button{font:inherit}.igf select,.igf textarea{width:100%;box-sizing:border-box;background:#fff;color:#152f4b;border:1px solid #a9bbcc;border-radius:10px;padding:10px}.igf textarea{min-height:75px;resize:vertical}.igf .igf-actions{display:flex;flex-wrap:wrap;gap:8px}.igf button,.igf .igf-button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;text-decoration:none;cursor:pointer;background:#eaf3ff;color:#123e71;font-weight:750;border:1px solid #bfd2e6;border-radius:11px;padding:9px 12px}.igf button.primary,.igf .primary{background:#1762b6;color:#fff;border-color:#1762b6}.igf button:disabled{opacity:.55;cursor:not-allowed}.igf .igf-result{border-top:1px solid #d8e3ed;padding-top:10px;white-space:pre-wrap;overflow-wrap:anywhere}.igf .igf-evidence{border:1px solid #dce6ee;border-radius:11px;padding:10px;max-height:310px;overflow:auto;overflow-wrap:anywhere}.igf .igf-evidence pre{white-space:pre-wrap;font-size:.79em}.igf a{color:#1258a2;overflow-wrap:anywhere}.igf :is(button,textarea,select,a):focus-visible{outline:3px solid #e7a031;outline-offset:2px}';
function stageCard(stage,mountTools){
 const item=node('article','iqc-card');item.dataset.sourceId=stage.id;item.dataset.sourceName=stage.name;
 item.dataset.sourceReady='true';item.dataset.official=gitRepoUrl(stage.repo);
 const card={id:stage.id,name:stage.name,kind:'Development · Infinity Git',feature:stage.role,
  official:gitRepoUrl(stage.repo),featureUrl:gitRepoUrl(stage.repo),focus:stage.role,details:stage.role};
 const root=node('section','igf'),eyebrow=node('p','igf-eyebrow',stage.order?'Infinity production · step '+stage.order+' of '+GIT_PRODUCTION_CHAIN.length:'Infinity Git · standalone tool');
 root.setAttribute('aria-label',stage.name+' interactive production card');
 root.append(eyebrow,node('h3','',stage.name),node('p','igf-muted',stage.role));
 const links=node('div','igf-actions'),original=node('a','igf-button','Source repository');
 original.href=card.official;original.target='_blank';original.rel='noopener noreferrer';links.append(original);
 const next=nextGitStage(stage.id);
 if(next){const step=node('a','igf-button primary','Next: '+next.name);step.href=gitCardRoute(next.id);step.dataset.gitNext=next.id;links.append(step);}
 root.append(links);
 const status=node('p','igf-result','Use your verified GitHub connection to load real PRs and build evidence.');
 status.setAttribute('role','status');
 const sign=node('button','primary','Sign in with GitHub');
 const connect=node('button','','Load my GitHub work'),reload=node('button','','Refresh work');
 sign.type=connect.type=reload.type='button';
 const buttons=node('div','igf-actions');buttons.append(sign,connect,reload);
 const repos=node('select','');repos.setAttribute('aria-label','Choose authorized repository');
 const prs=node('select','');prs.setAttribute('aria-label','Choose pull request');prs.append(node('option','','No PRs loaded'));
 const selectIssue=node('select','');selectIssue.setAttribute('aria-label','Choose original Copilot build request');
 const show=node('button','','Inspect PR evidence');show.type='button';
 const action=node('div','igf-actions');action.append(show);
 const input=node('textarea','');input.maxLength=4000;input.placeholder='Add your own instructions or repairs here…';input.setAttribute('aria-label',stage.name+' instructions');
 const feedback=node('button','','Post instructions on PR');feedback.type='button';
 const handoff=node('button','','Prepare Bubbles evidence handoff');handoff.type='button';
 const aiReview=node('button','','AI audit · Gemini → Claude');aiReview.type='button';
 const aiResult=node('div','igf-evidence');aiResult.hidden=true;aiResult.setAttribute('aria-live','polite');
 const merge=node('button','primary','Check gates & merge PR');merge.type='button';
 const evidence=node('div','igf-evidence');evidence.setAttribute('aria-live','polite');
 const draft=node('textarea','');draft.setAttribute('aria-label','Bubbles review packet');draft.hidden=true;draft.rows=6;
 const copy=node('button','','Copy review packet');copy.type='button';copy.hidden=true;
 const handoffLink=node('a','igf-button','Open Bubbles for review');handoffLink.href='/bubbles.html';handoffLink.hidden=true;
 const lineButton=node('button','primary','Check verified merged lines');lineButton.type='button';
 let client=null,active=null,authorized=[],prRecords=[],issueRecords=[],lastDetails=null,loading=false;
 let selectionVersion=0,evidenceSource=null;
 const params=typeof location!=='undefined'?new URLSearchParams(location.search):new URLSearchParams();
 const preferredRepo=params.get('repo'),preferredPr=Number(params.get('pr'));
 const call=async(path,body)=>{if(!client)client=new AccountConnections({token:()=>resolveConnectorWalletToken()});return client.call(path,body)};
 const selectedRepo=()=>authorized.find(r=>r.name===repos.value);
 const selectedPr=()=>Number(prs.value)||0;
 const setStatus=s=>{status.textContent=String(s).slice(0,1100)};
 const selectedIssue=()=>issueRecords.find(i=>i.number===Number(selectIssue.value));
 const setNextContext=()=>{
  const destination=links.querySelector('[data-git-next]');
  if(destination)destination.href=gitCardRoute(next.id,repos.value,selectedPr());
 };
 const appendLine=(text,tag='p')=>evidence.append(node(tag,'',text));
 function clear(){evidence.replaceChildren();lastDetails=null;evidenceSource=null;draft.hidden=true;copy.hidden=true;handoffLink.hidden=true;}
 function showEvidence(details,selection){
  clear();lastDetails=details;evidenceSource=selection;
  appendLine('Verified GitHub PR #'+details.pr,'strong');
  if(details.description)appendLine('PR description: '+details.description);
  appendLine('Files changed: '+(details.files||[]).length);
  for(const f of details.files||[]){const block=node('details',''),head=node('summary','',f.path+' · +'+f.additions+' / -'+f.deletions);block.append(head);
   block.append(node('pre','',f.patch||'Diff unavailable'));evidence.append(block);}
  appendLine('Conversation: '+(details.messages||[]).length+' messages','strong');
  for(const m of details.messages||[])appendLine(m.author+': '+m.body);
  if(stage.mode==='requirements'){
   const issue=selectedIssue();
   appendLine(issue?'Original Copilot issue #'+issue.number+': '+issue.instruction:
     'Original instruction not selected. Compare with the verified Copilot issue before marking anything complete.');
   appendLine('A file list alone is not a semantic AI audit. Ask Bubbles to compare the request, tests, and actual deployed behavior.');
  }
  if(stage.id==='gitpub')appendLine('GitHub merge alone is not deployment proof. Check Cloudflare or GitHub Pages deployment receipts separately.');
 }
 async function loadPRs(){
  const version=++selectionVersion,r=selectedRepo();prs.replaceChildren();prRecords=[];clear();
  if(!active||!r){prs.append(node('option','','No authorized repository'));return;}
  const accountId=active.id;
  const result=await call('/github/copilot',{id:accountId,repository:r.name,action:'prs'});
  if(version!==selectionVersion||!active||active.id!==accountId||repos.value!==r.name)return;
  prRecords=result.prs||[];
  for(const p of prRecords){const option=node('option','', '#'+p.number+' · '+p.title+(p.draft?' [DRAFT]':''));option.value=String(p.number);prs.append(option);}
  if(!prRecords.length)prs.append(node('option','','No open PRs'));
  if(prRecords.some(p=>p.number===preferredPr))prs.value=String(preferredPr);
  setNextContext();
 }
 async function loadIssues(){
  if(!active||!selectedRepo())return;
  const version=selectionVersion,repoName=repos.value,accountId=active.id;
  const result=await call('/github/copilot',{id:accountId,repository:repoName,action:'issues'});
  if(version!==selectionVersion||!active||active.id!==accountId||repos.value!==repoName)return;
  issueRecords=result.issues||[];selectIssue.replaceChildren();
  for(const issue of issueRecords){const option=node('option','', '#'+issue.number+' · '+issue.title);option.value=String(issue.number);selectIssue.append(option);}
  if(!issueRecords.length)selectIssue.append(node('option','','No Infinity Copilot issues found'));
 }
 async function load(){
  if(loading)return;loading=true;connect.disabled=true;reload.disabled=true;sign.disabled=true;setStatus('Checking your existing GitHub authorization…');
  try{
   const [catalog,accounts]=await Promise.all([call('/catalog'),call('/accounts')]);
   const gh=catalog.providers?.find(p=>p.id==='github');
   active=(accounts.accounts||[]).find(a=>a.provider==='github'&&a.status==='connected'&&a.expiresAt>Date.now()+30000)||null;
   sign.textContent=active?'Reconnect GitHub':'Sign in with GitHub';
   sign.dataset.available=String(gh?.configured===true);
   if(!active){authorized=[];repos.replaceChildren();prs.replaceChildren();setStatus(gh?.configured?'Use Sign in with GitHub here to authorize this card in a popup.':'GitHub authorization connector not configured.');return;}
   const result=await call('/github/repositories',{id:active.id});
   authorized=(result.repositories||[]).filter(r=>r.permissions?.read);
   repos.replaceChildren();for(const r of authorized){const o=node('option','',r.name+(r.permissions?.write?'':' · read only'));o.value=r.name;repos.append(o);}
   if(authorized.some(r=>r.name===preferredRepo))repos.value=preferredRepo;
   if(!authorized.length){setStatus('No authorized repositories. Grant the GitHub installation access to the repository.');return;}
   await loadPRs();
   if(stage.mode==='requirements')await loadIssues();
   setStatus('GitHub verified. Choose the repository and a PR; actions use its account-scoped permission checks.');
  }catch(e){setStatus('GitHub read unavailable: '+(e.message||e));}
  finally{loading=false;connect.disabled=false;reload.disabled=false;sign.disabled=sign.dataset.available!=='true';}
 }
 sign.addEventListener('click',async()=>{
  if(loading)return;
  sign.disabled=true;
  try{
   if(!client)client=new AccountConnections({token:()=>resolveConnectorWalletToken()});
   await client.connect('github',['repository.read','repository.write'],(error,account)=>{
    if(error)setStatus('GitHub sign-in did not finish: '+String(error.message||error).slice(0,180));
    else{setStatus('Verified GitHub account: '+account.label);void load();}
   },{preferPopup:true});
   setStatus('Complete GitHub authorization in the popup; this Quick Card stays open.');
  }catch(e){setStatus('GitHub popup unavailable: '+String(e.message||e).slice(0,180));}
  finally{sign.disabled=false;}
 });
 connect.addEventListener('click',()=>void load());reload.addEventListener('click',()=>void load());
 repos.addEventListener('change',async()=>{selectionVersion++;clear();setNextContext();try{await loadPRs();if(stage.mode==='requirements')await loadIssues();}catch(e){setStatus(e.message)}});
 prs.addEventListener('change',()=>{selectionVersion++;clear();setNextContext()});
 show.addEventListener('click',async()=>{
  if(!selectedRepo()||!selectedPr()){setStatus('Load your account and select an existing PR.');return;}
  const selection={account:active.id,repo:repos.value,pr:selectedPr(),version:selectionVersion};
  show.disabled=true;try{
   const details=await call('/github/copilot',{id:selection.account,repository:selection.repo,action:'details',prNumber:selection.pr});
   if(selection.version!==selectionVersion||active?.id!==selection.account||repos.value!==selection.repo||selectedPr()!==selection.pr){setStatus('Repository or PR changed; stale evidence discarded.');return;}
   showEvidence(details,selection);setStatus('Read-only GitHub PR evidence loaded.');}
  catch(e){setStatus('Could not inspect PR: '+e.message)}finally{show.disabled=false;}
 });
 feedback.addEventListener('click',async()=>{
  const r=selectedRepo(),prompt=input.value.trim();
  if(!active||!r?.permissions?.write||!selectedPr()||prompt.length<3){setStatus('Writable repository, PR and at least three characters are required.');return;}
  if(!window.confirm('Post these instructions as a public or repository-visible @copilot PR comment?'))return;
  feedback.disabled=true;try{
   const receipt=await call('/github/copilot',{id:active.id,repository:r.name,action:'feedback',prNumber:selectedPr(),prompt});
   setStatus('Posted PR comment #'+receipt.commentId+'. No automatic Copilot reply or completed change has been verified.');input.value='';
  }catch(e){setStatus('Instructions not posted: '+e.message)}finally{feedback.disabled=false;}
 });
 merge.addEventListener('click',async()=>{
  const r=selectedRepo(),pr=selectedPr();
  if(!active||!r?.permissions?.write||!pr){setStatus('A writable repository and PR are required.');return;}
  const confirmation='MERGE '+r.name+'#'+pr;
  if(window.prompt('Type '+confirmation+' to run independent review and CI gates before merging:')!==confirmation){setStatus('Merge cancelled.');return;}
  merge.disabled=true;try{
   const receipt=await call('/github/copilot',{id:active.id,repository:r.name,action:'merge',prNumber:pr,confirmation});
   setStatus('GitHub confirmed PR #'+receipt.pr+' merged at '+receipt.commit+'. Deployment has not been verified.');
   await loadPRs();
  }catch(e){setStatus('Merge blocked: '+e.message)}finally{merge.disabled=false;}
 });
 aiReview.addEventListener('click',()=>{
  const issue=selectedIssue();
  if(!lastDetails||!evidenceSource||evidenceSource.account!==active?.id||evidenceSource.repo!==repos.value||evidenceSource.pr!==selectedPr()||evidenceSource.version!==selectionVersion){setStatus('Inspect the selected PR again before requesting an AI audit.');return;}
  if(stage.mode==='requirements'&&!issue){setStatus('Select the original Copilot issue to compare against the PR.');return;}
  const question=[
   'Read-only Gitpal completion audit. Do not claim to have run code or deployment steps.',
   'Requested task: '+String(issue?.instruction||input.value||'not provided').slice(0,1700),
   'Repository: '+repos.value+'; PR #'+lastDetails.pr,
   'PR description: '+String(lastDetails.description||'').slice(0,500),
   'Changed files: '+(lastDetails.files||[]).slice(0,30).map(f=>f.path+' +'+f.additions+' -'+f.deletions).join('; ').slice(0,550),
   'Selected patch excerpts (partial): '+(lastDetails.files||[]).filter(f=>f.patch).slice(0,6).map(f=>f.path+'\\n'+f.patch.slice(0,260)).join('\\n').slice(0,1000),
   'Compare intended deliverables to observable changes. Separate verified evidence, missing work and Cloudflare tasks for Bubbles. Never treat this as execution approval.'
  ].join('\n').slice(0,3900);
  if(!window.confirm('Send this selected GitHub issue and file-summary evidence to Bubbles’ verified Gemini → Claude consultation? It may go to those AI providers.'))return;
  aiReview.disabled=true;aiResult.hidden=false;aiResult.textContent='Asking the existing verified Bubbles AI consultation…';
  const detail={question,mode:'gemini_claude_review',respond:value=>{
   aiReview.disabled=false;aiResult.textContent=String(value||'No verified review returned.').slice(0,7000);
  }};
  const accepted=!window.dispatchEvent(new CustomEvent('bubbles:ai-consult',{cancelable:true,detail}));
  if(accepted){setStatus('AI review accepted by Bubbles. Recommendations do not authorize code, merge or deployment.');}
  else {aiReview.disabled=false;aiResult.textContent='Verified Bubbles AI consultation is not active in this view. Use the handoff packet to continue in Bubbles.';}
 });
 handoff.addEventListener('click',()=>{
  const pr=selectedPr(),issue=selectedIssue();
  const lines=['Infinity production evidence handoff · '+stage.name,
   'GitHub repository: '+(repos.value||'not selected'),
   'PR: '+(pr?'#'+pr:'not selected'),
   'Source: '+(pr&&repos.value?'https://github.com/'+repos.value+'/pull/'+pr:'unavailable'),
   'Original Copilot request: '+(issue?'Issue #'+issue.number+' '+issue.instruction:'not yet fetched / selected'),
   'PR description: '+(lastDetails?.description||'not yet fetched'),
   'Changed files: '+(lastDetails?.files||[]).map(f=>f.path+' +'+f.additions+' -'+f.deletions).join('; '),
   'My additional instructions: '+(input.value.trim()||'none'),
   'Task: Compare requested outcome against actual code, tests, and Cloudflare requirements. Flag unfinished steps. Do not claim deployments or merges without authentic tool receipts.'];
  draft.value=lines.join('\n');draft.hidden=false;copy.hidden=false;handoffLink.hidden=false;
  setStatus('Review packet prepared. Copy it into Bubbles; no unverified background bot job was submitted.');
 });
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(draft.value);setStatus('Review packet copied. Open Bubbles and paste it into the message box.');}
  catch{draft.focus();draft.select();setStatus('Select and copy the packet above, then open Bubbles.');}
 });
 lineButton.addEventListener('click',async()=>{
  if(!active||!selectedRepo()){setStatus('Load an authorized GitHub repository to inspect merged code.');return;}
  lineButton.disabled=true;clear();
  try{
   const result=await call('/github/copilot',{id:active.id,repository:repos.value,action:'merged'});
   const preview=mergedLinePreview(result);
   appendLine(preview.total.toLocaleString()+' eligible merged code lines · '+preview.merges+' recent verified PRs','strong');
   appendLine(preview.note);
   appendLine(preview.partial?'This is only a bounded sample; not a lifetime count.':'Recent GitHub merge evidence reviewed; not a wallet credit.');
   for(const m of result.merges||[]){const a=node('a','','PR #'+m.number+' · '+m.eligibleAddedLines+' lines · '+m.mergedAt);
    if(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/pull\/\d+$/.test(m.url||'')){a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';evidence.append(a);}
   }
   setStatus('Gitcoin wallet is not yet linked to a verified, idempotent merge-based mint ledger. No Gits were issued.');
  }catch(e){setStatus('Merged-line evidence unavailable: '+e.message)}finally{lineButton.disabled=false;}
 });
 const selection=node('div','');selection.append(node('label','','Authorized GitHub repository'),repos,node('label','','Pull request'),prs);
 root.append(buttons,selection);
 if(stage.mode==='requirements')root.append(node('label','','Original Copilot issue'),selectIssue);
 if(stage.mode==='merged')root.append(lineButton);
 else root.append(action);
 root.append(evidence);
 if(stage.mode!=='merged'){const writes=node('div','igf-actions');writes.append(feedback,handoff);
  if(stage.mode==='merge')writes.append(merge);
  if(stage.mode==='requirements')writes.append(aiReview);
  root.append(node('label','','User instructions / missing work'),input,writes,aiResult,draft,copy,handoffLink);}
 root.append(status);
 item.append(root);
 if(typeof mountTools==='function'){const tools=node('div','iqc-inline-tools');mountTools(tools,card);item.append(tools);}
 return item;
}
export function mountGitProductionCards(grid,mountTools){
 if(!grid)return [];
 if(!document.getElementById('gitProductionCardsStyle')){const style=node('style','');style.id='gitProductionCardsStyle';style.textContent=css;document.head.append(style);}
 const entries=GIT_APP_CARDS.map(stage=>stageCard(stage,mountTools));
 for(const card of entries)grid.append(card);
 return entries;
}
