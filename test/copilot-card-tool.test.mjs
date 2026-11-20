import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COPILOT_URL,cleanCopilotPrompt} from '../copilot-card-tool.mjs';
const launcher=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
const moduleSource=readFileSync(new URL('../copilot-card-tool.mjs',import.meta.url),'utf8');

test('Copilot prompt drafts trim input and limit length without persisting secrets',()=>{
 assert.equal(cleanCopilotPrompt('  fix test  '),'fix test');
 assert.equal(cleanCopilotPrompt('a'.repeat(2500)).length,1800);
 assert.equal(cleanCopilotPrompt(null),'');
 assert.equal(new URL(COPILOT_URL).origin,'https://github.com');
 assert.doesNotMatch(moduleSource,/localStorage|sessionStorage|document\.cookie|access_token|password/);
});

test('Copilot shows an on-card composer and an honest official handoff, not a fake response',()=>{
 assert.match(launcher,/mountCopilotCardTool\(area\)/);
 assert.match(launcher,/card\.id==='copilot'/);
 assert.match(moduleSource,/data-copilot-composer|dataset\.copilotComposer/);
 assert.match(moduleSource,/iqc-ai-input/);
 assert.match(moduleSource,/navigator\.clipboard\.writeText/);
 assert.match(moduleSource,/Open Copilot/);
 assert.match(moduleSource,/requires a verified server connection/);
 assert.doesNotMatch(moduleSource,/fetch\(|sample.*answer|fake.*reply/i);
});
