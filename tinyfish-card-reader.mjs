import {tinyfishCard} from './tinyfish-card-catalog.mjs';
export const WEBSITE_ENDPOINT='https://continuity-session-coordinator.marvaseater.workers.dev/v1/cards/website';
const text=(tag,label,cls)=>{const e=document.createElement(tag);if(label!==undefined)e.textContent=label;if(cls)e.className=cls;return e};
export function websiteResultUrl(value,source){
 try{const u=new URL(value),root=new URL(source).hostname.replace(/^www\./,'');
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname===root||u.hostname.endsWith('.'+root))?u.href:null;
 }catch{return null}
}
const messages={provider_session_required:'Your website conversation session is not connected. No message was sent.',
 tinyfish_not_configured:'Website reading is awaiting activation.',tinyfish_key_rejected:'The website connection needs its server key repaired.',
 quota_unavailable:'Website reading is temporarily unavailable.',usage_limit_reached:'The website reading limit has been reached. Please try later.',
 tinyfish_allowance_exhausted:'The website reading allowance is used up for today.',
 login_required:'This page requires signing in on the original website.',bot_blocked:'The original website requires a browser verification.',
 page_not_found:'The original website no longer has this page.',timeout:'The original website did not finish loading.',source_not_readable:'The original website did not return readable public content.'};
export async function readCardWebsite(cardId,action='inspect',query='',{fetcher=fetch,signal}={}){
 const card=tinyfishCard(cardId);if(!card)throw Error('This website card is not connected yet.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),26000);
 const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
 try{
  const response=await fetcher(WEBSITE_ENDPOINT,{method:'POST',credentials:'omit',cache:'no-store',
   headers:{'Content-Type':'application/json'},signal:controller.signal,
   body:JSON.stringify({cardId,action,...(query?{query:String(query).slice(0,180)}:{})})});
  const data=await response.json();
  if(!response.ok||data.ok!==true)throw Error(messages[data.error]||'The website connection is unavailable. Try the original site.');
  if(data.cardId!==cardId||data.action!==action||!['TinyFish Fetch','TinyFish Search'].includes(data.provider)||
    !data.receipt?.id||!Number.isFinite(Date.parse(data.observedAt))||!Array.isArray(data.items))throw Error('No verified website result was returned.');
  const expected=card.actions?.find(a=>a.id===action)?.url||card.url;
  if(data.sourceUrl!==expected)throw Error('The website result came from an unexpected source.');
  return {...data,items:data.items.slice(0,6).filter(i=>websiteResultUrl(i?.url,expected)).map(i=>({
   title:String(i.title||'Website result').slice(0,180),url:websiteResultUrl(i.url,expected),text:String(i.text||'').slice(0,5500)}))};
 }catch(error){if(error?.name==='AbortError')throw Error('Website reading was interrupted. Please try again.');throw error;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
export function renderWebsiteResults(host,data){
 host.replaceChildren();
 const stamp=new Date(data.observedAt).toLocaleString();
 const status=text('p',data.items.length?'From '+new URL(data.sourceUrl).hostname+' · '+stamp:'No matching public pages were found on this website.','qca-status');
 status.setAttribute('role','status');host.append(status);
 for(const item of data.items){
  const row=text('article',undefined,'qca-website-result');row.append(text('strong',item.title));
  if(item.text)row.append(text('p',item.text,'qca-website-text'));
  const link=text('a','Open original page ↗','qca-button');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';row.append(link);host.append(row);
 }
 host.append(text('small',data.provider+' · Receipt '+data.receipt.id,'qca-website-receipt'));
}
export async function showCardWebsiteResults(host,cardId,action='inspect',query='',options={}){
 const ticket=crypto.randomUUID();host.dataset.websiteRead=ticket;
 host.replaceChildren(text('p','Reading the original website…','qca-status'));
 host.setAttribute('aria-busy','true');
 try{
  const data=await readCardWebsite(cardId,action,query,options);
  if(host.dataset.websiteRead===ticket)renderWebsiteResults(host,data);
  return data;
 }catch(error){if(host.dataset.websiteRead===ticket){host.replaceChildren(text('p',error.message,'qca-status'));}throw error;}
 finally{if(host.dataset.websiteRead===ticket)host.removeAttribute('aria-busy')}
}
export function mountTinyFishCardReader(host,card){
 const trusted=tinyfishCard(card?.id);if(!host||!trusted)return null;
 const panel=text('details',undefined,'qca-website-reader');panel.dataset.websiteCard=card.id;
 panel.append(text('summary','Live website · '+trusted.name));
 const controls=text('div',undefined,'qca-controls'),results=text('div',undefined,'qca-website-results');results.setAttribute('aria-live','polite');
 const buttons=[];
 const add=(label,action)=>{
  const button=text('button',label,'qca-button');button.type='button';
  button.addEventListener('click',async()=>{
   buttons.forEach(b=>b.disabled=true);
   try{await showCardWebsiteResults(results,card.id,action)}catch{/* Error is shown on this card. */}
   finally{buttons.forEach(b=>b.disabled=false)}
  });controls.append(button);buttons.push(button);
 };
 add('Read website','inspect');
 for(const action of trusted.actions||[])add(action.label,action.id);
 panel.append(controls,results);
 if(['chatgpt','gemini','claude','copilot'].includes(card.id))panel.append(text('p',
  'Website conversations need your own connected provider session. Website reading does not send a chat message.','qca-status'));
 host.append(panel);return panel;
}
