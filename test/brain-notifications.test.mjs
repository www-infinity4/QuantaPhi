import test from 'node:test';import assert from 'node:assert/strict';
import {NotificationDeck} from '../brain-notifications.mjs';
const row=(id,seconds)=>({id,when:new Date(seconds*1000).toISOString(),message:id});
test('new receipts do not replace the selected notification; arrows change it',()=>{
 const deck=new NotificationDeck();deck.add([row('a',10),row('b',20)]);assert.equal(deck.current.id,'b');
 deck.add([row('c',30),row('b',20)]);assert.equal(deck.current.id,'b');assert.equal(deck.entries.length,3);
 assert.equal(deck.move(1).id,'a');assert.equal(deck.move(-1).id,'b');assert.equal(deck.move(-1).id,'c');
 assert.equal(deck.move(-1).id,'c');
});
test('empty, invalid and repeated notifications cannot invent or duplicate activity',()=>{
 const deck=new NotificationDeck();deck.add([row('a',10),{id:'bad',when:'not a date'}]);deck.add([row('a',10)]);
 assert.equal(deck.entries.length,1);assert.equal(deck.current.id,'a');assert.equal(new NotificationDeck().move(1),null);
});
