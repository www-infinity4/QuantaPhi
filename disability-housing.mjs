import {STATES,HOUSING_LINKS,HOUSING_QUICK_CARD,HOUSING_DRAFT_KEY,HOUSING_SESSION_KEY,normalizeIntake,validateIntake,housingPlan,intakeSummary,serializeHousingDraft,parseHousingDraft,money,stateName} from './disability-housing-core.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';
import {mountHousingHelpAround} from './housing-help-cards.mjs';
const $=id=>document.getElementById(id),form=$('haForm');
const make=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
const external=(label,url)=>{const a=make('a','',label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';return a;};
let step=1,timer=null,hasDraft=false;
const status=value=>{$('haStatus').textContent=value;};
for(const [id,name] of STATES){const o=make('option','',name);o.value=id;$('haState').append(o);}
function read(){const raw=Object.fromEntries(new FormData(form));raw.incomeUnknown=$('haIncomeUnknown').checked;return raw;}
function apply(data){
 for(const [key,value] of Object.entries(data)){
  const field=form.elements.namedItem(key);if(!field)continue;
  if(key==='goal')field.value=value;
  else if(field.type==='checkbox')field.checked=value===true;
  else field.value=value??'';
 }
 syncGoal();syncIncome();
}
function syncGoal(){const goal=read().goal;$('haOwnerWrap').hidden=goal!=='repair';$('haPrimaryWrap').hidden=goal!=='buy';}
function syncIncome(){$('haIncome').disabled=$('haIncomeUnknown').checked;}
function load(key){try{return parseHousingDraft(window[key===HOUSING_SESSION_KEY?'sessionStorage':'localStorage'].getItem(key));}catch{return null;}}
function save(){
 hasDraft=true;
 const value=serializeHousingDraft(read());let tabSaved=true;
 try{sessionStorage.setItem(HOUSING_SESSION_KEY,value);}catch{tabSaved=false;}
 if($('haRemember').checked){
  try{localStorage.setItem(HOUSING_DRAFT_KEY,value);status('Draft saved in this browser. It has not been submitted.');}
  catch{$('haRemember').checked=false;status('This browser could not save a draft. Download your summary before leaving.');}
 }else if(!tabSaved)status('Tab storage is unavailable. Download your summary before leaving.');
}
const saved=load(HOUSING_DRAFT_KEY),tab=load(HOUSING_SESSION_KEY);
if(tab||saved){hasDraft=true;apply(tab||saved);$('haRemember').checked=Boolean(saved);$('haRestore').textContent='Your housing draft is restored. Review your answers, then continue.';$('haRestore').hidden=false;}
else{
 const params=new URLSearchParams(location.search),initial={};
 if(['buy','repair','rent'].includes(params.get('goal')))initial.goal=params.get('goal');
 if(STATES.some(([id])=>id===params.get('state')))initial.state=params.get('state');
 if(Object.keys(initial).length)apply(normalizeIntake(initial));
}
const housingHelp=mountHousingHelpAround(document.querySelector('.ha-panel'),{state:read().state,goal:read().goal});
function showStep(next){
 step=next;
 for(const el of document.querySelectorAll('[data-ha-step]'))el.hidden=Number(el.dataset.haStep)!==step;
 for(const [i,li] of [...document.querySelectorAll('.ha-progress li')].entries()){
  const number=i+1;li.classList.toggle('ha-done',number<step);
  if(number===step)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');
  li.querySelector('span').textContent=number<step?'✓':String(number);
 }
 $('haStepLabel').textContent='STEP '+step+' OF 3';
 $('haStepTitle').textContent=step===1?'What would help you most?':step===2?'A little about your household.':'Your next step starts here.';
 form.hidden=step===3;$('haResults').hidden=step!==3;$('haBack').hidden=step!==2;
 $('haNext').textContent=step===1?'Continue →':'Prepare my housing plan →';
 $('haFormError').textContent='';$('haStepTitle').focus({preventScroll:true});
 $('haStepTitle').scrollIntoView({block:'start',behavior:'auto'});
}
function showErrors(errors){
 for(const n of form.querySelectorAll('[aria-invalid]'))n.removeAttribute('aria-invalid');
 for(const n of form.querySelectorAll('[data-error]'))n.textContent='';
 const names=Object.keys(errors);
 for(const key of names){
  const field=form.elements.namedItem(key),label=form.querySelector('[data-error="'+key+'"]');
  if(field?.setAttribute){field.setAttribute('aria-invalid','true');if(label){label.id='haError-'+key;field.setAttribute('aria-errormessage',label.id);}field.closest('details')?.setAttribute('open','');}
  if(label)label.textContent=errors[key];
 }
 if(names.length){$('haFormError').textContent='Please check the highlighted answer'+(names.length===1?'':'s')+'.';form.elements.namedItem(names[0])?.focus();}
}
function renderPlan(){
 const plan=housingPlan(read()),d=plan.data;
 $('haResultFacts').replaceChildren(make('span','',stateName(d.state)),make('span','',(d.householdSize??'?')+' household member'+(d.householdSize===1?'':'s')),
  make('span','',d.monthlyIncome===null?'Income to add later':money(d.monthlyIncome)+' / month, before adjustments'));
 const programs=$('haPrograms');programs.replaceChildren();
 for(const p of plan.programs){
  const section=make('article','ha-program');section.dataset.program=p.id;
  section.append(make('p','ha-eyebrow',p.tag),make('h3','',p.title),make('p','',p.body),make('p','ha-program-note',p.note));
  const links=make('div','ha-program-links');for(const [label,url] of p.links)links.append(external(label,url));section.append(links);programs.append(section);
 }
 $('haTasks').replaceChildren(...plan.tasks.map(t=>make('li','',t)));
 const contact=$('haContact'),p=plan.contact;contact.replaceChildren(make('h3','',p.label));
 if(p.phone){const phone=make('a','',p.phone);phone.href='tel:+1'+p.phone.replace(/\D/g,'');contact.append(phone);}
 if(p.email){const email=make('a','',p.email);email.href='mailto:'+p.email;contact.append(email);}
 contact.append(external(p.phone?'Office details':'Open official contact directory',p.url));
 $('haPrintSummary').textContent=intakeSummary(d);
}
form.addEventListener('submit',event=>{
 event.preventDefault();const validation=validateIntake(read(),step);showErrors(validation.errors);
 if(!validation.ok)return;
 save();if(step===2){renderPlan();showStep(3);}else showStep(2);
});
$('haBack').addEventListener('click',()=>showStep(1));
$('haEdit').addEventListener('click',()=>showStep(1));
form.addEventListener('input',()=>{hasDraft=true;syncGoal();syncIncome();clearTimeout(timer);timer=setTimeout(save,250);});
form.addEventListener('change',event=>{hasDraft=true;syncGoal();syncIncome();clearTimeout(timer);save();
 if(['state','goal'].includes(event.target.name))housingHelp.update({state:read().state,goal:read().goal});
});
$('haRemember').addEventListener('change',()=>{
 clearTimeout(timer);
 if($('haRemember').checked)save();
 else{
  try{localStorage.removeItem(HOUSING_DRAFT_KEY);status('Saved draft deleted. Your current answers remain in this tab.');}
  catch{status('This browser could not delete its saved draft. Clear this site’s browser data to remove it.');}
 }
});
window.addEventListener('pagehide',()=>{clearTimeout(timer);if(hasDraft)save();});
$('haDownload').addEventListener('click',()=>{
 const blob=new Blob([intakeSummary(read())],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=make('a');
 link.href=url;link.download='QuantaPhi-Housing-Intake.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 status('Summary download requested. Keep the file private; it contains your answers.');
});
$('haCopy').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(intakeSummary(read()));status('Your intake summary is copied. Paste it only where you intend to share your answers.');}
 catch{status('Clipboard unavailable. Use Download summary or Print / save PDF.');}
});
$('haPrint').addEventListener('click',()=>{$('haPrintSummary').textContent=intakeSummary(read());window.print();});
const dialog=$('haClearDialog');
$('haClear').addEventListener('click',()=>{dialog.showModal();$('haCancelClear').focus();});
$('haCancelClear').addEventListener('click',()=>dialog.close());
$('haConfirmClear').addEventListener('click',()=>{
 clearTimeout(timer);hasDraft=false;let removed=true;
 try{sessionStorage.removeItem(HOUSING_SESSION_KEY);}catch{removed=false;}
 try{localStorage.removeItem(HOUSING_DRAFT_KEY);}catch{removed=false;}
 form.reset();$('haRemember').checked=false;$('haRestore').hidden=true;syncGoal();syncIncome();housingHelp.update({state:'',goal:'buy'});
 $('haPrograms').replaceChildren();$('haTasks').replaceChildren();$('haPrintSummary').textContent='';showErrors({});dialog.close();showStep(1);
 status(removed?'Your answers and saved draft have been cleared.':'Answers cleared on screen. Browser storage could not be cleared; remove this site’s browser data.');
});
if(new URLSearchParams(location.search).has('preview'))document.body.classList.add('ha-in-preview');
mountCardActions($('haCardActions'),HOUSING_QUICK_CARD,{showPreview:false,websiteReader:false,showOriginal:false});
syncGoal();syncIncome();
