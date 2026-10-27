/* One shared TinyFish read-only website adapter for every original Quick Card.
 * A provider login on another origin is never treated as a QuantaPhi login.
 * The coordinator must separately deploy /v1/cards/discover for live results.
 */
const ENDPOINT='https://continuity-session-coordinator.marvaseater.workers.dev/v1/cards/discover';
const clean=s=>String(s||'').trim().slice(0,180);
const el=(tag,cls,label)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n;};
export function cardWebsite(card){
 try{
  const url=new URL(card?.official||card?.website||card?.url||'');
  if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.includes('.'))return null;
  if(/(?:^|\.)localhost$/.test(url.hostname)||/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname))return null;
  return url;
 }catch{return null;}
}
export function mountTinyFishCardReader(host,card){
 if(!host||!card||['google','bing'].includes(card.id))return null;
 const target=cardWebsite(card);
 if(!target)return null;
 const panel=el('section','qca-site-reader');
 panel.setAttribute('aria-label','Live website lookup for '+clean(card.name||card.title||target.hostname));
 const form=el('form','qca-search');
 const q=el('input','qca-search-input');
 const ai=card.id==='chatgpt'||card.id==='gemini'||card.id==='claude'||card.id==='copilot';
 q.type='search';q.maxLength=180;q.required=true;
 q.placeholder=ai?'Find provider help pages…':'Find public pages on '+target.hostname+'…';
 q.setAttribute('aria-label','Find public pages on '+target.hostname);
 const submit=el('button','qca-button qca-search-submit',ai?'Find help pages':'Find pages on '+target.hostname);
 submit.type='submit';
 const results=el('div','qca-site-results');
 results.setAttribute('aria-live','polite');
 const status=el('p','qca-status','Public-site lookup uses TinyFish Search. Signed-in features stay on the provider website.');
 status.setAttribute('role','status');
 const visit=el('a','qca-button qca-source','Open official website');
 visit.href=target.href;visit.target='_blank';visit.rel='noopener noreferrer';
 const actions=el('div','qca-controls');actions.append(visit);
 const toggle=el('button','qca-button qca-tinyfish-toggle','🌐 TinyFish public-site lookup');
 toggle.type='button';
 form.append(q,submit);form.hidden=true;status.hidden=true;results.hidden=true;
 // The input is inserted only after a deliberate tap. Ordinary cards must not
 // sprout extra generic search bars merely by entering the carousel.
 toggle.addEventListener('click',()=>{
  if(!panel.contains(form)){panel.insertBefore(form,status);form.hidden=false;status.hidden=false;results.hidden=false;}
  else{form.hidden=!form.hidden;status.hidden=form.hidden;results.hidden=form.hidden;}
  toggle.textContent=form.hidden?'🌐 TinyFish public-site lookup':'Close website lookup';
  if(!form.hidden)q.focus();
 });
 panel.append(toggle,status,results,actions);
 let controller=null;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const query=q.value.trim().slice(0,180);if(query.length<2)return;
  controller?.abort();controller=new AbortController();
  results.replaceChildren();submit.disabled=true;
  status.textContent='Searching public '+target.hostname+' pages through TinyFish…';
  try{
   const response=await fetch(ENDPOINT,{method:'POST',mode:'cors',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({hostname:target.hostname,query,cardId:String(card.id||'').slice(0,70)}),
    signal:AbortSignal.any?AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]):controller.signal});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||data.ok!==true)throw Error(data.error==='rate_limited'?'Daily public lookup limit reached.':data.error==='not_deployed'?'TinyFish relay deployment pending.':'TinyFish site lookup is not available right now.');
   const items=Array.isArray(data.results)?data.results.slice(0,8):[];
   for(const item of items){
    let url;try{url=new URL(item.url)}catch{continue;}
    if(url.protocol!=='https:'||!(url.hostname===target.hostname||url.hostname.endsWith('.'+target.hostname)))continue;
    const row=el('div','qcx-result'),body=el('div','');
    body.append(el('strong','',clean(item.title||url.hostname)),el('p','qcx-note',clean(item.snippet)));
    const a=el('a','qca-button', 'Read on '+target.hostname);a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';
    row.append(body,a);results.append(row);
   }
   status.textContent=results.children.length
    ?'Public pages from '+target.hostname+'. No provider account or conversation was accessed.'
    :'No verifiable public pages found on '+target.hostname+'.';
  }catch(error){
   if(error?.name==='AbortError')return;
   status.textContent=error?.message==='Failed to fetch'?'TinyFish relay is not reachable. Open the official website instead.':(error?.message||'TinyFish relay unavailable.');
  }finally{submit.disabled=false;}
 });
 host.append(panel);return panel;
}
