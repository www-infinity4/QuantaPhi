import {createCardArtwork,mountCardTools} from './quanta-card-experience.mjs?v=20261102-cardimages1';
import {mountOfficialViewer} from './quanta-official-viewer.mjs';
import {lookupQuickCard} from './quick-card-search-core.mjs?v=20261028-search1';
/* Infinity source quick cards — official links and one consented Bubbles specialist.
 * Public preview, not publisher endorsement, trending API, logged-in session,
 * content scraping, or an automated sender. Provider adapters enrich these in
 * a separate review once real licensing and source receipts exist.
 */
const source=(id,name,kind,feature,official,featureUrl,focus,details,extra={})=>Object.freeze({
 id,name,kind,feature,official,featureUrl,focus,details,...extra
});
export const QUICK_CARD_SOURCES=Object.freeze([
 source('google','Google','Search','Search the web','https://www.google.com/','https://www.google.com/search','Search intent, cited original results and comparisons. No invented rankings.','Submit a real Google query with a dedicated search bar.',{searchParameter:'q'}),
 source('youtube','YouTube','Video','Trending and popular videos','https://www.youtube.com/','https://www.youtube.com/feed/trending','Find verified channel uploads, popular videos and authorized YouTube player embeds.','Discover videos on the official YouTube trending destination. An actual in-card reel needs YouTube API video IDs and permitted embeds.'), 
 source('facebook','Facebook','Social','Local groups and events','https://www.facebook.com/','https://www.facebook.com/events/','Help signed-in users navigate groups, events and voluntary local interests without assuming their location.','Facebook local items require Facebook sign-in and explicit location consent. This independent card cannot read private feeds.'), 
 source('instagram','Instagram','Social','Explore photos and reels','https://www.instagram.com/','https://www.instagram.com/explore/','Explain image attribution and discover explicitly authorized media via supported Instagram APIs or embeds.','Explore photos and reels at Instagram. Real images require authorized media/official embeds, not scraped CDN images.'), 
 source('chatgpt','ChatGPT','AI','Open the real ChatGPT website and sign in','https://chatgpt.com/','https://chatgpt.com/','Open the original ChatGPT app and authenticate on chatgpt.com, without copying credentials or impersonating its sessions.','One-tap official sign-in and an optional real website frame. Framing depends on the provider and browser; your private conversation is not synchronized to QuantaPhi.'),
 source('gemini','Google Gemini','AI · Planning','Ask Gemini first through Bubbles','https://gemini.google.com/','https://gemini.google.com/','Gemini offers the first research/engineering plan. Independently check model advice before acting.','Use the real Gemini API only with verified Bubbles owner access, or continue in the official Gemini app.'),
 source('claude','Anthropic Claude','AI · Review','Review the Gemini plan with Claude','https://claude.ai/','https://claude.ai/','Claude independently reviews proposed changes, tests and possible hazards; no generated text is execution authorization.','The card can ask Bubbles for an authenticated Anthropic API response, if configured; otherwise use the official Claude interface.'),
 source('copilot','GitHub Copilot','AI · Coding','Review work with GitHub Copilot','https://github.com/copilot','https://github.com/copilot/agents','GitHub Copilot cloud agent can work on appropriately enabled repositories through approved GitHub issues and PRs.','Open the official GitHub Copilot interface. This card does not inherit private repository permissions or claim a direct Copilot chat API.'), 
 source('x','X / Grok','Social','Trends, posts and Grok','https://x.com/','https://x.com/explore','Explore verified public X posts, native embeds and the separate Grok product only when allowed.','Open the X Explore interface. Post streams and Grok need supported provider authorization.',{secondUrl:'https://x.com/i/grok',secondLabel:'Open Grok'}),
 source('reddit','Reddit','Community','Popular communities and discussions','https://www.reddit.com/','https://www.reddit.com/r/popular/','Find relevant communities and explain posts only from explicitly permitted Reddit sources.','Open Reddit popular. Commercial reuse and embedding require provider permission; no unlicensed card feed.'), 
 source('tiktok','TikTok','Video','Discover popular short videos','https://www.tiktok.com/','https://www.tiktok.com/explore','Curate original creators with verified post URLs and approved TikTok Embed Player.','Open TikTok Explore. A real player reel needs actual authorized post IDs and player use; no fabricated trends.'), 
 source('whatsapp','WhatsApp','Messaging','Open your WhatsApp conversations','https://www.whatsapp.com/','https://web.whatsapp.com/','Help draft a message for the visitor. Never read contacts, send a message or reveal a conversation without per-action consent and an authorized integration.','Open the official WhatsApp Web client. Private messages cannot be embedded or accessed by QuantaPhi.',{secondUrl:'https://www.whatsapp.com/business/',secondLabel:'Business messaging information'}),
 source('bing','Bing','Search','Search the web','https://www.bing.com/','https://www.bing.com/search','Assist with query formulation, source checking and comparison, not fabricated Bing results.','Submit a real Bing query with a dedicated search bar.',{searchParameter:'q'}),
 source('yahoo-news','Yahoo News','News','Latest Yahoo News','https://news.yahoo.com/','https://news.yahoo.com/','Compare dated, attributed original Yahoo News stories from an authorized feed only.','Visit Yahoo News for current headlines. An in-card list needs an authorized, fresh attributed data source.'), 
 source('cnn','CNN','News','Latest CNN headlines and video','https://www.cnn.com/','https://www.cnn.com/','Summarize verified, dated CNN links neutrally; distinguish reporting from opinion and do not impersonate CNN.','CNN latest articles open at CNN. Legacy CNN RSS is not a dependable live feed; verify fresh sources.'), 
 source('fox-one','FOX One','TV · Streaming','Watch the exact FOX One video advertisement','https://www.fox.com/','https://x.com/foxone/status/2113352129427730641','Help visitors discover FOX One sports, news and entertainment. Cite original content and do not invent X playback rights.','Official embedded FOX One X post plus real search and collection actions. Playback and mute/autoplay are controlled by X and the browser.'),
 source('fox-one-live-news','FOX One · Live News','News · Video','FOX One video spot · Watch FOX News live','https://www.fox.com/stream/fox-news','https://x.com/foxone/status/2070282166190408122','Present the original FOX One video spot and help viewers find FOX News streaming through FOX One. Do not imply affiliation, free live access, video rights, or guaranteed autoplay.','Official FOX One post embed. Full FOX News live viewing requires an eligible FOX One subscription or TV provider sign-in. The video embed depends on X and browser support.',{secondUrl:'https://www.fox.com/',secondLabel:'Explore all FOX One channels'}),
 source('fox-news','Fox News','News','Fox News headlines and viewer submissions','https://www.foxnews.com/','https://www.foxnews.com/','Help users research Fox reports and draft a news tip with source evidence. Submission requires a real Fox-approved destination and the visitor’s explicit approval.','View Fox News. Video submissions are draft-only until an authenticated, publisher-approved handoff is built.',{secondUrl:'https://www.foxnews.com/contact',secondLabel:'Contact Fox News'}),
 source('tv-guide','TV Guide','TV','Find tonight’s shows and TV recommendations','https://www.tvguide.com/','https://www.tvguide.com/','Find programs, schedules and credited trailers using a licensed/verified TV listing source and the user’s choice of region.','Open TV Guide to choose shows. The live local schedule needs a licensed guide feed and explicit region selection.'), 
 source('starmaker','StarMaker','Karaoke','Find a song and sing karaoke','https://www.starmakerstudios.com/en/songs','https://www.starmakerstudios.com/en/songs','Help with song selection, harmonies and vocal practice; recording needs explicit microphone permission and a real licensed backing track.','Open official StarMaker karaoke. QuantaPhi must not copy paid backing tracks, lyrics or recordings without rights.',{secondUrl:'https://play.google.com/store/apps/details?id=com.starmakerinteractive.starmaker',secondLabel:'Open StarMaker on Android'})
]);
// Only expose source cards that contain a usable real action (search, player,
// message draft, local recording, or approved provider embed). These are
// independent tools, not claims of publisher data access or affiliation.
export const PUBLIC_SOURCE_IDS=Object.freeze([
 'google','bing','youtube','reddit','x','tiktok','starmaker','fox-one','fox-one-live-news',
 'cnn','fox-news','yahoo-news','tv-guide','facebook','instagram','whatsapp',
 'chatgpt','gemini','claude','copilot'
]);
export const isPublicSourceCard=card=>Boolean(card&&PUBLIC_SOURCE_IDS.includes(card.id));
export const findSourceCard=id=>{
 const original=QUICK_CARD_SOURCES.find(p=>p.id===id);if(original)return original;
 const card=lookupQuickCard(id);if(!card)return null;
 return {...card,featureUrl:card.official,focus:'Help visitors use the original '+card.name+' website. Do not invent account access, offers or provider actions.',details:card.description};
};
export const validSourceCard=card=>{
 if(!card||!/^[a-z0-9-]+$/.test(card.id||''))return false;
 for(const href of [card.official,card.featureUrl,...(card.secondUrl?[card.secondUrl]:[])]){let url;try{url=new URL(href)}catch{return false}if(url.protocol!=='https:'||url.username||url.password)return false;}
 return true;
};
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
function link(text,href,klass=''){const a=el('a',klass,text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a}
export const aiCardMode=id=>id==='gemini'?'gemini_first':id==='claude'?'gemini_claude_review':null;

const GEMINI_CARD_API='https://infinity-rogers.marvaseater.workers.dev/v1/ai/card/gemini';
function mountGeminiTools(root){
 root.classList.add('iqc-gemini');
 // The existing Quick Card article owns every control. No new viewer, feed
 // ordering, modal, or Bubbles chat impersonation is introduced.
 const status=el('p','iqc-ai-receipt','Checking Google account connection…');
 status.setAttribute('role','status');
 const oauth=el('button','iqc-gemini-connect','Sign in with Google');
 oauth.type='button';oauth.disabled=true;
 const select=el('select','iqc-gemini-account');
 select.setAttribute('aria-label','Google account for Gemini');
 select.hidden=true;
 const transcript=el('div','iqc-gemini-transcript');
 transcript.setAttribute('role','log');transcript.setAttribute('aria-label','Gemini responses in this quick card');
 const form=el('form','iqc-ai-form'),input=el('textarea','iqc-ai-input');
 input.rows=3;input.maxLength=1800;
 input.placeholder='Message Gemini here…';
 input.setAttribute('aria-label','Message Gemini');
 const send=el('button','iqc-ai-send','Send to Gemini');send.type='submit';send.disabled=true;
 form.append(input,send);root.append(oauth,select,form,status,transcript);
 let module=null,client=null,history=[],inFlight=false;
 function showLine(sender,value){
  const line=el('p','iqc-gemini-line');
  const who=el('strong','',sender+': ');
  const message=el('span','',String(value).slice(0,6000));
  line.append(who,message);transcript.append(line);
  // Keep an accessible bounded conversation in this one card.
  while(transcript.childNodes.length>16)transcript.firstChild.remove();
 }
 async function loadGoogleAccounts(){
  try{
   module=await import('/bubbles-connections.mjs?v=20261106-google-multi-cloudflare-full8');
   client=new module.AccountConnections({token:()=>module.resolveConnectorWalletToken(window)});
   const result=await client.call('/accounts');
   const connected=(result.accounts||[]).filter(a=>a.provider==='google'&&a.status==='connected'&&
     Number.isFinite(a.expiresAt)&&a.expiresAt>Date.now()+30000);
   select.replaceChildren();
   for(const account of connected){
    const option=el('option','',account.label||'Google account');
    option.value=account.id;select.append(option);
   }
   select.hidden=connected.length===0;
   oauth.textContent=connected.length?'Connect another Google account':'Sign in with Google';
   oauth.disabled=false;send.disabled=connected.length===0;
   status.textContent=connected.length
     ?'Google verified for '+connected.length+' account(s). Messages go to the Gemini API only when you tap Send.'
     :'No Google account connected to this Bubbles wallet. Sign in here to use the Gemini card.';
  }catch(error){
   oauth.disabled=false;send.disabled=true;
   status.textContent=error?.message==='verified_wallet_required'
     ?'A verified Bubbles wallet session is required. Sign in to Bubbles first, then connect Google.'
     :'Google connection could not be verified. No Gemini request was sent.';
  }
 }
 oauth.addEventListener('click',async()=>{
  if(inFlight)return;
  oauth.disabled=true;status.textContent='Opening Google’s official authorization page…';
  try{
   if(!module||!client)await loadGoogleAccounts();
   // Only a navigation target is saved, never account tokens or OAuth codes.
   sessionStorage.setItem('bubbles:gemini-card-return:v1','1');
   await client.connect('google',['identity.read'],async(error)=>{
    if(error){sessionStorage.removeItem('bubbles:gemini-card-return:v1');status.textContent=error.message;await loadGoogleAccounts();}
    else await loadGoogleAccounts();
   });
  }catch(error){
   try{sessionStorage.removeItem('bubbles:gemini-card-return:v1')}catch{}
   status.textContent='Google sign-in could not start: '+String(error.message||'connection unavailable').slice(0,140);
  }finally{oauth.disabled=false;}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(inFlight||!client||!select.value)return;
  const question=input.value.trim();
  if(question.length<3)return;
  inFlight=true;send.disabled=true;status.textContent='Contacting the real Gemini model…';
  const chosen=select.value;
  const oldHistory=history.slice(-8);
  try{
   const token=await module.resolveConnectorWalletToken(window);
   const res=await fetch(GEMINI_CARD_API,{
    method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({accountId:chosen,question,history:oldHistory})
   });
   const data=await res.json().catch(()=>({ok:false,error:'invalid_gemini_response'}));
   if(!res.ok||data.ok!==true||data.provider!=='Gemini'||typeof data.answer!=='string')
    throw Error(String(data.error||'Gemini did not return a verified response.'));
   showLine('You',question);showLine('Gemini',data.answer);
   history=[...oldHistory,{role:'user',text:question},{role:'model',text:data.answer.slice(0,1800)}].slice(-8);
   input.value='';
   status.textContent='Gemini response received · '+String(data.model||'model')+
     (Number.isFinite(data.remaining)?' · '+data.remaining+' messages left today':'');
  }catch(error){
   const code=String(error.message||'').slice(0,100);
   status.textContent=code==='gemini_not_configured'
     ?'Gemini API key is not configured on the model Worker. No response was generated.'
     :code==='google_connection_required'?'Google authorization expired. Reconnect this account.'
     :code==='gemini_daily_limit'?'This Google account reached today’s Gemini card limit.'
     :'Gemini request failed: '+code+'. No model success is claimed.';
  }finally{inFlight=false;send.disabled=!select.value;}
 });
 select.addEventListener('change',()=>{history=[];transcript.replaceChildren();status.textContent='Google account selected. Your previous card conversation was cleared from this view.'});
 void loadGoogleAccounts();
}
function askAiTools(root,card){
 if(!['gemini','claude','copilot'].includes(card.id))return;
 const area=el('div','iqc-ask-ai');
 if(card.id==='gemini'){mountGeminiTools(area);root.append(area);return;}
 if(card.id==='copilot'){
  area.append(el('p','iqc-muted','Copilot runs through GitHub’s own agent interface, with repository permission and a reviewable PR. No silent issue assignment.'));
  root.append(area);return;
 }
 const form=el('form','iqc-ai-form');
 const input=el('textarea','iqc-ai-input');
 input.maxLength=1800;input.rows=2;
 input.placeholder=card.id==='gemini'?'Ask Gemini to plan a fix…':'Ask Gemini first, then Claude to review…';
 input.setAttribute('aria-label','Question for '+card.name);
 const button=el('button','iqc-ai-send',card.id==='gemini'?'Ask Gemini via Bubbles':'Gemini → Claude review');
 button.type='submit';
 const result=el('p','iqc-ai-receipt','');
 result.setAttribute('role','status');
 form.append(input,button);area.append(form,result);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const question=input.value.trim().slice(0,1800);if(question.length<3)return;
  button.disabled=true;result.textContent='Asking Bubbles through your verified session…';
  // This is a local, explicit user gesture. No password/session is copied.
  const detail={question,mode:aiCardMode(card.id),respond:value=>{
   button.disabled=false;result.textContent=String(value||'No verified provider response.').slice(0,3000);
  }};
  const handled=window.dispatchEvent(new CustomEvent('bubbles:ai-consult',{detail,cancelable:true}));
  if(handled){
   button.disabled=false;
   result.textContent='Open your Bubbles chat to use the verified AI connection, or continue in the official '+card.name+' site.';
  }
 });
 root.append(area);
}
function starterCard(card){
 // The homepage article IS the interactive card. Do not redirect it to an
 // internal viewer; Android WebView's pop-up handling must not be required.
 const item=el('article','iqc-card');item.dataset.sourceId=card.id;item.dataset.sourceName=card.name;item.dataset.sourceReady='true';item.dataset.official=card.official;item.dataset.sourceCategory=card.kind;item.dataset.sourceQuery=card.feature;
 item.append(createCardArtwork(card,true));
 if(card.id!=='google'&&card.id!=='bing')item.append(el('p','iqc-kind',card.kind));
 const tools=el('div','iqc-inline-tools');mountCardTools(tools,card);item.append(tools);
 if(card.id==='chatgpt')mountOfficialViewer(item,card.id);
 askAiTools(item,card);
 // Search cards are already complete with their own actual search fields.
 if(!['google','bing'].includes(card.id)){
  const actions=el('div','iqc-actions');
  actions.append(link('Official '+card.name+' website',card.official));if(card.id==='starmaker'){const demo=link('Try & embed the mini card','/starmaker-embed.html','iqc-primary');demo.target='_self';actions.append(demo)}item.append(actions);
 }
 return item;
}
function mountShelf(){
 const host=document.getElementById('siteQuickCards');if(!host)return;
 host.replaceChildren();
 host.append(el('p','iqc-kind','INFINITY 2026® · INTERACTIVE SOURCE TOOLS'),el('h2','','Discover, watch, search, research and create'),el('p','iqc-muted','Use the feature on each card. Provider-owned accounts and copyrighted catalogs remain with their original services.'));
 const cards=el('div','iqc-grid');for(const p of QUICK_CARD_SOURCES.filter(isPublicSourceCard))cards.append(starterCard(p));host.append(cards);
 // The Oracle viewer discovers each original source article as an individual
 // swipeable card, never a single 15-item link shelf.
 window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
function installBubble(card){
 // Same existing Bubbles launcher as Cardone, not a second chatbot.
 // The embed reads these source-specific instructions at construction.
 const script=document.createElement('script');
 script.src='/bubbles-embed.js';
 script.dataset.bubbleId='source-'+card.id;
 script.dataset.bubbleRole='specialist';
 script.dataset.bubbleName=card.name+' Bubbles';
 script.dataset.bubbleInstructions=('Act as an independent '+card.name+' quick-card specialist. '+card.focus+
 ' Link back to '+card.official+'. Keep sources and user approvals explicit. Never claim '+card.name+
 ' employment, official endorsement, personal login access, or sending media/messages.').slice(0,800);
 document.body.append(script);
}
function mountDetail(){
 const host=document.getElementById('sourceQuickCardDetail');if(!host)return;
 const card=findSourceCard(new URLSearchParams(location.search).get('card'));if(!card){host.append(el('p','','Unknown quick card. Return to the QuantaPhi source card shelf.'));return}
 document.title=card.name+' · Infinity Quick Card';
 host.append(el('p','iqc-kind','INFINITY 2026® · SOURCE EXPERIENCE'),createCardArtwork(card),el('h1','',card.name),el('h2','',card.feature));
 const tools=el('div','iqc-tools');mountCardTools(tools,card);host.append(tools);
 if(card.id==='chatgpt')mountOfficialViewer(host,card.id);
 askAiTools(host,card);
 const actions=el('div','iqc-actions');if(card.id==='starmaker'){const studio=link('Search songs + record your voice in QuantaPhi ↗','/studio/','iqc-primary');studio.target='_self';actions.append(studio);const mini=link('Try portable interactive card ↗','/starmaker-embed.html','iqc-primary');mini.target='_self';actions.append(mini)}actions.append(link('Visit original '+card.name+' ↗',card.official));if(card.secondUrl)actions.append(link(card.secondLabel||'Another official service ↗',card.secondUrl));host.append(actions);
 const about=el('section','iqc-feature');about.append(el('h3','','Ask '+card.name+' Bubbles'),el('p','','An independent Bubbles specialist opens at the bottom right. Your existing account connection remains subject to its normal sign-in and consent checks.'),el('p','iqc-muted','No messages, social account feeds, location, recordings or contact information are transferred to the third-party provider by this preview. Any future submission must show its destination, file and consent before sending.'));host.append(about);
 installBubble(card);
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mountShelf();mountDetail()},{once:true});
 else {mountShelf();mountDetail();}
}
