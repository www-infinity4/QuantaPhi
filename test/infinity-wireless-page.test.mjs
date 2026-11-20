import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{routeAsset} from '../workers/infinity-wireless-page/worker.mjs';
test('public wireless page route serves only reviewed first-party files',()=>{
 assert.equal(routeAsset('/wireless/').file,'/wireless/index.html');
 assert.equal(routeAsset('/wireless/index.html').file,'/wireless/index.html');
 assert.equal(routeAsset('/wireless/order.mjs').type,'application/javascript; charset=utf-8');
 assert.equal(routeAsset('/wireless/switchboard.svg').type,'image/svg+xml; charset=utf-8');
 for(const path of ['/wireless/../private','/wireless/other.js','/api/wireless/orders','/wallet'])assert.equal(routeAsset(path),null);
});
test('page Worker rejects mutations and unknown routes without touching the API',async()=>{
 const denied=await worker.fetch(new Request('https://quantaphi.org/wireless/order.mjs',{method:'POST'}));
 assert.equal(denied.status,405);
 const missing=await worker.fetch(new Request('https://quantaphi.org/wireless/missing'));
 assert.equal(missing.status,404);
 const redirect=await worker.fetch(new Request('https://quantaphi.org/wireless?card=1'));
 assert.equal(redirect.status,308);
 assert.equal(redirect.headers.get('location'),'https://quantaphi.org/wireless/?card=1');
});
