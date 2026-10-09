/* QuantaPhi blue visual builder. Orange story remains visible above it. */
(function(){
'use strict';
const host=document.getElementById('phiImageBuilder');
const renderer=window.PhiVisualRender;
if(!host||!renderer)return;
const modes=['Image','Trading Card','Advertisement','Billboard','Poster','Cover Art'];
const names=['Reading uploaded photo','Planning with Oracle GPT','Rendering original image','Checking finished artwork'];
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
const $=selector=>host.querySelector(selector);
const emit=(type,detail)=>window.dispatchEvent(new CustomEvent('phi:image:'+type,{detail}));
const id=()=>crypto?.randomUUID?.()||('phi-'+Date.now()+'-'+Math.random().toString(36).slice(2));
let mode='Image',source=null,design=null,urls=[],result=null,rawResult=null,artifact=null,busy=false,lastInstruction='',lastExactText='',preparingReference=false;
function state(value){host.dataset.stage=value}
function notice(text){const area=host.dataset.stage==='finished'?'.pi-finished':host.dataset.stage==='progress'?'.pi-progress':'.pi-composer';const el=$(area+' .pi-notice');if(el)el.textContent=text}
function step(n,value,text){const el=$('[data-pi-step="'+n+'"]');if(el){el.dataset.state=value;el.lastElementChild.textContent=text||(value==='done'?'Done':value==='active'?'Working…':'Waiting')}}
function initSteps(){names.forEach((_,i)=>step(i,'waiting'))}
function contextStory(){
 if(!$('#pi-story').checked)return '';
 const title=document.querySelector('#infiniteBook .ib-title')?.textContent||'';
 const summary=document.querySelector('#infiniteBook .ib-summary')?.textContent||'';
 const source=document.querySelector('#infiniteBook .ib-source')?.href||'';
 return [title,summary.slice(0,260),source].filter(Boolean).join('. ');
}
function contextSearch(){return $('#pi-search').checked?String(document.getElementById('q')?.value||'').trim().slice(0,220):''}
function input(kind,title,subtitle){
 const item=make('label','pi-file');
 const img=make('img',kind==='source'?'pi-upload-image':'pi-design-image');img.alt='Reference preview';
 const label=make('strong','',title),small=make('small','',subtitle);
 const el=make('input');el.type='file';el.accept='image/jpeg,image/png,image/webp';el.dataset.piFile=kind;
 item.append(img,label,small,el);
 return item;
}
function layout(){
 const form=make('div','pi-composer pi-panel');
 form.append(make('h2','','Build an Image'),make('p','pi-sub','Describe it, add a reference photo, or create something similar. Trading cards are one image mode.'));
 const choices=make('div','pi-modes');
 for(const name of modes){const b=make('button','pi-mode',name);b.type='button';b.dataset.piMode=name;b.setAttribute('aria-pressed',name===mode?'true':'false');choices.append(b)}
 form.append(choices);
 const uploads=make('div','pi-file-area');
 for(const [kind,title,subtitle,removeLabel] of [['source','Upload image','Source / create similar','Remove uploaded photo'],['design','Style reference','Optional second image','Remove style reference']]){
  const slot=make('div','pi-upload-slot');slot.append(input(kind,title,subtitle));
  const remove=make('button','pi-mode pi-remove',removeLabel);remove.type='button';remove.dataset.piAction='remove-'+kind;remove.hidden=true;slot.append(remove);
  uploads.append(slot);
 }
 form.append(uploads);
 const prompt=make('textarea');prompt.id='pi-prompt';prompt.setAttribute('aria-label','Describe image to build');prompt.placeholder='Describe the image, style, words, and edits you want. Example: A beautiful vintage AM radio advertisement photographed like a 1950s magazine cover.';form.append(prompt);
 const exact=make('input','pi-exact-input');exact.type='text';exact.id='pi-exact-text';exact.maxLength=120;exact.placeholder='Exact printed words (optional; no imaginary letters)';exact.setAttribute('aria-label','Exact words to print on the finished image');form.append(exact);
 const opts=make('div','pi-options');
 for(const [name,text]of [['story','Use story as inspiration'],['search','Use current search']]){
  const label=make('label');const cb=make('input');cb.type='checkbox';cb.id='pi-'+name;label.append(cb,document.createTextNode(text));opts.append(label)
 }
 form.append(opts,make('p','pi-notice',''));
 const go=make('button','pi-primary','Build Image');go.type='button';go.dataset.piAction='build';form.append(go);
 const progress=make('div','pi-progress pi-panel');progress.append(make('h2','','Building your image'),make('p','pi-sub','The input card is replaced as each actual service step runs.'));
 const steps=make('div','pi-steps');names.forEach((name,i)=>{const row=make('div','pi-step');row.dataset.piStep=i;row.dataset.state='waiting';row.append(make('span','',name),make('small','','Waiting'));steps.append(row)});
 progress.append(steps,make('p','pi-notice',''));
 const back=make('button','pi-primary','Back to description');back.type='button';back.dataset.piAction='back';progress.append(back);
 const done=make('div','pi-finished pi-panel');done.append(make('h2','','Your Image'),make('p','pi-sub','This result is the actual image returned by the connected renderer.'));
 const img=make('img','pi-result');img.alt='Generated image result';done.append(img,make('p','pi-notice',''));
 const audit=make('div','pi-audit');audit.setAttribute('aria-live','polite');audit.append(make('strong','pi-audit-title','Visual review'),make('p','pi-audit-summary','Not yet reviewed.'),make('ul','pi-audit-issues'));done.append(audit);
 const actions=make('div','pi-actions');
 for(const [key,label,wide]of [['star','☆ Star'],['share','↗ Share +★'],['collect','+ Collect +★'],['good','✓ Looks good'],['fix','Fix issues',true],['more','Build more like this',true],['edit','Edit prompt'],['clear','Clear image'],['download','Save image']]){
  const b=make('button',wide?'pi-wide':'',label);b.type='button';b.dataset.piAction=key;actions.append(b)
 }
 done.append(actions);
 host.replaceChildren(form,progress,done);
}
async function build(){
 if(busy||preparingReference)return;
 const typed=$('#pi-prompt').value.trim().slice(0,3000);
 const exactText=$('#pi-exact-text').value.trim().slice(0,120);
 if(!typed&&!source&&!contextStory()){notice('Describe the artwork or upload a photo first.');return}
 const description=typed||('Build a distinctive '+mode.toLowerCase()+' based on my uploaded reference or story.');
 const requestId=id(),story=contextStory(),search=contextSearch();
 busy=true;lastInstruction=description;lastExactText=exactText;result=null;rawResult=null;artifact=null;
 state('progress');initSteps();$('[data-pi-action="back"]').textContent='Back to description';notice('Preparing a real render request…');
 emit('build:start',{requestId,mode,description});
 let phase=0,warning='',vision='',prompt='';
 try{
  step(phase,'active',source?'Reading reference':'Text-only build');
  if(source)try{vision=await renderer.inspect(source)}catch(_){warning='Reference reader unavailable; using the uploaded image directly.'}
  step(phase++,'done');
  step(phase,'active','GPT directing image composition');
  try{prompt=await renderer.direct({description,mode,vision,story,search,hasUpload:Boolean(source),designFile:Boolean(design),exactText,preferences:window.PhiImageLearning?.preferences(mode)||''})}
  catch(_){prompt=[renderer.modePrompt(mode),description,story,search].filter(Boolean).join('\n');warning=[warning,'GPT director unavailable; using your instructions.'].filter(Boolean).join(' ')}
  step(phase++,'done');
  step(phase,'active','Image renderer in progress');
  notice([warning,'Sending artwork to the actual image-generation service.'].filter(Boolean).join(' '));
  let rendered=await renderer.render({description,mode,source,design,prompt,exactText});
  step(phase++,'done');
  step(phase,'active','Examining finished pixels and lettering');
  rawResult=rendered.src;
  result=exactText?await renderer.composeExactText(rawResult,exactText):rawResult;
  let size=await renderer.validate(result);
  let review=null,autoRefined=false;
  try{review=await renderer.review({src:result,description,mode,exactText})}
  catch(error){warning=[warning,'Visual reviewer unavailable; result not graded.'].filter(Boolean).join(' ')}
  const score=review?.score;
  // Suspend automatic second-generation calls by default while the first
  // renderer path is stabilized. The explicit Fix issues action still works.
  // A second FLUX request increases latency and can exhaust the daily limit.
  const shouldRefine=window.PhiImageAutoRefine===true&&review&&(
   review.status==='needs_work'||(Number.isFinite(score)&&score<75)
  )&&Array.isArray(review.issues)&&review.issues.length>0;
  if(shouldRefine){
   // One automatic quality-improvement pass, not an endless rendering loop.
   // Never manufacture approval scores or bypass a provider rejection.
   notice('The visual reviewer found problems. Improving the image once before finishing…');
   const faults=review.issues.slice(0,4).map(x=>x.fix||x.problem).filter(Boolean).join('; ');
   const repair=[renderer.modePrompt(mode),
    'QUALITY REPAIR: Keep the same subject and good composition. Correct these observed defects: '+faults,
    review.repairPrompt||'',
    'Absolutely no fabricated letters, fake headlines, pseudo-writing, symbol-like text, labels or word-shaped textures. Any caption is composed by the browser separately. Leave clean blank space where lettering belongs.',
    'Original request: '+description,'Original art direction: '+prompt].filter(Boolean).join('\n').slice(0,7400);
   try{
    const prior=await renderer.asBlob(rawResult);
    const candidate=await renderer.render({description,mode,source:prior,design:null,prompt:repair,exactText});
    const candidateRaw=candidate.src;
    const candidateResult=exactText?await renderer.composeExactText(candidateRaw,exactText):candidateRaw;
    const candidateSize=await renderer.validate(candidateResult);
    const candidateReview=await renderer.review({src:candidateResult,description,mode,exactText});
    const firstScore=Number.isFinite(review.score)?review.score:-1;
    const nextScore=Number.isFinite(candidateReview?.score)?candidateReview.score:-1;
    const acceptable=candidateReview&&(
      nextScore>firstScore ||
      (nextScore===firstScore && review.status!=='good' && candidateReview.status==='good')
    );
    if(acceptable){
     rawResult=candidateRaw;result=candidateResult;size=candidateSize;
     rendered=candidate;review=candidateReview;autoRefined=true;
    }else warning=[warning,'The original was retained because the revision did not receive a better visual review.'].filter(Boolean).join(' ');
   }catch(error){
    warning=[warning,'Automatic refinement could not be verified; the original rendered image was kept.'].filter(Boolean).join(' ');
   }
  }
  artifact={id:'phi-visual-'+requestId,mode,prompt:description,renderPrompt:prompt,exactText,renderer:rendered.renderer,createdAt:new Date().toISOString(),width:size.width,height:size.height,story,search,autoRefined};
  artifact.review=review;
  if(review)window.PhiImageLearning?.record(artifact,'review',{issues:review.issues});
  const audit=$('.pi-audit'),title=audit.querySelector('.pi-audit-title'),summary=audit.querySelector('.pi-audit-summary'),issues=audit.querySelector('.pi-audit-issues');
  issues.replaceChildren();
  if(review){
   title.textContent='Visual review · '+(review.score===null?'Unscored':review.score+'/100');
   summary.textContent=review.status==='needs_work'?'Possible mistakes detected — use Fix issues to revise.':review.status==='good'?'No major defects detected by the automated critic. Please verify visually.':'Review uncertain. Check the result before saving.';
   for(const issue of review.issues){const li=make('li');li.textContent=issue.problem+(issue.fix?' — '+issue.fix:'');issues.append(li)}
   audit.dataset.review=review.status;
  }else{title.textContent='Visual review unavailable';summary.textContent='Artwork rendered, but its details and lettering have not been checked.';audit.dataset.review='uncertain'}
  step(phase,'done',review?'Visual check complete':'Review unavailable');
  $('.pi-result').src=result;
  $('[data-pi-action="star"]').textContent='☆ Star';
  state('finished');notice('Created '+size.width+' × '+size.height+' using '+rendered.renderer+(warning?' · '+warning:''));
  emit('build:done',artifact);
 }catch(error){
  step(phase,'error','Failed');
  const message=String(error?.message||error);
  const flagged=error?.code==='image_input_flagged'||/\b3030\b|output has been flagged/i.test(message);
  if(flagged){
   notice('The image service flagged this attempt, and no artwork was produced. Change the description or remove/replace a reference photo, then build again. Your original inputs are saved here.');
   $('[data-pi-action="back"]').textContent='Edit description or photo';
  }else if(error?.code==='image_input_invalid'){
   notice('The renderer could not accept this request. Check the description and uploaded images, then build again. Your inputs are preserved.');
   $('[data-pi-action="back"]').textContent='Edit description or photo';
  }else if(error?.code==='image_daily_cap'){
   notice('The connected image service has reached its 20-generation daily limit for this identity. Your description and photo are preserved; more builds are available when the daily limit resets.');
   $('[data-pi-action="back"]').textContent='Back to saved description';
  }else{
   notice(message.slice(0,210)+'. No image was produced. Return to your description and try again.');
  }
  emit('build:error',{requestId,error:message,code:error?.code||'',phase});
 }finally{busy=false}
}
function showFile(file,kind){
 const el=kind==='source'?$('.pi-upload-image'):$('.pi-design-image');
 const old=el.dataset.url;if(old)URL.revokeObjectURL(old);el.removeAttribute('src');el.dataset.url='';
 if(file){const url=URL.createObjectURL(file);el.src=url;el.dataset.url=url}
 const remove=$('[data-pi-action="remove-'+kind+'"]');if(remove)remove.hidden=!file;
}
host.addEventListener('change',event=>{
 const input=event.target.closest('[data-pi-file]');if(!input)return;
 const file=input.files?.[0]||null,kind=input.dataset.piFile;
 if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)){
  input.value='';notice('Choose PNG, JPG or WebP up to 10 MB');return
 }
 if(kind==='source')source=file;else design=file;showFile(file,kind);
});
host.addEventListener('click',event=>{
 const choice=event.target.closest('[data-pi-mode]');
 if(choice){mode=choice.dataset.piMode;host.querySelectorAll('[data-pi-mode]').forEach(b=>b.setAttribute('aria-pressed',b===choice?'true':'false'));return}
 const action=event.target.closest('[data-pi-action]')?.dataset.piAction;
 if(action==='build')void build();
 if(action==='remove-source'||action==='remove-design'){
  const kind=action==='remove-source'?'source':'design';
  if(kind==='source')source=null;else design=null;
  const upload=$('[data-pi-file="'+kind+'"]');if(upload)upload.value='';
  showFile(null,kind);
  notice(kind==='source'?'Uploaded photo removed. You can build from the description or choose another photo.':'Style reference removed.');
 }
 if(action==='back'||action==='edit'){state('composer');if(lastInstruction)$('#pi-prompt').value=lastInstruction;$('#pi-exact-text').value=lastExactText}
 if(action==='more')void reopenAsReference(lastInstruction+'\nCreate a new variation retaining the original subject, valid geometry, and strongest composition.');
 if(action==='fix'){
  const review=artifact?.review;
  const corrections=(review?.issues||[]).map(i=>i.fix||i.problem).filter(Boolean);
  const instruction=[lastInstruction,'Refine the CURRENT rendered image. Preserve all correct content and overall subject. Repair the following:',...corrections,review?.repairPrompt||'Correct visually implausible geometry and any fake lettering.','Use physically believable connections and print only exact words provided in the separate text field.'].filter(Boolean).join('\n');
  window.PhiImageLearning?.record(artifact,'needs_fix',{problem:review?.issues?.[0]?.problem||'User requested corrections'});
  void reopenAsReference(instruction);
 }
 if(action==='good'){window.PhiImageLearning?.record(artifact,'looks_good');notice('Thank you. This result is a positive design example for future renders on this device.')}
 if(action==='clear'){
  if(busy)return;
  const clearedId=artifact?.id||'';
  result=null;rawResult=null;artifact=null;
  const finished=$('.pi-result');if(finished)finished.removeAttribute('src');
  const audit=$('.pi-audit');if(audit){audit.dataset.review='uncertain';audit.querySelector('.pi-audit-title').textContent='Visual review';audit.querySelector('.pi-audit-summary').textContent='No generated image selected.';audit.querySelector('.pi-audit-issues').replaceChildren()}
  state('composer');
  notice('Generated image cleared. Your description and uploaded references are still here. Images already saved in a story can be cleared on that story card.');
  emit('build:cleared',{artifactId:clearedId});
  return;
 }

 if(action==='star'||action==='share'||action==='collect'||action==='download')emit('action',{action,artifact,result});
});
async function reopenAsReference(instruction){
 state('composer');$('#pi-prompt').value=instruction.slice(0,3000);$('#pi-exact-text').value=lastExactText;
 if(!result)return;
 const previous=rawResult||result;preparingReference=true;notice('Preparing this image as the next reference…');
 try{const blob=await renderer.asBlob(previous);source=new File([blob],'phi-refinement.png',{type:blob.type});showFile(source,'source');notice('Reference ready. Build when you want the refined image.')}
 catch(error){notice('Could not attach the previous render: '+String(error?.message||error))}
 finally{preparingReference=false}
}
layout();state('composer');
window.PhiImageBuilder={prefill(text,{useStory=false}={}){$('#pi-prompt').value=String(text||'').slice(0,3000);$('#pi-story').checked=!!useStory},get:()=>({artifact,result,mode})};
})();
