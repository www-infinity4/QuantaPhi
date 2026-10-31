// Repository-backed card definitions. Only these declared modules/routes may run in chat.
import {HOUSING_HELP_RESOURCES,housingResourceRoute} from './housing-help-catalog.mjs';
const local=(id,title,mount,scripts,styles=[],aliases=[],extraMounts=[])=>({id,title,mount,scripts,styles,aliases,extraMounts,repository:'www-infinity4/QuantaPhi',pageUrl:'/#'+mount,url:'/bubbles-card-host.html?card='+id});
const app=(id,title,path,repo,aliases=[],play='')=>({id,title,url:path,repository:'www-infinity4/'+repo,aliases,play,surface:id==='bubbles-workshop'?'body':id==='infinity-radio'?'.player':'main, [role="main"]'});
export const cards=Object.freeze([
 app('disability-housing','Home Access · Disability Housing','/disability-housing.html','QuantaPhi',['disability housing','disabled housing','housing on disability','ssi housing','ssdi housing','usda housing','home access','housing assistance']),
 ...HOUSING_HELP_RESOURCES.map(r=>app('housing-help-'+r.id,r.title+' · '+r.provider,housingResourceRoute(r.id),'QuantaPhi',[r.id,r.id==='sieda'?'seida':r.id,r.provider.toLowerCase()+' housing help',r.title.toLowerCase()])),
 app('bubbles-workshop','Bubbles Agent Workshop','/bubbles-agent-workshop/','Bubbles-Agent-Workshop',['agent workshop','build workshop']),
 app('infinity-radio','Infinity Radio','/infinity-radio/','Alien-Radio',['radio','alien radio'],'#play-btn'),
 local('story-writer','Story Writer','phiStoryWriter',['phi-visual-render.js','phi-story-writer.js'],['phi-story-writer.css'],['oracle story writer']),
 local('reads-realms','Reads & Realms','infiniteBook',['infinite-book-discovery.js','infinite-book.js'],['infinite-book.css'],['reads and realms','reads realms','big book']),
 app('infinity-affiliates','Infinity Affiliates · Approved Products','/infinity-affiliates.html','QuantaPhi',['affiliates','affiliate products','infinity approved affiliate','join affiliate program','affiliate request','brand associations']),
 app('reader-mystery','Tales of Mystery & Suspense','/?card=infinityReaderMystery','QuantaPhi',['mystery stories','tales of mystery']),
 app('reader-twilight','Twilight Zone · Original Fiction','/?card=infinityReaderTwilight','QuantaPhi',['twilight zone stories','speculative fiction']),
 app('reader-tech','Tech History','/?card=infinityReaderTech','QuantaPhi',['technology history','computing stories']),
 app('reader-fame','Touts of Fame','/?card=infinityReaderFame','QuantaPhi',['touts of fame','famous people stories']),
 app('reader-sports','Sports Almanac','/?card=infinityReaderSports','QuantaPhi',['sports history','sports stories']),
 app('reader-cosmic','Beyond the Signal','/?card=infinityReaderCosmic','QuantaPhi',['science fiction stories','space mysteries']),
 local('image-builder','Image Generator','phiImageBuilder',['phi-visual-render.js','phi-generation-references.js','phi-image-builder.js'],['phi-image-builder.css'],['image builder','image studio']),
 local('video-builder','Video Builder','phiVideoBuilder',['phi-video-builder.js'],[],['video studio']),
 local('fred-spaces','Fred Spaces','fredSpacesRadio',['fred-spaces-radio.js'],['fred-spaces-radio.css'],['fred radio','fred krueger','fred space','freds spaces','freds space']),
 local('magoo-spaces','Magoo Spaces','magooSpacesRadio',['magoo-spaces-radio.js'],['magoo-spaces-radio.css'],['magoo phd']),
 local('following-spaces','Following Spaces','followingSpacesRadio',['following-spaces-radio.js'],['following-spaces-radio.css'],['followed spaces']),
 // Player-first: Fred and the owner’s followed-person selector share the Media Star surface.
 local('media-star','Media Star','fredSpacesRadio',['fred-spaces-radio.js','following-spaces-radio.js'],['fred-spaces-radio.css','following-spaces-radio.css'],['media star player','media star radio','media star podcasts','media star card','media star fred spaces'],['followingSpacesRadio']),
 local('media-star-creator','Media Star Creator','mediaStarCreator',['media-star-creator.js'],['media-star-creator.css'],['media creator','build media star']),
 local('radio-clubhouse','Radio Clubhouse','radioClubhouse',['radio-clubhouse.js'],['radio-clubhouse.css']),
 local('concepts','Infinity Concepts','infinityConcepts',['infinity-concepts.js'],['infinity-concepts.css']),
 local('group-story','Group Story','groupStoryBuild',['group-story.js'],['group-story.css'],['group story build']),
 local('channels','Television Cards','phiChannelCards',['phi-tv-programs.js','phi-channel-cards.js'],['phi-channel-cards.css'],['channel cards','tv channels','infinity tv']),
 app('trending-now','Trending Google Search Cards','/trending-now.html','QuantaPhi',['trending','google trends','trending now','trending cards','trend cards']),
 app('trending-nba','Trending NBA Games','/?card=nba','QuantaPhi',['knicks celtics','bulls bucks','nba matchup','nba trends']),
 app('trending-mlb','World Series Tracker','/?card=mlb','QuantaPhi',['world series','rays brewers','mlb trends']),
 app('trending-media','Trending Media Explorer','/?card=media','QuantaPhi',['avengers doomsday','ethan klein','media trends']),
 app('pixie-stories','Pixie Stories','/pixie/','QuantaPhi',['pixie','pixie story','pixie storybook','pixie quick card']),
 app('cardone-capital','Cardone Real Estate Card','/cardone-capital.html','QuantaPhi',['cardone','grant cardone','cardone capital','10x westshore','westshore south','real estate card']),
 app('church-of-i-am','Church of I AM · Gary Cardone','/?card=iam','QuantaPhi',['church of i am','i am sunday','gary cardone','gary cardone sunday','gary cardone church','i am promo']),
 app('muse-ai','Muse AI Reviewer','/science-quick-card.html?card=muse-ai','QuantaPhi',['muse','meta muse','muse reviewer']),
 app("quanta-feed","QuantaPhi Public For You Following","/",'QuantaPhi',["public feed","for you page","following feed"]),
 app("just-radios","JustRadios restoration kits","/quanta-feed-card.html?card=just-radios",'QuantaPhi',["justradios","radio kits"]),
 app("radio-zenith-transoceanic","Zenith Trans Oceanic Radio","/quanta-feed-card.html?card=radio-zenith-transoceanic",'QuantaPhi',["zenith trans oceanic"]),
 app("radio-zenith-console","Zenith Art Deco Radio","/quanta-feed-card.html?card=radio-zenith-console",'QuantaPhi',["zenith 7s363"]),
 app("radio-philco-90","Philco Model 90 radio","/quanta-feed-card.html?card=radio-philco-90",'QuantaPhi',["philco 90"]),
 app("radio-rca-9x571","RCA Victor Tube Radio","/quanta-feed-card.html?card=radio-rca-9x571",'QuantaPhi',["rca tube radio"]),
 app("radio-atwater-kent-20","Atwater Kent Model 20","/quanta-feed-card.html?card=radio-atwater-kent-20",'QuantaPhi',["atwater kent 20"]),
 app("robinhood","Robinhood Research Card","/quanta-feed-card.html?card=robinhood",'QuantaPhi',["robinhood research"]),
 app("chime","Chime Bank Card","/quanta-feed-card.html?card=chime",'QuantaPhi',["chime bank"]),
 app("x-money","X Money · Signup & Infinity Money Lab","/x-money.html",'QuantaPhi',["x money","money card","infinity money","x money signup","x money quick card","website phone number"]),
 app("ebay","eBay Market Card","/quanta-feed-card.html?card=ebay",'QuantaPhi',["ebay marketplace"]),
 app("gold","Gold Market Charts","/quanta-feed-card.html?card=gold",'QuantaPhi',["gold spot price"]),
 app("silver","Silver Market Charts","/quanta-feed-card.html?card=silver",'QuantaPhi',["silver spot price"]),
 app("us-mint","United States Mint Coins","/quanta-feed-card.html?card=us-mint",'QuantaPhi',["us mint","mint releases"]),
 app("pcgs","PCGS CoinFacts Card","/quanta-feed-card.html?card=pcgs",'QuantaPhi',["pcgs coin facts","pcgs coin grader"]),
 app("ngc","NGC Coin Explorer Card","/quanta-feed-card.html?card=ngc",'QuantaPhi',["ngc coin explorer"]),
 app("x-live-spaces","X Spaces Live Explorer","/quanta-feed-card.html?card=x-live-spaces",'QuantaPhi',["live spaces","x spaces"]),
 app("wikipedia","Wikipedia Fresh Article","/quanta-feed-card.html?card=wikipedia",'QuantaPhi',["wikipedia random"]),
 app("vam-scarface","VAM Scarface Morgan","/quanta-feed-card.html?card=vam-scarface",'QuantaPhi',["vam scarface"]),
 app("vam-hotlips","VAM Hot Lips Morgan","/quanta-feed-card.html?card=vam-hotlips",'QuantaPhi',["vam hot lips"]),
 app("vam-spitting-eagle","VAM Spitting Eagle","/quanta-feed-card.html?card=vam-spitting-eagle",'QuantaPhi',["spitting eagle"]),
 app("vam-annual","VAMWorld studies","/quanta-feed-card.html?card=vam-annual",'QuantaPhi',["vamworld","vam variety"]),
 app("instructables","Instructables DIY Card","/quanta-feed-card.html?card=instructables",'QuantaPhi',["instructables","diy"]),
 app("vintage-toys","Vintage Toys Card","/quanta-feed-card.html?card=vintage-toys",'QuantaPhi',["vintage toys"]),
 app("antique-collectibles","Antiques Research Card","/quanta-feed-card.html?card=antique-collectibles",'QuantaPhi',["antiques"]),
 app('nasa-webb','NASA James Webb','/science-quick-card.html?card=webb','QuantaPhi',['james webb','webb telescope','jwst','nasa webb']),
 app('nasa-science','NASA Science','/science-quick-card.html?card=nasa-science','QuantaPhi',['science nasa','nasa research']),
 app('ars-science','Ars Science','/science-quick-card.html?card=ars-science','QuantaPhi',['science news','ars technica science']),
 app('ars-tech','Ars Technica News','/science-quick-card.html?card=ars-technology','QuantaPhi',['technology news','tech news','ars technica']),
 app('public-directory','Verified Contact Directory','/directory/','QuantaPhi',['phonebook','telephone book','directory','public phone','business contact','directory card']),
 app('website-directory','Website Directory','/directory/?kind=website','QuantaPhi',['website directory','website catalog']),
 app('fox-one-video','FOX One Original Advertisement','/source-quick-card.html?card=fox-one','QuantaPhi',['fox one','foxone','fox one ad','fox one advertisement']),
 app('fox-one-live-news','FOX One · Live News Video','/source-quick-card.html?card=fox-one-live-news','QuantaPhi',['fox one news','fox news live promo','fox one live news','fox live news ad']),
 app('starmaker-studio','StarMaker Song Studio','/studio/','QuantaPhi',['starmaker','karaoke','song directory','sing','record voice','music studio']),
 app('quick-card-wiring','Quick Card Wiring Study','/quick-card-wiring.html','QuantaPhi',['c13b0 quick card','wiring template','site schematic','website mirror study','quick card study']),
 app('integra-validator','Integra · Quick Card Validation','/integra-validation.html','QuantaPhi',['integra','validate quick card','source audit','card security check','integra ai']),
 app('quantaphi','QuantaPhi','/','QuantaPhi',['quantaphi home','quantaphi website','quantaphi page']),
 app('alien-coin','Alien Coin','/alien-coin/','Alien-Coin',['alien coin website']),
 app('resonance','Resonance Calculator','/resonance.html','QuantaPhi',['resonance engine']),
 app('bitcoin-crusher','Bitcoin Crusher','/bitcoin-crusher/','Bitcoin-Crusher',['crusher','bitcoin crusher jukebox'],'#musicPlay'),
 app('oracle-octaves','Oracle Octaves','/oracle-octaves/','Oracle-Octaves',['piano']),
 app('infinity-phi','Infinity Phi','/infinity-phi/','C13b0'),
 app('omni-phi','Omni Phi','/omni-phi/','Omni-Phi',['code phi']),
 app('news-phi','News Phi','/news-phi/','News-Phi'),
 app('shoplc','ShopLC','/shoplc/','ShopLC',['shop lc']),
 app('mckee-coins','McKee Coins','/mckee-coins/','Mckee-Coins-Inc'),
 app('omni-tv','Omni TV','/omni-tv/','Omni-TV'),
 app('storybook','My Storybook','/storybook/','QuantaPhi',['storybook']),
 app('builder-reserve','Builder Reserve','/builder-reserve/','Builder-Reserve')
].map(card=>Object.freeze(card)));
export function findCard(name){
 const q=String(name||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
 return cards.find(card=>[card.id,card.title,...card.aliases].some(alias=>alias.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim()===q));
}
// Registered card requests are UI commands, not an invitation to hallucinate tool access.
export function cardIntent(text){
 let q=String(text||'').trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
 q=q.replace(/^(?:(?:hey|hi|hello|okay|ok)[,\s]+)?(?:bubbles(?: ai)?)[,\s:]+/i,'')
    .replace(/^please[,\s]+/i,'').trim();
 if(/^(?:do not|don't|never|cancel|stop|not now)\b/i.test(q))return null;
 if(/^(?:list|show|open|bring up|pull up)(?: me)? (?:the |your )?(?:card catalog|all cards|available cards)$/i.test(q))return {action:'catalog'};
 if(/^(?:diagnose|inspect|check|test)(?: the| this| current| active| that)? card(?: functions| controls| status)?$/i.test(q))return {action:'diagnose'};
 if(/^(?:close|remove|dismiss)(?: the| this| current| active)? card$/i.test(q))return {action:'close'};
 if(/^(?:(?:push|press|tap|hit|start)\s+)?play(?:\s+(?:it|this|that|now|the\s+(?:song|radio|music|track|card)))?$/i.test(q))return {action:'play-active'};
 if(/^(?:give me|suggest|show me|make)(?:\s+some)?\s+(?:10|ten)\s+(?:research\s+)?words(?:\s+for\s+(?:bitcoin\s+crusher|this\s+card))?$/i.test(q))return {action:'suggest-words'};
 if(/^add\s+(?:these|those|the)\s+(?:10|ten)\s+(?:research\s+)?words$/i.test(q))return {action:'add-suggested-words'};
 const add=q.match(/^(?:add|use|collect)\s+(?:these\s+|the\s+|my\s+)?(?:research\s+)?(?:words|terms)\s*[:,-]\s*(.+)$/i);
 if(add)return {action:'add-words',words:add[1]};
 const edit=q.match(/^(?:edit|work on|inspect|preview|open in editor|bring (?:up|in) to edit)\s+(?:the\s+|my\s+)?(.+?)(?:\s+(?:page|site|website|card))?$/i);
 if(edit){
  const name=edit[1].replace(/\s+(?:page|site|website|card)$/i,'').trim();
  const card=findCard(name);
  if(card)return {action:'edit',card};
 }

 for(let n=0;n<3;n++){
  const previous=q;
  q=q.replace(/^(?:can|could|would|will) you(?: please)?\s+/i,'')
     .replace(/^(?:i(?: would|'d)? like|i want|i need|i wanna)\s+(?:you to\s+|to\s+)?/i,'')
     .replace(/^(?:give me|let me (?:see|have)|can i (?:see|have))\s+/i,'')
     .replace(/^please\s+/i,'');
  if(q===previous)break;
 }
 const command=q.match(/^(?:(play|hear|listen to|start playing)|(open|show|display|see|bring(?: in| up)?|pull(?: in| up)?|load|launch|put|insert|find))(?: me)?\s+/i);
 let play=false;
 if(command){play=Boolean(command[1]);q=q.slice(command[0].length);}
 // Owner voice instructions often include a purpose AFTER the location:
 // "bring Media Star into chat so I can listen to Fred's Space".
 // Extract the registered card name; do not send the instruction to an LLM.
 q=q.replace(/^(?:(?:the|a|my|your)\s+)+/i,'')
    .replace(/\s+(?:in|into|inside|on) (?:the |my )?(?:chat|conversation|screen|workspace)(?=$|[,:;]|\s+(?:so|that|because|then|to)\b)[\s\S]*$/i,'')
    .replace(/\s+(?:so (?:that )?|because |then |to )(?:(?:i|we)\s+)?(?:can |could |want to |would like to )?(?:listen|hear|play|watch|use|open|see)\b[\s\S]*$/i,'')
    .replace(/\s+please$/i,'')
    .replace(/\s+(?:card|player|widget)$/i,'')
    .trim();
 let card=findCard(q);
 // "Fred's space" identifies Fred's original player; the Media Star
 // request identifies the combined Fred player plus person picker.
 if(!card&&/^(?:fred['’]?s?\s+spaces?|fred krueger['’]?s?\s+spaces?)$/i.test(q))card=findCard('Fred Spaces');
 if(!card)return null;
 return {action:play?'play':'open',card};
}
