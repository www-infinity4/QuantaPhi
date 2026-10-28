/* Integra · read-only Quick Card wiring audit.
 * Source URLs and user supplied evidence only: no secrets, no provider
 * logins, no browser session access, no release/deploy authority.
 */
import {identifyWiring,safeSourceUrl} from './quick-card-wiring.mjs';

export const INTEGRA_GMAIL='quantaphi.integra.ai@gmail.com';
export const INTEGRA_REVIEW_STATUS='validation-only';
export const INTEGRA_GMAIL_STATUS='owner-declared-unverified';

const check=(id,label,state,reason)=>({id,label,state,reason});
export function inspectCardSource(raw,{evidenceLink='',notes=''}={}){
 const u=safeSourceUrl(raw);
 if(!u) return {ok:false,error:'Source must be a credential-free HTTPS website URL. No private addresses, passwords or scripts.',checks:[],status:'invalid'};
 const sheet=identifyWiring(u.href);
 const evidence=safeSourceUrl(evidenceLink);
 const details=String(notes||'').trim().slice(0,700);
 const checks=[
  check('source','Valid source website','format-only','A credential-free HTTPS URL was parsed. Network ownership and response are not verified.'),
  check('provider','Provider identity',sheet.provider?'mapped':'needs-proof',sheet.provider?'Host matches an existing QuantaPhi provider descriptor. This does not establish a vendor partnership.':'Unknown website; independently inspect provider ownership before a branded card.'),
  check('login','Real sign-in route',sheet.providerLogin?'handoff-only':'needs-proof',sheet.providerLogin?'Sign-in goes directly to the provider. No account session is connected to Integra.':'Provider-owned sign-in URL has not been identified.'),
  check('embed','Permission to show original site','needs-proof','CSP/X-Frame-Options and current browser conditions need a real test. Do not remove website frame protections.'),
  check('private','Signed-in personal data','not-connected','A provider session cannot be read from an unrelated QuantaPhi origin. Approved connector/consent required.'),
  check('content','Media and reuse rights','needs-proof','Official links are not a license to copy songs, photos, copyrighted scripts or account data.'),
  check('results','Actual action and provenance','needs-proof','Record source URL, visible result, timestamp and explicit permission. No completion is inferred.'),
  check('wallet','Wallet and Star Coin receipts','needs-proof','Only a verified per-user ledger receipt can confirm a reward.'),
  check('deployment','Public deployment proof','needs-proof','GitHub commits and green tests alone do not prove the public site updated.'),
  check('integra-mail','Integra Gmail authorization','not-connected','Designated Gmail is owner-declared; this system has not verified a Gmail grant for that mailbox.'),
  check('release','Authority to execute or release','validation-only','Integra reviews evidence but cannot send, purchase, publish, approve deployments or modify other accounts.')
 ];
 return {schema:'infinity.integra-card-audit.v1',role:INTEGRA_REVIEW_STATUS,source:u.href,
  provider:sheet.provider,providerName:sheet.providerName,providerLogin:sheet.providerLogin,
  evidence:evidence?.href||null,notes:details||null,gmail:{address:INTEGRA_GMAIL,status:INTEGRA_GMAIL_STATUS,connected:false},
  status:'needs-evidence',checks};
}
const element=(tag,txt='',cls='')=>{const x=document.createElement(tag);x.textContent=txt;if(cls)x.className=cls;return x};
const statusNames={'format-only':'URL syntax passed','mapped':'Mapped source','handoff-only':'External sign-in','needs-proof':'Needs evidence','not-connected':'Not connected','validation-only':'Validation only'};
const official=(label,href)=>{
 const a=element('a',label,'iv-action');a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
};
export function mountIntegraAudit(doc=document){
 const form=doc.getElementById('ivForm');if(!form)return null;
 const source=doc.getElementById('ivSource'),evidence=doc.getElementById('ivEvidence'),notes=doc.getElementById('ivNotes');
 const summary=doc.getElementById('ivSummary'),list=doc.getElementById('ivChecks');
 const output=doc.getElementById('ivJSON'),copy=doc.getElementById('ivCopy'),open=doc.getElementById('ivOpen');
 const email=doc.getElementById('ivMail'),mailStatus=doc.getElementById('ivMailStatus');
 const selected=new URLSearchParams(location.search).get('source');
 if(selected&&safeSourceUrl(selected))source.value=selected;
 else source.value='https://www.starmakerstudios.com/en/songs';
 email.textContent=INTEGRA_GMAIL;
 mailStatus.textContent='Mailbox owner-declared · not connected to the QuantaPhi validator';
 let current=null;
 function render(){
  current=inspectCardSource(source.value,{evidenceLink:evidence.value,notes:notes.value});
  list.replaceChildren();output.value=JSON.stringify(current,null,2);
  open.hidden=!current.ok;
  if(!current.ok){summary.textContent=current.error;return;}
  open.href=current.source;
  const count=current.checks.filter(x=>x.state==='needs-proof'||x.state==='not-connected').length;
  summary.textContent=(current.providerName||'Unmapped source')+' · '+count+' evidence/connection checks remain open. No approval or API access is granted.';
  for(const item of current.checks){
   const row=element('div','','iv-check');
   const text=element('div','','iv-check-text');
   text.append(element('strong',item.label),element('p',item.reason));
   row.append(text,element('span',statusNames[item.state]||'Review','iv-state'));
   list.append(row);
  }
 }
 form.addEventListener('submit',event=>{event.preventDefault();render();});
 copy.addEventListener('click',async()=>{
  if(!current)return;
  try{
   await navigator.clipboard.writeText(output.value);
   summary.textContent='Integra read-only audit JSON copied. This is not an approval or a deployment receipt.';
  }catch{
   output.focus();output.select();summary.textContent='Select and copy the audit JSON manually.';
  }
 });
 render();
 return {render};
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountIntegraAudit(),{once:true});
 else mountIntegraAudit();
}
