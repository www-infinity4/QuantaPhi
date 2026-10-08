/* Phi Infinite Book v1: verified, attributed story rotation. No minting on page load. */
(function () {
  'use strict';
  const root = document.getElementById('infiniteBook');
  if (!root) return;
  const SEEN_KEY = 'phi_infinite_book_seen_v1';
  const STAR_KEY = 'phi_infinite_book_favorites_v1';
  const CATALOG_URL = '/infinite-book-catalog.json';
  const LIVE_CACHE = 'phi_infinite_book_live_v2';
  const bootTime = Date.now();
  const initialQuery = new URL(location.href).searchParams.get('q');
  const queuedQueries = [];
  let lastSearchRun = null;
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
    detail.append(source, E('div', 'ib-more-sources'));
    const actions = E('div', 'ib-actions');
    for (const [action, label] of [['star', '☆ Star'], ['share', '↗ Share'], ['collect', '+ Collect']]) {
      const button = E('button', 'ib-action', label);
      button.type = 'button'; button.dataset.bookAction = action; actions.append(button);
    }
    const build = E('div', 'ib-build');
    build.append(E('span', '', 'Build this story with'));
    const illustrate=E('button','ib-action','Build image from story');illustrate.type='button';illustrate.dataset.bookAction='illustrate';
    for (const [tool, label] of [['infinity', 'Infinity'], ['omni', 'Omni'], ['quanta', 'QuantaPhi']]) {
      const a = E('a', 'ib-build-link inPageSite', label);
      a.dataset.bookAction = 'build'; a.dataset.bookTool = tool;
      a.dataset.siteTitle = label; a.href = '#'; build.append(a);
    }
    build.append(illustrate);
    const status = E('p', 'ib-status');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    card.append(detail, actions, build);
    root.append(header, card, status);
  }
  function note(message) { const p = root.querySelector('.ib-status'); if (p) p.textContent = message; }
  function seenIds() { return new Set(safeRead(SEEN_KEY)); }
  function remember(storyId) {
    const seen = safeRead(SEEN_KEY);
    const keys=[storyId];
    if(current?.discoverySource==='live'){
      keys.push('url:'+current.sourceUrl);
      const title=String(current.sourceTitle||'').toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').slice(0,140);
      if(title)keys.push('title:'+(()=>{let h=2166136261;for(let i=0;i<title.length;i++){h^=title.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)})());
    }
    let changed=false;for(const key of keys){if(!seen.includes(key)){seen.push(key);changed=true}}
    if(changed)safeWrite(SEEN_KEY,seen);
  }
  function deepLink(story) {
    const link = new URL(location.href);
    link.searchParams.delete('q'); link.searchParams.delete('from');
    link.searchParams.set('secret', story.id);
    if(story.discoverySource === 'live') {
      link.searchParams.set('bookTitle', story.title.slice(0, 140));
      link.searchParams.set('bookSummary', story.summary.slice(0, 440));
      link.searchParams.set('bookSource', story.sourceUrl);
      link.searchParams.set('bookSector', String(story.sector));
    }
    link.hash = 'infiniteBook';
    return link.href;
  }
  function indexedSearchTerms(story) {
    const stop=new Set(['the','a','an','of','on','in','to','for','and','with','from','when','was','were','who','how','that','this','one','more','after','before','into','it','its','is','at','as','by','their','they','has','had','have','finally','revealed','secret','amazing','big']);
    const subject=catalog.sectors.find(x=>x.id===story.sector)?.name||'';
    const headline=String(story.title||'').replace(/[^\p{L}\p{N}\s'-]/gu,' ').split(/\s+/);
    const background=String(story.summary||'').replace(/[^\p{L}\p{N}\s'-]/gu,' ').split(/\s+/);
    const words=[],used=new Set();
    for(const token of [...headline,...subject.split(/\s+/),...background]){
      const clean=String(token||'').trim();
      if(clean.length<3||stop.has(clean.toLowerCase())||used.has(clean.toLowerCase()))continue;
      used.add(clean.toLowerCase());words.push(clean);
      if(words.length>=13)break;
    }
    return words.join(' ').slice(0,150);
  }
  function buildUrl(tool, story) {
    const routes={infinity:'/InfinityPhi/',omni:'/OmniPhi/overview/',quanta:'/'};
    const link=new URL(routes[tool]||'/',location.origin);
    // Existing Phi search pages understand q. Keep it as short semantic index words.
    // Preserve story metadata separately rather than injecting the full prose into search.
    link.searchParams.set('q',indexedSearchTerms(story));
    link.searchParams.set('story',story.id);
    link.searchParams.set('storyTitle',String(story.title||'').slice(0,150));
    link.searchParams.set('storySource',story.sourceUrl);
    link.searchParams.set('from','infinite-book');
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
    const others = root.querySelector('.ib-more-sources');
    others.replaceChildren();
    for(const item of (story.sources || []).filter(x=>x.url && x.url!==story.sourceUrl).slice(0,3)){
      try{ if(new URL(item.url).protocol !== 'https:')continue; const a=E('a','ib-source','Further source: '+(item.title||new URL(item.url).hostname)+' ↗');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';others.append(a); }catch(_){}
    }
    root.querySelector('.ib-details').open = false;
    const star = root.querySelector('[data-book-action="star"]');
    star.textContent = favorites.has(story.id) ? '★ Starred' : '☆ Star';
    for (const tool of ['infinity', 'omni', 'quanta']) {
      const a = root.querySelector('[data-book-tool="' + tool + '"]');
      a.href = buildUrl(tool, story); a.dataset.siteUrl = a.href;
    }
    note(roll ? 'Personal interest: '+(catalog.sectors.find(s=>s.id===roll.sector)?.name || 'Discovery')+' · random angle '+roll.angle+'/20 · source '+roll.sourceClass+'/10' : 'Sourced story');
  }
  function rollDice(query='') {
    const profile = window.PhiInfiniteBookDiscover?.preferences(query,catalog);
    return {sector: profile?.sector || 3, angle: rand(20)+1, sourceClass: rand(10)+1,
      personal: !!profile?.sector, signals: profile?.signals || 0};
  }
  function pickUnique(roll, seen) {
    const unseen = Array.from(byId.values()).filter(s => !seen.has(s.id));
    if (!unseen.length) return null;
    const related = {31:[2,6,1],32:[2,6],33:[2,6],34:[2],35:[7],36:[6,2],37:[20,2],38:[1],39:[2]};
    const sectors = [roll.sector, ...(related[roll.sector]||[])];
    const topical = unseen.filter(s => sectors.includes(s.sector));
    const pool = topical.length ? topical : unseen;
    let best = -1, matches=[];
    for (const story of pool) {
      const score=(story.sector===roll.sector?6:0)+(story.angle===roll.angle?2:0)+
        (story.sourceClass===roll.sourceClass?1:0)+rand(4);
      if(score>best){best=score;matches=[story]}
      else if(score===best)matches.push(story);
    }
    return matches[rand(matches.length)];
  }
  function cacheLive(story) {
    const cached=safeRead(LIVE_CACHE);
    if(!cached.some(x=>x.id===story.id))cached.push(story);
    // Seen IDs are never truncated; cached story bodies are bounded for device storage.
    safeWrite(LIVE_CACHE,cached.slice(-100));
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
  async function nextStory(query='') {
    if (!catalog) return;
    if(pending){if(query && queuedQueries.length < 20)queuedQueries.push(query);return}
    pending=true;
    const nextButton=root.querySelector('.ib-next');
    if(nextButton)nextButton.disabled=true;
    try{
      const roll=rollDice(query);
      note('Finding a new '+(catalog.sectors.find(s=>s.id===roll.sector)?.name||'surprising')+' story with sources…');
      let story=null;
      const seen=seenIds();
      try{
        story=await window.PhiInfiniteBookDiscover?.find({roll,catalog,seen})||null;
      }catch(error){console.warn('Live source discovery failed; using saved verified stories',error)}
      if(story && storyValid(story) && !seen.has(story.id)){
        byId.set(story.id,story);
        cacheLive(story);
      } else story=pickUnique(roll,seen);
      if(!story){
        note('No new sourced story is available for this interest yet. Your collected stories remain saved; no story will repeat.');
        return;
      }
      render(story,roll);
      if(story.discoverySource !== 'live'){
        note('Verified archived discovery · '+(catalog.sectors.find(s=>s.id===roll.sector)?.name||'personal interests')+'. Live search could not verify a new story this time.');
      }
    } finally {
      pending=false;
      if(nextButton)nextButton.disabled=false;
      if(queuedQueries.length){const next=queuedQueries.shift();void nextStory(next)}
    }
  }
  window.addEventListener('quantaphi:search-start', event=>{
    const query=String(event.detail?.query||'').trim();
    const run=event.detail?.run;
    if(!query || (run != null && run===lastSearchRun))return;
    if(run != null)lastSearchRun=run;
    // A shared / restored search on initial page load is one visit, not a second discovery.
    if(Date.now()-bootTime<6500 && query===initialQuery)return;
    void nextStory(query);
  });
  function favorite() {
    if (!current) return;
    if (favorites.has(current.id)) favorites.delete(current.id);
    else favorites.add(current.id);
    safeWrite(STAR_KEY, Array.from(favorites));
    root.querySelector('[data-book-action="star"]').textContent = favorites.has(current.id) ? '★ Starred' : '☆ Star';
    const starred=favorites.has(current.id);
    window.dispatchEvent(new CustomEvent('phi:story:star',{detail:{id:current.id,sector:current.sector,title:current.title,starred}}));
    note(starred ? 'Starred. This subject now influences future discoveries and can be used as a build seed.' : 'Removed from favorites');
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
    if(action==='illustrate'&&current){
      event.preventDefault();
      window.PhiImageBuilder?.prefill('Illustrate this surprising historical story: '+current.title+'. Create a distinctive, evidence-respecting visual inspired by its subject.',{useStory:true});
      document.getElementById('phiImageBuilder')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
    // Build links are handled by QuantaPhi's existing in-page site viewer.
  });
  async function init() {
    cardLayout();
    note('Loading sourced discoveries…');
    try {
      const response = await fetch(CATALOG_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Story catalog HTTP ' + response.status);
      catalog = await response.json();
      if (!Array.isArray(catalog.sectors) || catalog.sectors.length !== 39 ||
          !Array.isArray(catalog.angles) || catalog.angles.length !== 20 ||
          !Array.isArray(catalog.sourceClasses) || catalog.sourceClasses.length !== 10) {
        throw new Error('Story discovery configuration is invalid');
      }
      for (const story of [...(catalog.stories || []), ...safeRead(LIVE_CACHE)]) if (storyValid(story)) byId.set(story.id, story);
      await appendConfiguredFeed();
      const permalink = new URL(location.href).searchParams.get('secret');
      if (permalink && byId.has(permalink)) {
        render(byId.get(permalink));
      } else if (permalink && /^live-[a-z0-9]+$/.test(permalink)) {
        const u=new URL(location.href),source=u.searchParams.get('bookSource')||'';
        let validSource=false;try{validSource=new URL(source).protocol==='https:'}catch(_){}
        if(validSource && u.searchParams.get('bookTitle') && u.searchParams.get('bookSummary')){
          render({id:permalink,title:u.searchParams.get('bookTitle').slice(0,160),
            summary:u.searchParams.get('bookSummary').slice(0,550),
            full:'This discovery was shared from another Phi session. Its summary and original source are preserved here. Open the cited source to read more.',
            sector:Number(u.searchParams.get('bookSector'))||3,status:'Shared sourced discovery',
            sourceUrl:source,sourceTitle:new URL(source).hostname},null);
        } else await nextStory();
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
