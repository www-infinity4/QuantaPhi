// Bubbles Chrome control inspector. Browser-side expressions only; do not run model-supplied JS.
export const CONTROLS_SELECTOR='button,a[href],[role="button"],[role="menuitem"],summary,input[type="button"],input[type="submit"]';
const runtime=String.raw\`
 const key=value=>String(value||'').replace(/\\s+/g,' ').trim();
 const folded=value=>key(value).toLowerCase();
 const visible=el=>Boolean(el.getClientRects?.().length)&&el.getAttribute('aria-hidden')!=='true';
 const disabled=el=>Boolean(el.disabled||el.getAttribute('aria-disabled')==='true');
 const labels=el=>{
  const refs=key(el.getAttribute('aria-labelledby')).split(/\\s+/).filter(Boolean).slice(0,4);
  const labelled=refs.map(id=>document.getElementById(id)?.textContent||'').join(' ');
  const icon=el.querySelector?.('img[alt],svg title');
  const candidates=[el.getAttribute('aria-label'),labelled,el.getAttribute('title'),el.innerText,
    el.textContent,icon?.getAttribute?.('alt'),icon?.textContent,el.getAttribute('value')];
  return [...new Set(candidates.map(key).filter(Boolean))].slice(0,8);
 };
 const controls=[...document.querySelectorAll("button,a[href],[role=\"button\"],[role=\"menuitem\"],summary,input[type=\"button\"],input[type=\"submit\"]")]
  .filter(visible).slice(0,120).map(el=>{
   const labelOptions=labels(el);
   const container=el.closest?.('article,[role="article"],section,[data-card],li');
   const heading=container?.querySelector?.('h1,h2,h3,h4,h5,h6,[data-title]')?.textContent||'';
   return {el,label:key(labelOptions[0]||''),labels:labelOptions,context:key(heading).slice(0,95),
    tag:String(el.tagName||'').toLowerCase(),disabled:disabled(el)};
  });
\`;
export const browserReadExpression="(()=>{"+runtime+String.raw\`
 const text=String(document.body?.innerText||'').slice(0,8500);
 return {title:String(document.title||'').slice(0,150),url:location.href,text,
  controls:controls.slice(0,60).map(({label,context,tag,disabled})=>({label:label.slice(0,130)||'(unlabeled control)',
   ...(context?{context}:{}),tag,disabled}))};
})()\`;
export const browserClickExpression=label=>"(()=>{const wanted="+JSON.stringify(label)+";"+runtime+String.raw\`
 const query=folded(wanted);
 if(!query||query.length>100)return {ok:false,error:'browser_label_required'};
 const exact=controls.filter(c=>c.labels.some(x=>folded(x)===query)||
   (c.context&&folded(c.label+' '+c.context)===query)||(c.context&&folded(c.context+' '+c.label)===query));
 const matches=exact.length?exact:query.length>=4?controls.filter(c=>
   c.labels.some(x=>folded(x).includes(query))||
   (c.context&&folded(c.label+' '+c.context).includes(query))):[];
 if(!matches.length)return {ok:false,error:'control_not_found',suggestions:controls.filter(c=>c.label).slice(0,8).map(c=>c.label)};
 if(matches.length!==1)return {ok:false,error:'ambiguous_control',matches:matches.slice(0,8).map(c=>({label:c.label,context:c.context}))};
 const target=matches[0];
 if(target.disabled)return {ok:false,error:'control_disabled',label:target.label};
 const href=target.el.getAttribute('href')||'';
 const unsafe=/\\b(?:delete|remove|purchase|checkout|pay now|transfer|confirm|authorize|grant|permission|password|sign out|logout|submit payment|bid|order)\\b/i;
 if(unsafe.test([...target.labels,href].join(' '))||(target.el.tagName==='BUTTON'&&target.el.type==='submit')||
   (target.el.tagName==='INPUT'&&target.el.type==='submit')||
   /^\\s*(?:javascript|data|file):/i.test(href))
  return {ok:false,error:'owner_manual_approval_required',label:target.label};
 target.el.click();
 return {ok:true,clickDispatched:true,effectVerified:false,
  element:target.tag,label:target.label.slice(0,110),context:target.context};
})()\`;
