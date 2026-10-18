import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=readFileSync(new URL('../workers/infinity-brain-clock/wrangler.toml',import.meta.url),'utf8');
const serviceEntries=[...config.matchAll(/\[\[services\]\]([\s\S]*?)(?=\[\[|\n\[|$)/g)].map(m=>m[1]);
const field=(body,key)=>body.split('\n').filter(l=>!l.trim().startsWith('#'))
 .map(l=>l.match(new RegExp('^\\s*'+key+'\\s*=\\s*"([^"]+)"\\s*$')))
 .find(Boolean)?.[1]||null;
test('MODELS points to actual BrainModels entrypoint, wallet retains its production default',()=>{
 const byName=new Map(serviceEntries.map(x=>[field(x,'binding'),x]));
 assert.equal(byName.size,2);
 assert.equal(field(byName.get('MODELS'),'service'),'infinity-rogers');
 assert.equal(field(byName.get('MODELS'),'environment'),'production');
 assert.equal(field(byName.get('MODELS'),'entrypoint'),'BrainModels');
 assert.equal(field(byName.get('BOT_WALLET'),'service'),'unified-wallet');
 assert.equal(field(byName.get('BOT_WALLET'),'environment'),'production');
 assert.equal(field(byName.get('BOT_WALLET'),'entrypoint'),null);
});
test('incremental worker release preserves deployed binding topology and owner identity',()=>{
 assert.match(config,/^keep_vars\s*=\s*true$/m);
 assert.match(config,/^\[\[d1_databases\]\]$/m);
 assert.match(config,/^binding = "WORK_DB"$/m);
 assert.match(config,/^\[\[durable_objects\.bindings\]\]$/m);
 assert.match(config,/^name = "CLOCK"$/m);
 assert.match(config,/^class_name = "BrainClock"$/m);
 assert.match(config,/^\[ai\]\s*\nbinding = "WRITER_AI"$/m);
 assert.match(config,/^\[secrets\]\s*\nrequired = \["BOT_WORK_SECRET"\]$/m);
 assert.doesNotMatch(config,/^\[\[vectorize\]\]$/m,'Vectorize is a separate approved migration, not part of this binding-identical release');
});
