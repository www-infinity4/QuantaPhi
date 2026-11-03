import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Zeus Chat is a real embedded Bubbles conversation, never the local note mock',()=>{
 const html=read('coliseum/index.html'),js=read('coliseum/coliseum.js');
 assert.match(html,/id="zeusAssistantFrame"/);
 assert.match(html,/id="zeusAssistantStatus"/);
 assert.match(js,/setMode\('chat'\);\s*$/);
 assert.match(js,/iframe\.src='\/bubbles\.html\?'/);
 assert.match(js,/type:'quantaphi:bubbles:open'/);
 assert.match(js,/window\.location\.origin/);
 assert.match(html,/Local planning notes \(offline\)/);
 assert.match(html,/href="\/bubbles\.html"/);
});
test('Zeus keeps draft tools but puts chat ahead of concept marketing in a light surface',()=>{
 const html=read('coliseum/index.html'),css=read('coliseum/zeus-chat-repair.css');
 assert.match(html,/zeus-chat-repair\.css/);
 assert.ok(html.indexOf('id="arena"')<html.indexOf('id="models"'));
 assert.match(css,/\.hero-art\s*\{display:none/);
 assert.match(css,/\.models\s*,\s*\.plans\s*\{display:none/);
 assert.match(css,/\.zeus-assistant-mount/);
 assert.match(css,/color:\s*#263238/);
 assert.match(html,/No paid subscriptions or third-party-model access/);
});

test('Zeus provides one visible quest composer that sends to the real embedded AI path',()=>{
 const html=read('coliseum/index.html'),js=read('coliseum/coliseum.js');
 assert.match(html,/id="zeusQuestForm"/);
 assert.match(html,/id="zeusQuestInput"/);
 assert.match(html,/id="zeusQuestSend"/);
 assert.match(html,/id="zeusQuestStatus"/);
 assert.match(js,/zeusQuestForm/);
 assert.match(js,/quantaphi:bubbles:quest/);
 assert.match(js,/quantaphi:bubbles:quest-ack/);
 assert.match(js,/event\.origin!==window\.location\.origin/);
 assert.match(js,/event\.source!==iframe\?\.contentWindow/);
 assert.match(js,/setMode\('chat'\)/);
});
test('Bubbles accepts Zeus user text with the same sendMessage engine and no owner-tool bypass',()=>{
 const bubbles=read('bubbles-ai.js');
 assert.match(bubbles,/quantaphi:bubbles:quest/);
 assert.match(bubbles,/quantaphi:bubbles:quest-ack/);
 assert.match(bubbles,/event\.origin!==window\.location\.origin/);
 assert.match(bubbles,/event\.source!==window\.parent/);
 assert.match(bubbles,/bubbleId==='coliseum-zeus-assistant'/);
 assert.match(bubbles,/sendMessage\(prompt\)/);
 assert.match(bubbles,/busy\|\|turnPending/);
 assert.doesNotMatch(bubbles,/sendNativeText\(prompt/);
});
