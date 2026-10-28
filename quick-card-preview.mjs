/* Universal Quick Card preview: a safe, accessible same-site viewer.
 * Social feeds display publisher-controlled OG images; this dialog supplies
 * REAL first-party interactive controls after a user opens QuantaPhi.
 * Never iframe a third-party login, owner page, bank or arbitrary URL.
 */
export const DEFAULT_PREVIEW_MODE='interactive';
export function normalizePreviewMode(value){
 return value==='visual'?'visual':'interactive';
}
export function safeLocalCardUrl(input,base='https://quantaphi.org/'){
 try{
  const url=new URL(String(input||''),base),origin=new URL(base).origin;
  if(url.origin!==origin||url.username||url.password||!['https:','http:'].includes(url.protocol))return '';
  if(!(/\/(?:cards\/[a-z0-9-]{5,91}|source-quick-card\.html|science-quick-card\.html|quanta-feed-card\.html|bubbles-card-host\.html|storybook\/|studio\/|resonance\.html|trending-now\.html|quick-card-wiring\.html|x-money\.html|levis-501\.html|integra-validation\.html)(?:$|[?#\/])/i.test(url.pathname+url.search)))return '';
  return url.href;
 }catch{return ''}
}
export function safePreviewImage(input,base='https://quantaphi.org/'){
 try{const url=new URL(String(input||''),base);if(url.protocol!=='https:'||url.username||url.password||url.href.length>1600||url.pathname==='/preview.png')return '';
  if(!/\.(?:png|jpg|jpeg|gif|webp)$/i.test(url.pathname)&&!(url.hostname==='lsco.scene7.com'&&url.pathname.startsWith('/is/image/')))return '';
  return url.href;
 }catch{return ''}
}
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
let dialog=null;
function getDialog(){
 if(dialog&&dialog.isConnected)return dialog;
 if(!document.getElementById('qcpRichPreviewCss')){
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/quick-card-preview.css?v=20261028-universal1';sheet.id='qcpRichPreviewCss';document.head.append(sheet);
 }
 dialog=el('dialog','qpr-dialog');dialog.setAttribute('aria-label','Quick Card live preview');
 dialog.addEventListener('close',()=>{dialog.replaceChildren();});
 document.body.append(dialog);
 return dialog;
}
export function openQuickCardPreview({url,title='Quick Card',description='',image='',official='',previewMode=DEFAULT_PREVIEW_MODE}={}){
 if(typeof document==='undefined')return false;
 const target=safeLocalCardUrl(url,location.origin+'/');
 if(!target)return false;
 const popup=getDialog();popup.replaceChildren();
 const header=el('header','qpr-header');
 const heading=el('div','qpr-heading');
 heading.append(el('span','qpr-kicker','QUANTAPHI · QUICK CARD PREVIEW'),el('h2','',String(title).slice(0,130)));
 const close=el('button','qpr-close','✕ Close');close.type='button';close.addEventListener('click',()=>popup.close());
 header.append(heading,close);popup.append(header);
 const photo=safePreviewImage(image,location.origin+'/');
 const mode=normalizePreviewMode(previewMode);
 const describe=el('p','qpr-desc',String(description||'Use the original interactive Quick Card.').slice(0,400));
 popup.append(describe);
 if(mode==='interactive'){
  const area=el('div','qpr-frame-container');
  const frame=el('iframe','qpr-frame');
  frame.title=String(title).slice(0,120)+' interactive Quick Card';
  const src=new URL(target);src.searchParams.set('preview','1');
  frame.src=src.href;
  frame.loading='eager';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  area.append(frame);popup.append(area);
  popup.append(el('p','qpr-note','The actual QuantaPhi card is loaded above. Search, play and other actions work when their real provider connections permit them. If an app blocks framing, open its full page.'));
 }else{
  const cover=el('div','qpr-visual');
  if(photo){
   const img=el('img','qpr-image');img.src=photo;img.alt=String(title).slice(0,100)+' card artwork';
   img.addEventListener('error',()=>{img.remove();cover.append(el('strong','qpr-visual-title',String(title).slice(0,130)),el('span','qpr-visual-label','Source artwork unavailable · open original card'));});
   cover.append(img);
  }
  else{cover.append(el('strong','qpr-visual-title',String(title).slice(0,130)),el('span','qpr-visual-label','Interactive Quick Card · open to use'));}
  popup.append(cover);
 }
 const actions=el('div','qpr-actions');
 const open=el('a','qpr-primary','Open full interactive card');open.href=target;open.target='_blank';open.rel='noopener noreferrer';actions.append(open);
 if(official){try{const u=new URL(official);if(u.protocol==='https:'&&!u.username&&!u.password){
   const source=el('a','qpr-secondary','Official website');source.href=u.href;source.target='_blank';source.rel='noopener noreferrer';actions.append(source);
 }}catch{}}
 popup.append(actions);
 if(typeof popup.showModal==='function')popup.showModal();else popup.setAttribute('open','');
 close.focus();
 return true;
}
