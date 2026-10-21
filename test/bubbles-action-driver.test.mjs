import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveToolAction,cardControlDecision,safeCardControls,toolReply} from '../bubbles-action-driver.mjs';
import {CardWorkspace} from '../bubbles-card-workspace.mjs';
import {findCard} from '../bubbles-card-catalog.mjs';

test('natural owner phone instructions are translated into existing, numbered and authenticated tools',()=>{
 const cases=[
  ['Bubbles read my phone screen','phone read'],
  ['Please show my Android screen','phone read'],
  ['tap 8 on my phone','phone tap 8'],
  ['Bubbles, press button 14 on the Android screen','phone tap 14'],
  ['type "Hello, Gemini" into field 4 on my phone','phone type 4: Hello, Gemini'],
  ['check phone tool status','phone status']
 ];
 for(const [utterance,command] of cases)
  assert.deepEqual(resolveToolAction(utterance),{kind:'phone',command},utterance);
 for(const phrase of ["don't tap 8 on my phone","how can I tap 8 on my phone?","what is my phone screen resolution?","tap somewhere on my phone"])
  assert.equal(resolveToolAction(phrase),null,'device actions must not be guessed: '+phrase);
});
test('browser and card taps require named targets; explicit safe commands return executable intents',()=>{
 const browser=resolveToolAction('Bubbles tap Watch in the cloud browser');
 assert.deepEqual(browser,{kind:'browser',command:'click "Watch" in the cloud browser'});
 assert.equal(resolveToolAction('tap approve in the cloud browser').kind,'blocked');
 assert.deepEqual(resolveToolAction('tap the Play button',{activeCard:'Infinity Radio'}),
  {kind:'card',label:'Play',cardName:'Infinity Radio'});
 assert.deepEqual(resolveToolAction('press Pause on Infinity Radio card'),
  {kind:'card',label:'Pause',cardName:'Infinity Radio'});
 assert.deepEqual(resolveToolAction('Bubbles tap Play on Media Star'),
  {kind:'card',label:'Play',cardName:'Media Star'});
 assert.equal(resolveToolAction('tap a random button'),null);
 assert.equal(resolveToolAction('how do I press Play on a card?'),null);
});
test('a screenshot, model text or foreign app cannot authorize clicking, and payments are never auto-clicked',()=>{
 const controls=[
  {label:'Play',tag:'BUTTON',visible:true,disabled:false,element:{click(){}}},
  {label:'Unlock next curated episode · 1 ★',tag:'BUTTON',visible:true,disabled:false,element:{click(){throw Error('must not be called')}}},
  {label:'Approve all owner jobs',tag:'BUTTON',visible:true,disabled:false,element:{click(){throw Error('must not be called')}}},
  {label:'Watch',tag:'A',visible:true,disabled:false,element:{click(){throw Error('must not be called')}}}
 ];
 assert.equal(cardControlDecision('Play',controls).status,'safe_click');
 assert.equal(cardControlDecision('Unlock next curated episode · 1 ★',controls).status,'manual_approval_required');
 assert.equal(cardControlDecision('Approve all owner jobs',controls).status,'manual_approval_required');
 assert.equal(cardControlDecision('Watch',controls).status,'external_link_requires_user_tap');
 assert.equal(cardControlDecision('Missing',controls).status,'control_not_found');
 assert.equal(cardControlDecision('Play',[controls[0],controls[0]]).status,'control_ambiguous');
 assert.match(toolReply({status:'safe_click',label:'Play',card:'Infinity Radio'}),/not yet verified/);
});
test('control enumeration follows a visible, enabled DOM element and returns its actual receipt',async()=>{
 let pressed=0;const button={
  tagName:'BUTTON',innerText:'Play',disabled:false,hidden:false,
  getAttribute(){return null},getClientRects(){return [{width:100}]},
  click(){pressed++}
 };
 const doc={
  querySelectorAll(selector){return selector.includes('[role="button"]')?[button]:[]},
  querySelector(){return null}
 };
 const controls=safeCardControls(doc);
 assert.equal(controls.length,1);
 assert.equal(controls[0].label,'Play');
 assert.equal(controls[0].visible,true);
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.hidden=false;this.listeners={};this.className='';this.parentNode=null;}
  append(...children){for(const child of children){this.children.push(child);child.parentNode=this;if(child.tag==='iframe')queueMicrotask(()=>child.listeners.load?.());}}
  addEventListener(name,cb){this.listeners[name]=cb}
  setAttribute(){}
  querySelector(){return null}
  remove(){this.parentNode=null}
 }
 class Media{play(){return Promise.resolve()}pause(){}}
 globalThis.location={origin:'https://quantaphi.org'};
 globalThis.document={createElement:tag=>{
  const el=new Node(tag);
  if(tag==='iframe'){
   el.contentDocument=doc;
   el.contentWindow={location:{origin:'https://quantaphi.org'},HTMLMediaElement:Media,document:doc,
    addEventListener(){},BubblesCardDiagnostics(){return{id:'infinity-radio',loaded:true,errors:[]}}};
  }
  return el;
 }};
 try{
  const workspace=new CardWorkspace(new Node('section'));
  await workspace.open(findCard('Infinity Radio'),false);
  const receipt=await workspace.pressControl('Play');
  assert.equal(receipt.status,'safe_click');
  assert.equal(pressed,1,'click must be issued on the real DOM control once');
  const missed=await workspace.pressControl('Delete all');
  assert.equal(missed.status,'manual_approval_required');
  assert.equal(pressed,1);
 }finally{delete globalThis.document;delete globalThis.location}
});
test('Bubbles chat executes adapter action before freeform model advice',()=>{
 const ui=readFileSync('bubbles-ai.js','utf8');
 const start=ui.indexOf(' // Plain-English actions are routed to actual registered UI/tool adapters.');
 const end=ui.indexOf(' // Resolve every spoken/typed turn against known cards first',start);
 const source=ui.slice(start,end);
 assert.ok(start>0&&end>start);
 for(const marker of ['resolveToolAction(spoken','phoneTools()).request(toolAction.command)','browser.browserConversation(toolAction.command','workspace.pressControl(toolAction.label)','messages.push('])
  assert.ok(source.includes(marker),marker);
 assert.ok(start<ui.indexOf(' // Resolve every spoken/typed turn against known cards first'));
 assert.ok(end<ui.indexOf(' // User-selected image is untrusted evidence'));
});

test('synthetic GitHub tool fixture was created, fetched and updated with no personal data',()=>{
 const receipt=JSON.parse(readFileSync('test/fixtures/bubbles-tool-execution-receipt.json','utf8'));
 assert.equal(receipt.stage,'created-read-updated');
 assert.deepEqual(receipt.verifiedOperations,['create','fetch','update']);
 assert.equal(receipt.privateData,false);
});
