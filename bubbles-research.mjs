export function isArticleResearchRequest(value){
 const text=String(value||'');
 return /\b(?:research|investigate|find (?:the )?(?:best|related|connected)|look into)\b/i.test(text)&&/\b(?:article|story|stories|reading|looking at|this idea|this topic|infinity phi)\b/i.test(text)&&!/^\s*(?:fix|implement|debug|repair|upgrade)\b/i.test(text);
}
export function articleObservation(doc,view){
 const candidates=[...doc.querySelectorAll('article,[role="article"],section,.story-card,.reader-card')].filter(el=>!el.closest('#bubblesAICard,.ba-panel')&&el.querySelector('h1,h2,h3')&&el.querySelector('p,blockquote'));
 const visible=candidates.map(el=>({el,rect:el.getBoundingClientRect()})).filter(x=>x.rect.bottom>0&&x.rect.top<view.innerHeight&&x.rect.width>0&&x.rect.height>0).sort((a,b)=>(Math.min(b.rect.bottom,view.innerHeight)-Math.max(b.rect.top,0))-(Math.min(a.rect.bottom,view.innerHeight)-Math.max(a.rect.top,0))||a.rect.height-b.rect.height)[0]?.el;
 const root=visible||doc.querySelector('main')||doc.body;
 const title=String(visible?.querySelector('h1,h2,h3')?.textContent||doc.title||'').replace(/\s+/g,' ').trim().slice(0,300);
 const paragraphs=[...root.querySelectorAll('h1,h2,h3,p,blockquote')].filter(el=>{
  if(el.closest('#bubblesAICard,.ba-panel,nav,header,footer,form,[hidden]'))return false;
  const rect=el.getBoundingClientRect();return rect.width>0&&rect.height>0&&(visible||rect.bottom>0&&rect.top<view.innerHeight);
 }).map(el=>String(el.innerText||'').trim()).filter(Boolean);
 return {title,url:view.location.href,text:paragraphs.join('\n').slice(0,6500),observedAt:new Date().toISOString()};
}
export async function runArticleResearch({request,article,fetcher=fetch,storage=localStorage,document:doc=document,view=window,onStatus=()=>{}}){
 onStatus('Reading the article and finding related stories…');
 const response=await fetcher('https://bubbles-tools.marvaseater.workers.dev/v1/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request,article}),signal:AbortSignal.timeout(60000)});
 const packet=await response.json();if(!response.ok||!packet.ok||!packet.id||!Array.isArray(packet.sources)||!packet.sources.length)throw Error(packet.error||'research_failed');
 storage.setItem('bubbles:research:'+packet.id,JSON.stringify(packet));
 // Same-origin Infinity Phi calls its own existing token and website builder.
 // The packet is local, and no article text or wallet key goes in a URL.
 const url=new URL('/infinity-phi/bubbles-research/',view.location.origin);url.searchParams.set('id',packet.id);
 const frame=doc.createElement('iframe');frame.title='Infinity Phi article research and website';frame.src=url.href;
 frame.style.cssText='display:block;width:100%;height:1px;border:0;background:white';
 const receipt=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{cleanup();reject(Error('infinity_handoff_not_confirmed'));},60000);
  const cleanup=()=>{clearTimeout(timer);view.removeEventListener('message',receive);};
  const receive=event=>{if(event.origin!==view.location.origin||event.source!==frame.contentWindow||event.data?.type!=='infinity:bubbles-research-result'||event.data?.id!==packet.id)return;cleanup();if(event.data.error)reject(Error(event.data.error));else resolve(event.data);};
  view.addEventListener('message',receive);doc.getElementById('ba-research-results')?.remove();
  const container=doc.createElement('div');container.id='ba-research-results';container.append(frame);
  const target=doc.querySelector('.ba-panel .ba-conversation,.ba-panel .ba-messages')||doc.getElementById('bubblesAICard');if(!target){cleanup();reject(Error('research_view_unavailable'));return;}target.append(container);
 });
 const website=new URL(receipt.websiteUrl,view.location.origin);
 if(website.origin!==view.location.origin||!website.pathname.startsWith('/infinity-phi/studio/build/'))throw Error('invalid_infinity_website_receipt');
 const result=doc.getElementById('ba-research-results');
 for(const source of packet.sources.slice(0,6)){
  const link=doc.createElement('a');link.textContent=String(source.title||'Related story').slice(0,300);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='display:block;padding:10px;color:#583277';result?.append(link);
 }
 frame.title='Infinity Phi research website';frame.src=website.href;frame.style.height='420px';
 return {packet,receipt,url:url.href};
}
