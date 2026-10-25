import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('index.html'),module=read('church-iam-card.js'),style=read('church-iam-card.css'),deck=read('oracle-card-deck.js'),catalog=read('bubbles-card-catalog.mjs');
test('I AM is Gary Cardone Sunday promo, not an invented episode library',()=>{
 assert.match(page,/id="churchOfIAmCard"/);
 assert.match(page,/CHURCH<br>OF I AM/);
 assert.match(page,/Gary Cardone official profile photograph/);
 assert.match(page,/garycardone\.me/);
 assert.match(page,/x\.com\/GaryCardone/);
 assert.match(page,/youtube\.com\/@garycardone/);
 assert.match(page,/rumble\.com\/c\/GaryCardone/);
 assert.match(page,/Sunday/);
 assert.match(page,/10:30 a\.m\. Eastern/);
 assert.doesNotMatch(page,/Church of I AM.{0,400}episode library/is);
 assert.match(page,/not a live-stream player/);
});
test('visible all days, preferential Sunday-morning rotation, explicitly not a verified live state',()=>{
 assert.match(module,/const sundayMorning=now/);
 assert.match(module,/timeZone:'America\/New_York'/);
 assert.match(module,/weekday==='Sun'&&hour>=8&&hour<13/);
 assert.match(module,/iam-sunday/);
 assert.match(deck,/churchOfIAmCard.*Church of I AM/);
 assert.match(deck,/churchOfIAmCard:\['church-of-i-am'/);
 assert.match(deck,/iam:'churchOfIAmCard'/);
 assert.match(deck,/sundayPromo\|\|products\[0\]/);
 assert.match(deck,/sundayPromo\|\|eligible\(\)\[0\]/);
 assert.match(catalog,/app\('church-of-i-am'/);
 assert.doesNotMatch(page,/<audio[^>]+autoplay|<video[^>]+autoplay/i);
});
test('Sunday promo uses actual website-hosted image and standard actions, clear source links',()=>{
 assert.match(page,/cdn\.ccard\.to\/static\/media\/2024/);
 assert.match(page,/id="churchIamActions"/);
 assert.match(module,/mountCardActions\(actions/);
 assert.match(module,/route:'\/\?card=church-of-i-am'/);
 assert.match(style,/\.iam-photo/);
 assert.match(style,/\.iam-links/);
 assert.match(style,/iam-sheen/);
 assert.match(style,/prefers-reduced-motion/);
 assert.match(page,/church-iam-card\.css\?v=20261024-sunday1/);
 assert.match(page,/church-iam-card\.js\?v=20261024-sunday1/);
});

test('direct portrait source, verified backup and accessible fallback replace Cloudimage proxy',()=>{
 assert.doesNotMatch(page,/cloudimg\\.io/);
 assert.match(page,/src="https:\\/\\/cdn\\.ccard\\.to\\/static\\/media\\/2024\\/08\\/18\\/aitvlufi/);
 assert.match(module,/cdn\\.theorg\\.com\\/82a317f7/);
 assert.match(module,/portrait\\.addEventListener\\('error',portraitError\\)/);
 assert.match(module,/portrait\\.complete&&!portrait\\.naturalWidth/);
 assert.match(style,/iam-photo-unavailable/);
 assert.match(style,/body\\.oracle-quanta \\.iam-card \\.iam-copy/);
 assert.doesNotMatch(page,/onerror="this\\.style\\.display='none'"/);
});
