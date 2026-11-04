import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('auto-update checks on app launch, focus, visibility return and interval without an owner button',()=>{
 const src=file('bubbles-ai.js');
 assert.match(src,/function requestAutomaticSiteUpdate\(\)/);
 assert.match(src,/window\.addEventListener\('focus',requestAutomaticSiteUpdate\)/);
 assert.match(src,/document\.addEventListener\('visibilitychange',/);
 assert.match(src,/setTimeout\(requestAutomaticSiteUpdate,/);
 assert.match(src,/setInterval\(requestAutomaticSiteUpdate,90000\)/);
 assert.match(src,/navigator\.serviceWorker\.getRegistration\('\/'\)/);
 assert.match(src,/checkForSiteUpdate\(\)/);
});
test('existing safe update guards preserve drafts, photos, unsaved history and listening',()=>{
 const src=file('bubbles-ai.js');
 assert.match(src,/if\(input\.value\.length\|\|noteText\.value\.length\|\|workText\.value\.length\|\|pendingImage\|\|pendingImages\.length\)return false;/);
 assert.match(src,/if\(!keepChat&&messages\.length\)return false;/);
 assert.match(src,/if\(nativeRecordingActive\|\|voiceStarting\|\|voiceEnabled\|\|speaking\)return false;/);
});
test('reloaded first-party apps request the current Bubbles build revision',()=>{
 for(const path of ['index.html','bubbles.html','bubbles/index.html','bubbles-chrome.html'])
  assert.match(file(path),/\/bubbles-ai\.js\?v=20261104-work-results2/);
});
test('a work receipt can resume only with a verified same-thread ticket',()=>{
 const src=file('bubbles-ai.js');
 assert.match(src,/const ACTIVE_WORK_REF='bubbles-last-active-work-v1';/);
 assert.match(src,/restored\.thread===activeThread/);
 assert.match(src,/result\.tickets\.find\(ticket=>ticket\?\.id===restored\.ticketId/);
 assert.match(src,/sessionStorage\.setItem\(ACTIVE_WORK_REF,/);
});
