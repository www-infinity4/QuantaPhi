/* First-party website-to-card transport. No provider tokens or browser cookies in card JS.
 * Responses are TinyFish observations, never publisher-operated APIs or official ChatGPT replies.
 */
const SUPPORTED=new Set(['starmaker','youtube','reddit','x','tiktok','cnn','fox-news','yahoo-news','tv-guide','fox-one','fox-one-live-news','facebook','instagram','vamworld','pcgs','ngc','heritage','topps','beckett','christies','morrison-hotel-gallery','rolling-stone','coinworld','coinage','shoplc-premium','sonic','burger-king','mcdonalds','loc','nasa-library','pepe-brooke','pepe-vapour','guess-g11-light','guess-g11-dark','levis-501-dark','levis-501-medium','packers-lions-2026','fox-nfl-watch','lions-interception-watch','packers-next-schedule','lions-next-schedule','world-series-game3-2026','world-series-pitchers-2026','world-series-lineups-2026','world-series-game2-highlights','world-series-game1-recap','world-series-future-games','hidden-valley-ranch','kohls-coupons','honda-vehicles','oakley-meta','gmc-trucks','gmc-sierra-2026','gmc-denali-2026','carhartt-shop','des-moines-register','miller-meeks-ia1','zach-nunn-ia3','hurley-surfwear','colorectal-screening','burger-king-chicken-2026','royal-caribbean-cruises','kraft-mac-cheese','tucker-kraft-plays','ai-game-announcer']);
const UNSUPPORTED_AI=new Set(['chatgpt','gemini','claude','copilot']);
export const TINYFISH_CARD_ENDPOINT='https://continuity-session-coordinator.marvaseater.workers.dev/v1/quick-cards/tinyfish';
export const tinyfishCardSupported=id=>SUPPORTED.has(String(id||''));
export const tinyfishIsAi=id=>UNSUPPORTED_AI.has(String(id||''));
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
export async function requestTinyfishCard(cardId,question,fetcher=fetch){
 if(!tinyfishCardSupported(cardId))throw Error('unsupported_provider');
 const query=String(question||'').trim();
 if(query.length<3||query.length>240)throw Error('invalid_query');
 const response=await fetcher(TINYFISH_CARD_ENDPOINT,{method:'POST',credentials:'omit',
  headers:{'Content-Type':'application/json','Accept':'application/json'},
  body:JSON.stringify({cardId,query})});
 let data;try{data=await response.json()}catch{throw Error('invalid_gateway_response')}
 if(!response.ok||data?.ok!==true)throw Error(String(data?.error||'gateway_unavailable').slice(0,90));
 if(data.cardId!==cardId||typeof data.result!=='string'||typeof data.sourceUrl!=='string'||!Number.isFinite(Date.parse(data.checkedAt||'')))throw Error('invalid_source_receipt');
 return data;
}
export function mountTinyfishCard(root,card){
 if(!root||!card)return null;
 if(tinyfishIsAi(card.id)){
  if(card.id==='chatgpt'){
   const p=make('p','qcx-note','ChatGPT responses require an authorized OpenAI integration. TinyFish cannot turn a separate ChatGPT website login into an official embedded ChatGPT session. Open ChatGPT to use your account.');
   root.append(p);
  }
  return null;
 }
 if(!tinyfishCardSupported(card.id))return null;
 const panel=make('section','qcx-tool qcx-tinyfish-card');
 panel.dataset.websiteAgent=card.id;
 const label=make('h3','',card.name+' · Live website research');
 const detail=make('p','qcx-note','TinyFish reads publicly accessible information on the original site. It does not sign you in, act for you or send messages.');
 const form=make('form','qcx-search-form'),field=make('input','qcx-input'),submit=make('button','qcx-button','Research website');
 field.type='search';field.maxLength=240;field.required=true;field.minLength=3;
 field.placeholder=card.id==='starmaker'?'Find an official StarMaker song…':'Ask about public pages on '+card.name+'…';
 field.setAttribute('aria-label','Research '+card.name+' website with TinyFish');
 submit.type='submit';form.append(field,submit);
 const status=make('p','qcx-note','Choose Research website to request an independently observed answer.');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const answer=make('div','qcx-tinyfish-answer');answer.setAttribute('aria-live','polite');
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(submit.disabled)return;
  status.textContent='Checking the original public website via TinyFish…';
  answer.replaceChildren();submit.disabled=true;
  try{
   const r=await requestTinyfishCard(card.id,field.value.trim());
   const when=new Date(r.checkedAt).toLocaleString();
   const original=new URL(r.sourceUrl);
   const expected=new URL(card.official);
   if(original.protocol!=='https:'||!(original.hostname===expected.hostname||original.hostname.endsWith('.'+expected.hostname.replace(/^www\./,''))))throw Error('source_mismatch');
   answer.append(make('p','',r.result.slice(0,5000)));
   const link=make('a','qcx-link','Open original source ↗');
   link.href=original.href;link.target='_blank';link.rel='noopener noreferrer';answer.append(link);
   status.textContent='TinyFish observation · '+when+' · Not an official '+card.name+' reply.';
  }catch(error){
   const code=String(error?.message||'unavailable');
   status.textContent=code==='gateway_unavailable'||code==='not_found'||code==='http_404'||code==='method_not_allowed'?
    'TinyFish gateway is not enabled on the live website yet. Use the original website link.' :
    'No verified website result: '+code.replace(/[^a-z0-9_ -]/gi,'').slice(0,90)+'. Open the original website instead.';
  }finally{submit.disabled=false}
 });
 panel.append(label,detail,form,status,answer);root.append(panel);return panel;
}
