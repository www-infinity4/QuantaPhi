/* Shared, first-party social sharing. An X/OG preview is a linked image:
 * input fields, media players, games and checkout run on the destination page,
 * not inside an arbitrary X image card. Preserve original card interactions. */
const LIMIT={id:90,title:160,description:240,image:1600,destination:1400};
const clean=(value,max)=>String(value??'').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const recognized=url=>url.protocol==='https:'&&url.username===''&&url.password===''&&
 !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|::1$)/.test(url.hostname)&&!url.hostname.endsWith('.local');
export function shareImage(raw){
 try{const u=new URL(raw);return recognized(u)&&u.href.length<=LIMIT.image&&/\.(?:png|jpe?g|webp|gif)$/i.test(u.pathname)?u.href:''}catch{return ''}
}
export function cardAction(card){
 const text=clean([card?.category,card?.kind,card?.feature,card?.name,card?.title].join(' '),300).toLowerCase();
 if(/game|arcade|playable/.test(text))return 'Play in Infinity';
 if(/shop|shopping|jeans|retail|denim|product/.test(text))return 'Shop in Infinity';
 if(/search|google|bing|research|science|archive|studios?/.test(text))return 'Search in Infinity';
 if(/music|watch|video|television|tv|radio|stream|listen/.test(text))return 'Watch in Infinity';
 return 'Explore in Infinity';
}
export function socialShareUrl(card,{origin='https://quantaphi.org',image='',destination='',description=''}={}){
 const base=new URL(origin);
 const id=clean(card?.id,LIMIT.id);
 const title=clean(card?.name||card?.title||id||'Infinity Quick Card',LIMIT.title);
 const rawDestination=destination||card?.route||(
  id&&card?.official?'/source-quick-card.html?card='+encodeURIComponent(id):
  id&&card?.origin==='discovery'?'/quanta-feed-card.html?card='+encodeURIComponent(id):
  '/');
 const nextPage=new URL(rawDestination,base);
 if(nextPage.origin!==base.origin||!['http:','https:'].includes(nextPage.protocol))throw Error('share_target_must_be_first_party');
 // The published community cards already serve their own OG and Twitter metadata.
 if(/^\/cards\/[a-z0-9-]+$/.test(nextPage.pathname))return nextPage.href;
 if(nextPage.pathname==='/q-share'&&nextPage.searchParams.has('card'))return nextPage.href;
 const out=new URL('/q-share',base);
 if(id)out.searchParams.set('id',id);
 out.searchParams.set('title',title);
 out.searchParams.set('text',clean(description||card?.description||card?.feature||card?.category||
  'Explore the actual interactive card in Infinity / QuantaPhi.',LIMIT.description));
 const picture=shareImage(image||card?.image||card?.photo||'');
 if(picture)out.searchParams.set('image',picture);
 out.searchParams.set('action',cardAction(card));
 out.searchParams.set('dest',nextPage.pathname+nextPage.search+nextPage.hash);
 return out.href;
}
