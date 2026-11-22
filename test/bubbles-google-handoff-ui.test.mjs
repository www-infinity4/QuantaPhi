import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync('bubbles-ai.js','utf8');
test('Bubbles privacy panel offers explicit private backup and manual Gemini text handoff',()=>{
 assert.match(src,/Download encrypted account backup/);
 assert.match(src,/Download Gemini handoff text/);
 assert.match(src,/Include QuantaPhi searches/);
 assert.match(src,/googleGeminiBackupStatus/);
 assert.match(src,/google-gemini-handoff\.mjs/);
 assert.match(src,/exportCurrentScope\(/);
 assert.match(src,/readVerifiedWalletSearches/);
 assert.match(src,/sealUserArchive/);
 assert.match(src,/toGeminiText/);
});
test('Bubbles Gemini handoff never silently posts chats, searches or wallet tokens to Google',()=>{
 const start=src.indexOf('async function downloadGoogleHandoff(');
 const end=src.indexOf('longMemory?.onUpdate(',start);
 assert.ok(start>0&&end>start);
 const code=src.slice(start,end);
 assert.doesNotMatch(code,/fetch\(['"]https:\/\/(?:gemini|www\.google|drive\.google)/i);
 assert.doesNotMatch(code,/googleapis\.com\/upload|localStorage\.setItem\(.*passphrase/);
 assert.match(code,/window\.confirm\(/);
 assert.match(code,/new Blob\(/);
});
