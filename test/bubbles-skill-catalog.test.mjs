import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterCatalog,describeConnectionRisk,approvedSourceLink} from '../bubbles-skill-catalog.mjs';
const catalog=JSON.parse(readFileSync(new URL('../bubbles-skill-catalog.json',import.meta.url),'utf8'));
test('metadata is complete and every borrowed ChatGPT skill is reference only',()=>{
 assert.equal(catalog.totalImportedSkillMetadata,catalog.referenceSkills.length);
 assert.ok(catalog.referenceSkills.length>=60);
 assert.equal(new Set(catalog.referenceSkills.map(x=>x.id)).size,catalog.referenceSkills.length);
 assert.ok(catalog.referenceSkills.every(x=>x.state==='reference_only'));
 assert.ok(catalog.localCapabilities.some(x=>x.id==='bubbles:context-recall'));
});
test('search discovers real memory and connection boundaries',()=>{
 assert.ok(filterCatalog(catalog.localCapabilities,'memory').some(x=>x.id==='bubbles:context-recall'));
 assert.ok(filterCatalog(catalog.localCapabilities,'video').some(x=>x.state==='not_connected'));
 assert.match(describeConnectionRisk('github'),/stop Bubbles/);
 assert.match(describeConnectionRisk('cloudflare'),/prevent Bubbles/);
});

test('Organic Computation is discoverable without pretending execution is connected',()=>{
 const match=filterCatalog(catalog.localCapabilities,'organic computation');
 assert.equal(match.length,1);
 assert.equal(match[0].state,'source_ready_not_deployed');
 assert.match(match[0].description,/no live Bubbles executor/i);
 assert.equal(approvedSourceLink(match[0].sourceUrl),'https://github.com/www-infinity4/Organic-Computation');
});
test('catalog cannot create an arbitrary external link',()=>{
 for(const url of ['https://example.com/no','javascript:alert(1)','https://github.com/other/Organic-Computation','https://github.com/www-infinity4/Organic-Computation?token=secret','https://github.com@evil.example/www-infinity4/Organic-Computation']){
  assert.equal(approvedSourceLink(url),'');
 }
});
