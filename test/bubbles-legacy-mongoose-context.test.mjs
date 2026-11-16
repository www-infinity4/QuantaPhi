import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyCartContextFor} from '../workers/bubbles-tools/worker.mjs';
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
