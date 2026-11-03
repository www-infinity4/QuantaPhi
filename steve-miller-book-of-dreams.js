/* Steve Miller Band — Book of Dreams (1977).
 * Use YouTube's own player and playlist; do not download or proxy music.
 * Sounded autoplay is attempted only when this original Oracle card is active.
 * Browser autoplay rules or video-owner restrictions may require a tap.
 */
(() => {
  'use strict';
  const root = document.getElementById('steveMillerBookOfDreamsCard');
  if (!root || root.dataset.smbMounted === 'true') return;
  root.dataset.smbMounted = 'true';
  root.classList.add('smb-album-card');
  const ALBUM_PLAYLIST_ID = 'PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k';
  const FIRST_VIDEO_ID = 'D6KCZXzLdVM';
  const playlistURL = 'https://www.youtube.com/playlist?list=' + ALBUM_PLAYLIST_ID;

  const style = document.createElement('style');
  style.id = 'smb-album-player-style';
  style.textContent = [
    '#steveMillerBookOfDreamsCard{box-sizing:border-box;padding:16px;border:1px solid #d4d9dc;border-radius:17px;background:#fff;color:#24343e;}',
    '#steveMillerBookOfDreamsCard .smb-heading{margin:0 0 4px;font-size:20px;font-weight:850;line-height:1.25;color:#203b45;}',
    '#steveMillerBookOfDreamsCard .smb-subtitle{margin:0 0 12px;color:#52646b;font-size:13px;line-height:1.4;}',
    '#steveMillerBookOfDreamsCard .smb-player-row{display:flex;gap:10px;align-items:center;padding:9px 0;}',
    '#smbAlbumPlay{flex:none;width:48px;height:48px;min-height:48px;border:0;border-radius:50%;padding:0;display:grid;place-items:center;background:#136a76;color:#fff;font-size:22px;cursor:pointer;}',
    '#smbAlbumPlay:focus-visible,#smbAlbumOpen:focus-visible{outline:3px solid #8050b4;outline-offset:3px;}',
    '#steveMillerBookOfDreamsCard .smb-status{flex:1;min-width:0;color:#43646a;font-size:12px;line-height:1.5;overflow-wrap:anywhere;}',
    '#steveMillerBookOfDreamsCard .smb-player-frame{position:relative;aspect-ratio:16/9;width:100%;border-radius:12px;overflow:hidden;background:#10181b;}',
    '#steveMillerBookOfDreamsCard .smb-player-frame>iframe{display:block;width:100%;height:100%;border:0;}',
    '#steveMillerBookOfDreamsCard .smb-player-placeholder{display:grid;place-items:center;height:100%;color:#e5eff0;text-align:center;padding:14px;font-size:14px;}',
    '#smbAlbumOpen{display:inline-flex;align-items:center;min-height:44px;padding:8px 12px;margin-top:10px;border:1px solid #b5d6d7;border-radius:11px;background:#fff;color:#155164;text-decoration:none;font-weight:800;font-size:13px;}'
  ].join('');
  document.head.appendChild(style);

  const create = (tag, cls, txt) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (txt !== undefined) node.textContent = txt;
    return node;
  };
  const heading = create('h2', 'smb-heading', 'Steve Miller');
  const subtitle = create('p', 'smb-subtitle', 'Book of Dreams · 1977 · Full album on YouTube');
  const row = create('div', 'smb-player-row');
  const button = create('button', '', '▶');
  button.id = 'smbAlbumPlay';
  button.type = 'button';
  button.setAttribute('aria-label', 'Play Steve Miller Book of Dreams');
  button.setAttribute('aria-pressed', 'false');
  const status = create('span', 'smb-status', 'Ready · opens the full YouTube album when you reach this card');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  row.append(button, status);
  const frame = create('div', 'smb-player-frame');
  frame.id = 'smbAlbumFrame';
  const placeholder = create('div', 'smb-player-placeholder', 'Book of Dreams · YouTube album player');
  frame.appendChild(placeholder);
  const open = create('a', '', 'Open full album on YouTube ↗');
  open.id = 'smbAlbumOpen';
  open.href = playlistURL;
  open.target = '_blank';
  open.rel = 'noopener noreferrer';
  root.append(heading, subtitle, row, frame, open);

  let player = null;
  let ready = false;
  let playing = false;
  let pending = false;

  function isActive() {
    return !document.hidden && root.isConnected && !!root.closest('#oracleCardStage');
  }
  function setPlaying(value) {
    playing = !!value;
    button.textContent = playing ? 'Ⅱ' : '▶';
    button.setAttribute('aria-label', playing ? 'Pause Steve Miller Book of Dreams' : 'Play Steve Miller Book of Dreams');
    button.setAttribute('aria-pressed', String(playing));
  }
  function loadYouTube() {
    if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve(window.YT);
    if (window.__smbYouTubeAPIPromise) return window.__smbYouTubeAPIPromise;
    const promise = new Promise((resolve, reject) => {
      const earlier = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof earlier === 'function') {
          try { earlier(); } catch (error) { console.warn('Previous YouTube callback failed', error); }
        }
        if (window.YT && typeof window.YT.Player === 'function') resolve(window.YT);
        else reject(new Error('YouTube player did not initialize'));
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('YouTube could not load'));
      document.head.appendChild(script);
    });
    window.__smbYouTubeAPIPromise = promise;
    return promise;
  }
  function autoplayIfActive() {
    if (!isActive()) return;
    if (player && ready) {
      status.textContent = 'Starting album · if sound is blocked, tap ▶';
      player.playVideo();
      return;
    }
    if (pending || player) return;
    pending = true;
    status.textContent = 'Loading the full album from YouTube…';
    loadYouTube().then(yt => {
      if (!isActive()) return;
      placeholder.remove();
      player = new yt.Player(frame.id, {
        videoId: FIRST_VIDEO_ID,
        width: '100%',
        height: '100%',
        playerVars: {
          listType: 'playlist',
          list: ALBUM_PLAYLIST_ID,
          autoplay: 1,
          playsinline: 1,
          controls: 1,
          origin: window.location.origin
        },
        events: {
          onReady() {
            ready = true;
            try {
              player.getIframe().setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
            } catch (_) {}
            if (!isActive()) return;
            status.textContent = 'Starting Book of Dreams · tap ▶ if sound is blocked';
            player.playVideo();
            window.setTimeout(() => {
              if (isActive() && !playing) status.textContent = 'Autoplay blocked or still loading · tap ▶ to play';
            }, 2000);
          },
          onStateChange(event) {
            if (event.data === yt.PlayerState.PLAYING) {
              if (!isActive()) { player.pauseVideo(); return; }
              setPlaying(true);
              status.textContent = 'Playing · Book of Dreams · Steve Miller Band';
            } else if (event.data === yt.PlayerState.PAUSED) {
              setPlaying(false);
              status.textContent = 'Paused · Book of Dreams';
            } else if (event.data === yt.PlayerState.ENDED) {
              setPlaying(false);
              status.textContent = 'Album finished · tap ▶ to replay';
            }
          },
          onError() {
            setPlaying(false);
            status.textContent = 'YouTube playback unavailable here · use Open full album';
          }
        }
      });
    }).catch(() => {
      status.textContent = 'YouTube player unavailable · open the album on YouTube';
      setPlaying(false);
    }).finally(() => { pending = false; });
  }
  button.addEventListener('click', () => {
    if (!isActive()) return;
    if (!ready || !player) { autoplayIfActive(); return; }
    if (playing) {
      player.pauseVideo();
      setPlaying(false);
      status.textContent = 'Paused · Book of Dreams';
    } else {
      status.textContent = 'Starting album · waiting for YouTube';
      player.playVideo();
    }
  });
  root.addEventListener('oracle:activate', () => autoplayIfActive());
  document.addEventListener('oracle:card-deactivated', event => {
    if (event.detail?.id !== root.id) return;
    if (player && ready) player.pauseVideo();
    setPlaying(false);
    status.textContent = 'Paused · return to this card to play';
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (player && ready) player.pauseVideo();
    setPlaying(false);
    status.textContent = 'Paused while the page is hidden';
  });
  if (isActive()) autoplayIfActive();
})();
