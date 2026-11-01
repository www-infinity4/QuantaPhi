import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pickFreshArticles,pruneCurrentHeadlines,createRequestGate} from '../newsroom/live.mjs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base='https://quantaphi.org/newsroom/';

test('newsroom has unique crawlable editorial articles with original text and source links',()=>{
 const index=read('newsroom/index.html');
 const paths=['hubble-servicing.html','iowa-wisconsin-grid.html'];
 assert.match(index,/<h1[^>]*>[^<]*News Phi/i);
 assert.match(index,/href="\/privacy\.html"/);
 for(const path of paths){
  const html=read('newsroom/'+path);
  assert.match(html,new RegExp('<link rel="canonical" href="'+base+path.replaceAll('.','\\.')+'">'));
  assert.match(html,/<article[\s>]/);
  assert.match(html,/<time datetime="2026-11-01"/);
  assert.match(html,/QuantaPhi Research Desk/);
  assert.match(html,/<h1[^>]*>/);
  assert.match(html,/href="https:\/\/(?:science\.nasa\.gov|www\.energy\.gov)\//);
  assert.ok(html.match(/<p\b[^>]*>[\s\S]*?<\/p>/g)?.length>=7,path+' needs substantial original paragraphs');
 }
 assert.match(index,/href="hubble-servicing\.html"/);
 assert.match(index,/href="iowa-wisconsin-grid\.html"/);
});
test('newsroom is discoverable from homepage and sitemap without touching wallet',()=>{
 assert.match(read('index.html'),/href="\/newsroom\/"/);
 for(const path of ['','hubble-servicing.html','iowa-wisconsin-grid.html'])
  assert.ok(read('sitemap.xml').includes('<loc>'+base+path+'</loc>'));
});
test('fresh news feed rejects stale, future, non-HTTPS and thin stories',()=>{
 const now=Date.parse('2026-11-01T12:00:00Z');
 const good={title:'Verified news reporting source',extract:'Sufficiently detailed source description for a current news item.',publishedAt:'2026-11-01T11:00:00Z',url:'https://science.nasa.gov/news'};
 const items=pickFreshArticles([
 good,{...good,url:'http://example.com/unsafe'},
 {...good,url:'https://example.com/old',publishedAt:'2026-10-25T11:00:00Z'},
 {...good,url:'https://example.com/future',publishedAt:'2026-11-02T11:00:00Z'},
 {...good,url:'https://example.com/thin',extract:'short'},good
 ],now);
 assert.equal(items.length,1);
 assert.equal(items[0].url,good.url);
});
test('no full third-party copyrighted news articles are injected in client markup',()=>{
 const m=read('newsroom/live.mjs');
 assert.match(m,/textContent/);
 assert.doesNotMatch(m,/innerHTML/);
 assert.match(m,/news-phi-feed\.marvaseater\.workers\.dev/);
 assert.match(m,/15 \* 60 \* 1000/);
});
test('ads.txt declares the exact AdSense publisher already installed on homepage',()=>{
 const homepage=read('index.html');
 const publisher=homepage.match(/client=ca-(pub-\d{16})/);
 assert.ok(publisher,'Home page must retain its existing AdSense publisher ID');
 assert.equal(read('ads.txt').trim(),'google.com, '+publisher[1]+', DIRECT, f08c47fec0942fa0');
});

test('already loaded headlines expire at the next display rather than remaining as old news',()=>{
 const published=Date.parse('2026-11-01T12:00:00Z');
 const headline={title:'Source-backed recent event',extract:'A reasonably long summary that has been supplied by the original source feed.',publishedAt:new Date(published).toISOString(),url:'https://example.org/source'};
 assert.equal(pruneCurrentHeadlines([headline],published+47*60*60*1000).length,1);
 assert.equal(pruneCurrentHeadlines([headline],published+49*60*60*1000).length,0);
 assert.match(read('newsroom/live.mjs'),/stories=pruneCurrentHeadlines\(stories\)/);
});
test('newer request prevents older success or failure from replacing the current feed',()=>{
 const gate=createRequestGate();
 const older=gate.next(),newer=gate.next();
 assert.equal(gate.isCurrent(older),false);
 assert.equal(gate.isCurrent(newer),true);
 assert.match(read('newsroom/live.mjs'),/if\(!requestGate\.isCurrent\(version\)\)return/);
});
test('rotation controls are stable keyboard buttons with a pause and resume action',()=>{
 const html=read('newsroom/index.html');
 const js=read('newsroom/live.mjs');
 assert.match(html,/<button[^>]+id="fresh-next"/);
 assert.match(html,/<button[^>]+id="fresh-pause"[^>]+aria-pressed="false"/);
 assert.match(js,/pauseButton\.addEventListener\('click'/);
 assert.match(js,/nextButton\.addEventListener\('click'/);
 assert.doesNotMatch(js,/document\.createElement\('button'\)/);
});
