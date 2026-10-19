'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const site=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('bubbles-product.css','utf8');
const gateway=fs.readFileSync('workers/quantaphi-site/worker.js','utf8');

test('QuantaPhi opens the assistant directly before the search row',()=>{
 const entry=site.indexOf('class="q-bubbles-entry"');
 const search=site.indexOf('class="search" role="search"');
 assert.ok(entry>0&&search>entry,'assistant CTA should appear before search');
 assert.match(site,/class="q-bubbles-entry-primary" href="\/bubbles\.html">Open Bubbles/);
 assert.match(site,/href="\/bubbles-chrome\.html">Install in Chrome<\/a>/);
});

for(const path of ['bubbles.html','bubbles-chrome.html','bubbles/index.html']){
 test(path+' prioritizes the working assistant and labels film work unreleased',()=>{
  const html=fs.readFileSync(path,'utf8');
  const chat=html.indexOf('<div id="bubblesAICard">');
  const intro=html.indexOf('class="bubbles-intro"');
  const film=html.indexOf('class="bubbles-development"');
  assert.ok(intro>0&&chat>intro&&film>chat,'assistant follows compact intro, film after assistant');
  assert.match(html,/<details class="bubbles-development">/);
  assert.match(html,/Film and commercial development · not released/);
  assert.doesNotMatch(html,/aria-label="Finished Bubbles commercial"/);
  assert.doesNotMatch(html,/<section class="bubbles-production"/);
  assert.match(html,/class="bubbles-primary-action" href="#bubblesAICard">Open Bubbles chat/);
  assert.match(html,/href="\/bubbles-product\.css\?v=/);
 });
}

test('Chrome installer retains real button and signed-in site identity',()=>{
 for(const path of ['bubbles.html','bubbles-chrome.html']){
   const html=fs.readFileSync(path,'utf8');
   assert.match(html,/<button id="bubblesInstallChrome" type="button">/);
   assert.match(html,/id="bubblesInstallStatus"/);
 }
 assert.match(site,/href="\/bubbles-chrome\.html"/);
});

test('buttons receive explicit readable color even after site-specific Oracle styles',()=>{
 assert.match(css,/a\.bubbles-primary-action:visited/);
 assert.match(css,/color:#fff!important/);
 assert.match(css,/\.bubbles-actions a:visited/);
 assert.match(css,/color:#392157!important/);
 assert.match(css,/min-height:46px/);
 assert.match(css,/:focus-visible/);
});

test('gateway no longer fixes Bubbles or homepage to stale source commit',()=>{
 assert.doesNotMatch(gateway,/\['\/bubbles\.html','\/bubbles\/index\.html','\/index\.html'\]\.includes\(route\.sourcePath\)/);
 assert.match(gateway,/newQuantaRelease \? 'main'/);
 assert.match(gateway,/route\.repo === 'QuantaPhi'/);
});
