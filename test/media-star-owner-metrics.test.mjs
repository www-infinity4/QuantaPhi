import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Media Star creator can see authenticated publisher-only engagement with no fake income',()=>{
 const home=readFileSync('index.html','utf8');
 const view=readFileSync('media-star-owner-metrics.js','utf8');
 assert.match(home,/media-star-owner-metrics\.js/);
 assert.match(view,/\/v1\/my\/metrics/);
 assert.match(view,/resolveDeviceToken/);
 assert.match(view,/No server-confirmed payout total is supplied/);
 assert.match(view,/Tracking not connected/);
 assert.doesNotMatch(view,/mintToken|wallet\/spend|localStorage\.setItem/);
});
