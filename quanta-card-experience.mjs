/* Infinity card experiences: real local controls, consented embeds, verified open APIs.
 * Never invent publisher feeds, balances, trending lists, streaming rights or provider sessions.
 */
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const action=(label,handler)=>{const b=node('button','qcx-button',label);b.type='button';b.addEventListener('click',handler);return b};
const note=(root,text)=>root.append(node('p','qcx-note',text));
const link=(label,href)=>{const a=node('a','qcx-link',label+' ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a};
function input(placeholder,label){const e=node('input','qcx-input');e.type='search';e.placeholder=placeholder;e.setAttribute('aria-label',label);e.maxLength=180;return e}
function section(root,eyebrow,title){const w=node('section','qcx-tool');w.append(node('p','qcx-eyebrow',eyebrow),node('h3','',title));root.append(w);return w}
const searchBase={
 google:['https://www.google.com/search?q=','Google'],bing:['https://www.bing.com/search?q=','Bing'],
 youtube:['https://www.youtube.com/results?search_query=','YouTube'],
 reddit:['https://www.reddit.com/search/?q=','Reddit'],tiktok:['https://www.tiktok.com/search?q=','TikTok'],
 'yahoo-news':['https://news.yahoo.com/search?p=','Yahoo News'],
 cnn:['https://www.google.com/search?q=site%3Acnn.com%20','CNN'],
 'fox-news':['https://www.google.com/search?q=site%3Afoxnews.com%20','Fox News'],
 facebook:['https://www.facebook.com/search/top?q=','Facebook'],
 instagram:['https://www.instagram.com/explore/tags/','Instagram tags'],
 x:['https://x.com/search?q=','X'],
 'tv-guide':['https://www.google.com/search?q=site%3Atvguide.com%20','TV Guide'],
 starmaker:['https://www.google.com/search?q=site%3Astarmakerstudios.com%20','StarMaker'],
 ebay:['https://www.ebay.com/sch/i.html?_nkw=','eBay'],
 robinhood:['https://www.google.com/search?q=site%3Arobinhood.com/stocks%20','Robinhood'],
 instructables:['https://www.instructables.com/howto/','Instructables'],
 'vintage-toys':['https://www.ebay.com/sch/i.html?_nkw=','eBay'],
 'antique-collectibles':['https://www.ebay.com/sch/i.html?_nkw=','eBay'],
 'us-mint':['https://www.google.com/search?q=site%3Ausmint.gov%20','U.S. Mint'],
 pcgs:['https://www.google.com/search?q=site%3Apcgs.com%20','PCGS'],
 ngc:['https://www.google.com/search?q=site%3Angccoin.com%20','NGC'],
 chime:['https://www.google.com/search?q=site%3Achime.com%20','Chime']
};
export function createCardArtwork(card,small=false){
 const art=node('div','qcx-art'+(small?' qcx-small':''));
 const category=String(card.category||card.kind||'Discover');
 const title=String(card.name||'QuantaPhi');
 const words=title.replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean);
 const mark=(words.length>1?words.slice(0,2).map(x=>x[0]).join(''):title.slice(0,2)).toUpperCase().slice(0,3);
 const variants=['radio','music','video','news','research','social','coin','market','finance','other'];
 const text=(category+' '+title).toLowerCase();
 const theme=/radio/.test(text)?'radio':/music|karaoke|starmaker/.test(text)?'music':/youtube|video|tiktok/.test(text)?'video':/news|cnn|fox/.test(text)?'news':/social|facebook|instagram|reddit|whatsapp|x \/ grok/.test(text)?'social':/coin|vam|silver|gold|mint|pcgs|ngc/.test(text)?'coin':/market|ebay|toy|antique/.test(text)?'market':/finance|invest|robinhood|chime/.test(text)?'finance':/science|knowledge|wikipedia/.test(text)?'research':'other';
 art.dataset.theme=variants.includes(theme)?theme:'other';
 art.append(node('span','qcx-art-kicker','INFINITY · '+category.toUpperCase()),node('strong','qcx-art-mark',mark),node('span','qcx-art-name',title));
 art.setAttribute('aria-label',title+' '+category+' cover');
 return art;
}
function searchTool(root,card,options={}){
 const spec=searchBase[card.id];if(!spec)return false;
 const panel=section(root,'SEARCH · ORIGINAL SOURCE','Find exactly what interests you');
 const form=node('form','qcx-search-form');const field=input(card.id==='facebook'?'Local events, people, groups…':card.id==='ebay'?'Morgan dollars, radios, parts…':'Topic, show, artist, product…','Search '+spec[1]);
 if(card.id==='instagram')field.placeholder='Enter a hashtag (without #)';
 const b=node('button','qcx-button','Search '+spec[1]);b.type='submit';
 form.append(field,b);form.addEventListener('submit',e=>{
  e.preventDefault();const query=field.value.trim().replace(/^#/,'');if(!query)return;
  // Provider-owned search, not a pretend in-card copy or API result.
  const url=spec[0]+encodeURIComponent(query);
  window.open(url,'_blank','noopener,noreferrer');
 });
 panel.append(form);
 if(card.id==='facebook')note(panel,'Search at Facebook. Local personalization only follows location or interests you explicitly enter.');
 if(card.id==='cnn'||card.id==='fox-news')note(panel,'Publisher-specific web search. Results, dates and article rights remain with the original publisher.');
 if(card.id==='robinhood'||card.id==='chime')note(panel,'Public research only. Personal balances and holdings require a separately approved integration.');
 return true;
}
const youtubeId=value=>{
 try{const u=new URL(value);if(!['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be','www.youtube-nocookie.com'].includes(u.hostname)||u.protocol!=='https:')return null;
 const id=u.hostname.includes('youtu.be')?u.pathname.slice(1):u.pathname.startsWith('/shorts/')?u.pathname.split('/')[2]:u.searchParams.get('v');
 return /^[A-Za-z0-9_-]{11}$/.test(id||'')?id:null;}catch{return null}
};
const tiktokId=value=>{try{const u=new URL(value);if(u.protocol!=='https:'||!['www.tiktok.com','tiktok.com'].includes(u.hostname))return null;const m=u.pathname.match(/\/video\/(\d{16,22})/);return m?m[1]:null;}catch{return null}};
const spotifyEmbed=value=>{try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='open.spotify.com')return null;const m=u.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]{15,30})\/?$/);return m?'https://open.spotify.com/embed/'+m[1]+'/'+m[2]:null}catch{return null}};
export const validMediaUrl=(provider,value)=>provider==='youtube'?Boolean(youtubeId(value)):provider==='tiktok'?Boolean(tiktokId(value)):provider==='spotify'?Boolean(spotifyEmbed(value)):false;
function mediaPlayer(root,id){
 const panel=section(root,'PLAY · REAL PROVIDER MEDIA',id==='youtube'?'Your YouTube reel':id==='tiktok'?'Watch a TikTok':'Play a Spotify selection');
 note(panel,'Paste a public '+(id==='youtube'?'YouTube video or Short':id==='tiktok'?'TikTok video':'Spotify track, album or playlist')+' URL. Nothing is loaded until you press Play.');
 const form=node('form','qcx-search-form');const field=input('Paste an original '+id+' URL','Public media URL');
 const button=node('button','qcx-button','Play in card');button.type='submit';form.append(field,button);
 const result=node('div','qcx-player');result.setAttribute('aria-live','polite');
 form.addEventListener('submit',e=>{
  e.preventDefault();
  const src=id==='youtube'?(youtubeId(field.value)?'https://www.youtube-nocookie.com/embed/'+youtubeId(field.value):null):
   id==='tiktok'?(tiktokId(field.value)?'https://www.tiktok.com/player/v1/'+tiktokId(field.value):null):spotifyEmbed(field.value);
  result.replaceChildren();
  if(!src){note(result,'This is not a supported public '+id+' URL. Paste the original link.');return;}
  const frame=node('iframe','qcx-video');frame.src=src;frame.title=id+' player';
  frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
  if(id!=='spotify')frame.allowFullscreen=true;
  if(id==='spotify')frame.style.aspectRatio='4 / 2';result.append(frame);
 });
 panel.append(form,result);
 return panel;
}
async function wikiSearch(root,query){
 const status=root.querySelector('.qcx-wiki-status'),results=root.querySelector('.qcx-wiki-results');
 if(!status||!results)return;
 status.textContent='Loading Wikipedia results…';results.replaceChildren();
 try{
  const api=new URL('https://en.wikipedia.org/w/api.php');
  api.searchParams.set('action','query');api.searchParams.set('generator','search');api.searchParams.set('gsrsearch',query);
  api.searchParams.set('gsrlimit','6');api.searchParams.set('prop','extracts|pageimages|info');
  api.searchParams.set('exintro','1');api.searchParams.set('explaintext','1');api.searchParams.set('exsentences','2');
  api.searchParams.set('piprop','thumbnail');api.searchParams.set('pithumbsize','240');
  api.searchParams.set('inprop','url');api.searchParams.set('format','json');api.searchParams.set('origin','*');
  const reply=await fetch(api.toString(),{mode:'cors',credentials:'omit'});
  if(!reply.ok)throw new Error('HTTP '+reply.status);
  const data=await reply.json();const pages=Object.values(data?.query?.pages||{}).sort((a,b)=>(a.index||0)-(b.index||0));
  status.textContent=pages.length?pages.length+' live encyclopedia results · Wikipedia':'No encyclopedia matches';
  for(const page of pages){
   const item=node('article','qcx-result');
   if(page.thumbnail?.source){const pic=node('img','qcx-thumb');pic.src=page.thumbnail.source;pic.alt='Wikipedia article image: '+page.title;pic.loading='lazy';item.append(pic);}
   const body=node('div','');body.append(node('h4','',page.title),node('p','',String(page.extract||'Read the full cited article at Wikipedia.').slice(0,500)));
   const url=page.fullurl||'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replaceAll(' ','_'));
   body.append(link('Read and verify at Wikipedia',url));item.append(body);results.append(item);
  }
 }catch{status.textContent='Wikipedia preview unavailable. You can still search the original encyclopedia.';results.append(link('Search Wikipedia', 'https://en.wikipedia.org/w/index.php?search='+encodeURIComponent(query)));}
}
function wikipediaTool(root,card){
 const panel=section(root,'LIVE · WIKIMEDIA API','Real encyclopedia article previews');
 const form=node('form','qcx-search-form');const field=input('Philco 90, Morgan dollar, electronics…','Wikipedia search');field.value=card.id==='wikipedia'?'':card.name;
 const b=node('button','qcx-button','Load articles');b.type='submit';form.append(field,b);
 const status=node('p','qcx-note qcx-wiki-status','Select a topic to load real articles.');
 const result=node('div','qcx-wiki-results');
 form.addEventListener('submit',e=>{e.preventDefault();if(field.value.trim())void wikiSearch(panel,field.value.trim().slice(0,120));});
 panel.append(form,status,result);note(panel,'Live text/images come from Wikipedia, linked to original pages. Not from the featured company or a private feed.');
}
function recorder(root){
 const panel=section(root,'RECORD · DEVICE LOCAL','Sing and play back your take');
 note(panel,'Your microphone is requested only when you tap Start. Backing music stays on its licensed source; this records your own microphone audio.');
 const status=node('p','qcx-note','Microphone is off');status.setAttribute('role','status');
 const controls=node('div','qcx-controls');const start=action('● Start recording',()=>void begin()),stop=action('■ Stop',()=>end());stop.disabled=true;
 const player=node('audio','qcx-audio');player.controls=true;player.hidden=true;
 const save=node('a','qcx-button','Save recording');save.hidden=true;save.download='infinity-karaoke-take.webm';
 controls.append(start,stop);panel.append(status,controls,player,save);
 let stream=null,rec=null,chunks=[],objectUrl=null;
 async function begin(){
  if(rec?.state==='recording')return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){status.textContent='Recording is not supported in this browser. Open QuantaPhi in a browser with microphone support.';return;}
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   const opts=MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')?{mimeType:'audio/webm;codecs=opus'}:{};
   rec=new MediaRecorder(stream,opts);chunks=[];rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   rec.onerror=()=>{status.textContent='Recording failed. Check microphone use by other apps.';end()};
   rec.onstop=()=>{
    stream?.getTracks().forEach(t=>t.stop());stream=null;
    if(chunks.length){if(objectUrl)URL.revokeObjectURL(objectUrl);const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});objectUrl=URL.createObjectURL(blob);
     player.src=objectUrl;player.hidden=false;save.href=objectUrl;save.hidden=false;status.textContent='Take captured in this session. Play it or download the file before closing.';}
    else status.textContent='No audio data was captured. Nothing has been saved.';
   };
   rec.start(500);start.disabled=true;stop.disabled=false;status.textContent='Recording your voice…';
  }catch{stream?.getTracks().forEach(t=>t.stop());status.textContent='Microphone denied or busy. Nothing was recorded.';start.disabled=false;stop.disabled=true;}
 }
 function end(){if(rec?.state==='recording')rec.stop();else stream?.getTracks().forEach(t=>t.stop());start.disabled=false;stop.disabled=true;}
 window.addEventListener('pagehide',()=>{if(rec?.state==='recording')end();if(objectUrl)URL.revokeObjectURL(objectUrl);},{once:true});
}
function calculator(root,card){
 const panel=section(root,'CALCULATE · NO INVENTED QUOTES','Precious-metal value calculator');
 note(panel,'Enter the current spot price you verified. This does not pretend to fetch live prices.');
 const form=node('form','qcx-math');const spot=input('Spot price / troy oz in USD','Spot USD per troy ounce'),weight=input('Weight in troy ounces','Troy ounces');spot.type='number';spot.min='0';spot.step='any';weight.type='number';weight.min='0';weight.step='any';
 const out=node('output','qcx-total','Enter values to calculate');
 const b=node('button','qcx-button','Calculate melt value');b.type='submit';form.append(spot,weight,b,out);
 form.addEventListener('submit',e=>{e.preventDefault();const s=Number(spot.value),w=Number(weight.value);out.textContent=spot.value&&weight.value&&Number.isFinite(s*w)&&s>=0&&w>=0?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(s*w):'Enter two nonnegative numbers.';});
 panel.append(form,link('Verify spot on original chart',card.url));
}
function checklist(root,card){
 const radio=card.id.startsWith('radio-')||card.id==='just-radios';
 const coin=card.id.startsWith('vam-')||['pcgs','ngc','us-mint'].includes(card.id);
 if(!radio&&!coin&&card.id!=='instructables')return;
 const items=radio?['Confirm model and chassis number','Read original schematic and safety instructions','Photograph component values and wiring before work','Compare restoration observations with trusted sources']:
  coin?['Record date, mintmark and variety markers','Check multiple high-resolution diagnostic views','Compare certified attribution and provenance','Distinguish wear, damage and die characteristics']:
  ['Gather parts and tools from the original creator','Read all steps and safety warnings','Check power and electrical ratings','Document and test each stage'];
 const panel=section(root,'WORKBENCH · INTERACTIVE NOTES',radio?'Vintage radio restoration study':coin?'Coin identification checklist':'Project build checklist');
 note(panel,'Use this checklist alongside the actual source. No claims that a seller or collector has verified your item.');
 for(const txt of items){const wrap=node('label','qcx-check');const check=node('input');check.type='checkbox';wrap.append(check,node('span','',txt));panel.append(wrap);}
 const field=input('Your model, condition, die marker or question','Research notes');field.maxLength=140;panel.append(field);
 const res=node('p','qcx-note','');panel.append(action('Copy my study notes',()=>{
  const checked=[...panel.querySelectorAll('.qcx-check input:checked')].map(x=>x.parentElement.textContent);
  const body=[card.name,field.value.trim(),...checked].filter(Boolean).join('\n');
  if(navigator.clipboard?.writeText)void navigator.clipboard.writeText(body).then(()=>{res.textContent='Notes copied.'}).catch(()=>{res.textContent='Clipboard unavailable. Select your notes manually.'});
  else res.textContent='Clipboard unavailable. Select your notes manually.';
 }),res);
}
function whatsappDraft(root){
 const panel=section(root,'COMPOSE · USER APPROVED','Write a WhatsApp message');
 const recipient=input('Country code + phone number (digits only)','Recipient phone number'),body=node('textarea','qcx-input');body.rows=3;body.placeholder='Write your message';body.maxLength=1000;
 const status=node('p','qcx-note','Nothing is sent without you approving it in WhatsApp.');
 const b=action('Open message draft in WhatsApp',()=>{
  const n=recipient.value.replace(/[^\d]/g,'');if(n.length<7||n.length>15){status.textContent='Enter a valid international phone number before opening WhatsApp.';return;}
  const url='https://wa.me/'+n+'?text='+encodeURIComponent(body.value);window.open(url,'_blank','noopener,noreferrer');status.textContent='Draft opened at WhatsApp; you decide whether to send.';
 });panel.append(recipient,body,b,status);
}

/* Reuse the existing verified Google Trends RSS importer and cached observations.
 * These are Google search topics, NOT native rankings on YouTube, CNN or X.
 */
export async function loadVerifiedTrends(fetcher=fetch){
 const sources=['/data/google-trends-latest.json',
  'https://raw.githubusercontent.com/www-infinity4/QuantaPhi/trends-rss-data/data/google-trends-latest.json'];
 for(const url of sources){
  try{
   const response=await fetcher(url,{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
   if(!response.ok)continue;
   const feed=await response.json();
   if(feed?.source!=='Google Trends Trending Now RSS'||feed.region!=='US'||
    !Array.isArray(feed.topics)||!Number.isFinite(Date.parse(feed.checked_at)))continue;
   const items=feed.topics.filter(x=>typeof x.query==='string'&&x.query.trim().length>1&&
    typeof x.approx_searches==='string'&&/^\\d[\\d,]*(?:\\.\\d+)?[KMB]?\\+$/i.test(x.approx_searches)&&
    Number.isFinite(Date.parse(x.published_at))).slice(0,15);
   if(items.length) return {checkedAt:feed.checked_at,items,sourceUrl:feed.source_url};
  }catch{/* Try the maintained trend-data branch. */}
 }
 throw new Error('verified_trends_unavailable');
}
function trendingTool(root,card){
 if(!['google','youtube','yahoo-news','cnn','fox-news','x','bing'].includes(card.id))return;
 const panel=section(root,'DATED SOURCE · GOOGLE TRENDS RSS','What people are searching for');
 const status=node('p','qcx-note','Select Refresh to load Google’s latest observed U.S. searches.');
 const rows=node('div','qcx-trends');rows.setAttribute('aria-live','polite');
 const refresh=action('↻ Refresh verified topics',()=>void load());
 panel.append(status,refresh,rows);
 const base=searchBase[card.id]?.[0]||'https://www.google.com/search?q=';
 async function load(){
  refresh.disabled=true;status.textContent='Checking the latest validated Google Trends feed…';rows.replaceChildren();
  try{
   const d=await loadVerifiedTrends();
   const age=Date.now()-Date.parse(d.checkedAt);
   const stale=age<0||age>36*60*60*1000;
   const when=new Date(d.checkedAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
   status.textContent=(stale?'Archived observations':'Last checked')+': '+when+' · Google U.S. search-volume buckets, not QuantaPhi visits or '+card.name+' native trends.';
   for(const item of d.items.slice(0,10)){
    const r=node('div','qcx-trend');
    const desc=node('div','');desc.append(node('strong','',item.query),node('small','',item.approx_searches+' approximate Google searches'));
    const b=action('Explore on '+card.name,()=>window.open(base+encodeURIComponent(item.query),'_blank','noopener,noreferrer'));
    r.append(desc,b);rows.append(r);
   }
   rows.append(link('Google Trends original source',d.sourceUrl));
  }catch{status.textContent='Live trend snapshot unavailable. No topics were fabricated.';}
  finally{refresh.disabled=false;}
 }
 // Fetch only after the visitor requests it, not for every card on the Public grid.
}

export function mountCardTools(root,card){
 if(!root||!card)return;root.replaceChildren();
 root.classList.add('qcx-experience');root.append(node('p','qcx-eyebrow','INTERACTIVE CARD · '+String(card.category||card.kind||'Explore').toUpperCase()));
 const id=card.id;
 if(id==='youtube'||id==='tiktok')mediaPlayer(root,id);
 if(id==='spotify')mediaPlayer(root,'spotify');
 if(id==='starmaker')recorder(root);
 if(id==='whatsapp')whatsappDraft(root);
 if(id==='wikipedia')wikipediaTool(root,card);
 if(id==='gold'||id==='silver')calculator(root,card);
 checklist(root,card);
 trendingTool(root,card);
 searchTool(root,card);
 if(root.querySelectorAll('.qcx-tool').length===0){
  const tool=section(root,'INVESTIGATE','Research this source');
  const field=input('What would you like to investigate?','Research topic');
  const b=action('Search original topic',()=>{const q=field.value.trim();if(q)window.open('https://www.google.com/search?q='+encodeURIComponent(card.name+' '+q),'_blank','noopener,noreferrer');});
  tool.append(field,b);
 }
}
