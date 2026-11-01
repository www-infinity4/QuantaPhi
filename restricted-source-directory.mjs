/* Real public publisher destinations (not product offers, paid ads or licensed media).
 * All content is withheld from the UI until each-visit explicit 21+ acknowledgment.
 * A click is NOT third-party age verification and cannot unlock paid campaigns. */
export const PUBLIC_21_SOURCES=Object.freeze([
 Object.freeze({id:'weedmaps-directory',kind:'independent-source',title:'Weedmaps',subtitle:'Official publisher',summary:'Explore the Weedmaps website and its independently operated location directory.',url:'https://weedmaps.com/',official_domain:'weedmaps.com'}),
 Object.freeze({id:'leafly-directory',kind:'independent-source',title:'Leafly',subtitle:'Official publisher',summary:'Open the original Leafly site for its published content and local directory.',url:'https://www.leafly.com/',official_domain:'leafly.com'}),
 Object.freeze({id:'weedmaps-learning',kind:'independent-source',title:'Weedmaps Learn',subtitle:'Publisher information',summary:'Read informational articles published on the original Weedmaps website.',url:'https://weedmaps.com/learn',official_domain:'weedmaps.com'}),
 Object.freeze({id:'leafly-learning',kind:'independent-source',title:'Leafly Learn',subtitle:'Publisher information',summary:'Browse the original Leafly educational articles and reference material.',url:'https://www.leafly.com/learn',official_domain:'leafly.com'})
]);
export function eligiblePublisher(row,acknowledged){
 if(acknowledged!==true||!row||row.kind!=='independent-source'||!row.title||!row.summary)return null;
 try{
  const url=new URL(row.url),base=String(row.official_domain||'').toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port||
    !base||(!url.hostname.endsWith('.'+base)&&url.hostname!==base))return null;
  return row;
 }catch{return null}
}
export function selectPublisher(items,last='',seen=[]){
 if(!Array.isArray(items)||items.length===0)return null;
 const visited=new Set(Array.isArray(seen)?seen:[]);
 return items.find(x=>x.id!==last&&!visited.has(x.id))||
  items.find(x=>x.id!==last)||items[0];
}
