import test from 'node:test';
import assert from 'node:assert/strict';
import {requestPath,readBrands,readCollections,chooseBrand,officialLink,departments} from '../product-directory-core.mjs';
const row={brand_id:'jarritos',name:'Jarritos',official_url:'https://jarritos.com/',source_url:'https://jarritos.com/',description:'Fruit soft drinks',primary_department:'Food',primary_shelf:'Drinks',source_checked_at:'2026-11-02',source_state:'official_site_verified'};
test('Mixed and departments use existing Cloudflare D1 feed',()=>{
 assert.equal(requestPath('Mixed'),'/v1/mixed?limit=24&offset=0');
 assert.equal(requestPath('Food'),'/v1/brands?department=Food&limit=24&offset=0');
 assert.equal(requestPath('Fashion',1),'/v1/brands?department=Fashion&limit=24&offset=24');
 assert.equal(requestPath('NotReal'),null);
 assert.deepEqual(departments,['Mixed','Food','Fashion','Home']);
});
test('only sourced, all-ages, deduplicated brands display',()=>{
 const rows=readBrands({data:[row,{...row},{...row,brand_id:'bad',official_url:'javascript:alert(1)'},{...row,brand_id:'age',adult_restricted:1},{...row,brand_id:'missing',source_state:'review'}]},'Mixed');
 assert.equal(rows.length,1);assert.equal(rows[0].name,'Jarritos');
});
test('department filtering rejects outside brands even on bad server data',()=>{
 const rows=readBrands({data:[row,{...row,brand_id:'eastland',primary_department:'Fashion'},{...row,brand_id:'restricted',adult_restricted:1}]},'Food');
 assert.deepEqual(rows.map(r=>r.brand_id),['jarritos']);
});
test('official links are HTTPS and brand dates are validated',()=>{
 assert.equal(officialLink('http://example.com/'),null);
 assert.equal(officialLink('https://user:pass@example.com/'),null);
 assert.equal(officialLink('https://jarritos.com/'),'https://jarritos.com/');
 assert.equal(readBrands({data:[{...row,source_checked_at:'unknown'}]},'Mixed').length,0);
});
test('collections retain only named brand and verified source',()=>{
 const a={brand_id:'jarritos',collection_id:'flavors',title:'Flavors',source_url:'https://jarritos.com/flavors/',source_checked_at:'2026-11-02'};
 assert.deepEqual(readCollections({data:[a,{...a,brand_id:'other'},{...a,source_url:'data:text/plain,bad'}]},'jarritos').map(x=>x.title),['Flavors']);
});
test('rotation wraps, empty is safe',()=>{
 const rows=readBrands({data:[row,{...row,brand_id:'sidral',name:'Sidral Mundet'}]},'Mixed');
 assert.equal(chooseBrand(rows,0,-1).brand_id,'sidral');
 assert.equal(chooseBrand(rows,1,1).brand_id,'jarritos');
 assert.equal(chooseBrand([],0,1),null);
});