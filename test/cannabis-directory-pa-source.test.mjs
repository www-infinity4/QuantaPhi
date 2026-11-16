import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {policy,eligibleStore} from '../cannabis-directory-policy.mjs';

const manifest=JSON.parse(readFileSync(new URL('../data/cannabis/pa-doh-medical-2026-11-01.json',import.meta.url),'utf8'));
test('PA DOH medical source manifest is a 15-row distinct provenance snapshot, not licensed ads',()=>{
 assert.equal(manifest.receipt_id,'2026-11-02-pa-doh-fifteen-medical-dispensaries-v1');
 assert.equal(manifest.state,'PA');
 assert.equal(manifest.program,'medical_only');
 assert.equal(manifest.dataset_updated_at,'2026-11-01');
 assert.equal(manifest.source_url,'https://data.pa.gov/Services-Near-You/Medical-Marijuana-Dispensaries-Current-State-Healt/4uxb-pw5i');
 assert.equal(manifest.review_state,'individual_license_and_operating_status_unverified');
 assert.equal(manifest.rights_cleared,false);
 assert.equal(manifest.authorized_inventory_feeds,0);
 assert.equal(manifest.records.length,15);
 assert.equal(new Set(manifest.records.map(r=>r.id)).size,15);
 assert.equal(new Set(manifest.records.map(r=>r.address)).size,15);
 for(const row of manifest.records){
  assert.match(row.id,/^pa-doh-4uxb-pw5i-[0-9]+$/);
  assert.ok(row.name&&row.city&&row.street&&/^\d{5}$/.test(row.zip));
  assert.ok(row.address.endsWith('PA '+row.zip));
 }
});
test('PA directory policy is medical-only and public card remains informational after acknowledgment',()=>{
 assert.equal(policy('PA').adult_use,'not_authorized');
 assert.equal(policy('PA').medical_program,true);
 assert.equal(policy('PA').source_url,manifest.source_url);
 const row={id:manifest.records[0].id,name:manifest.records[0].name,city:manifest.records[0].city,
  state:'PA',record_status:'listed',paid_sponsor:0,source_url:manifest.source_url,
  source_domain:'data.pa.gov',source_name:'Pennsylvania Department of Health',
  license_verified:0,rights_cleared:0};
 assert.equal(eligibleStore(row,false),null);
 const card=eligibleStore(row,true);
 assert.equal(card.sponsored,false);
 assert.equal(card.license_verified,0);
 assert.equal(card.product_image,'');
 assert.equal(card.price,null);
 assert.equal(eligibleStore({...row,paid_sponsor:1},true),null);
});
