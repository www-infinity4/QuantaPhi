/* Claude steward card. Type to Claude on any page that loads this file.
 * Owner-only: it uses the page's existing QuantaBrainOwner session, sends
 * only what you type plus (for "Fix yourself") the last few Bubbles chat
 * lines, and keeps its own history in sessionStorage on this device. */
(function(root){
'use strict';
if(root.ClaudeSteward)return;
const URL_STEWARD=root.CLAUDE_STEWARD_URL||'https://infinity-rogers.marvaseater.workers.dev/v1/claude/steward';
const KEY='claude-steward:v1';
let turns=[];
try{turns=JSON.parse(root.sessionStorage?.getItem(KEY)||'[]').slice(-24);}catch{}
let ui=null,busy=false;
const save=()=>{try{root.sessionStorage?.setItem(KEY,JSON.stringify(turns.slice(-24)));}catch{}};
const jsonSafe=v=>JSON.stringify(v).replace(/'/g,'\\u0027');
// Termux-safe surgical patch script: verifies one match, patches, commits to a branch.
function patchScript(patches,stamp){
 const by={};for(const p of patches||[])(by[p.repository]=by[p.repository]||[]).push(p);
 const stampText=stamp||new Date().toISOString().replace(/\D/g,'').slice(0,12);
 let n=0,out='set -eu\n';
 if(Object.keys(by).length>1)throw Error('mixed_repositories_require_separate_review');
 for(const [repo,list] of Object.entries(by)){
  const name=repo.split('/')[1];n++;
  out+='cd "${'+name.replace(/\W/g,'_').toUpperCase()+'_DIR:-$HOME/'+name+'}" || exit 1\n'+
   '[ "$(basename "$(git rev-parse --show-toplevel)")" = "'+name+'" ] || { echo "WRONG REPO"; exit 1; }\n'+
   '[ -z "$(git status --porcelain)" ] || { echo "DIRTY REPO — commit or stash your existing work before patching"; exit 1; }\n'+
   'git checkout -b claude-fix-'+stampText+' || exit 1\npython3 - <<\'ENDPY\' || exit 1\nimport json,pathlib\n'+
   'def patch(path,old,new):\n    p=pathlib.Path(path);s=p.read_text()\n    assert s.count(old)==1,"no unique match: "+path\n    p.write_text(s.replace(old,new,1));print("patched",path)\n'+
   list.map(p=>'patch(json.loads(r\'\'\''+jsonSafe(p.path)+'\'\'\'),json.loads(r\'\'\''+jsonSafe(p.old_str)+'\'\'\'),json.loads(r\'\'\''+jsonSafe(p.new_str)+'\'\'\'))').join('\n')+
   '\nENDPY\necho "patch applied ✓"\n'+
   'git remote set-url origin https://github.com/'+repo+'.git\n'+
   'git add -- '+list.map(p=>p.path).join(' ')+' && git commit -m "Claude steward fix" && gh auth setup-git && git push origin HEAD && echo "ALL DONE ✓ (branch claude-fix-'+stampText+' pushed, open a PR)"\n';
 }
 return out;
}
async function ownerHeaders(){
 const b=root.QuantaBrainOwner;
 if(!b)throw Error('No owner session on this page. Open quantaphi.org/bubbles.html.');
 const now=typeof b.currentHeaders==='function'?b.currentHeaders():null;
 const waited=now||await Promise.race([b.ready,new Promise(r=>setTimeout(()=>r(null),10000))]);
 const h=typeof b.currentHeaders==='function'?b.currentHeaders():waited;
 if(!h?.Authorization)throw Error('Owner wallet not verified yet.');
 return h;
}
async function call(text,mode,evidence){
 const headers=await ownerHeaders();
 // Size the actual UTF-8 HTTP body, dropping old history before rejecting a turn.
 const messages=[...turns.slice(-11),{role:'user',text}];
 const encode=()=>JSON.stringify({mode,messages,evidence});
 let body=encode();
 while(new TextEncoder().encode(body).length>27000&&messages.length>1){
  messages.shift();body=encode();
 }
 if(new TextEncoder().encode(body).length>27000)throw Error('steward_request_too_large');
 // Android 12 WebViews do not all implement AbortSignal.timeout.
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),110000);
 try{
  const res=await fetch(URL_STEWARD,{method:'POST',headers:{...headers,'Content-Type':'application/json'},
   body,signal:controller.signal});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||!data.ok)throw Error(String(data.error||('steward_http_'+res.status)));
  return data;
 }finally{clearTimeout(timer);}
}
function el(tag,css,text){const e=document.createElement(tag);if(css)e.style.cssText=css;if(text!==undefined)e.textContent=text;return e;}
function bubble(role,text){
 if(!ui)return null;
 const b=el('div','margin:6px 0;padding:8px 10px;border-radius:10px;white-space:pre-wrap;word-break:break-word;font-size:15px;line-height:1.4;max-width:92%;'+
  (role==='you'?'background:#2d4a7a;margin-left:auto;':'background:#2a2a32;'),text);
 ui.log.append(b);ui.log.scrollTop=ui.log.scrollHeight;return b;
}
function showPatches(data){
 if(!ui||!data.patches?.length)return;
 const box=el('div','margin:6px 0;padding:8px;border:1px solid #556;border-radius:10px;font-size:14px;');
 box.append(el('div','font-weight:600;margin-bottom:4px;',data.patches.length+' verified patch'+(data.patches.length>1?'es':'')+' (not applied)'));
 for(const p of data.patches)box.append(el('div','opacity:.85;margin:2px 0;word-break:break-word;',p.path+' — '+p.why));
 const copy=el('button','min-height:44px;margin-top:6px;padding:8px 12px;border-radius:8px;border:0;background:#3a7bd5;color:#fff;font-size:15px;','Copy Termux patch script');
 copy.type='button';
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(patchScript(data.patches));copy.textContent='Copied ✓ paste in Termux';}
  catch{copy.textContent='Copy blocked here';}
 });
 box.append(copy);ui.log.append(box);ui.log.scrollTop=ui.log.scrollHeight;
}
async function ask(text,{mode='chat',evidence,inline=false}={}){
 const clean=String(text||'').trim().slice(0,3000);
 if(!clean||busy)return null;
 busy=true;mount();if(!inline)open();
 if(!inline)bubble('you',clean);if(ui&&!inline)ui.send.disabled=true;
 const wait=inline?null:bubble('claude','Claude is looking…');
 let data=null;
 try{
  const diagnostic=mode==='fix'||/what is broken|look at the recent bubbles chat/i.test(clean);
  const ev=evidence??(diagnostic&&typeof root.__bubblesRecentMessages==='function'?root.__bubblesRecentMessages():[]);
  data=await call(clean,mode,ev);
  turns.push({role:'user',text:clean},{role:'assistant',text:data.reply});turns=turns.slice(-24);save();
  if(wait)wait.textContent=data.reply;
  if(!inline&&data.tickets?.length)for(const ticket of data.tickets){
   const state=String(ticket.status||'unknown');
   const intro=ticket.deduplicated?'Existing ticket':'Ticket recorded';
   const next=state==='draft'?'Awaiting owner-reviewed plan.':'Inspect its existing state before any further action.';
   bubble('claude',intro+' '+ticket.id+' · '+state+'. '+next);
  }
  if(data.partial&&!inline)bubble('claude','Claude stopped before finishing. Saved proposals and ticket receipts remain available; no code was applied.');
  showPatches(data);
 }catch(e){if(wait)wait.textContent='Claude response not confirmed: '+String(e.message||e).slice(0,160)+'. Check existing Brain tickets before retrying; delivery status is unknown.';}
 busy=false;if(ui&&!inline)ui.send.disabled=false;
 return data;
}
function open(){if(ui){ui.panel.style.display='flex';}}
function mount(){
 if(ui||!document.body)return;
 const launch=el('button','position:fixed;left:12px;bottom:12px;z-index:2147483000;min-width:48px;min-height:48px;border-radius:24px;border:0;background:#c96442;color:#fff;font-size:15px;font-weight:600;padding:0 14px;box-shadow:0 2px 10px #0006;','Claude');
 launch.type='button';launch.setAttribute('aria-label','Open Claude');
 const panel=el('div','display:none;position:fixed;left:8px;right:8px;bottom:68px;max-width:430px;height:min(70vh,560px);z-index:2147483000;background:#17171c;color:#eee;border-radius:14px;box-shadow:0 4px 24px #000a;flex-direction:column;font-family:system-ui,sans-serif;');
 const head=el('div','display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #333;font-weight:600;','Claude · Bubbles steward');
 const close=el('button','min-width:44px;min-height:44px;background:none;border:0;color:#eee;font-size:20px;','×');close.type='button';close.setAttribute('aria-label','Close');
 head.append(close);
 const log=el('div','flex:1;overflow-y:auto;padding:8px 10px;');
 const chips=el('div','display:flex;gap:6px;padding:4px 10px;flex-wrap:wrap;');
 const chip=(label,text,mode)=>{const c=el('button','min-height:40px;padding:4px 10px;border-radius:16px;border:1px solid #556;background:#22222a;color:#eee;font-size:14px;',label);c.type='button';c.addEventListener('click',()=>void ask(text,{mode}));return c;};
 chips.append(chip('Fix yourself','Fix yourself. Find what Bubbles is getting wrong and prepare the fix.','fix'),
  chip('What is broken?','Look at the recent Bubbles chat and tell me what Bubbles is getting wrong.','chat'));
 const row=el('div','display:flex;gap:6px;padding:8px 10px;border-top:1px solid #333;');
 const input=el('textarea','flex:1;min-height:44px;max-height:110px;border-radius:8px;border:1px solid #556;background:#0f0f13;color:#eee;padding:8px;font-size:16px;resize:none;');
 input.placeholder='Type to Claude…';input.rows=1;
 const send=el('button','min-width:64px;min-height:44px;border-radius:8px;border:0;background:#3a7bd5;color:#fff;font-size:15px;','Send');send.type='button';
 row.append(input,send);panel.append(head,log,chips,row);
 document.body.append(launch,panel);
 ui={launch,panel,log,input,send};
 const go=()=>{const t=input.value.trim();if(t){input.value='';void ask(t,{mode:/^fix yourself\b/i.test(t)?'fix':'chat'});}};
 send.addEventListener('click',go);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go();}});
 launch.addEventListener('click',()=>{panel.style.display=panel.style.display==='none'?'flex':'none';});
 close.addEventListener('click',()=>{panel.style.display='none';});
 for(const t of turns)bubble(t.role==='user'?'you':'claude',t.text);
}
root.ClaudeSteward={ask,open:()=>{mount();open();},patchScript};
root.addEventListener('bubbles:claude-steward',e=>{const d=e?.detail;if(d?.text)void ask(d.text,{mode:d.mode==='fix'?'fix':'chat',evidence:d.evidence});});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})(typeof window!=='undefined'?window:globalThis);
