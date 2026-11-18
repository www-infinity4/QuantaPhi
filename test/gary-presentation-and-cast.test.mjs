import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {familyPresentationAt, FAMILY_SWITCH_UTC, castInstructions, castAction} from '../gary/presentation.mjs';

const root=new URL('../',import.meta.url);
const file=path=>readFileSync(new URL(path,root),'utf8');
test('birthday presentation ends at midnight Central November 6, 2026, not UTC midnight',()=>{
  assert.equal(FAMILY_SWITCH_UTC,'2026-11-06T06:00:00.000Z');
  assert.equal(familyPresentationAt('2026-11-05T23:59:59-06:00'),'birthday');
  assert.equal(familyPresentationAt('2026-11-06T00:00:00-06:00'),'octaves');
  assert.equal(familyPresentationAt('2026-11-06T06:00:00.000Z'),'octaves');
  assert.equal(familyPresentationAt('2026-11-05T20:00:00.000Z'),'birthday');
});
test('invalid clock fails to predictable evergreen mode rather than leaving birthday indefinitely',()=>{
  assert.equal(familyPresentationAt('invalid'),'octaves');
});
test('one fixed permanent family URL redirects to the live family experience',()=>{
  const html=file('family/index.html');
  assert.match(html,/href="\/gary\/index.html"/);
  assert.match(html,/content="0;url=\/gary\/index\.html"/);
  assert.match(html,/Gary & Family/);
});
test('birthday hero is removed for the later evergreen experience, with permanent octaves metadata',()=>{
  const html=file('gary/index.html');
  const presentation=file('gary/presentation-init.mjs');
  assert.match(html,/id="gary-birthday-hero"/);
  assert.match(html,/id="gary-family-hero"/);
  assert.match(presentation,/familyPresentationAt\(new Date\(\)\)/);
  assert.match(presentation,/\.remove\(\)/);
  assert.match(presentation,/document\.title\s*=/);
  assert.match(html,/<title>Gary &amp; Family/);
  assert.match(html,/\/gary\/octaves\.css/);
  assert.match(html,/type="module" src="\/gary\/presentation-init\.mjs"/);
  assert.match(html,/family-lounge/);
  assert.match(html,/gary\/main\.mjs/);
});
test('light Octaves style has contrasts and does not erase functional controls',()=>{
  const css=file('gary/octaves.css');
  assert.match(css,/data-family-mode="octaves"/);
  assert.match(css,/--octaves-paper:#fff/);
  assert.match(css,/color-scheme:light/);
  assert.match(css,/\.family-shell/);
  assert.match(css,/\.family-channel/);
  assert.doesNotMatch(css,/display:none.*family-shell/);
});
test('cast control opens a real decision/help panel; no misleading fullscreen-as-cast claims',()=>{
  const html=file('gary/index.html');
  const js=file('gary/lounge.mjs');
  assert.match(html,/id="family-cast"/);
  assert.match(html,/id="family-cast-panel"/);
  assert.match(html,/id="family-cast-fullscreen"/);
  assert.match(html,/id="family-cast-close"/);
  assert.match(js,/castAction\(/);
  assert.match(js,/family-cast-panel/);
  assert.match(js,/remote\.prompt\(/);
  assert.match(js,/family-cast-fullscreen/);
  assert.doesNotMatch(js,/Fullscreen active\..*Screen Cast/);
});
test('cast action claims a native picker only when supported; never pretends to cast cross-origin iframes',()=>{
  assert.equal(castAction({remotePromptAvailable:false}), 'help');
  assert.equal(castAction({remotePromptAvailable:true,activeNativeMedia:true}), 'native-media-picker');
  assert.equal(castAction({remotePromptAvailable:true,activeNativeMedia:false}), 'help');
  assert.ok(castInstructions().some(x=>x.includes('same Wi-Fi')));
  assert.ok(castInstructions().some(x=>x.includes('Cast')));
});
test('continuity workflow checks the real URL, theme assets, and accepts source updates',()=>{
  const yml=file('.github/workflows/gary-birthday.yml');
  const probe=file('scripts/gary-family-public-smoke.mjs');
  assert.match(yml,/schedule:/);
  assert.match(yml,/workflow_dispatch:/);
  assert.match(yml,/gary-family-public-smoke\.mjs/);
  assert.match(probe,/https:\/\/quantaphi\.org\/gary\/index\.html/);
  assert.match(probe,/https:\/\/quantaphi\.org\/family\/index\.html/);
  assert.match(probe,/https:\/\/quantaphi\.org\/gary\/octaves\.css/);
  assert.match(probe,/redirect:|location\.replace|meta http-equiv/i);
});


test('Infinity-style spotlight is genuinely media-led with archive film artwork and usable actions',()=>{
  const html=file('gary/index.html');
  const css=file('gary/octaves.css');
  assert.match(html,/class="family-spotlight"/);
  assert.match(html,/archive\.org\/services\/img\/BlueSteel/);
  assert.match(html,/archive\.org\/services\/img\/The_Star_Packer/);
  assert.match(html,/href="#watch"/);
  assert.match(html,/family-spotlight-radio/);
  assert.match(css,/\.family-spotlight/);
  assert.match(css,/object-fit:cover/);
  assert.match(css,/prefers-reduced-motion/);
  assert.doesNotMatch(html,/sponsored.*sponsored|fake.*ad impression/i);
});

test('BFCache restore rearms exactly one clock and applies the midnight Octaves switch', async()=>{
  const {runInNewContext}=await import('node:vm');
  const source=file('gary/presentation-init.mjs').replace(/^import .*;\s*/m,'');
  let now='2026-11-05T23:59:00-06:00', nextTimer=0, cleared=[];
  const timers=new Map(), listeners=new Map(), hero={removed:false,remove(){this.removed=true}};
  const html={dataset:{}}, description={content:''};
  const document={
    documentElement:html,title:'',hidden:false,
    querySelector(selector){return selector==='#gary-birthday-hero'?hero:selector==='meta[name="description"]'?description:null;},
    addEventListener(name,fn){listeners.set('document:'+name,fn);}
  };
  const window={
    setInterval(fn,ms){assert.equal(ms,60000);const id=++nextTimer;timers.set(id,fn);return id;},
    clearInterval(id){cleared.push(id);timers.delete(id);},
    addEventListener(name,fn){listeners.set(name,fn);}
  };
  class FakeDate {constructor(){return new Date(now);}}
  runInNewContext(source,{window,document,Date:FakeDate,familyPresentationAt});
  assert.equal(timers.size,1);
  assert.equal(html.dataset.familyMode,'birthday');
  listeners.get('pagehide')();
  assert.equal(timers.size,0);
  now='2026-11-06T00:01:00-06:00';
  listeners.get('pageshow')({persisted:true});
  assert.equal(html.dataset.familyMode,'octaves');
  assert.equal(hero.removed,true);
  assert.match(document.title,/Gary & Family/);
  assert.equal(timers.size,1);
  listeners.get('pageshow')({persisted:false});
  assert.equal(timers.size,1,'repeat pageshow must not duplicate timers');
  listeners.get('pagehide')();
  assert.equal(timers.size,0);
  listeners.get('pageshow')({persisted:true});
  assert.equal(timers.size,1,'subsequent BFCache cycles must also rearm');
  assert.equal(cleared.length,2);
});
