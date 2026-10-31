/* Transient presentation state, bound to the original card node and identity.
 * Shared product URLs select existing checked items; they never start a fetch. */
const current=new WeakMap();
const plain=(value,max)=>String(value||'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export function spotlightSourceUrl(value,official){
 try{const u=new URL(String(value)),base=new URL(official),host=base.hostname.replace(/^www\./,'');
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>1800)return '';
  return u.hostname===host||u.hostname.endsWith('.'+host)?u.href:'';
 }catch{return ''}
}
export function rememberSpotlightCreative(article,card,row){
 if(!article||!card?.id)return;
 const url=spotlightSourceUrl(row?.url,card.official),title=plain(row?.title,160);
 if(!url||!title){current.delete(article);return}
 current.set(article,{id:card.id,url,title,image:String(row.image||''),description:plain(row.description,260),checkedAt:row.checked_at});
}
export function forgetSpotlightCreative(article){if(article)current.delete(article)}
export function currentSpotlightCreative(article,card,now=Date.now()){
 const item=article&&current.get(article);if(!item||item.id!==card?.id||article.dataset?.spotlightManual==='true')return null;
 const checked=Date.parse(item.checkedAt);
 if(!Number.isFinite(checked)||checked>now+300000||now-checked>7*86400000||!spotlightSourceUrl(item.url,card.official))return null;
 return {...item};
}
export function requestedSpotlight(items,requested,official){
 const url=spotlightSourceUrl(requested,official);
 return url?items.find(item=>item.url===url)||null:null;
}
export function spotlightCardDestination(destination,creative,origin){
 const target=new URL(destination,origin);
 if(target.origin!==new URL(origin).origin)return '';
 if(creative)target.searchParams.set('spotlight',creative.url);
 return target.href;
}
