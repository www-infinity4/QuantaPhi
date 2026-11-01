/* X Quick Card: owner-typed, local draft -> official X Web Intent.
 * This is NOT X OAuth, API publishing, login verification or an auto-post.
 * Keep account cookies, passwords, and wallet data outside this module.
 */
export const X_DRAFT_LIMIT=280;
export function normalizeXDraft(value){
 return String(value??'').replace(/\r\n?/g,'\n').trim();
}
export function xDraftIntentUrl(value){
 const text=normalizeXDraft(value);
 if(!text)throw new RangeError('X draft is empty');
 // Conservative local bound. X applies its own final weighted length rules.
 if(Array.from(text).length>X_DRAFT_LIMIT)throw new RangeError('X draft exceeds local limit');
 const url=new URL('https://twitter.com/intent/tweet');
 url.searchParams.set('text',text);
 return url.href;
}
const el=(tag,cls,text)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
};
export function mountXComposer(host){
 if(!host || typeof document==='undefined')return null;
 const panel=el('section','qca-x-composer');
 panel.setAttribute('aria-label','X post composer');
 const heading=el('p','qca-x-heading','Write a post');
 const explanation=el('p','qca-x-note','Draft here, then confirm on X. No post is sent by QuantaPhi.');
 const fieldLabel=el('label','qca-x-label','Post text');
 const field=el('textarea','qca-x-text');
 field.rows=3;field.maxLength=X_DRAFT_LIMIT;field.placeholder='What would you like to share?';
 field.setAttribute('aria-label','X post draft');
 fieldLabel.append(field);
 const actions=el('div','qca-x-footer');
 const count=el('output','qca-x-count','0 / 280');
 count.setAttribute('aria-live','polite');
 const link=el('a','qca-x-review','Continue to X to post');
 link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
 link.setAttribute('aria-label','Review and publish this draft on X in a new tab');
 const status=el('p','qca-x-note','Sign in and press Post on X to publish. A draft is not a posted receipt.');
 status.setAttribute('role','status');
 const refresh=()=>{
  const draft=normalizeXDraft(field.value);
  const len=Array.from(draft).length;
  count.textContent=len+' / '+X_DRAFT_LIMIT;
  if(!len||len>X_DRAFT_LIMIT){
   link.removeAttribute('href');link.setAttribute('aria-disabled','true');link.tabIndex=-1;
   return;
  }
  link.href=xDraftIntentUrl(draft);
  link.removeAttribute('aria-disabled');link.tabIndex=0;
 };
 link.addEventListener('click',event=>{
  if(link.getAttribute('aria-disabled')==='true'){event.preventDefault();return;}
  status.textContent='X opened for your review. Nothing has been confirmed posted by QuantaPhi.';
 });
 field.addEventListener('input',refresh);
 actions.append(count,link);
 panel.append(heading,explanation,fieldLabel,actions,status);
 refresh();host.append(panel);return panel;
}
