/* QuantaPhi blue visual builder. Orange story remains visible above it. */
(function(){
'use strict';
const host=document.getElementById('phiImageBuilder');
const renderer=window.PhiVisualRender;
if(!host||!renderer)return;
const modes=window.PhiImageSuggestions?.modes||['Image','Trading Card','Advertisement','Billboard','Poster','Cover Art'].map(label=>({label,renderMode:label}));
const names=['Reading uploaded photo','Planning with Oracle GPT','Rendering original image','Checking finished artwork'];
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
const $=selector=>host.querySelector(selector);
const emit=(type,detail)=>window.dispatchEvent(new CustomEvent('phi:image:'+type,{detail}));
const id=()=>crypto?.randomUUID?.()||('phi-'+Date.now()+'-'+Math.random().toString(36).slice(2));
let mode='Image',buildType='Image',promptEdited=false,autoPrefill=false,ignoredTopic='',source=null,design=null,urls=[],result=null,rawResult=null,artifact=null,busy=false,lastInstruction='',lastExactText='',lastManualText='',lastTextMode='auto',preparingReference=false,lastRenderPlan=null,storyWriterId='';
function state(value){host.dataset.stage=value;host.setAttribute('aria-busy',value==='progress'?'true':'false')}
function section(title,copy){const box=make('section','pi-section');box.append(make('h3','',title));if(copy)box.append(make('p','pi-sub',copy));return box}
function letteringMode(){const field=$('#pi-exact-text');const enabled=$('#pi-text-mode').value==='exact';field.disabled=!enabled;field.hidden=!enabled}
function paintReview(review){
 const audit=$('.pi-audit'),title=audit.querySelector('.pi-audit-title'),summary=audit.querySelector('.pi-audit-summary'),issues=audit.querySelector('.pi-audit-issues');
 issues.replaceChildren();
 const score=review?.score;
 title.textContent='Image Grader · '+(Number.isFinite(score)?score+'/100':'Not graded');
 summary.textContent=!review?'The image review service is unavailable. You can still describe a problem and try Fix Image.':
  review.status==='needs_work'?'The grader found issues below. Fix Image attempts the corrections and then grades the result again.':
  review.status==='good'?'The image passed review. You can save it or describe a specific change below.':
  'Review is uncertain. Inspect the image and describe anything that needs correction.';
 for(const issue of (review?.issues||[])){
  const li=make('li','pi-grade-issue');
  li.append(make('strong','','Problem: '),document.createTextNode(String(issue.problem||'Unknown problem')));
  if(issue.fix)li.append(make('span','pi-grade-fix','Correction: '+issue.fix));
  issues.append(li);
 }
 audit.dataset.review=review?.status||'uncertain';
}
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
 host.classList.add('oracle-image-studio');
 const form=make('div','pi-composer pi-panel');
 form.append(make('span','pi-eyebrow','ORACLE · BLUE IMAGE GENERATOR'),make('h2','','Create your image'),make('p','pi-sub','Describe what you want in ordinary words. Oracle automatically prints requested titles and slogans accurately, then grades the image. Fix image corrects the result without moving or reuploading it.'));
 const format=section('1 · Choose a format');const label=make('label','pi-label','Build Type');label.htmlFor='pi-build-type';
 const chooser=make('select','pi-build-type');chooser.id='pi-build-type';chooser.setAttribute('aria-label','Build Type');
 for(const entry of modes){const option=make('option','',entry.label);option.value=entry.label;chooser.append(option)}
 format.append(label,chooser);form.append(format);
 const references=section('2 · Add references','Optional. Use one image for the subject and another for the style.');const uploads=make('div','pi-file-area');
 for(const [kind,title,subtitle,removeLabel] of [['source','Subject image','Upload JPG, PNG or WebP','Remove uploaded photo'],['design','Style reference','Optional second image','Remove style reference']]){
  const slot=make('div','pi-upload-slot');slot.append(input(kind,title,subtitle));const remove=make('button','pi-mode pi-remove',removeLabel);remove.type='button';remove.dataset.piAction='remove-'+kind;remove.hidden=true;slot.append(remove);uploads.append(slot);
 }
 references.append(uploads);form.append(references);
 const brief=section('3 · Describe the artwork');const promptLabel=make('label','pi-label','Image instructions');promptLabel.htmlFor='pi-prompt';
 const prompt=make('textarea');prompt.id='pi-prompt';prompt.placeholder='Subject, composition, colors, style, and anything to preserve.';brief.append(promptLabel,prompt);
 const contextBar=make('div','pi-context-line');const contextText=make('span','pi-context-label','');contextText.id='pi-context-label';const clearContext=make('button','pi-context-clear','Clear context');clearContext.type='button';clearContext.dataset.piAction='clear-context';clearContext.hidden=true;contextBar.append(contextText,clearContext);
 const tips=make('div','pi-smart-suggestions');tips.id='pi-smart-suggestions';tips.setAttribute('aria-label','Suggested artwork formats');brief.append(contextBar,tips);form.append(brief);
 const optional=make('details','pi-exact-optional');optional.append(make('summary','','Optional: change automatic wording'));
 const textLabel=make('label','pi-label','Wording preference');textLabel.htmlFor='pi-text-mode';
 const policy=make('select','pi-exact-input');policy.id='pi-text-mode';for(const [value,label] of [['auto','Automatic from my description'],['exact','Override the exact words'],['off','No words on the image']]){const o=make('option','',label);o.value=value;policy.append(o)}
 const exact=make('input','pi-exact-input');exact.type='text';exact.id='pi-exact-text';exact.maxLength=120;exact.placeholder='Write the words exactly as you want them';exact.setAttribute('aria-label','Exact words on image');optional.append(textLabel,policy,exact);form.append(optional,make('p','pi-notice',''));
 const go=make('button','pi-primary','Upload Image');go.type='button';go.dataset.piAction='build';form.append(go);
 export async function uploadImage(request) {
  // Placeholder implementation: in a real deployment this would handle multipart/form-data
  // and store the image, then return the public URL.
  const dummyUrl = 'https://example.com/uploaded-image.png';
  return new Response(JSON.stringify({ success: true, url: dummyUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

const progress=make('div','pi-progress pi-panel');progress.append(make('span','pi-eyebrow','ORACLE · CREATING'),make('h2','','Creating your image'),make('p','pi-sub','Your description and references are kept while the image is built.'));
 const steps=make('div','pi-steps');names.forEach((name,i)=>{const row=make('div','pi-step');row.dataset.piStep=i;row.dataset.state='waiting';row.append(make('span','',name),make('small','','Waiting'));steps.append(row)});progress.append(steps,make('p','pi-notice',''));
 for(const [key,label] of [['retry-render','Retry image render'],['back','Back to description']]){const button=make('button','pi-mode',label);button.type='button';button.dataset.piAction=key;button.hidden=key==='retry-render';progress.append(button)}
 const done=make('div','pi-finished pi-panel');done.append(make('span','pi-eyebrow','ORACLE · YOUR ARTWORK'),make('h2','','Your image'));const img=make('img','pi-result');img.alt='Generated image result';done.append(img,make('p','pi-notice',''));
 const audit=make('div','pi-audit');audit.setAttribute('aria-live','polite');
 audit.append(make('strong','pi-audit-title','Image Grader'),make('p','pi-audit-summary','The grader runs automatically after an image is created.'),make('ul','pi-audit-issues'));
 done.append(audit);
 const notesLabel=make('label','pi-label','What else needs fixing?');notesLabel.htmlFor='pi-fix-notes';
 const notes=make('textarea','pi-fix-notes');notes.id='pi-fix-notes';notes.rows=2;notes.maxLength=1200;notes.placeholder='Optional: describe a specific correction. The image is fixed automatically.';
 done.append(notesLabel,notes);
 const actions=make('div','pi-actions');
 for(const [key,label,wide] of [['fix','Fix image',true],['edit','Edit description'],['download','Save image'],['clear','Clear image']]){
  const button=make('button',wide?'pi-wide':'',label);button.type='button';button.dataset.piAction=key;actions.append(button);
 }
 done.append(actions);
 host.replaceChildren(form,progress,done);letteringMode();refreshSuggestions();
 host.querySelectorAll('.pi-notice').forEach(el=>{el.setAttribute('role','status');el.setAttribute('aria-live','polite')});
}
function currentContext(){
 const snapshot=window.PhiCardContext?.getSnapshot?.();
 const q=String(document.getElementById('q')?.value||'').trim().slice(0,140);
 const topic=snapshot?.topic||q;
 if(ignoredTopic&&topic===ignoredTopic)return null;
 if(topic&&topic!==ignoredTopic)ignoredTopic='';
 return snapshot?.topic?snapshot:(q?{topic:q,sourceCard:'search'}:null);
}
function applyTopicPrompt(force=false){
 const context=currentContext(),prompt=$('#pi-prompt'),suggest=window.PhiImageSuggestions;
 if(!context?.topic||!suggest||!prompt||(!force&&promptEdited))return;
 const next=suggest.promptFor(context.topic,buildType);
 if(!next)return;
 prompt.value=next;autoPrefill=true;
}
function refreshSuggestions(){
 const context=currentContext(),label=$('#pi-context-label'),clear=$('[data-pi-action="clear-context"]'),tips=$('#pi-smart-suggestions'),suggest=window.PhiImageSuggestions;
 if(!label||!clear||!tips)return;
 tips.replaceChildren();
 if(!context?.topic||!suggest){label.textContent='';clear.hidden=true;return}
 label.textContent='Using context from '+(context.sourceCard==='story'?'Story':'Search')+': '+context.topic;
 clear.hidden=false;
 const types=suggest.ranked(context.topic).slice(0,6);
 for(const type of types){if(!modes.some(m=>m.label===type))continue;
  const chip=make('button','pi-suggestion-chip',type);chip.type='button';chip.dataset.piSuggestType=type;tips.append(chip)}
 if(!promptEdited&&!autoPrefill&&$('#pi-prompt')?.value.trim())return;
 if(!promptEdited)applyTopicPrompt();
}
async function build({retryRender=false}={}){
 if(busy||preparingReference)return;
 const typed=$('#pi-prompt').value.trim().slice(0,3000);
 const textMode=$('#pi-text-mode').value,advanced=textMode==='exact';
 const manualText=advanced?$('#pi-exact-text').value.trim():'';
 if(advanced&&!manualText){notice('Enter the words you want to add, or choose No added words.');return}
 const textPlan=textMode==='off'?{text:'',source:'disabled'}:(window.PhiImageLanguage?.infer(typed,mode,manualText)||{text:manualText});
 if(textPlan.error==='exact_words_too_long'){notice('The requested wording is too long to print legibly in this image. Shorten the title or slogan. Your original instructions are unchanged.');return}
 const exactText=textPlan.text||'';
 if(!typed&&!source&&!contextStory()){notice('Describe the artwork or upload a photo first.');return}
 const description=typed||('Build a distinctive '+mode.toLowerCase()+' based on my uploaded reference or story.');
 const formatGuidance=window.PhiImageSuggestions?.instructions(buildType)||'';
 const directedDescription=formatGuidance?description+'\nSelected visual format: '+buildType+'. '+formatGuidance:description;
 const requestId=id(),story=contextStory(),search=contextSearch();
 const canReuse=retryRender&&lastRenderPlan&&lastRenderPlan.description===description&&lastRenderPlan.mode===mode&&lastRenderPlan.buildType===buildType&&lastRenderPlan.source===source&&lastRenderPlan.design===design&&lastRenderPlan.exactText===exactText;
 busy=true;lastInstruction=description;lastExactText=exactText;lastManualText=manualText;lastTextMode=textMode;result=null;rawResult=null;artifact=null;
 state('progress');initSteps();$('[data-pi-action="retry-render"]').hidden=true;$('[data-pi-action="back"]').textContent='Back to description';notice(canReuse?'Retrying the image service with the previous GPT directions…':'Preparing a real render request…');
 emit('build:start',{requestId,mode,description});
 let phase=0,warning='',vision='',prompt='';const referencePack=window.PhiGenerationReferences?.match(description);let renderDesign=design;
 try{
  if(referencePack&&!renderDesign){try{renderDesign=await renderer.asBlob(referencePack.assetUrl);emit('reference:retrieved',{requestId,packId:referencePack.id,version:referencePack.version,assetUrl:referencePack.assetUrl});}catch{warning='Saved character reference is unavailable; your instructions remain intact.';}}
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
   try{prompt=await renderer.direct({description:directedDescription,mode,vision,story,search,hasUpload:Boolean(source),designFile:Boolean(renderDesign),exactText,preferences:[window.PhiImageLearning?.preferences(mode)||'',referencePack?.instructions||''].filter(Boolean).join('\n')})}
   catch(_){prompt=[renderer.modePrompt(mode),directedDescription,story,search].filter(Boolean).join('\n');warning=[warning,'GPT director unavailable; using your instructions.'].filter(Boolean).join(' ')}
   step(phase++,'done');
   lastRenderPlan={description,mode,buildType,source,design,exactText,prompt};
  }
  step(phase,'active','Image renderer in progress');
  notice([warning,'Step 3 of 4 · Waiting for the Cloudflare image renderer. This request may take up to 150 seconds.'].filter(Boolean).join(' '));
  let rendered=await renderer.render({description:directedDescription,mode,source,design:renderDesign,prompt:prompt+(referencePack?'\n'+referencePack.instructions:''),exactText});
  step(phase++,'done');
  step(phase,'active','Examining finished image');
  rawResult=rendered.src;
  result=rawResult;
  if(exactText)result=await renderer.composeExactText(rawResult,exactText); // Never silently publish artwork missing requested words.
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
  artifact={id:'phi-visual-'+requestId,mode,buildType,prompt:description,renderPrompt:prompt,exactText,renderer:rendered.renderer,createdAt:new Date().toISOString(),width:size.width,height:size.height,story,search,storyWriterId,autoRefined};
  artifact.review=review;
  window.QuantaStarCredit?.(description.includes("Refine the CURRENT rendered image")?"fix_image":"build_image",artifact.id,artifact);
  if(review)window.PhiImageLearning?.record(artifact,'review',{issues:review.issues});
  paintReview(review);
  step(phase,'done',review?'Visual check complete':'Review unavailable');
  $('.pi-result').src=result;
  const correction=$('#pi-correct-text');if(correction)correction.value=exactText;
  // The standalone image builder no longer has a Star control.
  // Never let obsolete controls prevent completed artwork from appearing.
  state('finished');notice('Created '+size.width+' × '+size.height+' using '+rendered.renderer+(exactText?' · Exact requested words printed: '+exactText.replace(/\n/g,' / '):'')+(warning?' · '+warning:''));
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
 if(event.target.id==='pi-build-type'){buildType=event.target.value;mode=window.PhiImageSuggestions?.renderMode(buildType)||buildType;if(!promptEdited)applyTopicPrompt();return}
 if(event.target.id==='pi-text-mode'){letteringMode();return}
 const input=event.target.closest('[data-pi-file]');if(!input)return;
 const file=input.files?.[0]||null,kind=input.dataset.piFile;
 if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)){
  input.value='';notice('Choose PNG, JPG or WebP up to 10 MB');return
 }
 if(kind==='source')source=file;else design=file;showFile(file,kind);
});
host.addEventListener('click',event=>{
 if(busy||preparingReference)return;
 const choice=event.target.closest('[data-pi-suggest-type]');
 if(choice){buildType=choice.dataset.piSuggestType;mode=window.PhiImageSuggestions?.renderMode(buildType)||buildType;$('#pi-build-type').value=buildType;applyTopicPrompt(true);return}
 const action=event.target.closest('[data-pi-action]')?.dataset.piAction;
 if(action==='clear-context'){ignoredTopic=currentContext()?.topic||'';window.PhiCardContext?.clear();if(!promptEdited&&autoPrefill){$('#pi-prompt').value='';autoPrefill=false}refreshSuggestions();return}
 if(action==='build')void build();
 if(action==='retry-render'&&!busy)void build({retryRender:true});
 if(action==='remove-source'||action==='remove-design'){
  const kind=action==='remove-source'?'source':'design';
  if(kind==='source')source=null;else design=null;
  const upload=$('[data-pi-file="'+kind+'"]');if(upload)upload.value='';
  showFile(null,kind);
  notice(kind==='source'?'Uploaded photo removed. You can build from the description or choose another photo.':'Style reference removed.');
 }
 if(action==='back'||action==='edit'){const retry=$('[data-pi-action="retry-render"]');if(retry)retry.hidden=true;state('composer');if(lastInstruction)$('#pi-prompt').value=lastInstruction;$('#pi-exact-text').value=lastManualText;$('#pi-text-mode').value=lastTextMode;letteringMode()}
 if(action==='fix')void fixImage();
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
/* Repair runs against the finished image internally. It must never replace the
   user's uploaded photo, change the description, or reopen an upload box. */
async function fixImage(){
 if(busy||preparingReference||!artifact||!rawResult)return;
 const original={artifact,result,rawResult};
 const custom=String($('#pi-fix-notes')?.value||'').trim().slice(0,1200);
 // Explicit user directions win over grader suggestions: do not "fix" parts
 // the user has said are already right.
 const fixes=custom?[]:(original.artifact.review?.issues||[]).slice(0,6)
  .map(issue=>String(issue.fix||issue.problem||'').trim()).filter(Boolean);
 if(!fixes.length&&!custom){notice('The grader has no corrections selected. Describe what you want fixed in the box above.');return}
 busy=true;
 const button=$('[data-pi-action="fix"]');if(button)button.disabled=true;
 notice('Fixing the current image and checking the corrected version. Uploads and description remain unchanged.');
 try{
  const prior=await renderer.asBlob(original.rawResult);
  const repair=[
   'IMAGE REPAIR of the supplied current image, not a new image or a redesign.',
   'Preserve the subject, recognisable objects, perspective, positions, geometry, colors, lighting and all already-correct details.',
   'Correct these Image Grader findings:',...fixes,
   custom?'Additional user correction: '+custom:'',
   'Original image description: '+original.artifact.prompt,
   'Paint no lettering, numbers, labels, fake words or pseudo-text. Exact text is composited separately.',
   'Do not change any other areas of the image.'
  ].filter(Boolean).join('\n').slice(0,7400);
  const mode=original.artifact.mode,description=original.artifact.prompt,exactText=original.artifact.exactText||'';
  const rendered=await renderer.render({description,mode,source:prior,design:null,prompt:repair,exactText});
  const nextRaw=rendered.src;
  const nextResult=exactText?await renderer.composeExactText(nextRaw,exactText):nextRaw;
  const size=await renderer.validate(nextResult);
  let review=null;
  try{review=await renderer.review({src:nextResult,description,mode,exactText})}
  catch(_){/* Do not replace a previously graded image without a new grade. */}
  const before=original.artifact.review?.score,after=review?.score;
  if(Number.isFinite(before)&&(!Number.isFinite(after)||after<before)){
   notice('The original image is preserved: the corrected attempt was not graded higher or equal. No upload or description was changed.');
   return;
  }
  rawResult=nextRaw;result=nextResult;
  artifact={...original.artifact,id:'phi-visual-'+id(),previousId:original.artifact.id,
   renderPrompt:repair,renderer:rendered.renderer,createdAt:new Date().toISOString(),
   width:size.width,height:size.height,review,autoRefined:false};
  $('.pi-result').src=result;
  paintReview(review);
  $('#pi-fix-notes').value='';
  window.PhiImageLearning?.record(artifact,'review',{issues:review?.issues||[]});
  window.QuantaStarCredit?.('fix_image',artifact.id,artifact);
  notice('Corrected image is displayed above.'+(review?' Image Grader checked it again.':' Grader unavailable; please inspect before saving.'));
  emit('build:done',artifact);
 }catch(error){
  notice('Fix Image could not produce a verified correction. Your original image is unchanged. '+String(error?.message||error).slice(0,130));
 }finally{busy=false;if(button)button.disabled=false}
}
host.addEventListener('input',event=>{if(event.target.id==='pi-prompt'){promptEdited=true;autoPrefill=false}});
window.addEventListener('phi:card-context:update',()=>refreshSuggestions());
layout();state('composer');
window.PhiImageBuilder={
 prefill(text){$('#pi-prompt').value=String(text||'').slice(0,3000);promptEdited=true;autoPrefill=false},
 get:()=>({artifact,result,mode,busy}),
 async generateFromStory(id,imageInstructions){
  window.dispatchEvent(new Event('phi:media:show-image'));
  if(busy||preparingReference)throw Error('Image Builder is finishing another image. Try the illustration again when it finishes.');
  storyWriterId=String(id||'').slice(0,120);
  mode='Image';buildType='Image';source=null;design=null;lastRenderPlan=null;promptEdited=true;autoPrefill=false;
  $('#pi-build-type').value='Image';
  $('#pi-prompt').value=String(imageInstructions||'').slice(0,3000);
  $('#pi-exact-text').value='';$('#pi-text-mode').value='auto';letteringMode();state('composer');
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

