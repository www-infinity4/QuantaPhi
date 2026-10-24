import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DISCOVERY_CARDS,findDiscovery,safeDiscovery} from '../quanta-feed-catalog.mjs';
import {ALL_FEED_CARDS,feedCard} from '../quanta-feed.mjs';
import {validSpaceLink,readIndexedSpaces} from '../quanta-feed-spaces.mjs';
import {quantScores,loadOwnQuantScores} from '../quanta-feed-quants.mjs';
import {cleanFeedState,feedCandidates,nextFeedCard,nextFeedDirection,directionScore,markOpened,markViewed,toggleFollowing} from '../quanta-feed-rank.mjs';
const raw=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base=()=>({...cleanFeedState({}),catalog:ALL_FEED_CARDS});
test('public contains every original quick card and 23 new independent cards',()=>{
 assert.equal(DISCOVERY_CARDS.length,23);
 assert.equal(new Set(ALL_FEED_CARDS.map(x=>x.id)).size,ALL_FEED_CARDS.length);
 for(const id of ['muse-ai','webb','google','reddit','radio-philco-90','just-radios','robinhood','chime','ebay','gold','silver','us-mint','pcgs','ngc','x-live-spaces','wikipedia','vam-scarface','instructables','vintage-toys','antique-collectibles']){
  assert.ok(feedCard(id),id);
 }
 for(const c of DISCOVERY_CARDS){assert.ok(safeDiscovery(c),c.id);assert.equal(findDiscovery(c.id),c);}
 for(const id of ['pixie-stories','cardone-capital','media-star','infinity-radio','bitcoin-crusher','story-writer'])assert.ok(feedCard(id),'Public should contain existing QuantaPhi '+id);
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
 assert.doesNotMatch(index,/<script type="module" src="\/quanta-feed\.mjs/);
 assert.match(index,/id="quantaDiscoveryFeed"[^>]+hidden/);
 assert.match(index,/id="oracleCardDeck"/);
 for(const label of ['Public','For You','Following'])assert.match(ui,new RegExp(label));
 assert.match(ui,/aria-selected/);
 assert.match(ui,/aria-pressed/);
 assert.match(ui,/quantaFeedFeature/);
 assert.match(ui,/window\.QuantaOpenSite\(link\)/);
 assert.match(ui,/link\.dataset\.siteUrl=target/);
 assert.ok(!ui.includes('QuantaOpenSite(target,card.name)'), 'viewer requires DOM element');
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

test('live Spaces card reads only verified wallet-indexed original titles without claiming live X status',async()=>{
 assert.equal(validSpaceLink('https://x.com/i/spaces/1OyKAjYPeXqGb'),true);
 assert.equal(validSpaceLink('https://evil.example/i/spaces/1OyKAjYPeXqGb'),false);
 assert.equal(validSpaceLink('javascript:alert(1)'),false);
 await assert.rejects(readIndexedSpaces({token:''}),/wallet_not_connected/);
 const calls=[];
 const data=[
  {hosts:[{handle:'tester',name:'Test host'}]},
  {episodes:[{title:'Original Q&A',url:'https://x.com/i/spaces/1OyKAjYPeXqGb',availability:'indexed'},
    {title:'Locked show',url:'https://x.com/i/spaces/1MnGnPEEvWYxO',requiresOriginalUnlock:true},
    {title:'Bad host',url:'https://evil.example/i/spaces/ABCD123456789'}]}
 ];
 const result=await readIndexedSpaces({token:'sq_'+ 'a'.repeat(32),fetcher:async(url,options)=>{
  calls.push({url,token:options.headers.Authorization});
  return {ok:true,json:async()=>data[calls.length-1]};
 }});
 assert.equal(result.episodes.length,1);
 assert.equal(result.episodes[0].title,'Original Q&A');
 assert.equal(result.liveVerified,false);
 assert.match(result.episodes[0].status,/unverified/);
 assert.ok(calls.every(c=>c.token==='Bearer sq_'+ 'a'.repeat(32)));
 assert.deepEqual(calls.map(c=>c.url.split('/v1/')[1]),['hosts','episodes?handle=tester']);
});

test('For You uses only signed-in committed Quant search topics and never persists raw queries',async()=>{
 const radios=ALL_FEED_CARDS.filter(x=>x.category==='Vintage radios');
 const topics=[{query:'philco tube radio restoration',hits:7},{query:'silver Morgan dollar',hits:2}];
 const map=quantScores(topics,ALL_FEED_CARDS);
 assert.ok(map['radio-philco-90']>0);
 assert.ok(map['silver']>0);
 const state={...base(),quantScores:map};
 const ranked=feedCandidates(ALL_FEED_CARDS,'for-you',state);
 assert.ok(ranked.indexOf(feedCard('radio-philco-90'))<ranked.indexOf(feedCard('whatsapp')));
 let requests=0;
 const bridge={authenticatedFetch:async(url)=>{requests++;assert.match(url,/quants\/interests/);return {ok:true,json:async()=>({ok:true,total_searches:15,topics})}}};
 const result=await loadOwnQuantScores(bridge,ALL_FEED_CARDS);
 assert.equal(result.connected,true);
 assert.equal(result.committedSearches,15);
 assert.equal(requests,1);
 assert.ok(!JSON.stringify(cleanFeedState(state)).includes('philco tube radio restoration'));
 assert.equal((await loadOwnQuantScores(null,ALL_FEED_CARDS)).connected,false);
});

test('Choose Direction learns useful next-card workflows instead of repeating favorites',()=>{
 const cards=[
  {id:'radio-study',name:'Philco Tube Radio',category:'Vintage radios',feature:'Study a cathedral receiver',study:'Philco repair and restoration schematic'},
  {id:'radio-kit',name:'Radio Component Kit',category:'Vintage radios',feature:'Build a restoration kit',study:'Philco radio replacement components and schematic'},
  {id:'unrelated',name:'Movie News',category:'Entertainment',feature:'Watch a film',study:'Movie trailers'}
 ];
 let s=cleanFeedState({});
 for(let i=0;i<3;i++)s=markOpened(s,'radio-study');
 s=markOpened(s,'radio-kit');
 assert.equal(s.transitions['radio-study']['radio-kit'],1);
 const result=nextFeedDirection(cards,'public',{...s,catalog:cards},'radio-study');
 assert.equal(result.card.id,'radio-kit');
 assert.match(result.reason,/previous card choices/i);
 assert.ok(directionScore(cards[0],cards[1],s).score>directionScore(cards[0],cards[2],s).score);
 assert.equal(nextFeedDirection(cards,'public',s,'radio-kit').card.id,'radio-study','no immediate identical card');
});
test('Following is strict, Public remains broad, For You uses Quant interests without persisting raw queries',()=>{
 const cards=[
  {id:'story',name:'Original story',category:'Stories',feature:'Read a story',study:'Creative writing'},
  {id:'writer',name:'Story Writer',category:'Stories',feature:'Write a story',study:'Create an original story'},
  {id:'radio',name:'Radio',category:'Music',feature:'Listen to classic radio',study:'Antique radio programs'}
 ];
 let s=cleanFeedState({});
 assert.equal(nextFeedDirection(cards,'following',s,'story').card,null);
 s=toggleFollowing(s,'writer');
 assert.equal(nextFeedDirection(cards,'following',s,'story').card.id,'writer');
 s={...s,quantScores:{radio:70}};
 assert.equal(nextFeedDirection(cards,'for-you',s,'story').card.id,'radio');
 assert.equal(nextFeedDirection(cards,'public',s,'story').card.id,'writer','public contextual transition uses next writing step');
 const stored=cleanFeedState({...s,transitions:{story:{writer:2,radio:-1,bad:'oops'}}});
 assert.equal(stored.transitions.story.writer,2);
 assert.equal(stored.transitions.story.radio,undefined);
 assert.ok(!JSON.stringify(stored).includes('quantScores'));
});
test('Oracle viewer uses same activity source, scoped tabs and original mounted interactive controls',()=>{
 const source=raw('oracle-card-deck.js'),html=raw('index.html'),style=raw('oracle-card-deck.css');
 for(const tab of ['public','for-you','following'])assert.match(html,new RegExp('data-oracle-feed="'+tab+'"'));
 assert.match(html,/id="oracleCardFollow"/);
 assert.match(html,/id="oracleCardReason"/);
 assert.match(source,/nextFeedDirection/);
 assert.match(source,/markOpened\(readDirections\(\),active\.feedId\)/);
 assert.match(source,/markViewed\(readDirections\(\),entry\.feedId\)/);
 assert.match(source,/quantaphi:feed-updated/);
 assert.match(source,/loadOwnQuantScores/);
 assert.match(source,/stage\.append\(entry\.node\)/);
 assert.doesNotMatch(source,/cloneNode/);
 assert.match(style,/\.oracle-direction-tabs/);
 assert.match(style,/\.oracle-direction-action/);
});

test('every tab completes repeated catalog rounds despite extreme favorite scores',()=>{
 const cards=ALL_FEED_CARDS.slice(0,12);
 for(const tab of ['public','for-you','following']){
  let state=cleanFeedState({following:cards.map(c=>c.id),counts:{[cards[0].id]:5000},viewed:{[cards[0].id]:20}});
  state={...state,catalog:cards,quantScores:{[cards[0].id]:70}};
  let current=cards[0].id;
  for(let round=0;round<3;round++){
   const seen=new Set();
   for(let i=0;i<cards.length-1;i++){
    const next=nextFeedDirection(cards,tab,state,current).card;
    seen.add(next.id);state=markViewed(state,next.id);current=next.id;
   }
   assert.equal(seen.size,cards.length-1,tab+' must expose every less-seen card each round');
  }
 }
});
