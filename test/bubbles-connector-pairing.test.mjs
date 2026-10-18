import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConnectorPairing} from '../workers/bubbles-connections/pairing.mjs';
import {walletIdentity,handleConnections,PREFIX} from '../workers/bubbles-connections/router.mjs';
function fixture(){
  const rows=new Map();let time=100000,queue=Promise.resolve();
  const db={get:async k=>rows.get(k),put:async(k,v)=>rows.set(k,v),delete:async k=>rows.delete(k),list:async()=>new Map(rows),setAlarm:async()=>{},transaction(fn){const task=queue.then(async()=>{const copy=new Map(rows);const value=await fn({get:async k=>copy.get(k),put:async(k,v)=>copy.set(k,v),delete:async k=>copy.delete(k)});rows.clear();for(const [k,v]of copy)rows.set(k,v);return value;});queue=task.catch(()=>{});return task;}};
  const service=new ConnectorPairing(db,()=>time);
  return {service,rows,setTime:value=>time=value,env:{CONNECTIONS:{idFromName:n=>n,get:n=>{assert.equal(n,'connector-pairing-v1');return {pairIdentity:i=>service.identity(i),redeemPair:i=>service.redeem(i)};}},BOT_WALLET:{fetch:()=>assert.fail('paired sessions must not reach wallet')}}};
}
test('pair code is atomically single use, identity is server selected and session expires',async()=>{
  const f=fixture(),pair=await f.service.create({userId:'alice'});
  const results=await Promise.allSettled([f.service.redeem({code:pair.code}),f.service.redeem({code:pair.code})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const session=results.find(r=>r.status==='fulfilled').value;
  assert.ok(!JSON.stringify([...f.rows]).includes(session.token));assert.ok(!JSON.stringify([...f.rows]).includes(pair.code));
  const identity=await walletIdentity(new Request('https://quantaphi.org',{headers:{Authorization:'Bearer '+session.token}}),f.env);
  assert.equal(identity.userId,'alice');assert.notEqual(identity.sessionId,session.token);
  f.setTime(session.expiresAt);await assert.rejects(f.service.identity({token:session.token}),/verified_wallet_required/);
});
test('replacement and expiration invalidate old codes; ending a session revokes it',async()=>{
  const f=fixture(),first=await f.service.create({userId:'alice'});f.setTime(111000);
  const second=await f.service.create({userId:'alice'});await assert.rejects(f.service.redeem({code:first.code}));
  const session=await f.service.redeem({code:second.code});await f.service.end({token:session.token});await assert.rejects(f.service.identity({token:session.token}));
  f.setTime(122000);const third=await f.service.create({userId:'alice'});f.setTime(242000);await assert.rejects(f.service.redeem({code:third.code}));
});
test('foreign origin cannot redeem; paired session cannot authorize another pairing',async()=>{
  const f=fixture(),pair=await f.service.create({userId:'alice'}),session=await f.service.redeem({code:pair.code});
  const request=(path,origin)=>new Request('https://quantaphi.org'+PREFIX+path,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:'{}'});
  assert.equal((await handleConnections(request('/pair/redeem','https://evil.test'),f.env,()=>assert.fail())).status,403);
  assert.equal((await handleConnections(request('/pair/create','https://quantaphi.org'),f.env,()=>assert.fail())).status,401);
});
