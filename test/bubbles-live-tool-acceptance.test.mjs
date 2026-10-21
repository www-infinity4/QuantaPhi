import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyLiveBubblesTools} from '../scripts/verify-bubbles-live-tools.mjs';

function fixture({badPage=false,badWeather=false}={}){
 const requests=[];
 const fetcher=async(url,options)=>{
  assert.equal(url,'https://bubbles-tools.marvaseater.workers.dev/v1/assist');
  assert.equal(options.method,'POST');
  assert.equal(options.redirect,'manual');
  assert.equal(options.headers.Origin,'https://quantaphi.org');
  const {request}=JSON.parse(options.body);
  requests.push(request);
  if(/Read https:\/\/quantaphi\.org\/bubbles\.html/.test(request))
   return Response.json({ok:true,receipt:{tool:'web.read_page',status:badPage?'failed':'complete',
    sourceReadVerified:!badPage,repositoryActionsVerified:false},
    sourceUrl:'https://quantaphi.org/bubbles.html',
    content:'Public Bubbles page with a verified explanation of owner connection and chat tools.'});
  return Response.json({ok:true,receipt:{tool:'weather.current',status:'partial'},
   locations:[
    {requested:'Albia, Iowa',ok:true,output:'Updated at 16:00',observedAt:'2026-10-20T16:00',provider:'Open-Meteo'},
    {requested:'Lovilia, Iowa',ok:false,output:'No verified conditions available'},
    {requested:badWeather?'Wrong Town, Iowa':'Ottumwa, Iowa',ok:true,output:'Updated at 16:00',observedAt:'2026-10-20T16:00',provider:'Open-Meteo'}
   ]});
 };
 return {fetcher,requests};
}

test('live acceptance requires source HTML and per-town receipts, not a chatbot description',async()=>{
 const {fetcher,requests}=fixture();
 const result=await verifyLiveBubblesTools(fetcher);
 assert.equal(result.ok,true);
 assert.equal(result.page.readVerified,true);
 assert.equal(result.weather.routeVerified,true);
 assert.equal(result.weather.verifiedCount,2);
 assert.equal(result.weather.missingCount,1);
 assert.equal(requests.length,2);
 assert.match(requests[0],/quantaphi\.org\/bubbles\.html/);
 assert.match(requests[1],/Albia, Lovilia, and Ottumwa, Iowa/);
});
test('public HTML failure cannot masquerade as a deployment check',async()=>{
 await assert.rejects(verifyLiveBubblesTools(fixture({badPage:true}).fetcher),/live_public_html_reader_not_verified/);
});
test('dropped or substituted town fails live acceptance even if model answered',async()=>{
 await assert.rejects(verifyLiveBubblesTools(fixture({badWeather:true}).fetcher),/live_multi_town_receipts_missing/);
});
