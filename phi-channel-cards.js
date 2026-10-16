/* Oracle Octaves: one inline Omni TV remote in each tapped channel window.
 * Never pre-loads media; only one channel can stream at a time. */
(function(){
'use strict';
const host=document.getElementById('phiChannelCards');if(!host)return;
const channels=[
 {name:'StarQuest',eyebrow:'CLASSIC TV · STARQUEST',description:'Classic shows and the StarQuest guide in the shared TV remote.',tune:'TV-Database',poster:'/TV-Database/assets/starquest-share-card.jpg',icon:'SQ',tone:'starquest'},
 {name:'Omni TV',eyebrow:'ALL CHANNELS · ONE REMOTE',description:'Surf the entire network here with channel up and down controls.',tune:'ShopLC',poster:'/omni-tv/preview.png',icon:'TV',tone:'omni'},
 {name:'Chiller',eyebrow:'1980s SUSPENSE · ON AIR',description:'The Hitchcock and Twilight Zone channel, tuned to its current program.',tune:'Chiller',poster:'https://i.ytimg.com/vi/YD5xBeGeX5w/hqdefault.jpg',icon:'C',tone:'chiller'},
 {name:'ShopLC',eyebrow:'SHOPPING TV · LIVE FEED',description:'Tap the show window to watch the live shopping channel in place.',tune:'ShopLC',poster:'https://i.ytimg.com/vi/eqpG55UKM8M/hqdefault.jpg',icon:'LC',tone:'shoplc'}
];
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const heading=host.appendChild(el('div','channelphi-heading'));
heading.append(el('span','channelphi-kicker','INFINITY 2026® · ORACLE OCTAVES'),el('h2',null,'Watch · Infinity Channels'),el('p',null,'Tap a show window to tune it here. All four use the Omni TV remote; CH− and CH+ change stations without opening another viewer.'));
const grid=host.appendChild(el('div','channelphi-grid'));
let active=null;
function stop(){
 if(!active)return;
 // Removing the iframe stops video and audio before a new station starts.
 active.viewer.replaceChildren();
 active.viewer.hidden=true;
 active.screen.hidden=false;
 active.screen.setAttribute('aria-expanded','false');
 active.card.classList.remove('channelphi-playing');
 active.status.textContent='Ready to tune';
 active=null;
}
for(const c of channels){
 const card=grid.appendChild(el('article','channelphi-card channelphi-'+c.tone));
 card.setAttribute('aria-label',c.name+' channel');
 const mast=card.appendChild(el('div','channelphi-mast'));
 mast.append(el('span','channelphi-monogram',c.icon));
 const title=mast.appendChild(el('div','channelphi-name'));
 title.append(el('span','channelphi-kicker',c.eyebrow),el('h3',null,c.name));
 card.append(el('p','channelphi-description',c.description));
 const screen=card.appendChild(el('button','channelphi-screen'));
 screen.type='button';screen.setAttribute('aria-label','Play '+c.name+' in this card');
 screen.setAttribute('aria-expanded','false');
 const image=screen.appendChild(el('img','channelphi-art'));image.src=c.poster;image.alt='';image.loading='lazy';
 const shade=screen.appendChild(el('span','channelphi-screen-label'));
 shade.append(el('span','channelphi-play-icon','▶'),el('strong',null,'Tap to watch '+c.name));
 const viewer=card.appendChild(el('div','channelphi-viewer'));viewer.hidden=true;
 const status=viewer.appendChild(el('p','channelphi-status','Ready to tune'));status.setAttribute('role','status');
 const controls=viewer.appendChild(el('div','channelphi-controls'));
 const close=controls.appendChild(el('button','channelphi-stop','■ Stop and close player'));close.type='button';
 const hint=controls.appendChild(el('span','channelphi-hint','Use CH− / CH+ inside the player to surf. Tap again for sound if required.'));
 screen.addEventListener('click',()=>{
   stop();
   screen.hidden=true;screen.setAttribute('aria-expanded','true');
   viewer.hidden=false;card.classList.add('channelphi-playing');
   const frame=el('iframe','channelphi-frame');
   frame.title='Omni TV player — '+c.name;
   frame.loading='eager';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
   frame.allowFullscreen=true;
   frame.referrerPolicy='strict-origin-when-cross-origin';
   frame.src='/omni-tv/?embedded=1#'+encodeURIComponent(c.tune);
   viewer.insertBefore(frame,status);
   status.textContent='Tuning '+c.name+' using the Omni TV remote…';
   active={card,screen,viewer,status};
 });
 close.addEventListener('click',()=>{stop();screen.focus()});
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
host.append(el('p','channelphi-foot','Only a tapped station is loaded. Live programs and sound depend on each original source and browser autoplay permissions; some stations ask for one more play tap. No premium subscription access is implied.'));
})();