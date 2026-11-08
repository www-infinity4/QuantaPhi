/* Data-only ChatGPT -> QuantaPhi card draft handoff.
 * URL fragment stays on device, never triggers a network request or publication.
 * This file contains no OpenAI credentials, account identity, model access or wallet code. */
const safeText=(value,min,max)=>{
 if(typeof value!=='string')throw Error('invalid_draft');
 const text=value.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
 if(text.length<min||text.length>max)throw Error('invalid_draft');
 return text;
};
const URL_PREFIX='https://quantaphi.org/quick-card-builder.html';
const FRAGMENT='#chatgpt-draft=';
const KEYS=['title','website','description','interactionRequest','kind'];
export function cleanPublicCardDraft(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
    Object.keys(input).some(k=>!KEYS.includes(k)))throw Error('invalid_draft');
 const title=safeText(input.title,3,85);
 const raw=safeText(input.website,12,900);let site;
 try{site=new URL(raw)}catch{throw Error('invalid_draft')}
 const host=site.hostname.toLowerCase();
 if(site.protocol!=='https:'||site.username||site.password||site.port||site.hash||
    !/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(host)||
    host.endsWith('.local')||host==='localhost')throw Error('invalid_draft');
 const description=safeText(input.description,12,600);
 const interactionRequest=safeText(input.interactionRequest,10,500);
 const kind=input.kind||'visit';
 if(!['visit','search','video'].includes(kind))throw Error('invalid_draft');
 return {title,website:site.href,description,interactionRequest,kind};
}
export function encodePublicCardDraft(draft){
 const checked=cleanPublicCardDraft(draft);
 const bytes=new TextEncoder().encode(JSON.stringify(checked));
 let ascii='';
 for(const byte of bytes)ascii+=String.fromCharCode(byte);
 const encoded=btoa(ascii).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(encoded.length>5500)throw Error('invalid_draft');
 return URL_PREFIX+FRAGMENT+encoded;
}
export function readPublicCardDraft(hash){
 if(typeof hash!=='string'||hash.length>5600||!hash.startsWith(FRAGMENT))return null;
 const encoded=hash.slice(FRAGMENT.length);
 if(!/^[A-Za-z0-9_-]{20,5500}$/.test(encoded))return null;
 try{
  const ascii=atob(encoded.replace(/-/g,'+').replace(/_/g,'/'));
  const data=new Uint8Array(ascii.length);
  for(let i=0;i<ascii.length;i++)data[i]=ascii.charCodeAt(i);
  return cleanPublicCardDraft(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data)));
 }catch{return null}
}
