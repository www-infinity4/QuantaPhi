import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CREATOR_CHANNELS, parseCreatorInput, mixCreatorVideos, pageCreatorVideos, CREATOR_MIX_SOURCE, LANDING_AUTISM_SOURCE} from '../youtube-creator-mixed-core.mjs';
import {parseCreatorUploads, creatorUploadsApi} from '../workers/quantaphi-site/creator-uploads.mjs';
import {findSourceCard, isPublicSourceCard, validSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor} from '../quanta-context-placement.mjs';

const video=(channelId,videoId,title)=>({channelId,videoId,title,sourceUrl:'https://www.youtube.com/watch?v='+videoId,publishedAt:null});

test('Creator mix preserves known channel IDs and a separate owner-linked Samirah source',()=>{
 assert.deepEqual(CREATOR_CHANNELS.map(c=>c.key),['gana','abbe','julie','samirah','landing']);
 assert.equal(CREATOR_CHANNELS[0].channelId,'UC6ySmwN_K8fGGD2EKLQdEGA');
 assert.equal(CREATOR_CHANNELS[1].channelId,'UCFsg41h5GN7TAxFUK3Sl00w');
 assert.equal(CREATOR_CHANNELS[2].channelId,'UCt_P3xPrrnOkYT5UQQ4vUIg');
 assert.equal(CREATOR_CHANNELS[0].seed[0].videoId,'OqRb8RKNgQQ');
 assert.equal(CREATOR_CHANNELS[2].seed[0].videoId,'G6zpr59jEas');
 assert.ok(CREATOR_CHANNELS.every(c=>c.url.startsWith('https://www.youtube.com/@')));
});

test('owner additions accept only genuine YouTube video and channel links',()=>{
 assert.deepEqual(parseCreatorInput('https://youtu.be/OqRb8RKNgQQ?is=abc'),{type:'video',videoId:'OqRb8RKNgQQ'});
 assert.deepEqual(parseCreatorInput('https://www.youtube.com/watch?v=G6zpr59jEas'),{type:'video',videoId:'G6zpr59jEas'});
 assert.deepEqual(parseCreatorInput('https://www.youtube.com/shorts/G6zpr59jEas'),{type:'video',videoId:'G6zpr59jEas'});
 assert.deepEqual(parseCreatorInput('https://www.youtube.com/channel/UC6ySmwN_K8fGGD2EKLQdEGA'),{type:'channel',channelId:'UC6ySmwN_K8fGGD2EKLQdEGA'});
 assert.deepEqual(parseCreatorInput('https://www.youtube.com/@ganatribe'),{type:'handle',handle:'ganatribe'});
 for(const bad of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=OqRb8RKNgQQ','https://youtu.be.evil.test/OqRb8RKNgQQ','https://www.youtube.com/watch?v=bad','https://www.youtube.com:444/watch?v=OqRb8RKNgQQ','https://user:pass@www.youtube.com/watch?v=OqRb8RKNgQQ']){
  assert.equal(parseCreatorInput(bad),null,bad);
 }
});

test('mixed carousel removes duplicate IDs, preserves per-channel turns and paginates without fake results',()=>{
 const rows=[
  video('gana','OqRb8RKNgQQ','Mama'),
  video('gana','Hgnky3ALB4Y','Garden'),
  video('abbe','cF6XusNOfjM','Daycare'),
  video('julie','G6zpr59jEas','Trees'),
  video('gana','OqRb8RKNgQQ','Duplicate')
 ];
 const mixed=mixCreatorVideos(rows,['gana','abbe','julie']);
 assert.deepEqual(mixed.map(x=>x.videoId),['OqRb8RKNgQQ','cF6XusNOfjM','G6zpr59jEas','Hgnky3ALB4Y']);
 assert.deepEqual(pageCreatorVideos(mixed,0,2).map(x=>x.videoId),['OqRb8RKNgQQ','cF6XusNOfjM']);
 assert.deepEqual(pageCreatorVideos(mixed,2,2).map(x=>x.videoId),['G6zpr59jEas','Hgnky3ALB4Y']);
 assert.deepEqual(pageCreatorVideos(mixed,100,8),[]);
});

const xml=`<?xml version="1.0"?><feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
 <yt:channelId>UC6ySmwN_K8fGGD2EKLQdEGA</yt:channelId>
 <entry><yt:videoId>Hgnky3ALB4Y</yt:videoId><title>The Garden &amp; Mama</title>
 <published>2026-11-11T13:00:25+00:00</published></entry>
 <entry><yt:videoId>Hgnky3ALB4Y</yt:videoId><title>Duplicate</title></entry>
 <entry><yt:videoId>invalid</yt:videoId><title>Wrong ID</title></entry></feed>`;

test('bounded official RSS parser validates source channel, ID, title, date and deduplicates',()=>{
 const found=parseCreatorUploads(xml,'UC6ySmwN_K8fGGD2EKLQdEGA');
 assert.equal(found.length,1);
 assert.equal(found[0].videoId,'Hgnky3ALB4Y');
 assert.equal(found[0].title,'The Garden & Mama');
 assert.equal(found[0].sourceUrl,'https://www.youtube.com/watch?v=Hgnky3ALB4Y');
 assert.equal(found[0].publishedAt,'2026-11-11T13:00:25+00:00');
 assert.deepEqual(parseCreatorUploads(xml,'UCt_P3xPrrnOkYT5UQQ4vUIg'),[]);
});

test('read-only edge handler has fixed YouTube RSS origin, bounded results and rejects invalid channels',async()=>{
 let requested;
 const fetcher=async url=>{requested=String(url);return new Response(xml,{status:200});};
 const bad=await creatorUploadsApi(new Request('https://quantaphi.org/api/creator-uploads?channel=not-a-channel'),fetcher);
 assert.equal(bad.status,400);
 assert.equal(requested,undefined);
 const ok=await creatorUploadsApi(new Request('https://quantaphi.org/api/creator-uploads?channel=UC6ySmwN_K8fGGD2EKLQdEGA'),fetcher);
 assert.equal(ok.status,200);
 const json=await ok.json();
 assert.equal(json.complete,false);
 assert.equal(json.videos.length,1);
 assert.equal(json.source,'YouTube public uploads RSS');
 assert.equal(new URL(requested).hostname,'www.youtube.com');
 assert.equal(new URL(requested).pathname,'/feeds/videos.xml');
 assert.equal(new URL(requested).searchParams.get('channel_id'),'UC6ySmwN_K8fGGD2EKLQdEGA');
});

test('mixed channel Quick Card is a Public/Media Oracle card with one click-to-play official player',()=>{
 const card=findSourceCard('youtube-creator-mix');
 assert.equal(card?.id,CREATOR_MIX_SOURCE.id);
 assert.ok(isPublicSourceCard(card));
 assert.ok(validSourceCard(card));
 assert.equal(departmentFor(card),'media');
 assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
 const ui=readFileSync(new URL('../youtube-creator-mixed-card.mjs',import.meta.url),'utf8');
 const experience=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');
 assert.match(ui,/Load more videos/);
 assert.match(ui,/Add channel or video/);
 assert.match(ui,/youtube-nocookie\.com\/embed/);
 assert.match(ui,/Stop playback/);
 assert.match(ui,/localStorage/);
 assert.match(experience,/mountMixedCreatorCard\(root,card\)/);
 assert.match(worker,/if\(incoming\.pathname==='\/api\/creator-uploads'\)return videoAPI\(request,env\)/);
 const api=readFileSync(new URL('../workers/quantaphi-site/video-api.mjs',import.meta.url),'utf8');
 assert.match(api,/if\(path==='\/api\/creator-uploads'\)return creatorUploadsApi\(request,fetcher\)/);
 assert.doesNotMatch(ui,/autoplay=1/);
});

test('Samirah owner-linked seed appears in creator mix without claiming a verified RSS channel ID',()=>{
 const channel=CREATOR_CHANNELS.find(row=>row.key==='samirah');
 assert.ok(channel);
 assert.equal(channel.channelId,null);
 assert.equal(channel.seed.length,1);
 assert.equal(channel.seed[0].videoId,'UPFgnpkm7MQ');
 assert.equal(channel.seed[0].sourceUrl,'https://www.youtube.com/watch?v=UPFgnpkm7MQ');
 assert.ok(CREATOR_MIX_SOURCE.name.includes('Samirah'));
 const all=CREATOR_CHANNELS.flatMap(row=>row.seed.map(v=>({...v,channelId:row.key})));
 assert.equal(mixCreatorVideos(all,CREATOR_CHANNELS.map(row=>row.key)).filter(v=>v.videoId==='UPFgnpkm7MQ').length,1);
});


test('LANDing Autism publisher has a standalone Public/Media full-channel Quick Card with six original video links',()=>{
 const channel=CREATOR_CHANNELS.find(row=>row.key==='landing');
 assert.ok(channel);
 assert.equal(channel.name,'LANDing Autism');
 assert.equal(channel.channelId,'UCQU1zvNELO2AatGXMRQ2bSw');
 assert.equal(channel.url,'https://www.youtube.com/@LANDingAutism');
 assert.equal(channel.seed.length,6);
 assert.deepEqual(channel.seed.map(v=>v.videoId),[
  'QR_c5m1RLtk','ZXcfl1rNQP0','MuZXaYXfPXs','xDr8qOYR93M','rS_P180JLU8','4CjRqGBkjQY'
 ]);
 assert.ok(channel.seed.every(v=>v.sourceUrl==='https://www.youtube.com/watch?v='+v.videoId));
 const card=findSourceCard('landing-autism-youtube');
 assert.equal(card?.id,LANDING_AUTISM_SOURCE.id);
 assert.equal(card?.initialCreatorChannel,'landing');
 assert.equal(card?.youtubeMixedFeed,true);
 assert.ok(isPublicSourceCard(card));
 assert.ok(validSourceCard(card));
 assert.equal(departmentFor(card),'media');
 assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
 const ui=readFileSync(new URL('../youtube-creator-mixed-card.mjs',import.meta.url),'utf8');
 assert.match(ui,/card\\.initialCreatorChannel/);
 assert.match(ui,/Full channel/);
 assert.match(ui,/Load more videos/);
 assert.match(ui,/youtube-nocookie\\.com\\/embed/);
});
