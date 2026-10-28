import {test} from 'node:test';
import assert from 'node:assert/strict';
import {walletEmailPreference} from '../workers/bubbles-connections/wallet-email.mjs';
import {readFileSync} from 'node:fs';

function fixture(){
 const store=new Map(),service={
  namespace:async id=>'user:'+id+':',
  storage:{get:async key=>store.get(key),put:async(key,value)=>store.set(key,value),delete:async key=>store.delete(key)}
 };
 const cid='z'.repeat(43);
 store.set('user:alice:connection:'+cid,{userId:'alice',provider:'google',status:'connected',verifiedEmail:'alice@example.com',providerSubject:'google-subject-1',revision:'rev-1'});
 return {store,service,cid};
}
test('StarCoin wallet email enrollment binds only to the same authenticated wallet Google-verified address',async()=>{
 const {service,cid}=fixture();
 await assert.rejects(walletEmailPreference(service,{userId:'bob',action:'enroll',cadence:'weekly',connectionId:cid}),/verified_google_connection_required/);
 await assert.rejects(walletEmailPreference(service,{userId:'alice',action:'enroll',cadence:'hourly',connectionId:cid}),/invalid_wallet_email_cadence/);
 const enrolled=await walletEmailPreference(service,{userId:'alice',action:'enroll',cadence:'daily',connectionId:cid});
 assert.equal(enrolled.email,'alice@example.com');
 assert.equal(enrolled.enabled,true);assert.equal(enrolled.deliveryEnabled,false);
 assert.equal(enrolled.status,'pending_email_sender_setup');
 const view=await walletEmailPreference(service,{userId:'alice'});
 assert.equal(view.cadence,'daily');assert.equal(view.enabled,true);
 const bob=await walletEmailPreference(service,{userId:'bob'});assert.equal(bob.enabled,false);
});
test('OAuth refresh keeps enrollment, while disconnect invalidates wallet email notifications',async()=>{
 const {service,store,cid}=fixture();
 await walletEmailPreference(service,{userId:'alice',action:'enroll',cadence:'weekly',connectionId:cid});
 store.set('user:alice:connection:'+cid,{...store.get('user:alice:connection:'+cid),revision:'new-revision'});
 assert.equal((await walletEmailPreference(service,{userId:'alice'})).enabled,true);
 store.set('user:alice:connection:'+cid,{...store.get('user:alice:connection:'+cid),status:'disconnected'});
 const view=await walletEmailPreference(service,{userId:'alice'});
 assert.equal(view.enabled,false);assert.equal(view.email,null);assert.equal(view.status,'verification_expired');
 await walletEmailPreference(service,{userId:'alice',action:'disable'});
 assert.equal((await walletEmailPreference(service,{userId:'alice'})).status,'not_enrolled');
});
test('email settings never imply automatic delivery without sender and verify reconciled wallet source',()=>{
 const router=readFileSync(new URL('../workers/bubbles-connections/router.mjs',import.meta.url),'utf8');
 const client=readFileSync(new URL('../bubbles-connections.mjs',import.meta.url),'utf8');
 assert.match(router,/cloudStarCoinBackup\(identity\.userId,wallet,star\.state\)/);
 assert.match(router,/starcoin_verified_device_required/);
 assert.match(client,/Weekly balance email/);
 assert.match(client,/Daily balance email/);
 assert.match(client,/pending an approved email sender/);
 assert.doesNotMatch(router,/mail\.send|sendEmail\(/);
});
