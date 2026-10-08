const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function testReader({townOnly=false,shortOnly=false}={}) {
 const js=fs.readFileSync(path.join(__dirname,'..','infinite-book-discovery.js'),'utf8');
 const requests=[];
 const encyclopedia={
   query:{pages:{
     '123123':{pageid:123123,title:'Cedarfield (Iowa)',extract:'Cedarfield is a town in Iowa in the United States. The town has a population recorded in the 2020 census. It is part of a local administrative district. '.repeat(8)},
     '5380129':{pageid:5380129,title:'Derveni papyrus',
       extract:'The Derveni papyrus is an ancient Greek document recovered near Thessaloniki in 1962. '+('It is a philosophical document connected to Orphic religious tradition and has been studied as archaeological evidence. ').repeat(8)},
     '70639759':{pageid:70639759,title:'Discovery of the tomb of Tutankhamun',
       extract:'Tutankhamun’s tomb was discovered in 1922 by the archaeologist Howard Carter in Egypt’s Valley of the Kings. '+('Its unusual survival gave historians and archaeologists important evidence about ancient Egyptian burial customs. ').repeat(8)}
   }}
 };
 const fakeFetch=async url=>{
   const href=String(url);requests.push(href);
   if(href.includes('orange-brook'))return {ok:false,status:500};
   if(href.includes('en.wikipedia.org/w/api.php'))return {ok:true,json:async()=>townOnly?{query:{pages:{'123123':encyclopedia.query.pages['123123']}}}:shortOnly?{query:{pages:{'88221':{pageid:88221,title:'Antikythera mechanism',extract:('The Antikythera mechanism was recovered from a shipwreck. Researchers discovered a complex ancient gear mechanism used to predict astronomical positions. ').repeat(3)}}}}:encyclopedia};
   throw Error('Unexpected network request '+href);
 };
 const w={};
 const store={getItem:()=>null};
 const context={window:w,localStorage:store,fetch:fakeFetch,URL,URLSearchParams,
  setTimeout,clearTimeout,AbortController,console,crypto:{getRandomValues:a=>{a[0]=0;return a}}};
 vm.createContext(context);
 vm.runInContext(js,context,{filename:'infinite-book-discovery.js',timeout:5000});
 return {w,requests};
}

const catalog={sectors:[{id:10,name:'Archaeology'}],angles:[{id:1,name:'Historical discoveries'}],sourceRegistry:[]};
const roll={sector:10,angle:1,sourceClass:1};

test('broken primary search fails over to new, attributed and nonrepeating sourced story',async()=>{
 const {w,requests}=testReader();
 const story=await w.PhiInfiniteBookDiscover.find({roll,catalog,seen:new Set()});
 assert.ok(story,'must discover when SearXNG is unavailable');
 assert.match(story.id,/^wiki-[0-9]+$/);
 assert.ok(story.full.length>400);
 assert.ok(story.sourceUrl.startsWith('https://en.wikipedia.org/?curid='));
 assert.ok(story.full.includes('Creative Commons Attribution-ShareAlike'));
 assert.ok(requests.some(x=>x.includes('orange-brook')));
 assert.ok(requests.some(x=>x.includes('en.wikipedia.org/w/api.php')));
 const next=await w.PhiInfiniteBookDiscover.find({roll,catalog,seen:new Set([story.id])});
 assert.ok(next,'another sourced story should still be found');
 assert.notEqual(next.id,story.id,'must not recycle seen story');
});

test('geographic profiles are never big secrets, even when they mention a mystery', async()=>{
 const {w}=testReader({townOnly:true});
 const discover=w.PhiInfiniteBookDiscover;
 assert.equal(discover.isPlaceProfile({title:'Ghost Hollow',summary:'Ghost Hollow is a ghost town in Iowa with a population of 15.'}),true);
 assert.equal(discover.isSecretStory({title:'Lost Village',summary:'Lost Village is a small town in Iowa. The 2020 census recorded 150 residents.'}),false);
 const story=await discover.find({roll,catalog,seen:new Set()});
 assert.equal(story,null,'must not show a town to fill a card');
});
test('real archaeological oddities remain eligible while towns are not',()=>{
 const {w}=testReader();
 const candidate={title:'Derveni papyrus',summary:'An ancient Greek manuscript recovered by archaeologists in 1962 reveals forgotten Orphic traditions.'};
 assert.equal(w.PhiInfiniteBookDiscover.isSecretStory(candidate),true);
});

test('short verified source introductions remain usable after built-in stories run out',async()=>{
 const {w,requests}=testReader({shortOnly:true});
 const story=await w.PhiInfiniteBookDiscover.find({roll,catalog,seen:new Set()});
 assert.equal(story?.title,'Antikythera mechanism');
 assert.match(story.sourceUrl,/curid=88221/);
 assert.ok(story.summary.length>80);
 assert.ok(requests.filter(u=>u.includes('en.wikipedia.org/w/api.php')).length>=3,'rotated source searches broaden beyond a single page');
 const repeat=await w.PhiInfiniteBookDiscover.find({roll,catalog,seen:new Set([story.id])});
 assert.equal(repeat,null,'a seen source must never repeat');
});


test('all dimensions change the discovery plan and preserve the expanded 7800 combinations',()=>{
 const {w}=testReader();
 const c={sectors:[{id:1,name:'Energy & electricity'}],angles:[{id:9,name:'Unexpected invention'},{id:19,name:'Lost and rediscovered'}],
  sourceClasses:[{id:1,name:'Primary archives'},{id:2,name:'Museums and collections'}],
  sourceRegistry:[{sector:1,domains:['tesla-museum.org']}]};
 const archives=w.PhiInfiniteBookDiscover.sourcePlan({sector:1,angle:9,sourceClass:1},c,'Nikola Tesla');
 const museum=w.PhiInfiniteBookDiscover.sourcePlan({sector:1,angle:19,sourceClass:2},c,'Nikola Tesla');
 assert.equal(archives.combination,81);
 assert.equal(museum.combination,182);
 assert.match(archives.queries.join(' '),/patent archival record/);
 assert.match(museum.queries.join(' '),/museum collection/);
 assert.match(museum.queries.join(' '),/Lost and rediscovered/);
 assert.match(museum.queries.join(' '),/Nikola Tesla/);
 assert.equal(w.PhiInfiniteBookDiscover.sourcePlan({sector:39,angle:20,sourceClass:10},c).combination,7800);
});

test('famous person biographies are not secret stories, specific historical incidents can be',()=>{
 const {w}=testReader();
 const book=w.PhiInfiniteBookDiscover;
 const generic={title:'Nikola Tesla',summary:'Nikola Tesla was a Serbian-American inventor and electrical engineer best known for his electric power work.'};
 assert.equal(book.isGenericProfile(generic),true);
 assert.equal(book.isSecretStory(generic),false);
 assert.equal(book.isGenericProfile({title:"Tesla's radio-controlled boat demonstration",summary:"Tesla demonstrated a surprising remotely controlled boat in 1898."}),false);
});

test('GPT scouts obscure event queries then writes only when two independent sources support details',async()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','infinite-book-discovery.js'),'utf8');
 const log={prompts:[],searches:[]};
 const sources=[
  {title:"Tesla's radio-controlled boat demonstration",content:"In 1898 Nikola Tesla demonstrated a small boat controlled by radio signals at Madison Square Garden, showcasing remote control of its movements.",url:"https://tesla-museum.org/en/qr-en/exhibit-049/"},
  {title:"Remote Control Tesla historical exhibition",content:"A remotely controlled boat was demonstrated by Tesla at the 1898 Madison Square Garden electrical exhibition. It responded to wireless commands.",url:"https://www.pbs.org/tesla/ins/lab_remotec.html"},
  {title:"Nikola Tesla",content:"Nikola Tesla was a Serbian-American inventor best known for work with alternating current. His life and legacy made him a celebrated engineer in many countries.",url:"https://example.org/nikola-tesla-biography"}
 ];
 const fetch=async(url,opts={})=>{
  const u=String(url);
  if(u.includes('orange-brook')){log.searches.push(u);return {ok:true,json:async()=>({results:sources})}}
  if(u.includes('infinity-rogers')){
   const input=JSON.parse(opts.body).input;log.prompts.push(input);
   if(input.includes('SEARCH-PLANNING'))return {ok:true,json:async()=>({ok:true,output:JSON.stringify({queries:['Nikola Tesla overlooked wireless boat prototype 1898 museum patent','1898 Nikola Tesla remotely controlled boat original demonstration history']})})};
   return {ok:true,json:async()=>({ok:true,output:JSON.stringify({
    title:'The Boat That Obeyed Radio Commands at the 1898 Exhibition',
    summary:'In 1898, Nikola Tesla demonstrated a remotely controlled boat at the Madison Square Garden electrical exhibition. The small vessel responded to commands transmitted wirelessly rather than through a cable. The event demonstrated remote control as a specific invention rather than simply another achievement in his famous electrical career.',
    full:'The 1898 electrical exhibition at Madison Square Garden featured an unusual invention: a small boat that Nikola Tesla could steer by wireless signals. Observers saw an object in motion without a controlling wire, as commands were sent to the boat from the demonstration area. This was a practical demonstration of remote control, with movement coordinated from a separate controller.\n\nThe significance was not that Tesla was already an established inventor. It was that his boat showed a concrete application for transmitting commands without a physical connection. Museum and contemporary historical accounts describe this specific demonstration. The record supports the event, not any exaggerated claim that it proved unrelated scientific theories.',
    detail:'A small boat responded to radio commands at the 1898 exhibition',
    status:'documented',
    evidence_urls:[sources[0].url,sources[1].url]
   })})};
  }
  throw Error('Unexpected request '+u);
 };
 const win={},store={getItem:()=>null};
 const context={window:win,localStorage:store,fetch,URL,URLSearchParams,
  setTimeout,clearTimeout,AbortController,console,crypto:{getRandomValues:a=>{a[0]=0;return a}}};
 vm.createContext(context);vm.runInContext(js,context,{timeout:5000});
 const c={sectors:[{id:1,name:'Energy & electricity'}],
  angles:[{id:9,name:'Unexpected invention'}],
  sourceClasses:[{id:2,name:'Museums and collections'}],
  sourceRegistry:[{sector:1,domains:['tesla-museum.org']}]};
 const story=await win.PhiInfiniteBookDiscover.find({roll:{sector:1,angle:9,sourceClass:2},catalog:c,seen:new Set(),focus:'Nikola Tesla'});
 assert.equal(story?.discoveryMethod,'gpt-deep');
 assert.equal(story?.sourceClass,2);
 assert.equal(story?.combination,82);
 assert.match(story?.title||'',/Boat/);
 assert.equal(story?.sources?.length,2);
 assert.equal(log.prompts.length,2,'must use GPT for scouting and writing');
 assert.ok(log.searches.length>=2,'must search for the rolled research target');
 assert.match(log.prompts[0],/Unexpected invention/);
 assert.match(log.prompts[1],/Museums and collections/);
 assert.ok(!/^(Nikola Tesla)$/i.test(story?.title||''));
});
