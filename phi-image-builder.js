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
let mode='Image',source=null,design=null,urls=[],result=null,rawResult=null,artifact=null,busy=false,lastInstruction='',lastExactText='',preparingReference=false,lastRenderPlan=null,storyWriterId='';
function state(value){host.dataset.stage=value}
function notice(text){const area=host.dataset.stage==='finished'?'.pi-finished':host.dataset.stage==='progress'?'.pi-progress':'.pi-composer';const el=$(area+' .pi-notice');if(el)el.textContent=text}
function step(n,value,text){const el=$('[data-pi-step="'+n+'"]');if(el){el.dataset.state=value;el.lastElementChild.textContent=text||(value==='done'?'Done':value==='active'?'Working…':'Waiting')}}
function initSteps(){names.forEach((_,i)=>step(i,'waiting'))}
function contextStory(){
 if(!$('#pi-story')?.checked)return '';
 const title=document.querySelector('#infiniteBook .ib-title')?.textContent||'';
 const summary=document.querySelector('#infiniteBook .ib-summary')?.textContent||'';
 const source=document.querySelector('#infiniteBook .ib-source')?.href||'';
 return [title,summary.slice(0,260),source].filter(Boolean).join('. ');
}
function contextSearch(){return $('#pi-search')?.checked?String(document.getElementById('q')?.value||'').trim().slice(0,220):''}
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
 const exact=make('input','pi-exact-input');exact.type='text';exact.id='pi-exact-text';exact.maxLength=120;exact.placeholder='Exact title or words to print (optional — use this to avoid fake letters)';exact.setAttribute('aria-label','Exact words to print on the finished image');form.append(exact);
 form.append(make('p','pi-notice',''));
 const go=make('button','pi-primary','Build Image');go.type='button';go.dataset.piAction='build';form.append(go);
 const progress=make('div','pi-progress pi-panel');progress.append(make('h2','','Building your image'),make('p','pi-sub','The input card is replaced as each actual service step runs.'));
 const steps=make('div','pi-steps');names.forEach((name,i)=>{const row=make('div','pi-step');row.dataset.piStep=i;row.dataset.state='waiting';row.append(make('span','',name),make('small','','Waiting'));steps.append(row)});
 progress.append(steps,make('p','pi-notice',''));
 const retry=make('button','pi-primary','Retry image render');retry.type='button';retry.dataset.piAction='retry-render';retry.hidden=true;progress.append(retry);
 const back=make('button','pi-primary','Back to description');back.type='button';back.dataset.piAction='back';progress.append(back);
 const done=make('div','pi-finished pi-panel');done.append(make('h2','','Your Image'),make('p','pi-sub','This result is the actual image returned by the connected renderer.'));
 const img=make('img','pi-result');img.alt='Generated image result';done.append(img,make('p','pi-notice',''));
 // Browser-only typography repair: no fresh FLUX render or paid image call.
 const lettering=make('div','pi-lettering');
 lettering.append(make('strong','','Fix printed words without regenerating'),make('p','pi-sub','Use real lettering for your title. This edits the saved result, not the underlying picture; any fake lettering painted into the background may still remain.'));
 const correction=make('input','pi-exact-input');correction.id='pi-correct-text';correction.type='text';correction.maxLength=120;correction.placeholder='Enter precisely what the image should say';correction.setAttribute('aria-label','Correct the lettering printed on the final image');
 const applyText=make('button','pi-mode','Apply exact lettering');applyText.type='button';applyText.dataset.piAction='apply-lettering';
 const removeText=make('button','pi-mode','Remove added lettering');removeText.type='button';removeText.dataset.piAction='remove-lettering';
 lettering.append(correction,applyText,removeText);done.append(lettering);
 const audit=make('div','pi-audit');audit.setAttribute('aria-live','polite');audit.append(make('strong','pi-audit-title','Visual review'),make('p','pi-audit-summary','Not yet reviewed.'),make('ul','pi-audit-issues'));done.append(audit);
 const actions=make('div','pi-actions');
 for(const [key,label,wide]of [['fix','Fix image · rebuild',true],['download','Save image'],['clear','Clear image']]){
  const b=make('button',wide?'pi-wide':'',label);b.type='button';b.dataset.piAction=key;actions.append(b)
 }
 done.append(actions);
 host.replaceChildren(form,progress,done);
}
async function build({retryRender=false}={}){
 if(busy||preparingReference)return;
 const typed=$('#pi-prompt').value.trim().slice(0,3000);
 const exactText=$('#pi-exact-text').value.trim().slice(0,120);
 if(!typed&&!source&&!contextStory()){notice('Describe the artwork or upload a photo first.');return}
 const description=typed||('Build a distinctive '+mode.toLowerCase()+' based on my uploaded reference or story.');
 const requestId=id(),story=contextStory(),search=contextSearch();
 const canReuse=retryRender&&lastRenderPlan&&lastRenderPlan.description===description&&lastRenderPlan.mode===mode&&lastRenderPlan.source===source&&lastRenderPlan.design===design&&lastRenderPlan.exactText===exactText;
 busy=true;lastInstruction=description;lastExactText=exactText;result=null;rawResult=null;artifact=null;
 state('progress');initSteps();$('[data-pi-action="retry-render"]').hidden=true;$('[data-pi-action="back"]').textContent='Back to description';notice(canReuse?'Retrying the image service with the previous GPT directions…':'Preparing a real render request…');
 emit('build:start',{requestId,mode,description});
 let phase=0,warning='',vision='',prompt='';
 try{
  if(canReuse){
   prompt=lastRenderPlan.prompt;
   step(0,'done','Saved reference');
   step(1,'done','Saved GPT image directions');
   phase=2;
  }else{
   step(phase,'active',source?'Reading reference':'Text-only build');
   if(source)try{vision=await renderer.inspect(source)}catch(_){warning='Reference reader unavailable; using the uploaded image directly.'}
   step(phase++,'done');
   step(phase,'active','GPT directing image composition');
   try{prompt=await renderer.direct({description,mode,vision,story,search,hasUpload:Boolean(source),designFile:Boolean(design),exactText,preferences:window.PhiImageLearning?.preferences(mode)||''})}
   catch(_){prompt=[renderer.modePrompt(mode),description,story,search].filter(Boolean).join('\n');warning=[warning,'GPT director unavailable; using your instructions.'].filter(Boolean).join(' ')}
   step(phase++,'done');
   lastRenderPlan={description,mode,source,design,exactText,prompt};
  }
  step(phase,'active','Image renderer in progress');
  notice([warning,'Step 3 of 4 · Waiting for the Cloudflare image renderer. This request may take up to 150 seconds.'].filter(Boolean).join(' '));
  let rendered=await renderer.render({description,mode,source,design,prompt,exactText});
  step(phase++,'done');
  step(phase,'active','Examining finished pixels and lettering');
  rawResult=rendered.src;
  result=rawResult;
  if(exactText)try{result=await renderer.composeExactText(rawResult,exactText)}catch(error){warning=[warning,'Artwork rendered, but exact lettering could not be added: '+String(error?.message||error).slice(0,90)].filter(Boolean).join(' ')}
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
  artifact={id:'phi-visual-'+requestId,mode,prompt:description,renderPrompt:prompt,exactText,renderer:rendered.renderer,createdAt:new Date().toISOString(),width:size.width,height:size.height,story,search,storyWriterId,autoRefined};
  artifact.review=review;
  window.QuantaStarCredit?.(description.includes("Refine the CURRENT rendered image")?"fix_image":"build_image",artifact.id,artifact);
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
  const correction=$('#pi-correct-text');if(correction)correction.value=exactText;
  // The standalone image builder no longer has a Star control.
  // Never let obsolete controls prevent completed artwork from appearing.
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
  }else if(error?.status===429||error?.code==='provider_rate_limited'||error?.code==='cloudflare_ai_capacity_or_limit'){
   notice(error?.code==='cloudflare_ai_capacity_or_limit'?'Cloudflare Workers AI reached a capacity, rate, or usage limit. Check Workers AI usage in Cloudflare, or retry after the daily reset. Your description is saved.':'The image provider is temporarily busy or has a service-level limit. Your description is saved and can be retried.');
   $('[data-pi-action="back"]').textContent='Back to saved description';
  }else{
   const transient=phase===2&&(error?.code==='image_render_timeout'||error?.code==='image_render_network'||error?.code==='image_render_bad_response'||error?.status>=500);
   if(transient){
    $('[data-pi-action="retry-render"]').hidden=false;
    notice((error?.code==='image_render_timeout'?'The render did not finish within 150 seconds.':error?.code==='image_render_network'?'The image service connection failed.':message.slice(0,145))+' Your description and GPT direction are saved. Tap Retry image render to retry ONLY step 3.');
   }else notice(message.slice(0,210)+'. No completed image was returned. Your description is saved for editing.');
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
 if(action==='apply-lettering'||action==='remove-lettering'){
  if(busy||!rawResult||!artifact)return;
  const editField=$('#pi-correct-text');
  const corrected=action==='remove-lettering'?'':String(editField?.value||'').trim().slice(0,120);
  busy=true;
  void (async()=>{
   try{
    const revised=corrected?await renderer.composeExactText(rawResult,corrected):rawResult;
    const dimensions=await renderer.validate(revised);
    result=revised;lastExactText=corrected;artifact={...artifact,exactText:corrected,letteringEdited:true,width:dimensions.width,height:dimensions.height};
    $('.pi-result').src=result;if(editField)editField.value=corrected;
    const original=$('#pi-exact-text');if(original)original.value=corrected;
    const audit=$('.pi-audit');if(audit){audit.dataset.review='uncertain';audit.querySelector('.pi-audit-title').textContent='Lettering changed locally';audit.querySelector('.pi-audit-summary').textContent='The corrected caption uses real browser fonts. The base illustration was not regenerated or rechecked.';audit.querySelector('.pi-audit-issues').replaceChildren()}
    notice(corrected?'Exact lettering saved into the preview. Save image to keep this correction. No new AI render was charged.':'Added lettering removed. The original illustration is preserved. No new AI render was charged.');
    emit('build:lettering',artifact);
   }catch(error){notice('Unable to update lettering: '+String(error?.message||error).slice(0,130))}
   finally{busy=false}
  })();
  return;
 }
 if(action==='build')void build();
 if(action==='retry-render'&&!busy)void build({retryRender:true});
 if(action==='remove-source'||action==='remove-design'){
  const kind=action==='remove-source'?'source':'design';
  if(kind==='source')source=null;else design=null;
  const upload=$('[data-pi-file="'+kind+'"]');if(upload)upload.value='';
  showFile(null,kind);
  notice(kind==='source'?'Uploaded photo removed. You can build from the description or choose another photo.':'Style reference removed.');
 }
 if(action==='back'||action==='edit'){const retry=$('[data-pi-action="retry-render"]');if(retry)retry.hidden=true;state('composer');if(lastInstruction)$('#pi-prompt').value=lastInstruction;$('#pi-exact-text').value=lastExactText}
 if(action==='more')void reopenAsReference(lastInstruction+'\nCreate a new variation retaining the original subject, valid geometry, and strongest composition.');
 if(action==='fix'){
  const review=artifact?.review;
  const corrections=(review?.issues||[]).map(i=>i.fix||i.problem).filter(Boolean);
  const instruction=[lastInstruction,'Refine the CURRENT rendered image. Preserve all correct content and overall subject. Repair the following:',...corrections,review?.repairPrompt||'Correct visually implausible geometry and any fake lettering.','Use physically believable connections and print only exact words provided in the separate text field.'].filter(Boolean).join('\n');
  window.PhiImageLearning?.record(artifact,'needs_fix',{problem:review?.issues?.[0]?.problem||'User requested corrections'});
  // Preserve the prior pixels as a repair reference; start rendering immediately.
  // Keep Story Writer ownership on the repaired artwork so its image updates too.
  storyWriterId=artifact?.storyWriterId||'';
  void reopenAsReference(instruction).then(ready=>ready?build():null).finally(()=>{storyWriterId=''});
 }
 if(action==='good'){window.PhiImageLearning?.record(artifact,'looks_good');notice('Thank you. This result is a positive design example for future renders on this device.')}
 if(action==='clear'){
  if(busy)return;
  const clearedId=artifact?.id||'';
  result=null;rawResult=null;artifact=null;lastRenderPlan=null;
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
 if(!result)return false;
 const previous=rawResult||result;preparingReference=true;notice('Preparing this image as the next reference…');
 try{const blob=await renderer.asBlob(previous);source=new File([blob],'phi-refinement.png',{type:blob.type});showFile(source,'source');notice('Reference prepared for image repair.');return true}
 catch(error){notice('Could not attach the previous render: '+String(error?.message||error));return false}
 finally{preparingReference=false}
}
layout();state('composer');
window.PhiImageBuilder={
 prefill(text){$('#pi-prompt').value=String(text||'').slice(0,3000)},
 get:()=>({artifact,result,mode,busy}),
 async generateFromStory(id,imageInstructions){
  if(busy||preparingReference)throw Error('Image Builder is finishing another image. Try the illustration again when it finishes.');
  storyWriterId=String(id||'').slice(0,120);
  mode='Image';source=null;design=null;lastRenderPlan=null;
  host.querySelectorAll('[data-pi-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.piMode==='Image'?'true':'false'));
  $('#pi-prompt').value=String(imageInstructions||'').slice(0,3000);
  $('#pi-exact-text').value='';state('composer');
  try{await build();if(!artifact||!result||artifact.storyWriterId!==storyWriterId)throw Error('The image renderer did not finish this illustration.');return {artifact,result}}
  finally{storyWriterId=''}
 },
 async applyEditedImage(src,options={}){
  if(busy||!artifact||!result)throw Error('No finished image available to edit');
  if(!String(src||'').startsWith('data:image/png;base64,'))throw Error('Expected a PNG image from the local editor');
  const current=artifact;
  const dimensions=await renderer.validate(src);
  if(busy||artifact!==current)throw Error('Image changed during editing');
  result=src;rawResult=src;lastRenderPlan=null;
  artifact={...current,letteringEdited:true,editor:String(options.source||'local-canvas').slice(0,60),width:dimensions.width,height:dimensions.height};
  $('.pi-result').src=src;
  const audit=$('.pi-audit');
  if(audit){audit.dataset.review='uncertain';audit.querySelector('.pi-audit-title').textContent='Typography edited locally';audit.querySelector('.pi-audit-summary').textContent='Editable real-font text was applied without another AI render. Please inspect the result before saving.';audit.querySelector('.pi-audit-issues').replaceChildren()}
  notice('Updated artwork with real typography. Save, share or collect this edited image; no additional AI generation was called.');
  emit('build:lettering',artifact);
  return artifact;
 }
};
})();
