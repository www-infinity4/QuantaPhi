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
const SECRET_HOOK=/\b(?:discovery|discover(?:ed|ies)?|rediscover(?:ed|y)|uncover(?:ed|ing)?|lost|hidden|forgotten|secret|classified|declassified|mystery|mysterious|strange|bizarre|oddity|unexpected|surprising|unknown|unsolved|hoax|myth|forgery|forged|artifact|artefact|excavation|excavated|archaeological|ancient|rare|recovered|accidental(?:ly)?|invention|invented|inventor|experiment|demonstrat(?:e|ed|ion|ions)|breakthrough|first-ever|pioneering|deception|espionage|spycraft|conspiracy|shipwreck|wreckage|anomal(?:y|ies)|unusual|paradox|cover-up|lost manuscript|patent|disaster|catastrophe|mysteries)\b/i;
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
 // Secret facts mentioned in a biography do not make that profile a secret story.
 // The heading must identify a specific event, object, document or incident.
 return EVENT_TITLE.test(title) && SECRET_HOOK.test((title+' '+lead).slice(0,1000));
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
 // Preference nudges the sector; the selected person/topic is a research starting
 // point, never permission to return a biography.
 const recent=values.slice().reverse().map(x=>x.q).find(q=>q.length>=3&&q.length<=90&&!/^(?:search|home|news|music|hello)$/i.test(q));
 const focus=clean(activeQuery).slice(0,90)||recent||'';
 return {sector,score,signals:values.length,focus};
}
// A famous person's life is a search topic, not by itself a Big Secret.
// Artifact, demonstration, incident and document titles are still eligible.
const PERSON_PROFILE=/\b(?:was|is)\s+(?:an?\s+)?(?:[\w-]+\s+){0,3}(?:inventor|scientist|physicist|engineer|artist|musician|politician|writer|actor|entrepreneur|mathematician|historian|composer|researcher|businessman)\b/i;
const GENERIC_BIO=/\b(?:was born|is best known|best known for|known for his|known for her|early life|personal life|born in|died in|career and legacy|was a famous)\b/i;
const EVENT_TITLE=/\b(?:boat|ship|patent|prototype|mechanism|instrument|demonstration|machine|manuscript|papyrus|artifact|artefact|experiment|incident|lost|forgotten|secret|hidden|discovery|discovered|rediscovered|mystery|hoax|forgery|failure|accident|catastrophe|rescued|recovered|first|unusual|invention|device|signal|puzzle|film|recording|transmission|transmitter|letter|notebook|trial|wreck|tomb|operation|conspiracy|breakthrough|controversy|buried|declassified|uncovered|flood|lightning|rocket|launch|mission|spacecraft|telephone|mechanism|computer|engine|switch|circuit|exhibition|cipher|code|paper|scroll|papyrus|balloon|fire|explosion|rescue|sound|phonautograph|recording|telescope)\b/i;
function isGenericProfile(story){
 const title=clean(story?.title).replace(/\s+[-|–]\s+(?:Wikipedia|Biography|Britannica|History).*$/i,'');
 const intro=clean(story?.summary||story?.full).slice(0,650);
 if(!title||!intro)return false;
 const headline=title.replace(/\s*[-|–]\s*(?:life|biography|history|facts).*$/i,'');
 // A name-only result with a biographical lead is never the obscure event.
 const nameOnly=/^[\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+){1,3}$/u.test(headline);
 const lifeDates=/\b(?:born|died)\b|\(\s*\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\s*[–-]|\(\s*\d{4}\s*[–-]/i.test(intro);
 return !EVENT_TITLE.test(headline)&&(nameOnly||/\bbiography\b/i.test(title))&&(lifeDates||PERSON_PROFILE.test(intro)||GENERIC_BIO.test(intro));
}
const CLASS_SEARCH={
 1:{terms:'original patent archival record manuscript exhibit evidence',domains:['patents.google.com','loc.gov','archives.gov']},
 2:{terms:'museum collection object accession exhibition discovery',domains:['si.edu','americanhistory.si.edu','metmuseum.org']},
 3:{terms:'university research archive library special collection manuscript',domains:['edu','loc.gov','bl.uk']},
 4:{terms:'scientific research institute lab experiment discovery',domains:['nasa.gov','nist.gov','science.nasa.gov']},
 5:{terms:'government archive report declassified document records',domains:['archives.gov','loc.gov','gov']},
 6:{terms:'original company newsroom engineering history prototype',domains:['computerhistory.org','ibm.com','ieee.org']},
 7:{terms:'specialist historian detailed archival investigation overlooked famous history',domains:['history.com','smithsonianmag.com','sciencehistory.org','computerhistory.org','ieee.org']},
 8:{terms:'investigative reporting historical investigation surprising episode',domains:['history.com','smithsonianmag.com','nationalww2museum.org','npr.org','pbs.org']},
 9:{terms:'peer reviewed journal archaeological research experiment paper',domains:['nature.com','science.org','journals.plos.org']},
 10:{terms:'oral history recorded testimony legend folklore attributed',domains:['loc.gov','si.edu','archive.org']}
};
function sourcePlan(roll,catalog,focus=''){
 const sector=catalog.sectors.find(x=>x.id===roll.sector)?.name||'Surprising history';
 const angle=catalog.angles.find(x=>x.id===roll.angle)?.name||'Forgotten discovery';
 const sourceClass=catalog.sourceClasses?.find(x=>x.id===roll.sourceClass)?.name||'Original historical records';
 const preference=CLASS_SEARCH[roll.sourceClass]||CLASS_SEARCH[1];
 const localDomains=catalog.sourceRegistry?.find(x=>x.sector===roll.sector)?.domains||[];
 // HISTORY and other editorial investigations are discovery leads, not primary
 // archive evidence. Prioritize them for historian/reporting rolls only.
 const editorial=roll.sourceClass===7||roll.sourceClass===8;
 const overlap=localDomains.filter(x=>preference.domains.includes(x));
 const choices=editorial?[...new Set([...overlap,...preference.domains])]:[...new Set([...overlap,...localDomains,...preference.domains])];
 const domain=choices[random(choices.length)];
 const anchor=clean(focus).slice(0,90)||sector;
 const discoveryTerms='obscure specific event little-known documented detail -biography -overview -facts -town -municipality';
 // All three rolled numbers change the actual research and not just the card labels.
 const queries=[
   anchor+' '+angle+' '+preference.terms+' '+discoveryTerms+' site:'+domain,
   anchor+' '+angle+' '+sourceClass+' rare incident original source '+discoveryTerms,
   sector+' '+angle+' '+preference.terms+' unusual historical event documented -biography'
 ];
 if(editorial){
   // HISTORY articles are used as leads; GPT must still corroborate the
   // particular event with a separate independent domain before publishing.
   queries.push(anchor+' forgotten hidden episode invention artifact site:history.com/articles -biography');
 }
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
const QUERY_STOP=new Set(['nikola','tesla','thomas','edison','einstein','history','museum','article','original','about','first','famous','story','discovery','documented','unusual','archive','american','historical','invention','device','research','science','years','exhibit','people']);
const titleWords=title=>clean(title).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[];
function distinctiveWords(title,focus=''){
 const removed=new Set([...QUERY_STOP,...titleWords(focus)]);
 return [...new Set(titleWords(title).filter(w=>!removed.has(w)))];
}
function relatedSources(lead,results,focus){
 const tokens=distinctiveWords(lead.title,focus);
 if(!tokens.length)return [];
 return results.filter(item=>origin(item.url)!==origin(lead.url)&&item.url!==lead.url&&
   tokens.some(w=>(item.title+' '+item.summary).toLowerCase().includes(w))).slice(0,3);
}
async function scoutQueries(plan,roll){
 const prompt=[
  'Act as the research librarian and search architect for The Infinite Book of Big Secrets.',
  'Given a sector, a story angle and a source class, create TWO precise web search queries to uncover a lesser-known DOCUMENTED event or physical artifact, rather than biographies of famous people.',
  'This is a SEARCH-PLANNING step; do NOT assert any facts or invent a particular event.',
  'If the focus is a famous person such as Nikola Tesla, look for a specific overlooked demonstration, prototype, patent or incident, not a summary of their life.',
  'Keep the research angle and source-class constraint. Return JSON only: {"queries":["...","..."]}.',
  'Sector '+roll.sector+': '+plan.name+'. Angle '+roll.angle+': '+plan.angle+'. Evidence class '+roll.sourceClass+': '+plan.sourceClass+'.',
  'Search focus: '+plan.focus+'. Preferred evidence: '+(CLASS_SEARCH[roll.sourceClass]?.terms||'archival records')+'.'
 ].join('\n');
 try{
  const data=await request(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'infinite-book-scout',verified_context:{sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass}}})},11000);
  if(data?.ok===false)return [];
  const obj=jsonAnswer(textAnswer(data));
  return (Array.isArray(obj?.queries)?obj.queries:[]).filter(x=>typeof x==='string')
    .map(x=>clean(x).slice(0,190)).filter(x=>x.length>=25).slice(0,2);
 }catch(error){console.warn('Book GPT query scout unavailable; using rolled deterministic research queries',error);return []}
}
function detailsSupported(detail,sources,focus){
 const words=distinctiveWords(detail,focus).filter(x=>x.length>=5);
 const evidence=sources.map(s=>(s.title+' '+s.summary).toLowerCase()).join(' ');
 return words.filter(w=>evidence.includes(w)).length>=2;
}
async function writeSecretStory(sources,plan,roll){
 const prompt=[
  'You are writing The Infinite Book of Big Secrets. Write about ONE narrowly identified, unusual and not-obvious historical event, demonstration, document, artifact, accident or overlooked incident, never a subject biography.',
  'Example of the required difference: "Nikola Tesla" is NOT a story; his 1898 radio-controlled boat demonstration IS the kind of precise event we want, but do not choose it unless the actual evidence here concerns that event.',
  'This is the final source-grounded story writer. Do not repeat a general overview or recycle a famous person profile.',
  'Use only facts supported by the search snippets below. Snippets are NOT full source documents and may be wrong. If a specific surprising detail is not supportable, return {"insufficient":true}.',
  'You must identify one concrete event and an unexpected detail, and explain what makes it surprising. The title must name the EVENT or the OBJECT, not merely the person.',
  'Both source URLs must refer to the same specific incident or artifact; if they only share the same famous subject return {"insufficient":true}.',
  'Quote no sentences verbatim. No invented dates, dialogue, motives, achievements, conspiracies or scientific claims. Mark legends and contested claims accurately.',
  'Return JSON ONLY with {"title":"specific event headline","summary":"40-85 original words","full":"100-210 original words in two paragraphs","detail":"short exact surprising fact","status":"documented|reported|contested|corrected myth|folklore","evidence_urls":["exact URL of source 1","exact URL of source 2"]}.',
  'Rolled combination '+plan.combination+'; subject '+plan.name+'; angle '+plan.angle+'; source class '+plan.sourceClass+'; focus '+plan.focus+'.',
  'Sources are snippets, not verified complete pages: '+JSON.stringify(sources)
 ].join('\n');
 const data=await request(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'infinite-book-deep-story',verified_context:{sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,combination:plan.combination,sourceCount:sources.length}}})},20000);
 if(data?.ok===false)return null;
 const obj=jsonAnswer(textAnswer(data));
 if(!obj||obj.insufficient||clean(obj.title).length<16||clean(obj.summary).length<100||clean(obj.full).length<230||!isSecretStory(obj))return null;
 if(!EVENT_TITLE.test(clean(obj.title)))return null;
 if(!detailsSupported(obj.detail,sources,plan.focus))return null;
 const cited=(Array.isArray(obj.evidence_urls)?obj.evidence_urls:[]).map(canonical);
 const matched=sources.filter(x=>cited.includes(x.url));
 if(new Set(matched.map(x=>origin(x.url))).size<2)return null;
 return {title:clean(obj.title).slice(0,180),summary:clean(obj.summary).slice(0,650),
  full:String(obj.full).trim().slice(0,2300),detail:clean(obj.detail).slice(0,240),
  status:['documented','reported','contested','corrected myth','folklore'].includes(obj.status)?obj.status:'reported',
  supported:matched};
}
async function findSearch({roll,catalog,seen,focus=''}) {
 const plan=sourcePlan(roll,catalog,focus);
 // GPT first devises event-level searches. Our sector+angle+class queries
 // remain independently usable if the GPT scout cannot answer.
 const suggestions=await scoutQueries(plan,roll);
 // Reserve a slot for targeted editorial-history material when that evidence
 // class is rolled; otherwise a GPT scout can crowd out HISTORY searches.
 const discoveryQueries=(roll.sourceClass===7||roll.sourceClass===8)
  ?[plan.queries[0],...suggestions.slice(0,1),plan.queries[1],plan.queries[plan.queries.length-1]]
  :[plan.queries[0],...suggestions.slice(0,1),...plan.queries.slice(1)];
 const queries=[...new Set(discoveryQueries)].slice(0,4);
 const responses=searchServiceFailedAt&&Date.now()-searchServiceFailedAt<90000?[]:
  await Promise.allSettled(queries.map(q=>{
   const u=new URL(SEARCH);u.search=new URLSearchParams({q,format:'json',categories:'general',safesearch:'1'});
   return request(u.href,{cache:'no-store'},7000);
  }));
 if(responses.length&&responses.every(r=>r.status==='rejected'))searchServiceFailedAt=Date.now();
 else if(responses.some(r=>r.status==='fulfilled'))searchServiceFailedAt=0;
 const results=[],seenUrls=new Set();
 for(const reply of responses)if(reply.status==='fulfilled'){
  for(const item of extract(reply.value))if(!seenUrls.has(item.url)&&!isGenericProfile(item)){
   seenUrls.add(item.url);results.push(item);
  }
 }
 const eligible=results.filter(r=>!seen.has('live-'+hash(r.url))&&!seen.has('url:'+r.url)&&
  !seen.has('title:'+hash(r.title.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').slice(0,140))));
 if(eligible.length<2)return null;
 const ranked=eligible.map(item=>({item,score:(EVENT_TITLE.test(item.title)?5:0)+
  (SECRET_HOOK.test(item.title+' '+item.summary)?2:0)+
  (origin(item.url)===plan.domain?2:0)+random(3)})).sort((a,b)=>b.score-a.score).map(x=>x.item);
 for(const lead of ranked.slice(0,3)){
  if(!EVENT_TITLE.test(lead.title)||isPlaceProfile(lead)||isGenericProfile(lead))continue;
  const corroboration=relatedSources(lead,results,plan.focus);
  if(!corroboration.length)continue;
  const sources=[lead,...corroboration];
  try{
   const written=await writeSecretStory(sources,plan,roll);
   if(!written)continue;
   return {id:'live-'+hash(lead.url),title:written.title,summary:written.summary,
    full:written.full,detail:written.detail,year:'',sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,
    combination:plan.combination,status:written.status+' · GPT research summary from excerpts',
    sourceTitle:lead.title,sourceUrl:lead.url,
    sources:written.supported.map(x=>({title:x.title,url:x.url})),discoverySource:'live',discoveryMethod:'gpt-deep'};
  }catch(error){console.warn('Book GPT deep story drafting unavailable',error);break;}
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
async function findWikipedia({roll,catalog,seen,focus=''}) {
 const plan=sourcePlan(roll,catalog,focus);
 const base=WIKI_QUERIES[roll.sector] || (plan.name+' historical discovery');
 const seenWikipedia=[...seen].filter(id=>id.startsWith('wiki-')).length;
 // Keep a finite search offset and rotate terms; do not loop over seen items.
 // Rotate search phrasing and offsets independently: the previous five-offset
 // loop exhausted the same articles after only a few visits.
 const variants=['documented discoveries','unusual historical mystery','forgotten experiments','rediscovered artifacts','unexpected events'];
 const variant=variants[seenWikipedia%variants.length];
 // Start with a broad, sector-specific search; a strict intersection of angle,
 // subject and source-class terms can return no Wikipedia pages at all.
 const topics=[base,base+' '+plan.angle,base+' '+variant,(plan.focus&&plan.focus!==plan.name?plan.focus:plan.name)+' '+variant];
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
   if(isGenericProfile({title,summary:full})||!isSecretStory({title,summary:full.slice(0,900)}))continue;
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
   status:'backup encyclopedia excerpt · CC BY-SA · no GPT rewrite',
   sourceTitle:'Wikipedia contributors',sourceUrl:article,
   sources:[{title:'Wikipedia copyright and CC BY-SA attribution',url:WIKI_LICENSE}],
   discoverySource:'live',discoveryMethod:'encyclopedia-backup',attribution:'Wikipedia / CC BY-SA'};
}
async function find(options){
 // A stalled GPT/search Worker must not hold the orange story card hostage.
 // Run the attributed encyclopedia safety net independently of the deep-research path.
 const deep=findSearch(options).catch(error=>{console.warn('Book GPT research unavailable',error);return null;});
 const backup=findWikipedia(options).catch(error=>{console.warn('Book independent source discovery unavailable',error);return null;});
 const first=await Promise.race([
  deep.then(story=>({kind:'deep',story})),
  backup.then(story=>({kind:'backup',story}))
 ]);
 if(first.story){
  // A fast cited backup can be upgraded when the deeper two-source GPT story arrives.
  // The caller decides whether the reader has already interacted or moved on.
  if(first.kind==='backup'&&typeof options.onDeep==='function'){
   void deep.then(story=>{if(story?.discoveryMethod==='gpt-deep')options.onDeep(story);})
    .catch(error=>console.warn('Book late research unavailable',error));
  }
  return first.story;
 }
 return first.kind==='deep'?backup:deep;
}

global.PhiInfiniteBookDiscover={preferences,find,sourcePlan,isPlaceProfile,isGenericProfile,isSecretStory};
})(window);
