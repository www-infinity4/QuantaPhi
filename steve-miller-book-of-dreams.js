/* Compact Steve Miller button; the shared player remains visible on-page.
 * No card-owned viewer, automatic playback, third-party redirect or pause
 * when Oracle moves to the next shopping card.
 */
(() => {
 'use strict';
 const root=document.getElementById('steveMillerBookOfDreamsCard');
 if(!root||root.dataset.smbMounted==='true')return;
 root.dataset.smbMounted='true';
 const style=document.createElement('style');style.id='smb-album-player-style';
 style.textContent=[
  '#steveMillerBookOfDreamsCard{box-sizing:border-box;padding:16px;border:1px solid #d4d9dc;border-radius:17px;background:#f8fbfa;color:#24343e;}',
  '#steveMillerBookOfDreamsCard .smb-heading{margin:0 0 5px;font-size:20px;font-weight:850;line-height:1.3;color:#203b45;}',
  '#steveMillerBookOfDreamsCard .smb-row{display:flex;align-items:center;gap:11px;padding:9px 0;}',
  '#smbAlbumPlay{flex:none;width:48px;height:48px;min-height:48px;border:0;border-radius:50%;padding:0;display:grid;place-items:center;background:#136a76;color:#fff;font-size:22px;cursor:pointer;}',
  '#smbAlbumPlay:focus-visible{outline:3px solid #8050b4;outline-offset:3px;}',
  '#steveMillerBookOfDreamsCard .smb-status{min-width:0;font-size:14px;line-height:1.5;color:#43646a;overflow-wrap:anywhere;}'
 ].join('\n');document.head.appendChild(style);
 const heading=document.createElement('h2');heading.className='smb-heading';
 heading.textContent='Steve Miller · Book of Dreams';
 const row=document.createElement('div');row.className='smb-row';
 const button=document.createElement('button');button.id='smbAlbumPlay';button.type='button';
 button.textContent='▶';button.setAttribute('aria-label','Play Steve Miller Book of Dreams');
 button.setAttribute('aria-pressed','false');
 const status=document.createElement('span');status.className='smb-status';
 status.textContent='Tap ▶ to listen while you shop';status.setAttribute('role','status');
 row.append(button,status);root.append(heading,row);
 function setPlaying(playing){
  button.textContent=playing?'Ⅱ':'▶';
  button.setAttribute('aria-label',playing?'Pause Steve Miller Book of Dreams':'Play Steve Miller Book of Dreams');
  button.setAttribute('aria-pressed',String(playing));
 }
 button.addEventListener('click',()=>{
  const music=window.InfinityArtistMusic;
  if(!music){status.textContent='Music controls are unavailable. Try refreshing this page.';return;}
  music.toggle('steve-miller');
 });
 window.addEventListener('infinity:artist-state',event=>{
  const mine=event.detail?.id==='steve-miller';
  setPlaying(mine&&event.detail.playing);
  if(mine)status.textContent=event.detail.status||'Ready';
  else status.textContent='Tap ▶ to listen while you shop';
 });
})();
