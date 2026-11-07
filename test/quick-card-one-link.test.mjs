import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWebsiteInput, buildWebsiteCardDraft} from '../quick-card-one-link.mjs';
test('www.website entry normalizes to safe HTTPS', () => {
 assert.equal(normalizeWebsiteInput('www.bubbleyum.com'),'https://www.bubbleyum.com/');
 assert.equal(normalizeWebsiteInput(' bubbleyum.com '),'https://bubbleyum.com/');
 assert.equal(normalizeWebsiteInput('https://example.com/shop#tracking'),'https://example.com/shop');
});
test('local, insecure, malformed and credential URLs do not publish', () => {
 for(const raw of ['http://example.com','javascript:alert(1)','localhost','127.0.0.1','https://192.168.1.1/','https://user:pass@example.com/','https://example.com:8443/','fake site.com','https://example.local','https://10.0.0.1','https://example.com@evil.test']){
  assert.throws(()=>normalizeWebsiteInput(raw),/valid public HTTPS website/i,raw);
 }
});
test('one URL makes only an unverified visit draft', () => {
 const c=buildWebsiteCardDraft({website:'www.bubbleyum.com'});
 assert.equal(c.website,'https://www.bubbleyum.com/');
 assert.equal(c.kind,'visit');assert.match(c.title,/Bubbleyum/);
 assert.match(c.description,/source/);
 assert.doesNotMatch(c.description,/official seller|affiliated/i);
 assert.ok(c.description.length>=12 && c.interactionRequest.length>=10);
 assert.equal(c.image,'');
});
test('advanced creator overrides are preserved', () => {
 const c=buildWebsiteCardDraft({website:'https://example.com/',title:'Maker',description:'Source-checked original card.',interactionRequest:'Show real video.',kind:'video',video:'https://www.youtube.com/watch?v=jfKfPfyJRdk',previewMode:'visual',image:'https://example.com/authorized.jpg'});
 assert.equal(c.title,'Maker');assert.equal(c.kind,'video');assert.equal(c.video,'https://www.youtube.com/watch?v=jfKfPfyJRdk');assert.equal(c.previewMode,'visual');assert.equal(c.image,'https://example.com/authorized.jpg');
});