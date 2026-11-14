import test from 'node:test';
import assert from 'node:assert/strict';
import {IDENTITY_SETTING_LINKS,DOCUMENT_KINDS,redactPreview,sessionReadiness} from '../bubbles-identity-settings-core.mjs';
test('official SSA benefit-letter action and existing QuantaPhi settings are present',()=>{
 assert.equal(new URL(IDENTITY_SETTING_LINKS.ssa).hostname,'www.ssa.gov');
 assert.equal(IDENTITY_SETTING_LINKS.connections,'/bubbles-accounts.html');
 assert.equal(IDENTITY_SETTING_LINKS.security,'/robot-brain-account-security.html');
 assert.equal(IDENTITY_SETTING_LINKS.housing,'/disability-housing.html');
});
test('document inventory includes requested identity, benefits, housing and finance materials',()=>{
 for(const k of ['government_id','social_security_card','proof_of_address','ssi_award','ssdi_award','income_letter','bank_statement','financial_statement','business_document','credit_card']){
  assert.ok(DOCUMENT_KINDS.some(x=>x.id===k),k);
 }
 assert.equal(new Set(DOCUMENT_KINDS.map(x=>x.id)).size,DOCUMENT_KINDS.length);
});
test('preview omits direct identifiers and does not pretend identity was verified',()=>{
 const p=redactPreview({name:'Alex Example',business:'Example LLC',phone:'555-123-4567',
  ssn:'123-45-6789',dob:'1990-04-01',routing:'000000000',bankAccount:'1234567890',creditCard:'4111111111111111',
  householdSize:'2',income:'1234.50',assets:'5000',benefits:'ssi'});
 assert.equal(p.name,'Alex Example');assert.equal(p.business,'Example LLC');assert.equal(p.householdSize,2);
 assert.equal(p.benefits,'ssi');
 assert.ok(!JSON.stringify(p).includes('123-45-6789'));
 assert.ok(!JSON.stringify(p).includes('4111111111111111'));
 assert.ok(!JSON.stringify(p).includes('1234567890'));
 assert.equal('dob' in p,false);assert.equal('ssn' in p,false);
 assert.equal(p.verified_21,false);
});
test('readiness is a document planning guide, never validation of real identity',()=>{
 const x=sessionReadiness(['government_id','proof_of_address','ssi_award']);
 assert.equal(x.selected,3);
 assert.equal(x.verified,false);
 assert.equal(x.uploaded,false);
 assert.equal(sessionReadiness(['government_id','government_id']).selected,1);
});
test('actual page includes no SSN collection input or client-side storage scripts',async()=>{
 const fs=await import('node:fs/promises');
 const page=await fs.readFile(new URL('../bubbles-identity-settings.html',import.meta.url),'utf8');
 const js=await fs.readFile(new URL('../bubbles-identity-settings.mjs',import.meta.url),'utf8');
 const home=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 const deck=await fs.readFile(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 const links=await fs.readFile(new URL('../bubbles-accounts.html',import.meta.url),'utf8');
 assert.match(page,/bubblesIdentityWorkspace/);
 assert.match(js,/sessionReadiness/);
 assert.match(home,/id="bubblesIdentitySettingsCard"/);
 assert.match(deck,/bubblesIdentitySettingsCard/);
 assert.match(links,/bubbles-identity-settings\.html/);
 for(const x of [page,js]) {
  assert.doesNotMatch(x,/type="password"[^>]*name="ssn"/i);
  assert.doesNotMatch(x,/localStorage|sessionStorage|indexedDB|sendBeacon|gtag\(/);
 }
});

test('session preview supports additional ordinary identity and contact planning fields',()=>{
 const p=redactPreview({preferredName:'Kris',email:'owner@example.test',city:'Des Moines',region:'IA',postalCode:'50309',country:'United States',
  name:'Example Person',householdSize:'2',benefits:'unknown'});
 assert.equal(p.preferredName,'Kris');
 assert.equal(p.email,'owner@example.test');
 assert.equal(p.city,'Des Moines');
 assert.equal(p.region,'IA');
 assert.equal(p.postalCode,'50309');
 assert.equal(p.country,'United States');
 assert.equal(p.verified_21,false);
 assert.match(p.note,/not saved or transmitted/);
});
test('session preview suppresses SSNs and payment cards accidentally pasted into ordinary fields',()=>{
 const p=redactPreview({name:'123-45-6789',preferredName:'123456789',business:'4111 1111 1111 1111',email:'owner@example.test',phone:'555-1212'});
 for(const field of ['name','preferredName','business'])assert.equal(p[field],'');
 assert.equal(p.email,'owner@example.test');
 assert.equal(p.sensitiveInputRejected,true);
 assert.ok(!JSON.stringify(p).includes('123-45-6789'));
 assert.ok(!JSON.stringify(p).includes('4111 1111 1111 1111'));
});
test('identity settings have a useful session-only profile flow with a visible verification hold',async()=>{
 const fs=await import('node:fs/promises');
 const page=await fs.readFile(new URL('../bubbles-identity-settings.html',import.meta.url),'utf8');
 const ui=await fs.readFile(new URL('../bubbles-identity-settings.mjs',import.meta.url),'utf8');
 for(const field of ['preferredName','email','city','region','postalCode','country']){
  assert.match(page,new RegExp('name="'+field+'"'));
  assert.match(ui,new RegExp("p\\."+field));
 }
 assert.match(page,/Identity verification is not enabled/);
 assert.match(ui,/sensitiveInputRejected/);
 assert.doesNotMatch(page,/<input[^>]+name="ssn"/i);
 assert.doesNotMatch(page,/<input[^>]+type="file"/i);
 assert.doesNotMatch(ui,/fetch\s*\(|localStorage|sessionStorage|indexedDB/);
});
