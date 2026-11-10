import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {normalizeStoryPage,storyStep,storySwipe,chooseContextualStories} from '../shopphi-story-core.mjs';
const source=readFileSync(new URL('../oracle-age-preference.js',import.meta.url),'utf8');
function policy(){const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};const sandbox={window:{},localStorage:storage};vm.runInNewContext(source,sandbox);return {p:sandbox.window.QuantaAgePreferences,data};}
const ordinary={id:'web-phi',title:'Web developer',category:'Developer'};
const adult={id:'dispensary-sample',title:'21+ source',category:'21+ Directory'};
const pref={id:'infinityAdultContentCard',title:'Content preferences'};
test('skipping the 21+ category persists and prevents any automatic adult card',()=>{
 const {p}=policy();
 assert.equal(p.canAutoShow(adult),false);
 p.noteSkipped();
 assert.equal(p.read().skipped,true);
 p.acknowledgeBrowse();
 assert.equal(p.read().skipped,false);
 p.noteSkipped();
 assert.equal(p.canAutoShow(pref),false);
});
test('deliberate 21+ acknowledgement is a browsing preference, not age or ad verification',()=>{
 const {p}=policy();
 p.acknowledgeBrowse();
 for(let i=0;i<9;i++)p.noteShown(ordinary);
 assert.equal(p.canAutoShow(adult),false);
 p.noteShown(ordinary);
 assert.equal(p.canAutoShow(adult),true);
 p.noteShown(adult);
 assert.equal(p.canAutoShow(adult),false);
 assert.equal(p.read().ageVerified,undefined);
});
test('without opt-in a neutral preference card appears sparingly, never actual adult products',()=>{
 const {p}=policy();for(let i=0;i<12;i++)p.noteShown(ordinary);
 assert.equal(p.canAutoShow(pref),true);
 assert.equal(p.canAutoShow(adult),false);
});
test('approved six-image card plays all six once before starting next verified card',()=>{
 const make=(id,n)=>({id,title:'Ad '+id,url:'https://example.org/'+id,type:'published-card',status:'approved',images:Array.from({length:n},(_,i)=>'https://example.org/'+id+'-'+i+'.jpg')});
 const pages=[normalizeStoryPage(make('one',6)),normalizeStoryPage(make('two',3))];
 assert.equal(pages[0].images.length,6);
 let index={card:0,slide:0,done:false};
 for(let i=0;i<5;i++){index=storyStep(pages,index,1);assert.deepEqual(index,{card:0,slide:i+1,done:false});}
 index=storyStep(pages,index,1);assert.deepEqual(index,{card:1,slide:0,done:false});
 for(let i=0;i<3;i++)index=storyStep(pages,index,1);
 assert.equal(index.done,true);assert.equal(index.card,1);assert.equal(index.slide,2);
});
test('no missing image is manufactured, pending publisher and adult commerce are held',()=>{
 assert.equal(normalizeStoryPage({type:'published-card',status:'pending',title:'X',url:'https://example.org',image:'https://example.org/img.png'}),null);
 assert.equal(normalizeStoryPage({id:'abc',type:'sponsored',status:'approved',title:'X',url:'https://example.org',image:'https://example.org/img.png'}),null);
 assert.equal(normalizeStoryPage({id:'adult',type:'published-card',status:'approved',category:'Cannabis',title:'X',url:'https://example.org',image:'https://example.org/img.png'}),null);
 const one=normalizeStoryPage({id:'one',title:'One',type:'published-card',status:'approved',url:'https://example.org/',image:'https://example.org/one.jpg'});
 assert.equal(one.images.length,1);
});
test('left and right swipes must be intentional and not on interactive controls',()=>{
 assert.equal(storySwipe(-120,18,false),'next');
 assert.equal(storySwipe(135,0,false),'previous');
 assert.equal(storySwipe(-30,5,false),null);
 assert.equal(storySwipe(-120,90,false),null);
 assert.equal(storySwipe(-120,0,true),null);
});
test('recommendations require source context and never classify an adult scene as an ad trigger',()=>{
 const candidates=[
  {id:'travel',title:'Tropical travel',category:'Travel',type:'published-card',status:'approved',image:'https://example.org/travel.jpg',url:'https://example.org/travel',images:[]},
  {id:'code',title:'Syntax error fixer for developers',category:'Developer',type:'published-card',status:'approved',image:'https://example.org/code.jpg',url:'https://example.org/code'}
 ];
 assert.equal(chooseContextualStories({title:'Miami Vice',category:'Movies'},candidates).some(x=>x.id==='travel'),true);
 assert.equal(chooseContextualStories({title:'Syntax error',category:'Developer tools'},candidates).some(x=>x.id==='code'),true);
 assert.deepEqual(chooseContextualStories({title:'Cigar scene',category:'21+ movie'},candidates),[]);
});
