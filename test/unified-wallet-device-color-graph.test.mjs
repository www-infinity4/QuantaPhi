import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {issueNumericDeviceId} from '../workers/unified-wallet/device-number-core.mjs';
import {encodeDeviceColorTiles,decodeDeviceColorTiles,buildWalletColorWindow,colorWindowsAlign} from '../workers/unified-wallet/device-color-graph.mjs';

const crypto=webcrypto;
test('six RGB hex color tiles losslessly encode one 39-digit authorized app label',async()=>{
 const id=issueNumericDeviceId(crypto);
 const result=await encodeDeviceColorTiles(id,{crypto});
 assert.equal(result.format,'wallet-device-color-tiles/v1');
 assert.equal(result.tiles.length,6);
 assert.ok(result.tiles.every(x=>/^#[a-f0-9]{6}$/i.test(x)));
 assert.equal(result.isAuthentication,false);
 assert.equal(result.walletUnlocked,false);
 assert.equal(await decodeDeviceColorTiles(result,{crypto}),id);
});
test('roundtrips leading-zero labels and preserves all 39 decimal digits as a string',async()=>{
 const id='0'.repeat(38)+'1';
 const graph=await encodeDeviceColorTiles(id,{crypto});
 assert.equal(await decodeDeviceColorTiles(graph,{crypto}),id);
 assert.equal(graph.tiles.length,6);
 await assert.rejects(encodeDeviceColorTiles('0001234567',{crypto}),/39-digit/i);
 await assert.rejects(encodeDeviceColorTiles('1'.repeat(40),{crypto}),/39-digit/i);
 await assert.rejects(encodeDeviceColorTiles('9'.repeat(39),{crypto}),/128-bit/i);
});
test('one altered color rejects the numeric value instead of accidentally matching',async()=>{
 const id=issueNumericDeviceId(crypto);
 const graph=await encodeDeviceColorTiles(id,{crypto});
 const changed={...graph,tiles:[...graph.tiles]};
 changed.tiles[2]='#'+(changed.tiles[2].slice(1)==='ffffff'?'000000':'ffffff');
 await assert.rejects(decodeDeviceColorTiles(changed,{crypto}),/checksum|corrupted/i);
 await assert.rejects(decodeDeviceColorTiles({...graph,tiles:['#nothex',...graph.tiles.slice(1)]},{crypto}),/invalid color/i);
});
test('all tiles align independently of device listing order within one verified wallet',async()=>{
 const a=issueNumericDeviceId(crypto),b=issueNumericDeviceId(crypto);
 const first=await buildWalletColorWindow({verifiedAccountId:'wallet-a',linkedAccountId:'wallet-a',deviceNumbers:[a,b],crypto});
 const swapped=await buildWalletColorWindow({verifiedAccountId:'wallet-a',linkedAccountId:'wallet-a',deviceNumbers:[b,a],crypto});
 const wrong=await buildWalletColorWindow({verifiedAccountId:'wallet-b',linkedAccountId:'wallet-b',deviceNumbers:[a,b],crypto});
 assert.equal(first.colors.length,11);
 assert.ok(first.colors.every(x=>/^#[a-f0-9]{6}$/.test(x)));
 assert.equal(first.authorizesWallet,false);
 assert.equal(first.walletUnlocked,false);
 assert.equal(colorWindowsAlign(first,swapped),true);
 assert.equal(colorWindowsAlign(first,wrong),false);
 await assert.rejects(buildWalletColorWindow({verifiedAccountId:'wallet-a',linkedAccountId:'wallet-b',deviceNumbers:[a,b],crypto}),/account mismatch/i);
});
test('a copied color window or visual overlay never becomes financial authorization',async()=>{
 const n=issueNumericDeviceId(crypto);
 const a=await buildWalletColorWindow({verifiedAccountId:'wallet-a',linkedAccountId:'wallet-a',deviceNumbers:[n],crypto});
 const fake={...a,colors:[...a.colors]};
 assert.equal(colorWindowsAlign(a,fake),true,'visual comparison can be copied');
 assert.equal(a.isAuthentication,false);
 assert.equal(a.authorizesWallet,false);
 assert.equal(a.walletUnlocked,false);
 assert.equal('credential' in a,false);
});
