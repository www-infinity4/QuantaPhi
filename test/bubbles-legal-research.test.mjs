import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEGAL_TOPICS,LEGAL_SOURCES,buildAttorneyPrepPacket,sourceForTopic} from '../bubbles-legal-research-data.mjs';
import {findCard} from '../bubbles-card-catalog.mjs';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('original Bubbles has one verified legal research Quick Card without a fake licensed attorney',()=>{
 const card=findCard('Bubbles Legal Research');
 assert.ok(card);
 assert.equal(card.url,'/bubbles-legal-research.html');
 const page=src('bubbles-legal-research.html');
 assert.match(page,/<h1[^>]*>Bubbles Legal Research Desk<\/h1>/);
 assert.match(page,/not a lawyer/i);
 assert.match(page,/no attorney-client relationship/i);
 assert.match(page,/not automatically confidential or privileged/i);
 assert.match(page,/Open Bubbles Legal Research/);
 assert.match(page,/bubbles-embed\.js/);
 assert.match(page,/data-bubble-role="specialist"/);
 assert.match(page,/no independent license to practice law/i);
 assert.match(page,/no recorded microphone without permission/i);
 assert.doesNotMatch(page,/ChatGPT (?:signed in|connected)|licensed attorney available/i);
});

test('official legal sources have HTTPS verified origins and topic-specific provenance',()=>{
 assert.ok(LEGAL_TOPICS.length>=5);
 assert.deepEqual(new Set(LEGAL_TOPICS.map(t=>t.id)).size,LEGAL_TOPICS.length);
 assert.deepEqual(new Set(LEGAL_SOURCES.map(s=>s.id)).size,LEGAL_SOURCES.length);
 const allow=new Set(['support.google.com','www.uspto.gov','www.copyright.gov','www.law.cornell.edu','www.courtlistener.com','courtlistener.com','www.ftc.gov']);
 for(const source of LEGAL_SOURCES){
  const link=new URL(source.url);
  assert.equal(link.protocol,'https:');
  assert.ok(allow.has(link.hostname),source.id);
  assert.equal(link.username,'');
  assert.equal(link.password,'');
  assert.ok(source.authority.length>5&&source.purpose.length>15);
 }
 for(const topic of LEGAL_TOPICS){
  assert.ok(topic.question.length>15);
  assert.ok(topic.sourceIds.length>=1);
  assert.ok(topic.sourceIds.every(id=>LEGAL_SOURCES.some(s=>s.id===id)));
  assert.ok(sourceForTopic(topic.id).length>=1);
 }
});

test('lawyer prep packet is local, deterministic, deduplicated and marks unverified work',()=>{
 const packet=buildAttorneyPrepPacket({topicIds:['play','privacy','play','copyright'],notes:'I will ask a lawyer to examine my software rights.'});
 assert.match(packet,/Bubbles Legal Research Desk/i);
 assert.match(packet,/not legal advice/i);
 assert.match(packet,/Google Play/);
 assert.match(packet,/Copyright/i);
 assert.match(packet,/Privacy/);
 assert.match(packet,/not paid or verified/i);
 assert.match(packet,/lawyer not retained/i);
 assert.match(packet,/I will ask a lawyer/);
 assert.equal((packet.match(/Google Play registration and testing/g)||[]).length,1);
 assert.ok(packet.includes('https://support.google.com/googleplay/android-developer/'));
 assert.doesNotMatch(packet,/trademark approved|copyright registered/i);
 assert.equal(packet,buildAttorneyPrepPacket({topicIds:['play','privacy','copyright'],notes:'I will ask a lawyer to examine my software rights.'}));
});

test('untrusted topic names cannot become fake sources or legal claims',()=>{
 assert.equal(sourceForTopic('fake'),null);
 assert.throws(()=>buildAttorneyPrepPacket({topicIds:['play','fake'],notes:''}),/invalid_topic/);
 assert.throws(()=>buildAttorneyPrepPacket({topicIds:'play',notes:''}),/invalid_topics/);
 assert.throws(()=>buildAttorneyPrepPacket({topicIds:['play'],notes:'a'.repeat(2001)}),/notes_too_long/);
 const packet=buildAttorneyPrepPacket({topicIds:['play'],notes:'<script>hello</script>'});
 assert.ok(packet.includes('<script>hello</script>'),'plaintext output only; must be displayed with textContent');
 assert.ok(!packet.includes('http://example.invalid'));
});

test('legal UI contains no upload, OAuth, payment, third-party legal bot, or hidden forwarding',()=>{
 const html=src('bubbles-legal-research.html'),js=src('bubbles-legal-research.js');
 assert.match(html,/id="legalOpenChat"/);
 assert.match(html,/id="legalCopyPacket"/);
 assert.match(html,/id="legalDownloadPacket"/);
 assert.match(html,/id="legalNotes"/);
 assert.match(js,/\.textContent\s*=/);
 assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|\.innerHTML\s*=/);
 assert.doesNotMatch(html,/<input[^>]*type="file"|<form[^>]*action=/);
 assert.match(js,/navigator\.clipboard\.writeText/);
 assert.match(js,/quantaphi-bubbles-embed-launcher/);
 assert.match(js,/new Blob\(/);
 assert.match(src('bubbles.html'),/href="\/bubbles-legal-research\.html"/);
});
