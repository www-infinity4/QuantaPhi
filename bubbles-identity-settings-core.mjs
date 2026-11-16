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
const unsafeIdentifier=/\b\d{3}[- ]?\d{2}[- ]?\d{4}\b|\b(?:\d[ -]?){12,18}\d\b/;
const money=v=>typeof v==='string'&&/^(?:\d{1,8})(?:\.\d{0,2})?$/.test(v.trim())?Number(v):null;
export function redactPreview(raw={}){
 let sensitiveInputRejected=false;
 const ordinary=(v,max=140)=>{
  if(typeof v!=='string')return '';
  const text=v.replace(/[\u0000-\u001f\u007f]/g,' ').trim();
  if(unsafeIdentifier.test(text)){sensitiveInputRejected=true;return ''}
  return text.slice(0,max);
 };
 const email=ordinary(raw.email,140);
 const household=Number(raw.householdSize);
 const profile={
  name:ordinary(raw.name,100),
  preferredName:ordinary(raw.preferredName,100),
  business:ordinary(raw.business,120),
  phone:ordinary(raw.phone,28),
  email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'',
  city:ordinary(raw.city,90),
  region:ordinary(raw.region,80),
  postalCode:ordinary(raw.postalCode,18),
  country:ordinary(raw.country,80)
 };
 return {
  ...profile,
  householdSize:Number.isInteger(household)&&household>=1&&household<=30?household:null,
  monthlyIncome:money(raw.income),estimatedAssets:money(raw.assets),
  benefits:['ssi','ssdi','both','other','none','unknown'].includes(raw.benefits)?raw.benefits:'unknown',
  sensitiveInputRejected,
  verified_21:false,
  note:'Unverified session-only worksheet; not saved or transmitted.'
 };
}
export function sessionReadiness(selected=[]){
 const allowed=new Set(DOCUMENT_KINDS.map(x=>x.id));
 const unique=new Set((Array.isArray(selected)?selected:[]).filter(x=>allowed.has(x)));
 return {selected:unique.size,total:DOCUMENT_KINDS.length,verified:false,uploaded:false};
}
