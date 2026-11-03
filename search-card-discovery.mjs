/* Search-sourced, device-local website Quick Card previews.
 * Never a merchant approval, advertisement, cloud publication or checkout.
 * Permanent cards must use the reviewed Cloudflare catalog pipeline.
 */
export const DISCOVERED_CARD_STORAGE_KEY='quantaPhiDiscoveredWebsitesV1';
const excludedSuffixes=['.local','.localhost','.test','.example','.invalid','.internal','.onion'];
const clean=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const plain=value=>String(value??'').replace(/[\x00-\x1f\x7f<>]/g,'').trim().slice(0,90);
function safeWebsite(input){
 const raw=String(input??'').trim();
 if(!raw||raw.length>300||/\s/.test(raw)||/^(?!https?:\/\/)[a-z]+:/i.test(raw)||/^http:\/\//i.test(raw))return null;
 let url;
 try{url=new URL(/^https:\/\//i.test(raw)?raw:'https://'+raw)}catch{return null}
 const hostname=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port||!hostname.includes('.')||excludedSuffixes.some(s=>hostname.endsWith(s)))return null;
 if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(hostname)||hostname.length>180||hostname.startsWith('xn--')||hostname.split('.').some(x=>x.startsWith('-')||x.endsWith('-')))return null;
 if(/^\d+\.\d+\.\d+\.\d+$/.test(hostname)||!/^[a-z]{2,24}$/.test(hostname.split('.').at(-1)))return null;
 if(url.hash||url.username||url.password)return null;
 const normalizedHost=hostname.startsWith('www.')?hostname.slice(4):hostname;
 return {hostname:normalizedHost,official:new URL('/',url.origin).href};
}
export function createDiscoveredCard(website,name){
 const site=safeWebsite(website);if(!site)return null;
 const readable=plain(name||site.hostname.split('.')[0].replace(/[-_]+/g,' '));
 if(!readable)return null;
 const slug=site.hostname.replace(/[^a-z0-9]+/g,'-');
 let id='discovered-'+slug;
 if(id.length>70){
  let hash=2166136261;
  for(const char of site.hostname)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  id='discovered-'+slug.slice(0,45)+'-'+hash.toString(36);
 }
 return Object.freeze({
  id,name:readable,kind:'Website',category:'Websites',official:site.official,
  feature:'Open original website',sourceStatus:'typed-domain',
  description:'Independent search-sourced website preview, not verified as a merchant partner, paid advertisement or authorized checkout.',
  route:'/discovered-quick-card.html?site='+encodeURIComponent(site.official)+'&name='+encodeURIComponent(readable)
 });
}
export function discoverWebsiteCard(query,results,existingCards=[]){
 if(existingCards?.length)return null;
 const original=String(query??'').trim();
 if(!original||original.length>90)return null;
 // A complete domain is the visitor's own explicitly chosen site.
 const direct=createDiscoveredCard(original);
 if(direct&&(/^[a-z0-9.-]+\/?$/i.test(original)||/^https:\/\/[^\s]+$/i.test(original)))return direct;
 const q=clean(original),compact=q.replace(/ /g,'');
 if(q.length<2||q.length>55||compact.length>35||!Array.isArray(results))return null;
 const matches=[];
 for(const result of results.slice(0,20)){
  const url=safeWebsite(result?.url);if(!url)continue;
  // Require an apex domain for inferred brand identity; ge.com.evil.com is not GE.
  if(url.hostname.split('.').length!==2)continue;
  const firstLabel=url.hostname.split('.')[0].replace(/-/g,'');
  const title=clean(result?.title);
  // Search title AND exact brand-domain match. A random result or ad is not authority.
  if(firstLabel!==compact||!(title===q||title.startsWith(q+' ')||title.endsWith(' '+q)))continue;
  if(matches.some(x=>x.hostname===url.hostname))continue;
  matches.push(url);
 }
 if(matches.length!==1)return null; // Ambiguous brands need user selection, not guessed ownership.
 const card=createDiscoveredCard(matches[0].official,plain(original));if(!card)return null;
 return Object.freeze({...card,sourceStatus:'search-result'});
}
function load(storage){
 let items;
 try{items=JSON.parse(storage?.getItem(DISCOVERED_CARD_STORAGE_KEY)||'[]')}catch{return []}
 if(!Array.isArray(items))return [];
 return items.slice(0,200).map(item=>{
  const card=createDiscoveredCard(item?.official,item?.name);
  return card?{...card,sourceStatus:item.sourceStatus==='search-result'?'search-result':'typed-domain'}:null;
 }).filter(Boolean);
}
export function rememberDiscoveredCard(card,storage=globalThis.localStorage){
 const safe=createDiscoveredCard(card?.official,card?.name);if(!safe)return false;
 const existing=load(storage);
 if(existing.some(item=>item.id===safe.id))return true;
 const entry={...safe,sourceStatus:card.sourceStatus==='search-result'?'search-result':'typed-domain'};
 try{storage?.setItem(DISCOVERED_CARD_STORAGE_KEY,JSON.stringify([entry,...existing].slice(0,200)));return true}catch{return false}
}
export function findRememberedCard(name,storage=globalThis.localStorage){
 const query=clean(name);if(!query)return null;
 return load(storage).find(card=>clean(card.name)===query||clean(card.official.replace(/^https:\/\//,''))===query||clean(card.id)===query)||null;
}
