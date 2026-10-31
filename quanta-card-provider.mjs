/* Universal Quick Card provider descriptors.
 * Descriptors are navigation/UX metadata, NOT OAuth tokens, API grants or APKs.
 * Never infer a provider from a creator-controlled display name.
 */
const PROVIDERS=Object.freeze([
 {id:'ebay',name:'eBay',hosts:['ebay.com'],signin:'https://signin.ebay.com/',search:'https://www.ebay.com/sch/i.html?_nkw=',actions:['search','shop','orders'],purchase:'provider-checkout'},
 {id:'heritage',name:'Heritage Auctions',hosts:['ha.com'],signin:'https://www.ha.com/c/login.zx',actions:['search','auction-listings','source-site-bidding'],purchase:'provider-checkout'},
 {id:'x',name:'X',hosts:['x.com','twitter.com'],signin:'https://x.com/i/flow/login',search:'https://x.com/search?q=',actions:['search','post','follow'],compose:'https://x.com/compose/post'},
 {id:'facebook',name:'Facebook',hosts:['facebook.com'],signin:'https://www.facebook.com/login/',search:'https://www.facebook.com/search/top?q=',actions:['search','post','follow']},
 {id:'instagram',name:'Instagram',hosts:['instagram.com'],signin:'https://www.instagram.com/accounts/login/',actions:['explore','publish','follow']},
 {id:'tiktok',name:'TikTok',hosts:['tiktok.com'],signin:'https://www.tiktok.com/login',search:'https://www.tiktok.com/search?q=',actions:['search','publish','follow']},
 {id:'starmaker',name:'StarMaker',hosts:['starmakerstudios.com'],signin:'https://www.starmakerstudios.com/en/web-login',actions:['song-discovery']},
 {id:'google',name:'Google',hosts:['google.com'],signin:'https://accounts.google.com/',search:'https://www.google.com/search?q=',actions:['search'],connector:'google'},
 {id:'youtube',name:'YouTube',hosts:['youtube.com','youtu.be'],signin:'https://accounts.google.com/',search:'https://www.youtube.com/results?search_query=',actions:['search','watch'],connector:'google'},
 {id:'github',name:'GitHub',hosts:['github.com'],signin:'https://github.com/login',actions:['repos','read','write'],connector:'github'},
 {id:'cloudflare',name:'Cloudflare',hosts:['cloudflare.com'],signin:'https://dash.cloudflare.com/login',actions:['projects','deploy'],connector:'cloudflare'},
 {id:'gemini',name:'Google Gemini',hosts:['gemini.google.com'],signin:'https://gemini.google.com/',actions:['ask','research','plan'],providerMode:'gemini_first'},
 {id:'claude',name:'Anthropic Claude',hosts:['claude.ai'],signin:'https://claude.ai/',actions:['ask','review'],providerMode:'gemini_claude_review'},
 {id:'copilot',name:'GitHub Copilot',hosts:['github.com'],signin:'https://github.com/login',actions:['code-review','agent-work'],providerMode:'github_review'},
 {id:'jcpenney',name:'JCPenney',hosts:['jcpenney.com'],actions:['shop','orders'],purchase:'provider-checkout'},
 {id:'guess',name:'GUESS',hosts:['guess.com'],actions:['shop','orders'],purchase:'provider-checkout'}
]);
const asHttps=value=>{
 try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u:null;}
 catch{return null;}
};
const matches=(hostname,root)=>hostname===root||hostname.endsWith('.'+root);
/** Pure capability resolution. Do not trust user-supplied card names or IDs as provider identity. */
export function cardProvider(card){
 const verified=asHttps(card?.official)||asHttps(card?.website)||asHttps(card?.url);
 const copilot=verified?.hostname==='github.com'&&/^\/copilot(?:\/|$)/.test(verified.pathname);
 const descriptor=verified&&(copilot?PROVIDERS.find(p=>p.id==='copilot'):
  PROVIDERS.find(p=>p.hosts.some(root=>matches(verified.hostname.toLowerCase(),root))));
 if(!descriptor)return null;
 return Object.freeze({
  id:descriptor.id,name:descriptor.name,origin:verified.origin,
  signin:descriptor.signin||verified.origin+'/', // official home when no verified sign-in route
  hasDedicatedSignin:Boolean(descriptor.signin),
  search:descriptor.search||null,actions:Object.freeze([...descriptor.actions]),
  connector:descriptor.connector||null,compose:descriptor.compose||null,
  purchase:descriptor.purchase||null
 });
}
export function providerSearchUrl(provider,query){
 const q=String(query||'').trim().slice(0,180);
 return provider?.search&&q?provider.search+encodeURIComponent(q):null;
}
export function quickCardManifest(card){
 const provider=cardProvider(card);
 return Object.freeze({
  version:1,cardId:String(card?.id||'').replace(/[^a-z0-9-]/g,'').slice(0,70),
  providerId:provider?.id||null,providerOrigin:provider?.origin||null,
  interactions:Object.freeze(['follow','star','collect','share','search','build',...(provider?.actions||[])]),
  accountConnection:provider?.connector?'bubbles-account-page':'not-integrated',
  providerLogin:provider?.signin||null,
  nativeApp:'not-embedded',
  // An Android APK cannot be embedded into an HTML card: the bridge needs its own verified app link.
  apiAccess:'not-granted-by-card',
  checkout:provider?.purchase||'not-integrated',
  voiceActions:'draft-only-confirm-before-write-or-payment'
 });
}
