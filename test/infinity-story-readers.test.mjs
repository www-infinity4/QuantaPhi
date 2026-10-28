import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {READER_CHANNELS,channelById,CHANNEL_IDS} from '../infinity-story-channels-data.mjs';
import {nextUnseen,wikipediaResults,gutenbergResults,trustedStorySource} from '../infinity-story-channels.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=file('index.html'),deck=file('oracle-card-deck.js'),catalog=file('bubbles-card-catalog.mjs'),module=file('infinity-story-channels.mjs');
test('six distinct Infinity reader cards are registered in the live Oracle carousel and Bubbles catalog',()=>{
 assert.equal(READER_CHANNELS.length,6);assert.equal(new Set(CHANNEL_IDS).size,6);
 for(const c of READER_CHANNELS){
  assert.ok(c.title.length>5&&c.subtitle.length>15);
  assert.ok(c.seeds.length>=2,c.id+' needs a real readable starting story');
  assert.ok(c.terms.length>=8,c.id+' needs enough discovery breadth');
  assert.equal(channelById(c.id),c);
  assert.ok(deck.includes(c.mount),'Oracle card missing '+c.mount);
  assert.ok(catalog.includes('/?card='+c.mount),'Bubbles card missing '+c.mount);
 }
 assert.match(html,/id="infinityStoryChannels" hidden/);
 assert.match(html,/infinity-story-channels\.mjs/);
 assert.match(html,/infinity-story-channels\.css/);
 assert.match(file('infinity-readers.html'),/Six worlds/);
});
test('seeds are complete original story passages or credited factual summaries',()=>{
 const keys=[];
 for(const c of READER_CHANNELS)for(const x of c.seeds){
  keys.push(x.id);
  assert.ok(x.title.length>=10);
  assert.ok(x.body.length>=3,x.id+' story must have 3+ complete paragraphs');
  assert.ok(x.body.join(' ').length>250,x.id+' content must be long-form enough to read');
  assert.ok(['original','editorial'].includes(x.kind));
  if(x.kind==='editorial')assert.ok(trustedStorySource(x.source));
 }
 assert.equal(new Set(keys).size,keys.length,'story IDs must never collide');
 assert.match(channelById('twilight').disclaimer,/Not affiliated/);
});
test('seen-first rotation never repeats an existing source while new selections remain',()=>{
 const pool=[{id:'s1'},{id:'s2'},{id:'s3'}],seen=['s1'];
 assert.equal(nextUnseen(pool,seen).id,'s2');
 seen.push('s2');assert.equal(nextUnseen(pool,seen).id,'s3');
 seen.push('s3');assert.equal(nextUnseen(pool,seen),null);
});
test('Wikipedia excerpts must be attributable, properly sourced and exclude unrelated hosts',()=>{
 const r=wikipediaResults({query:{pages:[
  {ns:0,pageid:41,title:'True subject',fullurl:'https://en.wikipedia.org/wiki/True_subject',extract:'Real historic source. '.repeat(24)},
  {ns:0,pageid:42,title:'Unrelated',fullurl:'https://evil.example/attack',extract:'Unverified source. '.repeat(30)},
  {ns:1,pageid:43,title:'Talk page',fullurl:'https://en.wikipedia.org/wiki/Talk',extract:'History. '.repeat(50)}
 ]}});
 assert.equal(r.length,1);
 assert.equal(r[0].id,'wp:41');
 assert.match(r[0].license,/CC BY-SA/);
 assert.match(r[0].source,/en.wikipedia.org/);
 assert.ok(r[0].body[0].length>160);
});
test('Gutenberg book candidates require public domain in U.S. plus English and verified IDs',()=>{
 const books=gutenbergResults({results:[
 {id:1,title:'Public domain mystery',copyright:false,languages:['en'],authors:[{name:'Writer'}],summaries:['A long description of a mystery book']},
 {id:2,title:'Protected novel',copyright:true,languages:['en'],summaries:['Description']},
 {id:3,title:'Uncertain status',copyright:null,languages:['en'],summaries:['Description']},
 {id:4,title:'Foreign-language only',copyright:false,languages:['fr'],summaries:['Description']}
 ]});
 assert.equal(books.length,1);assert.equal(books[0].id,'pg:1');
 assert.match(books[0].source,/gutenberg.org\/ebooks\/1/);
 assert.match(books[0].license,/public domain/);
 assert.match(module,/source links/);
});
test('no fake Infinity currency minting, invented author credentials or television scripts',()=>{
 assert.doesNotMatch(module,/QuantaStarCredit\?\./);
 assert.doesNotMatch(module,/fetch\(.{0,120}openai\.com/i);
 assert.match(module,/No tokens minted/);
 assert.match(file('infinity-story-channels.css'),/prefers-reduced-motion/);
 assert.match(module,/reader\.addEventListener\('oracle:activate'/);
 assert.match(module,/touchend/);
});
