import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptIdentityEvidence,decryptIdentityEvidence,subjectKey,canApproveAge,adultAt,eligibilityFromRecord} from '../workers/identity-vault/security.mjs';
import worker from '../workers/identity-vault/index.mjs';

const key=Buffer.from(Uint8Array.from({length:32},(_,i)=>i+1)).toString('base64');
const hmac=Buffer.from(Uint8Array.from({length:32},(_,i)=>255-i)).toString('base64');
const dob='1990-12-31';
test('AES-256-GCM stores sensitive evidence as authenticated ciphertext, never plaintext',async()=>{
 const input={name:'Test Example',dob,ssn:'123-45-6789',document_number:'ABC123'};
 const sealed=await encryptIdentityEvidence(input,key,{subject:'user-A',evidenceId:'case-1'});
 assert.equal(sealed.algorithm,'AES-256-GCM');
 assert.ok(!JSON.stringify(sealed).includes(input.ssn));
 assert.ok(!JSON.stringify(sealed).includes(input.name));
 assert.deepEqual(await decryptIdentityEvidence(sealed,key,{subject:'user-A',evidenceId:'case-1'}),input);
 await assert.rejects(()=>decryptIdentityEvidence(sealed,key,{subject:'user-B',evidenceId:'case-1'}));
 const modified={...sealed,ciphertext_b64:sealed.ciphertext_b64.slice(0,-2)+'AA'};
 await assert.rejects(()=>decryptIdentityEvidence(modified,key,{subject:'user-A',evidenceId:'case-1'}));
});
test('identity record keys are HMAC pseudonyms; no raw subject in database lookup key',async()=>{
 const a=await subjectKey('authenticated-person-1',hmac);
 const b=await subjectKey('authenticated-person-2',hmac);
 assert.match(a,/^[a-f0-9]{64}$/);assert.notEqual(a,b);
 assert.equal(a,await subjectKey('authenticated-person-1',hmac));
 assert.ok(!a.includes('authenticated-person'));
});
test('Bubbles cannot verify from a birthday, SSN, last four digits, or self-assertion alone',()=>{
 const base={evidence_validated:true,holder_bound:true,birthdate_validated:true,
   reviewer_approved:true,method:'internal_document_review',date_of_birth:'1990-12-31'};
 assert.equal(canApproveAge(base,'2026-11-01'),true);
 for(const missing of ['evidence_validated','holder_bound','birthdate_validated','reviewer_approved']){
  assert.equal(canApproveAge({...base,[missing]:false},'2026-11-01'),false);
 }
 assert.equal(canApproveAge({...base,method:'ssn_only'},'2026-11-01'),false);
 assert.equal(canApproveAge({...base,method:'self_attested'},'2026-11-01'),false);
 assert.equal(canApproveAge({...base,date_of_birth:'2010-12-31'},'2026-11-01'),false);
 assert.equal(canApproveAge({...base,date_of_birth:'not-a-date'},'2026-11-01'),false);
});
test('21st birthday uses calendar dates; no early activation',()=>{
 assert.equal(adultAt('2005-11-02','2026-11-01'),false);
 assert.equal(adultAt('2005-11-01','2026-11-01'),true);
 assert.equal(adultAt('2005-10-31','2026-11-01'),true);
});
test('verified account assertion requires a live nonrevoked record',()=>{
 const row={verification_status:'verified_21',proof_kind:'infinity_verified',
  verified_at:'2026-11-01T00:00:00Z',expires_at:'2026-11-10T00:00:00Z'};
 assert.equal(eligibilityFromRecord(row,Date.parse('2026-11-02T12:00:00Z')).verified_over_21,true);
 assert.equal(eligibilityFromRecord({...row,verification_status:'pending'},Date.parse('2026-11-02T12:00:00Z')),null);
 assert.equal(eligibilityFromRecord({...row,verification_status:'revoked'},Date.parse('2026-11-02T12:00:00Z')),null);
 assert.equal(eligibilityFromRecord({...row,expires_at:'2026-11-01T01:00:00Z'},Date.parse('2026-11-02T12:00:00Z')),null);
});
test('private Worker never accepts public DOB/SSN assertions as age proof or serves PII',async()=>{
 const r=await worker.fetch(new Request('https://vault.internal/v1/session/eligibility',{headers:{'X-Age':'21','X-SSN-Last4':'6789','Cookie':'session=fake'}}),{});
 assert.equal(r.status,503);assert.ok(!JSON.stringify(await r.json()).includes('6789'));
 const bad=await worker.fetch(new Request('https://vault.internal/v1/internal/verify',{method:'POST',body:'{"verified":true}'}),{});
 assert.equal(bad.status,404);
});
