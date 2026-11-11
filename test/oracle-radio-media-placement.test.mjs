import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('full WHO and 15-station source radio lives below the Oracle cards in media',()=>{
 const html=read('index.html'),live=read('iowa-live-radio-cards.js');
 const deck=html.indexOf('id="oracleCardDeck"'),mediaAnchor=html.indexOf('id="iowaRadioMedia"');
 const legacyMedia=html.indexOf('id="media" hidden');
 assert.ok(deck>0&&mediaAnchor>deck&&legacyMedia>mediaAnchor);
 assert.match(live,/getElementById\('iowaRadioMedia'\)/);
 assert.match(live,/getElementById\('infinityRadioQuick'\)/);
 assert.match(live,/anchor\.insertAdjacentElement\('afterend',shell\)/);
 assert.match(live,/NEWSRADIO 1040 WHO/);
 assert.match(live,/https:\/\/www\.iheart\.com\/live\/1040-who-925\//);
});
test('compact Infinity Radio is still beside the search/traffic region',()=>{
 const html=read('index.html'),player=read('quick-infinity-radio.js');
 assert.ok(html.includes('id="qtraffic"'));
 assert.ok(html.includes('/quick-infinity-radio.js'));
 assert.match(player,/getElementById\('qtraffic'\)/);
 assert.match(player,/id = 'infinityRadioQuick'/);
});
