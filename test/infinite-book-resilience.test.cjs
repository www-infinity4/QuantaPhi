const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function testReader() {
 const js=fs.readFileSync(path.join(__dirname,'..','infinite-book-discovery.js'),'utf8');
 const requests=[];
 const encyclopedia={
   query:{pages:{
     '5380129':{pageid:5380129,title:'Derveni papyrus',
       extract:'The Derveni papyrus is an ancient Greek document recovered near Thessaloniki in 1962. '+('It is a philosophical document connected to Orphic religious tradition and has been studied as archaeological evidence. ').repeat(8)},
     '70639759':{pageid:70639759,title:'Discovery of the tomb of Tutankhamun',
       extract:'Tutankhamun’s tomb was discovered in 1922 by the archaeologist Howard Carter in Egypt’s Valley of the Kings. '+('Its unusual survival gave historians and archaeologists important evidence about ancient Egyptian burial customs. ').repeat(8)}
   }}
 };
 const fakeFetch=async url=>{
   const href=String(url);requests.push(href);
   if(href.includes('orange-brook'))return {ok:false,status:500};
   if(href.includes('en.wikipedia.org/w/api.php'))return {ok:true,json:async()=>encyclopedia};
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
