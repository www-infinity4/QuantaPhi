import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{roomKey} from './worker.mjs';
test('explicit topic and mode isolate the room',()=>{assert.equal(roomKey('Helium advances','research'),'research-helium-advances');assert.notEqual(roomKey('helium','story'),roomKey('helium','research'));assert.throws(()=>roomKey('', 'story'));assert.throws(()=>roomKey('helium','private-search'))});
test('unapproved origin cannot submit group content',async()=>{const r=await worker.fetch(new Request('https://example/line',{method:'POST',headers:{Origin:'https://other.example'},body:'{}'}),{});assert.equal(r.status,403)});
