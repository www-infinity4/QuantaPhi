/* Classic Rock · artist-specific official YouTube videos inside the Quick Card.
 * No artist button may start the unrelated Infinity Radio transport.
 * Each visible YouTube embed is subject to the provider's playback permissions.
 */
import {CLASSIC_ROCK_BANDS,linkIsAllowed} from './classic-rock-official-catalog.mjs';
const root=document.getElementById('classicRockOfficialMusicCard');
if(root&&root.dataset.officialRockMounted!=='true'){
 root.dataset.officialRockMounted='true';
 root.classList.add('cr-official-card');
 const node=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;};
 const css=node('style');
 css.textContent=[
  '#classicRockOfficialMusicCard{box-sizing:border-box;border:1px solid #c4d5d9;background:#f7faf9;color:#213640;border-radius:17px;padding:16px;font:inherit;}',
  '#classicRockOfficialMusicCard .cr-head{display:flex;gap:12px;align-items:center;margin:0 0 10px;}',
  '#classicRockOfficialMusicCard .cr-record{flex:none;width:53px;height:53px;border:3px solid #d8e6e6;border-radius:50%;background:repeating-radial-gradient(circle,#141f28 0 5px,#293640 5px 6px);display:grid;place-items:center;color:#b7d8d7;font-weight:900;font-size:23px;}',
  '#classicRockOfficialMusicCard h2{margin:0;font-size:21px;font-weight:850;line-height:1.25;color:#243c45;}',
  '#classicRockOfficialMusicCard .cr-intro{margin:4px 0 0;color:#536c74;font-size:14px;line-height:1.45;}',
  '#classicRockOfficialMusicCard .cr-radio{display:flex;gap:12px;align-items:center;margin:9px 0 12px;padding:10px 12px;border:1px solid #9fcecc;border-radius:16px;background:linear-gradient(115deg,#e8faf7,#fff);box-shadow:0 4px 15px #184e4d12;}',
  '#classicRockOfficialMusicCard .cr-radio-play{display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:50%;border:0;background:#136a76;color:#fff;font-size:22px;cursor:pointer;}',
  '#classicRockOfficialMusicCard .cr-radio-next{display:grid;place-items:center;flex:none;min-width:44px;min-height:44px;border:1px solid #b5d6d7;border-radius:10px;background:#fff;color:#155164;font-size:18px;cursor:pointer;}',
  '#classicRockOfficialMusicCard .cr-radio-next[hidden]{display:none;}',
  '#classicRockOfficialMusicCard .cr-radio-name{font-size:16px;font-weight:800;line-height:1.4;}',
  '#classicRockOfficialMusicCard .cr-radio-status{font-size:12px;line-height:1.45;color:#536c74;overflow-wrap:anywhere;}',
  '#classicRockOfficialMusicCard .cr-player-panel[hidden]{display:none;}',
  '#classicRockOfficialMusicCard .cr-player-panel{margin:8px 0 14px;}',
  '#classicRockOfficialMusicCard .cr-player-frame{display:block;width:100%;min-height:210px;border:0;border-radius:12px;background:#172830;}',
  '#classicRockOfficialMusicCard .cr-player-source{display:block;margin:7px 0 0;color:#125262;font-size:12px;}',
  '#classicRockOfficialMusicCard .cr-artist-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:11px 0 14px;}',
  '#classicRockOfficialMusicCard .cr-artist{min-width:0;min-height:58px;border:1px solid #cadbde;border-radius:13px;padding:9px 11px;background:#fff;color:#25444a;text-align:left;font:inherit;font-size:15px;font-weight:700;line-height:1.4;cursor:pointer;overflow-wrap:anywhere;}',
  '#classicRockOfficialMusicCard .cr-artist[aria-pressed="true"]{border-color:#0d737a;background:#eef9f9;}',
  '#classicRockOfficialMusicCard .cr-radio-play:focus-visible,#classicRockOfficialMusicCard .cr-artist:focus-visible,#classicRockOfficialMusicCard .cr-offer:focus-visible{outline:3px solid #9c5dd6;outline-offset:3px;}',
  '#classicRockOfficialMusicCard .cr-offers{border-top:1px solid #cadbde;padding-top:12px;}',
  '#classicRockOfficialMusicCard .cr-offer-heading{margin:0 0 5px;font-size:17px;color:#2a414a;}',
  '#classicRockOfficialMusicCard .cr-current{margin:0 0 10px;font-size:13px;line-height:1.5;color:#526a70;}',
  '#classicRockOfficialMusicCard .cr-offer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;}',
  '#classicRockOfficialMusicCard .cr-offer{display:flex;flex-direction:column;gap:5px;justify-content:center;min-width:0;min-height:76px;padding:11px;border:1px solid #c1d5d8;border-radius:13px;background:#fff;color:#125262;text-decoration:none;font-size:14px;font-weight:750;line-height:1.4;overflow-wrap:anywhere;}',
  '#classicRockOfficialMusicCard .cr-offer small{font-size:11px;font-weight:650;color:#657a80;line-height:1.3;}',
  '#classicRockOfficialMusicCard .cr-note{font-size:12px;color:#647982;line-height:1.55;margin:10px 0 0;}',
  '@media(max-width:335px){#classicRockOfficialMusicCard .cr-artist-list,#classicRockOfficialMusicCard .cr-offer-grid{grid-template-columns:1fr;}}'
 ].join('\n');
 document.head.append(css);
 const heading=node('div','cr-head');
 const record=node('span','cr-record','∞');
 record.setAttribute('aria-hidden','true');
 const introWrap=node('div');
 introWrap.append(node('h2','','Classic Rock · Artist Music'),node('p','cr-intro','Pink Floyd Radio and Classic Rock · separate from Infinity Radio.'));
 heading.append(record,introWrap);
 const radioRow=node('div','cr-radio');
 const play=node('button','cr-radio-play','▶');
 play.type='button';play.setAttribute('aria-pressed','false');
 const next=node('button','cr-radio-next','⏭');
 next.type='button';next.hidden=true;
 next.setAttribute('aria-label','Next Pink Floyd track');
 const rc=node('div');
 const radioName=node('strong','cr-radio-name');
 const radioStatus=node('div','cr-radio-status','Select an artist to listen.');
 radioStatus.setAttribute('role','status');radioStatus.setAttribute('aria-live','polite');
 rc.append(radioName,radioStatus);radioRow.append(play,next,rc);
 const panel=node('div','cr-player-panel');
 panel.hidden=true;
 const frame=node('iframe','cr-player-frame');
 frame.loading='lazy';
 frame.referrerPolicy='strict-origin-when-cross-origin';
 frame.allow='autoplay; encrypted-media; picture-in-picture';
 frame.setAttribute('allowfullscreen','');
 const sourceLink=node('a','cr-player-source','Open official artist channel if embedding is blocked');
 sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';
 panel.append(frame,sourceLink);
 const artistList=node('nav','cr-artist-list');
 artistList.setAttribute('aria-label','Select an artist to play');
 const offers=node('section','cr-offers');
 offers.setAttribute('aria-label','Official artist releases and merchandise');
 const offerTitle=node('h3','cr-offer-heading');
 const current=node('p','cr-current');
 const grid=node('div','cr-offer-grid');
 offers.append(offerTitle,current,grid);
 const foot=node('p','cr-note','Artist selections open visible official YouTube media in this card; availability depends on the publisher. This is not a continuous licensed artist radio stream.');
 const buttons=new Map();
 let selected=null,active=false,trackIndex=0;
 function stop(){
  frame.removeAttribute('src');
  panel.hidden=true;
  active=false;
  play.textContent='▶';
  play.setAttribute('aria-pressed','false');
  play.setAttribute('aria-label','Play '+(selected?.name||'selected artist'));
  radioStatus.textContent='Stopped · tap Play for '+(selected?.name||'this artist')+'.';
 }
 function renderOffers(band){
  if(active)stop();
  selected=band;
  trackIndex=0;
  next.hidden=!(Array.isArray(band.tracks)&&band.tracks.length>1);
  radioName.textContent=band.name+' Radio';
  play.setAttribute('aria-label','Play '+band.name+' Radio');
  offerTitle.textContent=band.name+' · Artist release spotlight';
  current.textContent=band.feature+' · Official artist sources';
  grid.replaceChildren();
  for(const offer of band.offers){
   if(!linkIsAllowed(offer.url))continue;
   const link=node('a','cr-offer',offer.label+' ↗');
   link.href=offer.url;link.target='_blank';link.rel='noopener noreferrer';
   link.prepend(node('small','',offer.category));
   grid.append(link);
  }
  sourceLink.href=linkIsAllowed(band.youtube)?band.youtube:'https://www.youtube.com';
  root.dataset.selectedArtist=band.id;
  for(const [id,b] of buttons)b.setAttribute('aria-pressed',String(id===band.id));
  radioStatus.textContent='Tap Play for '+band.name+' · '+band.videoTitle+'.';
 }
 function start(band){
  const tracks=Array.isArray(band?.tracks)&&band.tracks.length?band.tracks:[{videoId:band?.videoId,videoTitle:band?.videoTitle}];
  const track=tracks[trackIndex%tracks.length];
  if(!band||!/^[A-Za-z0-9_-]{11}$/.test(track?.videoId)){
   radioStatus.textContent='Artist recording unavailable; use the official channel link.';
   return;
  }
  window.dispatchEvent(new CustomEvent('quantaphi:artist-radio-start',{detail:{cardId:root.id}}));
  frame.title=band.name+' · '+track.videoTitle+' on YouTube';
  panel.hidden=false;
  const upcoming=tracks.slice(trackIndex+1).concat(tracks.slice(0,trackIndex));
  const queue=upcoming.map(item=>item.videoId).join(',');
  frame.src='https://www.youtube.com/embed/'+track.videoId+'?autoplay=1&playsinline=1&rel=0'+(queue?'&loop=1&playlist='+queue:'');
  active=true;
  play.textContent='■';
  play.setAttribute('aria-pressed','true');
  play.setAttribute('aria-label','Stop '+band.name+' official player');
  radioStatus.textContent=band.name+' · '+track.videoTitle+' · use the visible player if autoplay is blocked.';
 }
 for(const band of CLASSIC_ROCK_BANDS){
  const artist=node('button','cr-artist',band.name);
  artist.type='button';
  artist.setAttribute('aria-label','Play '+band.name+' official music');
  artist.setAttribute('aria-pressed','false');
  artist.addEventListener('click',()=>{renderOffers(band);start(band);});
  buttons.set(band.id,artist);artistList.append(artist);
 }
 play.addEventListener('click',()=>{
  if(active){stop();return;}
  start(selected);
 });
 next.addEventListener('click',()=>{
  if(!Array.isArray(selected?.tracks)||selected.tracks.length<2)return;
  trackIndex=(trackIndex+1)%selected.tracks.length;
  if(active)start(selected);
  else radioStatus.textContent='Ready: '+selected.tracks[trackIndex].videoTitle+' · tap Play.';
 });
 window.addEventListener('quantaphi:artist-radio-start',event=>{
  if(event.detail?.cardId!==root.id&&active)stop();
 });
 root.append(heading,radioRow,artistList,panel,offers,foot);
 if(CLASSIC_ROCK_BANDS.length)renderOffers(CLASSIC_ROCK_BANDS[0]);
}
