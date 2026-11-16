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

test('presentation clock resumes after back-forward cache restoration without duplicate intervals',()=>{
  const source=file('gary/presentation-init.mjs');
  assert.match(source,/addEventListener\('pageshow',startPresentationClock\)/);
  assert.match(source,/addEventListener\('pagehide',stopPresentationClock\)/);
  assert.match(source,/if\(clock===undefined\) clock=window\.setInterval/);
  assert.match(source,/window\.clearInterval\(clock\);clock=undefined/);
  assert.doesNotMatch(source,/pagehide'.*once:true/);
});
