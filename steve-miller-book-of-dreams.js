/* Steve Miller Quick Card · Book of Dreams playlist in a visible official
 * YouTube embed. This does not restream or copy recordings into Infinity Radio.
 * The provider decides whether individual playlist videos allow embedding.
 */
(() => {
  'use strict';
  const root=document.getElementById('steveMillerBookOfDreamsCard');
  if(!root||root.dataset.smbMounted==='true')return;
  root.dataset.smbMounted='true';
  root.classList.add('smb-album-card');
  // Verified official-artist YouTube recordings from Book of Dreams.
  // No audio downloads, stream extraction, or unverified playlist dependency.
  const steveTracks=Object.freeze([
    {id:'JHa1hiFYbFQ',name:'Jet Airliner'},
    {id:'HUv7pXgZ9NA',name:'Winter Time'},
    {id:'cTyFNA6939w',name:'Swingtown'},
    {id:'EFOjLc6vjas',name:'The Stake'}
  ]);
  const album='https://www.stevemillerband.com/releases-archive/book-dreams/';
  let trackIndex=0;
  const make=(tag,cls,value)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=value;
    return el;
  };
  const css=make('style');
  css.textContent=[
   '#steveMillerBookOfDreamsCard{box-sizing:border-box;border:1px solid #cad7d8;border-radius:17px;background:#f7faf9;color:#203b45;padding:15px;font:inherit;}',
   '#steveMillerBookOfDreamsCard .smb-head{display:flex;align-items:center;gap:12px;}',
   '#steveMillerBookOfDreamsCard .smb-cover{width:86px;height:86px;border-radius:12px;object-fit:cover;background:#172830;flex:none;}',
   '#steveMillerBookOfDreamsCard h2{margin:0 0 4px;font-size:21px;line-height:1.3;color:#203b45;}',
   '#steveMillerBookOfDreamsCard .smb-sub{font-size:14px;line-height:1.5;color:#536e74;margin:0;}',
   '#steveMillerBookOfDreamsCard .smb-radio{display:flex;align-items:center;gap:12px;margin:9px 0 12px;padding:10px 12px;border:1px solid #9fcecc;border-radius:16px;background:linear-gradient(115deg,#e8faf7,#fff);box-shadow:0 4px 15px #184e4d12;}',
   '#steveMillerBookOfDreamsCard .smb-radio-play{display:grid;place-items:center;flex:none;width:48px;height:48px;border:0;border-radius:50%;background:#136a76;color:#fff;font-size:22px;cursor:pointer;}',
   '#steveMillerBookOfDreamsCard .smb-radio-next{display:grid;place-items:center;flex:none;min-width:44px;min-height:44px;border:1px solid #b5d6d7;border-radius:10px;background:#fff;color:#155164;font-size:18px;cursor:pointer;}',
   '#steveMillerBookOfDreamsCard .smb-radio-play:focus-visible,#steveMillerBookOfDreamsCard .smb-radio-next:focus-visible{outline:3px solid #9c5dd6;outline-offset:3px;}',
   '#steveMillerBookOfDreamsCard .smb-radio-name{font-size:16px;line-height:1.4;font-weight:800;}',
   '#steveMillerBookOfDreamsCard .smb-radio-status{font-size:13px;line-height:1.45;color:#536e74;overflow-wrap:anywhere;}',
   '#steveMillerBookOfDreamsCard .smb-player-panel[hidden]{display:none;}',
   '#steveMillerBookOfDreamsCard .smb-player-panel{margin:9px 0 8px;}',
   '#steveMillerBookOfDreamsCard .smb-player-frame{display:block;width:100%;min-height:210px;border:0;border-radius:12px;background:#172830;}',
   '#steveMillerBookOfDreamsCard .smb-credit{font-size:12px;color:#59747a;margin:4px 0 0;line-height:1.45;}',
   '#steveMillerBookOfDreamsCard .smb-source{margin-top:8px;font-size:12px;}',
   '#steveMillerBookOfDreamsCard .smb-source a{color:#155164;text-decoration:underline;}'
  ].join('\n');
  document.head.append(css);
  const head=make('div','smb-head');
  const cover=make('img','smb-cover');
  cover.src='https://i.ytimg.com/vi/D6KCZXzLdVM/hqdefault.jpg';
  cover.alt='Book of Dreams · Steve Miller Band video preview';
  cover.loading='lazy';
  const headText=make('div');
  headText.append(make('h2','','Steve Miller'),make('p','smb-sub','Book of Dreams · 1977'));
  head.append(cover,headText);
  const radio=make('div','smb-radio');
  const button=make('button','smb-radio-play','▶');
  button.type='button';
  button.id='smbAlbumPlay';
  button.setAttribute('aria-label','Play Steve Miller Book of Dreams');
  button.setAttribute('aria-pressed','false');
  const radioCopy=make('div');
  radioCopy.append(make('strong','smb-radio-name','Steve Miller Radio · Book of Dreams'));
  const status=make('div','smb-radio-status','Tap Play for Steve Miller Radio · official Book of Dreams recordings.');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  radioCopy.append(status);
  const next=make('button','smb-radio-next','⏭');
  next.type='button';
  next.setAttribute('aria-label','Next Steve Miller track');
  radio.append(button,next,radioCopy);
  const panel=make('div','smb-player-panel');
  panel.hidden=true;
  const frame=make('iframe','smb-player-frame');
  frame.title='Steve Miller Band · Book of Dreams YouTube playlist';
  frame.loading='lazy';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allow='autoplay; encrypted-media; picture-in-picture';
  frame.setAttribute('allowfullscreen','');
  panel.append(frame);
  const note=make('p','smb-credit','Official artist recordings play through YouTube inside this card. Provider availability and mobile autoplay vary.');
  const more=make('details','smb-source');
  more.append(make('summary','','Album information & fallback'));
  const source=make('a','','Steve Miller Band · Book of Dreams official album');
  source.href=album;
  source.target='_blank';
  source.rel='noopener noreferrer';
  more.append(source);
  root.append(head,radio,panel,note,more);
  let active=false;
  function showSelectedTrack(){
   const track=steveTracks[trackIndex];
   const upcoming=steveTracks.slice(trackIndex+1).concat(steveTracks.slice(0,trackIndex));
   const sequence=upcoming.map(t=>t.id).join(',');
   frame.title='Steve Miller Band · '+track.name+' (official YouTube recording)';
   frame.src='https://www.youtube.com/embed/'+track.id+'?autoplay=1&playsinline=1&rel=0&loop=1&playlist='+sequence;
   status.textContent='Now selected: '+track.name+' · use the visible YouTube player if mobile autoplay is blocked.';
  }
  function stop(){
   frame.removeAttribute('src');
   panel.hidden=true;
   active=false;
   button.textContent='▶';
   button.setAttribute('aria-label','Play Steve Miller Book of Dreams');
   button.setAttribute('aria-pressed','false');
   status.textContent='Stopped · tap to play Book of Dreams.';
  }
  button.addEventListener('click',()=>{
   if(active){stop();return;}
   window.dispatchEvent(new CustomEvent('quantaphi:artist-radio-start',{detail:{cardId:root.id}}));
   panel.hidden=false;
   showSelectedTrack();
   active=true;
   button.textContent='■';
   button.setAttribute('aria-label','Stop Steve Miller Book of Dreams');
   button.setAttribute('aria-pressed','true');
  });
  next.addEventListener('click',()=>{
    trackIndex=(trackIndex+1)%steveTracks.length;
    if(!active){
      status.textContent='Ready: '+steveTracks[trackIndex].name+' · tap Play.';
      return;
    }
    showSelectedTrack();
  });
  window.addEventListener('quantaphi:artist-radio-start',event=>{
   if(event.detail?.cardId!==root.id&&active)stop();
  });
})();