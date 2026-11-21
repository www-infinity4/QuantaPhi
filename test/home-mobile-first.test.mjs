import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=load('index.html'),styles=load('home-mobile-cards-first.css'),wallet=load('cloud-wallet-client.js'),oracle=load('oracle-card-deck.js');
test('traffic preserves live Cloudflare readback but keeps verbose details collapsed',()=>{
 assert.match(html,/<details id="qtraffic" class="qtraffic-compact"/);
 assert.match(html,/<summary>[^]*id="qtrafficRequests"[^]*id="qtrafficViews"[^]*<\/summary>/);
 assert.match(html,/id="qtrafficNote"/);
 assert.doesNotMatch(html,/<details id="qtraffic"[^>]*\bopen\b/);
 assert.match(html,/site-traffic\.js\?v=/);
 assert.match(styles,/#qtrafficNote/);
 assert.match(styles,/qtraffic-expanded/);
});
test('recovery remains present in the hamburger wallet menu, never removed',()=>{
 assert.match(wallet,/link\.href='\/wallet-recovery\.html'/);
 assert.match(wallet,/link\.textContent='Find Cloud Tokens'/);
 assert.match(wallet,/document\.getElementById\('qmenu'\)/);
 assert.match(wallet,/walletMenu\.insertAdjacentElement\('afterend',link\)/);
 assert.match(html,/id="qmenuWallet"/);
 assert.match(styles,/#qmenu #qpCloudRecoveryLink/);
});
test('mobile carousel puts visible card first and confines Follow beside arrows',()=>{
 const nav=html.indexOf('<div class="oracle-card-deck-nav"');
 const follow=html.indexOf('id="oracleCardFollow"',nav);
 const next=html.indexOf('id="oracleCardNext"',nav);
 const navClose=html.indexOf('</div>',nav);
 assert.ok(nav>=0&&follow>nav&&follow<navClose&&next>follow&&next<navClose);
 const stage=html.indexOf('id="oracleCardStage"');
 const library=html.indexOf('class="oracle-card-library"');
 assert.ok(stage>0&&stage<library,'selector must not delay the actual interactive card');
 assert.match(styles,/#oracleCardDeck \.oracle-card-deck-nav #oracleCardFollow/);
 assert.match(styles,/position:static!important/);
 assert.match(oracle,/function returnActive\(/);
 assert.match(oracle,/stage\.append\(entry\.node\)/);
});
test('menus, search, wallet balances, real cards and Bubbles remain intact',()=>{
 for(const id of ['qmenuBtn','qNewSearch','qinfinity','qtoken','controlPhiWalletButton','q','go','oracleCardStage','shopAdPhi','quantaDiscoveryFeed']){
  assert.ok(html.includes('id="'+id+'"'),'required original control: '+id);
 }
 assert.match(html,/href="\/bubbles\.html"/);
 assert.match(html,/href="\/bubbles-accounts\.html"/);
 assert.match(styles,/\.q-install-details/);
 assert.match(styles,/grid-template-columns:1fr 1fr 1\.38fr/);
 assert.match(styles,/@media\(max-width:350px\)/);
 assert.match(html,/home-mobile-cards-first\.css/);
});
