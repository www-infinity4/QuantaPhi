import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectCardSource,INTEGRA_GMAIL,INTEGRA_GMAIL_STATUS} from '../integra-validation.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('Integra recognizes StarMaker public source without manufacturing approval or Gmail access',()=>{
 const result=inspectCardSource('https://www.starmakerstudios.com/en/songs');
 assert.equal(result.ok,true);
 assert.equal(result.provider,'starmaker');
 assert.equal(result.providerLogin,'https://www.starmakerstudios.com/en/web-login');
 assert.equal(result.gmail.address,'quantaphi.integra.ai@gmail.com');
 assert.equal(result.gmail.connected,false);
 assert.equal(result.gmail.status,'owner-declared-unverified');
 assert.equal(result.status,'needs-evidence');
 assert.equal(result.checks.find(x=>x.id==='private').state,'not-connected');
 assert.equal(result.checks.find(x=>x.id==='release').state,'validation-only');
 assert.equal(result.checks.find(x=>x.id==='embed').state,'needs-proof');
});
test('Dangerous URLs and impersonating hostnames cannot unlock privileged source status',()=>{
 for(const input of ['http://example.com','javascript:alert(1)','https://user:pass@starmakerstudios.com','https://localhost/']){
  assert.equal(inspectCardSource(input).ok,false,input);
 }
 const fake=inspectCardSource('https://starmakerstudios.com.attacker.example/account');
 assert.equal(fake.ok,true);
 assert.equal(fake.provider,null);
 assert.equal(fake.providerLogin,null);
 assert.equal(fake.checks.find(x=>x.id==='provider').state,'needs-proof');
});
test('An externally pasted PR link remains a reference, not verification',()=>{
 const result=inspectCardSource('https://github.com/www-infinity4/QuantaPhi',{evidenceLink:'https://github.com/www-infinity4/QuantaPhi/pull/1147',notes:'User says this is deployed'});
 assert.equal(result.evidence,'https://github.com/www-infinity4/QuantaPhi/pull/1147');
 assert.equal(result.checks.find(x=>x.id==='deployment').state,'needs-proof');
 assert.equal(result.checks.find(x=>x.id==='results').state,'needs-proof');
 assert.equal(result.notes,'User says this is deployed');
});
test('Integra card is accessible from Bubbles and the existing wiring study, with honest status language',()=>{
 const page=read('integra-validation.html');
 assert.match(page,/Integra checks the wires/);
 assert.match(page,/id="ivSource"/);
 assert.match(page,/id="ivJSON"/);
 assert.match(page,/id="ivMailStatus"/);
 assert.match(page,/href="https:\/\/mail\.google\.com\//);
 assert.match(page,/mailbox|Mailbox/);
 assert.match(read('bubbles-card-catalog.mjs'),/integra-validator.*Integra/);
 assert.match(read('quick-card-wiring.html'),/Open Integra validation card/);
 assert.equal(INTEGRA_GMAIL,'quantaphi.integra.ai@gmail.com');
 assert.equal(INTEGRA_GMAIL_STATUS,'owner-declared-unverified');
 assert.doesNotMatch(read('integra-validation.mjs'),/getUserMedia|localStorage\.setItem|Authorization:|fetch\(/);
});
