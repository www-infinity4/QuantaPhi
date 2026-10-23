import {normalizeCard,mergeStories,nextStory,TOOLS,httpsUrl} from './model.mjs';
export function mountCard(host,input,{request=fetch,storage=localStorage}={}){
 const card=normalizeCard(input),key='phi-card-reader:'+JSON.stringify([card.kind,card.query,card.sourceUrl,card.teamId]);
 let items=[],seen=[],busy=false,disposed=false,timer;
 try{const cached=JSON.parse(storage.getItem(key)||'{}');items=mergeStories([],cached.items||[]);seen=Array.isArray(cached.seen)?cached.seen.filter(x=>typeof x==='string').slice(-400):[]}catch{}
 const make=(tag,value)=>{const node=document.createElement(tag);if(value)node.textContent=value;host.append(node);return node};
 host.replaceChildren();make('h2',card.title);make('p',card.description);
 const story=make('article'),status=make('p');status.setAttribute('role','status');
 const next=make('button','Next story'),refresh=make('button','Refresh sources');next.type=refresh.type='button';
 if(card.destinationUrl){const a=make('a','Visit website ↗');a.href=card.destinationUrl;a.target='_blank';a.rel='noopener noreferrer'}
 const persist=()=>{try{storage.setItem(key,JSON.stringify({items,seen}))}catch{status.textContent+=' Reading history could not be saved.'}};
 function show(){
  const item=nextStory(items,seen);if(!item){status.textContent='No unseen stories remain. Refresh for new sources.';return}
  story.replaceChildren();const title=document.createElement('h3');title.textContent=item.title;story.append(title);
  const detail=document.createElement('p');detail.textContent=item.snippet;story.append(detail);
  const time=document.createElement('p');time.textContent=item.publishedAt?'Published: '+new Date(item.publishedAt).toLocaleString():'Publication date unverified';story.append(time);
  const link=document.createElement('a');link.textContent=card.kind==='sessions'?'Open original session ↗':'Read original source ↗';link.href=httpsUrl(item.url);link.target='_blank';link.rel='noopener noreferrer';story.append(link);
  seen=[...seen,item.url].slice(-400);persist();
 }
 async function load(advance=false){
  if(busy||disposed)return;busy=true;next.disabled=refresh.disabled=true;status.textContent='Checking sources…';
  try{
   const response=await request(TOOLS+'/v1/cards/refresh',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({card}),signal:AbortSignal.timeout(20000)});
   const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Source refresh failed');
   if(disposed)return;items=mergeStories(items,data.items||[]);persist();
   status.textContent='Checked '+new Date(data.checkedAt).toLocaleTimeString()+'. '+data.dateNotice+(data.researchNotice?' '+data.researchNotice:'');
   if(advance||!story.childNodes.length)show();
  }catch(error){if(!disposed)status.textContent='Sources unavailable. '+error.message+' Saved stories remain available.';if(advance&&!disposed)show()}
  finally{busy=false;if(!disposed)next.disabled=refresh.disabled=false}
 }
 next.onclick=()=>load(true);refresh.onclick=()=>load(false);
 void load(true);timer=setInterval(()=>{if(!document.hidden)void load(false)},card.refreshMinutes*60000);
 return ()=>{disposed=true;clearInterval(timer)};
}
