/* Open-source lettering editor for QuantaPhi. Fabric loads only when requested. */
(function(){
'use strict';
const host=document.querySelector('#phiImageBuilder'),api=window.PhiImageBuilder;
if(!host||!api)return;
const $=s=>host.querySelector(s);
const mk=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
const fork='https://cdn.jsdelivr.net/gh/www-infinity4/fabric.js@master/dist/index.min.js';
const fallback='https://cdn.jsdelivr.net/npm/fabric@7.4.0/dist/index.min.js';
const ocrUrl='https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js';
let canvas=null,config=null,loading=false,ocrBusy=false;
function status(msg){const e=$('.pi-type-status');if(e)e.textContent=msg}
function getScript(src,global){
 if(window[global])return Promise.resolve(window[global]);
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');s.async=true;s.src=src;s.crossOrigin='anonymous';
  const timer=setTimeout(()=>{s.remove();reject(Error('Loading timed out'))},20000);
  s.onload=()=>{clearTimeout(timer);window[global]?resolve(window[global]):reject(Error('Library unavailable'))};
  s.onerror=()=>{clearTimeout(timer);s.remove();reject(Error('Could not load library'))};
  document.head.append(s);
 });
}
function dimensions(src){return new Promise((resolve,reject)=>{
 const image=new Image();image.onload=()=>resolve({w:image.naturalWidth,h:image.naturalHeight});
 image.onerror=()=>reject(Error('Image not readable'));image.src=src;
})}
function close(){
 const old=canvas;canvas=null;config=null;
 if(old){try{Promise.resolve(old.dispose()).catch(()=>{})}catch(_){}}
 const panel=$('.pi-type-panel');if(panel)panel.hidden=true;
}
function setup(){
 const row=$('.pi-lettering'),parent=$('.pi-finished');if(!row||!parent)return;
 const launch=mk('button','pi-mode','Position words');launch.type='button';launch.dataset.typeAction='open';row.append(launch);
 const panel=mk('div','pi-type-panel');panel.hidden=true;
 panel.append(mk('h3','','Typography Studio'),mk('p','pi-sub','Use your forked Fabric.js to drag, resize and style readable text. No new AI image render.'));
 const preview=mk('div','pi-type-preview'),surface=mk('canvas');surface.id='pi-type-canvas';preview.append(surface);panel.append(preview);
 const controls=mk('div','pi-type-controls'),input=mk('input','pi-type-text');
 input.type='text';input.maxLength=120;input.placeholder='Exact words';input.setAttribute('aria-label','Exact words');
 controls.append(input);
 const color=mk('input','pi-type-color');color.type='color';color.value='#ffffff';color.title='Text color';controls.append(color);
 const size=mk('input','pi-type-size');size.type='range';size.min='12';size.max='96';size.value='36';size.title='Text size';controls.append(size);
 for(const [key,label] of [['add','Add text'],['remove','Remove selected']]){
  const b=mk('button','pi-mode',label);b.type='button';b.dataset.typeAction=key;controls.append(b);
 }
 panel.append(controls);
 const info=mk('p','pi-type-status','Drag text with your finger to position.');info.setAttribute('aria-live','polite');panel.append(info);
 const actions=mk('div','pi-type-footer');
 for(const [key,label] of [['ocr','Read letters (OCR)'],['save','Apply to image'],['close','Close']]){
  const b=mk('button','pi-mode',label);b.type='button';b.dataset.typeAction=key;actions.append(b);
 }
 panel.append(actions);parent.append(panel);
}
async function open(){
 if(loading)return;if(canvas){close();return}
 const current=api.get();if(!current?.result||!current?.artifact)return;
 loading=true;$('.pi-type-panel').hidden=false;status('Loading your Fabric.js fork…');
 try{
  let fabric;try{fabric=await getScript(fork,'fabric')}catch(_){status('Fork CDN unavailable; trying the same open-source release…');fabric=await getScript(fallback,'fabric')}
  if(!fabric.Canvas||!fabric.FabricImage||!fabric.Textbox)throw Error('Unsupported Fabric version');
  const original=await dimensions(current.result);
  const width=Math.round(Math.min(original.w,Math.max(220,Math.min(430,host.clientWidth-50))));
  const height=Math.round(width*original.h/original.w);
  const el=$('#pi-type-canvas');el.width=width;el.height=height;
  const c=new fabric.Canvas(el,{width,height,enableRetinaScaling:false});
  const bg=await fabric.FabricImage.fromURL(current.result);
  bg.set({left:0,top:0,originX:'left',originY:'top',scaleX:width/bg.width,scaleY:height/bg.height,selectable:false,evented:false});
  c.backgroundImage=bg;c.requestRenderAll();
  canvas=c;config={fabric,original,width,height,id:current.artifact.id};
  status('Loaded. Add lettering, then drag or resize it with your finger.');
 }catch(error){close();$('.pi-type-panel').hidden=false;status('Editor unavailable: '+String(error.message||error).slice(0,130))}
 finally{loading=false}
}
function add(){
 if(!canvas||!config)return;
 const value=String($('.pi-type-text').value||'').trim().slice(0,120);
 if(!value){status('Write exact words first.');return}
 const size=Number($('.pi-type-size').value)||36;
 const item=new config.fabric.Textbox(value,{
  left:config.width*.08,top:config.height*.73,width:config.width*.84,
  fontSize:size,fontFamily:'Arial',fontWeight:'bold',textAlign:'center',
  fill:$('.pi-type-color').value,stroke:'#101828',strokeWidth:Math.max(.5,size*.015),
  paintFirst:'stroke',cornerColor:'#873dff',transparentCorners:false
 });
 canvas.add(item);canvas.setActiveObject(item);canvas.requestRenderAll();
 status('Words added. Move or resize them by touch.');
}
async function save(){
 if(!canvas||!config)return;
 if(api.get()?.artifact?.id!==config.id){status('Image changed; reopen editor.');return}
 const button=$('[data-type-action="save"]');button.disabled=true;
 try{
  canvas.discardActiveObject();canvas.requestRenderAll();
  const output=canvas.toDataURL({format:'png',multiplier:config.original.w/config.width});
  await api.applyEditedImage(output,{source:'fabric-fork'});
  status('Exact lettering applied. Save or share the edited picture. No new AI render.');
 }catch(e){status('Save failed: '+String(e.message||e).slice(0,150))}
 finally{button.disabled=false}
}
async function recognize(){
 if(ocrBusy)return;const src=api.get()?.result;if(!src)return;ocrBusy=true;
 const button=$('[data-type-action="ocr"]');button.disabled=true;let worker=null;
 try{
  status('Loading optional English OCR. Language files download only on demand…');
  const lib=await getScript(ocrUrl,'Tesseract');
  worker=await lib.createWorker('eng');
  const response=await worker.recognize(src);
  const words=String(response?.data?.text||'').replace(/\s+/g,' ').trim().slice(0,260);
  const confidence=Math.round(Number(response?.data?.confidence)||0);
  status(words?'OCR sees ('+confidence+'% confidence): '+words+'. Verify manually; OCR cannot guarantee correct spelling.':'OCR found no clear lettering. Review the picture yourself.');
 }catch(e){status('OCR unavailable: '+String(e.message||e).slice(0,150))}
 finally{try{await worker?.terminate()}catch(_){}ocrBusy=false;button.disabled=false}
}
host.addEventListener('click',e=>{
 const action=e.target.closest('[data-type-action]')?.dataset.typeAction;
 if(action==='open')void open();
 if(action==='close')close();
 if(action==='add')add();
 if(action==='remove'&&canvas){const x=canvas.getActiveObject();if(x){canvas.remove(x);canvas.requestRenderAll()}}
 if(action==='save')void save();
 if(action==='ocr')void recognize();
});
host.addEventListener('input',e=>{
 if(!canvas)return;const selected=canvas.getActiveObject();
 if(!selected||selected.type!=='textbox')return;
 if(e.target.matches('.pi-type-size'))selected.set('fontSize',Number(e.target.value));
 if(e.target.matches('.pi-type-color'))selected.set('fill',e.target.value);
 canvas.requestRenderAll();
});
window.addEventListener('phi:image:build:start',close);
window.addEventListener('pagehide',close);
setup();
})();
