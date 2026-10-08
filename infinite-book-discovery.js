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
[25,/architecture|skyscraper|building design|city history/i],
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
function sourcePlan(roll,catalog){
 const name=catalog.sectors.find(s=>s.id===roll.sector)?.name||'surprising history';
 const angle=catalog.angles.find(a=>a.id===roll.angle)?.name||'forgotten discovery';
 const domains=catalog.sourceRegistry.find(s=>s.sector===roll.sector)?.domains||['si.edu','loc.gov','nps.gov','smithsonianmag.com'];
 const domain=domains[random(domains.length)];
 return {name,angle,queries:[name+' '+angle+' surprising historical discovery site:'+domain,name+' '+angle+' museum archive discovery']};
}
async function request(url,options={},ms=8500){
 const c=new AbortController(),timeout=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(url,{...options,signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timeout)}
}
function extract(payload){
 return (Array.isArray(payload?.results)?payload.results:[]).map(r=>({title:clean(r.title).slice(0,200),summary:clean(r.content||r.description).slice(0,700),url:canonical(r.url)}))
 .filter(r=>r.title.length>=13&&r.summary.length>=70&&origin(r.url))
 .filter(r=>!/\/(shop|login|signup|cart)(\/|\?|$)/i.test(r.url));
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
async function find({roll,catalog,seen}){
 const plan=sourcePlan(roll,catalog);
 const responses=await Promise.allSettled(plan.queries.map(q=>{const u=new URL(SEARCH);u.search=new URLSearchParams({q,format:'json',categories:'general',safesearch:'1'});return request(u.href,{cache:'no-store'},8000)}));
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
  if(!obj||obj.insufficient||clean(obj.title).length<12||clean(obj.summary).length<80||clean(obj.full).length<200)continue;
  const status=['documented','reported','contested','corrected myth','folklore'].includes(obj.status)?obj.status:'reported';
  return {id:'live-'+hash(lead.url),title:clean(obj.title).slice(0,180),summary:clean(obj.summary).slice(0,650),
    full:String(obj.full).trim().slice(0,2300),year:'',sector:roll.sector,angle:roll.angle,sourceClass:roll.sourceClass,
    status:status+' · sourced summary',sourceTitle:lead.title,sourceUrl:lead.url,
    sources:sources.map(s=>({title:s.title,url:s.url})),discoverySource:'live'};
 }
 return null;
}
global.PhiInfiniteBookDiscover={preferences,find,sourcePlan};
})(window);
