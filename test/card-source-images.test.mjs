import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cardImageCandidates,websiteFaviconUrl,shouldDiscoverSourcePhoto} from '../card-source-images.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('product photographs are ordered before OG brand logos, URLs are sanitized and unique',()=>{
 const c={official:'https://www.mieleusa.com/',images:[
   'https://media.miele.com/shop/assets/media/miele-og-image01.png',
   'https://media.miele.com/dam/washer.jpg',
   'https://media.miele.com/dam/washer.jpg',
   'http://insecure.test/product.jpg',
   'javascript:alert(1)',
   'https://media.miele.com/pixel.gif'
 ],logo:'https://media.miele.com/brand/logo.png'};
 assert.deepEqual(cardImageCandidates(c),[
   'https://media.miele.com/dam/washer.jpg',
   'https://media.miele.com/shop/assets/media/miele-og-image01.png',
   'https://media.miele.com/brand/logo.png'
 ]);
});

test('source icons use only a validated official public host',()=>{
 assert.equal(websiteFaviconUrl({official:'https://www.cnn.com/world?x=1'}),
 'https://www.google.com/s2/favicons?domain=www.cnn.com&sz=128');
 assert.equal(websiteFaviconUrl({official:'https://127.0.0.1/admin'}),'');
 assert.equal(websiteFaviconUrl({official:'http://example.com'}),'');
 assert.equal(websiteFaviconUrl({official:'https://admin:secret@example.com'}),'');
});

test('image discovery is on-demand for public content, not private services or general web search',()=>{
 assert.equal(shouldDiscoverSourcePhoto({id:'cnn',kind:'News',official:'https://www.cnn.com/'}),true);
 assert.equal(shouldDiscoverSourcePhoto({id:'durable-miele',category:'Hardware',official:'https://mieleusa.com/'}),true);
 assert.equal(shouldDiscoverSourcePhoto({id:'google',kind:'Search',official:'https://google.com/'}),false);
 assert.equal(shouldDiscoverSourcePhoto({id:'chatgpt',kind:'AI',official:'https://chatgpt.com/'}),false);
 assert.equal(shouldDiscoverSourcePhoto({id:'facebook',kind:'Social',official:'https://facebook.com/'}),false);
 assert.equal(shouldDiscoverSourcePhoto({id:'fake',kind:'News',official:'http://insecure.test/'}),false);
});

test('existing card renderers use shared photo pipeline and preserve the source on error',()=>{
 const artwork=read('quanta-card-experience.mjs');
 const brand=read('infinity-accepted-cards.mjs');
 assert.match(artwork,/mountCardSourceImage\(art,card/);
 assert.match(brand,/websiteFaviconUrl\(card\)/);
 assert.doesNotMatch(brand,/img\.remove\(\);media\.hidden=true/);
 const css=read('card-source-images.css');
 assert.match(css,/\.qcx-source-photo/);
 assert.match(css,/object-fit:cover/);
});
