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
let mode='Image',source=null,design=null,urls=[],result=null,artifact=null,busy=false,lastInstruction='';
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
 const uploads=make('div','pi-file-area');uploads.append(input('source','Upload image','Source / create similar'),input('design','Style reference','Optional second image'));form.append(uploads);
 const prompt=make('textarea');prompt.id='pi-prompt';prompt.setAttribute('aria-label','Describe image to build');prompt.placeholder='Describe the image, style, words, and edits you want. Example: A beautiful vintage AM radio advertisement photographed like a 1950s magazine cover.';form.append(prompt);
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
 const actions=make('div','pi-actions');
 for(const [key,label,wide]of [['star','☆ Star'],['share','↗ Share +★'],['collect','+ Collect +★'],['more','Build more like this',true],['edit','Edit prompt'],['download','Save image']]){
  const b=make('button',wide?'pi-wide':'',label);b.type='button';b.dataset.piAction=key;actions.append(b)
 }
 done.append(actions);
 host.replaceChildren(form,progress,done);
}
async function build(){
 if(busy)return;
 const typed=$('#pi-prompt').value.trim().slice(0,3000);
 if(!typed&&!source&&!contextStory()){notice('Describe the artwork or upload a photo first.');return}
 const description=typed||('Build a distinctive '+mode.toLowerCase()+' based on my uploaded reference or story.');
 const requestId=id(),story=contextStory(),search=contextSearch();
 busy=true;lastInstruction=description;result=null;artifact=null;
 state('progress');initSteps();notice('Preparing a real render request…');
 emit('build:start',{requestId,mode,description});
 let phase=0,warning='',vision='',prompt='';
 try{
  step(phase,'active',source?'Reading reference':'Text-only build');
  if(source)try{vision=await renderer.inspect(source)}catch(_){warning='Reference reader unavailable; using the uploaded image directly.'}
  step(phase++,'done');
  step(phase,'active','GPT directing image composition');
  try{prompt=await renderer.direct({description,mode,vision,story,search,hasUpload:Boolean(source),designFile:Boolean(design)})}
  catch(_){prompt=[renderer.modePrompt(mode),description,story,search].filter(Boolean).join('\n');warning=[warning,'GPT director unavailable; using your instructions.'].filter(Boolean).join(' ')}
  step(phase++,'done');
  step(phase,'active','Image renderer in progress');
  notice([warning,'Sending artwork to the actual image-generation service.'].filter(Boolean).join(' '));
  const rendered=await renderer.render({description,mode,source,design,prompt});
  step(phase++,'done');
  step(phase,'active','Decoding generated image');
  const size=await renderer.validate(rendered.src);
  step(phase,'done');
  result=rendered.src;
  artifact={id:'phi-visual-'+requestId,mode,prompt:description,renderPrompt:prompt,renderer:rendered.renderer,createdAt:new Date().toISOString(),width:size.width,height:size.height,story,search};
  $('.pi-result').src=result;
  $('[data-pi-action="star"]').textContent='☆ Star';
  state('finished');notice('Created '+size.width+' × '+size.height+' using '+rendered.renderer+(warning?' · '+warning:''));
  emit('build:done',artifact);
 }catch(error){
  step(phase,'error','Failed');
  notice(String(error?.message||error).slice(0,290)+'. No image was produced. Go back to the description and retry.');
  emit('build:error',{requestId,error:String(error?.message||error),phase});
 }finally{busy=false}
}
function showFile(file,kind){
 const el=kind==='source'?$('.pi-upload-image'):$('.pi-design-image');
 const old=el.dataset.url;if(old)URL.revokeObjectURL(old);el.removeAttribute('src');el.dataset.url='';
 if(file){const url=URL.createObjectURL(file);el.src=url;el.dataset.url=url}
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
 if(action==='back'||action==='edit'){state('composer');if(lastInstruction)$('#pi-prompt').value=lastInstruction}
 if(action==='more'){
  state('composer');$('#pi-prompt').value=lastInstruction+'\nCreate a striking new variation retaining the strongest composition and subject identity.';
  if(result){const oldResult=result;renderer.asBlob(oldResult).then(blob=>{source=new File([blob],'phi-variation-reference.png',{type:blob.type});showFile(source,'source')}).catch(()=>{})}
 }
 if(action==='star'||action==='share'||action==='collect'||action==='download')emit('action',{action,artifact,result});
});
layout();state('composer');
window.PhiImageBuilder={prefill(text,{useStory=false}={}){$('#pi-prompt').value=String(text||'').slice(0,3000);$('#pi-story').checked=!!useStory},get:()=>({artifact,result,mode})};
})();
