import {createCardArtwork,mountCardTools} from './quanta-card-experience.mjs';
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
 source('chatgpt','ChatGPT','AI','Open your real ChatGPT conversation','https://chatgpt.com/','https://chatgpt.com/','Help visitors decide which research or creative task to bring to ChatGPT. Do not impersonate ChatGPT or claim cross-service conversation access.','Open the authentic ChatGPT site. ChatGPT sessions do not get embedded or synchronized by this card.'), 
 source('x','X / Grok','Social','Trends, posts and Grok','https://x.com/','https://x.com/explore','Explore verified public X posts, native embeds and the separate Grok product only when allowed.','Open the X Explore interface. Post streams and Grok need supported provider authorization.',{secondUrl:'https://x.com/i/grok',secondLabel:'Open Grok'}),
 source('reddit','Reddit','Community','Popular communities and discussions','https://www.reddit.com/','https://www.reddit.com/r/popular/','Find relevant communities and explain posts only from explicitly permitted Reddit sources.','Open Reddit popular. Commercial reuse and embedding require provider permission; no unlicensed card feed.'), 
 source('tiktok','TikTok','Video','Discover popular short videos','https://www.tiktok.com/','https://www.tiktok.com/explore','Curate original creators with verified post URLs and approved TikTok Embed Player.','Open TikTok Explore. A real player reel needs actual authorized post IDs and player use; no fabricated trends.'), 
 source('whatsapp','WhatsApp','Messaging','Open your WhatsApp conversations','https://www.whatsapp.com/','https://web.whatsapp.com/','Help draft a message for the visitor. Never read contacts, send a message or reveal a conversation without per-action consent and an authorized integration.','Open the official WhatsApp Web client. Private messages cannot be embedded or accessed by QuantaPhi.',{secondUrl:'https://www.whatsapp.com/business/',secondLabel:'Business messaging information'}),
 source('bing','Bing','Search','Search the web','https://www.bing.com/','https://www.bing.com/search','Assist with query formulation, source checking and comparison, not fabricated Bing results.','Submit a real Bing query with a dedicated search bar.',{searchParameter:'q'}),
 source('yahoo-news','Yahoo News','News','Latest Yahoo News','https://news.yahoo.com/','https://news.yahoo.com/','Compare dated, attributed original Yahoo News stories from an authorized feed only.','Visit Yahoo News for current headlines. An in-card list needs an authorized, fresh attributed data source.'), 
 source('cnn','CNN','News','Latest CNN headlines and video','https://www.cnn.com/','https://www.cnn.com/','Summarize verified, dated CNN links neutrally; distinguish reporting from opinion and do not impersonate CNN.','CNN latest articles open at CNN. Legacy CNN RSS is not a dependable live feed; verify fresh sources.'), 
 source('fox-news','Fox News','News','Fox News headlines and viewer submissions','https://www.foxnews.com/','https://www.foxnews.com/','Help users research Fox reports and draft a news tip with source evidence. Submission requires a real Fox-approved destination and the visitor’s explicit approval.','View Fox News. Video submissions are draft-only until an authenticated, publisher-approved handoff is built.',{secondUrl:'https://www.foxnews.com/contact',secondLabel:'Contact Fox News'}),
 source('tv-guide','TV Guide','TV','Find tonight’s shows and TV recommendations','https://www.tvguide.com/','https://www.tvguide.com/','Find programs, schedules and credited trailers using a licensed/verified TV listing source and the user’s choice of region.','Open TV Guide to choose shows. The live local schedule needs a licensed guide feed and explicit region selection.'), 
 source('starmaker','StarMaker','Karaoke','Find a song and sing karaoke','https://www.starmakerstudios.com/en/songs','https://www.starmakerstudios.com/en/songs','Help with song selection, harmonies and vocal practice; recording needs explicit microphone permission and a real licensed backing track.','Open official StarMaker karaoke. QuantaPhi must not copy paid backing tracks, lyrics or recordings without rights.',{secondUrl:'https://play.google.com/store/apps/details?id=com.starmakerinteractive.starmaker',secondLabel:'Open StarMaker on Android'})
]);
export const findSourceCard=id=>QUICK_CARD_SOURCES.find(p=>p.id===id)||null;
export const validSourceCard=card=>{
 if(!card||!/^[a-z0-9-]+$/.test(card.id||''))return false;
 for(const href of [card.official,card.featureUrl,...(card.secondUrl?[card.secondUrl]:[])]){let url;try{url=new URL(href)}catch{return false}if(url.protocol!=='https:'||url.username||url.password)return false;}
 return true;
};
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
function link(text,href,klass=''){const a=el('a',klass,text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a}
function starterCard(card){
 // The homepage article IS the interactive card. Do not redirect it to an
 // internal viewer; Android WebView's pop-up handling must not be required.
 const item=el('article','iqc-card');item.dataset.sourceId=card.id;
 item.append(createCardArtwork(card,true),el('p','iqc-kind',card.kind),el('h3','',card.name));
 const tools=el('div','iqc-inline-tools');mountCardTools(tools,card);item.append(tools);
 // Search cards are already complete with their own actual search fields.
 if(!['google','bing'].includes(card.id)){
  const actions=el('div','iqc-actions');
  actions.append(link('Official '+card.name+' website',card.official));item.append(actions);
 }
 return item;
}
function mountShelf(){
 const host=document.getElementById('siteQuickCards');if(!host)return;
 host.replaceChildren();
 host.append(el('p','iqc-kind','INFINITY 2026® · INTERACTIVE SOURCE TOOLS'),el('h2','','Discover, watch, search, research and create'),el('p','iqc-muted','Use the feature on each card. Provider-owned accounts and copyrighted catalogs remain with their original services.'));
 const cards=el('div','iqc-grid');for(const p of QUICK_CARD_SOURCES)cards.append(starterCard(p));host.append(cards);
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
 const actions=el('div','iqc-actions');if(card.id==='starmaker'){const studio=link('Search songs + record your voice in QuantaPhi ↗','/studio/','iqc-primary');studio.target='_self';actions.append(studio)}actions.append(link('Visit original '+card.name+' ↗',card.official));if(card.secondUrl)actions.append(link(card.secondLabel||'Another official service ↗',card.secondUrl));host.append(actions);
 const about=el('section','iqc-feature');about.append(el('h3','','Ask '+card.name+' Bubbles'),el('p','','An independent Bubbles specialist opens at the bottom right. Your existing account connection remains subject to its normal sign-in and consent checks.'),el('p','iqc-muted','No messages, social account feeds, location, recordings or contact information are transferred to the third-party provider by this preview. Any future submission must show its destination, file and consent before sending.'));host.append(about);
 installBubble(card);
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mountShelf();mountDetail()},{once:true});
 else {mountShelf();mountDetail();}
}
