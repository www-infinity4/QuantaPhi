import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePreviewMode,safeLocalCardUrl,safePreviewImage,DEFAULT_PREVIEW_MODE} from '../quick-card-preview.mjs';
import {normalizeCard,cardHtml,publicCard} from '../workers/quick-card-publisher/worker.mjs';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base={title:'Radio Quick Card',website:'https://www.example.com/shop',description:'Find radios and supplies with the original seller.',interactionRequest:'Open the original verified item at the merchant.',kind:'visit'};

test('default interactive setting and saved image-first mode',()=>{
 assert.equal(DEFAULT_PREVIEW_MODE,'interactive');
 assert.equal(normalizePreviewMode('interactive'),'interactive');
 assert.equal(normalizePreviewMode('visual'),'visual');
 assert.equal(normalizePreviewMode('off'),'interactive');
 assert.equal(normalizeCard(base).card.previewMode,'interactive');
 assert.equal(normalizeCard({...base,previewMode:'visual'}).card.previewMode,'visual');
});
test('strict public local preview allowlist stops remote logins, owner and wallet pages',()=>{
 assert.equal(safeLocalCardUrl('https://evil.example/cards/good-example'),'');
 assert.equal(safeLocalCardUrl('/wallet-link.html'),'');
 assert.equal(safeLocalCardUrl('/bubbles-accounts.html'),'');
 assert.equal(safeLocalCardUrl('/source-quick-card.html?card=fox-one'),'https://quantaphi.org/source-quick-card.html?card=fox-one');
 assert.equal(safeLocalCardUrl('/cards/radio-example-12345'),'https://quantaphi.org/cards/radio-example-12345');
 assert.equal(safeLocalCardUrl('/quanta-feed-card.html?card=silver'),'https://quantaphi.org/quanta-feed-card.html?card=silver');
});
test('real raster is accepted but generic brand, SVG, executable and private URLs are not',()=>{
 assert.equal(safePreviewImage('/preview.png'),'');
 assert.equal(safePreviewImage('https://example.org/image.svg'),'');
 assert.equal(safePreviewImage('http://example.org/jeans.jpg'),'');
 assert.equal(safePreviewImage('https://example.org/photo.png'),'https://example.org/photo.png');
 assert.equal(safePreviewImage('https://lsco.scene7.com/is/image/lsco/item?fmt=jpeg'),'https://lsco.scene7.com/is/image/lsco/item?fmt=jpeg');
 assert.match(normalizeCard({...base,image:'https://example.com/page.html'}).error,/PNG/);
});
test('published social metadata only uses that card artwork, never generic banner',()=>{
 const raw={slug:'radio-test-12345',title:'Antique Radio',description:'Real radio supplier and related vintage parts',image:'',website:'https://www.example.com',interaction_request:'Search the original provider',kind:'visit',video_id:'',search_template:'',preview_mode:'interactive',status:'approved'};
 const without=cardHtml(raw);
 assert.match(without,/<meta name="twitter:card" content="summary">/);
 assert.doesNotMatch(without,/property="og:image"/);
 assert.doesNotMatch(without,/quantaphi\.org\/preview\.png/);
 const withArt=cardHtml({...raw,image:'https://example.org/photo.jpg',preview_mode:'visual'});
 assert.match(withArt,/property="og:image" content="https:\/\/example\.org\/photo\.jpg"/);
 assert.match(withArt,/<meta name="twitter:card" content="summary_large_image">/);
 assert.equal(publicCard({...raw,preview_mode:'visual'}).previewMode,'visual');
});
test('builder and card surfaces use stored preview setting without opening third-party websites inside iframe',()=>{
 const builder=read('quick-card-builder.html'),module=read('quick-card-builder.js');
 const actions=read('quanta-card-actions.mjs'),published=read('published-quick-card.js'),feed=read('quanta-feed.mjs');
 assert.match(builder,/name="previewMode"/);
 assert.match(module,/openQuickCardPreview/);
 assert.match(published,/previewMode:c\.previewMode/);
 assert.match(actions,/openQuickCardPreview/);
 assert.match(feed,/openQuickCardPreview/);
 assert.match(read('workers/quick-card-publisher/schema.sql'),/preview_mode/);
 assert.match(read('workers/quick-card-publisher/migrations\/002-card-preview-mode.sql'),/ALTER TABLE/);
});
