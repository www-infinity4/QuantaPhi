import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshFeatures} from '../newsroom/fresh-reports.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('November 3 original NASA report replaces yesterday as featured news, without changing older dates',()=>{
 const reg=JSON.parse(read('newsroom/latest.json'));
 assert.equal(reg.updatedOn,'2026-11-03');
 const today=reg.articles.find(a=>a.url==='pacific-storms-2026.html');
 assert.ok(today);
 assert.equal(today.publishedAt,'2026-11-03');
 assert.equal(today.sourceUrl,'https://science.nasa.gov/earth/earth-observatory/the-pacifics-busy-storm-season/');
 const selected=freshFeatures(reg,Date.parse('2026-11-03T18:05:00Z'));
 assert.equal(selected[0].url,'pacific-storms-2026.html');
 assert.ok(selected.every(x=>x.publishedAt!=='2026-11-01'));
 const article=read('newsroom/pacific-storms-2026.html');
 assert.match(article,/<time datetime="2026-11-03"/);
 assert.match(article,/<article class="story"/);
 assert.ok((article.match(/<p[ >]/g)||[]).length>=9);
 assert.match(article,/source: NASA Earth Observatory/i);
 assert.ok(read('sitemap.xml').includes('<loc>https://quantaphi.org/newsroom/pacific-storms-2026.html</loc>'));
});
test('daily article candidate selection never invents dates or republishes known primary sources',async()=>{
 const {selectDraftCandidate}=await import('../scripts/newsroom-draft.mjs');
 const now=Date.parse('2026-11-03T18:05:00Z');
 const item=(url,publishedAt,extract='Detailed source evidence from a newly published NASA report.')=>({title:'Satellite observations of recent storm patterns',extract,url,publishedAt});
 const existing=[{sourceUrl:'https://science.nasa.gov/earth/earth-observatory/the-pacifics-busy-storm-season/'}];
 const rows=[
  item(existing[0].sourceUrl,'2026-11-03T15:00:00Z'),
  item('https://www.bbc.co.uk/news/other','2026-11-03T17:00:00Z'),
  item('https://science.nasa.gov/earth/stale-story','2026-10-21T17:00:00Z'),
  item('https://science.nasa.gov/earth/new-observations','2026-11-03T16:00:00Z')
 ];
 assert.equal(selectDraftCandidate(rows,existing,now)?.url,'https://science.nasa.gov/earth/new-observations');
 assert.equal(selectDraftCandidate([item('https://science.nasa.gov/earth/nodate','')],existing,now),null);
 assert.equal(selectDraftCandidate([item('http://science.nasa.gov/earth/insecure','2026-11-03T15:00:00Z')],existing,now),null);
});
test('automatic news writer is a review-gated draft workflow, never silent unverified publication',()=>{
 const workflow=read('.github/workflows/newsroom-drafts.yml');
 assert.match(workflow,/schedule:/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/scripts\/newsroom-draft\.mjs/);
 assert.match(workflow,/draft:\s*true/);
 assert.match(workflow,/pull-requests:\s*write/);
 assert.doesNotMatch(workflow,/auto-merge/);
});
test('reader falls back to a truly current first-party FULL report, never an expired fake article',()=>{
 const js=read('newsroom/fresh-reports.mjs');
 assert.match(js,/function showOriginalFull\(/);
 assert.match(js,/new DOMParser\(\)\.parseFromString/);
 assert.match(js,/querySelectorAll\('article\.story > p'\)/);
 assert.match(js,/freshFeatures\(\{articles:\[originalFallback\]\}\)/);
 assert.match(js,/if\(!showOriginalFull\(\)\)reportUnavailable/);
 assert.doesNotMatch(js,/innerHTML/);
});
