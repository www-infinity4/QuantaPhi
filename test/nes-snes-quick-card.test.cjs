'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=path=>fs.readFileSync(path,'utf8');

test('NES/SNES lives in the original Oracle Quick Card deck and has a direct spotlight route',()=>{
 const html=source('index.html'),deck=source('oracle-card-deck.js');
 assert.match(html,/<section id="nesSnesQuickCard"[^>]*>/);
 assert.match(html,/\/nes-snes-quick-card\.js\?v=/);
 assert.match(html,/\/nes-snes-quick-card\.css\?v=/);
 assert.match(deck,/\['nesSnesQuickCard','NES \/ SNES/);
 assert.match(deck,/nesSnesQuickCard:\['nes-snes-player','Games'/);
 assert.match(deck,/nes:'nesSnesQuickCard'/);
});

test('the original Quick Card starts only on an explicit click and stops on Oracle navigation',()=>{
 const js=source('nes-snes-quick-card.js');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/getElementById\('nesSnesQuickCard'\)/);
 assert.match(js,/addEventListener\('click'/);
 assert.match(js,/createElement\('iframe'\)/);
 assert.match(js,/nes-snes-player\.html/);
 assert.match(js,/oracle:card-deactivated/);
 assert.match(js,/frame\.remove\(\)/);
 assert.doesNotMatch(js,/archive\.org\/download|romsgames\.com|mint|STARCOIN|StarCoin/);
});

test('NES/SNES local file player accepts only owned .nes, .sfc or .smc files and never uploads ROMs',()=>{
 const html=source('nes-snes-player.html');
 assert.match(html,/type="file"[^>]*accept="\.nes,\.sfc,\.smc"/);
 assert.match(html,/new Set\(\['nes','snes'\]\)/);
 assert.match(html,/URL\.createObjectURL\(file\)/);
 assert.match(html,/EJS_gameUrl/);
 assert.match(html,/EJS_pathtodata/);
 assert.match(html,/cdn\.emulatorjs\.org\/stable\/data\//);
 assert.match(html,/EJS_onGameStart/);
 assert.match(html,/NES\\x1a|0x4e/);
 assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|checkout|StarCoin|Coin\b/);
});

test('mobile player and source art stay within the card with readable controls',()=>{
 const css=source('nes-snes-quick-card.css');
 const card=source('nes-snes-quick-card.js');
 const hero=source('assets/nes-snes-card.svg');
 assert.match(css,/min-height:48px/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(card,/assets\/nes-snes-card\.svg/);
 assert.match(hero,/<svg/);
 assert.match(card,/aria-label/);
});
