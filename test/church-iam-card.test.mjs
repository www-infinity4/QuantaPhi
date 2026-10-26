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
test('visible all days, with no forced Sunday priority',()=>{
 assert.match(module,/const sundayMorning=now/);
 assert.match(module,/timeZone:'America\/New_York'/);
 assert.match(module,/weekday==='Sun'&&hour>=8&&hour<13/);
 assert.match(module,/iam-sunday/);
 assert.match(deck,/churchOfIAmCard.*Church of I AM/);
 assert.match(deck,/churchOfIAmCard:\['church-of-i-am'/);
 assert.match(deck,/iam:'churchOfIAmCard'/);
 assert.doesNotMatch(deck,/const candidate=sundayPromo/);
 assert.doesNotMatch(deck,/const candidate=sundayPromo/);
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
 assert.match(page,/church-iam-card\.css\?v=20261024-photo2/);
 assert.match(page,/church-iam-card\.js\?v=20261024-photo2/);
});

test('direct portrait source, verified backup and readable fallback replace Cloudimage proxy',()=>{
 assert.ok(!page.includes('cloudimg.io'));
 assert.ok(page.includes('src="https://cdn.ccard.to/static/media/2024/08/18/aitvlufi'));
 assert.ok(module.includes('cdn.theorg.com/82a317f7'));
 assert.ok(module.includes("portrait.addEventListener('error',portraitError)"));
 assert.ok(module.includes('portrait.complete&&!portrait.naturalWidth'));
 assert.ok(style.includes('iam-photo-unavailable'));
 assert.ok(style.includes('body.oracle-quanta .iam-card .iam-copy'));
 assert.ok(!page.includes('onerror="this.style.display'));
});
