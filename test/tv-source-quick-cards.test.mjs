import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TV_EXPANSION_CHANNELS} from '../tv-quant-discovery.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const roots={
 cnn:'tvSourceCnnQuickCard',
 cnbc:'tvSourceCnbcQuickCard',
 'nasa-plus':'tvSourceNasaPlusQuickCard',
 'pbs-nova':'tvSourcePbsNovaQuickCard',
 'pbs-history':'tvSourcePbsHistoryQuickCard'
};

test('every broadcaster has a separate, publisher-sourced in-card video',()=>{
 assert.deepEqual(TV_EXPANSION_CHANNELS.map(x=>x.id),Object.keys(roots));
 for(const channel of TV_EXPANSION_CHANNELS){
  assert.equal(channel.mode,'official-video',channel.id+' must have playable source content');
  assert.match(channel.videoId,/^[\w-]{11}$/,channel.id);
  assert.ok(channel.videoTitle && channel.videoTitle.length>10,channel.id);
  assert.ok(channel.poster.includes(channel.videoId),'poster must match the actual video');
  assert.match(channel.access,/live|subscription|free|PBS|public/i);
 }
});

test('news, finance, NASA and PBS are independent Oracle directions, not one scrolling wall',()=>{
 const deck=read('oracle-card-deck.js');
 const catalog=read('bubbles-card-catalog.mjs');
 for(const [source,id] of Object.entries(roots)){
  assert.ok(deck.includes("['"+id+"'"),'Oracle deck missing '+source);
  assert.ok(deck.includes(id+':['),'Oracle topic direction missing '+source);
  assert.ok(catalog.includes("'"+source+"'"),'Bubbles catalog missing '+source);
 }
 assert.doesNotMatch(deck,/\['tvQuantExpansion','CNN CNBC NASA PBS/);
 assert.match(deck,/tvQuantExpansion:\['quant-tv-movies'/);
});

test('all source playback remains in its own card and stops on Oracle switching',()=>{
 const builder=read('tv-source-quick-cards.mjs');
 const integration=read('tv-501-expansion.mjs');
 assert.match(integration,/mountTvSourceQuickCards\(host,TV_EXPANSION_CHANNELS\)/);
 assert.doesNotMatch(integration,/grid\.appendChild\(el\('article','channelphi-card channelphi-source/);
 assert.match(builder,/document\.getElementById\(id\)/);
 assert.doesNotMatch(builder,/insertBefore\(card,host\)/);
 assert.match(builder,/youtube-nocookie\.com\/embed\//);
 assert.match(builder,/quantaphi:tv-playback-request/);
 assert.match(builder,/oracle:card-deactivated/);
 assert.match(builder,/visibilitychange/);
 assert.match(builder,/pagehide/);
 assert.doesNotMatch(builder,/window\.open|target\s*=\s*['"]_blank|location\.assign/);
 assert.match(builder,/playsinline/);
 assert.match(builder,/channelphi-video-slot/);
});

test('Oracle Octaves light treatment and one-screen playback are available on phones',()=>{
 const css=read('tv-501-expansion.css');
 assert.match(css,/\.channelphi-standalone-source/);
 assert.match(css,/--oracle-paper|#f7f4f0|#fff/);
 assert.match(css,/aspect-ratio:\s*16\s*\/\s*9/);
 assert.match(css,/@media\s*\(max-width:\s*430px\)/);
 const deckCss=read('oracle-card-deck.css');
 for(const id of Object.values(roots))assert.ok(deckCss.includes('#'+id),'card must not appear in a grouped homepage scroll: '+id);
 assert.match(deckCss,/body\.oracle-card-deck-active main\.app/);
 const home=read('index.html');
 assert.match(home,/id="tvQuantExpansion"/);
 for(const id of Object.values(roots))assert.ok(home.includes('id="'+id+'"'),'missing stable card anchor '+id);
 assert.match(home,/tv-501-expansion\.mjs/);
});
