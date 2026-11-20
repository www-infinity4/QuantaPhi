import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanCopilotPrompt,COPILOT_URL} from '../copilot-card-tool.mjs';

const source=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
const tool=readFileSync(new URL('../copilot-card-tool.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../quanta-card-experience.css',import.meta.url),'utf8');

test('Copilot form exists inside original QuantaPhi card instead of an external link shelf',()=>{
 assert.match(source,/mountCopilotCardTool\(area\)/);
 assert.match(source,/card\.id==='copilot'/);
 assert.match(tool,/iqc-ai-input/);
 assert.match(tool,/iqc-copilot-composer/);
 assert.match(tool,/Copilot/);
 assert.match(css,/iqc-copilot-actions/);
});
test('Copilot form does not falsely label Bubbles, Gemini or clipboard action as authenticated Copilot response',()=>{
 assert.doesNotMatch(tool,/bubbles:ai-consult|gemini_first|askClaudeSteward|Copilot replied\./);
 assert.match(tool,/requires a verified server connection/);
 assert.match(tool,/copied/i);
 assert.match(tool,/GitHub sign-in stays on GitHub/);
 assert.equal(new URL(COPILOT_URL).origin,'https://github.com');
 assert.equal(cleanCopilotPrompt('  fix source tests  '),'fix source tests');
 assert.equal(cleanCopilotPrompt('a'.repeat(2500)).length,1800);
});
test('Copilot card cannot collect or persist sign-in secrets',()=>{
 assert.doesNotMatch(tool,/localStorage|sessionStorage|document\.cookie|access_token|password|client_secret/);
 assert.match(tool,/noopener noreferrer/);
 assert.match(tool,/navigator\.clipboard/);
});
