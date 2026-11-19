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
