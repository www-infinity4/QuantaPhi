import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISCOVERY_CARDS,findDiscovery,safeDiscovery} from '../quanta-feed-catalog.mjs';
import {ALL_FEED_CARDS,feedCard} from '../quanta-feed.mjs';
import {cleanFeedState,feedCandidates,nextFeedCard,markOpened,markViewed,toggleFollowing} from '../quanta-feed-rank.mjs';
const raw=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base=()=>({...cleanFeedState({}),catalog:ALL_FEED_CARDS});
test('public contains every original quick card and 23 new independent cards',()=>{
 assert.equal(DISCOVERY_CARDS.length,23);
 assert.equal(new Set(ALL_FEED_CARDS.map(x=>x.id)).size,ALL_FEED_CARDS.length);
 for(const id of ['muse-ai','webb','google','reddit','radio-philco-90','just-radios','robinhood','chime','ebay','gold','silver','us-mint','pcgs','ngc','x-live-spaces','wikipedia','vam-scarface','instructables','vintage-toys','antique-collectibles']){
  assert.ok(feedCard(id),id);
 }
 for(const c of DISCOVERY_CARDS){assert.ok(safeDiscovery(c),c.id);assert.equal(findDiscovery(c.id),c);}
 assert.equal(findDiscovery('unknown-card'),null);
 assert.equal(safeDiscovery({id:'fake',url:'javascript:alert(1)'}),false);
 assert.ok(!ALL_FEED_CARDS.some(c=>/tuberadios\.com/.test(c.url)), 'hijacked TubRadios domain must not be linked');
});
test('public skips all already viewed cards until every unseen card is exhausted',()=>{
 const cards=ALL_FEED_CARDS.slice(0,4);
 let state=base(),selected;
 for(let i=0;i<cards.length;i++){
  selected=nextFeedCard(cards,'public',state,'');
  assert.ok(selected);
  assert.equal(state.viewed[selected.id]||0,0,'must show unviewed');
  state=markViewed(state,selected.id);
 }
 const after=nextFeedCard(cards,'public',state,selected.id);
 assert.ok(after);
 assert.notEqual(after.id,selected.id);
});
test('following saves only opted-in cards and removes them on toggle',()=>{
 const card=ALL_FEED_CARDS[0];
 let s=base();
 assert.equal(feedCandidates(ALL_FEED_CARDS,'following',s).length,0);
 s=toggleFollowing(s,card.id);
 assert.equal(feedCandidates(ALL_FEED_CARDS,'following',s)[0].id,card.id);
 s=toggleFollowing(s,card.id);
 assert.equal(feedCandidates(ALL_FEED_CARDS,'following',s).length,0);
});
test('for you uses explicit engagement and category similarity without opaque or private financial records',()=>{
 const cards=ALL_FEED_CARDS;
 let state=base();
 const radio=feedCard('radio-zenith-console'),other=feedCard('radio-zenith-transoceanic');
 for(let i=0;i<4;i++)state=markOpened(state,radio.id);
 const ranked=feedCandidates(cards,'for-you',state);
 assert.equal(ranked[0].id,radio.id);
 assert.ok(ranked.indexOf(other)<ranked.indexOf(feedCard('whatsapp')),'radio interest helps another radio');
 assert.equal(state.counts[radio.id],4);
 assert.ok(!JSON.stringify(cleanFeedState(state)).includes('token'));
});
test('corrupt or oversized anonymous feed state is sanitized',()=>{
 const s=cleanFeedState({following:['google','google','bad/../id'],counts:{google:999999,secret:-4,robinhood:2.5},
  viewed:{google:3.1,robinhood:Infinity},advance:-9});
 assert.deepEqual(s.following,['google']);
 assert.equal(s.counts.google,5000);
 assert.equal(s.counts.robinhood,2);
 assert.equal(s.viewed.google,3);
 assert.equal(s.advance,0);
});
test('tab controls, mobile search, Bubbles specialists and existing website cards stay integrated',()=>{
 const index=raw('index.html'),ui=raw('quanta-feed.mjs'),css=raw('quanta-feed.css');
 assert.match(index,/id="quantaDiscoveryFeed"/);
 assert.match(index,/quanta-feed\.mjs\?v=/);
 for(const label of ['Public','For You','Following'])assert.match(ui,new RegExp(label));
 assert.match(ui,/aria-selected/);
 assert.match(ui,/aria-pressed/);
 assert.match(ui,/quantaFeedFeature/);
 assert.match(ui,/Next unseen card/);
 assert.match(ui,/localStorage\.setItem/);
 assert.match(ui,/embed\.src='\/bubbles-embed\.js'/);
 assert.match(ui,/wallet sync is not yet enabled/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(raw('quanta-feed-card.html'),/id="quantaFeedCardDetail"/);
 assert.match(raw('bubbles-card-catalog.mjs'),/app\("quanta-feed"/);
 assert.match(raw('bubbles-card-catalog.mjs'),/app\("vam-scarface"/);
 assert.ok(!ui.includes('document.cookie'));
 assert.ok(!ui.includes('api.robinhood.com'));
});
test('holdings, bank link, live Spaces and copyright-sensitive image feeds are truthfully restricted',()=>{
 assert.match(findDiscovery('robinhood').status,/not connected/i);
 assert.match(findDiscovery('chime').study,/No balances/);
 assert.match(findDiscovery('x-live-spaces').study,/authorized X Spaces search API/);
 assert.match(findDiscovery('vam-scarface').study,/photos remain on the original source/);
 assert.match(findDiscovery('just-radios').url,/justradios\.com\/capkits\.html/);
});
