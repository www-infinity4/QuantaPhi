/* Independent housing intake preparation. No underwriting, filing, or benefit decision. */
export const HOUSING_VERSION=1;
export const HOUSING_CHECKED='2026-10-29';
export const HOUSING_SESSION_KEY='quantaphi:housing:tab:v1';
export const HOUSING_DRAFT_KEY='quantaphi:housing:saved:v1';
export const HOUSING_LINKS=Object.freeze({
 purchase:'https://www.rd.usda.gov/programs-services/single-family-housing-programs/direct-home-loans',
 repair:'https://www.rd.usda.gov/programs-services/single-family-housing-programs/single-family-housing-repair-loans-grants',
 eligibility:'https://eligibility.sc.egov.usda.gov/eligibility/welcomeAction.do',
 assessment:'https://eligibility.sc.egov.usda.gov/eligibility/welcomeAction.do?pageAction=assessmentType',
 income:'https://www.rd.usda.gov/files/RD-DirectLimitMap.pdf',
 application:'https://forms.sc.egov.usda.gov/eForms/welcomeAction.do?Home',
 purchaseForm:'https://forms.sc.egov.usda.gov/efcommon/eFileServices/eForms/RD410-4.PDF',
 offices:'https://www.rd.usda.gov/contact-us/state-office-contacts',
 iowa:'https://www.rd.usda.gov/ia/iowa-contacts',
 pha:'https://www.hud.gov/contactus/public-housing-contacts',
 voucher:'https://www.hud.gov/helping-americans/public-indian-housing-hcv-homeownership',
 rental:'https://www.hud.gov/helping-americans/housing-choice-vouchers-tenants',
 benefitIncome:'https://www.rd.usda.gov/files/3550-1chapter04.pdf'
});
export const HOUSING_QUICK_CARD=Object.freeze({
 id:'disability-housing',name:'Disability Housing · Home Access',kind:'Housing assistance',category:'Housing',
 feature:'Prepare a housing intake with SSI or SSDI income',
 description:'A short, private intake for home purchase, home repairs, and rental assistance. Save a summary and continue with official agencies.',
 official:HOUSING_LINKS.purchase,route:'/disability-housing.html',internal:true,
 shareImage:'/assets/share/disability-housing-card.png',
 shareDescription:'Home Access on QuantaPhi: a simple housing intake for people with disabilities. Explore USDA and HUD programs and prepare your next step.'
});
export const HOUSING_ALIASES=Object.freeze(['disability housing','disabled housing','housing for disabled','housing on disability','disability home loan','usda housing','usda home loan','ssi housing','ssdi housing','home access','housing assistance','disability-housing']);
export const STATES=Object.freeze([
 ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],['PR','Puerto Rico'],['VI','U.S. Virgin Islands'],['GU','Guam'],['AS','American Samoa'],['MP','Northern Mariana Islands']
]);
const oneOf=(value,values,fallback)=>values.includes(value)?value:fallback;
const text=(value,max=120)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
const amount=value=>value===null||value===undefined||String(value).trim()===''?null:
 Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=10000000?Math.round(Number(value)*100)/100:null;
export function normalizeIntake(raw={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
 const n=Number(raw.householdSize??1);
 return {goal:oneOf(raw.goal,['buy','repair','rent'],'buy'),state:STATES.some(([id])=>id===raw.state)?raw.state:'',
  city:text(raw.city,80),county:text(raw.county,80),zip:/^\d{5}$/.test(raw.zip||'')?raw.zip:'',
  age:oneOf(raw.age,['under18','18-61','62plus','unknown'],'unknown'),
  householdSize:Number.isInteger(n)&&n>=1&&n<=30?n:null,
  benefits:oneOf(raw.benefits,['ssi','ssdi','both','other','none','unknown'],'unknown'),
  incomeUnknown:raw.incomeUnknown===true,monthlyIncome:raw.incomeUnknown===true?null:amount(raw.monthlyIncome),
  ownsHome:oneOf(raw.ownsHome,['yes','no','unknown'],'unknown'),
  primary:oneOf(raw.primary,['yes','no','unknown'],'yes'),
  name:text(raw.name,100),property:text(raw.property,180),
  homePrice:amount(raw.homePrice),monthlyDebts:amount(raw.monthlyDebts),savings:amount(raw.savings),
  targetPayment:amount(raw.targetPayment),currentPayment:amount(raw.currentPayment)};
}
export function validateIntake(raw,step=1){
 const data=normalizeIntake(raw),errors={};
 if(step===1){
  if(!data.state)errors.state='Choose the state or territory where you want housing.';
  if(raw.zip&&!/^\d{5}$/.test(raw.zip))errors.zip='Enter a five-digit ZIP code, or leave it blank.';
 }else{
  if(data.householdSize===null)errors.householdSize='Enter 1 to 30 people.';
  if(!data.incomeUnknown&&data.monthlyIncome===null)errors.monthlyIncome='Enter a monthly amount, including zero, or choose “I will add income later.”';
 }
 for(const key of ['homePrice','monthlyDebts','savings','targetPayment','currentPayment']){
  if(raw[key]!==undefined&&raw[key]!==null&&String(raw[key]).trim()!==''&&amount(raw[key])===null)errors[key]='Use an amount from 0 to 10,000,000, without dollar signs or commas.';
 }
 return {ok:!Object.keys(errors).length,data,errors};
}
export const stateName=value=>STATES.find(([id])=>id===value)?.[1]||'Not provided';
export const money=value=>value===null||value===undefined?'Not provided':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
export function housingPlan(input){
 const d=normalizeIntake(input),programs=[],tasks=[];
 if(d.goal==='buy'){
  programs.push({id:'502',title:'USDA Section 502 Direct',tag:'Explore a rural home purchase',
   body:'A home purchase loan for qualifying households in eligible rural areas. Terms are usually 33 years; 38 years may be available. Payment assistance may reduce the effective interest rate to 1%. A down payment is typically not required.',
   note:'USDA must verify income, credit, repayment ability, property eligibility, and available funding. Taxes and insurance affect the total payment. Some subsidy may need to be repaid when you sell or move.',
   links:[['Check the property',HOUSING_LINKS.eligibility],['Check income limits',HOUSING_LINKS.income],['USDA self-assessment',HOUSING_LINKS.assessment],['Official USDA application',HOUSING_LINKS.application],['Official application form',HOUSING_LINKS.purchaseForm]]});
  if(d.primary==='no')tasks.push('USDA Section 502 requires you to live in the home as your primary residence. Tell USDA about your intended use.');
  if(d.age==='under18')tasks.push('Ask the agency about legal borrowing capacity and whether an eligible adult applicant is needed.');
  tasks.push('Confirm the exact property is rural-eligible and within the area loan limit.','Have USDA verify household income, repayment ability, and any payment assistance.');
  programs.push({id:'hcv-own',title:'Housing voucher homeownership',tag:'Ask your local housing agency',
   body:'If you already participate in Housing Choice Vouchers, ask whether your agency offers help with homeownership costs. This option is not offered by every agency and has separate requirements.',
   note:'A local agency must confirm participation, eligibility, counseling, and financing. This guide does not reserve a voucher or a home.',
   links:[['Find my housing agency',HOUSING_LINKS.pha],['Official program information',HOUSING_LINKS.voucher]]});
 }else if(d.goal==='repair'){
  const grant=d.age==='62plus';
  programs.push({id:'504',title:'USDA Section 504 Home Repair',tag:grant?'Ask about a loan and a possible grant':'Explore a home repair loan',
   body:'Repair loans can be up to $40,000 at 1% interest over 20 years. The applicant must own and live in an eligible rural home, meet household income requirements, and be unable to obtain affordable credit elsewhere.',
   note:grant?'Applicants age 62 or older may also be considered for grants up to $10,000 for health and safety work, subject to very-low-income and other requirements. A grant may need repayment if the home is sold within three years.':
    'Repair grants require age 62 or older and additional eligibility conditions. Disability alone does not remove that age requirement. These funds do not buy a house.',
   links:[['Official repair program and forms',HOUSING_LINKS.repair],['Check the property',HOUSING_LINKS.eligibility],['Check income limits',HOUSING_LINKS.income]]});
  if(d.ownsHome!=='yes')tasks.push('Section 504 requires an applicant who owns and occupies the home. Confirm ownership with USDA; a renter cannot use it to buy the property.');
  tasks.push('Ask USDA to confirm which repairs and loan or grant options are eligible.','Obtain written repair estimates when the agency requests them.');
 }else{
  programs.push({id:'rental',title:'Local housing and rental assistance',tag:'Find an agency serving your location',
   body:'Public housing and Housing Choice Vouchers can help eligible households, including people with disabilities. A local housing agency handles eligibility and applications.',
   note:'Ask about accessible housing, reasonable accommodations, and open waiting lists. Availability and processing times vary; a referral is not a placement.',
   links:[['Find my housing agency',HOUSING_LINKS.pha],['Official rental assistance',HOUSING_LINKS.rental]]});
  tasks.push('Ask the local housing agency which waiting lists are accepting applications.','Request an accessible application process or housing accommodation if needed.');
 }
 if(d.monthlyIncome===null)tasks.push('Add current monthly household income before an official eligibility assessment.');
 tasks.push('Gather current benefit letters, other household income records, identification, and requested financial documents.','Review the completed official forms before personally signing, authorizing credit checks, or submitting.');
 return {data:d,programs,tasks,annualIncome:d.monthlyIncome===null?null:Math.round(d.monthlyIncome*1200)/100,
  contact:d.state==='IA'&&d.goal!=='rent'?{label:'Iowa USDA housing team',phone:'515-284-4444',email:'IowaHomeLoans@usda.gov',url:HOUSING_LINKS.iowa}:
   {label:d.goal==='rent'?'Find your local housing agency':'Find your USDA state office',url:d.goal==='rent'?HOUSING_LINKS.pha:HOUSING_LINKS.offices}};
}
export function intakeSummary(input){
 const p=housingPlan(input),d=p.data;
 const benefits={ssi:'SSI',ssdi:'SSDI',both:'SSI and SSDI',other:'Other disability benefits',none:'No disability benefit income',unknown:'Not provided'};
 const lines=['QUANTAPHI HOME ACCESS - HOUSING INTAKE SUMMARY','Prepared by the visitor. Not an official application, eligibility decision, or approval.','',
  'Goal: '+({buy:'Buy a home',repair:'Repair a home',rent:'Find rental assistance'}[d.goal]),
  'Applicant name (optional): '+(d.name||'Not provided'),'State or territory: '+stateName(d.state),
  'City / county / ZIP: '+([d.city,d.county,d.zip].filter(Boolean).join(' / ')||'Not provided'),
  'Property address or listing (optional): '+(d.property||'Not provided'),
  'Age range: '+({under18:'Under 18','18-61':'18-61', '62plus':'62 or older',unknown:'Not provided'}[d.age]),
  'Household members: '+(d.householdSize??'Not provided'),'Benefit type: '+benefits[d.benefits],
  'Monthly household income before deductions: '+money(d.monthlyIncome),
  'Annual income (monthly x 12, before program adjustments): '+money(p.annualIncome),
  'Own and occupy the home to repair: '+d.ownsHome,'Intend primary residence: '+d.primary,
  'House price (optional): '+money(d.homePrice),'Monthly debt payments (optional): '+money(d.monthlyDebts),
  'Savings (optional): '+money(d.savings),'Current monthly housing payment (optional): '+money(d.currentPayment),
  'Requested total monthly housing budget (not a quote): '+money(d.targetPayment),'',
  'PROGRAMS TO DISCUSS - NO ELIGIBILITY DECISION'];
 for(const program of p.programs)lines.push(program.title,program.body,program.note,...program.links.map(([title,url])=>title+': '+url),'');
 lines.push('NEXT STEPS',...p.tasks.map((t,i)=>(i+1)+'. '+t),'',p.contact.label,p.contact.phone||'',p.contact.email||'',p.contact.url,'',
  'No information has been sent to an agency by this guide. Use the agency-approved process for sensitive documents. Never add SSNs, passwords, bank account numbers, or medical records here.',
  'Program sources checked '+HOUSING_CHECKED+'. Current terms, eligibility, funding and timing must be confirmed by the agency.');
 return lines.filter(x=>x!==undefined).join('\n');
}
export function serializeHousingDraft(raw){return JSON.stringify({version:HOUSING_VERSION,data:normalizeIntake(raw)});}
export function parseHousingDraft(value){
 try{const record=JSON.parse(value);return record?.version===HOUSING_VERSION&&record.data&&typeof record.data==='object'&&!Array.isArray(record.data)?normalizeIntake(record.data):null;}catch{return null;}
}
