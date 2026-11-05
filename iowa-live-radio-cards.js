/* QuantaPhi · Iowa live radio cards.
 * Source-backed stations; user-initiated audio only. Official iHeart players
 * retain broadcaster control. No stream copying, republishing or fake "Live" data.
 * IPR's own documented MP3 links supply genuine single-tap station audio.
 */
(() => {
  'use strict';
  const anchor = document.getElementById('infinityRadioQuick') || document.getElementById('qtraffic');
  if (!anchor || document.getElementById('iowaLiveRadio')) return;

  const stations = [
    { id: 'who', name: 'NEWSRADIO 1040 WHO', frequency: '1040 AM', type: 'News & Talk',
      city: 'Des Moines', player: 'iheart',
      url: 'https://www.iheart.com/live/1040-who-925/',
      schedule: 'https://whoradio.iheart.com/schedule/' },
    { id: 'kxno', name: 'KXNO Sports', frequency: '1460 AM / 106.3 FM', type: 'Sports',
      city: 'Des Moines', player: 'iheart',
      url: 'https://www.iheart.com/live/1460-and-1063-kxno-921/' },
    { id: 'ipr-news', name: 'Iowa Public Radio News', frequency: 'WOI 640 AM', type: 'Public News',
      city: 'Statewide', player: 'mp3', url: 'https://www.iowapublicradio.org/listening-digitally',
      stream: 'https://news-stream.iowapublicradio.org/News.mp3',
      low: 'https://news-stream.iowapublicradio.org/NewsLow.mp3' },
    { id: 'the-bus', name: '100.3 The Bus', frequency: '100.3 FM', type: 'Classic Hits',
      city: 'Des Moines', player: 'iheart',
      url: 'https://www.iheart.com/live/1003-the-bus-2744/' },
    { id: 'ipr-studio-one', name: 'IPR Studio One', frequency: '94.1 FM (Central Iowa)', type: 'Alternative Music',
      city: 'Statewide', player: 'mp3', url: 'https://www.iowapublicradio.org/listening-digitally',
      stream: 'https://studioone-stream.iowapublicradio.org/StudioOne.mp3',
      low: 'https://studioone-stream.iowapublicradio.org/StudioOneLow.mp3' },
    { id: 'kiss', name: '107.5 Kiss FM', frequency: '107.5 FM', type: 'Pop & Hits',
      city: 'Des Moines', player: 'iheart',
      url: 'https://www.iheart.com/live/1075-kiss-fm-2740/' },
    { id: 'ipr-classical', name: 'IPR Classical', frequency: '105.9 FM (Des Moines)', type: 'Classical Music',
      city: 'Statewide', player: 'mp3', url: 'https://www.iowapublicradio.org/listening-digitally',
      stream: 'https://classical-stream.iowapublicradio.org/Classical.mp3',
      low: 'https://classical-stream.iowapublicradio.org/ClassicalLow.mp3' }
  ];

  const make = (tag, className, value) => {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (value !== undefined) n.textContent = value;
    return n;
  };
  const css = make('style');
  css.textContent = [
    '#iowaLiveRadio{box-sizing:border-box;max-width:100%;margin:14px 0 18px;padding:16px 12px 18px;border:1px solid #d5dce2;border-radius:20px;background:#f9faf8;color:#253340;font:inherit;box-shadow:0 8px 24px #182b3715}',
    '#iowaLiveRadio *{box-sizing:border-box}',
    '#iowaLiveRadio .ilr-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}',
    '#iowaLiveRadio h2{font-size:20px;letter-spacing:.01em;line-height:1.2;margin:0;color:#253340}',
    '#iowaLiveRadio .ilr-caption{font-size:13px;color:#586778;line-height:1.5;margin:5px 0 0}',
    '#iowaLiveRadio .ilr-arrows{display:flex;gap:7px}',
    '#iowaLiveRadio button{cursor:pointer;touch-action:manipulation}',
    '#iowaLiveRadio .ilr-arrow{min-width:44px;height:44px;padding:0;border-radius:50%;background:#fff;color:#223746;border:1px solid #b9c4cd;font-size:22px}',
    '#iowaLiveRadio .ilr-track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-inline:contain;padding:4px 2px 13px;scrollbar-width:thin}',
    '#iowaLiveRadio .ilr-card{position:relative;flex:0 0 min(265px,78vw);scroll-snap-align:start;min-height:252px;border-radius:17px;background:#fff;border:1px solid #d7dfe6;padding:12px;display:flex;flex-direction:column;gap:7px;box-shadow:0 3px 10px #122a3510}',
    '#iowaLiveRadio .ilr-card[data-active="true"]{outline:2px solid #2d6b74;outline-offset:-2px}',
    '#iowaLiveRadio .ilr-art{height:83px;display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:13px;background:linear-gradient(110deg,#e6f2f2,#eaf0fb);color:#204e60;overflow:hidden}',
    '#iowaLiveRadio .ilr-art strong{font-size:clamp(22px,5vw,30px);line-height:1;font-weight:900;letter-spacing:.01em}',
    '#iowaLiveRadio .ilr-wave{font-size:25px;letter-spacing:-3px;opacity:.54}',
    '#iowaLiveRadio .ilr-card h3{font-size:17px;line-height:1.28;font-weight:850;margin:2px 0 0;color:#203442;min-height:22px}',
    '#iowaLiveRadio .ilr-meta{font-size:13px;line-height:1.3;color:#657381;margin:0}',
    '#iowaLiveRadio .ilr-acts{display:flex;gap:7px;align-items:center;margin-top:auto;flex-wrap:wrap}',
    '#iowaLiveRadio .ilr-play{min-height:48px;flex:1 1 115px;border:0;border-radius:12px;padding:8px;background:#244955;color:#fff;font-size:15px;font-weight:850}',
    '#iowaLiveRadio .ilr-source{display:inline-flex;align-items:center;justify-content:center;min-height:45px;padding:7px 9px;border-radius:12px;border:1px solid #c4d0d7;background:#fff;color:#304b5c;font-size:13px;font-weight:750;text-decoration:none}',
    '#iowaLiveRadio .ilr-status{font-size:14px;line-height:1.5;color:#294653;margin:9px 0 0;min-height:22px}',
    '#iowaLiveRadio .ilr-viewer{width:100%;margin-top:8px}',
    '#iowaLiveRadio .ilr-viewer iframe{display:block;width:100%;height:190px;border:1px solid #d1dce0;border-radius:13px;background:#fff}',
    '#iowaLiveRadio .ilr-stop{min-height:44px;padding:9px 14px;margin-top:8px;background:#fff;color:#294653;border:1px solid #b5c6cb;border-radius:12px;font-weight:750}',
    '#iowaLiveRadio :is(button,a):focus-visible{outline:3px solid #8445b6;outline-offset:3px}',
    '@media(max-width:380px){#iowaLiveRadio{padding:14px 10px}#iowaLiveRadio h2{font-size:19px}#iowaLiveRadio .ilr-card{flex-basis:80vw}}',
    '@media(prefers-reduced-motion:reduce){#iowaLiveRadio .ilr-track{scroll-behavior:auto}}'
  ].join('\n');
  document.head.appendChild(css);

  const shell = make('section');
  shell.id = 'iowaLiveRadio';
  shell.setAttribute('aria-label', 'Iowa live radio station carousel');
  const head = make('header', 'ilr-head');
  const copy = make('div');
  copy.append(make('h2', '', '📻 Iowa Live Radio'), make('p','ilr-caption','Swipe stations · choose one to listen right here'));
  const arrows = make('div','ilr-arrows');
  const previous = make('button','ilr-arrow','‹');
  previous.type = 'button';
  previous.setAttribute('aria-label','Previous stations');
  const next = make('button','ilr-arrow','›');
  next.type = 'button';
  next.setAttribute('aria-label','Next stations');
  arrows.append(previous,next);
  head.append(copy,arrows);
  const track = make('div','ilr-track');
  track.setAttribute('role','group');
  track.setAttribute('aria-label','Radio stations');
  const status = make('p','ilr-status','Select a station. Audio starts only when you tap.');
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const viewer = make('div','ilr-viewer');
  const stop = make('button','ilr-stop','■ Stop station');
  stop.type = 'button';
  stop.hidden = true;
  const audio = make('audio');
  audio.hidden = true;
  audio.preload = 'none';
  audio.setAttribute('playsinline','');
  shell.append(head,track,status,viewer,stop,audio);
  anchor.insertAdjacentElement('afterend',shell);

  const buttons = new Map();
  const cards = new Map();
  let active = null;
  let activeStarted = false;
  let lowAttempt = false;
  let playerFrame = null;
  let generation = 0;

  function updateActive() {
    for (const station of stations) {
      cards.get(station.id).dataset.active = String(active?.id === station.id && activeStarted);
      buttons.get(station.id).textContent =
        active?.id === station.id && activeStarted
          ? '❚❚ Pause'
          : station.player === 'iheart' ? '▶ Official player' : '▶ Listen live';
    }
    stop.hidden = !activeStarted;
  }

  function pauseStation() {
    generation += 1;
    activeStarted = false;
    audio.pause();
    audio.removeAttribute('src');
    if (playerFrame) {
      playerFrame.src = 'about:blank';
      playerFrame.hidden = true;
    }
    active = null;
    updateActive();
  }

  function silenceOtherAudio() {
    // Only on a deliberate station play request, never on page load/scroll.
    for (const other of document.querySelectorAll('audio')) {
      if (other !== audio && typeof other.pause === 'function') other.pause();
    }
    window.dispatchEvent(new CustomEvent('quantaphi:station-selected'));
  }

  function sourceUnavailable(station) {
    activeStarted = false;
    updateActive();
    status.textContent = station.name + ' cannot play on this device right now. The official station link is available on its card.';
  }

  function playMp3(station) {
    const current = ++generation;
    audio.src = lowAttempt && station.low ? station.low : station.stream;
    const request = audio.play();
    status.textContent = 'Connecting to ' + station.name + '…';
    if (request && typeof request.then === 'function') {
      request.then(() => {
        if (current !== generation || active?.id !== station.id) return;
        status.textContent = 'Listening to ' + station.name + (lowAttempt ? ' · low data stream' : '');
        updateActive();
      }).catch(error => {
        if (current !== generation || active?.id !== station.id) return;
        if (error?.name === 'NotAllowedError') {
          sourceUnavailable(station);
          status.textContent = 'Your browser needs another tap to permit audio. Tap Listen live again.';
        } else if (!lowAttempt && station.low) {
          lowAttempt = true;
          playMp3(station);
        } else sourceUnavailable(station);
      });
    }
  }

  audio.addEventListener('error', () => {
    if (!activeStarted || active?.player !== 'mp3') return;
    if (!lowAttempt && active.low) {
      lowAttempt = true;
      playMp3(active);
    } else sourceUnavailable(active);
  });
  audio.addEventListener('ended', () => {
    if (active?.player === 'mp3') {
      sourceUnavailable(active);
      status.textContent = active.name + ' stream ended. Tap Listen live to reconnect.';
    }
  });

  function choose(station) {
    if (active?.id === station.id && activeStarted) {
      pauseStation();
      status.textContent = 'Paused · ' + station.name;
      return;
    }
    pauseStation();
    silenceOtherAudio();
    active = station;
    activeStarted = true;
    lowAttempt = false;
    if (station.player === 'mp3') playMp3(station);
    else {
      // An official broadcaster-owned embed, not a homegrown rebroadcast.
      if (!playerFrame) {
        playerFrame = make('iframe');
        playerFrame.setAttribute('title','iHeartRadio official live station player');
        playerFrame.setAttribute('allow','autoplay; encrypted-media');
        playerFrame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
        viewer.appendChild(playerFrame);
      }
      playerFrame.hidden = false;
      playerFrame.src = station.url + '?embed=true';
      status.textContent = 'Official ' + station.name + ' player loaded below. Tap Play inside it if your browser requires it.';
    }
    updateActive();
  }

  for (const station of stations) {
    const card = make('article','ilr-card');
    card.dataset.station = station.id;
    card.dataset.active = 'false';
    const art = make('div','ilr-art');
    art.append(make('strong','',station.frequency.split(' ')[0]),make('span','ilr-wave','▂▅▇▅▂'));
    card.append(art,make('h3','',station.name),make('p','ilr-meta',station.type+' · '+station.city));
    const acts = make('div','ilr-acts');
    const play = make('button','ilr-play',station.player === 'iheart' ? '▶ Official player' : '▶ Listen live');
    play.type = 'button';
    play.setAttribute('aria-label','Listen to ' + station.name);
    play.addEventListener('click',() => choose(station));
    const original = make('a','ilr-source','Station info');
    original.href = station.url;
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    original.setAttribute('aria-label','Official source for ' + station.name);
    acts.append(play,original);
    if (station.schedule) {
      const schedule = make('a','ilr-source','Schedule');
      schedule.href = station.schedule;
      schedule.target = '_blank';
      schedule.rel = 'noopener noreferrer';
      acts.appendChild(schedule);
    }
    card.appendChild(acts);
    track.appendChild(card);
    cards.set(station.id,card);
    buttons.set(station.id,play);
  }
  previous.addEventListener('click',() => track.scrollBy({left: -280, behavior:'smooth'}));
  next.addEventListener('click',() => track.scrollBy({left: 280, behavior:'smooth'}));
  stop.addEventListener('click',() => {
    if (active) {
      const title = active.name;
      pauseStation();
      status.textContent = 'Stopped · ' + title;
    }
  });
  window.addEventListener('quantaphi:infinity-radio-play',() => {
    if (activeStarted) {
      pauseStation();
      status.textContent = 'Live station paused for Infinity Radio.';
    }
  });
})();
