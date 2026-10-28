import test from 'node:test';
import assert from 'node:assert/strict';
import {bubblesCardUrl,bubblesNativeCardUrl,verifiedApkUrl,releasedCardLinkReady,cardIdentity} from '../quick-card-apk-bridge.mjs';

test('shared APK URL only resolves to verified versioned GitHub artifact',()=>{
 const good='https://github.com/www-infinity4/QuantaPhi/releases/download/bubbles-preview-current/Bubbles-v0.58.0-Preview5-Android12.apk';
 assert.equal(verifiedApkUrl({bubbles:{available:true,url:good}}),good);
 assert.equal(verifiedApkUrl({bubbles:{available:false,url:good}}),null);
 assert.equal(verifiedApkUrl({bubbles:{available:true,url:'https://attacker.example/bubbles.apk'}}),null);
 assert.equal(verifiedApkUrl({bubbles:{available:true,url:good+'?token=123'}}),null);
 assert.equal(verifiedApkUrl({bubbles:{available:true,url:'http://github.com/www-infinity4/QuantaPhi/releases/download/bubbles-preview-current/Bubbles-v0.58.0-Preview5-Android12.apk'}}),null);
 assert.equal(verifiedApkUrl({}),null);
});
test('card launch encodes context but never trusts arbitrary targets',()=>{
 const path=bubblesCardUrl('google','Google & Search');
 assert.equal(path,'/bubbles.html?sourceCard=google&sourceTitle=Google+%26+Search#bubblesAICard');
 assert.equal(bubblesCardUrl('../../bad','Fake'),null);
 assert.equal(bubblesCardUrl('','Blank'),null);
});
test('card metadata remains bounded and uses actual source id',()=>{
 const card=cardIdentity({dataset:{sourceId:'google',sourceName:'Google'},querySelector:()=>null});
 assert.deepEqual(card,{id:'google',title:'Google'});
 assert.equal(cardIdentity({dataset:{sourceId:'../../bad'},querySelector:()=>null}),null);
});
test('Android deep links are card-ID only, never arbitrary URLs or embedded commands',()=>{
 assert.equal(bubblesNativeCardUrl('google'),'quantaphi-bubbles://card/google');
 assert.equal(bubblesNativeCardUrl('pepe-jeans'),'quantaphi-bubbles://card/pepe-jeans');
 for(const bad of ['', '../wallet','a/b','google?post=1','https://evil.example','a'.repeat(91)])
  assert.equal(bubblesNativeCardUrl(bad),null);
});
test('native APK card button requires verified matching 0.59.0 or newer release',()=>{
 const url=v=>'https://github.com/www-infinity4/QuantaPhi/releases/download/bubbles-preview-current/Bubbles-v'+v+'-Preview5-Android12.apk';
 assert.equal(releasedCardLinkReady({bubbles:{available:true,version:'0.58.0',url:url('0.58.0')}}),false);
 assert.equal(releasedCardLinkReady({bubbles:{available:true,version:'0.59.0',url:url('0.59.0')}}),true);
 assert.equal(releasedCardLinkReady({bubbles:{available:true,version:'0.60.1',url:url('0.60.1')}}),true);
 assert.equal(releasedCardLinkReady({bubbles:{available:true,version:'1.0.0',url:url('1.0.0')}}),true);
 assert.equal(releasedCardLinkReady({bubbles:{available:true,version:'0.59.0',url:url('0.58.0')}}),false);
 assert.equal(releasedCardLinkReady({bubbles:{available:false,version:'0.59.0',url:url('0.59.0')}}),false);
 assert.equal(releasedCardLinkReady({bubbles:{available:true,url:url('0.59.0')}}),false);
 assert.equal(releasedCardLinkReady({bubbles:{available:true,version:'0.59.0',url:'https://evil.invalid/bubbles.apk'}}),false);
});