import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('existing Infinity Radio owns one shared transport for the music cards',()=>{
 const radio=source('quick-infinity-radio.js');
 assert.match(radio,/window\.InfinityRadioQuick\s*=\s*Object\.freeze/);
 assert.match(radio,/quantaphi:infinity-radio-state/);
 assert.match(radio,/toggle:\s*toggleRadio/);
 assert.match(radio,/getState:\s*getRadioState/);
});

test('Steve Miller displays compact Infinity Radio play/pause control without a mock album player',()=>{
 const card=source('steve-miller-book-of-dreams.js');
 assert.match(card,/InfinityRadioQuick/);
 assert.match(card,/Infinity Radio/);
 assert.match(card,/48px/);
 assert.doesNotMatch(card,/new yt\.Player|iframe_api|smb-player-frame|smbAlbumYoutubeMount|YouTube album player/);
 assert.doesNotMatch(card,/oracle:card-deactivated/);
});

test('Classic Rock uses Infinity Radio and selects artist information, not fake artist audio',()=>{
 const card=source('classic-rock-official-card.mjs');
 assert.match(card,/InfinityRadioQuick/);
 assert.match(card,/Infinity Radio/);
 assert.match(card,/48px/);
 assert.match(card,/renderOffers\(band\)/);
 assert.doesNotMatch(card,/new yt\.Player|iframe_api|cr-video-poster|crOfficialYouTubeMount|player\.pauseVideo/);
 assert.doesNotMatch(card,/oracle:card-deactivated/);
});

test('home updates only the three music assets, without redirecting the reader to a media viewer',()=>{
 const home=source('index.html');
 assert.match(home,/quick-infinity-radio\.js\?v=20261106-shared-control/);
 assert.match(home,/steve-miller-book-of-dreams\.js\?v=20261106-radio-control/);
 assert.match(home,/classic-rock-official-card\.mjs\?v=20261106-radio-control/);
});
