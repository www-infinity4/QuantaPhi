/* Steve Miller music Quick Card · genuine shared Infinity Radio transport.
 * Album artwork/info is editorial. This radio source is NOT a Steve Miller
 * recording: the catalog currently contains separately licensed/free tracks.
 */
(() => {
  'use strict';
  const root=document.getElementById('steveMillerBookOfDreamsCard');
  if(!root||root.dataset.smbMounted==='true')return;
  root.dataset.smbMounted='true';
  root.classList.add('smb-album-card');
  const album='https://www.youtube.com/playlist?list=PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k';
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
  headText.append(make('h2','', 'Steve Miller'),make('p','smb-sub','Book of Dreams · 1977'));
  head.append(cover,headText);
  const radio=make('div','smb-radio');
  const button=make('button','smb-radio-play','▶');
  button.type='button';
  button.id='smbAlbumPlay';
  button.setAttribute('aria-label','Play Infinity Radio');
  button.setAttribute('aria-pressed','false');
  const radioCopy=make('div');
  radioCopy.append(make('strong','smb-radio-name','∞ Infinity Radio'));
  const status=make('div','smb-radio-status','Loading the shared Infinity Radio…');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  radioCopy.append(status);
  radio.append(button,radioCopy);
  const note=make('p','smb-credit','The radio plays its own cleared catalog; this Steve Miller album is not in that catalog.');
  const more=make('details','smb-source');
  more.append(make('summary','','Album information'));
  const source=make('a','','Book of Dreams · original YouTube album source');
  source.href=album;
  source.target='_blank';
  source.rel='noopener noreferrer';
  more.append(source);
  root.append(head,radio,note,more);
  function refresh(state){
    const s=state||window.InfinityRadioQuick?.getState?.();
    if(!s){status.textContent='Infinity Radio is initializing.';return;}
    button.textContent=s.playing?'Ⅱ':'▶';
    button.setAttribute('aria-label',s.playing?'Pause Infinity Radio':'Play Infinity Radio');
    button.setAttribute('aria-pressed',String(!!s.playing));
    status.textContent=s.ready?(s.status||'Tap to listen to Infinity Radio'):'Infinity Radio is loading its catalog.';
  }
  button.addEventListener('click',()=>{
    const radio=window.InfinityRadioQuick;
    if(!radio){status.textContent='Infinity Radio is not loaded; refresh the page.';return;}
    refresh(window.InfinityRadioQuick.toggle());
  });
  window.addEventListener('quantaphi:infinity-radio-state',e=>refresh(e.detail));
  refresh();
})();