/* Public factual Weedmaps catalog references for a visitor-led 21+ research
 * carousel. Neither commercial advertising nor Weedmaps API/partner integration.
 * All source content withheld until this-visit acknowledgment. No paid
 * sponsorship, user profiling, availability/prices or image reuse rights. */
export const BRUCE_BANNER_SOURCES=Object.freeze([
 {
  "id": "bruce-banner-strain",
  "title": "Bruce Banner · strain reference",
  "subtitle": "Dark Horse Genetics · OG Kush × Strawberry Diesel",
  "format": "Strain reference",
  "summary": "Read the independent Weedmaps reference on Bruce Banner's genetics and reported effects. Not a health claim.",
  "url": "https://weedmaps.com/strains/bruce-banner",
  "kind": "independent-source",
  "official_domain": "weedmaps.com"
 },
 {
  "id": "illicit-bruce-banner-flower",
  "title": "ILLICIT · Bruce Banner flower",
  "subtitle": "3.5 g product listing",
  "format": "Flower",
  "summary": "View ILLICIT's Bruce Banner flower entry as published on Weedmaps. Check actual retail information on the original site.",
  "url": "https://weedmaps.com/brands/illicit/products/illicit-bruce-banner-3-5g-flower",
  "kind": "independent-source",
  "official_domain": "weedmaps.com"
 },
 {
  "id": "illicit-bruce-banner-rosin",
  "title": "ILLICIT · Bruce Banner cold cure",
  "subtitle": "Rosin product listing",
  "format": "Rosin",
  "summary": "Read the Monopoly Melts powered by ILLICIT cold-cure rosin entry on Weedmaps.",
  "url": "https://weedmaps.com/brands/illicit/products/illicit-live-cold-cure-rosin-bruce-banner-1g",
  "kind": "independent-source",
  "official_domain": "weedmaps.com"
 },
 {
  "id": "illicit-bruce-banner-resin",
  "title": "ILLICIT · Bruce Banner live resin",
  "subtitle": "Disposable cartridge reference",
  "format": "Live resin",
  "summary": "See ILLICIT's Bruce Banner live-resin disposable product description on Weedmaps.",
  "url": "https://weedmaps.com/brands/illicit/products/illicit-bruce-banner-1g-live-resin-disposable-cart",
  "kind": "independent-source",
  "official_domain": "weedmaps.com"
 },
 {
  "id": "illicit-bruce-banner-cartridge",
  "title": "ILLICIT · Bruce Banner cartridge",
  "subtitle": "0.5 g live-resin listing",
  "format": "Live resin cartridge",
  "summary": "Review the original ILLICIT Bruce Banner cartridge reference on Weedmaps.",
  "url": "https://weedmaps.com/brands/illicit/products/illicit-bruce-banner-live-resin-0-5g-cartridge-9ad1cf80-af8b-4ae2-a923-723cd2fb4e1f",
  "kind": "independent-source",
  "official_domain": "weedmaps.com"
 },
 {
  "id": "illicit-bruce-banner-sugar",
  "title": "ILLICIT · Bruce Banner live sugar",
  "subtitle": "Concentrate product reference",
  "format": "Live sugar",
  "summary": "Open the Bruce Banner live-sugar source entry, published by Weedmaps.",
  "url": "https://weedmaps.com/brands/illicit/products/illicit-bruce-banner-1g-live-sugar-cdbb7f3e-d52e-48d2-bfe7-9829ec70f23e",
  "kind": "independent-source",
  "official_domain": "weedmaps.com"
 },
 {
  "id": "illicit-bruce-banner-badder",
  "title": "ILLICIT · Bruce Banner live badder",
  "subtitle": "Concentrate product reference",
  "format": "Live badder",
  "summary": "Open Weedmaps' ILLICIT Bruce Banner live-badder description and original publisher details.",
  "url": "https://weedmaps.com/brands/illicit/products/illicit-bruce-banner-1g-live-badder",
  "kind": "independent-source",
  "official_domain": "weedmaps.com"
 },
 {
  "id": "illicit-brand-weemaps",
  "title": "ILLICIT · publisher brand profile",
  "subtitle": "Original Weedmaps ILLICIT brand catalog",
  "format": "Brand reference",
  "summary": "Browse the ILLICIT brand's publisher profile. This is not an endorsement or statement of nearby availability.",
  "url": "https://weedmaps.com/brands/illicit",
  "kind": "independent-source",
  "official_domain": "weedmaps.com"
 }
].map(x=>Object.freeze(x)));
export function eligibleBannerSource(item,acknowledged){
 if(acknowledged!==true||!item||item.kind!=='independent-source'||
   item.official_domain!=='weedmaps.com'||!item.id||!item.title||!item.summary||!item.format)return null;
 try{
  const url=new URL(item.url);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.hostname!=='weedmaps.com')return null;
  if(url.pathname!=='/strains/bruce-banner'&&!url.pathname.startsWith('/brands/illicit'))return null;
  return item;
 }catch{return null}
}
export function chooseBannerSource(items,last='',seen=[]){
 if(!Array.isArray(items)||items.length===0)return null;
 const visited=new Set(Array.isArray(seen)?seen:[]);
 return items.find(x=>x.id!==last&&!visited.has(x.id))||items.find(x=>x.id!==last)||items[0];
}
