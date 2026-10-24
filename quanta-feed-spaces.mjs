/* Spaces discovery from the existing wallet-authorized Media Star source, not
 * from fabricated live X results. No X credential goes into the browser. */
const API='https://media-star-following-spaces.marvaseater.workers.dev';
export const validSpaceLink=value=>{
 try{const url=new URL(value);return url.protocol==='https:'&&
  ['x.com','twitter.com','www.x.com','www.twitter.com'].includes(url.hostname)&&
  /^\/i\/spaces\/[A-Za-z0-9]{8,30}\/?$/.test(url.pathname);}
 catch{return false;}
};
export async function readIndexedSpaces({token,fetcher=fetch,maxHosts=5}){
 if(typeof token!=='string'||!/^sq_[A-Za-z0-9_-]{32,}$/.test(token))throw Error('wallet_not_connected');
 async function json(path){
  const r=await fetcher(API+path,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('spaces_source_http_'+r.status);
  const data=await r.json();if(data.error)throw Error('spaces_source_rejected');
  return data;
 }
 const d=await json('/v1/hosts');
 const hosts=Array.isArray(d.hosts)?d.hosts.filter(x=>/^[A-Za-z0-9_]{1,15}$/.test(x?.handle||'')).slice(0,maxHosts):[];
 const all=[];
 for(const host of hosts){
  const result=await json('/v1/episodes?handle='+encodeURIComponent(host.handle));
  for(const episode of (Array.isArray(result.episodes)?result.episodes:[]).slice(0,15)){
   if(typeof episode?.title!=='string'||!validSpaceLink(episode.url)||episode.requiresOriginalUnlock)continue;
   all.push({title:episode.title.slice(0,210),host:host.handle,url:episode.url,
    status:episode.availability==='verified_replay'?'replay marked verified':'indexed; playback unverified'});
  }
 }
 return {episodes:all.slice(0,45),hostsQueried:hosts.length,liveVerified:false,from:'media-star-wallet-index'};
}
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;};
export function mountSpaceSource(node){
 const status=el('p','qf-muted','Media Star can show titled, wallet-authorized indexed X Spaces, not an unverified list of rooms that are live right now.');
 status.setAttribute('role','status');
 const button=el('button','qf-button','Load my indexed X Spaces');button.type='button';
 const list=el('div','qf-space-list');
 button.addEventListener('click',async()=>{
  button.disabled=true;status.textContent='Checking your verified wallet’s existing Media Star library…';
  try{
   const token=await window.QuantaCloudConnection?.resolveDeviceToken?.();
   const result=await readIndexedSpaces({token});
   list.replaceChildren();
   if(!result.episodes.length)status.textContent='No indexed Spaces were available for this wallet. This is not a live-room directory.';
   else{
    status.textContent=result.episodes.length+' original titled X Spaces indexed for this wallet · not verified live now.';
    for(const episode of result.episodes){
     const article=el('article','qf-space-item');
     article.append(el('strong','',episode.title),el('p','qf-muted','@'+episode.host+' · '+episode.status));
     const link=el('a','qf-button','Open original Space ↗');link.href=episode.url;link.target='_blank';link.rel='noopener noreferrer';
     article.append(link);list.append(article);
    }
   }
  }catch(err){
   const message=String(err.message||err);
   status.textContent=message==='wallet_not_connected'?'Connect your existing QuantaPhi wallet to open your own Media Star Spaces library.':'Could not verify the indexed Spaces catalog. No live rooms were invented.';
  }finally{button.disabled=false;}
 });
 node.append(el('h3','','Spaces from your own Media Star'),status,button,list);
}
