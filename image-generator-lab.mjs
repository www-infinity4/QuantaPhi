/* Infinity® Image Generator Quick Cards.
 * One reviewed catalog entry becomes one real, local SVG-generating Quick Card.
 * No external image API calls, no hidden providers, no copied third-party code.
 */
import {normalizeGeneratorSources,generateImageSvg,nextGeneratorIndex} from './image-generator-source-core.mjs';
const root=document.getElementById('imageGeneratorCarousel');
function el(tag,className,text){
 const node=document.createElement(tag);if(className)node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
}
function button(text,className,fn){
 const b=el('button',className,text);b.type='button';b.addEventListener('click',fn);return b;
}
function sourceLink(text,href){
 const a=el('a','igl-source-link',text);a.href=href;a.rel='noopener noreferrer';a.target='_blank';return a;
}
if(root){
 root.classList.add('igl-root');
 root.setAttribute('aria-roledescription','carousel');
 root.setAttribute('aria-label','Image Generator Quick Cards');
 const header=el('header','igl-header');
 header.append(el('p','igl-kicker','INFINITY® · IMAGE GENERATOR LAB'),el('h2','','Create images right here'),el('p','igl-intro','One real generator per Quick Card. Type an idea, Print image, then save your own SVG or PNG. Source-backed creative tools, no paid key required.'));
 const nav=el('div','igl-navigation'),stage=el('div','igl-stage'),count=el('span','igl-count','Checking reviewed sources…');
 const previous=button('‹','igl-arrow',()=>advance(-1)),next=button('›','igl-arrow',()=>advance(1));
 previous.setAttribute('aria-label','Previous image generator');next.setAttribute('aria-label','Next image generator');
 count.setAttribute('role','status');count.setAttribute('aria-live','polite');
 nav.append(previous,count,next);
 const message=el('p','igl-catalog-note','Generator sources are research references. Every drawing is original QuantaPhi artwork generated locally; no third-party model or avatar style is embedded.');
 root.append(header,nav,stage,message);
 let records=[],index=0,objectUrl=null;
 const drafts=new Map();
 function clearPreview(){
  if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}
 }
 function preview(img,svg,record,prompt,variation){
  clearPreview();
  objectUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  img.src=objectUrl;
  img.alt=record.title+' original vector artwork for '+String(prompt).slice(0,90);
  img.dataset.generatorVariation=String(variation);
 }
 function download(blob,filename,status){
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  status.textContent='Download requested: '+filename+'. Check your browser downloads.';
 }
 function card(record){
  const article=el('article','igl-card');
  article.setAttribute('aria-label',record.title+' original image generator');
  article.dataset.generatorId=record.id;
  const title=el('h3','',record.title),tagline=el('p','igl-tagline',record.tagline);
  const frame=el('div','igl-artwork'),img=el('img','igl-image');
  img.loading='eager';img.decoding='async';img.width=960;img.height=640;
  frame.append(img);
  const label=el('label','igl-label','Describe your artwork');label.htmlFor='igl-prompt';
  const prompt=el('textarea','igl-prompt');prompt.id='igl-prompt';prompt.rows=2;
  prompt.maxLength=150;prompt.placeholder='Example: '+record.examplePrompt;
  const actionRow=el('div','igl-actions'),downloads=el('div','igl-downloads');
  const status=el('p','igl-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const source=el('div','igl-provenance');
  source.append(el('p','',record.rightsNote),el('small','','Source checked '+record.sourceCheckedAt+' · '+record.sourceLicense+' · Reference only'));
  const links=el('div','igl-source-links');
  links.append(sourceLink('GitHub source',record.sourceUrl),sourceLink('Visit original project',record.websiteUrl));
  source.append(links);
  const stored=drafts.get(record.id)||{text:record.examplePrompt,variation:0};
  prompt.value=stored.text;
  let currentSvg='';
  function print(userAction){
   const text=prompt.value.trim()||record.examplePrompt;
   const variation=userAction?Math.min(9999,(drafts.get(record.id)?.variation??stored.variation)+1):stored.variation;
   try{
    currentSvg=generateImageSvg({mode:record.mode,prompt:text,variation});
    drafts.set(record.id,{text,variation});
    preview(img,currentSvg,record,text,variation);
    status.textContent=userAction?'Image generated on your device. Save PNG or SVG below.':'Original example image generated locally. Edit the prompt and Print image.';
   }catch(error){
    clearPreview();img.removeAttribute('src');currentSvg='';
    status.textContent='The original image could not be generated. '+String(error.message||'').slice(0,150);
   }
  }
  const printButton=button('Print image','igl-primary',()=>print(true));
  actionRow.append(printButton);
  const saveSvg=button('Save SVG','igl-secondary',()=>{
   if(!currentSvg){status.textContent='Print an image before saving.';return}
   download(new Blob([currentSvg],{type:'image/svg+xml;charset=utf-8'}),record.id+'.svg',status);
  });
  const savePng=button('Save PNG','igl-secondary',async()=>{
   if(!currentSvg){status.textContent='Print an image before saving.';return}
   savePng.disabled=true;status.textContent='Preparing PNG on your device…';
   const url=URL.createObjectURL(new Blob([currentSvg],{type:'image/svg+xml;charset=utf-8'}));
   try{
    const bitmap=new Image();
    await new Promise((resolve,reject)=>{bitmap.onload=resolve;bitmap.onerror=()=>reject(Error('SVG could not be decoded'));bitmap.src=url;});
    const canvas=document.createElement('canvas');canvas.width=960;canvas.height=640;
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas is unavailable');
    ctx.drawImage(bitmap,0,0,960,640);
    const image=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG encoding failed')),'image/png'));
    download(image,record.id+'.png',status);
   }catch(error){status.textContent='PNG export unavailable: '+String(error.message||error).slice(0,140)+'. SVG saving is still available.'}
   finally{URL.revokeObjectURL(url);savePng.disabled=false}
  });
  downloads.append(savePng,saveSvg);
  article.append(title,tagline,frame,label,prompt,actionRow,downloads,status,source);
  print(false);
  return article;
 }
 function show(){
  if(!records.length){previous.disabled=next.disabled=true;return}
  clearPreview();stage.replaceChildren();
  const record=records[index];
  stage.append(card(record));
  count.textContent=(index+1)+' / '+records.length+' · '+record.title;
  previous.disabled=next.disabled=records.length<2;
 }
 function advance(direction){if(!records.length)return;index=nextGeneratorIndex(index,direction,records.length);show()}
 root.addEventListener('keydown',event=>{
  if(event.target.matches('input,textarea,select,a,button,[contenteditable]'))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();advance(event.key==='ArrowLeft'?-1:1)}
 });
 let start=null;
 stage.addEventListener('touchstart',event=>{
  const touch=event.touches[0];start=touch?{x:touch.clientX,y:touch.clientY}:null;
 },{passive:true});
 stage.addEventListener('touchend',event=>{
  if(!start||event.target.closest('input,textarea,select,button,a,[contenteditable]'))return;
  const touch=event.changedTouches[0];if(!touch)return;
  const dx=touch.clientX-start.x,dy=touch.clientY-start.y;start=null;
  if(Math.abs(dx)>85&&Math.abs(dx)>Math.abs(dy)*1.5)advance(dx>0?-1:1);
 },{passive:true});
 window.addEventListener('pagehide',clearPreview,{once:true});
 fetch(new URL('./data/image-generator-sources.json',import.meta.url),{cache:'no-cache'})
  .then(response=>{if(!response.ok)throw Error('HTTP '+response.status);return response.json()})
  .then(raw=>{records=normalizeGeneratorSources(raw);if(!records.length)throw Error('No reviewed image generator sources');show()})
  .catch(error=>{previous.disabled=next.disabled=true;count.textContent='Image generator sources unavailable';stage.replaceChildren(el('p','igl-error','The reviewed catalog did not load. No unverified generator cards were shown. '+String(error.message||'').slice(0,100)))});
}
