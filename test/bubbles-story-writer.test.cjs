'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=pathName=>fs.readFileSync(path.join(__dirname,'..',pathName),'utf8');

test('QuantaPhi mounts Bubbles beside Media Star and loads all versioned assets',()=>{
 const html=source('index.html');
 const order=['/phi-story-writer.js?','/bubbles-ai.js?'].map(k=>html.indexOf(k));
 assert.ok(order.every(i=>i>0),'Both scripts load');
 assert.ok(order[0]<order[1]);
 assert.ok(html.includes('/bubbles-ai.css?'));
 assert.ok(html.includes('/phi-story-writer.css?'));
 assert.match(html,/id="bubblesAICard"/);
 assert.ok(html.indexOf('id="mediaStarCreator"')<html.indexOf('id="bubblesAICard"'));
 assert.ok(html.includes('href="#bubblesAICard"'));
});

test('image-to-story flow inspects real picture bytes; no filename-based story guessing',()=>{
 const writer=source('phi-story-writer.js'),adapter=source('phi-visual-render.js'),css=source('phi-story-writer.css');
 assert.doesNotThrow(()=>new vm.Script(writer));
 assert.match(writer,/upload\.accept='image\/jpeg,image\/png,image\/webp'/);
 assert.match(writer,/MAX_SOURCE_BYTES=10\*1024\*1024/);
 assert.match(writer,/const sourceFile=\$\('#sw-source-image'\)\.files\?\.\[0\]\|\|null/);
 assert.match(writer,/await prepareSource\(sourceFile\)/);
 assert.match(writer,/window\.PhiVisualRender\.inspect\(prepared\)/);
 assert.match(writer,/visualEvidence\.length<25/);
 assert.match(writer,/visualEvidence\?'This source image/);
 assert.match(writer,/await picture\('source:'\+id,prepared\)/);
 assert.match(writer,/showOriginal\(id\)/);
 assert.match(writer,/void illustrate\(active\)/);
 assert.match(adapter,/async function inspect\(file\)/);
 assert.match(adapter,/jsonResponse\('\/v1\/image-read'/);
 assert.match(css,/\.sw-source-preview/);
 assert.doesNotMatch(writer,/Image name: '\+sourceFile\.name/);
});

test('Bubbles has real AI chat and opt-in browser speech rather than simulated replies',()=>{
 const code=source('bubbles-ai.js'),css=source('bubbles-ai.css');
 assert.doesNotThrow(()=>new vm.Script(code));
 assert.match(code,/\/v1\/chat/);
 assert.match(code,/await fetch\(AI/);
 assert.match(code,/if\(!response\.ok\|\|json\.ok===false\)throw/);
 assert.match(code,/window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/);
 assert.match(code,/recognition\.onresult/);
 assert.match(code,/new SpeechSynthesisUtterance/);
 assert.match(code,/if\(config\.voice/);
 assert.match(code,/config\.role/);
 assert.match(code,/localStorage\.setItem/);
 assert.match(css,/position:fixed/);
 assert.match(css,/\.ba-messages/);
});

test('Bubbles never impersonates account sign-in or grants unverified repository rights',()=>{
 const code=source('bubbles-ai.js');
 assert.match(code,/account access require separate provider authorization/);
 assert.match(code,/You have NO independent GitHub write authorization/);
 assert.match(code,/await fetch\(BRAIN\+'\/health'/);
 assert.match(code,/if\(response\.ok\)\{ownerToken=token;ownerReady=true;workButton\.hidden=false/);
 assert.match(code,/workButton\.addEventListener\('click'/);
 assert.match(code,/context:\{kind:'bubbles-approved-work'/);
 assert.match(code,/No confirmed ticket/);
 assert.match(code,/does not mean code was changed, merged or deployed/);
 assert.doesNotMatch(code,/github\.com\/login\/oauth\/authorize\?/);
 assert.doesNotMatch(code,/https:\/\/api\.github\.com\/repos\/.*\/contents/);
 assert.doesNotMatch(code,/ANTHROPIC_API_KEY|OPENAI_API_KEY|ghp_/);
});

test('existing StarCoin ledger and no-refresh artwork behavior are untouched by new features',()=>{
 const writer=source('phi-story-writer.js'),bubbles=source('bubbles-ai.js');
 assert.match(writer,/window\.QuantaStarCredit\?\.\('star'/);
 assert.match(writer,/window\.QuantaStarCredit\?\.\('collect'/);
 assert.match(writer,/window\.QuantaStarCredit\?\.\('share'/);
 assert.doesNotMatch(bubbles,/QuantaStarCredit|mintQuant|mintToken/);
});
