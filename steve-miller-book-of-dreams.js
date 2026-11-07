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
  const albumId='PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k';
  const album='https://www.youtube.com/playlist?list='+albumId;
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
   '#steveMillerBookOfDreamsCard .smb-radio{display:flex;align-items:center;gap:12px;padding:14px 0 6px;}',
   '#steveMillerBookOfDreamsCard .smb-radio-play{display:grid;place-items:center;flex:none;width:48px;height:48px;border:0;border-radius:50%;background:#136a76;color:#fff;font-size:22px;cursor:pointer;}',
   '#steveMillerBookOfDreamsCard .smb-radio-play:focus-visible{outline:3px solid #9c5dd6;outline-offset:3px;}',
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
  const status=make('div','smb-radio-status','Tap Play for the YouTube album playlist.');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  radioCopy.append(status);
  radio.append(button,radioCopy);
  const panel=make('div','smb-player-panel');
  panel.hidden=true;
  const frame=make('iframe','smb-player-frame');
  frame.title='Steve Miller Band · Book of Dreams YouTube playlist';
  frame.loading='lazy';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allow='autoplay; encrypted-media; picture-in-picture';
  frame.setAttribute('allowfullscreen','');
  panel.append(frame);
  const note=make('p','smb-credit','Artist playlist plays only through YouTube. If a video blocks embedding, open the album source below.');
  const more=make('details','smb-source');
  more.append(make('summary','','Album information & fallback'));
  const source=make('a','','Book of Dreams · YouTube album playlist');
  source.href=album;
  source.target='_blank';
  source.rel='noopener noreferrer';
  more.append(source);
  root.append(head,radio,panel,note,more);
  let active=false;
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
   frame.src='https://www.youtube.com/embed/videoseries?list='+encodeURIComponent(albumId)+'&autoplay=1&rel=0';
   active=true;
   button.textContent='■';
   button.setAttribute('aria-label','Stop Steve Miller Book of Dreams');
   button.setAttribute('aria-pressed','true');
   status.textContent='YouTube album playlist · use the visible player if autoplay is blocked.';
  });
  window.addEventListener('quantaphi:artist-radio-start',event=>{
   if(event.detail?.cardId!==root.id&&active)stop();
  });
})();