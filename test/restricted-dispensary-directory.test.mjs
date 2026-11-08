import test from 'node:test';
import assert from 'node:assert/strict';
import {DISPENSARY_SOURCES,eligibleDispensary,approvedDirectoryMedia,DISPENSARY_CARD_IDS} from '../restricted-dispensary-directory.mjs';

test('thirteen distinct original-source store Quick Cards can appear in Oracle deck',()=>{
 assert.equal(DISPENSARY_SOURCES.length,13);
 assert.equal(new Set(DISPENSARY_SOURCES.map(x=>x.id)).size,13);
 assert.equal(new Set(DISPENSARY_CARD_IDS).size,13);
 for(const x of DISPENSARY_SOURCES){
  assert.ok(DISPENSARY_CARD_IDS.includes('dispensary-'+x.id));
  assert.match(x.address,/Denver, CO 802\d\d/);
  assert.ok(x.name&&x.store&&x.address&&x.source_url);
  assert.equal(x.category,'dispensary');
  assert.equal(x.paid_sponsor,false);
  assert.equal('price' in x,false);
  assert.equal('product_image' in x,false);
 }
});
test('each factual listing is denied before the visitor 21+ acknowledgment',()=>{
 for(const x of DISPENSARY_SOURCES){
  assert.equal(eligibleDispensary(x,false),null);
  assert.equal(eligibleDispensary(x,undefined),null);
  assert.equal(eligibleDispensary(x,'yes'),null);
  assert.ok(eligibleDispensary(x,true));
 }
});
test('refuse malformed, nonofficial, or disguised offsite store links',()=>{
 const valid=DISPENSARY_SOURCES[0];
 for(const bad of [
  {...valid,source_url:'http://'+valid.official_domain},
  {...valid,source_url:'https://fake.example.com/'},
  {...valid,source_url:'https://'+valid.official_domain+'.evil.com/offer'},
  {...valid,paid_sponsor:true},
  {...valid,category:'other'},
  {...valid,source_url:'javascript:alert(1)'}
 ])assert.equal(eligibleDispensary(bad,true),null);
});

test('every dispensary card is actually mounted and discoverable in Oracle',async()=>{
 const fs=await import('node:fs/promises');
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 const deck=await fs.readFile(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 const client=await fs.readFile(new URL('../restricted-dispensary-cards.mjs',import.meta.url),'utf8');
 for(const id of DISPENSARY_CARD_IDS){
  assert.ok(html.includes('id="'+id+'"'),'Missing homepage mount '+id);
  assert.ok(deck.includes("['"+id+"',"),'Missing Oracle deck option '+id);
 }
 assert.match(html,/restricted-dispensary-cards\.mjs/);
 assert.match(html,/restricted-dispensary-cards\.css/);
 assert.ok(client.includes('eligibleDispensary(row,acknowledged)'));
 assert.ok(client.includes('if(!allowed)'));
 assert.ok(client.includes('acknowledged=false'));
});

test('Denver listings stay in the Oracle carousel instead of stacking down the homepage',async()=>{
 const fs=await import('node:fs/promises');
 const css=await fs.readFile(new URL('../restricted-dispensary-cards.css',import.meta.url),'utf8');
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 for(const id of DISPENSARY_CARD_IDS){
  assert.ok(html.includes('<section id="'+id+'"'));
 }
 assert.match(css,/body\.oracle-card-deck-active:not\(\.oracle-shelf-open\) main\.app > section\[id\^="dispensary-"\]\{display:none!important\}/,
  'All original directory roots must be hidden outside the active carousel stage');
 assert.match(css,/\.oracle-card-deck-stage > section\[id\^="dispensary-"\]/,
  'The currently selected original card must remain visible inside the carousel');
});

test('The Dab Alameda exists as a sourced, non-sponsored Denver directory card',()=>{
 const row=DISPENSARY_SOURCES.find(x=>x.id==='the-dab-alameda');
 assert.ok(row,'expected existing carousel to include The Dab Alameda');
 assert.equal(row.name,'The Dab by Silverpeak');
 assert.equal(row.address,'2748 W Alameda Ave, Denver, CO 80219');
 assert.equal(row.source_url,'https://thedab303.com/locations/');
 assert.equal(row.official_domain,'thedab303.com');
 assert.equal(row.paid_sponsor,false);
 assert.equal('price' in row,false);
 assert.equal('inventory' in row,false);
});
test('six-source media galleries are strictly rights reviewed, non-product, age-acknowledged and deduplicated',()=>{
 const row=DISPENSARY_SOURCES[0];
 const good=n=>({url:'https://'+row.official_domain+'/media/store-'+n+'.jpg',
  source_url:row.source_url,publisher:'Store',rights_evidence_url:'https://'+row.official_domain+'/image-permission',
  rights_cleared:true,status:'approved',kind:'storefront',
  reviewed_at:'2026-11-07',expires_at:'2026-12-01',alt:'Store exterior '+n});
 const input={...row,media_gallery:[...Array.from({length:8},(_,i)=>good(i)),good(0),
  {...good(8),kind:'product'},
  {...good(9),rights_cleared:false},
  {...good(10),url:'https://example.invalid/a.jpg'},
  {...good(11),expires_at:'2026-10-01'}]};
 const now=Date.parse('2026-11-08T12:00:00Z');
 assert.deepEqual(approvedDirectoryMedia(input,false,now),[]);
 const gallery=approvedDirectoryMedia(input,true,now);
 assert.equal(gallery.length,6);
 assert.deepEqual(gallery.map(x=>x.alt),Array.from({length:6},(_,i)=>'Store exterior '+i));
 assert.equal(approvedDirectoryMedia({...row,media_gallery:[{...good(1),rights_evidence_url:''}]},true,now).length,0);
});

test('reviewed gallery is wired into the original Android card with accessible controls',async()=>{
 const fs=await import('node:fs/promises');
 const client=await fs.readFile(new URL('../restricted-dispensary-cards.mjs',import.meta.url),'utf8');
 const css=await fs.readFile(new URL('../restricted-dispensary-cards.css',import.meta.url),'utf8');
 assert.match(client,/approvedDirectoryMedia\(row,acknowledged\)/);
 assert.match(client,/Play gallery/);
 assert.match(client,/Pause gallery/);
 assert.match(client,/prefers-reduced-motion: reduce/);
 assert.match(client,/photo\.referrerPolicy='no-referrer'/);
 assert.match(css,/\.dc-gallery-image/);
 assert.match(css,/\.dc-gallery-controls/);
});
