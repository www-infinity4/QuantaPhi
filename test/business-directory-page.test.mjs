import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('new nationwide directory is linked from existing Infinity Oracle and public directory',()=>{
 const home=read('index.html'),dir=read('directory/index.html'),page=read('businesses/index.html'),sitemap=read('sitemap.xml');
 assert.match(home,/id="quantaDirectoryCards"/);
 assert.match(home,/href="\/businesses\/"/);
 assert.doesNotMatch(home,/data-site-url="\/businesses\/"/);
 assert.match(dir,/href="\/businesses\/"/);
 assert.match(page,/id="businessSearch"/);
 assert.match(page,/id="results"/);
 assert.match(sitemap,/https:\/\/quantaphi.org\/businesses\//);
});
test('browser UI uses live Cloudflare API instead of fabricated card inventory',()=>{
 const script=read('businesses/directory-app.mjs');
 assert.match(script,/\/api\/business-directory\/records/);
 assert.match(script,/\/api\/business-directory\/health/);
 assert.match(script,/data\.records/);
 assert.match(script,/results\.append\(makeCard/);
 assert.match(script,/data\.next_offset/);
 assert.match(script,/Source: /);
 assert.doesNotMatch(script,/innerHTML\s*=/);
 assert.doesNotMatch(script,/localStorage|document\.cookie|checkout|chargeCustomer/i);
});
test('business Worker binding and isolated database never touch any payment ledgers',()=>{
 const wrangler=read('workers/business-directory/wrangler.toml');
 assert.match(wrangler,/name = "quantaphi-national-directory-api"/);
 assert.match(wrangler,/binding = "BUSINESS_DB"/);
 assert.match(wrangler,/database_id = "51bfedfd-15e0-4695-ab80-0416ff2ea133"/);
 assert.match(wrangler,/quantaphi.org\/api\/business-directory\*/);
 assert.doesNotMatch(wrangler,/QUANTA_DB|IDENTITY_DB|WALLET|LEDGER|starquest/i);
});

test('source attribution, license, and stable pagination are preserved on cards',()=>{
 const script=read('businesses/directory-app.mjs');
 assert.match(script,/business\.attribution/);
 assert.match(script,/business\.source_license/);
 assert.match(script,/submittedFilters/);
 assert.match(script,/Object\.entries\(\{\.\.\.submittedFilters/);
});

test('legacy and national directory use different Worker names and D1 binding names',()=>{
 const api=read('workers/business-directory/wrangler.toml');
 const page=read('workers/business-directory/wrangler-page.toml');
 const legacy=read('workers/business-directory.js');
 assert.match(legacy,/env\.BUSINESSES/);
 assert.match(api,/name = "quantaphi-national-directory-api"/);
 assert.match(api,/binding = "BUSINESS_DB"/);
 assert.doesNotMatch(api,/binding = "BUSINESSES"/);
 assert.match(page,/name = "quantaphi-national-directory-page"/);
 assert.match(page,/quantaphi.org\/businesses\*/);
 assert.doesNotMatch(page,/BUSINESSES|BUSINESS_DB|QUANTA_DB|WALLET/);
});
