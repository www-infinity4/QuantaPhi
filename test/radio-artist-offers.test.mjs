import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 ARTIST_OFFERS,officialUrlAllowed,appleAlbumForArtist
} from '../radio-artist-offers-data.mjs';

const home=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ui=()=>readFileSync(new URL('../radio-artist-offers.mjs',import.meta.url),'utf8');

test('six real artist release sources include full albums and optional official merchandise',()=>{
 assert.deepEqual(ARTIST_OFFERS.map(x=>x.id),[
  'steve-miller','pink-floyd','reo-speedwagon','cheap-trick','journey','styx'
 ]);
 for(const x of ARTIST_OFFERS){
  assert.ok(x.album&&x.artist&&x.albumUrl&&x.merchUrl);
  assert.equal(officialUrlAllowed(x.albumUrl),true);
  assert.equal(officialUrlAllowed(x.merchUrl),true);
 }
 assert.equal(officialUrlAllowed('https://lookalike.pinkfloyd.com.evil.example/store'),false);
 assert.equal(officialUrlAllowed('javascript:alert(1)'),false);
});

test('digital album ads use only source-matched Apple album artwork and provider pages',()=>{
 const offer=ARTIST_OFFERS.find(x=>x.id==='pink-floyd');
 const good={wrapperType:'collection',collectionType:'Album',artistName:'Pink Floyd',
  collectionName:'Wish You Were Here (50th Anniversary)',
  artworkUrl100:'https://is1-ssl.mzstatic.com/image/thumb/Music/a/100x100bb.jpg',
  collectionViewUrl:'https://music.apple.com/us/album/wish-you-were-here/1234'};
 assert.equal(appleAlbumForArtist(offer,[good])?.collectionViewUrl,good.collectionViewUrl);
 assert.equal(appleAlbumForArtist(offer,[{...good,artistName:'Cover Band'}]),null);
 assert.equal(appleAlbumForArtist(offer,[{...good,artworkUrl100:'https://evil.example/fake.jpg'}]),null);
 assert.equal(appleAlbumForArtist(offer,[{...good,collectionViewUrl:'https://fake-apple.example/buy'}]),null);
 assert.equal(appleAlbumForArtist(offer,[{...good,collectionType:'Song'}]),null);
});

test('homepage mounts one compact artist-product rail alongside radio, never a second audio player',()=>{
 const h=home(),js=ui();
 assert.equal((h.match(/src="\/radio-artist-offers\.mjs/g)||[]).length,1);
 assert.ok(h.indexOf('/quick-infinity-radio.js') < h.indexOf('/radio-artist-offers.mjs'));
 assert.match(js,/infinityRadioQuick/);
 assert.match(js,/radioArtistOfferRail/);
 assert.doesNotMatch(js,/new Audio|createElement\(['"]audio['"]\)|autoplay|window\.location\.assign/);
 assert.match(js,/Digital album/);
 assert.match(js,/Official artist shop/);
});

test('artist promo cards use actual Apple artwork, a dedicated small strip and no made-up price or inventory',()=>{
 const js=ui();
 assert.match(js,/appleAlbumForArtist/);
 assert.match(js,/artworkUrl100/);
 assert.match(js,/price not shown/i);
 assert.doesNotMatch(js,/Math\.random\(\)|fakeProduct|checkout|StarCoin|wallet\.(?:debit|credit|mint|write)/);
 assert.match(js,/setInterval/);
});
