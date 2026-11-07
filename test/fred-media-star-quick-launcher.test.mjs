import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Fred first free episode is a prominent one-tap original X Space directly under search',()=>{
 const html=read('index.html'),css=read('quick-fred-spaces.css');
 const search=html.indexOf('id="go"'),fred=html.indexOf('<aside id="fredSpacesQuick"'),news=html.indexOf('aria-label="News Phi articles');
 assert.ok(search>=0&&fred>search&&news>fred,'Fred must be visible immediately after search and before the news panels');
 assert.match(html,/<a id="fredSpacesQuickPlay"[^>]*href="https:\/\/x\.com\/i\/spaces\/1OyKAjYPeXqGb"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
 assert.match(html,/Media Star · Fred(?:&#39;|’|')s Spaces/);
 assert.match(html,/First Space · FREE/);
 assert.match(css,/#fredSpacesQuickPlay/);
 assert.match(css,/min-height:\s*48px/);
 assert.match(css,/#fredSpacesQuickNext/);
 assert.match(css,/font-size:\s*(?:1[5-9]|2[0-9])px/);
});

test('the separate next-episode button opens the ORIGINAL player and invokes its real ledger-gated unlock',()=>{
 const html=read('index.html'),player=read('fred-spaces-radio.js'),deck=read('oracle-card-deck.js');
 const card=html.match(/<aside id="fredSpacesQuick"[\s\S]*?<\/aside>/)?.[0];
 assert.ok(card);
 assert.match(card,/<button id="fredSpacesQuickNext"[^>]*data-oracle-spotlight="fredSpacesRadio"/);
 assert.match(card,/Next Fred Space · 1 StarCoin/);
 assert.match(card,/<button id="fredSpacesQuickDetails"[^>]*data-oracle-spotlight="fredSpacesRadio"/);
 assert.match(card,/id="fredSpacesQuickStatus"/);
 assert.doesNotMatch(card,/on(?:click|touchstart)\s*=/i);
 assert.doesNotMatch(card,/\/v1\/spaces\/unlock|new Audio|<audio/i);
 assert.match(player,/quickNext\?\.addEventListener\('click',\(\)=>\{void more\(\);\}\)/);
 assert.match(player,/if\(!paymentsReady\)/);
 assert.match(player,/ledger\("\/v1\/spaces\/unlock","POST"/);
 assert.match(player,/window\.confirm\("Spend 1 full StarCoin/);
 assert.match(deck,/document\.querySelectorAll\('\[data-oracle-spotlight\]'\)/);
});

test('play shortcut updates only to a verified unlocked original X source; no false trending or new playback rights',()=>{
 const html=read('index.html'),player=read('fred-spaces-radio.js');
 assert.match(player,/const replay=allowed\?active:byId\.get\(FIRST\)/);
 assert.match(player,/quickPlay\.href=replay\.source/);
 assert.match(player,/const FIRST_REPLAY = "https:\/\/x\.com\/i\/spaces\/1OyKAjYPeXqGb"/);
 assert.match(player,/e\.id===FIRST\?\{\.\.\.e,source:FIRST_REPLAY\}:e/);
 assert.match(player,/quickPlay\.setAttribute\('aria-label'/);
 assert.match(player,/if\(saved&&\(saved\.id===FIRST\|\|unlocked\.has\(saved\.id\)\)\)active=saved/);
 assert.match(player,/play\.href=active\.source;play\.target="_blank"/);
 assert.doesNotMatch(html,/Fred[^\n]*#1 trending|Fred[^\n]*most clicked/i);
 assert.match(html,/data-oracle-spotlight="source-blue-star-ointment"/);
 assert.match(html,/data-oracle-spotlight="source-neosporin-original-1oz"/);
});

test('live payout server must prove receipt contract v2 before exposing any paid Fred Space unlock',()=>{
 const player=read('fred-spaces-radio.js');
 assert.match(player,/paymentsReady=Boolean\(response\.ok&&data\.ok&&data\.paymentsReady&&data\.receiptContractVersion===2\)/);
 assert.match(player,/until.*receipt|receipt.*ready/i);
 assert.match(player,/if\(!paymentsReady\)/);
});
