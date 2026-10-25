import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {socialShareUrl,shareImage,cardAction} from '../card-social-share.mjs';
import {BRAND_PRODUCT_CARDS} from '../brand-product-cards.mjs';
import {QUICK_CARD_SOURCES,findSourceCard} from '../source-quick-cards.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('every brand item keeps its curated, unforgeable product share URL',()=>{
 for(const p of BRAND_PRODUCT_CARDS){
  const u=new URL(socialShareUrl({...p,name:p.brand+' '+p.title,route:'/q-share?card='+p.id}));
  assert.equal(u.origin,'https://quantaphi.org');
  assert.equal(u.pathname,'/q-share');
  assert.equal(u.searchParams.get('card'),p.id);
  assert.equal(u.searchParams.get('image'),null);
 }
});
test('search, research, banking and media cards get individualized metadata and clickable destinations',()=>{
 for(const id of ['google','google-ai-studio','google-maps','google-finance','capital-one','fox-one','youtube']){
  const card=findSourceCard(id);
  assert.ok(card,'source card exists: '+id);
  const u=new URL(socialShareUrl(card));
  assert.equal(u.pathname,'/q-share');
  assert.equal(u.searchParams.get('id'),id);
  assert.equal(u.searchParams.get('title'),card.name);
  assert.ok(u.searchParams.get('text').length>5);
  assert.equal(u.searchParams.get('dest'),'/source-quick-card.html?card='+id);
  assert.ok(u.searchParams.get('action').includes('Infinity'));
 }
 assert.ok(QUICK_CARD_SOURCES.length>=20);
});
test('independent article and premium source images survive social links',()=>{
 const card={id:'premium-topps-item',name:'Original baseball card',category:'Trading cards',
  image:'https://images.example.net/cards/rookie.png?source=publisher',
  route:'/?card=topps&item=abc123'};
 const u=new URL(socialShareUrl(card));
 assert.equal(u.searchParams.get('image'),card.image);
 assert.equal(u.searchParams.get('dest'),card.route);
 assert.equal(u.searchParams.get('id'),card.id);
 assert.equal(u.searchParams.get('action'),'Explore in Infinity');
});
test('do not allow social-share open redirects, SVGs or data URIs',()=>{
 assert.throws(()=>socialShareUrl({name:'External',route:'https://evil.example/pay'}),/first_party/);
 for(const img of ['data:image/svg+xml,x','https://site.example/payload.svg',
  'http://site.example/picture.png','https://127.0.0.1/private.png']){
  assert.equal(shareImage(img),'');
 }
});
test('unlisted creator cards retain their existing server-rendered images and URLs',()=>{
 const u=new URL(socialShareUrl({name:'Creator Card',route:'/cards/original-12345'}));
 assert.equal(u.pathname,'/cards/original-12345');
});
test('every shared QuantaPhi toolbar uses the universal social builder with the clicked article image',()=>{
 const js=read('quanta-card-actions.mjs');
 assert.match(js,/socialShareUrl\(/);
 assert.match(js,/contextualImage\(host,card\)/);
 assert.match(js,/navigator\.share/);
 assert.match(read('premium-source-cards.mjs'),/image:row\.image/);
 assert.match(read('oracle-card-deck.js'),/qbp-product-card/);
});
test('real Google Maps URLs and safe AI Studio prompt drafts are wired, not mock searches',()=>{
 const tools=read('quanta-card-experience.mjs');
 assert.match(tools,/maps\/search\/\?api=1&query=/);
 assert.match(tools,/googleStudioPromptTool\(root\)/);
 assert.match(tools,/Copy prompt for Google AI Studio/);
 assert.match(tools,/site%3Acapitalone\.com/);
 const edge=read('workers/quantaphi-site/worker.js');
 assert.match(edge,/previewTitle/);
 assert.match(edge,/twitter:label1/);
 assert.match(edge,/qpShareResponse/);
});

test('independent physics, audio, reader and stock Share buttons join the common preview router',()=>{
 for(const path of ['radio-clubhouse.js','fred-spaces-radio.js','infinity-concepts.js','widgetphi-stock.js']){
  assert.match(read(path),/card-social-share\.mjs/,path);
  assert.match(read(path),/socialShareUrl\(/,path);
 }
 const stock=read('stock-quick-card.html');
 assert.match(stock,/WidgetPhiStock\.renderCard/);
 assert.match(stock,/data|symbol/);
 assert.match(stock,/www|TradingView|market/);
});

test('story writer, Infinite Book and story reader links share exact stories rather than generic banners',()=>{
 for(const path of ['phi-story-writer.js','infinite-book.js','story.html','story/index.html']){
  assert.match(read(path),/card-social-share\\.mjs/,path);
  assert.match(read(path),/socialShareUrl\\(/,path);
 }
});
