import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADULT_VIDEO_SOURCE,sourceForAdultBrowse} from '../adult-video-source.mjs';

test('source-only adult link is unavailable before this-visit 21+ acknowledgment',()=>{
 assert.equal(sourceForAdultBrowse(),null);
 assert.equal(sourceForAdultBrowse(false),null);
 assert.equal(sourceForAdultBrowse('true'),null);
 assert.equal(sourceForAdultBrowse(1),null);
 assert.equal(sourceForAdultBrowse(true),ADULT_VIDEO_SOURCE);
 assert.equal(ADULT_VIDEO_SOURCE.url,'https://xgroovy.com/gifs/205466/filled-my-mouth-with-cum/');
 assert.equal(ADULT_VIDEO_SOURCE.category,'21+ external source');
 for(const field of ['image','images','poster','embed','iframe','video','media','price','paid','sponsored','approvedRights']){
  assert.equal(field in ADULT_VIDEO_SOURCE,false,'unlicensed media field '+field);
 }
});

test('dedicated 21+ Quick Card is ad-free, hidden until acknowledgment and not indexed',()=>{
 const html=readFileSync(new URL('../21plus-video-source.html',import.meta.url),'utf8');
 assert.match(html,/name="robots" content="noindex, nofollow, noarchive, nosnippet"/);
 assert.match(html,/id="adultVideoContent" hidden/);
 assert.match(html,/id="adultVideoOpen"(?![^>]*href)/);
 assert.match(html,/id="adultVideoEnter"/);
 assert.match(html,/adult-video-source\.mjs/);
 assert.doesNotMatch(html,/xgroovy\.com|googlesyndication|googletagmanager|adsbygoogle|google-analytics|iframe|<video\b|<img\b|<source\b/i);
 const script=readFileSync(new URL('../adult-video-source.mjs',import.meta.url),'utf8');
 assert.match(script,/sourceForAdultBrowse\(true\)/);
 assert.match(script,/link\.removeAttribute\('href'\)/);
 assert.doesNotMatch(script,/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie/);
});

test('homepage stays ad-friendly by linking locally only inside the acknowledged 21+ panel',()=>{
 const card=readFileSync(new URL('../restricted-ad-card.mjs',import.meta.url),'utf8');
 assert.match(card,/publisher\.hidden=true/);
 assert.match(card,/21plus-video-source\.html/);
 assert.doesNotMatch(card,/xgroovy\.com|Open external video page/);
 const catalog=readFileSync(new URL('../adult-lifestyle-catalog.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(catalog,/xgroovy\.com|adult-video-links/);
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(home,/xgroovy\.com/);
});

test('homepage 21+ portal is distinct from dynamically listed kit source links',()=>{
 const source=readFileSync(new URL('../restricted-ad-card.mjs',import.meta.url),'utf8');
 const portal=source.split("const videoPortal=el('a','")[1]?.split("'")[0];
 assert.ok(portal,'separate source portal must be present');
 assert.ok(!portal.includes('rac-kit-link'),'portal cannot count as a dynamic kit before acknowledgment or after Close');
 assert.ok(portal.includes('rac-source-portal'),'portal needs a separate accessible class');
 assert.ok(source.includes('publisher.append(')&&source.includes('videoPortal);'),'portal remains inside the visit-gated publisher panel');
});

test('this-visit 21+ reveal and Close remove the external href without persisting state',async()=>{
 const events=new Map();
 const node=id=>({
  hidden:false,textContent:'',href:undefined,
  addEventListener(type,fn){events.set(id+':'+type,fn)},
  removeAttribute(attr){if(attr==='href')delete this.href},
  focus(){this.focused=true}
 });
 const nodes=Object.fromEntries(['adultVideoEnter','adultVideoClose','adultVideoContent','adultVideoOpen','adultVideoStatus'].map(id=>[id,node(id)]));
 const oldDocument=globalThis.document;
 globalThis.document={
  getElementById(id){return id==='adultVideoCard'?{querySelector(selector){return nodes[selector.slice(1)]}}:null}
 };
 try{
  await import('../adult-video-source.mjs?gate-contract-test=20261119');
  assert.equal(nodes.adultVideoContent.hidden,true);
  assert.equal('href' in nodes.adultVideoOpen,false);
  events.get('adultVideoEnter:click')();
  assert.equal(nodes.adultVideoContent.hidden,false);
  assert.equal(nodes.adultVideoOpen.href,'https://xgroovy.com/gifs/205466/filled-my-mouth-with-cum/');
  events.get('adultVideoClose:click')();
  assert.equal(nodes.adultVideoContent.hidden,true);
  assert.equal('href' in nodes.adultVideoOpen,false);
  assert.equal(nodes.adultVideoEnter.focused,true);
 }finally{
  if(oldDocument===undefined)delete globalThis.document;
  else globalThis.document=oldDocument;
 }
});
