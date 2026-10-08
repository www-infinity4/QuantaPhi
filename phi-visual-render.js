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
 const response=await fetch(BASE+path,options);
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(String(data.error||data.detail||'Service unavailable').slice(0,220));
 return data;
}
async function inspect(file){
 if(!file)return '';
 if(file.size>MAX||!typeOK(file.type))throw Error('Reference must be PNG/JPG/WebP, up to 10 MB');
 const body=new FormData();body.append('image',file,file.name||'reference.jpg');
 body.append('purpose','full-read');body.append('detail','full');
 body.append('instructions','Read the actual image, exact printed words, subject, marks, color and visual composition. Only report visible evidence; avoid guesses.');
 const j=await jsonResponse('/v1/image-read',{method:'POST',body});
 if(!j.ok)throw Error('Image reader returned no result');
 return [j.summary,j.description,j.output_text,j.text,j.caption,j.detected?.subject].filter(x=>typeof x==='string').join('\n').slice(0,1200);
}
function modePrompt(mode){
 return ({
 'Image':'Create one premium standalone image. Take the user request literally, with compelling composition.',
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
 const {description,mode,vision,story,search,hasUpload,designFile}=input;
 const instruction=[
 'You are Oracle, a GPT director for a premium image generation model.',
 'Write ONE detailed render instruction in plain text. Do not claim an image was already made.',
 'Honor identity, appearance, exact visible text and the explicit user instruction. Do not invent factual claims.',
 'Image type: '+mode,modePrompt(mode),
 'User request: '+description,
 vision?'Verified observations about uploaded image: '+vision:'',
 story?'Optional sourced story inspiration: '+story:'',
 search?'Relevant search context: '+search:'',
 hasUpload?'Preserve uploaded subject reference where useful.':'Text-only creation: neutral starting canvas contains no subject; invent the illustration from text.',
 designFile?'A separate design reference will be provided.':'',
 'Output the single render instruction without JSON or filler.'
 ].filter(Boolean).join('\n');
 const j=await jsonResponse('/v1/chat',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify({input:instruction,context:{application:'QuantaPhi',task:'oracle-visual-image-direction',requireCloudflare:true}})});
 if(j.ok===false)throw Error('GPT direction unavailable');
 const prompt=aiText(j);if(prompt.length<25)throw Error('GPT provided no usable image directions');
 return prompt;
}
async function render({description,mode,source,design,prompt}){
 if(source&&(source.size>MAX||!typeOK(source.type)))throw Error('Reference must be PNG/JPG/WebP, up to 10 MB');
 if(design&&(design.size>MAX||!typeOK(design.type)))throw Error('Style reference must be PNG/JPG/WebP, up to 10 MB');
 const blob=source||await neutralImage();
 const body=new FormData();body.append('image',blob,source?.name||'blank-canvas.jpg');
 if(design)body.append('design_reference',design,design.name||'design-reference.jpg');
 body.append('prompt',String(prompt||[modePrompt(mode),description].join('\n')).slice(0,7500));
 body.append('request',words(description).slice(0,1800));
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
root.PhiVisualRender={inspect,direct,render,validate,asBlob,neutralImage,modePrompt};
})(window);
