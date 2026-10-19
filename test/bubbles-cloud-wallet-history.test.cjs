const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const page=fs.readFileSync('bubbles.html','utf8');
const ui=fs.readFileSync('bubbles-cloud-wallet.js','utf8');
const worker=fs.readFileSync('workers/unified-wallet/worker.js','utf8');
const chat=fs.readFileSync('bubbles-ai.js','utf8');

test('website and Android Bubbles use exactly one authenticated wallet panel',()=>{
 assert.match(page,/id="bubblesWalletBalances"/);
 assert.match(page,/id="bubblesWalletHistory"/);
 assert.match(page,/bubbles-cloud-wallet\.js/);
 assert.match(chat,/if\(verifiedWallet\)tools\.append\(verifiedWallet\)/);
 assert.match(page,/href="\/wallet-recovery\.html"/);
});
test('wallet display uses server verified identity, never hard-coded user account or balance',()=>{
 assert.match(ui,/resolveDeviceToken/);
 assert.match(ui,/Authorization:'Bearer '\+token/);
 assert.match(ui,/name!==account/);
 assert.match(ui,/unified\.balances/);
 assert.match(ui,/star\.state\.starCoins/);
 assert.doesNotMatch(ui,/acct_bf964|device_6ae995|56\.6|2550|489|126/);
 assert.doesNotMatch(ui,/localStorage\.setItem/);
});
test('paged Infinity history is read-only and strictly scoped to current verified account',()=>{
 assert.match(worker,/async function infinityHistory\(env,account,url\)/);
 assert.match(worker,/const kind=url\.searchParams\.get\('kind'\)/);
 assert.match(worker,/WHERE user_id=\?1 AND asset_code='INFINITY'/);
 assert.match(worker,/WHERE user_id=\?1 AND token_type='INFINITY_SEARCH'/);
 assert.match(worker,/const query=after\?stmt\.bind\(account\.id,/);
 assert.match(worker,/await identity\(request,env\)/);
 assert.match(worker,/url\.pathname==='\/v1\/wallet\/infinity-history'&&request\.method==='GET'/);
 assert.doesNotMatch(worker,/authByIp|request\.cf\.connectingIp|CF-Connecting-IP/);
});
test('history labels partial loads without claiming 500-row excerpt is complete',()=>{
 assert.match(ui,/Showing authenticated recent records only/);
 assert.match(ui,/Only part of the Cloudflare history/);
 assert.match(ui,/Complete available Infinity ledger history/);
 assert.match(ui,/page\.next/);
});
