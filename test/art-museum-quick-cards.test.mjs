import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ART_CARD_TARGET,museumPageUrl,normalizeArtwork,loadMuseumPage} from '../art-museum-quick-cards.mjs';
const sample={id:27992,title:'A Sunday on La Grande Jatte',artist_title:'Georges Seurat',date_display:'1884',image_id:'2d484387-2509-5e8e-2c43-22f9981972eb',is_public_domain:true,medium_display:'Oil on canvas'};
test('large art catalog is incremental and only uses the official museum API',()=>{
 assert.equal(ART_CARD_TARGET,1000);
 const q=new URL(museumPageUrl(1));
 assert.equal(q.hostname,'api.artic.edu');
 assert.equal(q.searchParams.get('query[term][is_public_domain]'),'true');
 assert.equal(q.searchParams.get('limit'),'100');
 assert.equal(museumPageUrl(-1),null);
});
test('museum art requires a real public-domain source image and matching record',()=>{
 const art=normalizeArtwork(sample);
 assert.equal(art.id,'aic-27992');
 assert.ok(art.image.includes(sample.image_id));
 assert.equal(art.url,'https://www.artic.edu/artworks/27992');
 assert.equal(normalizeArtwork({...sample,image_id:null}),null);
 assert.equal(normalizeArtwork({...sample,is_public_domain:false}),null);
 assert.equal(normalizeArtwork({...sample,id:'hi'}),null);
 assert.equal(normalizeArtwork(sample,'https://evil.artic.edu/iiif/2'),null);
});
test('page fetch drops unverifiable artwork and keeps authentic metadata',async()=>{
 const mock=async()=>({ok:true,json:async()=>({config:{iiif_url:'https://www.artic.edu/iiif/2'},data:[sample,{...sample,id:27993,image_id:null}]})});
 const rows=await loadMuseumPage(1,mock);
 assert.equal(rows.length,1);
 assert.equal(rows[0].artist,'Georges Seurat');
});
test('art cards use three title-aware research actions and preserve original actions',()=>{
 const js=readFileSync(new URL('../art-museum-quick-cards.mjs',import.meta.url),'utf8');
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(js,/originalSearch\('Images'/);
 assert.match(js,/originalSearch\('History'/);
 assert.match(js,/originalSearch\('Market'/);
 assert.match(js,/mountCardActions\(actions/);
 assert.match(js,/showSearch:false/);
 assert.match(js,/data\.sourceReady='true'/);
 assert.match(home,/art-museum-quick-cards\.mjs/);
});
