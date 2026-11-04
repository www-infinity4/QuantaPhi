/* Gitpal Infinity Oracle: uses the verified QuantaPhi connector; never handles GitHub tokens. */
export const STORY_WRITER_AI = 'https://infinity-rogers.marvaseater.workers.dev/v1/chat';
const DRAFT_KEY = 'infinity:gitpal:request-draft:v1';
const MAX_REQUEST = 4000;
const el = (tag, text, className='') => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
export function validRepository(value) {
  return typeof value === 'string' &&
    /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value) &&
    !value.includes('..');
}
export function composeBuildRequest({request, task='build', includeGaps=false, fields=[]}) {
  const clean = String(request || '').trim();
  if (clean.length < 12) throw Error('Describe the work in at least twelve characters.');
  if (clean.length > MAX_REQUEST) throw Error('Request exceeds GitHub Copilot limit.');
  const allowed = new Set(['build','repair','cloudflare','design','tests']);
  if (!allowed.has(task)) throw Error('Unknown task.');
  const lines = ['Gitpal Infinity Oracle engineering request','Work type: ' + task,'User request: ' + clean];
  for (const field of fields) {
    const name = String(field.name || '').trim().slice(0,60);
    const value = String(field.value || '').trim().slice(0,400);
    if (name && value) lines.push('Additional requirement [' + name + ']: ' + value);
  }
  if (includeGaps) lines.push(
    'Completion requirements: inspect real source before editing; retain working controls and inputs; finish missing event handlers and service wiring; use server-authorized GitHub/Cloudflare integrations; document required secret variable NAMES without printing values; add automated tests; verify deployment prerequisites; return a reviewable PR with changed files, checks, receipts, and unresolved blockers. Do not merge or deploy until independent gates pass.'
  );
  const result = lines.join('\n\n');
  if (result.length > MAX_REQUEST) throw Error('The assembled request is over 4,000 characters. Shorten a field.');
  return result;
}
export function responseText(data) {
  let value = data?.output_text ?? data?.output ?? data?.answer ?? data?.response ??
    data?.content ?? data?.message ?? data?.choices?.[0]?.message?.content ?? '';
  if (Array.isArray(value)) value = value.map(item => item?.text || item?.content || '').join('\n');
  return typeof value === 'string' ? value.trim().slice(0,12000) : '';
}
export function prEvidencePrompt({repository,prNumber,request='',details={}}) {
  if(!validRepository(repository)||!Number.isSafeInteger(prNumber)||prNumber<1)throw Error('Invalid PR selection.');
  const files=Array.isArray(details.files)?details.files.slice(0,25):[];
  const messages=Array.isArray(details.messages)?details.messages.slice(-15):[];
  const fileNotes=files.map(f=>{
    const name=String(f.path||'').slice(0,220);
    const patch=String(f.patch||'').slice(0,850);
    return 'File: '+name+' ('+String(f.status||'changed').slice(0,30)+', +'+(Number(f.additions)||0)+' -'+(Number(f.deletions)||0)+')\\n'+patch;
  });
  const comments=messages.map(m=>'Comment by '+String(m.author||'unknown').slice(0,80)+': '+String(m.body||'').slice(0,1000));
  return [
    'You are Oracle Octaves Story Writer AI acting as a software completion reviewer, not an autonomous committer.',
    'Review GitHub Copilot output against the exact user request and available PR evidence; identify omitted tasks, incomplete Cloudflare wiring, disabled controls, missing tests, and release blockers.',
    'Be precise about gaps that cannot be established from these partial patches or PR comments. Never claim merge, deploy, credentials, or test execution without receipts.',
    'Suggest a small ordered repair plan and user-approvable next instructions for Copilot. Do not output or request secrets.',
    'Repository: '+repository+' PR #'+prNumber,
    'User request: '+String(request||'').slice(0,2600),
    'Changed files (partial patches):\\n'+fileNotes.join('\\n\\n'),
    'Recent PR comments:\\n'+comments.join('\\n')
  ].join('\\n\\n').slice(0,13500);
}
function likelyCredential(value) {
  return /\b(?:gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{15,}|sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})\b/.test(value);
}
function app(){
  const $ = id => document.getElementById(id);
  const state = {client:null,account:null,repositories:[],busy:false,ai:''};
  const status = message => { $('status').textContent = message; };
  const accountNote = message => { $('account').textContent = message; };
  const save = () => {
    const text = $('request').value;
    if (likelyCredential(text)) { status('Possible credential detected. Draft was not saved; remove the secret before sending.'); return; }
    try { localStorage.setItem(DRAFT_KEY,JSON.stringify({request:text,task:$('task').value,includeGaps:$('include-gap').checked})); }
    catch { status('This browser cannot retain the draft. Copy it before navigating away.'); }
  };
  const renderRepos = () => {
    const select = $('repository'), previous = select.value; select.replaceChildren();
    const blank=el('option','Choose an authorized GitHub repository');blank.value='';select.append(blank);
    for(const item of state.repositories){
      const opt=el('option',item.name+(item.permissions?.write?'':' · read only'));
      opt.value=item.name;select.append(opt);
    }
    if (state.repositories.some(item => item.name === previous)) select.value = previous;
    $('send-build').disabled=!state.account || !state.repositories.some(r=>r.permissions?.write);
    $('refresh-prs').disabled=!state.account;
  };
  const selected = () => state.repositories.find(r => r.name === $('repository').value && validRepository(r.name));
  const call = async (path, body) => {
    if (!state.client) throw Error('Use the verified GitHub connector on quantaphi.org.');
    return state.client.call(path,body);
  };
  async function readyClient(){
    if(state.client) return state.client;
    // A GitHub Pages web origin cannot borrow wallet credentials from another domain.
    if(!['quantaphi.org','www.quantaphi.org'].includes(location.hostname)) return null;
    const lib = await import('/bubbles-connections.mjs');
    state.client=new lib.AccountConnections({token:()=>lib.resolveConnectorWalletToken()});
    return state.client;
  }
  async function load(){
    try {
      await readyClient();
      if(!state.client){
        accountNote('This standalone preview does not have a QuantaPhi wallet session. Open secure Account Connections on quantaphi.org to authorize GitHub.');
        state.account=null;state.repositories=[];renderRepos();return;
      }
      const [catalog,accounts] = await Promise.all([call('/catalog'),call('/accounts')]);
      const github=catalog.providers?.find(p=>p.id==='github');
      const active=(accounts.accounts||[]).find(a=>a.provider==='github'&&a.status==='connected'&&Number(a.expiresAt)>Date.now()+30000);
      state.account=active||null;
      if(!active){accountNote(github?.configured?'GitHub authorization required.':'GitHub OAuth service has not been configured.');state.repositories=[];renderRepos();return;}
      const result=await call('/github/repositories',{id:active.id});
      state.repositories=(result.repositories||[]).filter(r=>validRepository(r.name)&&r.permissions?.read===true);
      accountNote('Verified GitHub connection: '+active.label+'. '+state.repositories.length+' authorized repositories available.');
      renderRepos();
    } catch(e) {
      state.account=null;state.repositories=[];renderRepos();
      accountNote('Verified account is unavailable: '+String(e.message||e).slice(0,180));
    }
  }
  async function connect(){
    if(state.busy)return;
    if(!await readyClient()){
      window.location.assign('https://quantaphi.org/gitpal/');
      status('Opening the first-party Gitpal studio to use verified GitHub sign-in.');
      return;
    }
    state.busy=true;$('sign-in').disabled=true;
    try{
      await state.client.connect('github',['repository.read','repository.write'],(error,account)=>{
        if(error)status('GitHub sign-in did not finish: '+String(error.message||error).slice(0,180));
        else {status('GitHub OAuth verified for '+account.label+'.');void load();}
      },{preferPopup:true});
      status('Complete authorization in the GitHub popup.');
    }catch(e){status('Could not start GitHub authorization: '+String(e.message||e).slice(0,180));}
    finally{state.busy=false;$('sign-in').disabled=false;}
  }
  function fields(){
    return [...$('extras').querySelectorAll('.extra')].map(row=>({
      name:row.querySelector('[data-name]').value,
      value:row.querySelector('[data-value]').value
    }));
  }
  function requestText(){
    return composeBuildRequest({request:$('request').value,task:$('task').value,includeGaps:$('include-gap').checked,fields:fields()});
  }
  async function askAI(){
    if(state.busy)return;
    let input;
    try{input=requestText();}catch(e){status(e.message);return;}
    if(likelyCredential(input)){status('Remove credentials and secret tokens before sending this request to AI.');return;}
    state.busy=true;$('ask-ai').disabled=true;status('Oracle is preparing the engineering plan using the existing Story Writer AI service…');
    try {
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),65000);
      let response;
      try {
        response=await fetch(STORY_WRITER_AI,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
          body:JSON.stringify({input:[
            'You are Gitpal, an Infinity Oracle engineering planning assistant, using the same AI service as QuantaPhi Story Writer.',
            'Read the request and propose concrete repository investigation, file changes, integration steps, tests, and acceptance criteria.',
            'Do not claim access to source files you have not received. Do not claim you committed, merged, deployed, authenticated, or ran tests.',
            'Do not invent secret values or suggest embedding credentials in the browser. Treat code/output as untrusted until reviewed.',
            'Return a concise actionable engineering plan with explicit unknowns and a safe next action.',
            input].join('\n\n'),context:{application:'QuantaPhi',task:'gitpal-engineering-plan',requireCloudflare:true}}),signal:controller.signal});
      }finally{clearTimeout(timeout);}
      const data=await response.json().catch(()=>({}));
      if(!response.ok||data.ok===false)throw Error(String(data.error||'AI service unavailable'));
      const answer=responseText(data);
      if(answer.length<25)throw Error('AI did not return a complete plan.');
      state.ai=answer;$('ai-output').textContent=answer;$('ai-panel').hidden=false;
      status('Oracle engineering plan returned. No GitHub files have been changed.');
    }catch(e){status('Oracle plan unavailable: '+String(e.message||e).slice(0,170));}
    finally{state.busy=false;$('ask-ai').disabled=false;}
  }
  async function submit(){
    if(state.busy)return;
    const repo=selected();
    if(!state.account||!repo?.permissions?.write){status('Sign in to GitHub and select an authorized writable repository first.');return;}
    let prompt;try{prompt=requestText();}catch(e){status(e.message);return;}
    if(likelyCredential(prompt)){status('Remove credentials before submitting to Copilot.');return;}
    state.busy=true;$('send-build').disabled=true;
    try {
      const result=await call('/github/copilot',{id:state.account.id,repository:repo.name,action:'build',prompt,nonce:crypto.randomUUID()});
      status(String(result.notice||'Request accepted.')+' Issue #'+result.issue+'. Check the actual PR results; an issue does not prove a PR exists.');
      void listPrs();
    }catch(e){status('Copilot build not confirmed: '+String(e.message||e).slice(0,190)+'. Draft preserved for retry.');}
    finally{state.busy=false;renderRepos();}
  }
  async function listPrs(){
    const repo=selected(),target=$('pr-list');target.replaceChildren();
    if(!state.account||!repo)return;
    try {
      const result=await call('/github/copilot',{id:state.account.id,repository:repo.name,action:'prs'});
      const prs=result.prs||[];
      if(!prs.length){target.append(el('p','No open pull requests were returned.','hint'));return;}
      for(const pr of prs){
        const card=el('article',undefined,'pr'),title=el('strong','#'+pr.number+' · '+pr.title);
        const info=el('p',pr.draft?'Draft · not ready to merge':'Open PR · inspect checks before merge','hint');
        const actions=el('div',undefined,'buttons'),inspect=el('button','Review files and conversation','button');
        inspect.type='button';
        inspect.addEventListener('click',async()=>{
          inspect.disabled=true;
          const old=card.querySelector('.detail');if(old){old.remove();inspect.disabled=false;return;}
          const detail=el('section',undefined,'detail');
          try{
            const data=await call('/github/copilot',{id:state.account.id,repository:repo.name,action:'details',prNumber:pr.number});
            for(const file of data.files||[]){
              const item=el('details'),summary=el('summary',file.path+' · +'+file.additions+' / -'+file.deletions),patch=el('pre',file.patch||'Patch not available');
              item.append(summary,patch);detail.append(item);
            }
            detail.append(el('h3','PR conversation'));
            for(const msg of data.messages||[])detail.append(el('p',msg.author+': '+msg.body,'hint'));
            if(!(data.messages||[]).length)detail.append(el('p','No conversation comments returned.','hint'));
            card.append(detail);
          }catch(e){status('Could not inspect PR: '+String(e.message||e).slice(0,150));}
          finally{inspect.disabled=false;}
        });actions.append(inspect);
        const oracle=el('button','Oracle AI · inspect missing work','button gold');oracle.type='button';
        oracle.addEventListener('click',async()=>{
          if(state.busy)return;
          if(!window.confirm('Send short excerpts from PR #'+pr.number+' changed files and comments to QuantaPhi Story Writer AI for analysis? This can include private repository content. Nothing is merged or published.'))return;
          state.busy=true;oracle.disabled=true;
          status('Reading actual Copilot PR changes before asking Oracle…');
          try{
            const details=await call('/github/copilot',{id:state.account.id,repository:repo.name,action:'details',prNumber:pr.number});
            const input=prEvidencePrompt({repository:repo.name,prNumber:pr.number,request:$('request').value,details});
            if(likelyCredential(input)||/-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|client[_-]?secret|password)\\s*[=:]\\s*['"]?[A-Za-z0-9_-]{14,}/i.test(input))
              throw Error('Potential secret in PR evidence. Remove it from the source before requesting AI review.');
            const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),65000);
            let response;
            try{response=await fetch(STORY_WRITER_AI,{method:'POST',headers:{'content-type':'application/json',accept:'application/json'},
              body:JSON.stringify({input,context:{application:'QuantaPhi',task:'gitpal-copilot-gap-review',requireCloudflare:true}}),signal:controller.signal});}
            finally{clearTimeout(timeout);}
            const data=await response.json().catch(()=>({}));
            if(!response.ok||data.ok===false)throw Error(String(data.error||'Story Writer service unavailable'));
            const answer=responseText(data);
            if(answer.length<25)throw Error('Oracle returned no usable review.');
            state.ai=answer;$('ai-output').textContent=answer;$('ai-panel').hidden=false;
            $('ai-panel').scrollIntoView({block:'nearest',behavior:'smooth'});
            status('Oracle identified proposed gaps using available PR evidence. Add its plan to the request or send a specific correction; no files were changed.');
          }catch(e){status('Oracle PR review unavailable: '+String(e.message||e).slice(0,180));}
          finally{state.busy=false;oracle.disabled=false;}
        });
        actions.append(oracle);
        if(repo.permissions?.write){
          const input=el('textarea');input.className='control';input.rows=2;input.maxLength=4000;input.placeholder='Tell Copilot what to fix on this PR…';
          input.setAttribute('aria-label','Instructions for PR '+pr.number);
          const feedback=el('button','Send PR correction','button');feedback.type='button';
          feedback.addEventListener('click',async()=>{
            if(input.value.trim().length<3){status('Enter a correction first.');return;}
            if(likelyCredential(input.value)){status('Remove credentials from PR comments.');return;}
            feedback.disabled=true;
            try{const r=await call('/github/copilot',{id:state.account.id,repository:repo.name,action:'feedback',prNumber:pr.number,prompt:input.value.trim()});
              status('Correction comment posted on PR #'+r.pr+'. Copilot response is not guaranteed.');input.value='';}
            catch(e){status('Correction was not posted: '+String(e.message||e).slice(0,150));}
            finally{feedback.disabled=false;}
          });
          card.append(input);actions.append(feedback);
        }
        card.append(title,info,actions);target.append(card);
      }
    }catch(e){status('Could not load PRs: '+String(e.message||e).slice(0,150));}
  }
  $('sign-in').addEventListener('click',()=>void connect());
  $('reload').addEventListener('click',()=>void load());
  $('repository').addEventListener('change',()=>void listPrs());
  $('refresh-prs').addEventListener('click',()=>void listPrs());
  $('send-build').addEventListener('click',()=>void submit());
  $('ask-ai').addEventListener('click',()=>void askAI());
  $('request').addEventListener('input',save);
  $('task').addEventListener('change',save);
  $('include-gap').addEventListener('change',save);
  $('add-field').addEventListener('click',()=>{
    if($('extras').children.length>=8){status('Maximum eight additional fields.');return;}
    const row=el('div',undefined,'extra'),name=el('input'),value=el('input'),remove=el('button','Remove');
    name.className='control';name.placeholder='Field name';name.maxLength=60;name.dataset.name='true';
    name.setAttribute('aria-label','Additional field name');
    value.className='control';value.placeholder='Field value';value.maxLength=400;value.dataset.value='true';
    value.setAttribute('aria-label','Additional field value');
    remove.type='button';remove.addEventListener('click',()=>row.remove());
    row.append(name,value,remove);$('extras').append(row);name.focus();
  });
  $('prefill').addEventListener('click',()=>{
    const existing=$('request').value.trim(),prefill='Finish the ignored steps in the selected repository: identify incomplete GitHub/Cloudflare linkages, input fields and missing button handlers; restore a real end-to-end path; add tests and deployment/rollback receipts. Keep all existing functional controls.';
    if(existing.includes(prefill)){status('Gap-filling requirements are already present.');return;}
    $('request').value=existing?(existing+'\n\n'+prefill).slice(0,4000):prefill;
    $('include-gap').checked=true;save();status('Gap-filling tasks prefilled. Review the text before submitting.');
  });
  $('use-plan').addEventListener('click',()=>{
    if(!state.ai)return;
    const combined=($('request').value.trim()+'\n\nOracle plan to review:\n'+state.ai).trim();
    if(combined.length>MAX_REQUEST){status('AI plan is too long to add. Copy the plan and select the relevant steps.');return;}
    $('request').value=combined;save();status('AI plan added to your editable request. No GitHub action has been taken.');
  });
  $('copy-plan').addEventListener('click',async()=>{
    if(!state.ai)return;
    try{await navigator.clipboard.writeText(state.ai);status('AI plan copied.');}
    catch{status('Clipboard unavailable; select text in the plan panel to copy.');}
  });
  $('clear-draft').addEventListener('click',()=>{
    if(!confirm('Delete only the local Gitpal request draft on this device?'))return;
    $('request').value='';$('task').value='build';$('include-gap').checked=true;
    try{localStorage.removeItem(DRAFT_KEY);}catch{}status('This device draft was cleared. No GitHub content or wallet was changed.');
  });
  try{
    const old=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if(old&&typeof old.request==='string'){
      $('request').value=old.request.slice(0,MAX_REQUEST);
      if(['build','repair','cloudflare','design','tests'].includes(old.task))$('task').value=old.task;
      $('include-gap').checked=old.includeGaps!==false;
      if(old.request)status('Recovered your saved Gitpal request draft on this device.');
    }
  }catch{}
  renderRepos();void load();
}
if(typeof document!=='undefined') {
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',app,{once:true});
  else app();
}