import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeTvSchedule,filterTvSchedule} from '../tv-guide-quick-card.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const episode=(id,stamp,network,extra={})=>({
 id,airstamp:stamp,name:'The Day',season:2,number:4,runtime:42,
 url:'https://www.tvmaze.com/episodes/'+id+'/the-day',
 summary:'<p>A real description of the episode.</p>',
 image:{original:'https://static.tvmaze.com/uploads/images/original_untouched/1/2.jpg'},
 show:{name:'A Program',network:{name:network},summary:'Show description',...extra}
});
test('dated schedule consumes episode artwork and descriptions without inventing metadata',()=>{
 const rows=normalizeTvSchedule([
  episode(2,'2026-11-01T20:00:00-05:00','FOX'),
  episode(1,'2026-11-01T09:00:00-05:00','ABC'),
  {airstamp:'bad',show:{name:'Fake',network:{name:'Z'}}},
  {airstamp:'2026-11-01T17:00:00-05:00',show:{name:'Fake',network:{name:'Z'}}}
 ]);
 assert.equal(rows.length,2);
 assert.equal(rows[0].network,'ABC');
 assert.equal(rows[0].title,'A Program');
 assert.equal(rows[0].description,'A real description of the episode.');
 assert.match(rows[0].artwork,/static\.tvmaze\.com/);
 assert.equal(rows[0].runtime,42);
 assert.ok(rows[0].stamp<rows[1].stamp);
 assert.deepEqual(normalizeTvSchedule(null),[]);
});
test('time and network filters preserve local time and no fabrication',()=>{
 const rows=normalizeTvSchedule([
  episode(1,'2026-10-30T09:00:00-05:00','ABC'),
  episode(2,'2026-10-30T19:00:00-05:00','FOX'),
  episode(3,'2026-10-30T22:35:00-05:00','FOX')
 ]);
 assert.equal(filterTvSchedule(rows,{network:'FOX'}).length,2);
 assert.equal(filterTvSchedule(rows,{network:'DOES NOT EXIST'}).length,0);
 assert.equal(filterTvSchedule(rows,{slot:'all'}).length,3);
 // Device local timezone can differ; compare each predicate to local Date hours.
 for(const slot of ['morning','afternoon','prime','late']){
  const subset=filterTvSchedule(rows,{slot});
  for(const entry of subset){
   const h=new Date(entry.stamp).getHours();
   assert.ok(slot==='morning'?h>=6&&h<12:slot==='afternoon'?h>=12&&h<17:slot==='prime'?h>=17&&h<22:h>=22||h<6);
  }
 }
});
test('missing images and markup degrade to honest text and safe source links',()=>{
 const valid=episode(9,'2026-11-01T17:00:00-05:00','KYOU');
 valid.image=null;valid.show.image=null;valid.summary='<script>BAD</script><p>Documentary &amp; interview</p>';
 const row=normalizeTvSchedule([valid])[0];
 assert.equal(row.artwork,null);
 assert.doesNotMatch(row.description,/<|>/);
 assert.ok(row.description.includes('Documentary'));
 const unsafe=episode(11,'2026-11-01T19:00:00-05:00','FOX');
 unsafe.url='javascript:alert(1)';unsafe.show.url=null;
 assert.equal(normalizeTvSchedule([unsafe]).length,0);
});
test('guide is integrated into all source-card entrypoints, and declares attribution and honest limitations',()=>{
 const experience=read('quanta-card-experience.mjs');
 const source=read('source-quick-cards.mjs');
 const css=read('quanta-card-experience.css');
 const guide=read('tv-guide-quick-card.mjs');
 assert.match(experience,/mountInfinityTvGuide\(root\)/);
 assert.match(source,/source\('tv-guide'/);
 assert.match(guide,/www\.tvguide\.com\/listings/);
 assert.match(guide,/creativecommons\.org\/licenses\/by-sa\/4\.0/);
 assert.match(guide,/aria-live/);
 assert.match(guide,/scroll-snap/);
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(guide,/No scheduled episodes were supplied/);
 assert.match(guide,/could not be loaded/);
 assert.doesNotMatch(guide,/fake live|demo schedule/i);
});
test('shared studio requires professional landscape hero assets and provides a usable fallback',()=>{
 const builder=read('quick-card-builder.js');
 const form=read('quick-card-builder.html');
 const standard=read('docs/UNIVERSAL-QUICK-CARD-CONTRACT.md');
 assert.match(builder,/verifyCardImage/);
 assert.match(builder,/naturalWidth<1200/);
 assert.match(builder,/naturalHeight<675/);
 assert.match(form,/Professional card artwork standard/);
 assert.match(form,/qcpImageQualityStatus/);
 assert.match(standard,/not image-ready/);
});
