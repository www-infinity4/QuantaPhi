/* Phi Infinite Book: topic first from QuantaPhi quant history, then discover live. */
(function(global){
'use strict';
const HISTORY='quantaPhiBuildHistoryV1',COLLECT='quantaPhiCollected';
const SEARCH='https://orange-brook-a2ac.marvaseater.workers.dev/search';
const AI='https://infinity-rogers.marvaseater.workers.dev/v1/chat';
const terms=[
[31,/radio|shortwave|ham\s?radio|am receiver|fm receiver|antenna|vacuum tube|transistor radio|rf circuit|walkie.talkie/i],
[32,/broadcast|transmitter|airwaves|radio station|television signal|wireless telegraph/i],
[33,/semiconductor|microchip|integrated circuit|diode|capacitor|resistor|oscillator|triode|pcb/i],
[34,/personal computer|microcomputer|commodore|altair|macintosh|apple ii|ibm pc|microprocessor/i],
[35,/satellite|deep space network|spacecraft signal|space communications/i],
[36,/robotics|robot|assembly line|cnc|factory machine/i],
[37,/synthesizer|acoustics|loudspeaker|microphone|audio engineering|recording studio/i],
[38,/power plant|reactor|transformer|turbine|power grid/i],
[39,/electronics|gadget|television set|camcorder|vcr|walkman|handheld console/i],
[1,/electricity|voltage|tesla|alternating current|direct current|battery|energy/i],
[2,/technology|software|computer|internet|programming|steve jobs|artificial intelligence|gpt/i],
[3,/mona lisa|painting|art gallery|museum|picasso|leonardo|sculpture/i],
[4,/ghost|haunt|apparition|poltergeist/i],
[5,/parapsychology|séance|seance|philip experiment|psychic|telekinesis/i],
[6,/invention|inventor|patent|thomas edison/i],
[7,/astronomy|galaxy|planet|venus|moon|nasa|mars|star system/i],
[8,/military|war|army|battle|tank/i],
[9,/espionage|spy|intelligence agency|codebreaker/i],
[10,/archaeology|ancient tomb|excavation/i],
[11,/ancient civilization|egypt|roman empire|inca|maya/i],
[12,/medical|medicine|surgery|vaccine|disease/i],
[13,/biology|evolution|dna|genetics|species/i],
[14,/chemistry|chemical|element|ruthenium|samarium|hydrogen/i],
[15,/physics|quantum|mathematics|einstein/i],
[16,/geology|volcano|earthquake|mineral|meteorite/i],
[17,/ocean|deep sea|shipwreck|submarine|whale/i],
[18,/weather|hurricane|tornado|flood|climate/i],
[19,/accident|disaster|engineering failure|molasses/i],
[20,/music|song|album|piano|guitar|pink floyd|grateful dead|concert/i],
[21,/movie|film|television show|actor|cinema|cartoon/i],
[22,/novel|author|literature|poem|writer/i],
[23,/president|white house|royal|king|queen|lincoln/i],
[24,/murder|crime|cold case|heist/i],
[25,/architecture|skyscraper|building design|hidden room|secret passage|unusual building|construction mystery/i],
[26,/automobile|railroad|car engine|aviation|flight|train/i],
[27,/business|corporation|company|entrepreneur|startup|stock price/i],
[28,/world record|athlete|amazing feat|climber|explorer/i],
[29,/animal|elephant|wildlife|bird|cat|dog/i],
[30,/everyday objects|toaster|zipper|paperclip|household/i]
];
const read = key => {try{const v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(_){return []}};
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const origin=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.hostname.replace(/^www\./,''):''}catch(_){return ''}};
const canonical=u=>{try{const x=new URL(u);if(x.protocol!=='https:')return '';x.hash='';for(const k of [...x.searchParams.keys()])if(/^utm_|^(fbclid|gclid|ref)$/i.test(k))x.searchParams.delete(k);return x.toString()}catch(_){return ''}};
const hash=v=>{let h=2166136261;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)};
const random=n=>{try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n}catch(_){return Math.floor(Math.random()*n)}};

const PLACE_PROFILE=/\b(?:is|was|are|were)\s+(?:(?:a|an|the)\s+)?(?:(?:small|large|former|historic|historical|rural|incorporated|unincorporated|coastal|market|medieval|ancient|ghost|administrative|census-designated|independent|populated)\s+){0,4}(?:town|city|village|municipality|commune|county|borough|suburb|hamlet|township|parish|district|settlement|census-designated place|unincorporated community)\b/i;
const SECRET_HOOK=/\b(?:discovery|discover(?:ed|ies)?|rediscover(?:ed|y)|uncover(?:ed|ing)?|lost|hidden|forgotten|secret|classified|declassified|mystery|mysterious|strange|bizarre|oddity|unexpected|surprising|unknown|unsolved|hoax|myth|forgery|forged|artifact|artefact|excavation|excavated|archaeological|ancient|rare|recovered|accidental(?:ly)?|invention|invented|inventor|experiment|breakthrough|first-ever|pioneering|deception|espionage|spycraft|conspiracy|shipwreck|wreckage|anomal(?:y|ies)|unusual|paradox|cover-up|lost manuscript|patent|disaster|catastrophe|mysteries)\b/i;
function isPlaceProfile(story){
 const title=clean(story?.title),intro=clean(story?.summary||story?.full).slice(0,850);
 if(!title||!intro)return false;
 if(PLACE_PROFILE.test(intro.slice(0,470)))return true;
 return /\b(?:town|city|village|municipality|county|borough|township|commune)\b/i.test(intro.slice(0,470)) &&
   /\b(?:population|census|postal code|zip code|administrative center|administrative centre)\b/i.test(intro.slice(0,650));
}
function isSecretStory(story){
 if(isPlaceProfile(story)||isGenericProfile(story))return false;
 const title=clean(story?.title),lead=clean(story?.summary||story?.full);
 if(!title||!lead)return false;
 if(/^(?:List of|Index of|Timeline of|Category:)/i.test(title))return false;
 return SECRET_HOOK.test((title+' '+lead).slice(0,1000));
}

function preferences(activeQuery,catalog){
 const values=[],unique=new Set(),all=[...read(HISTORY).slice(0,300),...(Array.isArray(global.QuantaCloudBuildHistory)?global.QuantaCloudBuildHistory.slice(0,300):[])];
 for(const x of all){const q=clean(x?.query||x?.title),id=x?.search_id||x?.token_id||x?.id||q;if(!q||unique.has(id))continue;unique.add(id);values.push({q,weight:1.5})}
 for(const x of read(COLLECT).slice(-160)){const q=clean((x?.title||'')+' '+(x?.story||'').slice(0,140));if(q)values.push({q,weight:2.5})}
 if(activeQuery)values.push({q:clean(activeQuery),weight:3});
 const scores=new Map();
 const favoriteIds=read('phi_infinite_book_favorites_v1');
 const stories=[...(catalog?.stories||[]),...read('phi_infinite_book_live_v2')];
 for(const favorite of favoriteIds){
   const story=stories.find(x=>x.id===favorite);
   if(story?.sector){const k=Number(story.sector);scores.set(k,(scores.get(k)||0)+5)}
 }

 for(const v of values){const matched=terms.filter(([_,rx])=>rx.test(v.q));if(!matched.length)continue;const narrow=matched.filter(([id])=>id>=31);const chosen=narrow.length?narrow:matched;for(const [id]of chosen)scores.set(id,(scores.get(id)||0)+v.weight/Math.sqrt(chosen.length))}
 let sector=0,score=0;for(const [id,value]of scores){if(value>score){sector=id;score=value}}
 return {sector,score,signals:values.length};
}
// A famous person's life is a search topic, not by itself a Big Secret.
// Artifact, demonstration, incident and document titles are still eligible.
const PERSON_PROFILE=/\b(?:was|is)\s+(?:an?\s+)?(?:American|Serbian|British|German|French|Italian|Russian|Austrian|Canadian|English|Indian|Japanese|Scottish|Dutch|Swedish|Greek|Egyptian|Polish|Spanish|Chinese)?\s*(?:inventor|scientist|physicist|engineer|artist|musician|politician|writer|actor|entrepreneur|mathematician|historian|composer|researcher|businessman)\b/i;
const GENERIC_BIO=/\b(?:was born|is best known|best known for|known for his|known for her|early life|personal life|born in|died in|career and legacy|was a famous)\b/i;
const EVENT_TITLE=/\b(?:boat|ship|patent|prototype|demonstration|machine|manuscript|papyrus|artifact|artefact|experiment|incident|lost|forgotten|secret|hidden|discovery|discovered|rediscovered|mystery|hoax|forgery|failure|accident|catastrophe|rescued|recovered|first|unusual|invention|device|signal|puzzle|film|recording|transmission|transmitter|letter|notebook|trial|wreck|tomb|operation|conspiracy|breakthrough|controversy|buried|declassified|uncovered)\b/i;
function isGenericProfile(story){
 const title=clean(story?.title).replace(/\s+[-|–]\s+(?:Wikipedia|Biography|Britannica|History).*$/i,'');
 const intro=clean(story?.summary||story?.full).slice(0,650);
 if(!title||!intro)return false;
 const headline=title.replace(/\s*[-|–]\s*(?:life|biography|history|facts).*$/i,'');
 // A name-only result with a biographical lead is never the obscure event.
 const nameOnly=/^[\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+){1,3}$/u.test(headline);
 return !EVENT_TITLE.test(headline)&&(nameOnly||/\bbiography\b/i.test(title))&&(PERSON_PROFILE.test(intro)||GENERIC_BIO.test(intro));
}
const CLASS_SEARCH={
 1:{terms:'original patent archival record manuscript exhibit evidence',domains:['patents.google.com','loc.gov','archives.gov']},
 2:{terms:'museum collection object accession exhibition discovery',domains:['si.edu','americanhistory.si.edu','metmuseum.org']},
 3:{terms:'university research archive library special collection manuscript',domains:['edu','loc.gov','bl.uk']},
 4:{terms:'scientific research institute lab experiment discovery',domains:['nasa.gov','nist.gov','science.nasa.gov']},
 5:{terms:'government archive report declassified document records',domains:['archives.gov','loc.gov','gov']},
 6:{terms:'original company newsroom engineering history prototype',domains:['computerhistory.org','ibm.com','ieee.org']},
 7:{terms:'specialist historian detailed archival investigation',domains:['historyofscience.com','smithsonianmag.com','ieee.org']},
 8:{terms:'investigative reporting historical investigation surprising episode',domains:['pbs.org','smithsonianmag.com','npr.org']},
 9:{terms:'peer reviewed journal archaeological research experiment paper',domains:['nature.com','science.org','journals.plos.org']},
 10:{terms:'oral history recorded testimony legend folklore attributed',domains:['loc.gov','si.edu','archive.org']}
};
function sourcePlan(roll,catalog,focus=''){
 const sector=catalog.sectors.find(x=>x.id===roll.sector)?.name||'Surprising history';
 const angle=catalog.angles.find(x=>x.id===roll.angle)?.name||'Forgotten discovery';
 const sourceClass=catalog.sourceClasses?.find(x=>x.id===roll.sourceClass)?.name||'Original historical records';
 const preference=CLASS_SEARCH[roll.sourceClass]||CLASS_SEARCH[1];
 const localDomains=catalog.sourceRegistry?.find(x=>x.sector===roll.sector)?.domains||[];
 const domain=localDomains.length?localDomains[random(localDomains.length)]:preference.domains[random(preference.domains.length)];
 const anchor=clean(focus).slice(0,90)||sector;
 const discoveryTerms='obscure specific event little-known documented detail -biography -overview -facts -town -municipality';
 // All three rolled numbers change the actual research and not just the card labels.
 const queries=[
   anchor+' '+angle+' '+preference.terms+' '+discoveryTerms+' site:'+domain,
   anchor+' '+angle+' '+sourceClass+' rare incident original source '+discoveryTerms,
   sector+' '+angle+' '+preference.terms+' unusual historical event documented -biography'
 ];
 return {name:sector,angle,sourceClass,sourceClassId:roll.sourceClass,focus:anchor,domain,queries,combination:(roll.sector-1)*200+(roll.angle-1)*10+roll.sourceClass};
}

async function request(url,options={},ms=8500){
 const c=new AbortController(),timeout=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(url,{...options,signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timeout)}
}
function extract(payload){
 return (Array.isArray(payload?.results)?payload.results:[]).map(r=>({title:clean(r.title).slice(0,200),summary:clean(r.content||r.description).slice(0,700),url:canonical(r.url)}))
 .filter(r=>r.title.length>=13&&r.summary.length>=70&&origin(r.url))
 .filter(r=>!/\/(shop|login|signup|cart)(\/|\?|$)/i.test(r.url))
 .filter(r=>!isPlaceProfile(r));
}
function textAnswer(data){
 let x=data?.output_text??data?.output??data?.answer??data?.response??data?.content??data?.message??'';
 if(Array.isArray(x))x=x.map(p=>p?.text||p?.content||'').join('\n');
 if(x&&typeof x==='object')x=x.text||x.content||'';
 return String(x||'').trim();
}
function jsonAnswer(text){
 try{return JSON.parse(text)}catch(_){}
 const a=text.indexOf('{'),b=text.lastIndexOf('}');
 if(a>=0&&b>a)try{return JSON.parse(text.slice(a,b+1))}catch(_){}
 return null;
}
let searchServiceFailedAt=0;
async function findSearch({roll,catalog,seen}){
 const plan=sourcePlan(roll,catalog);
 const responses=searchServiceFailedAt && Date.now()-searchServiceFailedAt<300000 ? [] : await Promise.allSettled(plan.queries.map(q=>{const u=new URL(SEARCH);u.search=new URLSearchParams({q,format:'json',categories:'general',safesearch:'1'});return request(u.href,{cache:'no-store'},6500)}));
 if(responses.length && responses.every(r=>r.status==='rejected'))searchServiceFailedAt=Date.now();
 else if(responses.some(r=>r.status==='fulfilled'))searchServiceFailedAt=0;
 let results=[];for(const r of responses)if(r.status==='fulfilled')results.push(...extract(r.value));
 const seenUrls=new Set();results=results.filter(r=>!seenUrls.has(r.url)&&seenUrls.add(r.url));
 const eligible=results.filter(r=>!seen.has('live-'+hash(r.url))&&!seen.has('url:'+r.url)&&!seen.has('title:'+hash(r.title.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').slice(0,140))));
 if(eligible.length<2)return null;
 // Only accept a discoverable event when separate domains offer related evidence.
 const shuffled=eligible.map(x=>({x,order:random(100000)})).sort((a,b)=>a.order-b.order).map(x=>x.x);
 for(const lead of shuffled.slice(0,4)){
  const words=lead.title.toLowerCase().split(/\W+/).filter(x=>x.length>5);
  const corroboration=results.filter(x=>origin(x.url)!==origin(lead.url)&&words.some(w=>x.title.toLowerCase().includes(w)||x.summary.toLowerCase().includes(w))).slice(0,3);
  if(!corroboration.length)continue;
  const sources=[lead,...corroboration];
  const prompt=[
    'Write one surprising, authentic historical story for The Infinite Book of Big Secrets.',
    'Never use a routine town, city, village, county, or local geography profile as a secret. A location is only context for a documented strange event, hidden history, unusual discovery or corrected misconception.',
    'Topic: '+plan.name+'. Story angle: '+plan.angle,
    'Evidence is truncated search snippets, not full documents. ONLY make claims explicitly supported by these snippets. They may contain mistakes. If insufficient, return {"insufficient":true}.',
    'Do not invent dates, quotes, names, explanations, or motivations. A legend must be called folklore, and controversial allegations require neutral treatment.',
    'Return JSON only with keys title, summary, full, status. Summary 40-85 words, full 100-210 words in 2 paragraphs, status one of documented, reported, contested, corrected myth, folklore.',
    'The lead story and corroboration must describe the same specific event, not merely the same broad topic. No pasted original language.',
    'Evidence: '+JSON.stringify(sources)
  ].join('\n');
  let obj;
  try{
   const data=await request(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'infinite-book-discovery',verified_context:{sector:roll.sector,angle:roll.angle,sources:sources.length}}})},18000);
   obj=jsonAnswer(textAnswer(data));
  }catch(_){return null}
  if(!obj||obj.insufficient||clean(obj.title).length<12||clean(obj.summary).length<80||clean(obj.full).length<200||!isSecretStory(obj))continue;
  const status=['documented','reported','contested','corrected myth','folklore'].includes(obj.status)?obj.status:'reported';
  return {id:'live-'+hash(lead.url),title:clean(obj.title).slice(0,180),summary:clean(obj.summary).slice(0,650),
    full:String(obj.full).trim().slice(0,2300),year:'',sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,
    status:status+' · sourced summary',sourceTitle:lead.title,sourceUrl:lead.url,
    sources:sources.map(s=>({title:s.title,url:s.url})),discoverySource:'live'};
 }
 return null;
}

// Public MediaWiki API is an independent source: if SearXNG/Workers AI fails,
// discover real encyclopedic articles rather than exhausting the ten starters.
// The displayed text is a labelled, attributed CC BY-SA excerpt, not an
// invented AI account of a source we could not read.
const WIKI='https://en.wikipedia.org/w/api.php';
const WIKI_LICENSE='https://en.wikipedia.org/wiki/Wikipedia:Copyrights';
const WIKI_QUERIES={
 1:'electricity invention discovery history',2:'computer invention unusual history',
 3:'art forgery rediscovered painting',4:'historical hauntings folklore',
 5:'parapsychology experiment historical',6:'accidental discovery famous inventions',
 7:'astronomy surprising discovery',8:'military deception operation history',
 9:'espionage secret intelligence operation',10:'archaeology remarkable discoveries',
 11:'ancient civilization archaeological discovery',12:'medicine accidental discovery history',
 13:'biology unexpected discovery species',14:'chemistry new element discovery history',
 15:'physics discovery unexpected experiment',16:'geology strange mineral discovery',
 17:'ocean shipwreck rediscovery history',18:'weather extraordinary historical event',
 19:'engineering disaster unusual history',20:'music recording lost rediscovered history',
 21:'cinema lost film rediscovered history',22:'literature lost manuscript rediscovery',
 23:'presidential history unusual event',24:'unsolved historical crime discovery',
 25:'secret passages hidden rooms architectural discoveries',26:'transportation invention historical surprise',
 27:'business company invention unusual history',28:'unusual world records exploration',
 29:'animal rediscovered extinct species',30:'everyday object invention history',
 31:'radio invention history unusual',32:'broadcasting radio television early history',
 33:'semiconductor surprising discovery history',34:'early personal computer history',
 35:'satellite communications invention history',36:'robotics early automatons invention',
 37:'audio technology recording invention history',38:'power station engineering history',
 39:'electronics historical invention unusual'
};
function wikiExcerpt(s) {
 return String(s||'').replace(/\s+/g,' ').trim();
}
async function findWikipedia({roll,catalog,seen}) {
 const base=WIKI_QUERIES[roll.sector] || (catalog.sectors.find(s=>s.id===roll.sector)?.name+' historical discovery');
 const seenWikipedia=[...seen].filter(id=>id.startsWith('wiki-')).length;
 // Keep a finite search offset and rotate terms; do not loop over seen items.
 // Rotate search phrasing and offsets independently: the previous five-offset
 // loop exhausted the same articles after only a few visits.
 const variants=['documented discoveries','unusual historical mystery','forgotten experiments','rediscovered artifacts','unexpected events'];
 const variant=variants[seenWikipedia%variants.length];
 const topics=[base,base+' '+variant,'historical '+variant+' '+(catalog.sectors.find(s=>s.id===roll.sector)?.name||'history')];
 const offset=(Math.floor(seenWikipedia/4)%6)*7;
 const replies=await Promise.allSettled(topics.map((q,i)=>{
  const u=new URL(WIKI);
  u.search=new URLSearchParams({action:'query',generator:'search',gsrsearch:q,
    gsrlimit:'20',gsroffset:String((offset+i*9)%49),
    prop:'extracts',exintro:'1',explaintext:'1',exchars:'2400',
    format:'json',origin:'*'});
  return request(u.href,{cache:'no-store'},8000);
 }));
 const candidates=[];
 for(const reply of replies){
  if(reply.status!=='fulfilled')continue;
  for(const page of Object.values(reply.value?.query?.pages||{})){
   const full=wikiExcerpt(page.extract);
   const title=clean(page.title), id='wiki-'+page.pageid;
   if(!Number.isInteger(page.pageid)||!title||seen.has(id)||full.length<240)continue;
   if(/^(List of|Index of|Timeline of|Category:|20[0-9][0-9] in |[0-9]{4} in )/i.test(title))continue;
   if(/may refer to|is a disambiguation page/i.test(full.slice(0,200)))continue;
   if(/television series|fictional character|video game series/i.test(full.slice(0,200)) && roll.sector!==21)continue;
   if(!isSecretStory({title,summary:full.slice(0,900)}))continue;
   candidates.push({id,title,full,pageid:page.pageid});
  }
 }
 if(!candidates.length)return null;
 // Prefer the strongest discovery language over ordinary topical references.
 const hook=/\b(?:discovered|rediscovered|forgotten|hidden|lost|mysterious|mystery|unexpected|secret|excavated|recovered|declassified|forgery|accidental|unusual|breakthrough|experiment)\b/i;
 const ranked=candidates.map(item=>({item,score:(hook.test(item.title)?4:0)+(hook.test(item.full.slice(0,500))?3:0)+Math.min(3,Math.floor(item.full.length/500))}));
 ranked.sort((a,b)=>b.score-a.score);
 const shortlist=ranked.slice(0,Math.min(8,ranked.length)).map(x=>x.item);
 const choice=shortlist[random(shortlist.length)];
 const sentences=choice.full.match(/[^.!?]+[.!?]+/g)||[];
 let summary=sentences.slice(0,3).join(' ').trim();
 if(summary.length<90)summary=choice.full.slice(0,290);
 if(summary.length>540)summary=summary.slice(0,537).trimEnd()+'…';
 const article='https://en.wikipedia.org/?curid='+choice.pageid;
 return {id:choice.id,title:choice.title,summary,
   full:choice.full+'\n\nSource: Wikipedia contributors. Excerpt reused under Creative Commons Attribution-ShareAlike; follow the source and license links for details.',
   year:'',sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,
   status:'encyclopedia discovery · CC BY-SA excerpt',
   sourceTitle:'Wikipedia contributors',sourceUrl:article,
   sources:[{title:'Wikipedia copyright and CC BY-SA attribution',url:WIKI_LICENSE}],
   discoverySource:'live',attribution:'Wikipedia / CC BY-SA'};
}
async function find(options){
 let story=null;
 try{story=await findSearch(options)}catch(error){console.warn('Book search service unavailable',error);}
 if(story)return story;
 try{return await findWikipedia(options)}catch(error){console.warn('Book independent encyclopedia discovery unavailable',error);return null;}
}

global.PhiInfiniteBookDiscover={preferences,find,sourcePlan,isPlaceProfile,isSecretStory};
})(window);
