/* Share the canonical QuantaPhi URL, not an iframe-local/private viewer URL. */
function crawlerShareUrl(url,title,image='',description=''){
 const target=new URL(String(url));
 if(target.origin!=='https://quantaphi.org'||target.pathname==='/q-share')return target.href;
 const u=new URL('/q-share',target.origin);
 u.searchParams.set('title',String(title||'Quick Card').slice(0,160));
 if(description)u.searchParams.set('text',String(description).replace(/\s+/g,' ').slice(0,420));
 u.searchParams.set('kind','card');
 u.searchParams.set('dest',target.href);
 if(image){try{const img=new URL(image,target.origin);if(img.protocol==='https:'&&!img.username&&!img.password)u.searchParams.set('image',img.href)}catch(_){}}
 return u.href;
}
export function xShareLink(url,title='QuantaPhi Quick Card',image='',description=''){
 const target=new URL('https://x.com/intent/post');
 target.searchParams.set('text',String(title).slice(0,140));
 target.searchParams.set('url',(image||description)?crawlerShareUrl(url,title,image,description):url);
 return target.href;
}
export async function shareQuickCard({url,title,status,image='',description=''}={}){
 const target=new URL(String(url),location.origin);
 if(target.origin!==location.origin||!/^https?:$/.test(target.protocol))throw new Error('Invalid QuantaPhi share URL.');
 const set=text=>{if(status)status.textContent=text;};
 const sharedUrl=(image||description)?crawlerShareUrl(target.href,title,image,description):target.href;
 if(typeof navigator.share==='function'){
  try{await navigator.share({title:String(title||'QuantaPhi Quick Card'),url:sharedUrl});set('Share sheet opened.');return 'share';}
  catch(error){if(error?.name==='AbortError'){set('Share cancelled.');return 'cancelled';}}
 }
 if(navigator.clipboard?.writeText){
  try{await navigator.clipboard.writeText(sharedUrl);set('Link copied.');return 'copied';}catch{}
 }
 const field=document.createElement('input');field.type='text';field.readOnly=true;field.value=sharedUrl;field.setAttribute('aria-label','Copy share link');field.className='qcp-copy-fallback';
 (status?.parentNode||document.body).append(field);field.focus();field.select();
 set('Select and copy the link.');return 'manual';
}
export function makeShareButton({url,title,image='',description='',label='↗ Share this card',status}={}){
 const b=document.createElement('button');b.type='button';b.className='qcp-share-button';b.textContent=label;
 b.addEventListener('click',()=>void shareQuickCard({url,title,image,description,status}).catch(()=>{if(status)status.textContent='Unable to share. Copy the visible card URL instead.';}));
 return b;
}
