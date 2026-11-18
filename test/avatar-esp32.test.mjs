import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ESP32_SERVICE_UUID,ESP32_NOTIFY_UUID,parseEsp32Observation,mergeEsp32Observation,esp32PromptExcerpt} from '../avatar-esp32-core.mjs';
const packet=(x)=>new TextEncoder().encode(JSON.stringify(x));
test('custom BLE protocol IDs stay defined for firmware and card',()=>{
 assert.match(ESP32_SERVICE_UUID,/^[a-f0-9-]{36}$/);
 assert.match(ESP32_NOTIFY_UUID,/^[a-f0-9-]{36}$/);
 assert.notEqual(ESP32_SERVICE_UUID,ESP32_NOTIFY_UUID);
});
test('button packets make bounded hardware leaves, including DataView with nonzero offset',()=>{
 const bytes=packet({v:1,kind:'button',id:'button',value:1,seq:7});
 const padded=new Uint8Array(bytes.length+3);padded.set(bytes,2);
 const observation=parseEsp32Observation(new DataView(padded.buffer,2,bytes.length));
 assert.deepEqual(observation,{branch:'ESP32',kind:'button',label:'Button pressed',seq:7,value:1});
 assert.deepEqual(mergeEsp32Observation([],observation),[observation]);
});
test('readings are observations rather than thoughts or commands',()=>{
 const reading=parseEsp32Observation(packet({v:1,kind:'sensor',id:'light',value:72.5,seq:8}));
 assert.equal(reading.label,'Light reading: 72.5');
 assert.match(esp32PromptExcerpt(reading),/ESP32 observation/);
 assert.match(esp32PromptExcerpt(reading),/not a thought/i);
 assert.doesNotMatch(esp32PromptExcerpt(reading),/execute|post now|buy now/i);
});
test('rejects unknown channels, hazardous values, wrong version, malformed or oversized packets',()=>{
 const rejects=[
  {v:1,kind:'mic',id:'speech',value:1,seq:1},
  {v:1,kind:'sensor',id:'temperature',value:999,seq:1},
  {v:1,kind:'sensor',id:'light',value:'<script>hello</script>',seq:2},
  {v:2,kind:'button',id:'button',value:1,seq:1},
  {v:1,kind:'button',id:'button',value:1,seq:-1},
  {v:1,kind:'button',id:'button',value:2,seq:1},
 ];
 for(const obj of rejects)assert.equal(parseEsp32Observation(packet(obj)),null,JSON.stringify(obj));
 assert.equal(parseEsp32Observation(new Uint8Array(220).fill(65)),null);
 assert.equal(parseEsp32Observation(new Uint8Array([123,111,111])),null);
});
test('dedupes by sequence, retains at most eight recent observations and fails closed',()=>{
 let history=[];
 for(let i=1;i<=10;i++)history=mergeEsp32Observation(history,parseEsp32Observation(packet({v:1,kind:'button',id:'button',value:1,seq:i})));
 assert.equal(history.length,8);assert.equal(history[0].seq,3);
 assert.equal(mergeEsp32Observation(history,history.at(-1)).length,8);
 assert.deepEqual(mergeEsp32Observation(history,null),history);
});
test('card only pairs after direct click; data stays local until an explicit prompt edit',()=>{
 const source=readFileSync(new URL('../avatar-esp32-card.mjs',import.meta.url),'utf8');
 const avatar=readFileSync(new URL('../avatar-ai-card.mjs',import.meta.url),'utf8');
 assert.match(source,/requestDevice/);
 assert.match(source,/\.addEventListener\('click'/);
 assert.match(source,/startNotifications/);
 assert.match(source,/gattserverdisconnected/);
 assert.match(source,/Disconnect/);
 assert.doesNotMatch(source,/(?:localStorage|sessionStorage|fetch\(|sendMessage\(|postMessage\(|getUserMedia|geolocation)/);
 assert.match(avatar,/mountAvatarEsp32Input\(box,focus,refresh\)/);
});
