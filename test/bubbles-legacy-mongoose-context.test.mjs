import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyCartContextFor,historicalCartRecall,chooseTool} from '../workers/bubbles-tools/worker.mjs';
import {readFileSync} from 'node:fs';

test('Bubbles contextualizes historical mongoose.os C13b0 carts without claiming source access',()=>{
 const context=legacyCartContextFor('Look up mongoose.os C13b0 carts and our Python scripts');
 assert.match(context,/cart\*\.py/);
 assert.match(context,/infinity-treasury/);
 assert.match(context,/not readable/);
 assert.match(context,/exclude tokens, research, secrets and big folders/);
 assert.match(context,/Do NOT tell the owner to clone the entire large repo/);
 assert.match(context,/isolated cloud Python\/Linux/);
});
test('Mongoose name collision is explicit and does not confuse ESP32 firmware with carts',()=>{
 const c=legacyCartContextFor('What were the mongoose database and cart scripts used for?');
 assert.match(c,/Cesanta Mongoose OS firmware/);
 assert.match(c,/MongoDB Mongoose/);
 assert.equal(legacyCartContextFor('Explain how a Home Assistant ESP32 relay works'),'');
 assert.equal(legacyCartContextFor('Explain photosynthesis'),'');
});
test('routine requests cannot retrieve owner-only history through this static context',()=>{
 const context=legacyCartContextFor('Can you recover the cardci mean scripts?');
 assert.match(context,/historical description, not a live GitHub read/);
 assert.doesNotMatch(context,/Bearer [A-Za-z0-9]+/);
});
test('Bubbles applies bounded context to primary and retry prompts',()=>{
 const source=readFileSync(new URL('../workers/bubbles-tools/worker.mjs',import.meta.url),'utf8');
 assert.match(source,/legacySourceContext=legacyCartContextFor\(userRequest\)/);
 assert.equal((source.match(/legacySourceContext\?\[\{role:'system'/g)||[]).length,2);
});

test('historical C13b0 carts are answered from bounded project context before semantic search',()=>{
 const q='Bubbles, I mean our old mongoose.os C13b0 cart*.py and cart*.sh scripts, not ESP32 firmware. What can you verify about this library now, and how should you inventory just its carts without cloning the entire repo?';
 assert.equal(chooseTool(q),'oracle.chat');
 assert.equal(historicalCartRecall(q),true);
 assert.equal(historicalCartRecall('Can you find the latest weather?'),false);
 assert.equal(historicalCartRecall('Search the web for historical mongoose carts'),false);
 assert.equal(historicalCartRecall('Our old C13b0 cart scripts: browse the web for updated documentation'),false);
 assert.equal(historicalCartRecall('Read https://github.com/www-infinity4/C13b0/blob/main/README.md to compare to our older cart scripts'),false);
 assert.equal(historicalCartRecall('Explain Mongoose ODM for MongoDB'),false);
});
test('Bubbles only suppresses ungrounded semantic search, never registered explicit tools',()=>{
 const text=readFileSync(new URL('../workers/bubbles-tools/worker.mjs',import.meta.url),'utf8');
 assert.match(text,/tool==='oracle\.chat'&&!isSourceDraftRequest\(question\)&&!historicalCartRecall\(question\)/);
 assert.equal(chooseTool('Bubbles, read README.md in GitHub repository www-infinity4/QuantaPhi'),'github.read_file');
});
