/* Curated real magazine articles, independently summarized for QuantaPhi cards.
 * Source inspection: 2026-11-07, public publisher pages linked below.
 * This is an editorial snapshot, NOT automated scraping, licensed syndication,
 * permission to rehost publisher images or full text, or a real-time news feed.
 * High Times terms: https://hightimes.com/terms-of-use/
 */
const story=(id,title,author,date,category,url,summary)=>Object.freeze({id,title,author,date,category,url,summary});
const card=(data)=>Object.freeze({...data,stories:Object.freeze(data.stories)});

export const MAGAZINE_READING_SOURCES=Object.freeze([
 card({
  id:'easyriders-magazine',name:'Easyriders Magazine',kind:'Magazine · Reading',
  feature:'Custom choppers, road stories and motorcycle culture · read inside this card',
  official:'https://easyriders.com/',featureUrl:'https://easyriders.com/blog/',
  focus:'Read verified motorcycle stories with original short editorial overviews and publisher credit. No copied full magazine pages, photos or subscription content.',
  details:'Two genuine Easyriders features, checked November 7, 2026. Switch stories inside this Quick Card, then open the complete piece at Easyriders.',
  sourceCheckedAt:'2026-11-07',sourceStatus:'editorial-snapshot-not-live-feed',
  stories:[
   story('harley-racing','Harley-Davidson Evolves Racing Strategy','Easyriders Author','2026-10-02','Racing',
    'https://easyriders.com/harley-davidson-evolves-racing-strategy/',
    'Harley-Davidson is reorganizing its competition efforts around a major international bagger series and more accessible racing for riders. This report looks at the company’s new two-track approach to racing from 2027 onward.'),
   story('michelle-wizard','Michelle & The Wizard','Jack McIntyre','2026-09-17','Custom choppers',
    'https://easyriders.com/michelle-the-wizard/',
    'Photographer Jack McIntyre revisits a striking custom chopper, its detailed paintwork and a long-running motorcycle photo collaboration. The piece is a look back at the personalities and craftsmanship behind classic bike culture.')
  ]
 }),
 card({
  id:'motorcycle-magazine',name:'Motorcycle Magazine',kind:'Magazine · Reading',
  feature:'New motorcycle tests, performance parts and riding stories',
  official:'https://www.motorcycle-magazine.com/',featureUrl:'https://www.motorcycle-magazine.com/',
  focus:'Present actual publisher motorcycle journalism in a readable in-card editorial digest; keep author, date and source links visible and do not mirror full articles.',
  details:'Three publisher stories verified November 7, 2026. Browse the concise reading digest here and open the original complete review when you wish.',
  sourceCheckedAt:'2026-11-07',sourceStatus:'editorial-snapshot-not-live-feed',
  stories:[
   story('indian-aro','Indian Motorcycle Introduces ARO Parts Lineup','Olivia Bennett','2026-10-28','Parts & gear',
    'https://www.motorcycle-magazine.com/indian-motorcycle-introduces-aro-parts-lineup-featuring-a-new-slip-on-exhaust/',
    'Indian Motorcycle is connecting new factory performance parts with its racing program through an American Racing Operations division. The article introduces the exhaust launch and how track development could influence road-going equipment.'),
   story('zero-xe','2026 Zero XE: Electric Dirt Bike Review','James Coleman','2026-10-28','Off-road review',
    'https://www.motorcycle-magazine.com/2026-zero-xe-delivers-an-exceptionally-fun-ride-review-finds/',
    'A first-person trail test examines how Zero’s lightweight electric dirt bike handles tight trails, regenerative braking and battery use. It also considers where instant electric torque helps, and where riders need extra throttle care.'),
   story('honda-hornet','2026 Honda CB750 Hornet E-Clutch Review','James Coleman','2026-10-30','Road review',
    'https://www.motorcycle-magazine.com/hondas-2026-cb750-hornet-reviewed-with-e-clutch-and-full-specifications/',
    'Honda’s middleweight Hornet receives an optional electronic clutch that changes everyday shifting. The road review explores how that system affects the riding experience and what remains familiar about the motorcycle.')
  ]
 }),
 card({
  id:'high-times-magazine',name:'High Times Magazine',kind:'Magazine · Reading',
  feature:'Music, counterculture, science and cannabis journalism · editorial reads',
  official:'https://hightimes.com/',featureUrl:'https://hightimes.com/recent/',
  focus:'Provide sourced culture, science and cannabis news only, not products, sales, unsafe claims or copied publisher text. High Times restricts automated scraping and republication.',
  details:'Three authentic High Times articles reviewed November 7, 2026. Brief independent summaries are readable inside this card. Publisher owns the full stories and images.',
  sourceCheckedAt:'2026-11-07',sourceStatus:'editorial-snapshot-no-scraping',
  matureTopics:true,
  stories:[
   story('mushroom-jazz','Why Is It Called Mushroom Jazz?','Hernán Panessi','2026-10-30','Music & culture',
    'https://hightimes.com/culture/music/why-is-it-called-mushroom-jazz-mark-farina/',
    'DJ Mark Farina reflects on the Chicago scene and the unexpected beginnings of his Mushroom Jazz sound. The feature traces how a home-recorded musical idea grew into a lasting downtempo culture.'),
   story('ducks-farm','The Ducks Running Pest Control at a Colorado Farm','Josiah Hesse','2026-10-09','Culture & agriculture',
    'https://hightimes.com/grow/edun-regenerative-cannabis-ducks-colorado/',
    'At a family-run Colorado growing operation, ducks are part of a wider approach to soil health and pest management. The story profiles an unconventional farm and the people who built it.'),
   story('genetics','Who Owns Cannabis Genetics Now?','Jorge Cervantes and collaborators','2026-10-24','Science',
    'https://hightimes.com/grow/gene-edited-cannabis-is-already-here-who-gets-to-own-it/',
    'Breeders and researchers increasingly share advanced genetics tools, but access to useful plant libraries is uneven. This feature explores the science and the tension between open preservation and proprietary breeding.')
  ]
 })
]);

export const findMagazineSource=id=>MAGAZINE_READING_SOURCES.find(c=>c.id===id)||null;
export function magazineStory(card,id){
 const trusted=findMagazineSource(card?.id);
 if(!trusted||trusted.official!==card?.official)return null;
 return trusted.stories.find(s=>s.id===id)||null;
}

export function mountMagazineReader(root,card){
 const trusted=findMagazineSource(card?.id);
 if(!root||!trusted||trusted.official!==card?.official)return false;
 const el=(tag,cls,value)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(value!==undefined)n.textContent=value;
  return n;
 };
 const wrap=el('section','qcx-tool qcx-magazine-reader');
 wrap.setAttribute('aria-label',trusted.name+' reading card');
 const header=el('h3','','Read real '+trusted.name+' stories');
 const status=el('p','qcx-magazine-count');
 status.setAttribute('role','status');
 const article=el('article','qcx-magazine-story');
 const title=el('h4','qcx-magazine-title');
 const metadata=el('p','qcx-magazine-meta');
 const summary=el('p','qcx-magazine-summary');
 const source=el('a','qcx-magazine-original');
 source.rel='noopener noreferrer';source.target='_blank';
 article.append(title,metadata,summary);
 const buttons=el('div','qcx-magazine-controls');
 const back=el('button','qcx-button','Previous story');
 const next=el('button','qcx-button','Next story');
 back.type='button';next.type='button';
 buttons.append(back,next);
 const notice=el('p','qcx-note',trusted.matureTopics
  ?'Independent culture/news summaries; cannabis topics may be intended for adults. No products or purchase links.'
  :'Independent editorial summaries. The full stories, photographs and rights belong to the publisher.');
 const freshness=el('p','qcx-note','Stories verified '+trusted.sourceCheckedAt+' · curated snapshot, not a live automatic feed.');
 let current=0;
 const show=()=>{
  const s=trusted.stories[current];
  status.textContent='Story '+(current+1)+' of '+trusted.stories.length;
  title.textContent=s.title;
  metadata.textContent=s.category+' · '+s.author+' · '+s.date;
  summary.textContent=s.summary;
  source.href=s.url;
  source.textContent='Read full story at '+trusted.name+' ↗';
 };
 back.addEventListener('click',()=>{current=(current-1+trusted.stories.length)%trusted.stories.length;show();});
 next.addEventListener('click',()=>{current=(current+1)%trusted.stories.length;show();});
 show();
 wrap.append(header,status,article,buttons,source,notice,freshness);
 root.append(wrap);
 return true;
}
