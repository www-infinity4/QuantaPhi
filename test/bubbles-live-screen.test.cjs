const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const web=fs.readFileSync('bubbles-ai.js','utf8');
const functions=web.slice(web.indexOf('function screenSharingCommand('),web.indexOf('function nativeChatGPT('));
test('screen sharing has explicit start and stop commands without treating ordinary conversation as consent',()=>{
 const c={};vm.createContext(c);vm.runInContext(functions,c);
 assert.equal(c.screenSharingCommand('start screen sharing'),1);
 assert.equal(c.screenSharingCommand('watch my screen'),1);
 assert.equal(c.screenSharingCommand('stop screen sharing'),-1);
 assert.equal(c.screenSharingCommand('what is on the screen?'),0);
});
test('page observation changes after scrolling, includes bottom content, and excludes editable fields',()=>{
 let viewport=0;
 function node(text,top,excluded=false){return {nodeValue:text,parentElement:{closest:()=>excluded,getClientRects:()=>[{top:top-viewport,bottom:top-viewport+20,width:200,height:20,right:200,left:0}]}};}
 const nodes=[node('Top card',0),node('Bottom card',1200),node('Secret input',1200,true)];
 const c={Date,NodeFilter:{SHOW_TEXT:4},document:{body:{},createTreeWalker:()=>{let i=0;return {nextNode:()=>nodes[i++]};}},panel:{contains:()=>false},launcher:{contains:()=>false},innerHeight:600,innerWidth:350,scrollY:0,getComputedStyle:()=>({visibility:'visible',display:'block',opacity:'1'})};
 vm.createContext(c);vm.runInContext(functions,c);
 const top=c.readCurrentPage();assert.match(top,/Top card/);assert.doesNotMatch(top,/Bottom card/);
 viewport=1000;c.scrollY=1000;
 const bottom=c.readCurrentPage();assert.match(bottom,/Bottom card/);assert.match(bottom,/scrollY=1000/);assert.doesNotMatch(bottom,/Top card|Secret input/);
});

test('only current-article research requires Android screen evidence',()=>{
 const c={};vm.createContext(c);vm.runInContext(functions,c);
 assert.equal(c.articleNeedsScreen("Research the story I'm looking at"),true);
 assert.equal(c.articleNeedsScreen("Research this article"),true);
 assert.equal(c.articleNeedsScreen("Research the RadioShack history article"),false);
});

// These phrases previously bypassed Android and received a text-only response.
test('conversational screen questions and actions request Android evidence',()=>{
 const c={};vm.createContext(c);vm.runInContext(functions,c);
 for(const q of ['Can you see my screen?', 'Could you read this page?', 'Please look at my screen', 'Can you tap the Search button?', 'scroll down']) assert.equal(c.requestsScreen(q),true,q);
 for(const q of ['Tell me about Mozart','I bought a new phone','Research the RadioShack history article']) assert.equal(c.requestsScreen(q),false,q);
});
