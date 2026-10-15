'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const code=fs.readFileSync(path.join(__dirname,'../workers/platinum-switchboard/index.js'),'utf8')
 .replace('export class PlatinumLine','class PlatinumLine')
 .replace('export default','const main =');
function setup(){
 const context={crypto:webcrypto,URL,Request,Response,Headers,TextEncoder,Date,console};
 vm.runInNewContext(code+';globalThis.bundle={PlatinumLine,main}',context);
 const {PlatinumLine,main}=context.bundle;
 const instances=new Map();
 const binding={
  idFromName:name=>name,
  get(name){
   if(!instances.has(name)){
    const values=new Map(),storage={get:async key=>values.get(key),put:async(key,value)=>values.set(key,value)};
    instances.set(name,new PlatinumLine({storage},{}));
   }
   return {fetch:request=>instances.get(name).fetch(request)};
  }
 };
 const env={PLATINUM_LINES:binding};
 async function req(alias,suffix='',method='GET',payload,headers={}){
  const response=await main.fetch(new Request('https://worker.example/v1/line/'+alias+suffix,{
   method,headers:payload?{'Content-Type':'application/json',...headers}:headers,
   body:payload?JSON.stringify(payload):undefined
  }),env);
  return {status:response.status,body:await response.json()};
 }
 return {req};
}
test('opt-in Platinum identity cannot be claimed or impersonated by another phone',async()=>{
 const {req}=setup(),alice='1'.repeat(64),bob='2'.repeat(64);
 assert.equal((await req('alice','/register','POST',{name:'Alice'},{'x-platinum-owner':alice})).status,200);
 assert.equal((await req('bob','/register','POST',{name:'Bob'},{'x-platinum-owner':bob})).status,200);
 assert.equal((await req('alice','/register','POST',{name:'Hacker'},{'x-platinum-owner':bob})).status,409);
 const profile=await req('alice');
 assert.equal(profile.body.name,'Alice');
 assert.equal(profile.body.ownerHash,undefined);
 assert.equal((await req('bob','/call','POST',{from:'alice',ownerKey:bob})).status,403);
 const invite=await req('bob','/call','POST',{from:'alice',ownerKey:alice});
 assert.equal(invite.status,200);
 assert.match(invite.body.ticket,/^[0-9a-f]{64}$/);
 assert.equal((await req('bob','/call','POST',{from:'alice',ownerKey:alice})).status,409);
 assert.equal((await req('bob','/inbox','GET',undefined,{'x-platinum-owner':alice})).status,401);
 assert.equal((await req('bob','/inbox','GET',undefined,{'x-platinum-owner':bob})).body.call.from,'alice');
});
test('WebRTC signals are private to the dialer and recipient, no phone calls are simulated',async()=>{
 const {req}=setup(),alice='1'.repeat(64),bob='2'.repeat(64);
 await req('alice','/register','POST',{name:'Alice'},{'x-platinum-owner':alice});
 await req('bob','/register','POST',{name:'Bob'},{'x-platinum-owner':bob});
 const invite=(await req('bob','/call','POST',{from:'alice',ownerKey:alice})).body;
 assert.equal((await req('bob','/signal','POST',{id:invite.id,type:'offer',sdp:'v=0\\r\\noffer'})).status,403);
 assert.equal((await req('bob','/signal','POST',{id:invite.id,type:'offer',sdp:'v=0\\r\\noffer'},{'x-platinum-ticket':invite.ticket})).status,200);
 const inbox=(await req('bob','/inbox','GET',undefined,{'x-platinum-owner':bob})).body;
 assert.match(inbox.call.offer,/^v=0/);
 assert.equal((await req('bob','/signal','POST',{id:invite.id,type:'answer',sdp:'v=0\\r\\nanswer'},{'x-platinum-owner':alice})).status,403);
 assert.equal((await req('bob','/signal','POST',{id:invite.id,type:'answer',sdp:'v=0\\r\\nanswer'},{'x-platinum-owner':bob})).status,200);
 const status=await req('bob','/status','GET',undefined,{'x-platinum-ticket':invite.ticket});
 assert.equal(status.body.status,'connected');
 assert.match(status.body.answer,/^v=0/);
 assert.equal((await req('6415550198')).status,404);
 assert.equal((await req('bob','/signal','POST',{id:invite.id,type:'hangup'},{'x-platinum-owner':bob})).status,200);
 assert.equal((await req('bob','/call','POST',{from:'alice',ownerKey:alice})).status,200);
});
test('Phone page is routed from real Platinum, provides independent internet call signaling and local drafts',()=>{
 const route=fs.readFileSync(path.join(__dirname,'../workers/quantaphi-site/worker.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../phone/index.html'),'utf8');
 const ui=fs.readFileSync(path.join(__dirname,'../phone/phone.js'),'utf8');
 const platinum=fs.readFileSync(path.join(__dirname,'../platinum/index.html'),'utf8');
 assert.match(route,/sourcePath: '\/phone\/index.html'/);
 assert.match(platinum,/href="\/phone\/"/);
 assert.match(html,/id="phone-draft"/);
 assert.match(ui,/localStorage\.setItem\(DRAFT/);
 assert.match(ui,/new RTCPeerConnection/);
 assert.match(ui,/getUserMedia/);
 assert.match(ui,/stun\.cloudflare\.com:3478/);
 assert.doesNotMatch(ui,/navigator\.serviceWorker\.register|document\.cookie/);
});
