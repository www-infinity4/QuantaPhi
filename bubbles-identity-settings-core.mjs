/* Infinity Bubbles Identity Settings — user-controlled planning contract.
 * No SSN, bank number, card number, password or government ID is collected
 * by this public UI. Protected server-side intake is not activated yet. */
export const IDENTITY_SETTING_LINKS=Object.freeze({
 ssa:'https://www.ssa.gov/manage-benefits/get-benefit-letter',
 security:'/robot-brain-account-security.html',
 connections:'/bubbles-accounts.html',
 housing:'/disability-housing.html',
 bubbles:'/bubbles.html',
 home:'/'
});
export const DOCUMENT_KINDS=Object.freeze([
 {id:'government_id',label:'Photo ID / state identification',group:'identity'},
 {id:'social_security_card',label:'Social Security card',group:'identity'},
 {id:'proof_of_address',label:'Recent utility bill / proof of address',group:'identity'},
 {id:'ssi_award',label:'SSI benefit verification / award letter',group:'benefits'},
 {id:'ssdi_award',label:'SSDI benefit verification / award letter',group:'benefits'},
 {id:'income_letter',label:'Proof of income / employer letter',group:'income'},
 {id:'bank_statement',label:'Bank statement',group:'income'},
 {id:'financial_statement',label:'Assets / financial statements',group:'income'},
 {id:'business_document',label:'Business license / company documents',group:'business'},
 {id:'credit_card',label:'Payment card information (link only; no card numbers here)',group:'financial'},
 {id:'tax_return',label:'Income tax return',group:'income'},
 {id:'lease_mortgage',label:'Lease / mortgage documentation',group:'housing'},
 {id:'disability_document',label:'Disability / eligibility documents',group:'benefits'}
].map(x=>Object.freeze(x)));
const plain=(v,n=140)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const money=v=>typeof v==='string'&&/^(?:\d{1,8})(?:\.\d{0,2})?$/.test(v.trim())?Number(v):null;
export function redactPreview(raw={}){
 const household=Number(raw.householdSize);
 return {
  name:plain(raw.name,100),business:plain(raw.business,120),
  phone:plain(raw.phone,28),
  householdSize:Number.isInteger(household)&&household>=1&&household<=30?household:null,
  monthlyIncome:money(raw.income),estimatedAssets:money(raw.assets),
  benefits:['ssi','ssdi','both','other','none','unknown'].includes(raw.benefits)?raw.benefits:'unknown',
  verified_21:false,
  note:'Unverified session-only worksheet; not saved or transmitted.'
 };
}
export function sessionReadiness(selected=[]){
 const allowed=new Set(DOCUMENT_KINDS.map(x=>x.id));
 const unique=new Set((Array.isArray(selected)?selected:[]).filter(x=>allowed.has(x)));
 return {selected:unique.size,total:DOCUMENT_KINDS.length,verified:false,uploaded:false};
}
