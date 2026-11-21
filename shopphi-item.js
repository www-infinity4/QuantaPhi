(async()=>{
'use strict';
const $=id=>document.getElementById(id),show=(id,value)=>$(id).textContent=String(value??'');
const id=new URL(location.href).searchParams.get('id');
if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id||'')){show('state','This seller listing link is invalid.');return;}
try{
 const response=await fetch('/quant-ai/api/shopphi/public/'+encodeURIComponent(id),{cache:'no-store'});
 const data=await response.json();
 if(!response.ok||data.ok!==true||data.listing?.listingId!==id||data.listing.status!=='published')throw Error('Listing is not publicly available.');
 const x=data.listing;document.title=x.title+' · ShopPhi';
 show('title',x.title);show('price',x.priceLabel);show('description',x.description);
 for(const key of ['merchant','condition','quantity','shipping','category'])show(key,x[key]);
 const images=Array.isArray(x.photoUrls)?x.photoUrls.filter(u=>u.startsWith('/quant-ai/api/shopphi/media/')):[];
 if(!images.length&&/^https:\/\/[^ ]+$/.test(x.imageUrl||''))images.push(x.imageUrl);
 if(images.length){
  const hero=$('photo');hero.src=images[0];hero.alt='Seller-provided image of '+x.title;hero.hidden=false;
  hero.addEventListener('error',()=>{hero.hidden=true;show('state','The seller photo could not be loaded; the listing details are still available.');});
  for(const url of images.slice(0,8)){const img=document.createElement('img');img.src=url;img.alt='Seller photo of '+x.title;
   img.loading='lazy';img.addEventListener('click',()=>{hero.src=url;hero.hidden=false});$('photos').append(img)}
 }
 if(x.sourceUrl?.startsWith('https://')){const a=$('original');a.href=x.sourceUrl;a.hidden=false;}
 $('share').addEventListener('click',async()=>{try{if(navigator.share)await navigator.share({title:x.title,url:location.href});
  else await navigator.clipboard.writeText(location.href);show('state','Item link shared/copied.');}
  catch(e){show('state',e.name==='AbortError'?'Sharing cancelled.':'Sharing unavailable on this device.')}});
 $('listing').hidden=false;show('state','Published, shareable unlisted listing · not an approved paid advertisement.');
}catch{show('state','This item is private, removed or unavailable. No public listing was confirmed.')}
})();