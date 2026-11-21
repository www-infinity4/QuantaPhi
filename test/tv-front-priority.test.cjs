const {test}=require('node:test'),assert=require('node:assert/strict');
const api=require('../tv-front-priority.js');
const now=api.START+3600000;
test('game-night TV opens before a score response and survives temporary missing/stale data',()=>{
 assert.equal(api.shouldPin(null,now),true);
 assert.equal(api.shouldPin({status:'unknown'},now),true);
 assert.equal(api.shouldPin({status:'live',stale:true},now),true);
 assert.equal(api.shouldPin(null,api.START-1),false);
 assert.equal(api.shouldPin(null,api.END+1),false);
 assert.equal(api.shouldPin(null,NaN),false);
});
test('final and unavailable states end placement, while storage remembers final across refreshes',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 for(const status of ['final','unavailable'])assert.equal(api.shouldPin({status},now),false);
 api.remember({status:'final'},storage);assert.equal(api.readFinal(storage),true);
 assert.equal(api.shouldPin(null,now,api.readFinal(storage)),false);
 api.remember({status:'live',stale:true},storage);assert.equal(api.readFinal(storage),true);
 api.remember({status:'live'},storage);assert.equal(api.readFinal(storage),false);
 storage.setItem(api.KEY,JSON.stringify({gamePk:1,status:'final'}));assert.equal(api.readFinal(storage),false);
});
test('blocked or malformed local storage cannot break the TV viewer',()=>{
 const broken={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 assert.equal(api.readFinal(broken),false);assert.doesNotThrow(()=>api.remember({status:'final'},broken));
 assert.equal(api.readFinal({getItem:()=>'{bad'}),false);
});
