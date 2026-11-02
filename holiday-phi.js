/* Holiday Phi: a single Thanksgiving + Christmas quick card.
 * Sourced media, local project packages, real Code Phi/Create Phi handoffs.
 * No local action claims a wallet mint or a published website. */
(function () {
'use strict';
const host = document.getElementById('holidayPhi');
if (!host) return;
const pkg = () => window.PhiProjectPackage;
const url = value => {
  try {
    const u = new URL(String(value || ''), location.origin);
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : '';
  } catch (_) { return ''; }
};
const create = (tag, text, cls) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = String(text);
  if (cls) el.className = cls;
  return el;
};
const add = (parent, child) => { parent.append(child); return child; };
const btn = (parent, title, callback) => {
  const b = add(parent, create('button', title));
  b.type = 'button';
  b.addEventListener('click', callback);
  return b;
};
function sourceLink(parent, label, href) {
  const target = url(href);
  if (!target) return;
  const a = add(parent, create('a', label, 'holiday-link'));
  a.href = target;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}
const state = { holiday: 'thanksgiving', type: 'image', index: 0, data: null,
  results: { thanksgiving: { image: [], video: [] }, christmas: { image: [], video: [] } } };
const card = add(host, create('article', undefined, 'holiday-card'));
card.id = 'holidayphi';
card.setAttribute('aria-label', 'Thanksgiving and Christmas media and website builder');
const header = add(card, create('header', undefined, 'holiday-header'));
add(header, create('span', 'INFINITY 2026® · HOLIDAY STUDIO', 'holiday-eyebrow'));
add(header, create('h2', 'Christmas & Thanksgiving'));
add(header, create('p', 'Browse real holiday images and videos, collect the ones you like, then make a website with Code Phi or create media with Create Phi.', 'holiday-intro'));
const tabs = add(card, create('div', undefined, 'holiday-tabs'));
tabs.setAttribute('role', 'group');
tabs.setAttribute('aria-label', 'Choose holiday');
const thanksgiving = btn(tabs, 'Thanksgiving', () => switchHoliday('thanksgiving'));
const christmas = btn(tabs, 'Christmas', () => switchHoliday('christmas'));
const subtitle = add(card, create('p', '', 'holiday-subtitle'));
const searchRow = add(card, create('div', undefined, 'holiday-search'));
const query = add(searchRow, create('input'));
query.type = 'search';
query.maxLength = 110;
query.setAttribute('aria-label', 'Search holiday images or videos');
const findButton = btn(searchRow, 'Search images', () => runSearch());
const typeRow = add(card, create('div', undefined, 'holiday-types'));
typeRow.setAttribute('role', 'group');
typeRow.setAttribute('aria-label', 'Choose media type');
const imageButton = btn(typeRow, 'Images', () => setType('image'));
const videoButton = btn(typeRow, 'Videos', () => setType('video'));
const status = add(card, create('p', '', 'holiday-status'));
status.setAttribute('role', 'status');
const featured = add(card, create('section', undefined, 'holiday-feature'));
featured.setAttribute('aria-label', 'Selected holiday media');
const navigation = add(card, create('div', undefined, 'holiday-navigation'));
btn(navigation, '← Previous', () => move(-1));
const progress = add(navigation, create('span', '', 'holiday-progress'));
btn(navigation, 'Next →', () => move(1));
const mediaActions = add(card, create('div', undefined, 'holiday-actions'));
btn(mediaActions, '＋ Collect selection', collectCurrent);
const starButton = btn(mediaActions, '☆ Star', toggleStar);
btn(mediaActions, 'Share', shareHoliday);
const guide = add(card, create('section', undefined, 'holiday-build'));
add(guide, create('h3', 'Make your own holiday website'));
add(guide, create('p', '1. Start a project (or use your selected project). 2. Collect an image or video. 3. Open Code Phi to build and preview the website. Create Phi opens the asset studio.', 'holiday-instructions'));
const sitePrompt = add(guide, create('input'));
sitePrompt.type = 'text';
sitePrompt.maxLength = 110;
sitePrompt.placeholder = 'e.g. Family Thanksgiving recipe and photo website';
sitePrompt.setAttribute('aria-label', 'Title or idea for your new website');
const projectActions = add(guide, create('div', undefined, 'holiday-actions'));
btn(projectActions, '＋ Start holiday project', () => {
  const newProject = pkg()?.newToken(sitePrompt.value.trim() || 'Thanksgiving & Christmas website');
  report(newProject ? 'New local project started. Collect a source, then build the website.' : 'Local project storage is unavailable.');
  refreshProject();
});
btn(projectActions, 'Build website in Code Phi', () => openBuilder('code'));
btn(projectActions, 'Create assets in Create Phi', () => openBuilder('create'));
sourceLink(projectActions, 'Open project workspace', location.origin + '/project-workspace/');
const projectStatus = add(guide, create('p', '', 'holiday-status'));
projectStatus.setAttribute('role', 'status');
add(guide, create('p', 'Project drafts and uploaded media stay on this device until separately published. No wallet coins are minted by these controls.', 'holiday-note'));
const uploadLabel = add(guide, create('label', 'Add your own holiday photo'));
const upload = add(uploadLabel, create('input'));
upload.type = 'file';
upload.accept = 'image/png,image/jpeg,image/webp';
upload.setAttribute('aria-label', 'Add original image from this device');
upload.addEventListener('change', async () => {
  const file = upload.files && upload.files[0];
  if (!file) return;
  upload.disabled = true;
  report('Saving your image to the local holiday project…');
  try {
    const p = ensureProject();
    if (!p || !pkg()?.captureFile) throw Error('Project image storage is unavailable');
    const saved = await pkg().captureFile(file, 'holidayphi', p.id);
    report(saved.ok ? 'Your photo was saved to the selected project.' : saved.reason || 'Image was not saved.');
  } catch (error) { report(String(error.message || error)); }
  finally { upload.disabled = false; upload.value = ''; refreshProject(); }
});
const studio = add(card, create('details', undefined, 'holiday-studio'));
add(studio, create('summary', 'Create artwork & a short video reel'));
const artPrompt = add(studio, create('textarea'));
artPrompt.rows = 3;
artPrompt.placeholder = 'Describe an original holiday poster or invitation to generate…';
artPrompt.setAttribute('aria-label', 'Holiday artwork description');
const artStatus = add(studio, create('p', '', 'holiday-status'));
artStatus.setAttribute('role', 'status');
const generated = add(studio, create('img', undefined, 'holiday-generated'));
generated.alt = 'Newly generated holiday artwork';
generated.hidden = true;
btn(studio, 'Generate artwork', async () => {
  if (!artPrompt.value.trim()) { artStatus.textContent = 'Describe your artwork first.'; return; }
  const renderer = window.PhiVisualRender;
  if (!renderer) { artStatus.textContent = 'Image renderer is not loaded; use Create Phi instead.'; return; }
  const p = ensureProject();
  if (!p) { artStatus.textContent = 'Project storage unavailable.'; return; }
  artStatus.textContent = 'Generating image with the available image renderer…';
  try {
    const description = artPrompt.value.trim().slice(0, 3000);
    const wording = window.PhiImageLanguage?.infer(description, 'Advertisement', '')?.text || '';
    const plan = await renderer.direct({
      description, mode: 'Advertisement', vision: '', story: '', search: '',
      hasUpload: false, designFile: false, exactText: wording, preferences: ''
    }).catch(() => description);
    const result = await renderer.render({
      description, mode: 'Advertisement', prompt: plan, exactText: wording
    });
    await renderer.validate(result.src);
    const output = wording ? await renderer.composeExactText(result.src, wording, 'Advertisement') : result.src;
    generated.src = output;
    generated.hidden = false;
    const blob = await renderer.asBlob(output);
    const saved = await pkg().captureFile(
      new File([blob], 'holiday-artwork.png', { type: blob.type }), 'holidayphi', p.id
    );
    artStatus.textContent = 'Artwork rendered. ' + (saved.ok ? 'Added to your project.' : 'Not saved in the project: ' + saved.reason);
  } catch (error) { artStatus.textContent = 'Image generation failed: ' + String(error.message || error); }
  refreshProject();
});
const reelMount = add(studio, create('div', undefined, 'holiday-reel'));
function report(message) { status.textContent = message; }
function activeHoliday() { return state.data && state.data.holidays[state.holiday]; }
function choices() {
  const holiday = activeHoliday();
  if (!holiday) return [];
  return (state.type === 'image' ? holiday.images : holiday.videos)
    .concat(state.results[state.holiday][state.type]);
}
function selected() {
  const items = choices();
  return items.length ? items[state.index % items.length] : null;
}
function refreshProject() {
  const active = pkg()?.active();
  projectStatus.textContent = active
    ? 'Project: ' + active.title + ' · ' + active.assets.length + ' collected items (local draft)'
    : 'No project selected. Start one above; collecting will create a local draft.';
}
function ensureProject() {
  return pkg()?.active() || pkg()?.newToken('Thanksgiving & Christmas website');
}
function capture(item, kind) {
  const p = ensureProject();
  if (!p) return { ok: false, reason: 'Project package unavailable.' };
  return pkg().capture({
    kind: kind, title: item.title, sourceUrl: item.source,
    imageUrl: kind === 'image' ? item.src : item.imageUrl,
    description: item.description || activeHoliday()?.subtitle || '',
    license: item.license || item.rightsNote || '', year: item.year,
    originCard: 'holidayphi'
  }, p.id);
}
function collectCurrent() {
  const item = selected();
  if (!item) return report('Choose an image or video to collect.');
  const result = capture(item, state.type);
  report(result.ok ? (result.duplicate ? 'Already collected in this project.' : 'Added source to your project.') : result.reason);
  refreshProject();
}
function openBuilder(mode) {
  if (!pkg()?.seed) return report('The project package connector is missing.');
  const item = selected();
  if (!ensureProject()) return report('Unable to start a local website project.');
  // Include the selected source if no other source has been collected yet.
  if (!pkg().active().assets.length && item) {
    const result = capture(item, state.type);
    if (!result.ok) return report('Cannot save selected media: ' + result.reason);
  }
  const destination = pkg().seed(mode);
  if (!destination || !destination.startsWith('/omni-phi/code/')) {
    return report('Code Phi could not prepare this project.');
  }
  report('Opening the real ' + (mode === 'code' ? 'Code Phi website editor' : 'Create Phi asset studio') + ' with your project sources.');
  location.assign(destination);
}
function toggleStar() {
  const key = 'holidayphi:' + state.holiday;
  let stars = [];
  try { stars = JSON.parse(localStorage.getItem('quantaphi:holidayStars:v1') || '[]'); }
  catch (_) { stars = []; }
  if (!Array.isArray(stars)) stars = [];
  const next = stars.includes(key) ? stars.filter(x => x !== key) : stars.concat(key);
  try { localStorage.setItem('quantaphi:holidayStars:v1', JSON.stringify(next)); }
  catch (_) { return report('Star could not be saved on this device.'); }
  paintStar();
  report('Star preference saved locally. No wallet reward claimed.');
}
function paintStar() {
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem('quantaphi:holidayStars:v1') || '[]'); }
  catch (_) { saved = []; }
  starButton.textContent = Array.isArray(saved) && saved.includes('holidayphi:' + state.holiday) ? '★ Starred' : '☆ Star';
}
async function shareHoliday() {
  const address = location.origin + '/#holidayphi';
  try {
    if (navigator.share) { await navigator.share({ title: 'Christmas & Thanksgiving', url: address }); report('Share completed. No automatic wallet award was made.'); }
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(address); report('Card link copied.'); }
    else report('Share this link: ' + address);
  } catch (error) { report(error.name === 'AbortError' ? 'Share canceled.' : 'Sharing failed.'); }
}
function switchHoliday(name) {
  if (!state.data?.holidays[name]) return;
  state.holiday = name;
  state.index = 0;
  const holiday = activeHoliday();
  subtitle.textContent = holiday.subtitle;
  query.value = holiday.searchHint;
  thanksgiving.setAttribute('aria-pressed', String(name === 'thanksgiving'));
  christmas.setAttribute('aria-pressed', String(name === 'christmas'));
  paintStar();
  renderSelection();
  report('Showing ' + holiday.name + ' media. Search for more real sources.');
}
function setType(type) {
  state.type = type;
  state.index = 0;
  imageButton.setAttribute('aria-pressed', String(type === 'image'));
  videoButton.setAttribute('aria-pressed', String(type === 'video'));
  findButton.textContent = type === 'image' ? 'Search images' : 'Search videos';
  renderSelection();
}
function move(delta) {
  const count = choices().length;
  state.index = count ? (state.index + delta + count) % count : 0;
  renderSelection();
}
function renderSelection() {
  featured.replaceChildren();
  const m = selected(), items = choices();
  progress.textContent = items.length ? (state.index + 1) + ' / ' + items.length : '0 / 0';
  if (!m) {
    add(featured, create('p', 'No media in this category yet. Try searching for more.'));
    return;
  }
  const image = url(state.type === 'image' ? m.src : m.imageUrl);
  if (image) {
    const img = add(featured, create('img', undefined, 'holiday-image'));
    img.src = image;
    img.alt = m.title;
    img.loading = 'lazy';
    img.addEventListener('error', () => { img.hidden = true; report('This image could not be loaded. Its source link is still available.'); }, { once: true });
  }
  add(featured, create('h3', m.title));
  if (m.description) add(featured, create('p', m.description));
  if (state.type === 'video' && url(m.embedUrl)?.startsWith('https://archive.org/embed/')) {
    btn(featured, '▶ Play here', () => {
      const player = add(featured, create('iframe'));
      player.src = m.embedUrl;
      player.title = m.title + ' · Archive player';
      player.allow = 'fullscreen; autoplay; picture-in-picture';
      player.allowFullscreen = true;
      player.loading = 'eager';
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      playButton.disabled = true;
    });
    const playButton = featured.querySelector('button');
  }
  add(featured, create('p', m.license || m.rightsNote || 'Rights depend on the original uploader and item. Review before reusing.', 'holiday-rights'));
  sourceLink(featured, 'Original source', m.source);
}
function safeArchiveId(id) { return /^[A-Za-z0-9_.-]{1,150}$/.test(String(id || '')); }
function strip(value) {
  return String(Array.isArray(value) ? value[0] || '' : value || '')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 450);
}
async function searchImages(words) {
  const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
  const params = endpoint.searchParams;
  params.set('action', 'query');
  params.set('generator', 'search');
  params.set('gsrsearch', words);
  params.set('gsrnamespace', '6');
  params.set('gsrlimit', '16');
  params.set('prop', 'imageinfo');
  params.set('iiprop', 'url|mime|extmetadata');
  params.set('iiurlwidth', '960');
  params.set('format', 'json');
  params.set('origin', '*');
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('Wikimedia search unavailable (' + response.status + ')');
  const result = await response.json();
  return Object.values(result.query?.pages || {}).flatMap(page => {
    const meta = page.imageinfo?.[0];
    if (!meta || !/^image\/(jpeg|png|webp)$/.test(meta.mime || '')) return [];
    const src = url(meta.thumburl || meta.url);
    const source = url(meta.descriptionurl);
    if (!src || !source || !source.startsWith('https://commons.wikimedia.org/')) return [];
    return [{ title: strip(page.title.replace(/^File:/, '')), src, source,
      license: strip(meta.extmetadata?.LicenseShortName?.value || 'Check license and creator at Wikimedia Commons') }];
  });
}
async function searchVideos(words) {
  const endpoint = new URL('https://archive.org/advancedsearch.php');
  endpoint.searchParams.set('q', 'mediatype:movies AND (title:(' + words.replace(/[^\w\s-]/g, '').trim().split(/\s+/).join(' OR ') + ') OR subject:(' + words.replace(/[^\w\s-]/g, '').trim().split(/\s+/).join(' OR ') + '))');
  endpoint.searchParams.set('output', 'json');
  endpoint.searchParams.set('rows', '16');
  ['identifier', 'title', 'description', 'year'].forEach(x => endpoint.searchParams.append('fl[]', x));
  endpoint.searchParams.append('sort[]', 'downloads desc');
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('Archive search unavailable (' + response.status + ')');
  const data = await response.json();
  return (data.response?.docs || []).filter(x => safeArchiveId(x.identifier)).map(x => ({
    title: strip(x.title) || x.identifier, year: Number(x.year) || undefined,
    source: 'https://archive.org/details/' + x.identifier,
    embedUrl: 'https://archive.org/embed/' + x.identifier,
    imageUrl: 'https://archive.org/services/img/' + x.identifier,
    description: strip(x.description) || 'Internet Archive catalog video. See the original listing for details.',
    rightsNote: 'Search result; rights and embeddability are not verified. Check the original upload.'
  }));
}
async function runSearch() {
  const holiday = activeHoliday();
  if (!holiday) return;
  const term = (query.value.trim() || holiday.searchHint).slice(0, 110);
  const requestedHoliday = state.holiday, requestedType = state.type;
  findButton.disabled = true;
  report('Searching real ' + holiday.name + ' ' + requestedType + ' sources…');
  try {
    const found = requestedType === 'image' ? await searchImages(term) : await searchVideos(term);
    // Late results must not switch the visitor to another holiday or media type.
    const curated = requestedType === 'image' ? holiday.images : holiday.videos;
    const known = new Set(curated.map(x => x.source));
    const distinct = found.filter(x => x.source && !known.has(x.source) && (known.add(x.source), true));
    state.results[requestedHoliday][requestedType] = distinct;
    if (state.holiday === requestedHoliday && state.type === requestedType) {
      state.index = curated.length;
      if (!distinct.length) state.index = 0;
      renderSelection();
    }
    report(distinct.length + ' sourced results for ' + holiday.name + '. Originals stay linked; source rights vary.');
  } catch (error) {
    report('Live search failed: ' + String(error.message || error) + '. The curated sources remain available.');
  } finally { findButton.disabled = false; }
}
window.addEventListener('phi-projects:changed', refreshProject);
fetch('/holiday-phi-content.json?v=20261102-holidays1', { cache: 'no-cache' })
 .then(response => { if (!response.ok) throw Error('Holiday catalog unavailable'); return response.json(); })
 .then(data => {
    if (data.schema !== 'quantaphi.holiday-phi/v1' || !data.holidays?.thanksgiving || !data.holidays?.christmas) throw Error('Invalid holiday catalog');
    state.data = data;
    setType('image');
    switchHoliday('thanksgiving');
    refreshProject();
    if (window.PhiCinemaReel?.mount) {
      window.PhiCinemaReel.mount(reelMount, {
        title: 'Christmas & Thanksgiving',
        current: () => state.type === 'video' ? selected() : activeHoliday()?.videos?.[0]
      });
    }
 })
 .catch(error => report('Holiday card could not load: ' + error.message));
})();
