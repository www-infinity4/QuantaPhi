'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const page = fs.readFileSync('bubbles.html','utf8');
const chat = fs.readFileSync('bubbles-ai.js','utf8');
const browser = fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
const worker = fs.readFileSync('workers/bubbles-cloud-browser/worker.mjs','utf8');

test('public Bubbles entry and chat handoff buttons stay hidden until verified owner',()=>{
 assert.match(page,/class="bubbles-chatgpt-entry"[^>]*hidden style="display:none"/);
 assert.match(page,/\.bubbles-chatgpt-entry\[hidden\]/);
 assert.ok(chat.includes("quick.hidden=true;quick.style.display='none';"));
 assert.ok(chat.includes("window.addEventListener('bubbles:owner-ready',revealVerifiedOwnerGPT)"));
 assert.ok(chat.includes('if(headers?.Authorization)revealVerifiedOwnerGPT();'));
 assert.ok(chat.includes("top.hidden=false;top.style.removeProperty('display');"));
});

test('cloud-browser GPT grant stays hidden while owner is unverified',()=>{
 assert.ok(browser.includes("bridge.hidden=true;bridge.style.display='none';"));
 assert.ok(browser.includes('if(headers?.Authorization){bridge.hidden=false'));
 assert.match(worker,/if\(!\(await owner\(request,env\)\)\)return respond\(origin,\{ok:false,error:'owner_authorization_required'\},403\)/);
 assert.match(worker,/if\(path==='\/v1\/browser\/chatgpt\/permission'\)/);
});

test('no public page can issue an owner one-time code or grant itself a signed runner identity',()=>{
 assert.ok(!page.includes('/owner/pair/create'));
 assert.ok(worker.includes("if(origin||request.method!=='POST')"));
 assert.ok(worker.includes("authenticateBridge(request)"));
});
