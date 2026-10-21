/* Bubbles command-to-tool action driver.
 * The spoken command is the authority, NOT text returned by a webpage,
 * image, model, chat history or an Android screen observation.
 *
 * This module selects known, permissioned tools. It never clicks an arbitrary
 * operating-system coordinate, grants owner rights or executes a model's JSON.
 */
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const preamble=/^(?:(?:hey|okay|please|bubbles(?: ai)?)[,\s:]+)+/i;
const negative=/^(?:(?:don't|do not|never|stop|cancel|avoid)\b|(?:how|why|what|when)\s+(?:do|does|would|can|should|is)\b)/i;
const controlVerb=/^(?:tap|click|press|hit|push|choose|select)\b/i;
const unsafe=/\b(?:buy|bid|pay|purchase|checkout|unlock|subscribe|transfer|withdraw|send|post|tweet|share|collect|star|delete|erase|remove|wipe|reset|sign[ -]?in|log[ -]?in|allow|grant|approve|confirm|submit|accept|install|record|upload|next\s+(?:episode|curated)|coin|wallet|owner\s+(?:mode|approval)|permission|connect\s+account)\b/i;
const labelText=value=>clean(value).replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g,'').replace(/^the\s+(?:button|control)\s+(?:named|called)\s+/i,'').replace(/^(?:the|a)\s+/i,'').replace(/\s+(?:button|control)$/i,'').trim();
const normalized=value=>labelText(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function resolveToolAction(text,{activeCard=''}={}){
 let phrase=clean(text).replace(preamble,'');
 if(!phrase||negative.test(phrase)||phrase.length>500)return null;
 // A numbered Android observation is the only permissible basis for tapping
 // a device. The existing session checks the ten-minute grant again.
 if(/^(?:read|scan|inspect|show|look at)\s+(?:the\s+|my\s+)?(?:phone|android)(?:\s+(?:screen|display))?[.!?]*$/i.test(phrase)
  || /^(?:what(?:'s| is)\s+on)\s+(?:my\s+|the\s+)?(?:phone|android)\s+screen[.!?]*$/i.test(phrase))
  return {kind:'phone',command:'phone read'};
 if(/^(?:check|show|get)\s+(?:my\s+|the\s+)?(?:phone|android)\s+(?:tool\s+)?status[.!?]*$/i.test(phrase))
  return {kind:'phone',command:'phone status'};
 const phoneTap=phrase.match(/^(?:tap|press|click)\s+(?:(?:the\s+)?(?:button|target|number|item)\s+)?(\d{1,3})\s+(?:on|in)\s+(?:my\s+|the\s+)?(?:phone|android)(?:\s+screen)?[.!?]*$/i);
 if(phoneTap)return {kind:'phone',command:'phone tap '+Number(phoneTap[1])};
 const phoneType=phrase.match(/^(?:type|enter|fill)\s+["“]([^"”]{1,600})["”]\s+(?:into|in)\s+(?:(?:the\s+)?(?:field|target|number|item)\s+)?(\d{1,3})\s+(?:on|in)\s+(?:my\s+|the\s+)?(?:phone|android)(?:\s+screen)?[.!?]*$/i);
 if(phoneType)return {kind:'phone',command:'phone type '+Number(phoneType[2])+': '+phoneType[1]};
 // Browser clicks have their own origin and verified owner grant. Keep
 // the target in the phrase so the existing Chrome CDP driver performs it.
 const web=phrase.match(/^(?:tap|click|press)\s+(?:on\s+)?(.+?)\s+(?:in|on|using|with)\s+(?:the\s+)?(?:cloud|chrome|remote)?\s*browser[.!?]*$/i);
 if(web){const label=labelText(web[1]);if(!label||unsafe.test(label))return {kind:'blocked',reason:'This control requires manual review in the browser.'};
  return {kind:'browser',command:'click "'+label.replace(/"/g,'')+'" in the cloud browser'};}
 if(!controlVerb.test(phrase))return null;
 const matched=phrase.match(/^(?:tap|click|press|hit|push|choose|select)\s+(?:on\s+)?(.+?)(?:[.!?]+)?$/i);
 if(!matched)return null;
 let label=labelText(matched[1]);let cardName='';
 const cardSuffix=label.match(/^(.+?)\s+(?:on|in|inside)\s+(?:the\s+|my\s+)?(.+?)(?:\s+card|\s+player)?$/i);
 if(cardSuffix&&/(?:card|player|radio|media star|fred|infinity|crusher|reads|spaces)/i.test(cardSuffix[2])){
  label=labelText(cardSuffix[1]);cardName=labelText(cardSuffix[2]);
 }
 if(!cardName&&!activeCard)return null;
 if(!label||label.length>80)return {kind:'clarify',message:'Which named control should I use? No control was pressed.'};
 return {kind:'card',label,cardName:cardName||activeCard};
}
export function cardControlDecision(label,controls){
 const name=normalized(label);
 if(!name||name.length>75)return {status:'control_label_required'};
 if(unsafe.test(name))return {status:'manual_approval_required'};
 // A narrow command selects ONE visible enabled action, never coordinates.
 const matches=(controls||[]).filter(c=>c&&c.disabled!==true&&c.visible!==false&&
  normalized(c.label)===name);
 if(!matches.length)return {status:'control_not_found'};
 if(matches.length!==1)return {status:'control_ambiguous'};
 const target=matches[0];
 if(target.tag==='A'||target.external===true)return {status:'external_link_requires_user_tap'};
 if(target.payment===true||target.navigation===true||unsafe.test(target.label))return {status:'manual_approval_required'};
 return {status:'safe_click',control:target};
}
export function safeCardControls(doc){
 const elements=[...(doc?.querySelectorAll?.('button,[role="button"],input[type="button"],a')||[])];
 return elements.slice(0,120).map(el=>{
  const text=el.getAttribute?.('aria-label')||el.innerText||el.textContent||el.value||'';
  const visible=el.getClientRects?el.getClientRects().length>0:el.hidden!==true;
  return {label:clean(text).slice(0,130),tag:String(el.tagName||'').toUpperCase(),disabled:el.disabled===true,
   visible,external:el.tagName==='A'&&el.target==='_blank',element:el};
 });
}
export function toolReply(receipt){
 if(receipt?.status==='safe_click')
  return 'Pressed '+receipt.label+' on '+receipt.card+'. The tap was sent to the actual card control; its resulting action is not yet verified.';
 if(receipt?.status==='control_not_found')return 'I inspected this card but did not find that control. Nothing was tapped.';
 if(receipt?.status==='control_ambiguous')return 'More than one control has that name. Nothing was tapped; please specify which one.';
 if(receipt?.status==='external_link_requires_user_tap')return 'That control opens an external site. Tap its link yourself in the card; no audio or navigation was confirmed.';
 if(receipt?.status==='manual_approval_required')return 'That control may spend coins, change account settings or approve something. I did not tap it. Review it on the card first.';
 return 'I could not verify that control. Nothing was tapped.';
}
