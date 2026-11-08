/* Client-only handoff: copy source-backed instructions, never send user files
 * to any server, execute imported HTML, or claim authenticated GPT tools. */
import {CAPABILITY_CHECKS,buildCreatorBrief,validateWebsite} from './creator-gpt-handoff-core.mjs';
const root=document.getElementById('creatorHandoff');
if(root){
 const $=id=>document.getElementById(id);
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
 const statuses=$('creatorStatusList'),feedback=$('creatorFeedback'),summary=$('creatorProbeSummary');
 const sourceLevels={source_confirmed:'Amber · source confirmed; operation not proven',partial:'Amber · partial or source-only',not_verified:'Gray · not verified / not connected'};
 const entries=new Map();
 for(const c of CAPABILITY_CHECKS){
  const card=el('article','cgh-check'),light=el('span','cgh-light'),body=el('div');
  light.dataset.state=c.status;light.setAttribute('aria-hidden','true');
  body.append(el('strong','',c.label));
  const note=el('small','cgh-label',sourceLevels[c.status]);body.append(note);
  body.append(el('small','',c.note));
  const link=el('a','',c.path.startsWith('/#')?'Find Developer area':'Open related page');
  link.href=c.path;body.append(link);card.append(light,body);statuses.append(card);
  entries.set(c.id,{light,note,card});
 }
 // A page HEAD response is only a check that HTML is publicly reachable.
 // It never proves a model, checkout, file sync or a form action succeeded.
 async function probe(id,path){
  const entry=entries.get(id);
  try{
   const controller=new AbortController();
   const response=await fetch(path,{method:'HEAD',redirect:'follow',cache:'no-store',signal:controller.signal});
   const type=response.headers.get('content-type')||'';
   if(response.ok&&/text\/html/i.test(type)){
    entry.light.dataset.state='page-responded';
    entry.note.textContent='Green · public HTML page responds; feature workflow still unverified';
    return true;
   }
  }catch{}
  return false;
 }
 void Promise.all([
  probe('quick-card-publisher','/quick-card-builder.html'),
  probe('chatgpt-handoff','/website-viewer.html?site=chatgpt')
 ]).then(results=>{
  const count=results.filter(Boolean).length;
  summary.textContent=count+' of 2 checked public HTML pages responded. These checks do not verify model access, website publishing, wallet payments or Android interactions.';
 });
 $('creatorHtmlFile').addEventListener('change',async()=>{
  const file=$('creatorHtmlFile').files?.[0];
  if(!file)return;
  if(file.size>65536||!/(\.html?|\.txt)$/i.test(file.name)){
   feedback.textContent='Only small HTML/text files up to 64 KB can be loaded locally. Nothing was uploaded.';return;
  }
  try{
   const imported=await file.text();
   $('creatorExistingHtml').value=imported.slice(0,14000);
   feedback.textContent='Existing HTML read locally ('+Math.min(imported.length,14000)+' characters). Review it before copying into ChatGPT.';
  }catch{feedback.textContent='Could not read the selected HTML file.'}
 });
 $('creatorBriefForm').addEventListener('submit',async event=>{
  event.preventDefault();
  try{
   const brief=buildCreatorBrief({idea:$('creatorIdea').value,
    specialist:$('creatorSpecialist').value,title:$('creatorProjectTitle').value,
    website:$('creatorSourceUrl').value,existingHtml:$('creatorExistingHtml').value});
   $('creatorPreparedBrief').value=brief;
   try{
    await navigator.clipboard.writeText(brief);
    feedback.textContent='GPT instructions copied. Open ChatGPT, paste, and submit. No accounts, files or wallets were accessed.';
   }catch{
    $('creatorPreparedBrief').focus();$('creatorPreparedBrief').select();
    feedback.textContent='Clipboard unavailable. Instructions are selected—copy them and paste into ChatGPT manually.';
   }
   const origin=validateWebsite($('creatorSourceUrl').value);
   if(origin){
    const url=new URL('/quick-card-builder.html',location.origin);
    url.searchParams.set('website',origin.href);
    if($('creatorProjectTitle').value.trim())url.searchParams.set('title',$('creatorProjectTitle').value.trim().slice(0,85));
    $('creatorBuilderLink').href=url.pathname+url.search;
   }
  }catch(error){feedback.textContent=String(error?.message||error)}
 });
 const preview=$('creatorHtmlPreview');
 preview.setAttribute('sandbox','');
 $('creatorPreviewHtml').addEventListener('click',()=>{
  const html=$('creatorReturnedHtml').value.trim();
  if(!html){feedback.textContent='Paste HTML from GPT before previewing.';return;}
  // A sandboxed, network-restricted document: JS, forms and navigation disabled.
  const csp='default-src '+"'none'"+'; img-src data: blob:; style-src '+"'unsafe-inline'"+'; font-src data:; form-action '+"'none'"+'; connect-src '+"'none'"+'; base-uri '+"'none'";
  preview.srcdoc='<!doctype html><meta http-equiv="Content-Security-Policy" content="'+csp+'">'+html;
  preview.hidden=false;
  feedback.textContent='Local restricted preview opened. Scripts and external network resources are blocked; this is not a published or fully interactive test.';
 });
 $('creatorDownloadHtml').addEventListener('click',()=>{
  const html=$('creatorReturnedHtml').value.trim();
  if(!html){feedback.textContent='Paste the generated HTML before saving it.';return;}
  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const href=URL.createObjectURL(blob),link=el('a');
  link.href=href;link.download='quantaphi-original-card-draft.html';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
  feedback.textContent='HTML draft saved to this device. This is not an uploaded or published Quick Card.';
 });
 $('creatorSourceUrl').addEventListener('input',()=>{
  try{
   const url=validateWebsite($('creatorSourceUrl').value);
   const builder=new URL('/quick-card-builder.html',location.origin);
   if(url)builder.searchParams.set('website',url.href);
   $('creatorBuilderLink').href=builder.pathname+builder.search;
  }catch{$('creatorBuilderLink').href='/quick-card-builder.html'}
 });
}
