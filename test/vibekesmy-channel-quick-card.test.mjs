import test from 'node:test';
import assert from 'node:assert/strict';
import * as creators from '../youtube-creator-mixed-core.mjs';
import {findSourceCard,isPublicSourceCard,validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';
import {parseCreatorUploads} from '../workers/quantaphi-site/creator-uploads.mjs';

const publisher='UCalI6vlQ7ypPrUTlIiIrrug';
const requested='hYfaFMzRwT8';
const original='https://www.youtube.com/watch?v='+requested;

test('owner video hYfaFMzRwT8 belongs to verified vibekesmy creator, not another breastfeeding channel',()=>{
 const channel=creators.CREATOR_CHANNELS.find(c=>c.key==='vibekesmy');
 assert.ok(channel,'Owner-verified uploader must be in the existing creator selector');
 assert.equal(channel.name,'vibekesmy');
 assert.equal(channel.channelId,publisher);
 assert.equal(channel.url,'https://www.youtube.com/@vibekesmy');
 assert.ok(channel.seed.some(v=>v.videoId===requested&&v.title==='Å legge barnet til brystet'&&v.sourceUrl===original));
 assert.equal(new Set(channel.seed.map(v=>v.videoId)).size,channel.seed.length);
 assert.ok(channel.seed.every(v=>v.channelId===publisher&&v.publishedAt===null));
});

test('original creator gets one fully functional Public/Media Quick Card, without claiming entire archive or royalties',()=>{
 const source=creators.VIBEKESMY_SOURCE;
 assert.equal(source?.id,'vibekesmy-youtube');
 assert.equal(source.initialCreatorChannel,'vibekesmy');
 assert.equal(source.initialCreatorVideoId,requested);
 assert.equal(source.youtubeMixedFeed,true);
 assert.equal(source.official,'https://www.youtube.com/@vibekesmy');
 assert.equal(source.featureUrl,'https://www.youtube.com/@vibekesmy/videos');
 assert.match(source.details,/not a complete historical/i);
 assert.doesNotMatch(source.details,/paid placement|payout confirmed|licensed rehost/i);
 const card=findSourceCard(source.id);
 assert.ok(card);
 assert.ok(isPublicSourceCard(card)&&validSourceCard(card));
 assert.equal(departmentFor(card),'media');
 assert.equal(ALL_FEED_CARDS.filter(v=>v.id===card.id).length,1);
});

test('verified vibekesmy channel RSS can be imported but unrelated feed is rejected',()=>{
 const xml='<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">'+
   '<yt:channelId>alI6vlQ7ypPrUTlIiIrrug</yt:channelId>'+
   '<entry><yt:videoId>BEWHhI6CJ3k</yt:videoId><title>The latch</title>'+
   '<published>2010-11-12T12:02:35+00:00</published></entry></feed>';
 const found=parseCreatorUploads(xml,publisher);
 assert.equal(found.length,1);
 assert.equal(found[0].videoId,'BEWHhI6CJ3k');
 assert.deepEqual(parseCreatorUploads(xml,'UC_L7fz1PtuNZrJEONwym2Kw'),[]);
});
