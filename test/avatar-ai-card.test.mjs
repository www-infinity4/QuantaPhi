import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVATAR_PROMPT,buildAvatarPrompt} from '../avatar-ai-core.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('anonymous Avatar AI prompt requests an honest, useful personal-context continuation',()=>{
 const prompt=buildAvatarPrompt();
 assert.equal(prompt,AVATAR_PROMPT);
 assert.match(prompt,/personal context/i);
 assert.match(prompt,/up to five/i);
 assert.match(prompt,/older conversations/i);
 assert.match(prompt,/unfinished projects/i);
 assert.match(prompt,/source references/i);
 assert.match(prompt,/durable checkpoint/i);
 assert.match(prompt,/only (?:the )?authorized/i);
 assert.match(prompt,/not.*continuous.*background/i);
 assert.doesNotMatch(prompt,/watsonkris611|marvaseater@gmail|token\s*=|private key/i);
});

test('optional user-entered project focus is bounded and absent by default',()=>{
 const focused=buildAvatarPrompt('  Repair my radio card  ');
 assert.ok(focused.endsWith('My optional focus: Repair my radio card'));
 assert.equal(buildAvatarPrompt('  '),AVATAR_PROMPT);
 assert.ok(buildAvatarPrompt('A'.repeat(900)).length<=AVATAR_PROMPT.length+220);
});

test('Avatar AI is a draggable/copyable suggestion inside the original Quick Card and has no auto-scan',()=>{
 const card=read('avatar-ai-card.mjs');
 const source=read('source-quick-cards.mjs');
 const css=read('avatar-ai-card.css');
 const home=read('index.html');
 const detail=read('source-quick-card.html');
 assert.match(card,/draggable\s*=\s*true|\.draggable\s*=\s*true/);
 assert.match(card,/dragstart/);
 assert.match(card,/dataTransfer\.setData\(['"]text\/plain['"]/);
 assert.match(card,/navigator\.clipboard\.writeText/);
 assert.match(card,/chatgpt\.com\//);
 assert.match(card,/paste/i);
 assert.match(source,/source\('avatar-ai'/);
 assert.match(source,/mountAvatarAiCard\(item\)/);
 assert.match(source,/mountAvatarAiCard\(host\)/);
 assert.match(source,/'avatar-ai'/);
 assert.match(home,/avatar-ai-card\.css/);
 assert.match(detail,/avatar-ai-card\.css/);
 assert.match(css,/min-height:\s*4[4-9]px/);
 assert.doesNotMatch(card,/(?:localStorage|sessionStorage|document\.cookie|setInterval|fetch\(|api\.openai\.com)/);
});
