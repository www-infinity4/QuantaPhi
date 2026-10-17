import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {cards,cardIntent,findCard} from '../bubbles-card-catalog.mjs';
import {CardWorkspace} from '../bubbles-card-workspace.mjs';
test('natural card requests resolve before job routing and never turn refusals into playback',()=>{
 for(const request of ['I want to hear infinity radio','Bubbles, play Infinity Radio','Can you listen to Infinity Radio?']){
  const intent=cardIntent(request);assert.equal(intent.action,'play');assert.equal(intent.card.repository,'www-infinity4/Alien-Radio');
 }
 assert.equal(cardIntent('do not play Infinity Radio'),null);
 assert.equal(cardIntent('fix Infinity Radio'),null);
 assert.equal(cardIntent('open https://example.com'),null);
 assert.equal(cardIntent('inspect this card').action,'diagnose');
 assert.equal(cardIntent('pull in Story Writer card into chat').card.id,'story-writer');
});
test('every locally registered card asset exists and catalog IDs are unique',()=>{
 assert.equal(new Set(cards.map(card=>card.id)).size,cards.length);
 for(const card of cards){
  assert.match(card.repository,/^www-infinity4\/[\w.-]+$/);
  assert.ok(card.url.startsWith('/')&&!card.url.startsWith('//'));
  for(const file of [...(card.scripts||[]),...(card.styles||[])])assert.ok(existsSync(file),file);
 }
});
function dom(){
 const media=[];
 class Media{
  constructor(){this.paused=true;this.ended=false;this.currentTime=0;this.readyState=4;this.listeners={};media.push(this);}
  addEventListener(name,callback){this.listeners[name]=callback;}
  play(){this.paused=false;queueMicrotask(()=>this.listeners.playing?.());return Promise.resolve();}
  pause(){this.paused=true;}
 }
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.hidden=false;this.parentNode=null;this.attributes={};}
  setAttribute(key,value){this.attributes[key]=value;}
  append(...nodes){for(const node of nodes){this.children.push(node);node.parentNode=this;if(node.tag==='iframe')queueMicrotask(()=>node.listeners.load?.());}}
  addEventListener(name,callback){this.listeners[name]=callback;}
  querySelector(){return null;}
  remove(){this.parentNode=null;}
 }
 const playButton={textContent:'Play',click(){new Media().play();}};
 const frameDoc={querySelector:selector=>selector==='#play-btn'?playButton:null,querySelectorAll:selector=>selector==='audio,video'?[]:[{textContent:'Play',getAttribute:()=>null,disabled:false}]};
 globalThis.document={createElement:tag=>{const node=new Node(tag);if(tag==='iframe'){node.contentDocument=frameDoc;node.contentWindow={location:{origin:'https://quantaphi.org'},HTMLMediaElement:Media,document:frameDoc,addEventListener(){}};}return node;}};
 globalThis.location={origin:'https://quantaphi.org'};
 return {Node,media};
}
test('radio opens in chat, invokes its actual play control and reports observed media state',async()=>{
 const {Node,media}=dom();let evidence;
 try{
  const workspace=new CardWorkspace(new Node('section'),value=>{evidence=value;});
  const result=await workspace.handle({action:'play',card:findCard('Infinity Radio')});
  assert.match(result.message,/Playback requested/);
  await Promise.resolve();
  const diagnostics=workspace.diagnose();
  assert.equal(diagnostics.snapshot.repository,'www-infinity4/Alien-Radio');
  assert.equal(diagnostics.snapshot.playback[0].paused,false);
  assert.equal(evidence.cardId,'infinity-radio');
  const frame=workspace.active.frame;
  workspace.close();assert.equal(media[0].paused,true);
  await workspace.open(findCard('Infinity Radio'),false);
  assert.equal(workspace.active.frame,frame);
  assert.equal(workspace.stage.children.length,1);
 }finally{delete globalThis.document;delete globalThis.location;}
});

test('Media Star commands resolve to the real player and person picker, not the blank creator',()=>{
 const player=findCard('Media Star');
 assert.equal(player.id,'media-star');
 assert.equal(player.mount,'fredSpacesRadio');
 assert.deepEqual(player.extraMounts,['followingSpacesRadio']);
 assert.ok(player.scripts.includes('fred-spaces-radio.js'));
 assert.ok(player.scripts.includes('following-spaces-radio.js'));
 assert.equal(findCard('Media Star Creator').mount,'mediaStarCreator');
 const open=[
  'Media Star card',
  'Media Star',
  'I want the Media Star card',
  'Bubbles, show me Media Star card in chat',
  'Can you bring up the Media Star card?',
  'Bring in the Media Star card into chat',
  'Pull up Media Star',
  'Show me the Media Star player',
  'Give me Media Star, please',
  'Please open Media Star card'
 ];
 for(const phrase of open){
  const intent=cardIntent(phrase);
  assert.equal(intent?.action,'open',phrase);
  assert.equal(intent.card.id,'media-star',phrase);
 }
 for(const phrase of ['Play the Media Star card','I want to hear Infinity Radio','Can you listen to Infinity Radio?']){
  assert.equal(cardIntent(phrase)?.action,'play',phrase);
 }
 for(const phrase of [
  'Do not open Media Star',
  'Fix the Media Star card',
  'Can you repair Media Star?',
  'What is Media Star?',
  'Build a Media Star app',
  'Explain the Media Star card'
 ]){
  assert.equal(cardIntent(phrase),null,phrase);
 }
});
