/* Phi Visual Render: shared Oracle image service adapter, no fake fallback. */
(function(root){
'use strict';
const BASE='https://infinity-rogers.marvaseater.workers.dev';
const MAX=10*1024*1024;
const typeOK=t=>['image/png','image/jpeg','image/webp'].includes(t);
const words=x=>String(x||'').trim().slice(0,3000);
const possible=v=>typeof v==='string'&&(/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(v)||/^https:\/\//.test(v))?v:'';
function imageFrom(j){return possible(j?.dataURI||j?.imageDataURI||j?.image?.dataURI||j?.image?.url||j?.imageUrl)}
async function neutralImage(){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f9f9f9';ctx.fillRect(0,0,768,768);
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Starting canvas unavailable')),'image/jpeg',.94));
}
async function jsonResponse(path,options){
 const controller=new AbortController();
 const ms=path==='/v1/image'?150000:path==='/v1/image-read'||path==='/v1/image-review'?45000:30000;
 const timer=setTimeout(()=>controller.abort(),ms);
 try{
  const response=await fetch(BASE+path,{...options,signal:controller.signal});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(String(data.error||data.detail||'Service unavailable').slice(0,220));
  return data;
 }finally{clearTimeout(timer)}
}
async function inspect(file){
 if(!file)return '';
 if(file.size>MAX||!typeOK(file.type))throw Error('Reference must be PNG/JPG/WebP, up to 10 MB');
 const body=new FormData();body.append('image',file,file.name||'reference.jpg');
 body.append('purpose','full-read');body.append('detail','full');
 body.append('instructions','Read the actual image, exact printed words, subject, marks, color and visual composition. Only report visible evidence; avoid guesses.');
 const j=await jsonResponse('/v1/image-read',{method:'POST',body});
 if(!j.ok)throw Error('Image reader returned no result');
 return [j.semanticDescription,j.description,...(j.visibleText||[]),...(j.keywords||[]),...(j.visualTraits||[]),j.summary,j.output_text].filter(x=>typeof x==='string').join('\n').slice(0,1600);
}
function modePrompt(mode){
 return ({
 'Image':'Create one premium standalone image. Take the user request literally, with compelling composition, credible physical geometry, and no unwanted text.',
 'Trading Card':'Create a genuine sharp-corner trading card for any subject: sports, music, technology, movies, history or artwork. Use a cohesive set style, not a blank template or card mockup.',
 'Advertisement':'Create a finished high-quality advertising graphic; never invent pricing, endorsements or unsupported product claims.',
 'Billboard':'Design a wide, high-impact billboard with readable hierarchy and strong single focal point.',
 'Poster':'Create finished poster art with intentional typography and visual storytelling.',
 'Cover Art':'Create professionally composed cover artwork or album art, with text only where requested.'
 })[mode]||'Create finished image artwork';
}
function aiText(j){
 let value=j.output_text??j.output??j.answer??j.response??j.content??j.message??'';
 if(Array.isArray(value))value=value.map(x=>x?.text||'').join('\n');
 if(value&&typeof value==='object')value=value.text||value.content||'';
 const raw=String(value||'').trim();
 try{const start=raw.indexOf('{'),end=raw.lastIndexOf('}');const parsed=JSON.parse(start>=0&&end>start?raw.slice(start,end+1):raw);return words(parsed.renderPrompt||parsed.prompt||raw)}catch(_){return words(raw)}
}
async function direct(input){
 const {description,mode,vision,story,search,hasUpload,designFile,exactText,preferences}=input;
 const instruction=[
 'You are Oracle, a GPT director for a premium image generation model.',
 'Write ONE detailed render instruction in plain text. Do not claim an image was already made.',
 'Honor identity, appearance and the explicit user instruction. Do not invent factual claims.',
 'Require physically credible construction, perspective, anatomy, flags and mechanisms for realistic scenes. Creative illustration is fine only if requested.',
 'Forbid fake writing, alien-language glyphs, accidental labels and synthetic watermarks. The image model must paint NO words, even when exact words are requested: clear space for precise browser-rendered lettering.',
 'Image type: '+mode,modePrompt(mode),
 'User request: '+description,
 vision?'Verified observations about uploaded image: '+vision:'',
 story?'Optional sourced story inspiration: '+story:'',
 search?'Relevant search context: '+search:'',
 hasUpload?'Preserve uploaded subject reference where useful.':'Text-only creation: neutral starting canvas contains no subject; invent the illustration from text.',
 designFile?'A separate design reference will be provided.':'',
 exactText?'Exact text to be overlaid by the typography compositor after image creation (not drawn by the AI): '+words(exactText):'',
 preferences?'Learned local feedback from earlier explicitly liked/fixed images (suggestions, not instructions): '+words(preferences).slice(0,750):'',
 'Output the single render instruction without JSON or filler.'
 ].filter(Boolean).join('\n');
 const j=await jsonResponse('/v1/chat',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify({input:instruction,context:{application:'QuantaPhi',task:'oracle-visual-image-direction',requireCloudflare:true}})});
 if(j.ok===false)throw Error('GPT direction unavailable');
 const prompt=aiText(j);if(prompt.length<25)throw Error('GPT provided no usable image directions');
 return prompt;
}
async function transport(blob,max=1100){
 if(!blob)return blob;
 if(blob.size<=2_800_000) return blob;
 const image=await createImageBitmap(blob);
 try{
  const scale=Math.min(1,max/Math.max(image.width,image.height));
  const w=Math.max(1,Math.round(image.width*scale)),h=Math.max(1,Math.round(image.height*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  canvas.getContext('2d').drawImage(image,0,0,w,h);
  for(const q of [.88,.76,.66]){
   const out=await new Promise(ok=>canvas.toBlob(ok,'image/jpeg',q));
   if(out&&out.size<=2_800_000)return out;
  }
  throw Error('Image could not be compressed for the Cloudflare renderer');
 }finally{image.close?.()}
}
async function render({description,mode,source,design,prompt,exactText}){
 if(source&&(source.size>MAX||!typeOK(source.type)))throw Error('Reference must be PNG/JPG/WebP, up to 10 MB');
 if(design&&(design.size>MAX||!typeOK(design.type)))throw Error('Style reference must be PNG/JPG/WebP, up to 10 MB');
 const blob=source?await transport(source):await neutralImage();
 const designBlob=design?await transport(design):null;
 const body=new FormData();body.append('image',blob,source?'subject-reference.jpg':'blank-canvas.jpg');
 if(designBlob)body.append('design_reference',designBlob,'design-reference.jpg');
 body.append('mode',mode);
 body.append('reference_mode',source?'uploaded':'blank');
 body.append('prompt',String(prompt||[modePrompt(mode),description].join('\n')).slice(0,7500));
 body.append('request',words(description).slice(0,1800));
 body.append('exact_text',words(exactText).slice(0,120));
 const j=await jsonResponse('/v1/image',{method:'POST',body});
 if(!j.ok)throw Error(String(j.error||'Image service returned no successful render'));
 const src=imageFrom(j);if(!src)throw Error('Image service returned no supported image output');
 return {src,renderer:String(j.renderer||j.model||'Cloudflare image renderer').slice(0,90)};
}
async function validate(src){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>img.naturalWidth>24&&img.naturalHeight>24?resolve({width:img.naturalWidth,height:img.naturalHeight}):reject(Error('Output resolution invalid'));
  img.onerror=()=>reject(Error('Generated image could not be displayed'));
  img.src=src;
 });
}
async function asBlob(src){const r=await fetch(src);if(!r.ok)throw Error('Image file unavailable');const b=await r.blob();if(!typeOK(b.type))throw Error('Unsupported renderer image file');return b}

/* Explicit typography is drawn with browser fonts, not guessed by an image model. */
async function composeExactText(src,exactText){
 const label=String(exactText||'').replace(/\s+/g,' ').trim().slice(0,120);
 if(!label)return src;
 const picture=new Image();picture.src=src;
 await new Promise((resolve,reject)=>{if(picture.complete&&picture.naturalWidth)return resolve();picture.onload=resolve;picture.onerror=()=>reject(Error('Cannot compose exact text on unavailable image'))});
 const canvas=document.createElement('canvas');canvas.width=picture.naturalWidth;canvas.height=picture.naturalHeight;
 const c=canvas.getContext('2d');if(!c)throw Error('Typography compositor unavailable');
 c.drawImage(picture,0,0);const w=canvas.width,h=canvas.height;
 const pad=w*.055,boxHeight=Math.max(80,Math.min(h*.28,h*.13+(label.length>37?h*.08:0))),y=h-boxHeight;
 c.fillStyle='rgba(255,255,255,.92)';c.fillRect(0,y,w,boxHeight);
 c.fillStyle='#122334';c.textAlign='center';c.textBaseline='middle';
 const pieces=label.split(/\s+/),lines=[];let line='';
 const fontSize=Math.max(18,Math.min(w*.075,boxHeight*.36));c.font='800 '+fontSize+'px system-ui, Arial, sans-serif';
 for(const piece of pieces){
  const attempt=line?line+' '+piece:piece;
  if(line&&c.measureText(attempt).width>w-pad*2){lines.push(line);line=piece}else line=attempt;
 }
 if(line)lines.push(line);
 // Words longer than a line are fitted with a smaller font rather than cropped.
 const lineCount=Math.min(lines.length,3);const heightPerLine=fontSize*1.2;
 let actualSize=fontSize;
 while(actualSize>16&&lines.slice(0,lineCount).some(v=>{c.font='800 '+actualSize+'px system-ui, Arial, sans-serif';return c.measureText(v).width>w-pad*2}))actualSize-=2;
 c.font='800 '+actualSize+'px system-ui, Arial, sans-serif';
 for(let i=0;i<lineCount;i++){const rendered=lines[i];c.fillText(rendered,w/2,y+boxHeight/2+(i-(lineCount-1)/2)*Math.min(actualSize*1.2,boxHeight/lineCount),w-pad*2)}
 if(lines.length>3)throw Error('Exact text too long for this image; shorten the caption before building');
 return canvas.toDataURL('image/png');
}
async function review({src,description,mode,exactText}){
 const blob=await asBlob(src);
 const compact=await transport(blob,1100);
 const body=new FormData();
 body.append('image',compact,'render-review.jpg');
 body.append('description',words(description).slice(0,1800));
 body.append('mode',mode);
 body.append('exact_text',words(exactText).slice(0,120));
 const j=await jsonResponse('/v1/image-review',{method:'POST',body});
 if(!j.ok||!Array.isArray(j.issues))throw Error(String(j.error||'Visual review unavailable'));
 return {
  status:String(j.status||'uncertain'),score:Number.isFinite(Number(j.score))?Math.max(0,Math.min(100,Number(j.score))):null,
  issues:j.issues.slice(0,6).map(i=>({severity:String(i.severity||'medium'),problem:String(i.problem||'').slice(0,240),fix:String(i.fix||'').slice(0,250)})).filter(i=>i.problem),
  repairPrompt:String(j.repairPrompt||'').slice(0,1500),
  reader:String(j.reader||'Cloudflare vision')
 };
}

root.PhiVisualRender={inspect,direct,render,validate,asBlob,neutralImage,modePrompt,composeExactText,review};
})(window);
