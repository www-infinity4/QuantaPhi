'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {needsOmniCode,omniCodeBrief,makeJobs}=require('../bubbles-brain-actions.js');
test('Omni Code Phi source is carried into Bubbles and authenticated builder jobs',()=>{
 assert.equal(needsOmniCode('Build a website with Omni Code'),true);
 assert.equal(needsOmniCode('Tell me a joke'),false);
 const brief=omniCodeBrief('Build a website with Omni Code');
 assert.match(brief,/www-infinity4\/Omni-Phi/);
 assert.match(brief,/workshop-orchestrator\.js/);
 assert.match(brief,/RED macro\/root reconciles YELLOW/);
 assert.match(brief,/BLUE import\/dependency decisions/);
 assert.match(brief,/opaque-origin component previews/);
 const jobs=makeJobs('Build a website using Omni Code on QuantaPhi');
 assert.equal(jobs.length,2);
 assert.equal(jobs[0].agent,'greenbeans');
 assert.equal(jobs[1].agent,'pink-panther');
 assert.ok(jobs[0].team.includes('blueberry'));
 assert.match(jobs[0].instructions,/Approved Omni Code reference skill/);
 assert.match(jobs[0].instructions,/GREEN writes through the authorized repository engine/);
 assert.deepEqual(jobs[1].dependencies,['TASK-1']);
 assert.ok(jobs.every(j=>j.repository==='www-infinity4/QuantaPhi'));
 assert.doesNotMatch(makeJobs('Repair the QuantaPhi player')[0].instructions,/Approved Omni Code reference skill/);
 const source=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(source,/brainTools\?\.omniCodeBrief\?\.\(request\)/);
 let assets;
 for(const path of ['index.html','bubbles.html','bubbles/index.html']){
  const html=fs.readFileSync(path,'utf8');
  const current=[html.match(/bubbles-ai\.js\?v=([^"\s]+)/)?.[1],html.match(/bubbles-brain-actions\.js\?v=([^"\s]+)/)?.[1]];
  assert.ok(current.every(Boolean),'both versioned scripts must be loaded');
  if(assets)assert.deepEqual(current,assets,'entry pages must load the same versioned integrations');
  assets=current;
 }
});
