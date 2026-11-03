import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiscoveredCard,discoverWebsiteCard,rememberDiscoveredCard,findRememberedCard} from '../search-card-discovery.mjs';

test('GE search result becomes a source-backed reusable Quick Card without declaring an endorsement',()=>{
 const result=discoverWebsiteCard('GE',[
  {title:'GE - Once, Now, Forever',url:'https://www.ge.com/about-us'},
  {title:'GE Appliances',url:'https://www.geappliances.com/'}
 ]);
 assert.equal(result?.name,'GE');
 assert.equal(result?.official,'https://www.ge.com/');
 assert.equal(result?.id,'discovered-ge-com');
 assert.equal(result?.kind,'Website');
 assert.equal(result?.sourceStatus,'search-result');
 assert.match(result?.route,/^\/discovered-quick-card\.html\?site=/);
 assert.match(result?.description,/not verified as a merchant partner/i);
});

test('exact domain input creates a preview, but unrelated research queries do not guess an official site',()=>{
 assert.equal(createDiscoveredCard('geappliances.com')?.official,'https://geappliances.com/');
 assert.equal(discoverWebsiteCard('https://geappliances.com/',[])?.official,'https://geappliances.com/');
 assert.equal(discoverWebsiteCard('washing machines',[
  {title:'Latest washing machines',url:'https://example-shop.com/category/washers'}
 ]),null);
});

test('unsafe URL and lookalike search results cannot create website cards',()=>{
 for(const value of [
  'http://ge.com','https://127.0.0.1/','https://localhost/','https://admin:pass@ge.com/',
  'https://ge.com:8443','https://ge.com.evil.example/','https://ge.local/','javascript:alert(1)'
 ])assert.equal(createDiscoveredCard(value),null,value);
 assert.equal(discoverWebsiteCard('GE',[{title:'GE official',url:'https://ge.com.evil.example/'}]),null);
 assert.equal(discoverWebsiteCard('GE',[{title:'GE official',url:'https://ge.com.evil.com/'}]),null);
 assert.equal(discoverWebsiteCard('GE',[{title:'GE official',url:'https://ge.com:8080/'}]),null);
});

test('device-local discovery is domain-idempotent and searchable by name without claiming cloud sync',()=>{
 const data=new Map();
 const storage={
  getItem:key=>data.get(key)??null,
  setItem:(key,value)=>data.set(key,value)
 };
 const card=createDiscoveredCard('ge.com','GE');
 assert.equal(rememberDiscoveredCard(card,storage),true);
 assert.equal(rememberDiscoveredCard(createDiscoveredCard('www.ge.com','General Electric'),storage),true);
 const saved=JSON.parse(data.values().next().value);
 assert.equal(saved.length,1);
 assert.equal(findRememberedCard('GE',storage)?.official,'https://ge.com/');
 assert.equal(findRememberedCard('missing',storage),null);
});

test('long independent domains have bounded stable IDs suitable for Follow and distinct domain identities',()=>{
 const first=createDiscoveredCard('a'.repeat(58)+'.brand-catalog.example.org','Catalog A');
 const second=createDiscoveredCard('a'.repeat(58)+'.brand-catalog2.example.org','Catalog B');
 assert.ok(first&&second);
 assert.ok(first.id.length<=70);
 assert.ok(second.id.length<=70);
 assert.notEqual(first.id,second.id);
});
