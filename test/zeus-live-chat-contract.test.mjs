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
