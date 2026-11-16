import {liveNewsEmbed} from './live-tv-state.mjs?v=20261102-player1';
// All FOX cards are a single media screen. Only LiveNOW has an approved
// third-party embedded player; other FOX channels retain honest source links.
const node=(tag,klass,content)=>{const e=document.createElement(tag);if(klass)e.className=klass;if(content!==undefined)e.textContent=content;return e};
export const FOX_CHANNELS=Object.freeze([
 {key:'live-now',title:'LiveNOW from FOX',kind:'LIVE NEWS',url:'https://www.livenowfox.com/live',poster:'https://i.ytimg.com/vi/qoytj8mNq7s/hqdefault.jpg',embed:true},
 {key:'fox-one',title:'FOX One',kind:'TV & ENTERTAINMENT',url:'https://www.fox.com/',poster:'https://www.fox.com/favicon.ico',embed:false},
 {key:'fox-sports',title:'FOX Sports',kind:'SPORTS',url:'https://www.foxsports.com/',poster:'https://www.foxsports.com/favicon.ico',embed:false},
 {key:'fox-news',title:'FOX News',kind:'NEWS',url:'https://www.foxnews.com/',poster:'https://www.foxnews.com/favicon.ico',embed:false}
]);
function makeScreen(c,root){
 const screen=node('div','fit-fox-screen');
 const trigger=node(c.embed?'button':'a','fit-fox-poster');
 trigger.setAttribute('aria-label',c.embed?'Play '+c.title+' video':'Watch '+c.title+' at official publisher');
 if(c.embed)trigger.type='button';
 else {trigger.href=c.url;trigger.target='_blank';trigger.rel='noopener noreferrer'}
 const img=node('img','fit-fox-art'+(c.embed?'':' fit-fox-icon'));
 img.src=c.poster;img.alt='';img.width=1280;img.height=720;img.loading='eager';img.decoding='async';
 img.addEventListener('error',()=>img.classList.add('fit-fox-image-failed'),{once:true});
 trigger.append(img,node('span','fit-fox-play','▶'),node('strong','fit-fox-label',c.embed?'Watch live news':'Watch at '+c.title));
 screen.append(trigger);
 let frame=null;
 function stop(){
  if(frame){frame.src='about:blank';frame.remove();frame=null}
  trigger.hidden=false;
 }
 if(c.embed)trigger.addEventListener('click',()=>{
  if(frame)return;
  document.dispatchEvent(new CustomEvent('quantaphi:tv-playback-request',{detail:{owner:root.id||'fox-'+c.key}}));
  frame=node('iframe','fit-fox-frame');frame.title=c.title+' video player only';
  frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';frame.loading='eager';
  frame.src=liveNewsEmbed(location.origin);screen.append(frame);trigger.hidden=true;
 });
 document.addEventListener('quantaphi:tv-playback-request',event=>{
  if(event.detail?.owner!==(root.id||'fox-'+c.key))stop();
 });
 document.addEventListener('oracle:card-deactivated',event=>{
  if(event.detail?.id==='phiChannelCards'||event.detail?.id===root.id)stop();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop,{once:true});
 return {screen,stop};
}
export function mountFoxViewer(root,{compact=false,channel='live-now'}={}){
 if(!root)return null;
 const selected=FOX_CHANNELS.find(c=>c.key===channel)||FOX_CHANNELS[0];
 root.replaceChildren();root.classList.add('fit-viewer');if(compact)root.classList.add('fit-compact');
 const header=node('header','fit-header');
 header.append(node('small','fit-kicker','FOX · '+selected.kind),node(compact?'h3':'h1','',selected.title));
 const {screen,stop}=makeScreen(selected,root);
 root.append(header,screen);
 if(!selected.embed)root.append(node('p','fit-hint','This channel does not supply a verified embeddable live player. The screen opens the official broadcaster.'));
 return {root,stop,channel:selected.key};
}
function mountFoxTvWall(){
 const grid=document.querySelector('#phiChannelCards .channelphi-grid');
 if(!grid||grid.querySelector('.channelphi-fox-one'))return;
 for(const channel of FOX_CHANNELS){
  const card=node('article','channelphi-card channelphi-fox-one');
  card.id='fox-tv-'+channel.key;card.dataset.foxChannel=channel.key;
  mountFoxViewer(card,{compact:true,channel:channel.key});grid.append(card);
 }
}
if(typeof document!=='undefined'){
 const ready=()=>{
  mountFoxTvWall();
  const root=document.getElementById('foxInfinityViewer');
  if(root)mountFoxViewer(root,{channel:new URLSearchParams(location.search).get('channel')||'live-now'});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
