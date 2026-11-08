import test from 'node:test';
import assert from 'node:assert/strict';
import {OWNER_SYSTEMS, ownerCardReady, sanitizeOwnerPhoto, ownerCtaUrl} from '../owner-engineer-core.mjs';
test('owner card describes each key system distinctly without misrepresenting monetary status',()=>{
 const ids=OWNER_SYSTEMS.map(x=>x.id);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['quantaphi','bubbles','search','unified-wallet','star-coin','quants','infinity-omni-tokens'])assert.ok(ids.includes(id),id);
 assert.ok(OWNER_SYSTEMS.every(x=>x.summary.length>20));
 assert.ok(OWNER_SYSTEMS.some(x=>x.id==='unified-wallet'&&/separate/i.test(x.summary)));
});
test('portrait must be a reviewed, actual image before developer publicity card is displayed',()=>{
 assert.equal(ownerCardReady({imageLoaded:false,rights:'owner-approved'}),false);
 assert.equal(ownerCardReady({imageLoaded:true,rights:'pending'}),false);
 assert.equal(ownerCardReady({imageLoaded:true,rights:'owner-approved'}),true);
});
test('owner photo path and GPT viewer are first-party routes',()=>{
 assert.equal(sanitizeOwnerPhoto('/assets/gpt-art/gpt-owner-engineer.webp'),'/assets/gpt-art/gpt-owner-engineer.webp');
 assert.equal(sanitizeOwnerPhoto('https://bad.example/me.jpg'),'');
 assert.equal(ownerCtaUrl(),'/creator-gpt-handoff.html');
});
