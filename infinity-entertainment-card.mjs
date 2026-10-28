import {mountCardActions} from './quanta-card-actions.mjs';
import {chooseEntertainmentProgram} from './infinity-entertainment-data.mjs';

const node = (tag, text, cls) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
};

export function mountEntertainmentCard(host, catalog = window.PhiTVPrograms) {
  if (!host || host.dataset.mounted) return false;
  const card = node('article', undefined, 'iqc-card iac-card iec-card');
  Object.assign(card.dataset, {sourceId: 'infinity-entertainment', sourceName: 'Infinity Movies & Entertainment', sourceReady: 'true'});
  const heading = node('header', undefined, 'iac-heading');
  heading.append(node('span', '∞ Infinity · Entertainment', 'iac-badge'), node('small', 'MOVIES · SCRIPTED TV', 'iqc-kind'));
  const media = node('div', undefined, 'iec-media');
  const preview = node('img');
  preview.alt = 'Current Infinity TV entertainment selection';
  preview.loading = 'lazy';
  preview.referrerPolicy = 'no-referrer';
  const screen = node('div', undefined, 'iec-screen');
  screen.hidden = true;
  media.append(preview, screen);
  const body = node('div', undefined, 'iac-content');
  body.append(node('h2', 'Movies & Entertainment'),
    node('p', 'Discover movie and scripted-TV selections already available through Infinity TV. No subscription required by this card; playback depends on the original provider.', 'iac-intro'));
  const selector = node('div', undefined, 'iec-selector');
  const status = node('p', '', 'iac-status');
  status.setAttribute('role', 'status');
  const watch = node('button', '▶ Play selected title', 'iec-play');
  watch.type = 'button';
  const stop = node('button', '■ Stop', 'iec-stop');
  stop.type = 'button';
  stop.hidden = true;
  const title = node('h3', '', 'iec-title');
  let selected = 'starquest';
  let activeFrame = null;
  const buttons = {};
  function stopPlayback() {
    if (activeFrame) activeFrame.remove();
    activeFrame = null;
    screen.hidden = true;
    preview.hidden = false;
    stop.hidden = true;
    watch.hidden = false;
  }
  function select(channel) {
    stopPlayback();
    selected = channel;
    for (const [key, button] of Object.entries(buttons)) button.setAttribute('aria-pressed', String(key === channel));
    const program = chooseEntertainmentProgram(catalog, channel);
    if (!program) {
      title.textContent = channel === 'starquest' ? 'Movies' : 'Scripted TV';
      preview.removeAttribute('src');
      preview.hidden = true;
      watch.disabled = true;
      status.textContent = 'No verified playable title is currently available. Open Infinity TV to browse its existing channels.';
      return;
    }
    preview.hidden = false;
    preview.src = program.poster;
    title.textContent = program.title + (program.year ? ' · ' + program.year : '');
    watch.disabled = false;
    status.textContent = 'Ready to play from the original video provider. Availability and rights remain with that provider.';
  }
  for (const [key, label] of [['starquest', 'Movies'], ['chiller', 'Scripted TV']]) {
    const button = node('button', label, 'iec-choice');
    button.type = 'button';
    button.addEventListener('click', () => select(key));
    buttons[key] = button;
    selector.append(button);
  }
  watch.addEventListener('click', () => {
    const program = chooseEntertainmentProgram(catalog, selected);
    if (!program) {select(selected); return;}
    stopPlayback();
    const frame = node('iframe');
    frame.title = program.title + ' — original video provider';
    frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.loading = 'eager';
    frame.src = 'https://www.youtube-nocookie.com/embed/' + program.videoId + '?controls=1&playsinline=1';
    activeFrame = frame;
    screen.append(frame);
    screen.hidden = false;
    preview.hidden = true;
    watch.hidden = true;
    stop.hidden = false;
    status.textContent = 'Use the video controls to play. If this source blocks embedding, choose another selection in Infinity TV.';
  });
  stop.addEventListener('click', stopPlayback);
  // Oracle moves the original node between the active stage and a hidden bank.
  // Remove the iframe when leaving the card so audio never keeps playing offscreen.
  const stage = document.getElementById('oracleCardStage');
  if (stage && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {if (activeFrame && !stage.contains(card)) stopPlayback();})
      .observe(stage, {childList: true});
  }
  document.addEventListener('visibilitychange', () => {if (document.hidden) stopPlayback();});
  const open = node('a', 'Browse Infinity TV channels ↗', 'iac-official');
  open.href = '/#phiChannelCards';
  body.append(selector, title, watch, stop, status, open,
    node('p', 'This card reuses existing Infinity TV program references. It does not import Netflix accounts, claim Hollywood studio partnerships, or license new productions.', 'iac-provenance'));
  const actions = node('div');
  mountCardActions(actions, {id: 'infinity-entertainment', name: 'Infinity Movies & Entertainment',
    category: 'Movies & TV', route: '/?card=source-infinity-entertainment',
    shareImage: '/TV-Database/assets/starquest-share-card.jpg',
    shareDescription: 'Watch existing Infinity TV movie and scripted entertainment selections in the Infinity entertainment card.'}, {showSearch: false});
  body.append(actions);
  card.append(heading, media, body);
  host.replaceChildren(card);
  host.dataset.mounted = 'true';
  select(selected);
  window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
  return true;
}

if (typeof document !== 'undefined') {
  const mount = () => mountEntertainmentCard(document.getElementById('infinityEntertainmentCards'));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
}
