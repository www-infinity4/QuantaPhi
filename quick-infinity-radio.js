/* QuantaPhi quick radio: a one-tap, on-page sampler of Infinity Radio's
   existing public-domain-composition piano playlist. The full station owns
   Music Quant attribution and the broader rotating catalog. Nothing plays
   until a person presses Play. */
(() => {
  'use strict';
  const anchor = document.getElementById('qtraffic');
  if (!anchor || document.getElementById('infinityRadioQuick')) return;
  // One shared catalog for QuantaPhi, Oracle Octaves, and the full station.
  const CATALOG_URL = '/infinity-radio/oracle-track-feed.json?v=20261102-full-catalog1';
  const CACHE_KEY = 'infinityRadio:quickFullCatalog:v1';
  const STABLE_CATALOG='https://raw.githubusercontent.com/www-infinity4/Alien-Radio/2a9476cf50fe8c2a2a2f7aa6a4d6ce27ab6aae66/oracle-track-feed.json';
  const allowedHosts = new Set(['archive.org','www.archive.org','orangefreesounds.com','www.orangefreesounds.com']);
  let tracks = [];
  function validTrack(track) {
    if (!track || typeof track.title!=='string' || !track.title.trim() || typeof track.url!=='string') return false;
    try {
      const url = new URL(track.url);
      return url.protocol==='https:' && allowedHosts.has(url.hostname) &&
        !url.username && !url.password && /\.(mp3|ogg)$/i.test(url.pathname);
    } catch (_) { return false; }
  }
  function mergeTracks(incoming,old) {
    const result=[],seen=new Set();
    for(const track of [...incoming,...old]) {
      if(!validTrack(track)||seen.has(track.url))continue;
      seen.add(track.url); result.push({title:track.title.slice(0,180),url:track.url});
    }
    return result;
  }
  const style = document.createElement('style');
  style.textContent = `
    #infinityRadioQuick{box-sizing:border-box;display:flex;gap:10px;align-items:center;margin:9px 0 12px;padding:10px 12px;
      border:1px solid #9fcecc;border-radius:16px;background:linear-gradient(115deg,#e8faf7,#fff);color:#163e4b;
      box-shadow:0 4px 15px #184e4d12}
    #irQuickPlay{flex:none;width:48px;height:48px;min-height:48px;border:0;border-radius:50%;padding:0;
      display:grid;place-items:center;background:#136a76;color:#fff;font-size:22px;cursor:pointer}
    #irQuickNext{flex:none;min-width:44px;min-height:44px;border:1px solid #b5d6d7;border-radius:10px;background:#fff;color:#155164;font-size:18px;cursor:pointer}\n    #irQuickPlay:disabled,#irQuickNext:disabled{opacity:.5;cursor:default}\n    #irQuickPlay:focus-visible,#irQuickNext:focus-visible,#irQuickStation:focus-visible{outline:3px solid #9c5dd6;outline-offset:3px}
    #infinityRadioQuick .ir-quick-copy{flex:1 1 auto;min-width:0}
    #infinityRadioQuick .ir-quick-title{display:block;font-weight:900;font-size:14px;line-height:1.3}
    #infinityRadioQuick .ir-quick-status{display:block;max-width:100%;color:#43646a;font-size:11px;line-height:1.3;overflow-wrap:anywhere}
    #irQuickStation{flex:none;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:5px 10px;
      border:1px solid #b5d6d7;border-radius:11px;color:#155164;background:#fff;font-size:12px;font-weight:850;text-decoration:none}
    @media(max-width:360px){#infinityRadioQuick{flex-wrap:wrap}#irQuickStation{margin-left:58px}}
  `;
  document.head.appendChild(style);
  const bar = document.createElement('aside');
  bar.id = 'infinityRadioQuick';
  bar.setAttribute('aria-label','Infinity Radio quick player');
  const play = document.createElement('button');
  play.id = 'irQuickPlay';
  play.type = 'button';
  play.disabled = true;
  play.textContent = '▶';
  play.setAttribute('aria-label','Play Infinity Radio');
  play.setAttribute('aria-pressed','false');
  const copy = document.createElement('div');
  copy.className = 'ir-quick-copy';
  const title = document.createElement('strong');
  title.className = 'ir-quick-title';
  title.textContent = '∞ Infinity Radio';
  const status = document.createElement('span');
  status.className = 'ir-quick-status';
  status.setAttribute('role','status');
  status.textContent = 'Loading complete song collection…';
  copy.append(title,status);
  const open = document.createElement('a');
  open.id = 'irQuickStation';
  open.href = '/infinity-radio/';
  open.target = '_blank';
  open.rel = 'noopener';
  open.textContent = 'Full station ↗';
  const next = document.createElement('button');
  next.id='irQuickNext';next.type='button';next.textContent='⏭';
  next.setAttribute('aria-label','Next Infinity Radio song');next.disabled=true;
  bar.append(play,next,copy,open);
  anchor.insertAdjacentElement('afterend',bar);
  // Attach source-backed local radio cards beside the existing Infinity Radio.
  // The browser loads one small module rather than adding seven player iframes.
  const liveRadioScript = document.createElement('script');
  liveRadioScript.src = '/iowa-live-radio-cards.js?v=20261105-states-db1';
  liveRadioScript.defer = true;
  document.head.appendChild(liveRadioScript);


  const audio = document.createElement('audio');
  audio.preload = 'none';
  audio.setAttribute('playsinline','');
  audio.hidden = true;
  bar.appendChild(audio);
  let trackIndex = 0;
  let failures = 0;
  let generation = 0;
  let playbackRequested = false;
  let newArrivalWaiting = false;
  // Playback failures are source-specific; a broken recording must not end the station.
  const unavailableSources = new Set();
  let skippedSinceSuccess = 0;
  const songCount = () => tracks.length+' songs · newest first';
  function applyCatalog(incoming,origin) {
    const before = new Set(tracks.map(track=>track.url));
    const selected=tracks[trackIndex]?.url;
    const merged=mergeTracks(incoming,tracks);
    if(!merged.length)return;
    const added=merged.filter(track=>!before.has(track.url)).length;
    tracks=merged;
    if(playbackRequested&&selected){
      trackIndex=Math.max(0,tracks.findIndex(track=>track.url===selected));
      if(added)newArrivalWaiting=true;
    }else if(added){trackIndex=0;}
    play.disabled=false;next.disabled=false;
    if(!playbackRequested)status.textContent=(origin==='cache'?'Saved collection':'Ready')+' · '+songCount();
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(tracks));}catch(_){}
  }
  async function refreshCatalog() {
    try{
      const response=await fetch(CATALOG_URL,{cache:'no-store'});
      if(!response.ok)throw Error('catalog_http_'+response.status);
      const json=await response.json();
      if(!Array.isArray(json.tracks))throw Error('missing_catalog_tracks');
      let valid=mergeTracks(json.tracks,[]);
      if(!valid.length)throw Error('empty_catalog');
      if(valid.length<274){
        // A verified additive snapshot fills the gap while GitHub's moving
        // main branch and the edge JSON cache are still propagating.
        try{
          const stable=await fetch(STABLE_CATALOG,{cache:'no-store'});
          if(stable.ok){
            const snapshot=await stable.json();
            if(Array.isArray(snapshot.tracks)&&snapshot.tracks.length>=274)
              valid=mergeTracks(snapshot.tracks,valid);
          }
        }catch(error){console.warn('Quick radio snapshot unavailable',error)}
      }
      applyCatalog(valid,'live');
    }catch(error){
      if(!tracks.length)status.textContent='Song catalog unavailable · open Full station';
      console.warn('Infinity Radio catalog not loaded',error);
    }
  }
  try{const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||'[]');
    if(Array.isArray(saved))applyCatalog(saved,'cache');}catch(_){}
  void refreshCatalog();
  setInterval(()=>{if(!document.hidden)void refreshCatalog()},60*60*1000);
  function setPlaying(playing) {
    play.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label',playing?'Pause Infinity Radio':'Play Infinity Radio');
    play.setAttribute('aria-pressed',String(playing));
  }
  function setTrack() {
    audio.src = tracks[trackIndex].url;
    status.textContent = tracks[trackIndex].title+' · '+songCount();
  }
  function start() {
    if (!playbackRequested) return;
    if (!audio.getAttribute('src')) setTrack();
    const current = ++generation;
    status.textContent = 'Connecting · ' + tracks[trackIndex].title+' · '+songCount();
    const request = audio.play();
    if (request && typeof request.then === 'function') request.then(() => {
      if (current !== generation) return;
      failures = 0;
      setPlaying(true);
      status.textContent = tracks[trackIndex].title+' · '+songCount()+
        (skippedSinceSuccess?' · Skipped '+skippedSinceSuccess+' unavailable source(s)':'');
      skippedSinceSuccess=0;
    }).catch(error => {
      if (current !== generation || !playbackRequested) return;
      // Android blocks unattended starts: respect that policy rather than
      // racing through songs without a fresh user tap.
      if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
        playbackRequested = false;
        setPlaying(false);
        status.textContent = 'Tap Play again to allow audio on this device.';
        return;
      }
      unavailableSources.add(tracks[trackIndex].url);
      skippedSinceSuccess++;
      console.warn('Infinity Radio skipped unavailable song',tracks[trackIndex].title,error?.name||'play rejected');
      advance('unavailable');
    });
  }
  function advance(reason='ended') {
    // A completed song is healthy; only actual failures count toward the retry limit.
    if (!playbackRequested || !tracks.length) return;
    if (reason === 'ended') failures=0;
    else if (++failures >= Math.min(5,tracks.length)) {
      playbackRequested = false; audio.pause(); ++generation; setPlaying(false);
      status.textContent = 'Several audio sources could not play. Tap Play to retry.';
      return;
    }
    const startIndex=trackIndex;
    do {
      trackIndex = newArrivalWaiting ? 0 : (trackIndex+1)%tracks.length;
      newArrivalWaiting=false;
    } while(unavailableSources.has(tracks[trackIndex].url) && trackIndex!==startIndex);
    if (unavailableSources.has(tracks[trackIndex].url)) {
      playbackRequested=false;audio.pause();++generation;setPlaying(false);
      status.textContent='No playable songs remain in this session. Tap Play to retry.';
      return;
    }
    setTrack();
    start();
  }
  next.addEventListener('click',()=>{
    if(!tracks.length)return;
    if(playbackRequested){
      ++generation;
      trackIndex=newArrivalWaiting?0:(trackIndex+1)%tracks.length;
      newArrivalWaiting=false;setTrack();start();
    }else{trackIndex=(trackIndex+1)%tracks.length;setTrack();}
  });
  play.addEventListener('click',() => {
    if (playbackRequested) {
      playbackRequested = false; ++generation; audio.pause(); setPlaying(false); status.textContent = 'Paused · ' + tracks[trackIndex].title;
    } else if(tracks.length) {
      playbackRequested = true;
      failures = 0;
      if (typeof window !== 'undefined' && typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('infinity:music-focus',{detail:{player:'radio'}}));
        window.dispatchEvent(new CustomEvent('quantaphi:infinity-radio-play'));
      }
      // A deliberate new Play gesture retries temporary network failures.
      unavailableSources.clear();
      skippedSinceSuccess=0;
      start();
    }
  });
  audio.addEventListener('ended',()=>advance('ended'));
  audio.addEventListener('error',() => {
    if (!playbackRequested || !audio.getAttribute('src') || audio.ended) return;
    unavailableSources.add(tracks[trackIndex].url);
    skippedSinceSuccess++;
    console.warn('Infinity Radio skipped failed media source',tracks[trackIndex].title);
    advance('unavailable');
  });
  audio.addEventListener('pause',() => { if (audio.paused) setPlaying(false); });
  audio.addEventListener('playing',() => {
    if (!playbackRequested) { audio.pause(); setPlaying(false); return; }
    setPlaying(true);
  });
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function')
  window.addEventListener('quantaphi:station-selected', () => {
    if (!playbackRequested) return;
    playbackRequested=false; ++generation; audio.pause(); setPlaying(false);
    status.textContent='Paused for another live radio station.';
  });
  if(typeof window!=='undefined'&&typeof window.addEventListener==='function')
  window.addEventListener('infinity:music-focus',event=>{
    if(event.detail?.player!=='artists'||!playbackRequested)return;
    playbackRequested=false;++generation;audio.pause();setPlaying(false);
    status.textContent='Paused for artist music';
  });
})();
