// Repository-backed card definitions. Only these declared modules/routes may run in chat.
const local=(id,title,mount,scripts,styles=[],aliases=[],extraMounts=[])=>({id,title,mount,scripts,styles,aliases,extraMounts,repository:'www-infinity4/QuantaPhi',url:'/bubbles-card-host.html?card='+id});
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
 // Player-first: Fred and the owner’s followed-person selector share the Media Star surface.
 local('media-star','Media Star','fredSpacesRadio',['fred-spaces-radio.js','following-spaces-radio.js'],['fred-spaces-radio.css','following-spaces-radio.css'],['media star player','media star radio','media star podcasts','media star card'],['followingSpacesRadio']),
 local('media-star-creator','Media Star Creator','mediaStarCreator',['media-star-creator.js'],['media-star-creator.css'],['media creator','build media star']),
 local('radio-clubhouse','Radio Clubhouse','radioClubhouse',['radio-clubhouse.js'],['radio-clubhouse.css']),
 local('concepts','Infinity Concepts','infinityConcepts',['infinity-concepts.js'],['infinity-concepts.css']),
 local('group-story','Group Story','groupStoryBuild',['group-story.js'],['group-story.css'],['group story build']),
 local('channels','Television Cards','phiChannelCards',['phi-channel-cards.js'],['phi-channel-cards.css'],['channel cards']),
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
 q=q.replace(/^(?:(?:the|a|my|your)\s+)+/i,'')
    .replace(/\s+(?:in|into|inside|on) (?:the |my )?(?:chat|conversation|screen|workspace)$/i,'')
    .replace(/\s+please$/i,'')
    .replace(/\s+(?:card|player|widget)$/i,'')
    .trim();
 const card=findCard(q);
 if(!card)return null;
 return {action:play?'play':'open',card};
}
