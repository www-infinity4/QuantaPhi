/* Phi Infinite Book v1: verified, attributed story rotation. No minting on page load. */
(function () {
  'use strict';
  const root = document.getElementById('infiniteBook');
  if (!root) return;
  const SEEN_KEY = 'phi_infinite_book_seen_v1';
  const STAR_KEY = 'phi_infinite_book_favorites_v1';
  const CATALOG_URL = 'infinite-book-catalog.json';
  const E = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const rand = (count) => {
    if (!count) return 0;
    try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % count; }
    catch (_) { return Math.floor(Math.random() * count); }
  };
  const safeRead = (key) => {
    try { const data = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data : []; }
    catch (_) { return []; }
  };
  const safeWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  const trustedUrl = (raw) => { try { const url = new URL(raw); return url.protocol === 'https:' ? url.href : ''; } catch (_) { return ''; } };
  const textSafe = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const storyValid = (story) => story && typeof story.id === 'string' && story.id.length < 120 &&
    textSafe(story.title).length > 5 && textSafe(story.summary).length > 15 &&
    textSafe(story.full).length > 30 && trustedUrl(story.sourceUrl);
  const byId = new Map();
  let catalog = null;
  let current = null;
  let pending = false;
  let favorites = new Set(safeRead(STAR_KEY));
  function cardLayout() {
    root.replaceChildren();
    const header = E('div', 'ib-head');
    header.append(E('strong', '', 'THE INFINITE BOOK OF BIG SECRETS'), E('button', 'ib-next', 'Another secret ↻'));
    header.lastChild.type = 'button'; header.lastChild.dataset.bookAction = 'next';
    const card = E('article', 'ib-story');
    card.append(E('div', 'ib-category'), E('h2', 'ib-title'), E('p', 'ib-summary'));
    const detail = E('details', 'ib-details');
    detail.append(E('summary', '', 'Expand to read the full story'), E('p', 'ib-full'));
    const source = E('a', 'ib-source', 'View original source ↗');
    source.target = '_blank'; source.rel = 'noopener noreferrer';
    detail.append(source);
    const actions = E('div', 'ib-actions');
    for (const [action, label] of [['star', '☆ Star'], ['share', '↗ Share'], ['collect', '+ Collect']]) {
      const button = E('button', 'ib-action', label);
      button.type = 'button'; button.dataset.bookAction = action; actions.append(button);
    }
    const build = E('div', 'ib-build');
    build.append(E('span', '', 'Build this story with'));
    for (const [tool, label] of [['infinity', 'Infinity'], ['omni', 'Omni'], ['quanta', 'QuantaPhi']]) {
      const a = E('a', 'ib-build-link inPageSite', label);
      a.dataset.bookAction = 'build'; a.dataset.bookTool = tool;
      a.dataset.siteTitle = label; a.href = '#'; build.append(a);
    }
    const status = E('p', 'ib-status');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    card.append(detail, actions, build);
    root.append(header, card, status);
  }
  function note(message) { const p = root.querySelector('.ib-status'); if (p) p.textContent = message; }
  function seenIds() { return new Set(safeRead(SEEN_KEY)); }
  function remember(storyId) {
    const seen = safeRead(SEEN_KEY);
    if (!seen.includes(storyId)) { seen.push(storyId); safeWrite(SEEN_KEY, seen); }
  }
  function deepLink(story) {
    const link = new URL(location.href);
    link.searchParams.delete('q'); link.searchParams.delete('from');
    link.searchParams.set('secret', story.id);
    link.hash = 'infiniteBook';
    return link.href;
  }
  function buildUrl(tool, story) {
    const paths = { infinity: '/InfinityPhi/', omni: '/OmniPhi/', quanta: '/' };
    const link = new URL(paths[tool] || '/', location.origin);
    const seed = [story.title, story.summary, 'Source: ' + story.sourceUrl].join('. ').slice(0, 480);
    link.searchParams.set('q', seed);
    link.searchParams.set('story', story.id);
    link.searchParams.set('storySource', story.sourceUrl);
    link.searchParams.set('from', 'infinite-book');
    return link.href;
  }
  function render(story, roll) {
    current = story; remember(story.id);
    root.querySelector('.ib-category').textContent = [
      catalog.sectors.find(s => s.id === story.sector)?.name || 'Surprising history',
      story.status || 'sourced story',
      story.year || ''
    ].filter(Boolean).join(' · ');
    root.querySelector('.ib-title').textContent = story.title;
    root.querySelector('.ib-summary').textContent = story.summary;
    root.querySelector('.ib-full').textContent = story.full;
    const source = root.querySelector('.ib-source');
    source.href = story.sourceUrl;
    source.textContent = 'Original source: ' + (story.sourceTitle || new URL(story.sourceUrl).hostname) + ' ↗';
    root.querySelector('.ib-details').open = false;
    const star = root.querySelector('[data-book-action="star"]');
    star.textContent = favorites.has(story.id) ? '★ Starred' : '☆ Star';
    for (const tool of ['infinity', 'omni', 'quanta']) {
      const a = root.querySelector('[data-book-tool="' + tool + '"]');
      a.href = buildUrl(tool, story); a.dataset.siteUrl = a.href;
    }
    note(roll ? 'Discovery roll: sector ' + roll.sector + '/30 · angle ' + roll.angle + '/20 · source ' + roll.sourceClass + '/10' : 'Sourced and independently labeled');
  }
  function rollDice() {
    return { sector: rand(30) + 1, angle: rand(20) + 1, sourceClass: rand(10) + 1 };
  }
  function pickUnique(roll, seen) {
    const unseen = Array.from(byId.values()).filter(s => !seen.has(s.id));
    if (!unseen.length) return null;
    // Strict no-repeat; broadening is allowed, fabricating a story is not.
    let best = -1, matches = [];
    for (const story of unseen) {
      const score = (story.sector === roll.sector ? 4 : 0) +
        (story.angle === roll.angle ? 2 : 0) +
        (story.sourceClass === roll.sourceClass ? 1 : 0) + rand(4);
      if (score > best) { best = score; matches = [story]; }
      else if (score === best) matches.push(story);
    }
    return matches[rand(matches.length)];
  }
  async function appendConfiguredFeed() {
    // When a server-side discovery service is available, it may publish curated
    // verified stories at a same-origin JSON endpoint. Never scrape arbitrary sites in the browser.
    const feed = window.PhiInfiniteBookFeedUrl;
    if (!feed) return;
    let url;
    try { url = new URL(feed, location.origin); } catch (_) { return; }
    if (url.origin !== location.origin) return;
    try {
      const response = await fetch(url.href, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const stories = Array.isArray(data) ? data : data.stories;
      if (!Array.isArray(stories)) return;
      for (const s of stories) if (storyValid(s) && !byId.has(s.id)) byId.set(s.id, s);
    } catch (error) { console.warn('Infinite Book feed unavailable; using verified catalog', error); }
  }
  async function nextStory() {
    if (pending || !catalog) return;
    pending = true;
    try {
      const roll = rollDice();
      let story = pickUnique(roll, seenIds());
      if (!story) {
        note('All ' + byId.size + ' verified stories in this catalog have been seen. New stories require the next sourced feed update; nothing will repeat.');
        root.querySelector('.ib-next').disabled = true;
        return;
      }
      render(story, roll);
    } finally { pending = false; }
  }
  function favorite() {
    if (!current) return;
    if (favorites.has(current.id)) favorites.delete(current.id);
    else favorites.add(current.id);
    safeWrite(STAR_KEY, Array.from(favorites));
    root.querySelector('[data-book-action="star"]').textContent = favorites.has(current.id) ? '★ Starred' : '☆ Star';
    note(favorites.has(current.id) ? 'Saved as a favorite' : 'Removed from favorites');
  }
  async function share() {
    if (!current) return;
    const url = deepLink(current);
    try {
      if (navigator.share) await navigator.share({ title: current.title, text: current.summary, url });
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(current.title + '\n' + url);
      else { note('Sharing is unavailable in this browser'); return; }
    } catch (_) { note('Share cancelled'); return; }
    try { window.QuantaStarCredit?.('share', 'infinite-book:' + current.id + ':' + Date.now(), current); }
    catch (error) { console.warn('Story share credit deferred', error); }
    note('Story shared or link copied');
  }
  function collect() {
    if (!current) return;
    const key = 'infinite-book|' + current.id;
    const collected = safeRead('quantaPhiCollected');
    if (collected.some(x => x && x.key === key)) { note('Already collected'); return; }
    const saved = {
      key, type: 'story', title: current.title, story: current.full,
      media: '', sourceUrl: current.sourceUrl, category: 'infinite-book',
      collectedAt: new Date().toISOString()
    };
    collected.push(saved);
    safeWrite('quantaPhiCollected', collected);
    window.dispatchEvent(new CustomEvent('quantaphi:collected', { detail: saved }));
    try { window.QuantaStarCredit?.('collect', key, saved); }
    catch (error) { console.warn('Story collect credit deferred', error); }
    const bridge = window.QuantaCloudConnection || window.StarQuestCloudLedger;
    if (typeof bridge?.authenticatedFetch === 'function') {
      bridge.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/collects', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(saved)
      }).catch(error => console.warn('Story collect sync deferred', error));
    }
    note('Collected. Cloud wallet credit follows the existing QuantaPhi connection.');
  }
  root.addEventListener('click', (event) => {
    const target = event.target.closest('[data-book-action]');
    if (!target || !root.contains(target)) return;
    const action = target.dataset.bookAction;
    if (action === 'next') { event.preventDefault(); void nextStory(); }
    if (action === 'star') { event.preventDefault(); favorite(); }
    if (action === 'share') { event.preventDefault(); void share(); }
    if (action === 'collect') { event.preventDefault(); collect(); }
    // Build links are handled by QuantaPhi's existing in-page site viewer.
  });
  async function init() {
    cardLayout();
    note('Loading sourced discoveries…');
    try {
      const response = await fetch(CATALOG_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Story catalog HTTP ' + response.status);
      catalog = await response.json();
      if (!Array.isArray(catalog.sectors) || catalog.sectors.length !== 30 ||
          !Array.isArray(catalog.angles) || catalog.angles.length !== 20 ||
          !Array.isArray(catalog.sourceClasses) || catalog.sourceClasses.length !== 10) {
        throw new Error('Story discovery configuration is invalid');
      }
      for (const story of catalog.stories || []) if (storyValid(story)) byId.set(story.id, story);
      await appendConfiguredFeed();
      const permalink = new URL(location.href).searchParams.get('secret');
      if (permalink && byId.has(permalink)) {
        render(byId.get(permalink));
      } else {
        await nextStory();
      }
    } catch (error) {
      console.warn('Infinite Book failed to initialize', error);
      note('The verified story collection is temporarily unavailable. Search above still works.');
    }
  }
  void init();
})();
