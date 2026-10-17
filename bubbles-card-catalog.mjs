// Repository-backed card definitions. Only these declared modules/routes may run in chat.
const local=(id,title,mount,scripts,styles=[],aliases=[])=>({id,title,mount,scripts,styles,aliases,repository:'www-infinity4/QuantaPhi',url:'/bubbles-card-host.html?card='+id});
const app=(id,title,path,repo,aliases=[],play='')=>({id,title,url:path,repository:'www-infinity4/'+repo,aliases,play});
export const cards=Object.freeze([
 app('infinity-radio','Infinity Radio','/infinity-radio/','Alien-Radio',['radio','alien radio'],'#play-btn'),
 local('story-writer','Story Writer','phiStoryWriter',['phi-visual-render.js','phi-story-writer.js'],['phi-story-writer.css'],['oracle story writer']),
 local('reads-realms','Reads & Realms','infiniteBook',['infinite-book-discovery.js','infinite-book.js'],['infinite-book.css'],['reads and realms','reads realms','big book']),
 local('image-builder','Image Generator','phiImageBuilder',['phi-visual-render.js','phi-generation-references.js','phi-image-builder.js'],['phi-image-builder.css'],['image builder','image studio']),
 local('video-builder','Video Builder','phiVideoBuilder',['phi-video-builder.js'],[],['video studio']),
 local('fred-spaces','Fred Spaces','fredSpacesRadio',['fred-spaces-radio.js'],['fred-spaces-radio.css'],['fred radio','fred krueger']),
 local('magoo-spaces','Magoo Spaces','magooSpacesRadio',['magoo-spaces-radio.js'],['magoo-spaces-radio.css'],['magoo phd']),
 local('following-spaces','Following Spaces','followingSpacesRadio',['following-spaces-radio.js'],['following-spaces-radio.css'],['followed spaces']),
 local('media-star','Media Star','mediaStarCreator',['media-star-creator.js'],['media-star-creator.css'],['media star creator']),
 local('radio-clubhouse','Radio Clubhouse','radioClubhouse',['radio-clubhouse.js'],['radio-clubhouse.css']),
 local('concepts','Infinity Concepts','infinityConcepts',['infinity-concepts.js'],['infinity-concepts.css']),
 local('group-story','Group Story','groupStoryBuild',['group-story.js'],['group-story.css'],['group story build']),
 local('channels','Television Cards','phiChannelCards',['phi-channel-cards.js'],['phi-channel-cards.css'],['channel cards']),
 app('resonance','Resonance Calculator','/resonance.html','QuantaPhi',['resonance engine']),
 app('bitcoin-crusher','Bitcoin Crusher','/bitcoin-crusher/','Bitcoin-Crusher'),
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
export function cardIntent(text){
 const q=String(text||'').trim().replace(/^(?:(?:hey|please|bubbles)[, ]+)+/i,'').replace(/^(?:can|could|would|will) you\s+/i,'').replace(/^(?:i want|i would like|i'd like)\s+(?:to\s+)?/i,'').replace(/[.!?]+$/,'');
 if(/^(?:do not|don't|never|cancel)\b/i.test(q))return null;
 if(/^(?:list|show|open)(?: me)? (?:the |your )?(?:card catalog|all cards|available cards)$/i.test(q))return {action:'catalog'};
 if(/^(?:diagnose|inspect|check|test)(?: the| this| current| active| that)? card(?: functions| controls| status)?$/i.test(q))return {action:'diagnose'};
 if(/^(?:close|remove|dismiss)(?: the| this| current| active)? card$/i.test(q))return {action:'close'};
 const match=q.match(/^(open|show|bring in|bring up|pull in|load|play|hear|listen to)(?: me)?\s+(?:the\s+)?(.+?)(?:\s+card)?(?:\s+(?:in|into)(?: the)? chat)?$/i);
 if(!match)return null;
 const card=findCard(match[2]);if(!card)return null;
 return {action:/^(?:play|hear|listen to)$/i.test(match[1])?'play':'open',card};
}
