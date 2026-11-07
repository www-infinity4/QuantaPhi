/* Infinity Identity Shield · a public research Quick Card, not an SSA or credit service.
 * No SSN, account number, login form, wallet mutation or private monitoring.
 */
const root=document.getElementById('identityShieldQuickCard');
if(root&&!root.dataset.identityShieldMounted){
 root.dataset.identityShieldMounted='true';
 root.classList.add('ish-card');
 const style=document.createElement('style');
 style.textContent=[
  '#identityShieldQuickCard{box-sizing:border-box;min-width:0;padding:16px;border:1px solid #d3c3e5;border-radius:19px;background:linear-gradient(145deg,#f9f7fc,#eef8f4);color:#283542;font:inherit;}',
  '#identityShieldQuickCard *{box-sizing:border-box;}',
  '#identityShieldQuickCard .ish-head{display:flex;gap:14px;align-items:center;}',
  '#identityShieldQuickCard .ish-art{flex:none;display:block;width:76px;height:76px;border-radius:17px;object-fit:cover;}',
  '#identityShieldQuickCard .ish-kicker{font-size:12px;font-weight:800;color:#634582;letter-spacing:.06em;margin:0 0 3px;}',
  '#identityShieldQuickCard h2{font-size:22px;line-height:1.24;color:#392152;margin:0;}',
  '#identityShieldQuickCard .ish-summary{font-size:15px;line-height:1.58;margin:14px 0;color:#344550;}',
  '#identityShieldQuickCard .ish-state{font-size:14px;line-height:1.5;border:1px solid #c5d6d1;border-radius:13px;padding:11px 12px;background:#fff;margin:10px 0;}',
  '#identityShieldQuickCard .ish-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:11px 0;}',
  '#identityShieldQuickCard .ish-step{border:1px solid #d6dce4;background:#fff;border-radius:12px;padding:11px;min-width:0;}',
  '#identityShieldQuickCard .ish-step strong{display:block;font-size:15px;line-height:1.35;color:#3c2e52;margin-bottom:4px;}',
  '#identityShieldQuickCard .ish-step small{font-size:12px;line-height:1.5;color:#4d6471;display:block;}',
  '#identityShieldQuickCard .ish-title{font-size:17px;color:#392152;margin:18px 0 7px;}',
  '#identityShieldQuickCard .ish-sources{list-style:none;margin:0;padding:0;}',
  '#identityShieldQuickCard .ish-sources li{padding:11px 0;border-bottom:1px solid #d9e0e3;font-size:14px;line-height:1.5;}',
  '#identityShieldQuickCard .ish-sources a{color:#2e5076;text-decoration:underline;text-underline-offset:2px;font-weight:700;}',
  '#identityShieldQuickCard .ish-readback{display:block;font-size:12px;color:#4b6470;margin-top:3px;}',
  '#identityShieldQuickCard .ish-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}',
  '#identityShieldQuickCard .ish-action{border:1px solid #cab8df;border-radius:12px;background:#fff;padding:11px 12px;color:#4d306e;text-decoration:none;font:inherit;font-size:14px;font-weight:800;cursor:pointer;}',
  '#identityShieldQuickCard .ish-action:focus-visible{outline:3px solid #a379d0;outline-offset:2px;}',
  '#identityShieldQuickCard .ish-footer{font-size:12px;line-height:1.55;color:#596572;margin:13px 0 0;}',
  '@media(max-width:350px){#identityShieldQuickCard .ish-list{grid-template-columns:1fr;}#identityShieldQuickCard .ish-art{width:64px;height:64px;}#identityShieldQuickCard h2{font-size:19px;}}'
 ].join('\n');
 document.head.append(style);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const head=el('div','ish-head'),art=el('img','ish-art');
 art.src='/assets/identity-shield.svg?v=20261106-1';art.alt='Infinity Identity Shield lock and shield design';art.loading='lazy';
 const title=el('div');title.append(el('p','ish-kicker','INFINITY® · BUBBLES RESEARCH'),el('h2','','Infinity Identity Shield'));
 head.append(art,title);
 root.append(head,el('p','ish-summary','Protect your identity by connecting authorized alerts and records in one place. Today Bubbles is researching public protection guidance; personal credit, banking and Social Security data are not connected.'));
 const state=el('div','ish-state','Public-source research: awaiting first verified check. No identity monitoring is active.');
 state.setAttribute('role','status');state.setAttribute('aria-live','polite');
 root.append(state);
 const steps=el('div','ish-list');
 for(const [name,detail] of [
   ['Public-source research','First stage: check published SSA and FTC guidance, record evidence, flag changed pages for review.'],
   ['Credit and account alerts','Future: consented partner connections for inquiries, account changes and activity; no claimed alerts yet.'],
   ['SSA account protection','Future: owner-directed official my Social Security review, no credential sharing or account scraping.'],
   ['Security review','Future: independently audited encrypted vault and consent broker before any sensitive intake.']
 ]){
  const item=el('div','ish-step');item.append(el('strong','',name),el('small','',detail));steps.append(item);
 }
 root.append(steps,el('h3','ish-title','Official public research sources'));
 const names=[
  ['ssa-account','SSA · Account protection','https://www.ssa.gov/myaccount/'],
  ['ssa-statement','SSA · Earnings and statements','https://www.ssa.gov/myaccount/statement.html'],
  ['ftc-recovery','FTC · Identity theft recovery','https://www.identitytheft.gov/Steps'],
  ['ftc-freeze','FTC · Credit freeze information','https://www.identitytheft.gov/credit-freezes']
 ];
 const list=el('ul','ish-sources'),statuses=new Map();
 for(const [id,name,url] of names){
  const item=el('li');const a=el('a','',name);a.href=url;a.target='_blank';a.rel='noopener noreferrer';
  const status=el('span','ish-readback','Research check pending');statuses.set(id,status);item.append(a,status);list.append(item);
 }
 root.append(list);
 const actions=el('div','ish-actions'),refresh=el('button','ish-action','Refresh public research status');
 refresh.type='button';const settings=el('a','ish-action','Identity settings');
 settings.href='/bubbles-identity-settings.html';actions.append(refresh,settings);root.append(actions);
 root.append(el('p','ish-footer','Public-page changes are research signals, not proof of SSN misuse. The monitor cannot detect all uses of a Social Security number. No SSNs, documents, credentials or private transactions are sent by this card.'));
 const readable={
   pending:'Research check pending',ok:'Public source checked · no reviewed change',
   review_required:'Public page changed · review required',
   unavailable:'Source temporarily unavailable · no result'
 };
 const displayDate=value=>{
  const millis=typeof value==='string'?Date.parse(value):NaN;
  return Number.isFinite(millis)?new Date(millis).toLocaleString():'date unverified';
 };
 async function readback(){
  refresh.disabled=true;state.textContent='Reading the published public research receipt…';
  try{
   const response=await fetch('/data/identity-shield-research.json?v=20261106-1',{cache:'no-store',credentials:'omit'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const feed=await response.json();
   if(feed?.monitor_kind!=='public_policy_sources_only'||feed?.schema_version!==1||!Array.isArray(feed.sources))throw Error('invalid public research receipt');
   if(!feed.last_run_utc){state.textContent='Research monitor installed in source; first successful scheduled check not yet verified.';}
   else{
    const checked=feed.sources.filter(s=>s.status==='ok'||s.status==='review_required').length;
    state.textContent='Public-source research last ran '+displayDate(feed.last_run_utc)+' · '+checked+'/'+names.length+' sources reachable. This is not personal monitoring.';
   }
   for(const item of feed.sources){
    const status=statuses.get(item.id);
    if(!status)continue;
    const label=readable[item.status]||readable.unavailable;
    status.textContent=label+(item.last_success_utc?' · '+displayDate(item.last_success_utc):'');
   }
  }catch{
   state.textContent='Public research receipt unavailable. No monitoring result can be claimed.';
  }finally{refresh.disabled=false;}
 }
 refresh.addEventListener('click',readback);
 void readback();
}
