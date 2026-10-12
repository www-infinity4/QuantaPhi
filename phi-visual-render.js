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
  let response;
  try{response=await fetch(BASE+path,{...options,signal:controller.signal})}
  catch(networkError){
   const timeout=controller.signal.aborted||networkError?.name==='AbortError';
   const error=new Error(timeout?'Image service timed out before a render was confirmed.':'Cannot contact the image service. Check the network connection and try again.');
   error.code=timeout?'image_render_timeout':'image_render_network';
   throw error;
  }
  let data={};
  try{data=await response.json()}catch(parseError){
   const error=new Error('Image service returned an unreadable response ('+response.status+').');
   error.code='image_render_bad_response';error.status=response.status;throw error;
  }
  if(!response.ok||data?.ok===false){
   const error=new Error(String(data?.error||data?.detail||('Image service HTTP '+response.status)).slice(0,220));
   error.code=String(data?.code||data?.error||('image_http_'+response.status));
   error.status=response.status;
   error.suggestion=String(data?.suggestion||'').slice(0,240);
   throw error;
  }
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
/* Image models do not understand "no text": every mention of letters, titles,
   signs or quoted words primes them to paint unreadable pseudo-writing. The
   painter therefore receives only pictorial vocabulary; exact words are drawn
   afterward with real browser fonts. */
const TEXT_TOPIC=/\b(?:text|texts|textual|letters?|lettering|lettered|words?|wording|typograph\w*|typeset\w*|typefaces?|fonts?|captions?|headlines?|subtitles?|titles?|titled|taglines?|slogans?|writing|written|scripts?|alphabets?|glyphs?|inscriptions?|inscribed|calligraph\w*|handwrit\w*|printed|watermarks?|signatures?|monograms?|lorem|ipsum|quotations?|quotes?|readable|legible|illegible|gibberish|pseudo[- ]?\w+|numerals?|digits?)\b/i;
const ERASE=/^\s*(?:please\s+)?(?:remove|erase|delete|clean away|paint over)\b/i;
const SAYING=/\b(?:(?:that|which)\s+(?:says|said|reads|read)|saying|spell(?:s|ing)?\s+out|titled|entitled|labell?ed|captioned|inscribed\s+with|with\s+the\s+(?:words?|text|phrase|caption|title|name))\b[^.,;:!?\n]*/gi;
const OBJECTS=[
 [/\b(?:neon\s+|street\s+|shop\s+|store\s+|road\s+)?(?:signs?|signage|signboards?)\b/gi,'plain panel'],
 [/\blabels?\b/gi,'plain tag'],
 [/\blogos?\b/gi,'simple emblem shape'],
 [/\b(?:nameplates?|name plates?|placards?|plaques?)\b/gi,'smooth plate'],
 [/\bbanners?\b/gi,'plain fabric banner']
];
function pictorialPrompt(value,fallback=''){
 let text=String(value||'')
  .replace(/["\u201c\u201d\u00ab\u00bb\u201e][^"\u201c\u201d\u00ab\u00bb\u201e\n]{0,200}["\u201c\u201d\u00ab\u00bb\u201e]/g,' ')
  .replace(/\u2018[^\u2019\n]{1,200}\u2019/g,' ')
  .replace(/(^|\s)'[^'\n]{1,200}'(?=\s|[.,;:!?]|$)/g,'$1 ')
  .replace(SAYING,' ');
 for(const [pattern,plain] of OBJECTS)text=text.replace(pattern,plain);
 const kept=[];
 for(const sentence of text.split(/(?<=[.!?;\n])\s+/)){
  if(ERASE.test(sentence)){kept.push(sentence.trim());continue}
  const clauses=sentence.split(/\s*(?:,|\u2014|\s-\s|\(|\))\s*/).filter(clause=>clause.trim()&&!TEXT_TOPIC.test(clause));
  if(clauses.length)kept.push(clauses.join(', ').replace(/[,\s]+([.!?;])$/,'$1').trim());
 }
 const result=kept.join(' ').replace(/\s+([.,;:!?])/g,'$1').replace(/\s{2,}/g,' ').trim();
 return result.length>=20?result:String(fallback||result).trim();
}
function modePrompt(mode){
 return ({
 'Image':'Create one premium standalone image. Take the user request literally, with compelling composition and credible physical geometry.',
 'Trading Card':'Create a genuine sharp-corner trading card for any subject: sports, music, technology, movies, history or artwork. Use a cohesive set style with smooth plain color bands in the frame, not an empty template or card mockup.',
 'Advertisement':'Create a polished advertising illustration that showcases the product or subject with generous calm negative space.',
 'Billboard':'Design a wide, high-impact billboard image with a strong single focal point and a calm open area of plain color.',
 'Poster':'Create finished poster artwork with a smooth plain color band across the lower third.',
 'Cover Art':'Create professionally composed cover artwork or album art with a calm open area of plain color near the top.'
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
 'Direct the painter to create imagery and plain surfaces only. Typography is handled afterward in the browser, not during image generation.',
 'Never mention text, letters, words, numbers, titles, captions, signs, labels, logos, writing or typography in your instruction, not even to forbid them: image models paint whatever these words name. Describe smooth plain color areas instead.',
 'Image type: '+mode,modePrompt(mode),
 'User request: '+description,
 vision?'Verified observations about uploaded image: '+vision:'',
 story?'Optional sourced story inspiration: '+story:'',
 search?'Relevant search context: '+search:'',
 hasUpload?'Preserve uploaded subject reference where useful.':'Text-only creation: create the illustration directly from the user description.',
 designFile?'A separate design reference will be provided.':'',
 exactText?'Keep a smooth, uncluttered band of plain color across the lower third of the picture. Do not include the requested words in the painting instructions.':'',
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
/* FLUX.2 reference images must be smaller than 512x512. Size in bytes is NOT
   enough: phone photos often exceed model pixel limits despite small files. */
async function fluxReference(blob){
 if(!blob)return null;
 const image=await createImageBitmap(blob);
 try{
  const scale=Math.min(1,500/Math.max(image.width,image.height));
  const width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Cannot prepare reference image');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
  ctx.drawImage(image,0,0,width,height);
  const resized=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));
  if(!resized||resized.size>2_800_000)throw Error('Reference image could not be prepared for FLUX');
  return resized;
 }finally{image.close?.()}
}
async function render({description,mode,source,design,prompt,exactText}){
 if(source&&(source.size>MAX||!typeOK(source.type)))throw Error('Reference must be PNG/JPG/WebP, up to 10 MB');
 if(design&&(design.size>MAX||!typeOK(design.type)))throw Error('Style reference must be PNG/JPG/WebP, up to 10 MB');
 const blob=source?await fluxReference(source):null;
 const designBlob=design?await fluxReference(design):null;
 const body=new FormData();
 // FLUX text-to-image is prompt-only: never append a fake white canvas.
 if(blob)body.append('image',blob,'subject-reference.jpg');
 if(designBlob)body.append('design_reference',designBlob,'design-reference.jpg');
 body.append('mode',mode);
 body.append('reference_mode',source?'uploaded':design?'style-only':'text-only');
 const artOnly='PURE PICTURE: imagery only, built from shapes, color, texture and light. Every surface, panel, wall, screen and fabric is smooth, plain and unmarked.';
 const scene=pictorialPrompt(prompt||[modePrompt(mode),description].join('\n'),pictorialPrompt(description,modePrompt(mode)));
 body.append('prompt',artOnly+'\n'+scene.slice(0,7500-artOnly.length-1));
 body.append('request',words(description).slice(0,1800));
 body.append('exact_text',words(exactText).slice(0,120));
 const j=await jsonResponse('/v1/image',{method:'POST',body});
 if(!j.ok){const error=new Error(String(j.error||'Image service returned no successful render'));error.code=String(j.code||j.error||'image_render_failed');throw error;}
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
  status:String(j.status||'uncertain'),score:j.score!==null&&j.score!==undefined&&j.score!==''&&Number.isFinite(Number(j.score))?Math.max(0,Math.min(100,Number(j.score))):null,
  issues:j.issues.slice(0,6).map(i=>({severity:String(i.severity||'medium'),problem:String(i.problem||'').slice(0,240),fix:String(i.fix||'').slice(0,250)})).filter(i=>i.problem),
  repairPrompt:String(j.repairPrompt||'').slice(0,1500),
  reader:String(j.reader||'Cloudflare vision')
 };
}

root.PhiVisualRender={inspect,direct,render,validate,asBlob,neutralImage,modePrompt,pictorialPrompt,composeExactText,review};
})(window);

