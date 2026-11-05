/* Compact band selections feed one shared visible YouTube dock. Music taps
 * never launch other sites or create a player in each Oracle card. Official
 * merchandise links below remain voluntary external merchant actions. */
import {CLASSIC_ROCK_BANDS,linkIsAllowed} from './classic-rock-official-catalog.mjs';
const root = document.getElementById('classicRockOfficialMusicCard');
if(root && root.dataset.officialRockMounted!=='true'){
 root.dataset.officialRockMounted='true';
 root.classList.add('cr-official-card');

 const node=(tag,cls,text)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
 };
 const style=node('style');
 style.textContent=[
  '#classicRockOfficialMusicCard{display:block;box-sizing:border-box;margin:0;padding:16px;border:1px solid #c4d5d9;background:#f7faf9;color:#213640;border-radius:17px;font:inherit;}',
  '#classicRockOfficialMusicCard .cr-head{display:flex;gap:12px;align-items:center;margin:0 0 12px;}',
  '#classicRockOfficialMusicCard .cr-record{position:relative;flex:none;width:53px;height:53px;border:3px solid #d8e6e6;border-radius:50%;background:repeating-radial-gradient(circle,#141f28 0 5px,#293640 5px 6px);box-shadow:0 3px 10px #1112;}',
  '#classicRockOfficialMusicCard .cr-record:after{content:"∞";position:absolute;inset:15px;display:grid;place-items:center;border-radius:50%;background:#bbd5d5;color:#124854;font-size:13px;font-weight:900;}',
  '#classicRockOfficialMusicCard h2{margin:0;font-size:21px;font-weight:850;line-height:1.25;letter-spacing:.01em;color:#243c45;}',
  '#classicRockOfficialMusicCard .cr-intro{margin:4px 0 0;color:#536c74;font-size:13px;line-height:1.45;}',
  '#classicRockOfficialMusicCard .cr-artist-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0 13px;}',
  '#classicRockOfficialMusicCard .cr-artist{display:flex;align-items:center;gap:9px;min-width:0;min-height:61px;padding:8px;border:1px solid #cadbde;border-radius:14px;background:#fff;color:#25444a;text-decoration:none;cursor:pointer;text-align:left;font:inherit;}',
  '#classicRockOfficialMusicCard .cr-artist[aria-current="true"]{border-color:#0d737a;background:#eef9f9;}',
  '#classicRockOfficialMusicCard .cr-play{display:grid;flex:none;place-items:center;width:48px;height:48px;border-radius:50%;background:#136a76;color:#fff;font-size:22px;font-weight:850;line-height:1;}',
  '#classicRockOfficialMusicCard .cr-artist-label{min-width:0;overflow-wrap:anywhere;font-size:15px;font-weight:800;line-height:1.25;}',
  '#classicRockOfficialMusicCard .cr-artist:focus-visible,#classicRockOfficialMusicCard .cr-offer:focus-visible{outline:3px solid #8b56b5;outline-offset:3px;}',
  '#classicRockOfficialMusicCard .cr-offers{border-top:1px solid #cadbde;padding-top:12px;}',
  '#classicRockOfficialMusicCard .cr-offer-heading{margin:0 0 5px;font-size:17px;color:#2a414a;}',
  '#classicRockOfficialMusicCard .cr-current{margin:0 0 10px;font-size:13px;line-height:1.5;color:#526a70;}',
  '#classicRockOfficialMusicCard .cr-offer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}',
  '#classicRockOfficialMusicCard .cr-offer{display:flex;flex-direction:column;gap:5px;justify-content:center;min-width:0;min-height:76px;padding:11px;border:1px solid #c1d5d8;border-radius:13px;background:#fff;color:#125262;text-decoration:none;font-size:14px;font-weight:750;line-height:1.4;overflow-wrap:anywhere;}',
  '#classicRockOfficialMusicCard .cr-offer small{font-size:11px;font-weight:650;color:#657a80;line-height:1.3;}',
  '#classicRockOfficialMusicCard .cr-note{margin:12px 0 0;color:#647982;font-size:12px;line-height:1.55;}',
  '@media(max-width:335px){#classicRockOfficialMusicCard .cr-artist-list{grid-template-columns:1fr}#classicRockOfficialMusicCard .cr-offer-grid{grid-template-columns:1fr;}}'
 ].join('\n');
 document.head.appendChild(style);
 const heading=node('div','cr-head');
 const record=node('span','cr-record');
 record.setAttribute('aria-hidden','true');
 const introWrap=node('div');
 introWrap.append(node('h2','', 'Classic Rock · Listen & Shop'),
  node('p','cr-intro','Tap a band to listen while you shop. Official artist releases below.'));
 heading.append(record,introWrap);
 const artistList=node('nav','cr-artist-list');
 artistList.setAttribute('aria-label','Select artist music without leaving QuantaPhi');
 const offersSection=node('section','cr-offers');
 offersSection.setAttribute('aria-label','Official artist releases and merchandise');
 const offerTitle=node('h3','cr-offer-heading');
 const current=node('p','cr-current');
 current.setAttribute('role','status');
 current.setAttribute('aria-live','polite');
 const offerGrid=node('div','cr-offer-grid');
 offersSection.append(offerTitle,current,offerGrid);
 const note=node('p','cr-note','▶ switches the music without leaving QuantaPhi. One small official YouTube player stays visible while shopping. Release links are optional third-party shop visits, not paid ads or guaranteed inventory.');
 const links=new Map();

 function renderOffers(band){
  offerTitle.textContent=band.name+' · Artist release spotlight';
  current.textContent=band.feature+' · Tap ▶ to play here while you shop.';
  offerGrid.replaceChildren();
  for(const offer of band.offers){
   if(!linkIsAllowed(offer.url)) continue;
   const link=node('a','cr-offer',offer.label+' ↗');
   link.href=offer.url;
   link.target='_blank';
   link.rel='noopener noreferrer';
   link.setAttribute('aria-label',offer.label+' · '+band.name+' official source');
   const label=node('small','',offer.category);
   link.prepend(label);
   offerGrid.append(link);
  }
  root.dataset.selectedArtist=band.id;
  for(const [id,link] of links) link.setAttribute('aria-current',String(id===band.id));
 }
 for(const band of CLASSIC_ROCK_BANDS){
  if(!linkIsAllowed(band.youtube)) continue;
  const artistLink = node('button','cr-artist');
  artistLink.type = 'button';
  artistLink.setAttribute('aria-label','Play '+band.name+' while shopping');
  artistLink.setAttribute('aria-pressed','false');
  artistLink.append(node('span','cr-play','▶'),node('span','cr-artist-label',band.name));
  artistLink.querySelector('.cr-play')?.setAttribute('aria-hidden','true');
  artistLink.addEventListener('click',()=>{renderOffers(band);window.InfinityArtistMusic?.toggle(band.id);});
  links.set(band.id,artistLink);
  artistList.append(artistLink);
 }
 window.addEventListener('infinity:artist-state',event=>{
  for(const [id,control] of links){
   const on=event.detail?.id===id&&Boolean(event.detail.playing);
   control.setAttribute('aria-pressed',String(on));
   const glyph=control.querySelector('.cr-play');if(glyph)glyph.textContent=on?'Ⅱ':'▶';
  }
 });
 root.append(heading,artistList,offersSection,note);
 if(CLASSIC_ROCK_BANDS.length)renderOffers(CLASSIC_ROCK_BANDS[0]);
}
