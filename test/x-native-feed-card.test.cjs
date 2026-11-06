'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm');
const read=path=>fs.readFileSync(path,'utf8');
test('native X card mounts in QuantaPhi and preserves separate Spaces card',()=>{
 const host=read('bubbles-card-host.mjs');assert.ok(host.includes("script.type='module'"),'Bubbles host must load registered mjs cards');
 const home=read('index.html'),card=read('x-twitter-card.mjs'),css=read('x-twitter-card.css'),page=read('twitter.html');
 assert.ok(page.includes('id="xTwitterCard"'));
 assert.ok(page.includes('cloud-wallet-client.js'));
 assert.ok(page.includes('x-twitter-card.mjs'));
 assert.ok(!page.includes('window.location.replace'))
 assert.ok(home.includes('id="xTwitterCard"'),'original X widget must exist for Oracle to move');
 assert.ok(home.includes('/x-twitter-card.mjs'),'real X controller must be loaded on homepage');
 assert.ok(home.includes('/x-twitter-card.css'));
 const deck=read('oracle-card-deck.js');
 assert.ok(deck.includes("['xTwitterCard','X · Twitter Quick Card']"),'X must be registered as a native Oracle carousel choice');
 assert.ok(deck.includes("xTwitterCard:['x-twitter'"),'X should have its own Public / For You / Following routing key');
 assert.ok(deck.includes("twitter:'xTwitterCard'"),'deep link must select the real X slide');
 assert.ok(page.includes('id="xTwitterCard"'),'old bookmark stays usable, but is no longer the only entry'); assert.ok(home.includes('id="xSpacesQuickCard"'));
 for(const name of ['Public','Following','Live Spaces','Profile','Compose','Reply','Like'])assert.ok(card.includes(name),name);
 assert.ok(card.includes('textContent'),'untrusted post text must be escaped');
 assert.ok(card.includes('/v1/x/timeline'));
 assert.ok(card.includes('/v1/x/spaces/live'));
 assert.ok(card.includes('/v1/x/post'));
 assert.ok(card.includes('/v1/x/like'));
 assert.ok(card.includes('/connect-x'),'single consistent X authorization location');
 assert.ok(css.includes('min-width:0'));
 assert.ok(css.includes('overflow-wrap:anywhere'));
 assert.ok(!card.includes('fakePosts'));
});
test('native X backend verifies scope, uses source data, and does not replay ended Spaces as live',()=>{
 const worker=read('workers/media-star-following/worker.js');
 for(const endpoint of ['/v1/x/timeline','/v1/x/spaces/live','/v1/x/profile','/v1/x/post','/v1/x/like'])assert.ok(worker.includes(endpoint),endpoint);
 assert.ok(worker.includes('x_write_permission_required'));
 assert.ok(worker.includes("space.state==='live'"),'live cards must filter out ended Spaces');
 assert.ok(worker.includes("tweet.write"));
 assert.ok(worker.includes("like.write"));
 assert.ok(worker.includes('x_api_verified'));
 assert.ok(!worker.includes('fakeTimeline'));
});

function mountCard(fetchData){
 const nodes=[],requests=[];
 let intersection,poll;
 class Element extends EventTarget{
  constructor(tag){super();this.tag=tag;this.children=[]}
  append(...children){this.children.push(...children)}
  replaceChildren(...children){this.children=children}
  setAttribute(){}
 }
 const root=new Element('section');
 root.isConnected=true;
 const document=Object.assign(new EventTarget(),{
  visibilityState:'visible',
  getElementById:()=>root,
  createElement(tag){const node=new Element(tag);nodes.push(node);return node;}
 });
 vm.runInNewContext(read('x-twitter-card.mjs').replace('export function','function'),{
  document,
  window:{QuantaCloudConnection:{resolveDeviceToken:async()=> 'sq_'+'a'.repeat(32)}},
  fetch:async url=>{
   const {pathname,search}=new URL(url);
   const path=pathname+search;
   requests.push(path);
   return {ok:true,json:async()=>fetchData(path)};
  },
  IntersectionObserver:class{
   constructor(callback){intersection=callback}
   observe(){}
   disconnect(){}
  },
  setInterval(callback){poll=callback;return 1;},
  clearInterval(){}
 });
 return {
  requests,document,poll,
  show(visible){intersection?.([{isIntersecting:visible,intersectionRatio:visible?1:0}]);},
  click(label){nodes.find(node=>node.tag==='button'&&node.textContent===label).dispatchEvent(new Event('click'));},
  timeline:()=>nodes.find(node=>node.className==='xt-timeline')
 };
}
const flush=()=>new Promise(setImmediate);
const connected={xConnected:true,canPost:false,canLike:false};
const post=text=>({id:'42',text,url:'https://x.com/i/web/status/42'});

test('changing tabs during a pending X read loads the latest view without showing an old result',async()=>{
 const publicRead=Promise.withResolvers();
 const card=mountCard(path=>{
  if(path==='/v1/x/account')return connected;
  if(path.includes('feed=public'))return publicRead.promise;
  assert.match(path,/feed=following/);
  return {posts:[post('Following result')]};
 });
 card.show(true);
 await flush();
 assert.match(card.requests.at(-1),/feed=public/);
 card.click('Following');
 assert.equal(card.timeline().children.length,0);
 publicRead.resolve({posts:[post('Public result')]});
 await flush();
 assert.match(card.requests.at(-1),/feed=following/);
 assert.equal(card.timeline().children[0].children[1].textContent,'Following result');
});

test('the hidden X widget does not start reads or refresh live Spaces',async()=>{
 const card=mountCard(path=>path==='/v1/x/account'?connected:
  path.includes('/spaces/live')?{spaces:[{title:'Live room',state:'live',url:'https://x.com/i/spaces/example'}]}:{posts:[]});
 await flush();
 assert.deepEqual(card.requests,[]);
 card.show(true);
 await flush();
 card.click('Live Spaces');
 await flush();
 const first=card.requests.length;
 assert.match(card.requests.at(-1),/\/spaces\/live/);
 card.show(false);
 card.poll();
 await flush();
 assert.equal(card.requests.length,first);
 card.show(true);
 card.document.visibilityState='hidden';
 card.poll();
 await flush();
 assert.equal(card.requests.length,first);
 card.document.visibilityState='visible';
 card.poll();
 await flush();
 assert.equal(card.requests.length,first+2);
});
