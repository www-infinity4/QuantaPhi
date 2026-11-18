import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeNewsArticles,matchingNewsArticles,NEWS_TOPICS} from '../news-phi-quick-card.mjs';
const now=Date.parse('2026-11-17T18:00:00Z');
const item=(extra={})=>({title:'NASA publishes spacecraft research results',extract:'A newly released scientific report from a verified publisher describes a spacecraft research update and its findings.',url:'https://science.nasa.gov/story/one',publishedAt:'2026-11-17T17:00:00Z',...extra});
test('only dated fresh HTTPS publisher reports, canonical dedupe and newest first',()=>{
 const rows=[item(),item({url:'https://science.nasa.gov/story/one#part'}),item({url:'http://bad.test/x'}),item({url:'https://localhost/private'}),item({publishedAt:'2026-11-14T12:00:00Z'}),item({publishedAt:'2026-11-18T12:00:00Z'}),item({publishedAt:''}),item({extract:'short'}),item({title:'',url:'https://nasa.gov/blank'}),item({title:'AI chip advances in computer science',url:'https://www.reuters.com/tech/one',publishedAt:'2026-11-17T17:50:00Z'})];
 const news=normalizeNewsArticles(rows,now);
 assert.equal(news.length,2);assert.equal(news[0].url,'https://www.reuters.com/tech/one');
 assert.equal(news[1].url,'https://science.nasa.gov/story/one');assert.equal(news[1].source,'science.nasa.gov');
});
test('category selection filters publisher reports rather than creating example news',()=>{
 const all=normalizeNewsArticles([item(),item({url:'https://bbc.com/news/economy',title:'Businesses report trade growth',extract:'Business leaders from several companies reported economic growth this week, according to newly released market data.'})],now);
 assert.ok(NEWS_TOPICS.includes('Science')&&NEWS_TOPICS.includes('Technology'));
 assert.equal(matchingNewsArticles(all,'Science').length,1);assert.equal(matchingNewsArticles(all,'Business').length,1);
 assert.equal(matchingNewsArticles(all,'All').length,2);assert.deepEqual(matchingNewsArticles(all,'Sports'),[]);
});
test('one source-ready News Phi reader is mounted inside the existing Oracle deck',()=>{
 const src=readFileSync(new URL('../news-phi-quick-card.mjs',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(src,/dataset\.sourceId='news-phi-live'/);assert.match(src,/quantaphi:source-cards-ready/);
 assert.match(src,/newsPhiFeed/);assert.match(src,/Read original report/);
 assert.match(src,/Previous story/);assert.match(src,/Next story/);
 assert.match(html,/news-phi-quick-card\.mjs/);assert.match(html,/news-phi-quick-card\.css/);
 assert.doesNotMatch(src,/innerHTML\s*=/);
});
