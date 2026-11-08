import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAGAZINE_READING_SOURCES,findMagazineSource,magazineStory,mountMagazineReader} from '../magazine-reading-quick-cards.mjs';
import {QUICK_CARD_SOURCES,PUBLIC_SOURCE_IDS,findSourceCard} from '../source-quick-cards.mjs';
import {feedCard} from '../quanta-feed.mjs';

test('three independent publisher reading cards appear in existing public deck and feed',()=>{
 assert.deepEqual(MAGAZINE_READING_SOURCES.map(c=>c.id),['easyriders-magazine','motorcycle-magazine','high-times-magazine']);
 assert.equal(new Set(MAGAZINE_READING_SOURCES.map(c=>c.id)).size,3);
 for(const c of MAGAZINE_READING_SOURCES){
  assert.equal(findMagazineSource(c.id),c);
  assert.equal(findSourceCard(c.id),c);
  assert.ok(QUICK_CARD_SOURCES.includes(c));
  assert.ok(PUBLIC_SOURCE_IDS.includes(c.id));
  assert.equal(feedCard(c.id)?.origin,'source');
  assert.equal(c.kind,'Magazine · Reading');
 }
});

test('each real story has a verified canonical publisher URL and an original bounded on-card summary',()=>{
 const domains={'easyriders-magazine':'easyriders.com','motorcycle-magazine':'www.motorcycle-magazine.com','high-times-magazine':'hightimes.com'};
 for(const c of MAGAZINE_READING_SOURCES){
  assert.equal(new URL(c.official).hostname,domains[c.id]);
  assert.ok(c.stories.length>=2);
  assert.ok(c.sourceCheckedAt);
  for(const story of c.stories){
   assert.equal(new URL(story.url).hostname,domains[c.id]);
   assert.match(story.title,/\S/);
   assert.match(story.author,/\S/);
   assert.match(story.category,/\S/);
   assert.match(story.date,/^2026-\d\d-\d\d$/);
   assert.ok(story.summary.length>=50&&story.summary.length<=380);
   assert.equal(magazineStory(c,story.id),story);
   assert.notEqual(story.summary,story.title);
  }
  assert.equal(magazineStory(c,'nonexistent'),null);
 }
 assert.equal(findMagazineSource('unknown'),null);
 assert.equal(magazineStory({id:'high-times-magazine',official:'https://evil.invalid'},'mushroom-jazz'),null);
});

test('in-card reader navigates the real stories, preserves external publisher destination and does not copy full articles',()=>{
 const old=globalThis.document;
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.events={};this.attributes={};this.textContent='';this.value='';}
  append(...children){this.children.push(...children);}
  addEventListener(event,callback){this.events[event]=callback;}
  setAttribute(name,value){this.attributes[name]=value;}
  click(){this.events.click?.();}
 }
 globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const card=MAGAZINE_READING_SOURCES[0],root=new Element('div');
  assert.equal(mountMagazineReader(root,{...card,official:'https://attacker.invalid'}),false);
  assert.equal(root.children.length,0);
  assert.equal(mountMagazineReader(root,card),true);
  assert.equal(root.children.length,1);
  const all=(node)=>[node,...node.children.flatMap(all)];
  const nodes=all(root);
  const articles=nodes.filter(n=>n.tagName==='article');
  const next=nodes.find(n=>n.tagName==='button'&&n.textContent==='Next story');
  const prev=nodes.find(n=>n.tagName==='button'&&n.textContent==='Previous story');
  const link=nodes.find(n=>n.tagName==='a');
  assert.equal(articles.length,1);
  assert.equal(link.href,card.stories[0].url);
  assert.equal(link.rel,'noopener noreferrer');
  assert.equal(articles[0].textContent,'');
  next.click();
  assert.equal(link.href,card.stories[1].url);
  prev.click();
  assert.equal(link.href,card.stories[0].url);
  assert.equal(articles[0].children.some(n=>n.textContent===card.stories[0].summary),true);
 }finally{globalThis.document=old;}
 const src=readFileSync(new URL('../magazine-reading-quick-cards.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(src,/fetch\s*\(|innerHTML|DOMParser|\biframe\b|document\.cookie|localStorage/);
 const tools=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
 assert.match(tools,/mountMagazineReader\(root,card\)/);
 const css=readFileSync(new URL('../quanta-card-experience.css',import.meta.url),'utf8');
 assert.match(css,/qcx-magazine-reader/);
});
