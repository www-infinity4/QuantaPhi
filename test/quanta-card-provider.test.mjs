import test from 'node:test';
import assert from 'node:assert/strict';
import {cardProvider,providerSearchUrl,quickCardManifest} from '../quanta-card-provider.mjs';

test('eBay resolves from official HTTPS URL, not display name',()=>{
 const ebay=cardProvider({id:'published-abc',name:'Coin shop',website:'https://www.ebay.com/itm/123'});
 assert.equal(ebay.id,'ebay');assert.equal(ebay.signin,'https://signin.ebay.com/');
 assert.equal(ebay.purchase,'provider-checkout');
 const url=providerSearchUrl(ebay,'100 coins & silver');
 assert.equal(url,'https://www.ebay.com/sch/i.html?_nkw=100%20coins%20%26%20silver');
});
test('counterfeit host, unsafe scheme and forged card name cannot become provider',()=>{
 for(const website of ['https://myebay.com','https://ebay.com.attacker.example','https://fake-ebay.com','http://ebay.com','https://user:pass@ebay.com','https://ebay.com:444/']){
  assert.equal(cardProvider({id:'ebay',name:'eBay',website}),null,website);
 }
 assert.equal(cardProvider({name:'Facebook official login',website:'https://example.com'}),null);
});
test('social card shows real provider handoff but never impersonates API authorization',()=>{
 const x=cardProvider({id:'x',official:'https://x.com/'});
 assert.equal(x.id,'x');assert.equal(x.compose,'https://x.com/compose/post');
 const manifest=quickCardManifest({id:'x',official:'https://x.com/'});
 assert.equal(manifest.accountConnection,'not-integrated');
 assert.equal(manifest.apiAccess,'not-granted-by-card');
 assert.equal(manifest.nativeApp,'not-embedded');
 assert.match(manifest.voiceActions,/confirm/);
 assert.ok(manifest.interactions.includes('follow'));
});
test('Google account connector can be offered without asserting a connection',()=>{
 const profile=cardProvider({official:'https://www.google.com/search'});
 assert.equal(profile.connector,'google');
 const manifest=quickCardManifest({id:'google',official:'https://www.google.com/'});
 assert.equal(manifest.accountConnection,'bubbles-account-page');
 assert.equal(manifest.apiAccess,'not-granted-by-card');
});
test('JCPenney and GUESS use official home rather than invented sign-in path',()=>{
 const jcp=cardProvider({website:'https://www.jcpenney.com/g/men'});
 assert.equal(jcp.id,'jcpenney');assert.equal(jcp.hasDedicatedSignin,false);
 assert.equal(jcp.signin,'https://www.jcpenney.com/');
 const guess=cardProvider({website:'https://www.guess.com/us/en/'});
 assert.equal(guess.id,'guess');assert.equal(guess.purchase,'provider-checkout');
});
test('unknown public site keeps general card controls, no fake account integration',()=>{
 const m=quickCardManifest({id:'hello',website:'https://example.com/'});
 assert.equal(m.providerId,null);assert.equal(m.providerLogin,null);
 assert.equal(m.checkout,'not-integrated');
 assert.ok(m.interactions.includes('collect'));
});
