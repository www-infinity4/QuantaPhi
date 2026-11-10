import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../work-control.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
const sandbox={URL,console,module:{exports:{}},globalThis:null};
sandbox.globalThis=sandbox;
new vm.Script(scripts[0],{filename:'work-control-core.js'}).runInNewContext(sandbox);
const {deriveGates,validateImport}=sandbox.QuantaCore;
const ticket=(extra={})=>({id:'T1',title:'Evidence test',repo:'www-infinity4/QuantaPhi',evidence:[],github:null,...extra});

test('the standalone evidence board contains a readable Android-first navigation and consent-safe gates',()=>{
  assert.match(html,/name="viewport"/);
  assert.match(html,/prefers-reduced-motion/);
  assert.match(html,/Evidence before completion/);
  for(const label of ['Work tickets','Repository radar','Failure','Color desks','Evidence ledger','Release'])assert.ok(html.includes(label),label);
  assert.ok(scripts.length>=2,'all JavaScript is bundled in one document');
  scripts.forEach((script,i)=>assert.doesNotThrow(()=>new vm.Script(script,{filename:'embedded-'+i+'.js'})));
});
test('a ticket without evidence remains proposed',()=>{
  const gates=deriveGates(ticket());
  assert.equal(gates.proposed.level,'planned');
  for(const stage of ['source','tested','ci','review','merge','deployment','browser'])assert.equal(gates[stage].level,'none');
});
test('manual deployment and browser links cannot be independently confirmed',()=>{
  const sha='a'.repeat(40);
  const gates=deriveGates(ticket({evidence:[
    {gate:'deployment',source:'manual',result:'pass',url:'https://example.org/release',sha,deploymentId:'rel-42'},
    {gate:'browser',source:'manual',result:'pass',url:'https://example.org/proof',sha,device:'Android'}
  ]}));
  assert.equal(gates.deployment.level,'recorded');
  assert.equal(gates.browser.level,'recorded');
});
test('exact-head GitHub CI cannot imply production deployment',()=>{
  const sha='b'.repeat(40);
  const gates=deriveGates(ticket({github:{headSha:sha,prUrl:'https://github.com/www-infinity4/QuantaPhi/pull/1',changedFiles:['a.js'],checks:{sha,items:[{status:'completed',conclusion:'success'}]},reviewers:[]}}));
  assert.equal(gates.source.level,'confirmed');
  assert.equal(gates.ci.level,'confirmed');
  assert.equal(gates.deployment.level,'none');
  assert.equal(gates.browser.level,'none');
});
test('stale CI cannot confirm a newer source head',()=>{
  const gates=deriveGates(ticket({github:{headSha:'c'.repeat(40),changedFiles:['a.js'],checks:{sha:'d'.repeat(40),items:[{status:'completed',conclusion:'success'}]},reviewers:[]}}));
  assert.equal(gates.ci.level,'none');
});
test('import cannot carry GitHub verification forward',()=>{
  const input={schema:1,tickets:[{id:'T1',title:'Imported ticket',repo:'www-infinity4/QuantaPhi',github:{headSha:'a'.repeat(40),changedFiles:['a.js']},evidence:[]}]};
  const out=validateImport(input);
  assert.equal(deriveGates(out.tickets[0]).source.level,'none');
});
