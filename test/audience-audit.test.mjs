import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectPage,checkSitemap,runAudit,TARGETS} from '../scripts/audience-audit.mjs';
const title='<title>QuantaPhi research and image tools</title>';
const desc='<meta name="description" content="Explore source-backed research, image tools and Bubbles voice AI at QuantaPhi with direct links to each tool.">';
const html=(url,extra='')=>'<html><head>'+title+desc+'<link rel="canonical" href="'+url+'"><meta property="og:title" content="QuantaPhi"><meta property="og:description" content="QuantaPhi research"><meta property="og:image" content="https://quantaphi.org/preview.png">'+extra+'</head><body><h1>QuantaPhi tools</h1></body></html>';
test('good public landing page includes title, canonical and social metadata',()=>{const x=inspectPage({url:'https://quantaphi.org/',status:200,html:html('https://quantaphi.org/')});assert.equal(x.healthy,true);});
test('description values preserve apostrophes inside double quotes',()=>{
 const url='https://quantaphi.org/explore/';
 const sample=html(url).replace('Explore source-backed research, image tools and Bubbles voice AI at QuantaPhi with direct links to each tool.',"Explore QuantaPhi's source-backed research, image tools, voice AI, media stories and learning trails with direct links to each tool.");
 const result=inspectPage({url,status:200,html:sample});
 assert.equal(result.healthy,true);
 assert.ok(result.descriptionLength>80);
});
test('reports noindex, missing OG, invalid canonical and HTTP failures',()=>{const x=inspectPage({url:'https://quantaphi.org/explore/',status:404,html:'<html><title>X</title><meta name="robots" content="noindex"></html>'});assert.equal(x.healthy,false);assert.ok(x.findings.some(e=>e.code==='noindex'));assert.ok(x.findings.some(e=>e.code==='canonical'));assert.ok(x.findings.some(e=>e.code==='http_status'));});
test('sitemap demands all expected canonical URLs, no duplicate URLs',()=>{const expected=['https://quantaphi.org/','https://quantaphi.org/explore/'];assert.equal(checkSitemap('<loc>https://quantaphi.org/</loc>',expected).healthy,false);assert.equal(checkSitemap(expected.map(x=>'<loc>'+x+'</loc>').join(''),expected).healthy,true);assert.equal(checkSitemap(expected.map(x=>'<loc>'+x+'</loc>').join('')+'<loc>'+expected[0]+'</loc>',expected).healthy,false);});
test('auditor never fabricates human visitors or search rankings',async()=>{const expected=TARGETS.map(x=>'https://quantaphi.org'+x);const fetcher=async url=>({status:200,url,text:async()=>url.endsWith('/sitemap.xml')?expected.map(x=>'<loc>'+x+'</loc>').join(''):html(url)});const r=await runAudit({fetcher,now:'2026-10-13T20:00:00Z'});assert.equal(r.status,'healthy');assert.equal(r.summary.healthyPages,TARGETS.length);assert.ok(!('visitors' in r));assert.match(r.scope,/not a statement of search rank/);});
