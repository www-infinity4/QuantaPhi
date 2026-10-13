/* QuantaPhi Oracle Octaves channel cards. Uses the existing in-page site viewer. */
(function(){
'use strict';
const host=document.getElementById('phiChannelCards');if(!host)return;
const channels=[
 {name:'StarQuest',eyebrow:'INFINITY TV · CHANNEL HUB',description:'Your StarQuest television guide, viewing room and station choices.',path:'/TV-Database/',label:'Enter StarQuest',icon:'SQ',tone:'starquest'},
 {name:'HBO',eyebrow:'MOVIE CHANNEL · VIEWING ROOM',description:'Open the independent HBO channel guide and watch available original-host videos.',path:'/HBO/',label:'Enter HBO',icon:'H',tone:'hbo'},
 {name:'Chiller',eyebrow:'1980s SUSPENSE · CHANNEL',description:'Alfred Hitchcock Presents and The Twilight Zone 1980s revival scheduling, with source-host playback.',path:'/Chiller/',label:'Watch Chiller',icon:'C',tone:'chiller'},
 {name:'ShopLC',eyebrow:'LIVE SHOPPING · CHANNEL',description:'Watch the Shop LC live companion and browse the original merchant’s offers and auctions.',path:'/shoplc/',label:'Watch ShopLC',icon:'LC',tone:'shoplc'}
];
const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const head=host.appendChild(el('div','channelphi-heading'));
head.append(el('span','channelphi-kicker','INFINITY 2026® · ORACLE OCTAVES'));
head.append(el('h2',null,'StarQuest · TV Channels'));
head.append(el('p',null,'Four channel cards are now on QuantaPhi. Open them in the built-in viewer without leaving your search.'));
const grid=host.appendChild(el('div','channelphi-grid'));
for(const c of channels){
 const card=grid.appendChild(el('article','channelphi-card channelphi-'+c.tone));
 card.setAttribute('aria-label',c.name+' channel');
 const mast=card.appendChild(el('div','channelphi-mast'));
 mast.append(el('span','channelphi-monogram',c.icon));
 const title=mast.appendChild(el('div','channelphi-name'));
 title.append(el('span','channelphi-kicker',c.eyebrow),el('h3',null,c.name));
 card.append(el('p','channelphi-description',c.description));
 const actions=card.appendChild(el('div','channelphi-actions'));
 const inside=actions.appendChild(el('a','channelphi-enter inPageSite',c.label+' ▶'));
 inside.href=c.path;inside.dataset.siteUrl=c.path;inside.dataset.siteTitle=c.name+' Channel';
 inside.setAttribute('aria-label','Open '+c.name+' inside QuantaPhi');
 const outside=actions.appendChild(el('a','channelphi-external','Full page ↗'));
 outside.href=c.path;outside.target='_blank';outside.rel='noopener noreferrer';outside.setAttribute('aria-label','Open '+c.name+' in a new tab');
}
host.append(el('p','channelphi-foot','Channel playback comes from each source’s authorized player. If a provider blocks an embedded video, use Full page to open its original viewing room. These are independent channel interfaces, not official premium-service subscriptions.'));
})();