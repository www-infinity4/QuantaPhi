/* Phi Infinite Book: topic first from QuantaPhi quant history, then discover live. */
(function(global){
'use strict';
const HISTORY='quantaPhiBuildHistoryV1',COLLECT='quantaPhiCollected';
const SEARCH='https://orange-brook-a2ac.marvaseater.workers.dev/search';
const AI='https://infinity-rogers.marvaseater.workers.dev/v1/book/generate';
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
 // An explicit Quant search should beat accumulated older interests for this draw.
 const activeMatches=clean(activeQuery)?terms.filter(([id,rx])=>rx.test(activeQuery)):[];
 if(activeMatches.length){const specialist=activeMatches.find(([id])=>id>=31);sector=(specialist||activeMatches[0])[0];score+=3}
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
function indexedDraw({catalog,query='',profileSector=0,lastPair='',rng=random,sectorOverride=0}={}){
 const words=Array.isArray(catalog?.wordIndex)?catalog.wordIndex:[];
 const angles=Array.isArray(catalog?.researchRefinements)?catalog.researchRefinements:[];
 const directions=Array.isArray(catalog?.storyDirections)?catalog.storyDirections:[];
 const realms=Array.isArray(catalog?.storytellingRealms)?catalog.storytellingRealms:[];
 const sectors=Array.isArray(catalog?.sectors)?catalog.sectors.slice(0,catalog?.baseSectorCount||30):[];
 // Banks are extensible: never disable discovery because 100 grows to 101.
 if(!words.length||!angles.length||!directions.length||!realms.length||!sectors.length)return null;
 const aliases=catalog?.specialistRefinements||{};
 const allowed=new Set(sectors.map(s=>s.id));
 const sectorOf=w=>(Array.isArray(w.sectors)&&w.sectors.length?w.sectors:[w.sector])
  .map(x=>Number(aliases[x]||x)).filter(x=>allowed.has(x));
 const wordsIn=sector=>words.filter(w=>sectorOf(w).includes(sector));
 const norm=v=>' '+clean(v).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ';
 const needle=norm(query);
 // Longest exact multiword name wins (solar panels instead of energy).
 const exact=words.filter(w=>needle.includes(norm(w.word))).sort((a,b)=>b.word.length-a.word.length)[0];
 const preference=Number(aliases[profileSector]||profileSector);
 const related=exact?sectorOf(exact):[];
 const desired=sectorOverride>=1&&allowed.has(sectorOverride)?sectorOverride:
  related.length?(related.includes(preference)?preference:related[rng(related.length)]):
  allowed.has(preference)&&wordsIn(preference).length&&rng(5)<2?preference:sectors[rng(sectors.length)].id;
 const options=wordsIn(desired);
 if(!options.length)return null;
 const word=exact&&options.some(w=>w.id===exact.id)?exact:options[rng(options.length)];
 const angle=angles[rng(angles.length)];
 let direction=directions[rng(directions.length)];
 const path=()=>[desired,word.id,angle.id,direction.id].join(':');
 if(lastPair===path()&&directions.length>1)direction=directions[direction.id%directions.length];
 const realm=realms[rng(realms.length)];
 const evidence=rng((catalog.sourceClasses||[]).length||10)+1;
 return {
  sector:desired,sectorName:sectors.find(s=>s.id===desired)?.name||'World discoveries',
  wordNumber:word.id,indexWord:word.word,
  angle:angle.id,refinementNumber:angle.id,refinement:angle.name,
  realm:angle.name,realmNumber:angle.id,
  directionNumber:direction.id,storyDirection:direction.name,
  storytellingRealmNumber:realm.id,storytellingRealm:realm.name,storytellingInstruction:realm.instruction,
  sourceClass:evidence,bracketKey:path(),searchQuery:[word.word,angle.name,direction.name].join(' ')
 };
}

function sourcePlan(roll,catalog,focus=''){
 // The original book has 30 x 20 x 10 = 6,000 discovery routes.
 // The nine later technical sectors are refinements within those routes.
 const refinementMap=catalog.specialistRefinements||{31:1,32:2,33:2,34:2,35:7,36:6,37:20,38:1,39:2};
 const originalSector=Number(roll.sector);
 const sectorId=Number(refinementMap[originalSector]||originalSector);
 const sector=catalog.sectors.find(x=>x.id===sectorId)?.name||'Surprising history';
 const specialty=originalSector!==sectorId ? catalog.sectors.find(x=>x.id===originalSector)?.name||'' : clean(roll.refinement||'');
 const angle=catalog.angles.find(x=>x.id===roll.angle)?.name||'Forgotten discovery';
 const sourceClass=catalog.sourceClasses?.find(x=>x.id===roll.sourceClass)?.name||'Original historical records';
 const preference=CLASS_SEARCH[roll.sourceClass]||CLASS_SEARCH[1];
 const localDomains=catalog.sourceRegistry?.find(x=>x.sector===originalSector)?.domains||
  catalog.sourceRegistry?.find(x=>x.sector===sectorId)?.domains||[];
 const entries=Array.isArray(catalog.sourceSites)?catalog.sourceSites:[];
 const eligible=entries.filter(x=>Array.isArray(x.classes)&&x.classes.includes(roll.sourceClass)&&
  (Array.isArray(x.sectors)?x.sectors.includes(sectorId):true));
 const secondary=entries.filter(x=>Array.isArray(x.classes)&&x.classes.includes(roll.sourceClass));
 const approved=eligible.length?eligible:secondary;
 const preferredDomains=[...new Set([...approved.map(x=>x.domain),...localDomains,...preference.domains])];
 const domain=preferredDomains[random(preferredDomains.length)]||'si.edu';
 const indexedWord=clean(roll.indexWord||'').slice(0,65);
 const researchedTopic=clean(roll.quantFocus||indexedWord).slice(0,90);
 const realm=clean(roll.refinement||roll.realm||'').slice(0,65);
 const direction=clean(roll.storyDirection||'').slice(0,90);
 const storytellingRealm=clean(roll.storytellingRealm||'').slice(0,65);
 const anchor=researchedTopic||clean(focus).slice(0,90)||clean(specialty)||sector;
 const discoveryTerms='specific incident demonstration object document event little-known -biography -town -municipality';
 const trail=['overlooked episode','archival surprise','forgotten evidence','unusual incident','newly rediscovered artifact','historical mystery'];
 const variant=trail[(Number(roll.trial)||0)%trail.length];
 // Each button triggers new external retrieval. Actual source sites provide the
 // research catalog; the 6,000 rolls are query routes, never canned stories.
 const queries=researchedTopic?[
   // Begin with the user's actual random-number result: "Helium history".
   [researchedTopic,realm||angle,direction].filter(Boolean).join(' '),
   [researchedTopic,realm||angle,direction,'unusual origin discovery experiment incident historical source'].join(' '),
   [researchedTopic,realm||angle,direction,variant,preference.terms,'site:'+domain].join(' ')
 ]:[
   anchor+' '+angle+' '+variant+' '+preference.terms+' '+discoveryTerms+' site:'+domain,
   [specialty||sector,angle,sourceClass,variant,discoveryTerms].filter(Boolean).join(' '),
   sector+' '+angle+' documented '+variant+' '+preference.terms+' -biography'
 ];
 if(roll.sourceClass===7||roll.sourceClass===8){
  queries.push(anchor+' '+angle+' '+variant+' hidden historical episode site:history.com/articles -biography');
 }
 return {name:sector,angle,sourceClass,sourceClassId:roll.sourceClass,focus:anchor,
  indexedWord:researchedTopic,subjectIndexWord:indexedWord,realm,direction,storytellingRealm,specialty,domain,queries,sourceSites:approved.slice(0,18).map(x=>({name:x.name,url:x.url,domain:x.domain})),
  combination:(sectorId-1)*200+(roll.angle-1)*10+roll.sourceClass};
}

async function request(url,options={},ms=8500){
 const c=new AbortController(),timeout=setTimeout(()=>c.abort(),ms);
 try{
  const r=await fetch(url,{...options,signal:c.signal});
  if(!r.ok){
   let errorData={};
   if(String(url).includes('infinity-rogers')){
    errorData=await r.json().catch(()=>({}));
    global.PhiInfiniteBookResearchStatus=r.status===429?'provider-busy':r.status>=500?'ai-unavailable':'service-error';
   }
   throw Error('HTTP '+r.status+(errorData.error?' '+errorData.error:''));
  }
  const data=await r.json();
  if(data?.ok===false&&String(url).includes('infinity-rogers')){
   global.PhiInfiniteBookResearchStatus='ai-unavailable';
  }
  return data;
 }finally{clearTimeout(timeout)}
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
 return results.filter(item=>{
   if(origin(item.url)===origin(lead.url)||item.url===lead.url)return false;
   const evidence=(item.title+' '+item.summary).toLowerCase();
   return tokens.filter(w=>evidence.includes(w)).length>=Math.min(2,tokens.length);
 }).slice(0,3);
}
async function scoutQueries(plan,roll){
 const prompt=[
  'Act as the research librarian and search architect for Infinity Reads & Realms.',
  'Given a sector, a story angle and a source class, create TWO precise web search queries to uncover a lesser-known DOCUMENTED event or physical artifact, rather than biographies of famous people.',
  'This is a SEARCH-PLANNING step; do NOT assert any facts or invent a particular event.',
  'If the focus is a famous person such as Nikola Tesla, look for a specific overlooked demonstration, prototype, patent or incident, not a summary of their life.',
  'Keep the research angle and source-class constraint. Return JSON only: {"queries":["...","..."]}.',
  'Sector '+roll.sector+': '+plan.name+'. Subject '+(plan.indexedWord||'')+'. Research angle '+(plan.realm||plan.angle)+'. Story direction '+(plan.direction||'')+'. Evidence class '+roll.sourceClass+': '+plan.sourceClass+'.',
  'Drawn topic: '+(plan.indexedWord||plan.focus)+'. Drawn realm: '+(plan.realm||plan.angle)+'. Preferred evidence: '+(CLASS_SEARCH[roll.sourceClass]?.terms||'archival records')+'.'
 ].join('\n');
 try{
  const data=await request(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'infinite-book-scout',verified_context:{sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass}}})},25000);
  if(data?.ok===false)return [];
  const obj=jsonAnswer(textAnswer(data));
  return (Array.isArray(obj?.queries)?obj.queries:[]).filter(x=>typeof x==='string')
    .map(x=>clean(x).slice(0,190)).filter(x=>x.length>=25).slice(0,2);
 }catch(error){console.warn('Book GPT query scout unavailable; using rolled deterministic research queries',error);return []}
}
function detailsSupported(detail,sources,focus){
 const words=distinctiveWords(detail,focus).filter(x=>x.length>=5);
 if(words.length<2||sources.length<2)return false;
 const evidence=sources.map(s=>(s.title+' '+s.summary).toLowerCase());
 return words.filter(w=>evidence.some(line=>line.includes(w))).length>=2 &&
  evidence.every(line=>words.some(w=>line.includes(w)));
}
async function readPublicSourcePages(sources){
 try{
  const pages=sources.slice(0,4).map(x=>({url:x.url,title:x.title}));
  const data=await request('https://infinity-rogers.marvaseater.workers.dev/v1/research-source-excerpts',{
   method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({sources:pages})},8500);
  return (Array.isArray(data?.sources)?data.sources:[]).filter(x=>x?.sourceType==='retrieved-page-text'&&x.excerpt?.length>300).slice(0,4);
 }catch(error){console.warn('Public source-page extraction unavailable; relying on cited search excerpts',error);return []}
}
// The subject determines the nonfiction research target; the mood only controls narration.
function storyMood(query='',roll={}){
 const q=String(query||roll.quantFocus||roll.indexWord||roll.focus||'').toLowerCase();
 if(/\b(pink floyd|plum|plums|mystery|unsolved|unknown|lost|hidden|secret)\b/.test(q))return 'Mystery';
 if(/\b(hail|storm|tornado|danger|disaster|suspense|crisis|rescue)\b/.test(q))return 'Suspense';
 if(/\b(grapes?|trains?|railway|railroad|adventure|voyage|journey|exploration)\b/.test(q))return 'Adventure';
 return ['Mystery','Adventure','Suspense'][Math.abs(Number(roll.combination)||Number(roll.sector)||0)%3];
}
function legitimateNarrative(story){
 const title=clean(story?.title),summary=clean(story?.summary),full=clean(story?.full);
 return title.length>=14&&summary.length>=90&&full.length>=230 &&
  !isPlaceProfile(story)&&!isGenericProfile(story)&&
  !/\b(movie|film|screenplay|fictional film|plot synopsis|trailer)\b/i.test(title+' '+summary.slice(0,160));
}
function eligibleNarrative(story){
 return !!story && /^gpt-(deep|wiki)$/.test(String(story.discoveryMethod||'')) &&
  /^https:\/\//.test(String(story.sourceUrl||'')) &&
  legitimateNarrative(story);
}
async function writeSecretStory(sources,plan,roll,storyKind='reads-realms'){
 const mood=storyMood(roll.quantFocus||roll.indexWord||plan.focus,roll);
 const product=storyKind==='asteroid'?'Asteroid':'Infinity Reads & Realms';
 const pageEvidence=await readPublicSourcePages(sources);
 const conciseSources=sources.slice(0,7).map(x=>({title:x.title,url:x.url,summary:String(x.summary||'').slice(0,195)}));
 const readablePages=pageEvidence.slice(0,2).map(x=>({url:x.url,title:x.title,excerpt:x.excerpt.slice(0,1100)}));
 const prompt=[
  'You are the GPT author of the '+product+' nonfiction story. '+(storyKind==='asteroid'?'This Asteroid is ONLY for the actual current QuantaPhi search; anchor the story in that searched subject.':'This is the original Reads & Realms home-page opening story, written fresh for a page visit without requiring a user search; select the documented subject from the rolled word bank.')+' Write an ORIGINAL sourced narrative about a concrete evidence-supported incident, observation, discovery, process, demonstration or artifact. Never a general biography, film synopsis or fabricated movie.',
  'NARRATIVE MOOD: '+mood+'. Shape pacing, curiosity and tension around facts; mystery means an evidence-supported unknown, adventure means a documented journey/process, suspense means real stakes or uncertainty. Do not invent danger, dialogue, plot twists, witnesses, or cinematic scenes.',
  'Example of the required difference: "Nikola Tesla" is NOT a story; his 1898 radio-controlled boat demonstration IS the kind of precise event we want, but do not choose it unless the actual evidence here concerns that event.',
  'You are both evidence reviewer and storyteller: examine up to 20 independent search-result excerpts below, choose the MOST INTERESTING SPECIFIC incident actually corroborated by at least two distinct source websites, then narrate it as an engaging story, not an encyclopedia answer.',
  'Search-result excerpts are NOT full source documents. Use two independent citations about the same selected subject or well documented process; do not merge unrelated incidents. If a concrete detail cannot be supported, return {"insufficient":true}.',
  'Find one specific verifiable observation, event, process, artifact or unexpected detail. The title must name the concrete subject and its nonfiction story, not merely the person. The headline need not say secret or mystery.',
  'The final direction is '+(plan.direction||'discovery')+'. It guides which supported story to select, not a license to fabricate. Future possibilities must be labeled as possibilities. For educational mathematics include a correct simple equation, SI units, a worked example with explicit assumptions, and a verified source for constants.',
  'Both source URLs must refer to the same specific incident, observation or documented process; if they only share the broad topic return {"insufficient":true}.',
  'Quote no sentences verbatim. No invented dates, dialogue, motives, achievements, conspiracies or scientific claims. Mark legends and contested claims accurately.',
  'Return JSON ONLY with {"title":"specific nonfiction story headline","summary":"40-85 original words","full":"280-450 original words in 3-5 distinct paragraphs","detail":"short evidence-backed hook","status":"documented|reported|contested|corrected myth|folklore","evidence_urls":["exact URL of source 1","exact URL of source 2"]}.',
  'Rolled combination '+plan.combination+'; indexed topic '+(plan.indexedWord||plan.focus)+'; story refinement '+(plan.realm||plan.angle)+'; story direction '+(plan.direction||'')+'; source class '+plan.sourceClass+'; focus '+plan.focus+'. Storytelling lens '+(plan.storytellingRealm||'History')+' shapes narrative structure ONLY. Do not invent facts, quotes, fictional experiences or unresolved outcomes.',
  'Search results are snippets, not whole documents: '+JSON.stringify(conciseSources),
  'Retrieved public source-page excerpts (the only directly fetched page passages): '+JSON.stringify(readablePages),
  'Use retrieved page text for stronger factual grounding when available. Never claim an inaccessible full page was read. Return insufficient when sources cannot support the event.'
 ].join('\n');
 const data=await request(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
  body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'infinite-book-deep-story',generationId:global.crypto?.randomUUID?.()||Date.now()+'-'+Math.random(),verified_context:{storyKind,sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,combination:plan.combination,sourceCount:sources.length}}})},45000);
 if(data?.ok===false)return null;
 const obj=jsonAnswer(textAnswer(data));
 if(!obj||obj.insufficient||!legitimateNarrative(obj))return null;
 if(/\b(movie|film|trailer|screenplay|fictional film|plot synopsis)\b/i.test(clean(obj.title)))return null;
 const cited=(Array.isArray(obj.evidence_urls)?obj.evidence_urls:[]).map(canonical);
 const matched=sources.filter(x=>cited.includes(x.url));
 if(new Set(matched.map(x=>origin(x.url))).size<2||!detailsSupported(obj.detail,matched,plan.focus))return null;
 return {title:clean(obj.title).slice(0,180),summary:clean(obj.summary).slice(0,650),
  full:String(obj.full).trim().slice(0,4200),detail:clean(obj.detail).slice(0,240),
  status:['documented','reported','contested','corrected myth','folklore'].includes(obj.status)?obj.status:'reported',
  mood,supported:matched,fullEvidenceRead:pageEvidence.filter(x=>matched.some(y=>y.url===x.url)).length};
}
async function findSearch({roll,catalog,seen,focus='',storyKind='legacy'}) {
 const plan=sourcePlan(roll,catalog,focus);
 // GPT first devises event-level searches. Our sector+angle+class queries
 // remain independently usable if the GPT scout cannot answer.
 // Start retrieval immediately with the drawn indexed words, not after GPT.
 // GPT can contribute one additional targeted query, without holding up initial requests.
 const search=q=>{
  const u=new URL(SEARCH);u.search=new URLSearchParams({q,format:'json',categories:'general',safesearch:'1'});
  return request(u.href,{cache:'no-store'},7000);
 };
 const canSearch=!(searchServiceFailedAt&&Date.now()-searchServiceFailedAt<90000);
 const direct=canSearch?plan.queries.slice(0,3).map(search):[];
 // Preserve daily writing tokens for the home opener; optional GPT scouting
 // belongs to actual search-driven Asteroid research only.
 // The indexed search plan runs without requiring a separate model request first.
 const scout=storyKind==='reads-realms'||storyKind==='asteroid'?Promise.resolve([]):scoutQueries(plan,roll);
 const suggestions=await Promise.race([scout,new Promise(resolve=>setTimeout(()=>resolve([]),2200))]);
 const requested=[...direct];
 if(canSearch&&suggestions[0])requested.push(search(suggestions[0]));
 const responses=await Promise.allSettled(requested);
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
  (origin(item.url)===plan.domain?2:0)+(item.title.toLowerCase().includes(plan.indexedWord.toLowerCase())?2:0)+random(3)}))
  .sort((a,b)=>b.score-a.score).map(x=>x.item).slice(0,20);
 // The writer examines the result pool and selects the most compelling
 // corroborated event; it cannot claim to have read full websites.
 if(!ranked.some(x=>relatedSources(x,ranked,plan.focus).length))return null;
 try{
  const written=await writeSecretStory(ranked,plan,roll,storyKind);
  if(!written)return null;
  const lead=written.supported[0];
  return {id:'live-'+hash(lead.url),title:written.title,summary:written.summary,
   full:written.full,detail:written.detail,year:'',sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,
   indexWord:plan.indexedWord,realm:plan.realm,wordNumber:Number(roll.wordNumber)||0,realmNumber:Number(roll.realmNumber)||0,
   sectorName:roll.sectorName||plan.name,refinementNumber:Number(roll.refinementNumber)||0,directionNumber:Number(roll.directionNumber)||0,storyDirection:roll.storyDirection||'',
   storytellingRealm:plan.storytellingRealm,storytellingRealmNumber:Number(roll.storytellingRealmNumber)||0,
   bracketKey:roll.bracketKey||'',
   reviewedExcerpts:ranked.length,
   combination:plan.combination,status:written.status+(written.fullEvidenceRead?' · retrieved-page research':' · research synthesis from search excerpts'),
   sourceTitle:lead.title,sourceUrl:lead.url,
   sources:written.supported.map(x=>({title:x.title,url:x.url})),discoverySource:'live',discoveryMethod:'gpt-deep',mood:written.mood};
 }catch(error){console.warn('Infinity Reads & Realms writer unavailable',error);}
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
async function writeWikipediaStory(page,plan,roll,storyKind='reads-realms'){
 const mood=storyMood(roll.quantFocus||roll.indexWord||plan.focus,roll);
 const product=storyKind==='asteroid'?'Asteroid':'Infinity Reads & Realms';
 const prompt=[
 'Write one original '+product+' nonfiction story about a specific documented event, discovery, object, natural process or experiment evidenced by the provided source excerpt. '+(storyKind==='asteroid'?'The Asteroid must relate to the user-searched subject.':'This is a new Reads & Realms home-page opener chosen from the indexed word bank, NOT an Asteroid story.')+' Apply the '+mood+' narrative style without inventing details, threats or cinema-style fiction. For crops, natural phenomena, arts and ordinary subjects, a documented process or genuine unresolved historical question is a valid narrative, not a secret-headline requirement.',
 'No biography or encyclopedia-style overview. Never invent dialogue, quotes, dates, motives, scientific results or secret plots.',
 'Use ONLY the supplied excerpt, not other assumed facts. If the excerpt is too general, answer {"insufficient":true}.',
 'Return JSON ONLY with {"title":"specific nonfiction headline","summary":"40-85 words","full":"150-240 original words in at least 2 paragraphs","detail":"one directly supported surprising fact"}.',
 'Discovery route '+plan.combination+'; '+plan.name+'; '+plan.angle+'; '+plan.sourceClass+'.',
 'Source: Wikipedia contributors, page '+page.title+': '+page.full.slice(0,2200)
 ].join('\n');
 try{
  const data=await request(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'infinite-book-deep-story',generationId:global.crypto?.randomUUID?.()||Date.now()+'-'+Math.random(),
    verified_context:{storyKind,sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,sourceCount:1}}})},45000);
  if(data?.ok===false)return null;
  const out=jsonAnswer(textAnswer(data));
  if(!out||out.insufficient||!legitimateNarrative(out))return null;
  return {title:clean(out.title).slice(0,180),summary:clean(out.summary).slice(0,600),
   full:String(out.full).trim()+'\n\nBased on Wikipedia contributors (CC BY-SA), linked below.',
   detail:clean(out.detail).slice(0,180),mood};
 }catch(error){console.warn('Wikipedia story rewrite unavailable',error);return null}
}

function wikiExcerpt(s) {
 return String(s||'').replace(/\s+/g,' ').trim();
}
async function findWikipedia({roll,catalog,seen,focus='',onDeep,storyKind='legacy'}) {
 const plan=sourcePlan(roll,catalog,focus);
 const base=(plan.indexedWord ? (plan.indexedWord+' '+(plan.realm||'history')+' unusual event') : '') || WIKI_QUERIES[roll.sector] || (plan.name+' historical discovery');
 const seenWikipedia=[...seen].filter(id=>id.startsWith('wiki-')).length;
 // Keep a finite search offset and rotate terms; do not loop over seen items.
 // Rotate search phrasing and offsets independently: the previous five-offset
 // loop exhausted the same articles after only a few visits.
 const variants=['documented discoveries','unusual historical mystery','forgotten experiments','rediscovered artifacts','unexpected events'];
 const variant=variants[seenWikipedia%variants.length];
 // Start with a broad, sector-specific search; a strict intersection of angle,
 // subject and source-class terms can return no Wikipedia pages at all.
 const topics=[plan.indexedWord||base,base,plan.indexedWord?plan.indexedWord+' historical discoveries':base+' '+variant,(plan.focus&&plan.focus!==plan.name?plan.focus:plan.name)+' '+variant];
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
   if(!Number.isInteger(page.pageid)||!title||seen.has(id)||seen.has('wiki-gpt-'+page.pageid)||seen.has('url:https://en.wikipedia.org/?curid='+page.pageid)||full.length<240)continue;
   if(/^(List of|Index of|Timeline of|Category:|20[0-9][0-9] in |[0-9]{4} in )/i.test(title))continue;
   if(/may refer to|is a disambiguation page/i.test(full.slice(0,200)))continue;
   if(/television series|fictional character|video game series/i.test(full.slice(0,200)) && roll.sector!==21)continue;
   if(isGenericProfile({title,summary:full})||isPlaceProfile({title,summary:full})||(/\b(film|movie|fictional|video game|episode|television series)\b/i.test(title) && roll.sector!==21))continue;
   candidates.push({id,title,full,pageid:page.pageid});
  }
 }
 if(!candidates.length)return null;
 // Prefer the strongest discovery language over ordinary topical references.
 const hook=/\b(?:discovered|rediscovered|forgotten|hidden|lost|mysterious|mystery|unexpected|secret|excavated|recovered|declassified|forgery|accidental|unusual|breakthrough|experiment)\b/i;
 const topicWords=(clean(plan.indexedWord||plan.focus).toLowerCase().match(/[a-z]{4,}/g)||[])
   .filter(w=>!['history','unusual','mystery','discovery','invention','original'].includes(w)).slice(0,4);
 const ranked=candidates.map(item=>{
   const title=item.title.toLowerCase(),body=item.full.slice(0,600).toLowerCase();
   const relevance=topicWords.reduce((score,w)=>score+(title.includes(w)?8:0)+(body.includes(w)?2:0),0);
   return {item,score:relevance+(hook.test(item.title)?4:0)+(hook.test(item.full.slice(0,500))?3:0)+Math.min(3,Math.floor(item.full.length/500))};
 });
 ranked.sort((a,b)=>b.score-a.score);
 const shortlist=ranked.slice(0,Math.min(8,ranked.length)).map(x=>x.item);
 // For an explicit search, take the strongest matching real article rather
 // than randomly giving the GPT writer an unrelated page.
 const choice=shortlist[arguments[0]?.strictGPT===true?0:random(shortlist.length)];
 const sentences=choice.full.match(/[^.!?]+[.!?]+/g)||[];
 let summary=sentences.slice(0,3).join(' ').trim();
 if(summary.length<90)summary=choice.full.slice(0,290);
 if(summary.length>540)summary=summary.slice(0,537).trimEnd()+'…';
 const article='https://en.wikipedia.org/?curid='+choice.pageid;
 const backup={id:choice.id,title:choice.title,summary,
   full:choice.full+'\n\nSource: Wikipedia contributors. Excerpt reused under Creative Commons Attribution-ShareAlike; follow the source and license links for details.',
   year:'',sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,
   wordNumber:Number(roll.wordNumber)||0,indexWord:roll.indexWord||'',
   refinementNumber:Number(roll.refinementNumber)||0,directionNumber:Number(roll.directionNumber)||0,storyDirection:roll.storyDirection||'',
   bracketKey:roll.bracketKey||'',combination:plan.combination,
   status:'backup encyclopedia excerpt · CC BY-SA · no GPT rewrite',
   sourceTitle:'Wikipedia contributors',sourceUrl:article,
   sources:[{title:'Wikipedia copyright and CC BY-SA attribution',url:WIKI_LICENSE}],
   discoverySource:'live',discoveryMethod:'encyclopedia-backup',attribution:'Wikipedia / CC BY-SA'};
 // Asteroid never displays an encyclopedia excerpt as a finished story.
 // Research it with GPT before it can enter the visible card, even when the
 // multi-source web search endpoint is down.
 if(arguments[0]?.strictGPT===true){
  // A broad topic can surface a disambiguation or a general page first.
  // Ask GPT about two distinct sourced candidates concurrently instead of
  // abandoning the Asteroid story after a single "insufficient" response.
  const alternatives=shortlist.slice(0,2);
  let successful=null;
  // Retry only when needed: avoid paying twice for a successful first story.
  for(const page of alternatives){
   if(global.PhiInfiniteBookResearchStatus==='quota')break;
   const written=await writeWikipediaStory(page,plan,roll,storyKind).catch(()=>null);
   if(written){successful={page,written};break}
  }
  if(!successful)return null;
  const {page,written}=successful,articleUrl='https://en.wikipedia.org/?curid='+page.pageid;
  return {...backup,...written,id:'wiki-gpt-'+page.pageid,
   sourceTitle:'Wikipedia contributors · '+page.title,sourceUrl:articleUrl,
   sources:[{title:page.title+' · Wikipedia (CC BY-SA)',url:articleUrl}],
   status:'original single-source GPT research · Wikipedia CC BY-SA',
   discoveryMethod:'gpt-wiki',mood:written.mood};
 }
 // Never make the immediate sourced fallback wait for an unresponsive AI Worker.
 // Upgrade this same discovery with original prose only after the reader opts
 // to leave the card undisturbed.
 if(typeof onDeep==='function'){
  void writeWikipediaStory(choice,plan,roll,storyKind).then(written=>{
   if(!written)return;
   onDeep({...backup,...written,id:'wiki-gpt-'+choice.pageid,
    status:'original single-source research · Wikipedia / CC BY-SA',
    discoveryMethod:'gpt-wiki'});
  }).catch(error=>console.warn('Wikipedia story rewrite unavailable',error));
 }
 return backup;
}
async function find(options){
 const strict=options?.strictGPT===true;
 const deep=findSearch(options).catch(error=>{console.warn('Book GPT research unavailable',error);return null;});
 const backup=findWikipedia(options).catch(error=>{console.warn('Book independent source discovery unavailable',error);return null;});
 if(!strict){
  const first=await Promise.race([deep.then(story=>({type:'deep',story})),backup.then(story=>({type:'wiki',story}))]);
  if(first.story)return first.story;
  return first.type==='deep'?backup:deep;
 }
 // Only the actual model's original source-backed writing can enter Asteroid.
 // A retrieved excerpt, old film catalog, or encyclopedia blurb is not a finished story.
 const first=await Promise.race([
  deep.then(x=>({type:'deep',story:x})),
  backup.then(x=>({type:'wiki',story:x}))
 ]);
 if(eligibleNarrative(first.story))return first.story;
 const second=first.type==='deep'?await backup:await deep;
 return eligibleNarrative(second)?second:null;
}

global.PhiInfiniteBookDiscover={preferences,find,sourcePlan,indexedDraw,isPlaceProfile,isGenericProfile,isSecretStory,storyMood,eligibleNarrative};
})(window);
