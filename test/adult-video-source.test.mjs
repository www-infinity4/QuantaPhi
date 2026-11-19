import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ADULT_LIFESTYLE_KITS,sourcesForKit} from '../adult-lifestyle-catalog.mjs';
import {eligiblePublisher} from '../restricted-source-directory.mjs';
import {prepareAdultKitResearch} from '../adult-kit-research.mjs';

test('owner-supplied adult video URL is offered only as a source-only 21+ link',()=>{
 const kit=ADULT_LIFESTYLE_KITS.find(item=>item.id==='adult-video-links');
 assert.ok(kit,'video links need a distinct 21+ chooser entry');
 assert.equal(kit.sourceOnly,true);
 const rows=sourcesForKit(kit.id);
 assert.equal(rows.length,1,'never fabricate additional videos');
 const [row]=rows;
 assert.equal(row.kind,'independent-source');
 assert.equal(row.category,'Adult video');
 assert.equal(row.url,'https://xgroovy.com/gifs/205466/filled-my-mouth-with-cum/');
 assert.equal(row.official_domain,'xgroovy.com');
 assert.equal(eligiblePublisher(row,false),null,'links are gated until explicit adult browsing');
 assert.equal(eligiblePublisher(row,true),row);
 for(const field of ['image','images','poster','embed','iframe','video','media','price','paid','sponsored','approvedRights']){
  assert.equal(field in row,false,field+' must never be invented or imported');
 }
});

test('adult video reference cannot become a shopping kit, automatic media load or sponsored placement',()=>{
 assert.throws(()=>prepareAdultKitResearch({kitId:'adult-video-links'}),RangeError);
 const card=readFileSync(new URL('../restricted-ad-card.mjs',import.meta.url),'utf8');
 assert.match(card,/kit\?\.sourceOnly===true/);
 assert.match(card,/if\(!acknowledged\)return/);
 assert.match(card,/publisher\.hidden=true/);
 assert.doesNotMatch(card,/createElement\(['"]iframe['"]\).*xgroovy|createElement\(['"]video['"]\).*xgroovy/i);
});
