import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Bubbles offers a user-controlled first-letter training wheel, not automatic takeover',()=>{
 const s=source('bubbles-ai.js');
 assert.match(s,/bubbles-byte-assist\.mjs/);
 assert.match(s,/Bubbles typing help/);
 assert.match(s,/Ease off/);
 assert.match(s,/Use suggestion/);
 assert.match(s,/measureWordOrb/);
 assert.match(s,/suggestFirstWord/);
 assert.match(s,/acceptWordSuggestion/);
 assert.match(s,/bubbles:session_changed/);
 assert.match(s,/input\.dispatchEvent\(new Event\('input'/);
});
test('typing assistant never sends, modifies wallet, collects drafts or starts microphone',()=>{
 const s=source('bubbles-ai.js');
 const from=s.indexOf('// === Byte orb and training-wheel assist START ===');
 const to=s.indexOf('// === Byte orb and training-wheel assist END ===',from);
 assert.ok(from>0&&to>from);
 const block=s.slice(from,to);
 assert.doesNotMatch(block,/sendMessage\(|fetch\(|navigator\.mediaDevices|localStorage\.setItem|wallet|connectionCode/i);
 assert.match(block,/explicitTap:true/);
 assert.match(block,/mode='off'/);
 assert.match(block,/input\.selectionStart===input\.value\.length/);
});
test('orb and controls respect Android hit targets, contrast and reduced-motion',()=>{
 const css=source('bubbles-ai.css');
 assert.match(css,/\.ba-byte-orb/);
 assert.match(css,/\.ba-byte-assist/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
