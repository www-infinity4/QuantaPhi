const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('bubbles-ai.js','utf8');
const brain=fs.readFileSync('bubbles-brain-actions.js','utf8');
const android=fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/VoiceCaptureCommands.java','utf8');
test('spoken create RecordB the repo resolves to an explicit repository creation',()=>{
 const start=source.indexOf('const createRepository='),end=source.indexOf('const directRequest=',start);
 assert.ok(start>0&&end>start);
 const expr=source.slice(start+'const createRepository='.length,end).trim().replace(/;$/,'');
 const match=new Function('request','return ('+expr+');');
 for(const q of ['create RecordB the repo','create a repo named RecordB','Create a GitHub repository called RecordB','build RecordB repo'])assert.equal(match(q),true,q);
 assert.equal(match('create a card in RecordB repo'),false);
 assert.match(source,/repository_already_exists/);
 assert.match(brain,/'recordb':'www-infinity4\/RecordB'/);
});
test('Bubbles mounts RecordB controls inside Android chat using existing capture command queue',()=>{
 assert.match(source,/if\(nativeOverlay&&!embedded\)/);
 assert.match(source,/import\('\/recordb-card\.mjs\?v=20261020-recordb1'\)/);
 assert.match(source,/mountRecordBCard\(\{document,container:chatScroll,before:conversation,native:true/);
 assert.match(source,/nativeCaptureRequests\.push\(command\)/);
 assert.match(source,/recordBController\?\.update\(capture\)/);
 assert.match(source,/drainNativeCaptureRequest:/);
 assert.match(android,/new Command\("screen_pause"/);
 assert.match(android,/new Command\("screen_resume"/);
 assert.match(android,/new Command\("screen_video"/);
});

test('RecordB follow-up coding requests resolve to the RecordB repo before generic Bubbles work',()=>{
 const target="if(/\\brecord\\s?b\\b/i.test(request))repository='www-infinity4/RecordB';";
 const fallback="if(githubCheck||coderRequest||/\\b(?:bubbles|owner[- ]approval)\\b/i.test(request))repository='www-infinity4/QuantaPhi';";
 assert.ok(source.includes(target),'named RecordB target is recognized');
 assert.ok(source.indexOf(target)<source.indexOf(fallback),'RecordB wins over generic Bubbles fallback');
});
