import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOUSING_QUICK_CARD,HOUSING_LINKS,HOUSING_DRAFT_KEY,normalizeIntake,validateIntake,housingPlan,intakeSummary,serializeHousingDraft,parseHousingDraft} from '../disability-housing-core.mjs';
import {lookupQuickCard,searchQuickCards} from '../quick-card-search-core.mjs';
import {safeLocalCardUrl} from '../quick-card-preview.mjs';
const raw=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base={goal:'buy',state:'IA',city:'Lovilia',householdSize:1,benefits:'ssdi',monthlyIncome:'963',age:'18-61'};
test('unknown amounts remain unknown, while a reported zero is preserved',()=>{
 assert.equal(normalizeIntake({monthlyIncome:''}).monthlyIncome,null);
 assert.equal(normalizeIntake({monthlyIncome:'0'}).monthlyIncome,0);
 assert.equal(normalizeIntake({monthlyIncome:'900',incomeUnknown:true}).monthlyIncome,null);
 assert.equal(validateIntake({...base,monthlyIncome:'',incomeUnknown:true},2).ok,true);
 assert.equal(validateIntake({...base,monthlyIncome:''},2).ok,false);
 for(const v of ['-1','abc','Infinity','1e100'])assert.equal(validateIntake({...base,monthlyIncome:v},2).ok,false);
});
test('the short intake validates location and household size without requesting sensitive identifiers',()=>{
 assert.equal(validateIntake(base,1).ok,true);assert.equal(validateIntake(base,2).ok,true);
 assert.equal(validateIntake({...base,state:'ZZ'},1).ok,false);
 assert.equal(validateIntake({...base,zip:'ABCDE'},1).ok,false);
 for(const householdSize of [0,-1,31,1.5,''])assert.equal(validateIntake({...base,householdSize},2).ok,false);
 assert.equal(validateIntake({...base,homePrice:-9},1).ok,false);
 const clean=normalizeIntake({...base,ssn:'DO-NOT-STORE',password:'DO-NOT-STORE',diagnosis:'DO-NOT-STORE'});
 assert.ok(!JSON.stringify(clean).includes('DO-NOT-STORE'));
});
test('benefit types route to exploration, never approval, a denial, or a guaranteed payment',()=>{
 for(const benefits of ['ssi','ssdi','both','unknown','none']){
  const p=housingPlan({...base,benefits,targetPayment:100});
  assert.equal(p.programs[0].id,'502');assert.equal(p.annualIncome,11556);
  assert.match(p.programs[0].body,/38 years/);assert.match(p.programs[0].note,/repayment ability/);
  assert.ok(!Object.hasOwn(p,'eligible'));assert.ok(!Object.hasOwn(p,'approved'));
  assert.ok(!Object.hasOwn(p,'monthlyPayment'));
 }
 assert.ok(housingPlan({...base,primary:'no'}).tasks.some(x=>/primary residence/.test(x)));
 assert.ok(housingPlan({...base,age:'under18'}).tasks.some(x=>/legal borrowing capacity/.test(x)));
});
test('repair assistance keeps ownership and age-62 grant boundaries separate from disability',()=>{
 const younger=housingPlan({...base,goal:'repair',ownsHome:'no'});
 assert.equal(younger.programs[0].id,'504');assert.match(younger.programs[0].body,/20 years/);
 assert.match(younger.programs[0].note,/Disability alone does not remove/);
 assert.ok(younger.tasks.some(x=>/renter cannot/.test(x)));
 const older=housingPlan({...base,goal:'repair',age:'62plus',ownsHome:'yes'});
 assert.match(older.programs[0].note,/may also be considered/);assert.match(older.programs[0].note,/\$10,000/);
 assert.equal(housingPlan({...base,goal:'rent'}).programs[0].id,'rental');
});
test('contacts change by selected state and goal instead of treating every visitor as an Iowa applicant',()=>{
 assert.equal(housingPlan(base).contact.phone,'515-284-4444');
 assert.equal(housingPlan({...base,state:'CA'}).contact.url,HOUSING_LINKS.offices);
 assert.equal(housingPlan({...base,goal:'rent'}).contact.url,HOUSING_LINKS.pha);
 for(const href of Object.values(HOUSING_LINKS)){const u=new URL(href);assert.equal(u.protocol,'https:');assert.ok(/\.gov$/.test(u.hostname));}
});
test('saved drafts sanitize input, reject corrupt schemas, and preserve the zero/unknown distinction',()=>{
 const d=parseHousingDraft(serializeHousingDraft({...base,monthlyIncome:0,name:'A\nB',ssn:'secret'}));
 assert.equal(d.monthlyIncome,0);assert.equal(d.name,'A B');assert.ok(!Object.hasOwn(d,'ssn'));
 assert.equal(parseHousingDraft('bad JSON'),null);assert.equal(parseHousingDraft('{"version":999,"data":{}}'),null);
 assert.equal(parseHousingDraft('{"version":1,"data":[]}'),null);
 assert.equal(parseHousingDraft(serializeHousingDraft({...base,incomeUnknown:true})).monthlyIncome,null);
});
test('downloaded intake is an honest complete reflection of entered data with fixed official handoffs',()=>{
 const summary=intakeSummary({...base,name:'Test Applicant',targetPayment:100,savings:0});
 for(const expected of ['Test Applicant','Lovilia','SSDI','$963.00','$11,556.00','$0.00','not a quote','$100.00','Not an official application','No information has been sent'])assert.ok(summary.includes(expected),expected);
 assert.ok(!summary.includes('undefined'));assert.ok(!summary.includes('NaN'));
 assert.match(intakeSummary({...base,incomeUnknown:true}),/Monthly household income before deductions: Not provided/);
});
test('housing is discoverable in QuantaPhi search, carousel, previews, and Bubbles without broadening private-page embedding',()=>{
 for(const query of ['disability housing','SSI housing','SSDI housing','USDA','buy a home on disability','home access'])assert.equal(searchQuickCards(query)[0]?.id,HOUSING_QUICK_CARD.id,query);
 assert.equal(searchQuickCards('Burger King')[0].id,'burger-king');
 assert.equal(lookupQuickCard('disability-housing').route,'/disability-housing.html');
 assert.equal(safeLocalCardUrl('/disability-housing.html'),'https://quantaphi.org/disability-housing.html');
 assert.equal(safeLocalCardUrl('/bubbles-accounts.html'),'');assert.equal(safeLocalCardUrl('https://evil.example/disability-housing.html'),'');
 assert.match(raw('index.html'),/id="disabilityHousingCard"/);
 assert.match(raw('oracle-card-deck.js'),/disabilityHousingCard:\['disability-housing'/);
 assert.match(raw('bubbles-card-catalog.mjs'),/app\('disability-housing'/);
});
test('housing UI has no sensitive input fields, external answer transmission, or public issue submission',()=>{
 const html=raw('disability-housing.html'),ui=raw('disability-housing.mjs');
 assert.doesNotMatch(html,/<input[^>]+(?:name|id)="(?:ssn|socialSecurity|password|bankAccount|diagnosis)"/i);
 assert.doesNotMatch(ui,/\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/);
 assert.doesNotMatch(ui,/issues\/new|api\.github\.com|document\.cookie|innerHTML/);
 assert.match(ui,/localStorage\.removeItem\(HOUSING_DRAFT_KEY\)/);
 assert.match(ui,/sessionStorage\.removeItem\(HOUSING_SESSION_KEY\)/);
 assert.match(html,/type="checkbox" id="haRemember"/);assert.ok(!html.includes('id="haRemember" checked'));
 assert.match(html,/name="referrer" content="no-referrer"/);
 assert.match(html,/property="og:image" content="https:\/\/quantaphi.org\/assets\/share\/disability-housing-card.png"/);
 assert.equal(HOUSING_DRAFT_KEY,'quantaphi:housing:saved:v1');
});
