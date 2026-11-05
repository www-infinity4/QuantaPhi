/* Source-backed family lounge. No fabricated TV playback, deals, ads or wallet receipts.
   Recognition is one-shot after an explicit tap; relevance is opt-in device-local. */
import {CHANNELS,OFFERS,IOWA_CITIES,routeFamilyRequest,rankDiscovery,forecastSevenDays,filteredTrends,normalizeName,sourceCardForIntent} from '../templates/family-lounge/logic.mjs';
import {castAction} from './presentation.mjs';
const q=id=>document.getElementById(id);
const node=(tag,cls='',text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x};
const status=(id,text)=>{if(q(id))q(id).textContent=text};
const link=(label,url,cls='')=>{
 const x=node('a',cls,label);x.href=url;
 if(url.startsWith('https://')){x.target='_blank';x.rel='noopener noreferrer';x.referrerPolicy='strict-origin-when-cross-origin'}
 return x;
};
const KEY='gary:family:discovery:optin:v1',NAME='gary:family:bubbles:nickname:v1';
const interests=['westerns','news','music','science','food','entertainment'];
let prefs={enabled:false,interests:[],lastTopic:''};
try{const v=JSON.parse(localStorage.getItem(KEY)||'null');
 if(v?.enabled===true&&Array.isArray(v.interests))prefs={enabled:true,interests:v.interests.filter(x=>interests.includes(x)),lastTopic:interests.includes(v.lastTopic)?v.lastTopic:''};
}catch{}
const save=()=>{try{if(prefs.enabled)localStorage.setItem(KEY,JSON.stringify(prefs));else localStorage.removeItem(KEY)}catch{}};
const remember=category=>{if(!prefs.enabled||!interests.includes(category))return;prefs.lastTopic=category;if(!prefs.interests.includes(category))prefs.interests.push(category);save()};

// This is the existing real Bubbles embed, with an editable public display name.
// Keep the same ID so browser-local notes aren't silently forked into a new bubble.
function mountBubble(){
 let nickname='Bubbles';
 try{nickname=normalizeName(localStorage.getItem(NAME)||'Bubbles')}catch{}
 q('family-bubbles-name').value=nickname;
 const script=document.createElement('script');
 script.src='/bubbles-embed.js';
 script.dataset.bubbleId='gary-westerns-2026';
 script.dataset.bubbleRole='assistant';
 script.dataset.bubbleName=nickname==='Bubbles'?'Bubbles for Gary':nickname;
 script.dataset.bubbleInstructions='Be a kind, intelligent, patient AI companion for Gary and family. Only claim verified AI/tool abilities. TV, shopping and cards can be adjusted through the visible page controls, or the visitor may explicitly Share draft with this website from Bubbles Notes and authorized work. Never pretend to execute a channel change, sign into Netflix, cast a screen, read unheard reactions or change a wallet without a real receipt. Guest chat is allowed. Local memory is opt-in and cloud memory needs separate wallet verification. Do not expose the site-owner Robot Brain.';
 document.body.append(script);
 const setName=()=>{
   const next=normalizeName(q('family-bubbles-name').value);
   q('family-bubbles-name').value=next;
   try{localStorage.setItem(NAME,next)}catch{}
   status('family-name-status','Saved '+next+'. Reload the page to update the floating bubble label. You can also use “Program this bubble” inside the chat.');
 };
 q('family-save-name').addEventListener('click',setName);
 q('family-bubbles-name').addEventListener('change',setName);
 q('family-bubbles-name').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();setName()}});
}
mountBubble();

let selected=null;
function showChannel(c){
 if(!c)return;
 selected=c;
 for(const b of q('family-channel-buttons').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.channel===c.id));
 const detail=q('family-channel-detail');detail.replaceChildren(node('strong','',c.title),node('p','',c.note));
 const player=q('western-player'),cover=q('western-cover');
 if(player){player.replaceChildren();player.hidden=true;}
 if(cover)cover.hidden=false;
 if(c.mode==='embedded'){
   detail.append(node('p','','Choose a Western in the movie screen below.'));
   detail.append(link('Go to the Western movie player ↓','#watch','family-action'));
 }else{
   detail.append(node('p','','This licensed broadcaster or service must open in its own authorized player. There is no fake live feed embedded here.'));
   detail.append(link('Open '+c.title+' official player ↗',c.url,'family-action'));
 }
 remember(c.category);renderFeatured();
}
for(const c of CHANNELS){
 const button=node('button','family-channel',c.title);
 button.type='button';button.dataset.channel=c.id;button.setAttribute('aria-pressed','false');
 button.append(node('small','',c.mode==='embedded'?'Play here':c.login?'Provider sign-in':'Official player'));
 button.addEventListener('click',()=>showChannel(c));
 q('family-channel-buttons').append(button);
}
// Browser fullscreen is NOT TV casting. Keep the real TV setup help visible.
// Optional native Remote Playback is offered ONLY for directly controlled
// Infinity Radio audio when a browser actually exposes a remote media picker.
const castPanel=q('family-cast-panel');
const closeCast=()=>{
  castPanel.hidden=true;
  q('family-cast').setAttribute('aria-expanded','false');
};
q('family-cast').addEventListener('click',()=>{
  const showing=castPanel.hidden;
  castPanel.hidden=!showing;
  q('family-cast').setAttribute('aria-expanded',String(showing));
  if(!showing)return;
  const remote=audio?.remote;
  const mode=castAction({
    remotePromptAvailable:typeof remote?.prompt==='function',
    activeNativeMedia:Boolean(audio&&!audio.paused)
  });
  if(mode==='native-media-picker'){
    status('family-cast-status','Infinity Radio is playing. This browser supports a remote audio picker. It does not cast the Westerns iframe or whole screen; use Android Screen Cast for the page.');
    const button=node('button','family-cast-audio','Cast playing radio audio');
    button.type='button';
    button.addEventListener('click',async()=>{
      try{
        await remote.prompt();
        status('family-cast-status','The browser opened its audio device picker. Check the receiver for actual playback. For the full page use Android Screen Cast.');
      }catch{
        status('family-cast-status','The audio picker did not connect. To mirror the page, use Android Screen Cast on the same Wi-Fi network.');
      }
    },{once:true});
    q('family-cast-fullscreen').before(button);
  }else{
    castPanel.querySelector('.family-cast-audio')?.remove();
    status('family-cast-status','This website cannot open Android’s system screen-cast picker. Follow the steps below. The phone and TV normally need the same Wi-Fi network; fullscreen alone is not casting.');
  }
});
q('family-cast-fullscreen').addEventListener('click',async()=>{
  const root=q('family-lounge');
  if(typeof root?.requestFullscreen!=='function'){
    status('family-cast-status','This browser cannot fullscreen this page. To mirror it, use Android Screen Cast instead.');return;
  }
  try{
    await root.requestFullscreen();
    status('family-cast-status','Fullscreen on this device only. If a TV is connected with Android Screen Cast, it will also show this page.');
  }catch{
    status('family-cast-status','Fullscreen could not start. To connect a TV, use your phone’s Screen Cast controls.');
  }
});
q('family-cast-close').addEventListener('click',closeCast);

function offerCard(offer,label='Check official source ↗'){
 const card=node('article','family-offer-card');
 const host=new URL(offer.url).hostname;
 const image=node('img','family-logo');
 image.src='https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=128';
 image.alt='';image.loading='lazy';image.width=64;image.height=64;
 image.addEventListener('error',()=>image.remove(),{once:true});
 card.append(image,node('p','family-offer-type',offer.category.toUpperCase()+' · OFFICIAL SOURCE'),node('h4','',offer.title),node('p','',offer.description));
 const action=link(label,offer.url,'family-action');
 action.addEventListener('click',()=>{remember(offer.category);renderFeatured()});
 card.append(action);return card;
}
let featuredIndex=0,slides=[],paused=false;
function renderFeatured(){
 slides=rankDiscovery(OFFERS,prefs.enabled?{interests:prefs.interests,topic:prefs.lastTopic}:{});
 featuredIndex=Math.min(featuredIndex,Math.max(0,slides.length-1));
 const target=q('family-featured');target.replaceChildren();
 if(slides.length)target.append(offerCard(slides[featuredIndex]));
 status('family-featured-status',slides.length?'Card '+(featuredIndex+1)+' of '+slides.length+' · '+(prefs.enabled?'Only opted-in relevance':'General sources')+' · not paid placement':'No source cards');
}
const move=delta=>{if(!slides.length)return;featuredIndex=(featuredIndex+delta+slides.length)%slides.length;renderFeatured()};
const syncPause=()=>{q('family-pause').textContent=paused?'Resume':'Pause';q('family-pause').setAttribute('aria-pressed',String(paused))};
q('family-prev').addEventListener('click',()=>{paused=true;syncPause();move(-1)});
q('family-next').addEventListener('click',()=>{paused=true;syncPause();move(1)});
q('family-pause').addEventListener('click',()=>{paused=!paused;syncPause()});
q('family-featured').addEventListener('focusin',()=>{paused=true;syncPause()});
if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){paused=true;syncPause()}
setInterval(()=>{if(!paused&&!document.hidden&&q('family-featured')?.getClientRects().length)move(1)},11000);
function renderInterests(){
 const bar=q('family-interests');bar.replaceChildren();
 if(!prefs.enabled)return;
 for(const interest of interests){
  const label=node('label','family-interest'),check=node('input');
  check.type='checkbox';check.checked=prefs.interests.includes(interest);check.value=interest;
  check.addEventListener('change',()=>{
    prefs.interests=check.checked?[...new Set([...prefs.interests,interest])]:prefs.interests.filter(x=>x!==interest);
    prefs.lastTopic='';save();featuredIndex=0;renderFeatured();void loadTrends();
  });
  label.append(check,node('span','',interest[0].toUpperCase()+interest.slice(1)));bar.append(label);
 }
}
q('family-personalize').checked=prefs.enabled;
q('family-personalize').addEventListener('change',e=>{
 prefs.enabled=e.target.checked;if(!prefs.enabled){prefs.interests=[];prefs.lastTopic=''}
 save();renderInterests();featuredIndex=0;renderFeatured();void loadTrends();
});
q('family-forget').addEventListener('click',()=>{
 prefs={enabled:false,interests:[],lastTopic:''};save();
 q('family-personalize').checked=false;renderInterests();featuredIndex=0;renderFeatured();void loadTrends();
 status('family-trends-status','Page-specific recommendations cleared. Bubbles’ private notes and wallet were not changed.');
});
renderInterests();renderFeatured();

let trendsAbort=null;
async function loadTrends(){
 trendsAbort?.abort();trendsAbort=new AbortController();q('family-trends').replaceChildren();
 if(!prefs.enabled||!prefs.interests.length){
   status('family-trends-status','Select interests above to filter Google Trends. No personal profile is assumed.');return;
 }
 status('family-trends-status','Checking current source-backed Google trends…');
 let feed=null;
 for(const url of ['/data/google-trends-latest.json?checked='+Date.now(),
   'https://raw.githubusercontent.com/www-infinity4/QuantaPhi/trends-rss-data/data/google-trends-latest.json?checked='+Date.now()]){
   try{
     const r=await fetch(url,{cache:'no-store',signal:trendsAbort.signal});
     if(!r.ok)continue;
     const v=await r.json();
     if(v?.schema_version!==1||v?.source_url!=='https://trends.google.com/trending/rss?geo=US')continue;
     if(!feed||Date.parse(v.checked_at)>Date.parse(feed.checked_at))feed=v;
   }catch(e){if(e.name==='AbortError')return}
 }
 const cards=filteredTrends(feed,prefs.interests,new Date());
 if(!cards.length){
   status('family-trends-status','No fresh source-backed trends match these interests. Old or unrelated viral stories stay hidden.');return;
 }
 for(const t of cards){
   const card=node('article','family-trend-card');
   card.append(node('strong','',t.query),node('small','','Google Trends · observed '+new Date(t.observedAt).toLocaleString()));
   card.append(link('Search topic ↗','https://www.google.com/search?q='+encodeURIComponent(t.query)));
   card.append(link('Related news ↗','https://news.google.com/search?q='+encodeURIComponent(t.query)));
   q('family-trends').append(card);
 }
 status('family-trends-status',cards.length+' relevant trend cards · source checked '+new Date(feed.checked_at||feed.generated_at).toLocaleString());
}
q('family-trends-refresh').addEventListener('click',()=>void loadTrends());
if(prefs.enabled)void loadTrends();

let weatherAbort=null;
async function loadWeather(){
 weatherAbort?.abort();weatherAbort=new AbortController();
 const town=IOWA_CITIES[q('family-city').value]||IOWA_CITIES.ottumwa;
 q('family-forecast').replaceChildren();
 status('family-weather-status','Checking NOAA National Weather Service for '+town.name+', Iowa…');
 const stop=setTimeout(()=>weatherAbort.abort(),14000);
 try{
   const point='https://api.weather.gov/points/'+town.lat+','+town.lon;
   const r=await fetch(point,{headers:{Accept:'application/geo+json'},cache:'no-store',signal:weatherAbort.signal});
   if(!r.ok)throw Error('points unavailable');
   const api=new URL((await r.json())?.properties?.forecast||'');
   if(api.protocol!=='https:'||api.hostname!=='api.weather.gov')throw Error('untrusted weather source');
   const f=await fetch(api.href,{headers:{Accept:'application/geo+json'},cache:'no-store',signal:weatherAbort.signal});
   if(!f.ok)throw Error('forecast unavailable');
   const days=forecastSevenDays((await f.json())?.properties?.periods,new Date());
   if(!days.length)throw Error('no daily observations');
   for(const day of days){
     const card=node('article','family-day');
     card.append(node('strong','',new Date(day.date+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})));
     card.append(node('p','family-temperatures',(day.high===null?'—':day.high+'°')+' / '+(day.low===null?'—':day.low+'°')+'F'));
     card.append(node('small','',day.summary||'Forecast published by NWS'));
     if(day.precip!==null)card.append(node('small','',day.precip+'% precipitation chance'));
     q('family-forecast').append(card);
   }
   status('family-weather-status',town.name+', IA · '+days.length+' days · NWS read '+new Date().toLocaleTimeString()+' · tap Refresh for current data.');
 }catch{
   status('family-weather-status','Official forecast unavailable. No estimated weather shown. Try Refresh or weather.gov.');
 }finally{clearTimeout(stop)}
}
q('family-city').addEventListener('change',()=>void loadWeather());
q('family-weather-refresh').addEventListener('click',()=>void loadWeather());
void loadWeather();

let audio=null,radioTracks=[],index=0;
const RADIO_URL='/infinity-radio/oracle-track-feed.json?v=20261102-full-catalog1';
function validTrack(row){
 if(typeof row?.title!=='string'||typeof row.url!=='string')return false;
 try{const u=new URL(row.url);return u.protocol==='https:'&&['archive.org','www.archive.org','orangefreesounds.com','www.orangefreesounds.com'].includes(u.hostname)&&/\.(?:mp3|ogg)$/i.test(u.pathname)}catch{return false}
}
async function radioCatalog(){
 if(radioTracks.length)return radioTracks;
 const response=await fetch(RADIO_URL,{cache:'no-store'});
 if(!response.ok)throw Error('catalog unavailable');
 const rows=(await response.json()).tracks;
 radioTracks=(Array.isArray(rows)?rows:[]).filter(validTrack);
 if(!radioTracks.length)throw Error('no available tracks');
 return radioTracks;
}
async function startRadio(){
 try{
   await radioCatalog();
   if(!audio)audio=new Audio();
   audio.preload='none';audio.onended=()=>{index=(index+1)%radioTracks.length;void startRadio()};
   audio.onerror=()=>status('family-radio-status','Recording unavailable. Tap Next song to skip this source.');
   const song=radioTracks[index];
   if(audio.src!==song.url)audio.src=song.url;
   await audio.play();
   status('family-radio-status','Playing: '+song.title+' · Infinity Radio');
   remember('music');renderFeatured();
 }catch{status('family-radio-status','Playback unavailable. Tap again or open the full station.')}
}
q('family-radio-play').addEventListener('click',()=>{
 if(audio&&!audio.paused){audio.pause();status('family-radio-status','Paused · tap Infinity Radio to resume');return}
 void startRadio();
});
q('family-radio-next').addEventListener('click',async()=>{
 try{await radioCatalog();index=(index+1)%radioTracks.length;
   if(audio){audio.pause();audio.removeAttribute('src');audio.load()}
   await startRadio();
 }catch{status('family-radio-status','Radio catalog unavailable. Try the full Infinity Radio station.')}
});
q('family-radio-stop').addEventListener('click',()=>{
 if(audio){audio.pause();audio.removeAttribute('src');audio.load()}
 status('family-radio-status','Radio stopped.');
});
window.addEventListener('pagehide',()=>audio?.pause());

function showWidget(input){
 const command=typeof input==='string'?routeFamilyRequest(input):input;
 if(!command)return;
 if(command.type==='channel'){
   const c=CHANNELS.find(x=>x.id===command.id);showChannel(c);
   status('family-search-status','TV remote selected '+(c?.title||'this channel')+'.');return;
 }
 if(command.type==='radio'){void startRadio();status('family-search-status','Requested Infinity Radio.');return}
 if(command.type==='weather'){q('family-weather-heading').scrollIntoView({behavior:'smooth'});void loadWeather();return}
 const result=q('family-widget-result');result.replaceChildren();
 if(command.type==='deals'){
   for(const offer of sourceCardForIntent(command.term))result.append(offerCard(offer));
   remember('food');renderFeatured();
   status('family-search-status','Restaurant comparison card created. Exact deals and prices must be checked with each restaurant.');
 }else if(command.type==='search'){
   const term=command.query.slice(0,140);
   const card=node('article','family-search-card');
   card.append(node('h4','',term),node('p','','This widget links to real search results. It does not make up headlines, prices or availability.'));
   card.append(link('Google Search ↗','https://www.google.com/search?q='+encodeURIComponent(term),'family-action'));
   card.append(link('Google News ↗','https://news.google.com/search?q='+encodeURIComponent(term),'family-action'));
   result.append(card);
   if(/\b(?:the chicks|dixie chicks|country music)\b/i.test(term)){
     result.append(offerCard(OFFERS.find(x=>x.id==='chicks'),'Official artist website ↗'));
     result.append(offerCard(OFFERS.find(x=>x.id==='radio'),'Try Infinity Radio ↗'));
   }
   if(/\b(?:netflix|movie|television)\b/i.test(term)){
     result.append(offerCard(OFFERS.find(x=>x.id==='netflix'),'Netflix official charts ↗'));
   }
   status('family-search-status','Source-linked search widget created.');
 }
 result.scrollIntoView({behavior:'smooth',block:'nearest'});
}
q('family-search-form').addEventListener('submit',e=>{e.preventDefault();showWidget(q('family-search-input').value)});
window.addEventListener('bubbles:work-draft',e=>{
 const d=e.detail;
 if(d?.source!=='bubbles-embed'||d.bubbleId!=='gary-westerns-2026'||d.executed!==false||typeof d.request!=='string')return;
 q('family-search-input').value=d.request.slice(0,150);
 showWidget(d.request);
 status('family-search-status','Received explicitly shared Bubbles draft. Created a local source card/remote request; did not execute a Brain job or wallet action.');
});
q('family-voice').addEventListener('click',()=>{
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){status('family-search-status','This browser does not support speech recognition. Type your request instead.');return}
 const recognition=new Recognition();
 recognition.lang='en-US';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
 recognition.onresult=e=>{
   const spoken=e.results?.[0]?.[0]?.transcript;
   if(typeof spoken==='string'){q('family-search-input').value=spoken;status('family-search-status','Heard: '+spoken);showWidget(spoken)}
 };
 recognition.onerror=()=>status('family-search-status','Voice unavailable or permission denied. Use typed remote.');
 recognition.onend=()=>{q('family-voice').disabled=false};
 q('family-voice').disabled=true;
 status('family-search-status','Listening to one requested command…');
 try{recognition.start()}catch{q('family-voice').disabled=false;status('family-search-status','Could not start microphone. Type your request.')}
});
