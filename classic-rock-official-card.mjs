/* Classic Rock · official artist information, one shared Infinity Radio
 * transport. Artist selections never pretend the radio plays those artists.
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
  '#classicRockOfficialMusicCard .cr-radio{display:flex;gap:12px;align-items:center;margin:8px 0 15px;}',
  '#classicRockOfficialMusicCard .cr-radio-play{display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:50%;border:0;background:#136a76;color:#fff;font-size:22px;cursor:pointer;}',
  '#classicRockOfficialMusicCard .cr-radio-name{font-size:16px;font-weight:800;line-height:1.4;}',
  '#classicRockOfficialMusicCard .cr-radio-status{font-size:12px;line-height:1.45;color:#536c74;overflow-wrap:anywhere;}',
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
 introWrap.append(node('h2','','Classic Rock · Listen & Shop'),node('p','cr-intro','Listen to Infinity Radio while exploring official artist releases.'));
 heading.append(record,introWrap);
 const radioRow=node('div','cr-radio');
 const play=node('button','cr-radio-play','▶');
 play.type='button';play.setAttribute('aria-label','Play Infinity Radio');play.setAttribute('aria-pressed','false');
 const rc=node('div');
 rc.append(node('strong','cr-radio-name','∞ Infinity Radio'));
 const radioStatus=node('div','cr-radio-status','Loading shared Infinity Radio…');
 radioStatus.setAttribute('role','status');radioStatus.setAttribute('aria-live','polite');
 rc.append(radioStatus);radioRow.append(play,rc);
 const artistList=node('nav','cr-artist-list');
 artistList.setAttribute('aria-label','Choose an artist release spotlight');
 const offers=node('section','cr-offers');
 offers.setAttribute('aria-label','Official artist releases and merchandise');
 const offerTitle=node('h3','cr-offer-heading');
 const current=node('p','cr-current');
 const grid=node('div','cr-offer-grid');
 offers.append(offerTitle,current,grid);
 const foot=node('p','cr-note','The radio plays its own source-cleared music collection, not recordings by the selected band. Selecting a band changes official release information only; it never launches another player.');
 const buttons=new Map();
 function renderOffers(band){
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
  root.dataset.selectedArtist=band.id;
  for(const [id,b] of buttons)b.setAttribute('aria-pressed',String(id===band.id));
 }
 for(const band of CLASSIC_ROCK_BANDS){
  const artist=node('button','cr-artist',band.name);
  artist.type='button';
  artist.setAttribute('aria-label','View '+band.name+' official releases');
  artist.setAttribute('aria-pressed','false');
  artist.addEventListener('click',()=>renderOffers(band));
  buttons.set(band.id,artist);artistList.append(artist);
 }
 function refresh(state){
  const s=state||window.InfinityRadioQuick?.getState?.();
  if(!s){radioStatus.textContent='Infinity Radio is initializing.';return;}
  play.textContent=s.playing?'Ⅱ':'▶';
  play.setAttribute('aria-label',s.playing?'Pause Infinity Radio':'Play Infinity Radio');
  play.setAttribute('aria-pressed',String(!!s.playing));
  radioStatus.textContent=s.ready?(s.status||'Tap to listen to Infinity Radio'):'Infinity Radio is loading its catalog.';
 }
 play.addEventListener('click',()=>{
  if(!window.InfinityRadioQuick){radioStatus.textContent='Infinity Radio is not loaded; refresh the page.';return;}
  refresh(window.InfinityRadioQuick.toggle());
 });
 window.addEventListener('quantaphi:infinity-radio-state',event=>refresh(event.detail));
 root.append(heading,radioRow,artistList,offers,foot);
 if(CLASSIC_ROCK_BANDS.length)renderOffers(CLASSIC_ROCK_BANDS[0]);
 refresh();
}
