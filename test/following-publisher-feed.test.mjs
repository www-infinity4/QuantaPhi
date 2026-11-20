import test from 'node:test';
import assert from 'node:assert/strict';
import {followedPublisherProfiles,selectFollowedSourceItems} from '../following-publisher-feed.mjs';
import {cardProvider} from '../quanta-card-provider.mjs';

const profiles=[
 {id:'heritage',name:'Heritage Auctions',official:'https://coins.ha.com/',category:'Auctions',query:'Morgan dollar'},
 {id:'sonic',name:'SONIC',official:'https://pages-a.sonicdrivein.com/deals/',category:'Restaurants',query:'Deals'}
];
const heritageItem={url:'https://coins.ha.com/itm/example/a/12-3.s',image:'https://images.ha.com/coin.jpg',title:'1885 Morgan Dollar · Heritage lot',description:'Original source lot',checked_at:'2026-10-31T17:00:00.000Z',kind:'Website spotlight',source:'coins.ha.com',method:'Source page',price:''};
const sonicItem={url:'https://pages-a.sonicdrivein.com/deals/special',image:'https://images.example/sonic.jpg',title:'Official SONIC offer',checked_at:'2026-10-31T17:00:00.000Z',kind:'Website spotlight',source:'pages-a.sonicdrivein.com',method:'Indexed preview',price:''};

test('Following selects only explicitly followed publishers, not everyone the user browsed',()=>{
 assert.deepEqual(followedPublisherProfiles(['heritage','heritage','not-followed'],profiles).map(x=>x.id),['heritage']);
 assert.deepEqual(followedPublisherProfiles([],profiles),[]);
 const offers=selectFollowedSourceItems(['heritage'],profiles,{heritage:[heritageItem],sonic:[sonicItem]});
 assert.equal(offers.length,1);
 assert.equal(offers[0].title,heritageItem.title);
 assert.equal(offers[0].publisher,'Heritage Auctions');
 assert.equal(offers[0].publisherId,'heritage');
});

test('Following rejects deceptive URLs, bogus images and duplicate listings even when upstream data is wrong',()=>{
 const result=selectFollowedSourceItems(['heritage'],profiles,{heritage:[
  heritageItem,{...heritageItem}, {...heritageItem,url:'https://coins.ha.com.evil.example/itm/fake'},
  {...heritageItem,url:'javascript:alert(1)'}, {...heritageItem,image:'data:image/svg+xml,evil'},
  {...heritageItem,image:'https://localhost/internal.png'}, {...heritageItem,title:''}
 ]});
 assert.equal(result.length,1);
 assert.equal(result[0].url,heritageItem.url);
});

test('no private bid, login, orders or account-derived recommendation is inferred from a followed publisher',()=>{
 const result=selectFollowedSourceItems(['heritage'],profiles,{heritage:[heritageItem]})[0];
 assert.equal(result.price,'');
 assert.equal(result.sponsored,false);
 assert.equal(result.authenticated,false);
 assert.ok(!JSON.stringify(result).includes('credentials'));
 const provider=cardProvider({official:'https://coins.ha.com/'});
 assert.equal(provider.id,'heritage');
 assert.equal(provider.signin,'https://www.ha.com/c/login.zx');
 assert.equal(provider.connector,null);
});

test('Following feed is wired to Oracle tabs without changing Public or For You data models',async()=>{
 const fs=await import('node:fs');
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('oracle-card-deck.js'),/mountFollowingPublisherFeed/);
 assert.match(read('index.html'),/id="oracleFollowingFeed"/);
 assert.match(read('oracle-card-deck.css'),/oracle-following-feed/);
});
