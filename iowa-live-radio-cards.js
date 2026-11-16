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
    { id: 'who', state: 'IA', name: 'NEWSRADIO 1040 WHO', frequency: '1040 AM', type: 'News & Talk',
      city: 'Des Moines', player: 'iheart',
      url: 'https://www.iheart.com/live/1040-who-925/',
      schedule: 'https://whoradio.iheart.com/schedule/' },
    { id: 'kxno', state: 'IA', name: 'KXNO Sports', frequency: '1460 AM / 106.3 FM', type: 'Sports',
      city: 'Des Moines', player: 'iheart',
      url: 'https://www.iheart.com/live/1460-and-1063-kxno-921/' },
    { id: 'ipr-news', state: 'IA', name: 'Iowa Public Radio News', frequency: 'WOI 640 AM', type: 'Public News',
      city: 'Statewide', player: 'mp3', url: 'https://www.iowapublicradio.org/listening-digitally',
      stream: 'https://news-stream.iowapublicradio.org/News.mp3',
      low: 'https://news-stream.iowapublicradio.org/NewsLow.mp3' },
    { id: 'the-bus', state: 'IA', name: '100.3 The Bus', frequency: '100.3 FM', type: 'Classic Hits',
      city: 'Des Moines', player: 'iheart',
      url: 'https://www.iheart.com/live/1003-the-bus-2744/' },
    { id: 'ipr-studio-one', state: 'IA', name: 'IPR Studio One', frequency: '94.1 FM (Central Iowa)', type: 'Alternative Music',
      city: 'Statewide', player: 'mp3', url: 'https://www.iowapublicradio.org/listening-digitally',
      stream: 'https://studioone-stream.iowapublicradio.org/StudioOne.mp3',
      low: 'https://studioone-stream.iowapublicradio.org/StudioOneLow.mp3' },
    { id: 'kiss', state: 'IA', name: '107.5 Kiss FM', frequency: '107.5 FM', type: 'Pop & Hits',
      city: 'Des Moines', player: 'iheart',
      url: 'https://www.iheart.com/live/1075-kiss-fm-2740/' },
    { id: 'ipr-classical', state: 'IA', name: 'IPR Classical', frequency: '105.9 FM (Des Moines)', type: 'Classical Music',
      city: 'Statewide', player: 'mp3', url: 'https://www.iowapublicradio.org/listening-digitally',
      stream: 'https://classical-stream.iowapublicradio.org/Classical.mp3',
      low: 'https://classical-stream.iowapublicradio.org/ClassicalLow.mp3' },
    // These broadcasters publish direct listening streams; play remains browser-to-publisher,
    // with no rebroadcast, caching, third-party advertisements or invented "now playing".
    { id: 'kexp', state: 'WA', name: 'KEXP', frequency: '90.3 FM', type: 'Independent Music',
      city: 'Seattle', player: 'mp3', url: 'https://www.kexp.org/mobile/kexp-livestreams/',
      stream: 'https://kexp.streamguys1.com/kexp160.aac',
      low: 'https://kexp.streamguys1.com/kexp64.aac' },
    { id: 'jazz24', state: 'WA', name: 'Jazz24', frequency: 'Online', type: 'Jazz',
      city: 'KNKX Public Radio', player: 'mp3', url: 'https://www.jazz24.org/streaming-links/',
      stream: 'https://knkx-live-a.edge.audiocdn.com/6285_128k',
      low: 'https://knkx-live-a.edge.audiocdn.com/6285_64k' },
    { id: 'knkx', state: 'WA', name: 'KNKX Public Radio', frequency: '88.5 FM', type: 'News & Jazz',
      city: 'Seattle–Tacoma', player: 'mp3', url: 'https://www.knkx.org/stream-knkx-online',
      stream: 'https://knkx-live-a.edge.audiocdn.com/6284_128k',
      low: 'https://knkx-live-a.edge.audiocdn.com/6284_64k' },
    { id: 'wfmu', state: 'NJ', name: 'WFMU Freeform', frequency: '91.1 FM', type: 'Freeform Music',
      city: 'New Jersey', player: 'mp3', url: 'https://www.wfmu.org/audiostream.shtml',
      stream: 'https://stream0.wfmu.org/freeform-128k' },
    { id: 'radiomv-english', state: 'WORLD', name: 'RadioMV English', frequency: 'Online', type: 'Christian Radio',
      city: 'Worldwide', player: 'mp3', url: 'https://player.radiomv.com/english.html',
      stream: 'https://stream.radiomv.com/stream/english.mp3' },
    { id: 'radiomv-espanol', state: 'WORLD', name: 'RadioMV Español', frequency: 'Online', type: 'Christian Radio · Spanish',
      city: 'Worldwide', player: 'mp3', url: 'https://player.radiomv.com/spanish.html',
      stream: 'https://stream.radiomv.com/stream/spanish.mp3' },
    { id: 'radiomv-deutsch', state: 'WORLD', name: 'RadioMV Deutsch', frequency: 'Online', type: 'Christian Radio · German',
      city: 'Worldwide', player: 'mp3', url: 'https://player.radiomv.com/german.html',
      stream: 'https://stream.radiomv.com/stream/german.mp3' },
    { id: 'radiomv-slavic', state: 'WORLD', name: 'RadioMV Slavic', frequency: 'Online', type: 'Christian Radio · Slavic',
      city: 'Worldwide', player: 'mp3', url: 'https://player.radiomv.com/slavic.html',
      stream: 'https://stream.radiomv.com/stream/slavic.mp3' }
  ];

  const STATE_NAMES = Object.freeze({
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
  });

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
    '#iowaLiveRadio .ilr-state-picker{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:15px;font-weight:750;letter-spacing:.015em;margin:0 0 14px;color:#294653}',
    '#iowaLiveRadio .ilr-state-select{min-height:46px;max-width:100%;flex:1 1 180px;padding:8px 12px;background:#fff;color:#203442;border:1px solid #afc2cb;border-radius:11px;font:inherit;font-size:16px}',
    '#iowaLiveRadio .ilr-card[hidden]{display:none}',
    '#iowaLiveRadio .ilr-empty{margin:3px 0 8px;padding:14px;border:1px solid #d5e0e5;border-radius:11px;color:#344c5a;font-size:15px;line-height:1.5}',
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
  shell.setAttribute('aria-label', 'Iowa and worldwide live radio station carousel');
  const head = make('header', 'ilr-head');
  const copy = make('div');
  copy.append(make('h2', '', '📻 Live Radio · State by State'), make('p','ilr-caption','Browse 15 source-backed broadcasts · filter across all 50 states'));
  const arrows = make('div','ilr-arrows');
  const previous = make('button','ilr-arrow','‹');
  previous.type = 'button';
  previous.setAttribute('aria-label','Previous stations');
  const next = make('button','ilr-arrow','›');
  next.type = 'button';
  next.setAttribute('aria-label','Next stations');
  arrows.append(previous,next);
  head.append(copy,arrows);
  const stateWrap = make('label','ilr-state-picker','Choose a state');
  const stateFilter = make('select','ilr-state-select');
  stateFilter.id = 'iowaLiveRadioState';
  stateFilter.setAttribute('aria-label','Filter radio stations by state');
  const option = (code,name) => {
    const o = make('option','',name);
    o.value = code;
    return o;
  };
  stateFilter.appendChild(option('all','All sourced stations'));
  for (const [code,name] of Object.entries(STATE_NAMES)) stateFilter.appendChild(option(code,name));
  stateFilter.appendChild(option('WORLD','Worldwide'));
  stateWrap.appendChild(stateFilter);
  const empty = make('p','ilr-empty');
  empty.hidden = true;
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
  shell.append(head,stateWrap,track,empty,status,viewer,stop,audio);
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

  function appendStationCard(station) {
    const card = make('article','ilr-card');
    card.dataset.station = station.id;
    card.dataset.state=station.state;
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
  for (const station of stations) appendStationCard(station);
  function showState(code) {
    let available = 0;
    for (const station of stations) {
      const match = code === 'all' || code === station.state;
      const card = cards.get(station.id);
      card.hidden = !match;
      if (match) available += 1;
    }
    const label = STATE_NAMES[code] || (code === 'WORLD' ? 'Worldwide' : 'all states');
    empty.hidden = available !== 0;
    // Changing the state filter must not stop currently playing audio.
    empty.textContent = available ? '' : 'No sourced stations are listed yet for '+label+'. Your selected station keeps playing in background.';
    track.scrollLeft = 0;
  }
  stateFilter.addEventListener('change',()=>showState(stateFilter.value));
  showState('all');

  // D1 directory is additive. Static published broadcaster streams remain usable
  // while the API is unavailable; no unverified provider claims are displayed.
  const validHttps = value => {
    if (typeof value !== 'string') return false;
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && !u.username && !u.password;
    } catch { return false; }
  };
  const safeText = (value,max=100) =>
    typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;
  function normalizeDirectoryStation(row) {
    if (!row || !safeText(row.id,70) || !/^[a-z0-9-]+$/.test(row.id) || !safeText(row.name)) return null;
    if (!safeText(row.state,5) || (!(row.state in STATE_NAMES) && row.state !== 'WORLD')) return null;
    if (!safeText(row.frequency,50) || !safeText(row.type,65) || !safeText(row.city,80)) return null;
    if (!['mp3','iheart'].includes(row.player) || !validHttps(row.url)) return null;
    if (row.player === 'mp3' && !validHttps(row.stream)) return null;
    if (row.low && !validHttps(row.low)) return null;
    if (row.schedule && !validHttps(row.schedule)) return null;
    // The DB is curated and reviewed, not a user-submitted URL playback proxy.
    return {id:row.id,name:row.name,state:row.state,frequency:row.frequency,
      type:row.type,city:row.city,player:row.player,url:row.url,
      stream:row.stream||null,low:row.low||null,schedule:row.schedule||null};
  }
  async function loadDirectory() {
    try {
      const response = await fetch('/api/radio-stations?state=all',
        {cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(8500)});
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.schemaVersion !== 1 || !Array.isArray(payload.stations)) return;
      let added = 0;
      for (const raw of payload.stations.slice(0,250)) {
        const station = normalizeDirectoryStation(raw);
        if (!station || stations.some(item=>item.id===station.id)) continue;
        stations.push(station);
        appendStationCard(station);
        added++;
      }
      if (added) {
        showState(stateFilter.value);
        copy.querySelector('.ilr-caption').textContent =
          'Browse '+stations.length+' sourced broadcasts · filter across all 50 states';
      }
    } catch {
      // No false success state and no loss of static fallback broadcasts.
    }
  }
  loadDirectory();

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
