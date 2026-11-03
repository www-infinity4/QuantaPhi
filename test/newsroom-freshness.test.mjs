import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshFeatures,pickFreshSource} from '../newsroom/fresh-reports.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const now=Date.parse('2026-11-02T20:00:00Z');
const source={title:'New independent research results published this morning',extract:'Detailed explanatory source reporting with original findings and references.',url:'https://science.nasa.gov/missions/hubble/sample-new-research',publishedAt:'2026-11-02T16:00:00Z'};
test('original stories are presented newest-first only while genuinely new',()=>{
 const data={articles:[
  {title:'NASA old story',url:'hubble-servicing.html',publishedAt:'2026-11-01T01:00:00Z',sourceUrl:'https://science.nasa.gov/older'},
  {title:'New science',url:'hubble-missing-oxygen.html',publishedAt:'2026-11-02T14:00:00Z',sourceUrl:'https://science.nasa.gov/new'},
  {title:'New fusion',url:'fusion-research-awards.html',publishedAt:'2026-11-02T15:00:00Z',sourceUrl:'https://www.energy.gov/new'}
 ]};
 assert.deepEqual(freshFeatures(data,now).map(a=>a.title),['New fusion','New science']);
 assert.deepEqual(freshFeatures(data,now+3*86400000),[]);
 assert.deepEqual(freshFeatures({articles:[{title:'Wrong',url:'https://evil.invalid/phishing',publishedAt:'2026-11-02T19:00:00Z',sourceUrl:'https://example.invalid'}]},now),[]);
});
test('live full-story source must be recent and not a copied fake date',()=>{
 assert.equal(pickFreshSource([source],now)?.url,source.url);
 assert.equal(pickFreshSource([{...source,publishedAt:'2026-10-25T08:00:00Z'}],now),null);
 assert.equal(pickFreshSource([{...source,publishedAt:'2026-11-04T08:00:00Z'}],now),null);
 assert.equal(pickFreshSource([{...source,url:'http://evil.invalid/news'}],now),null);
});
test('newsroom homepage no longer pins the November 1 NASA article as a current feature',()=>{
 const hub=read('newsroom/index.html');
 assert.match(hub,/id="featured-articles"/);
 assert.match(hub,/id="archive-articles"/);
 assert.match(hub,/id="live-full-story"/);
 assert.doesNotMatch(hub,/Space · Published November 1, 2026/);
 assert.match(hub,/fresh-reports\.mjs/);
});
test('today original reports are full publicly readable pages and older reports are archive only',()=>{
 const data=JSON.parse(read('newsroom/latest.json'));
 assert.ok(data.articles.some(x=>x.url==='hubble-missing-oxygen.html'&&x.publishedAt.startsWith('2026-11-02')));
 assert.ok(data.articles.some(x=>x.url==='fusion-research-awards.html'&&x.publishedAt.startsWith('2026-11-02')));
 for(const path of ['hubble-missing-oxygen.html','fusion-research-awards.html']){
  const article=read('newsroom/'+path);
  assert.match(article,/<time datetime="2026-11-02"/);
  assert.match(article,/<article/);
  assert.ok((article.match(/<p[ >]/g)||[]).length>=8);
  assert.ok(read('sitemap.xml').includes('<loc>https://quantaphi.org/newsroom/'+path+'</loc>'));
 }
});
test('Cloudflare full report source is never presented as authored when report is short or unavailable',()=>{
 const js=read('newsroom/fresh-reports.mjs');
 assert.match(js,/\/v1\/news\/read/);
 assert.match(js,/reportUnavailable/);
 assert.match(js,/paragraphs\.length/);
 assert.doesNotMatch(js,/innerHTML/);
});