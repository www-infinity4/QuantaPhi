const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {classify,makeJobs,integrationBrief}=require('../bubbles-brain-actions.js');

test('spoken cross-widget integration requests become authorized owner work',()=>{
 for(const phrase of [
  'Bubbles, pull Infinity Radio into chat',
  'Bring the Infinity Radio player inside Bubbles',
  'Can you embed the radio widget into our conversation?',
  'Please wire the media player into the Bubbles interface'
 ])assert.equal(classify(phrase),'queue',phrase);
 for(const phrase of [
  'How does Infinity Radio work?',
  'Explain how a radio could be embedded in a chat',
  "Don't bring Infinity Radio into Bubbles",
  'Tell me about the Infinity Radio player'
 ])assert.equal(classify(phrase),'chat',phrase);
});

test('integration creates a source discovery and missing adapter contract',()=>{
 const phrase='Bubbles, pull Infinity Radio into chat';
 const brief=integrationBrief(phrase);
 const jobs=makeJobs(phrase,'www-infinity4/QuantaPhi');
 assert.equal(jobs.length,2);
 assert.ok(brief.includes('YELLOW: inspect'));
 assert.ok(brief.includes('GREEN: reuse'));
 assert.match(jobs[0].instructions,/Source-to-chat integration contract/);
 assert.match(jobs[0].instructions,/authorized target repository/);
 assert.match(jobs[0].instructions,/real playable\/control UI/);
 assert.match(jobs[1].instructions,/independently verify/);
 assert.deepEqual(jobs[1].dependencies,['TASK-1']);
 assert.equal(integrationBrief('Explain neural networks'), '');
});

test('native high-quality voice choice only activates when installed',()=>{
 const base='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
 const policy=fs.readFileSync(base+'InstalledVoicePolicy.java','utf8');
 const service=fs.readFileSync(base+'BubblesService.java','utf8');
 const picker=fs.readFileSync(base+'BubblesVoicePicker.java','utf8');
 assert.match(policy,/Voice\.QUALITY_HIGH/);
 assert.match(policy,/isNetworkConnectionRequired\(\)/);
 assert.match(policy,/"en"\.equals/);
 assert.match(policy,/high-quality engine voice/);
 assert.match(service,/if \(!selected\)\s*\{/);
 assert.match(service,/InstalledVoicePolicy\.bestOfflineEnglish\(tts\.getVoices\(\)\)/);
 assert.match(picker,/InstalledVoicePolicy\.description\(v\)/);
 for(const forbidden of ['OPENAI_API_KEY','GEMINI_API_KEY','getSimSerialNumber','getImei('])
  assert.ok(!policy.includes(forbidden),forbidden);
});