/* Zeus Discovery: separate, lightweight carousel source catalog.
 * Infinity editions are QuantaPhi experiences, not OpenAI model versions.
 * Existing third-party GPTs/plugins are linked out only after public-source review.
 */
import {MODEL_CARDS} from './coliseum/coliseum-core.mjs';
const source=MODEL_CARDS.map(m=>Object.freeze({
 id:m.id,kind:'infinity',category:'Infinity editions',
 name:m.name+' '+m.version,provider:'Infinity / QuantaPhi',
 headline:m.title,description:m.description,
 status:m.ready,isOfficialOpenAIModel:false,
 url:'/coliseum/index.html#'+(m.id==='zeus'?'arena':'models'),
 cta:m.ready==='prototype'?'Open free prototype':'Preview concept',
 glyph:m.icon,detail:m.ready==='prototype'?'Independent on-site prototype · no hosted AI implied':'Independent concept · no public AI room or payment activated'
}));
const directories=[
 {id:'existing-gpts',kind:'directory',category:'Creator GPTs',name:'Explore existing GPTs',provider:'ChatGPT',
 headline:'Browse public GPTs',description:'Explore existing GPTs in the official directory. Availability depends on your account; no full catalog is imported into QuantaPhi.',
 status:'external',isOfficialOpenAIModel:false,url:'https://chatgpt.com/gpts',cta:'Browse existing GPTs',glyph:'✦',
 detail:'Opens ChatGPT · sign-in may be required'},
 {id:'creator-plugins',kind:'directory',category:'Creator plugins',name:'Explore creator plugins',provider:'ChatGPT',
 headline:'Use creator-built tools',description:'Explore how plugins are discovered, installed and connected in ChatGPT. Use its Plugins directory for tools available to your account.',
 status:'external',isOfficialOpenAIModel:false,url:'https://learn.chatgpt.com/docs/plugins',cta:'How to find plugins',glyph:'◈',
 detail:'Guidance from ChatGPT Learn · plugin installation stays in ChatGPT'}
];
export const DISCOVERY_CARDS=Object.freeze([...source,...directories.map(x=>Object.freeze(x))]);
const allowed=(value,kind)=>{
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return false;
  if(kind==='gpt')return u.hostname==='chatgpt.com'&&/^\/g\/g-[a-z0-9_-]+(?:-[a-z0-9_-]+)*\/?$/i.test(u.pathname);
  return false; // Creator plugin deep-links need their own verified provider rules.
 }catch{return false;}
};
const plain=(x,max)=>typeof x==='string'&&x.trim()===x&&x.length>0&&x.length<=max&&!/[<>\u0000-\u001f]/.test(x);
export function approveCreatorEntry(entry,at=Date.now()){
 if(!entry||entry.kind!=='gpt'||!plain(entry.id,72)||!/^[a-z0-9-]+$/.test(entry.id)
  ||!plain(entry.name,90)||!plain(entry.creator,90)||!plain(entry.description,280)
  ||!allowed(entry.url,entry.kind)||entry.sourceStatus!=='verified'||entry.permission!=='public-link')return null;
 const when=Date.parse(entry.reviewedAt),now=Number(new Date(at));
 if(!Number.isFinite(when)||!Number.isFinite(now)||when>now||now-when>120*86400000)return null;
 return Object.freeze({id:entry.id,kind:'creator-gpt',category:'Creator GPTs',
  name:entry.name,provider:entry.creator,headline:'Existing creator GPT',
  description:entry.description,url:entry.url,cta:'Use this GPT',status:'verified-link',
  isOfficialOpenAIModel:false,glyph:'✦',
  detail:'Public link checked '+new Date(when).toISOString().slice(0,10)+' · opens ChatGPT; access may vary'});
}
export function cardsForTab(tab='all',reviewed=[]){
 const verified=Array.isArray(reviewed)?reviewed.map(x=>approveCreatorEntry(x)).filter(Boolean):[];
 const all=[...DISCOVERY_CARDS,...verified];
 if(tab==='infinity')return all.filter(x=>x.kind==='infinity');
 if(tab==='creator')return all.filter(x=>x.kind!=='infinity');
 return all;
}
export function advanceIndex(index,count,step=1){
 if(!Number.isSafeInteger(count)||count<=0)return 0;
 const n=Number.isFinite(index)?Math.trunc(index):0;
 const d=Number.isFinite(step)?Math.trunc(step):0;
 return ((n+d)%count+count)%count;
}
export const shouldAdvance=({playing=false,visible=false,hidden=true,reducedMotion=false}={})=>
 Boolean(playing&&visible&&!hidden&&!reducedMotion);
