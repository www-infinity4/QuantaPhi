/* Share the canonical QuantaPhi URL, not an iframe-local/private viewer URL. */
export function xShareLink(url,title='QuantaPhi Quick Card'){
 const target=new URL('https://x.com/intent/post');
 target.searchParams.set('text',String(title).slice(0,140));
 target.searchParams.set('url',url);
 return target.href;
}
export async function shareQuickCard({url,title,status}={}){
 const target=new URL(String(url),location.origin);
 if(target.origin!==location.origin||!/^https?:$/.test(target.protocol))throw new Error('Invalid QuantaPhi share URL.');
 const set=text=>{if(status)status.textContent=text;};
 if(typeof navigator.share==='function'){
  try{await navigator.share({title:String(title||'QuantaPhi Quick Card'),url:target.href});set('Share sheet opened.');return 'share';}
  catch(error){if(error?.name==='AbortError'){set('Share cancelled.');return 'cancelled';}}
 }
 if(navigator.clipboard?.writeText){
  try{await navigator.clipboard.writeText(target.href);set('Link copied.');return 'copied';}catch{}
 }
 const field=document.createElement('input');field.type='text';field.readOnly=true;field.value=target.href;field.setAttribute('aria-label','Copy share link');field.className='qcp-copy-fallback';
 (status?.parentNode||document.body).append(field);field.focus();field.select();
 set('Select and copy the link.');return 'manual';
}
export function makeShareButton({url,title,label='↗ Share this card',status}={}){
 const b=document.createElement('button');b.type='button';b.className='qcp-share-button';b.textContent=label;
 b.addEventListener('click',()=>void shareQuickCard({url,title,status}).catch(()=>{if(status)status.textContent='Unable to share. Copy the visible card URL instead.';}));
 return b;
}
