/* Oracle top viewer: MOVE original live card, never clone its event handlers.
 * Every interactive widget stays in the DOM at its original anchor.
 * No wallet, remote script, recording or conversation is fabricated. */
(function(){
'use strict';
const host=document.getElementById('oracleCardDeck'),stage=document.getElementById('oracleCardStage');
if(!host||!stage)return;
const now=document.getElementById('oracleCardNow'),status=document.getElementById('oracleCardStatus'),
 next=document.getElementById('oracleCardNext'),prev=document.getElementById('oracleCardPrevious'),scroll=document.getElementById('oracleCardScroll');
const choices=[
 ['infiniteBook','Read an original story'],
 ['phiChannelCards','Watch a channel'],
 ['phiStoryWriter','Write a story'],
 ['bubblesAICard','Talk to Bubbles'],
 ['phiMediaBuilder','Create images and video'],
 ['result','Explore research and Asteroid'],
 ['fredSpacesRadio','Listen to Media Star'],
 ['followingSpacesRadio','Explore radio shows'],
 ['magooSpacesRadio','Hear featured episodes'],
 ['mediaStarCreator','Build your media card'],
 ['infinityConcepts','Explore ideas'],
 ['groupStoryBuild','Build a group story'],
 ['radioClubhouse','Listen and research'],
 ['halloweenPhi','Watch a cinema'],
 ['phiProjectActions','Build a website'],
 ['shopAdPhi','Discover products'],
 ['phiChannelCards','Watch live television'],
 ['publicCardTrends','Explore what is trending']
];
const unique=[...new Map(choices.map(([id,title])=>[id,title])).entries()];
const entries=unique.map(([id,title])=>({id,title,node:document.getElementById(id),marker:null,count:0})).filter(x=>x.node);
const STORE='oracle:card-activity:v1';
let counts={};try{counts=JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch{}
entries.forEach(x=>x.count=Math.max(0,Math.min(1000,Number(counts[x.id])||0)));
let active=null,expanded=false;
function available(entry){
 if(!entry?.node)return false;
 if(entry.node.hidden)return false;
 if(entry.id==='infiniteBook'&&entry.node.querySelector('.ib-story')===null)return false;
 // Root components can be empty until their asynchronous scripts finish.
 return entry.node.children.length>0;
}
function order(){return entries.filter(available).sort((a,b)=>b.count-a.count||entries.indexOf(a)-entries.indexOf(b))}
function returnActive(){
 if(!active)return;
 const {node,marker}=active;
 if(marker?.parentNode){marker.parentNode.insertBefore(node,marker);marker.remove()}
 active.marker=null;active=null;
 stage.replaceChildren();
}
function show(entry){
 if(!entry||expanded||entry===active)return;
 returnActive();
 // Preserve exactly one original node and every listener, media control and data store.
 const marker=document.createComment('Oracle card original location: '+entry.id);
 entry.node.parentNode.insertBefore(marker,entry.node);entry.marker=marker;
 stage.append(entry.node);active=entry;
 entry.count=Math.min(1000,entry.count+1);counts[entry.id]=entry.count;
 try{localStorage.setItem(STORE,JSON.stringify(counts))}catch{}
 now.textContent=entry.title;
 status.textContent='Live interactive card · '+entry.title+'. Flip to another card or open the full widget shelf below.';
}
function advance(direction){
 const list=order();if(!list.length){status.textContent='The cards are still initializing. They remain available below.';return}
 const i=active?list.indexOf(active):-1;
 show(list[(i+direction+list.length)%list.length]);
}
next.addEventListener('click',()=>advance(1));
prev.addEventListener('click',()=>advance(-1));
scroll.addEventListener('click',()=>{
 expanded=!expanded;
 document.body.classList.toggle('oracle-shelf-open',expanded);
 scroll.setAttribute('aria-expanded',String(expanded));
 if(expanded){
   returnActive();
   scroll.textContent='↑ Return to top interactive viewer';
   now.textContent='All interactive cards below';
   status.textContent='All cards are open for scrolling. The original controls and state are preserved.';
   document.getElementById('infiniteBook')?.scrollIntoView?.({block:'start',behavior:'smooth'});
 }else{
   scroll.textContent='↓ Scroll interactive cards / widgets';
   show(order()[0]);
   host.scrollIntoView?.({block:'start',behavior:'smooth'});
 }
});
host.addEventListener('click',e=>{
 const node=e.target.closest?.('[id]');const entry=node&&entries.find(x=>x.id===node.id);
 if(!entry)return;
 counts[entry.id]=Math.min(1000,(counts[entry.id]||0)+1);
},true);
document.body.classList.add('oracle-card-deck-active');
function start(){if(!active&&!expanded){const first=order()[0];if(first)show(first);else status.textContent='Loading original interactive cards…';}}
start();
const observe=new MutationObserver(()=>{if(!active)start();});
for(const entry of entries)observe.observe(entry.node,{childList:true,subtree:false});
document.addEventListener('visibilitychange',()=>{
 // Explicit content/recording is never restarted automatically on resume.
 if(!document.hidden)start();
});
window.addEventListener('quantaphi:search-start',()=>{
 // Search can reparent the original Asteroid card. Keep its own placement
 // authority instead of competing with the live result renderer.
 if(active?.id==='infiniteBook')returnActive();
});
})();
