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

test('Fred Media Star opens first in the public Oracle carousel without overriding chosen views',()=>{
 const deck=read('oracle-card-deck.js'),fred=read('fred-spaces-radio.js');
 const firstFred=deck.indexOf("['fredSpacesRadio','Media Star");
 const firstOther=deck.indexOf("['coliseumZeusCard'");
 assert.ok(firstFred>=0&&firstFred<firstOther,'Fred must be the first original card and chooser entry');
 const from=deck.indexOf('function chooseOpening(){');
 // Extract the real opening picker with fixed ready-card fixtures; no browser or network mocks.
 const opening=deck.slice(from,deck.indexOf('function start(){',from));
 const pick=new Function('eligible','selectedTab','selectedDepartment','openingCursor','familyApi','cardFamily','directionApi','feedState','liveCatalog','quantWeights',
  opening+'\nreturn chooseOpening().id;');
 const available=()=>[{id:'coliseumZeusCard',feedId:'zeus'}, {id:'fredSpacesRadio',feedId:'fred-spaces'}];
 const selected=(tab,department)=>pick(available,tab,department,0,null,()=> 'original',null,null,()=>[],{});
 assert.equal(selected('public','all'),'fredSpacesRadio','default public opening must feature the actual Fred player');
 assert.equal(selected('for-you','all'),'coliseumZeusCard','do not force Fred into personal feeds');
 assert.equal(selected('public','sports'),'coliseumZeusCard','do not override category selections');
 const start=deck.slice(deck.indexOf('function start(){'),deck.indexOf('\nstart();',deck.indexOf('function start(){')));
 assert.ok(start.includes('const first=request&&available(request)?request:chooseOpening();'),'explicit deep links still win');
 assert.ok(fred.includes('play.href=active.source;play.target="_blank";'),'original X replay remains provider-hosted');
 assert.ok(!opening.includes('.click(')&&!opening.includes('.play('),'opening Fred must not autoplay or spend coins');
});

test('post-merge Oracle carousel keeps Avatar AI and private Nuance Discovery on the same homepage',()=>{
 const html=read('index.html');
 assert.match(html,/id="oracleCardDepartment"/,'Oracle department chooser is present');
 assert.match(html,/oracle-age-preference\.js/,'21+ browsing gate is preserved');
 assert.match(html,/id="iowaRadioMedia"/,'media radio remains in the new placement');
 assert.match(html,/id="nuanceDiscoveryCard"/,'owner Nuance card is not deleted');
 assert.match(html,/nuance-discovery-card\.mjs/,'owner Nuance script remains wired');
 assert.match(html,/avatar-ai-card\.css/,'public Avatar prompt card remains styled');
});
