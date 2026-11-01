/* No remote scripts, persistent browser storage, tracking, uploads or file reads.
 * This is a short-lived planning UI, NOT a credential collection service. */
import {DOCUMENT_KINDS,sessionReadiness,redactPreview} from './bubbles-identity-settings-core.mjs';
const root=document.getElementById('bubblesIdentityWorkspace');
if(root){
 const docHost=root.querySelector('#identityDocumentChecklist');
 const docCount=root.querySelector('#identityDocumentCount');
 const form=root.querySelector('#identityPlanningForm'),preview=root.querySelector('#identityProfileOutput');
 const selected=new Set();
 const groups=[['identity','Identification & address'],['benefits','Benefits & disability'],['income','Income & assets'],['housing','Housing'],['business','Business'],['financial','Payment connections']];
 const status=()=>{
  const progress=sessionReadiness([...selected]);
  docCount.textContent=progress.selected+' of '+progress.total+' document types marked ready · not uploaded or verified';
 };
 for(const [group,title] of groups){
  const entries=DOCUMENT_KINDS.filter(x=>x.group===group);if(!entries.length)continue;
  const section=document.createElement('fieldset');section.className='is-check-group';
  const legend=document.createElement('legend');legend.textContent=title;section.append(legend);
  for(const row of entries){
   const label=document.createElement('label');label.className='is-check';
   const input=document.createElement('input');input.type='checkbox';input.value=row.id;
   input.addEventListener('change',()=>{if(input.checked)selected.add(row.id);else selected.delete(row.id);status()});
   const text=document.createElement('span');text.textContent=row.label;label.append(input,text);section.append(label);
  }docHost.append(section);
 }
 root.querySelector('#identityClearChecklist')?.addEventListener('click',()=>{
  selected.clear();for(const c of docHost.querySelectorAll('input[type=checkbox]'))c.checked=false;status();
 });
 const outputRow=(target,label,value)=>{
  const line=document.createElement('div');line.className='is-output-row';
  const a=document.createElement('strong');a.textContent=label;
  const b=document.createElement('span');b.textContent=String(value??'Not provided');
  line.append(a,b);target.append(line);
 };
 form?.addEventListener('submit',event=>{
  event.preventDefault();const vals=Object.fromEntries(new FormData(form).entries());
  const p=redactPreview(vals);preview.replaceChildren();
  outputRow(preview,'Name',p.name||'Not provided');
  outputRow(preview,'Business',p.business||'Not provided');
  outputRow(preview,'Phone',p.phone||'Not provided');
  outputRow(preview,'Household',p.householdSize);
  outputRow(preview,'Monthly income',p.monthlyIncome===null?'Not provided':'$'+p.monthlyIncome.toFixed(2));
  outputRow(preview,'Estimated assets',p.estimatedAssets===null?'Not provided':'$'+p.estimatedAssets.toFixed(2));
  outputRow(preview,'Benefit type',p.benefits);
  outputRow(preview,'Verification','NOT VERIFIED · session-only preview');
 });
 form?.addEventListener('reset',()=>{preview.replaceChildren()});
 status();
}
