import {test} from 'node:test';
import assert from 'node:assert/strict';
import {jobQuant} from './job-quant.mjs';
test('one job revision has one record, retries preserve failures without financial minting',()=>{
 const receipt={ticketId:'T',jobId:'J',revision:'r',repository:'www-infinity4/QuantaPhi',job:{instructions:'repair',acceptance:['tested']},runUrl:'run1',status:'blocked',when:'now',verificationToken:'secret'};
 const first=jobQuant(receipt),retry=jobQuant({...receipt,status:'committed_unverified',testsPassed:true},first);
 assert.equal(first.id,retry.id);assert.equal(retry.attempts.length,1);assert.equal(retry.currencyValue,null);assert.ok(!JSON.stringify(retry).includes('secret'));
 const next=jobQuant({...receipt,runUrl:'run2'},retry);assert.equal(next.attempts.length,2);assert.equal(next.attempts[1].status,'blocked');
 assert.notEqual(jobQuant({...receipt,revision:'new'}).id,first.id);
});
