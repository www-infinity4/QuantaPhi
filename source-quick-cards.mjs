import {mountSourceFeature} from './source-quick-card-features.mjs';
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
 source('starmaker','StarMaker','Karaoke','Find a song and sing karaoke','https://www.starmakerstudios.com/en','https://www.starmakerstudios.com/en','Help with song selection, harmonies and vocal practice; recording needs explicit microphone permission and a real licensed backing track.','Open official StarMaker karaoke. QuantaPhi must not copy paid backing tracks, lyrics or recordings without rights.',{secondUrl:'https://play.google.com/store/apps/details?id=com.starmakerinteractive.starmaker',secondLabel:'Open StarMaker on Android'}),

 source('google-maps','Google Maps','Navigation','Show my location in a map','https://www.google.com/maps/','https://www.google.com/maps/','Explain places, directions, and mapping options without storing or silently reading a device location.','Use an explicitly consented OpenStreetMap in-card preview and a Google Maps link for directions/traffic. No Google Maps API key is configured.'),
 source('spotify','Spotify','Music','Play Spotify or your device music','https://open.spotify.com/','https://open.spotify.com/','Help users find Spotify content and build a private, in-browser playlist from files they choose.','Load an official Spotify embed from a pasted public content link, or play local audio files in an iPod-style private playlist. No account cloning or synchronized Spotify library.'),
 source('capcut','CapCut / Quick Edit','Video','Turn images and videos into short captioned clips','https://www.capcut.com/','https://www.capcut.com/','Guide the user through a local browser video edit and optional external CapCut handoff, not an unauthorized CapCut session.','The independent Infinity Quick Edit tool accepts a user-chosen image or video, caption, clip start and duration, then exports locally as a silent video where supported. CapCut opens separately.'),
 source('amazon','Amazon Shopping','Shopping','Search Amazon products','https://www.amazon.com/','https://www.amazon.com/s','Search for products and compare provider-listed offers without inventing promotions or implying an Amazon advertising partnership.','Run an official Amazon product search. A trending product feed or advertisements require approved Amazon Creators/Affiliates access.',{searchParameter:'k'}),
 source('temu','Temu','Shopping','Explore Temu deals','https://www.temu.com/','https://www.temu.com/','Help compare disclosed pricing, coupons and shipping terms at the official Temu source; never fabricate popular ads.','Open Temu for its current offers. Provider-authorized ad feeds and affiliate links require a separate verified connection.'),
 source('walmart','Walmart','Shopping','Search Walmart products','https://www.walmart.com/','https://www.walmart.com/search','Compare products and confirm availability only on original sources, without making up stock or prices.','Submit an actual Walmart search on the original provider.',{searchParameter:'q'}),
 source('wikipedia','Wikipedia','Reference','Search encyclopedic articles','https://en.wikipedia.org/','https://en.wikipedia.org/w/index.php','Find and cross-check Wikipedia articles against primary references.','Search real Wikipedia pages; source links and edit history remain accessible on Wikipedia.',{searchParameter:'search'}),
 source('pinterest','Pinterest','Images','Explore ideas and visual inspiration','https://www.pinterest.com/','https://www.pinterest.com/','Help brainstorm image boards and credit original artists; do not scrape copyrighted pictures.','Browse the official Pinterest site. Signed-in boards and photo storage require Pinterest account authorization.')
]);
export const findSourceCard=id=>QUICK_CARD_SOURCES.find(p=>p.id===id)||null;
export const validSourceCard=card=>{
 if(!card||!/^[a-z0-9-]+$/.test(card.id||''))return false;
 for(const href of [card.official,card.featureUrl,...(card.secondUrl?[card.secondUrl]:[])]){let url;try{url=new URL(href)}catch{return false}if(url.protocol!=='https:'||url.username||url.password)return false;}
 return true;
};
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e};
function link(text,href,klass=''){const a=el('a',klass,text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a}
function feature(root,card){
 if(card.searchParameter){
  const form=el('form','iqc-search');form.method='GET';form.action=card.featureUrl;form.target='_blank';
  const label=el('label','', 'Search on '+card.name);const input=el('input');input.name=card.searchParameter;input.type='search';input.required=true;input.maxLength=300;input.placeholder='Enter your search';input.setAttribute('aria-label',label.textContent);
  const button=el('button','iqc-primary','Search '+card.name);button.type='submit';form.append(label,input,button);root.append(form);return;
 }
 const a=link('Open '+card.feature+' ↗',card.featureUrl,'iqc-primary');root.append(a);
}
function starterCard(card){
 const item=el('article','iqc-card');item.dataset.sourceId=card.id;
 item.append(el('p','iqc-kind',card.kind),el('h3','',card.name),el('p','',card.feature),el('p','iqc-muted',card.details));
 const actions=el('div','iqc-actions');
 const preview=el('a','iqc-primary','Open quick card in Infinity Viewer');preview.href='/source-quick-card.html?card='+encodeURIComponent(card.id);preview.classList.add('inPageSite');preview.dataset.siteUrl=preview.href;preview.dataset.siteTitle=card.name+' · Infinity quick card';
 actions.append(preview,link('Official site ↗',card.official));item.append(actions);return item;
}
function mountShelf(){
 const host=document.getElementById('siteQuickCards');if(!host)return;
 host.replaceChildren();
 host.append(el('p','iqc-kind','INFINITY 2026® · INDEPENDENT QUICK CARDS'),el('h2','','Websites turned into useful tools'),el('p','iqc-muted','Official sources, interactive search and a specialist Bubbles guide. Live social feeds, personal account access and publisher delivery require separately verified integrations.'));
 const cards=el('div','iqc-grid');for(const p of QUICK_CARD_SOURCES)cards.append(starterCard(p));host.append(cards);
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
 host.append(el('p','iqc-kind','INFINITY 2026® · INDEPENDENT SOURCE QUICK CARD'),el('h1','',card.name),el('h2','',card.feature),el('p','',card.details));
 const featureBox=el('section','iqc-feature');featureBox.append(el('h3','','Most-used feature'),el('p','iqc-muted','Actual original-source action, not a cloned site.'));if(!mountSourceFeature(featureBox,card))feature(featureBox,card);host.append(featureBox);
 const actions=el('div','iqc-actions');actions.append(link('Visit original '+card.name+' ↗',card.official));if(card.secondUrl)actions.append(link(card.secondLabel||'Another official service ↗',card.secondUrl));host.append(actions);
 const about=el('section','iqc-feature');about.append(el('h3','','Ask '+card.name+' Bubbles'),el('p','','An independent Bubbles specialist opens at the bottom right. Your existing account connection remains subject to its normal sign-in and consent checks.'),el('p','iqc-muted','No private messages, social feeds, recordings or contacts are read by this card. Location reaches OpenStreetMap only when you approve a map preview; Spotify embeds connect to Spotify only when loaded; submitted searches go to the selected provider. No background account sync or automatic message sending.'));host.append(about);
 installBubble(card);
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{mountShelf();mountDetail()},{once:true});
 else {mountShelf();mountDetail();}
}
