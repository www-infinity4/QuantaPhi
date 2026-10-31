/* QuantaPhi quick radio: a one-tap, on-page sampler of Infinity Radio's
   existing public-domain-composition piano playlist. The full station owns
   Music Quant attribution and the broader rotating catalog. Nothing plays
   until a person presses Play. */
(() => {
  'use strict';
  const anchor = document.getElementById('qtraffic');
  if (!anchor || document.getElementById('infinityRadioQuick')) return;
  const tracks = [
    { title: 'Chopin · Raindrop Prelude', url: 'https://archive.org/download/musopen-chopin/Prelude%20Op.%2028%20no.%2015.mp3' },
    { title: 'Chopin · Prelude No. 17', url: 'https://archive.org/download/musopen-chopin/Prelude%20Op.%2028%20no.%2017.mp3' },
    { title: 'Chopin · Waltz in E Minor', url: 'https://archive.org/download/musopen-chopin/WaltzB.56InEMinor.mp3' },
    { title: 'Chopin · Polonaise Op. 71 No. 2', url: 'https://archive.org/download/musopen-chopin/PolonaiseOp.71No.2InBFlatMajor.mp3' }
  ];
  const style = document.createElement('style');
  style.textContent = `
    #infinityRadioQuick{box-sizing:border-box;display:flex;gap:10px;align-items:center;margin:9px 0 12px;padding:10px 12px;
      border:1px solid #9fcecc;border-radius:16px;background:linear-gradient(115deg,#e8faf7,#fff);color:#163e4b;
      box-shadow:0 4px 15px #184e4d12}
    #irQuickPlay{flex:none;width:48px;height:48px;min-height:48px;border:0;border-radius:50%;padding:0;
      display:grid;place-items:center;background:#136a76;color:#fff;font-size:22px;cursor:pointer}
    #irQuickPlay:focus-visible,#irQuickStation:focus-visible{outline:3px solid #9c5dd6;outline-offset:3px}
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
  status.textContent = 'Piano radio · tap to play';
  copy.append(title,status);
  const open = document.createElement('a');
  open.id = 'irQuickStation';
  open.href = '/infinity-radio/';
  open.target = '_blank';
  open.rel = 'noopener';
  open.textContent = 'Full station ↗';
  bar.append(play,copy,open);
  anchor.insertAdjacentElement('afterend',bar);

  const audio = document.createElement('audio');
  audio.preload = 'none';
  audio.setAttribute('playsinline','');
  audio.hidden = true;
  bar.appendChild(audio);
  let trackIndex = 0;
  let failures = 0;
  let generation = 0;
  let playbackRequested = false;
  function setPlaying(playing) {
    play.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label',playing?'Pause Infinity Radio':'Play Infinity Radio');
    play.setAttribute('aria-pressed',String(playing));
  }
  function setTrack() {
    audio.src = tracks[trackIndex].url;
    status.textContent = tracks[trackIndex].title;
  }
  function start() {
    if (!playbackRequested) return;
    if (!audio.getAttribute('src')) setTrack();
    const current = ++generation;
    status.textContent = 'Connecting · ' + tracks[trackIndex].title;
    const request = audio.play();
    if (request && typeof request.then === 'function') request.then(() => {
      if (current !== generation) return;
      failures = 0;
      setPlaying(true);
      status.textContent = tracks[trackIndex].title;
    }).catch(() => {
      if (current !== generation) return;
      playbackRequested = false;
      setPlaying(false);
      status.textContent = 'Playback unavailable · try Full station';
    });
  }
  function advance() {
    // A queued media error/ended event is not a new Play gesture.
    if (!playbackRequested) return;
    if (++failures > tracks.length) {
      playbackRequested = false; audio.pause(); ++generation; setPlaying(false);
      status.textContent = 'Audio sources unavailable · open Full station';
      return;
    }
    trackIndex = (trackIndex + 1) % tracks.length;
    setTrack();
    start();
  }
  play.addEventListener('click',() => {
    if (playbackRequested) {
      playbackRequested = false; ++generation; audio.pause(); setPlaying(false); status.textContent = 'Paused · ' + tracks[trackIndex].title;
    } else {
      playbackRequested = true;
      failures = 0;
      start();
    }
  });
  audio.addEventListener('ended',advance);
  audio.addEventListener('error',() => {
    if (audio.getAttribute('src') && !audio.ended) advance();
  });
  audio.addEventListener('pause',() => { if (audio.paused) setPlaying(false); });
  audio.addEventListener('playing',() => {
    if (!playbackRequested) { audio.pause(); setPlaying(false); return; }
    setPlaying(true);
  });
})();
