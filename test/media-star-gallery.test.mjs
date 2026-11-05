import test from 'node:test';
import assert from 'node:assert/strict';
import {rankPublicMediaStars,validateGallerySubmission,extractPublicInterest} from '../media-star-gallery-core.mjs';
import {readFileSync} from 'node:fs';

const football={id:'ms-football',title:'Football Radio Replay',description:'Archived game analysis',topics:['football','sports'],status:'approved',rightsVerified:true,imageVerified:true,imageUrl:'https://media.example.com/football.jpg',sourceUrl:'https://media.example.com/football.mp3',mediaMode:'linked_audio',reviewReceipt:'review-verified-001'};
const science={...football,id:'ms-science',title:'Science Weekly Radio',topics:['science','physics'],sourceUrl:'https://media.example.com/science.mp3'};
test('match an explicit football interest only against approved rights-checked Media Stars',()=>{
 const result=rankPublicMediaStars([science,football],{interestTerms:['football']});
 assert.equal(result[0].id,'ms-football');
 assert.equal(result[1].id,'ms-science');
});
test('hide cards that are pending, missing original imagery or without verified rights',()=>{
 const bad=[
  {...football,id:'pending',status:'pending_review'},
  {...football,id:'no-rights',rightsVerified:false},
  {...football,id:'no-image',imageVerified:false},
  {...football,id:'no-source',sourceUrl:''},
  {...football,id:'no-receipt',reviewReceipt:''}
 ];
 assert.deepEqual(rankPublicMediaStars([...bad,football],{interestTerms:['football']}).map(x=>x.id),['ms-football']);
});
test('publisher can submit only a genuine https source with a rights declaration',()=>{
 const form={title:'An original radio show',description:'A show about football',sourceUrl:'https://radio.example/episode.mp3',imageUrl:'https://radio.example/cover.webp',topics:['football','sports'],confirmRights:true};
 const result=validateGallerySubmission(form);
 assert.equal(result.title,form.title);
 assert.deepEqual(result.topics,['football','sports']);
 for(const invalid of [
  {...form,confirmRights:false},
  {...form,sourceUrl:'http://example.org/audio.mp3'},
  {...form,imageUrl:'javascript:alert(1)'},
  {...form,imageUrl:''},
  {...form,topics:['football','football']}
 ])assert.throws(()=>validateGallerySubmission(invalid));
});
test('interest extraction uses public query only when visitor invokes interest matching',()=>{
 assert.deepEqual(extractPublicInterest('Show football highlights',true),['football','highlights']);
 assert.deepEqual(extractPublicInterest('Show football highlights',false),[]);
 assert.deepEqual(extractPublicInterest('',true),[]);
});
test('homepage keeps creator entry visible and does not imply a click is a payment',()=>{
 const page=readFileSync('index.html','utf8');
 const widget=readFileSync('media-star-gallery.mjs','utf8');
 const worker=readFileSync('workers/media-star-gallery/worker.mjs','utf8');
 assert.match(page,/href="#mediaStarCreator"[^>]*>\+ Build a Media Star/);
 assert.match(page,/id="mediaStarGallery"/);
 assert.match(page,/media-star-gallery\.mjs/);
 assert.match(widget,/No approved Media Stars/);
 assert.doesNotMatch(worker,/mintToken|star_coins\s*=|wallet\/spend/);
});
