/* Phi Infinite Book v1: verified, attributed story rotation. No minting on page load. */
(function () {
  'use strict';
  const root = document.getElementById('infiniteBook');
  if (!root) return;
  const ASTEROID_ART='data:image/svg+xml;charset=utf-8,'+encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 600 600\"><defs><radialGradient id=\"r\" cx=\"32%\" cy=\"28%\" r=\"73%\"><stop stop-color=\"#f6c895\"/><stop offset=\".34\" stop-color=\"#ae7a83\"/><stop offset=\".68\" stop-color=\"#6b4e75\"/><stop offset=\"1\" stop-color=\"#211939\"/></radialGradient><radialGradient id=\"c\"><stop stop-color=\"#372d56\"/><stop offset=\".75\" stop-color=\"#513a62\"/><stop offset=\"1\" stop-color=\"#c49588\"/></radialGradient><filter id=\"s\"><feGaussianBlur stdDeviation=\"16\"/></filter></defs><ellipse cx=\"315\" cy=\"318\" rx=\"225\" ry=\"220\" fill=\"#bc68ff\" opacity=\".36\" filter=\"url(#s)\"/><path d=\"M104 215 149 142 226 103 325 87 424 113 501 189 535 280 509 376 450 458 368 516 261 521 168 471 94 395 75 296Z\" fill=\"url(#r)\" stroke=\"#f5c1a2\" stroke-opacity=\".56\" stroke-width=\"5\"/><g fill=\"url(#c)\" stroke=\"#cfab9e\" stroke-width=\"7\"><ellipse cx=\"242\" cy=\"216\" rx=\"63\" ry=\"47\" transform=\"rotate(-16 242 216)\"/><ellipse cx=\"397\" cy=\"320\" rx=\"79\" ry=\"61\" transform=\"rotate(25 397 320)\"/><ellipse cx=\"213\" cy=\"385\" rx=\"44\" ry=\"36\"/><ellipse cx=\"360\" cy=\"165\" rx=\"30\" ry=\"24\"/><ellipse cx=\"332\" cy=\"446\" rx=\"31\" ry=\"21\"/></g><g fill=\"#211e39\" opacity=\".4\"><ellipse cx=\"233\" cy=\"216\" rx=\"38\" ry=\"27\"/><ellipse cx=\"387\" cy=\"319\" rx=\"52\" ry=\"37\"/><ellipse cx=\"208\" cy=\"384\" rx=\"26\" ry=\"19\"/></g><path d=\"M130 256 189 289 173 351M287 135 306 208 280 249M436 410 398 450\" fill=\"none\" stroke=\"#f5d3ad\" stroke-opacity=\".28\" stroke-width=\"8\" stroke-linecap=\"round\"/></svg>");
  const SEEN_KEY = 'phi_infinite_book_seen_v1';
  const STAR_KEY = 'phi_infinite_book_favorites_v1';
  const HOME_STORY_KEY = 'phi_infinite_book_home_story_v1';
  const CATALOG_URL = '/infinite-book-catalog.json';
  const LIVE_CACHE = 'phi_infinite_book_live_v2';
  const bootTime = Date.now();
  const initialQuery = new URL(location.href).searchParams.get('q');
  const queuedQueries = [];
  let lastSearchRun = null;
  let lastSearchQuery = initialQuery || '';
  // One durable story reader with two distinct presentations:
  // home: Infinity Reads & Realms, no asteroid; search: Asteroid inside the
  // result card AFTER all five AI overview regions, including Assimilation.
  function placeSearchStory(){
    const result=document.getElementById('result');
    if(result&&root.parentElement!==result)result.append(root);
    root.dataset.context='search';
    const name=root.querySelector('.ib-head strong'),next=root.querySelector('.ib-next');
    if(name)name.textContent='ASTEROID · EVIDENCE INTO STORY';
    if(next)next.textContent='Another secret · +1 ★';
    const label=root.querySelector('.ib-asteroid-label');
    if(label)label.textContent='ASTEROID · ORIGINAL SOURCED STORY';
    const card=root.querySelector('.ib-story');
    if(card?.dataset.ready==='false'){
      root.querySelector('.ib-title').textContent='Researching your Asteroid story';
      root.querySelector('.ib-summary').textContent='Researching your search subject and writing a new original story using Cloudflare AI.';
    }
  }
  function placeHomeStory(){
    const shelf=document.querySelector('.book-shelf-link');
    if(shelf?.parentElement&&root.nextElementSibling!==shelf)shelf.parentElement.insertBefore(root,shelf);
    root.dataset.context='home';
    root.removeAttribute('aria-busy');
    const name=root.querySelector('.ib-head strong'),next=root.querySelector('.ib-next');
    if(name)name.textContent='INFINITY READS & REALMS · STORIES OF MYSTERY, ADVENTURE & SUSPENSE';
    if(next)next.textContent='Another story';
    const label=root.querySelector('.ib-asteroid-label');
    if(label)label.textContent='INFINITY READS & REALMS';
    const card=root.querySelector('.ib-story');
    if(card?.dataset.ready==='false'){
      root.querySelector('.ib-title').textContent='Writing a fresh Reads & Realms story';
      root.querySelector('.ib-summary').textContent='Finding documented evidence for an original story of Mystery, Adventure or Suspense.';
    }
  }
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
    textSafe(story.full).length > 30 && trustedUrl(story.sourceUrl) &&
    !window.PhiInfiniteBookDiscover?.isPlaceProfile?.(story) &&
    !window.PhiInfiniteBookDiscover?.isGenericProfile?.(story) &&
    (window.PhiInfiniteBookDiscover?.eligibleNarrative?.(story) || story.discoverySource !== 'live' || window.PhiInfiniteBookDiscover?.isSecretStory?.(story) !== false);
  const byId = new Map();
  let catalog = null;
  let current = null;
  let pending = false;
  let activeStoryTicket = 0;
  let interactedWithStory = false;
  let favorites = new Set(safeRead(STAR_KEY));
  function cardLayout() {
    root.replaceChildren();
    const header = E('div', 'ib-head');
    header.append(E('strong', '', 'INFINITY READS & REALMS · STORIES OF MYSTERY, ADVENTURE & SUSPENSE'), E('button', 'ib-next', 'Another story'));
    header.lastChild.type = 'button'; header.lastChild.dataset.bookAction = 'next';
    const card = E('article', 'ib-story');card.dataset.ready='false';
    const hero=E('div','ib-asteroid-hero');
    const asteroid=E('img','ib-asteroid-rock');asteroid.src=ASTEROID_ART;asteroid.alt='Rocky asteroid with illuminated craters';asteroid.decoding='async';
    const copy=E('div','ib-asteroid-copy');
    copy.append(E('small','ib-asteroid-label','INFINITY READS & REALMS'),E('div', 'ib-category'), E('h2', 'ib-title'));
    hero.append(asteroid,E('div','ib-asteroid-shade'),copy);
    card.append(hero,E('p','ib-summary'));
    const detail = E('details', 'ib-details');
    detail.append(E('summary', '', 'Expand to read the full story'), E('p', 'ib-full'));
    const source = E('a', 'ib-source', 'View original source ↗');
    source.target = '_blank'; source.rel = 'noopener noreferrer';
    detail.append(source, E('div', 'ib-more-sources'));
    const research = E('section','ib-research-branches');
    research.append(E('strong','','Research deeper · guided by your search history'));
    const branches=E('div','ib-research-chips');research.append(branches);
    card.append(research);
    const actions = E('div', 'ib-actions');
    for (const [action, label] of [['star', '☆ Star'], ['share', '↗ Share'], ['collect', '+ Collect']]) {
      const button = E('button', 'ib-action', label);
      button.type = 'button'; button.dataset.bookAction = action; actions.append(button);
    }
    const build = E('div', 'ib-build');
    build.append(E('span', '', 'Build this story with'));
    // Illustrations are automatic. The Image Builder below is reserved for separate projects.
    for (const [tool, label] of [['infinity', 'Infinity'], ['omni', 'Omni'], ['quanta', 'QuantaPhi']]) {
      const a = E('a', 'ib-build-link', label);
      a.dataset.bookAction = 'build'; a.dataset.bookTool = tool;
      a.dataset.siteTitle = label; a.href = '#'; build.append(a);
    }
    // No redundant manual illustration button.
    const status = E('p', 'ib-status');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    card.append(detail, actions, build);
    copy.querySelector('.ib-title').textContent='Writing a fresh Reads & Realms story';
    card.querySelector('.ib-summary').textContent='Cloudflare AI is researching documented evidence for a new Mystery, Adventure or Suspense story.';
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
    const routes={infinity:'/infinity-phi/',omni:'/omni-phi/overview/',quanta:'/'};
    const link=new URL(routes[tool]||'/',location.origin);
    // Existing Phi search pages understand q. Keep it as short semantic index words.
    // Preserve story metadata separately rather than injecting the full prose into search.
    link.searchParams.set('q',indexedSearchTerms(story));
    link.searchParams.set('story',story.id);
    link.searchParams.set('storyTitle',String(story.title||'').slice(0,150));
    link.searchParams.set('storySummary',String(story.summary||'').slice(0,500));
    link.searchParams.set('storyDetail',String(story.detail||'').slice(0,200));
    link.searchParams.set('storySector',String(catalog.sectors.find(x=>x.id===story.sector)?.name||''));
    link.searchParams.set('storySource',story.sourceUrl);
    link.searchParams.set('from','infinite-book');
    return link.href;
  }
  async function researchSuggestions(story, ticket){
    const host=root.querySelector('.ib-research-chips');if(!host)return;
    const options=[
      {label:'Original evidence',query:story.title+' primary source original records document',branch:'Original evidence'},
      {label:'Historical context',query:story.title+' historical context earlier discovery documented',branch:'Historical context'}
    ];
    try{
      const corpus=await window.PhiAssimilation?.corpus?.();
      const ranked=window.PhiAssimilation?.rank?.(corpus?.items||[],story.title+' '+lastSearchQuery,{yellow:[]})||[];
      const earlier=ranked.find(x=>x.score>0&&x.query.toLowerCase()!==story.title.toLowerCase());
      if(earlier)options.push({label:'Connect: '+earlier.query.slice(0,27),query:story.title+' '+earlier.query+' connected evidence documented',branch:'Previous search: '+earlier.query});
    }catch(_){/* independent source research still works without history */}
    if(ticket!==activeStoryTicket||root.querySelector('.ib-story')?.dataset.storyId!==story.id)return;
    host.replaceChildren();
    for(const option of options){const b=E('button','ib-research-branch',option.label);b.type='button';b.dataset.bookAction='research';b.dataset.researchQuery=option.query.slice(0,350);b.dataset.researchBranch=option.branch.slice(0,200);host.append(b)}
  }
  // Keep every successfully decoded illustration with its honest review status.
  let artBusy=false,artRequested=null;
  const artRunning=new Set();
  window.addEventListener('phi:book:image-bridge-ready',()=>{if(current&&(root.dataset.context==='home'||window.PhiInfiniteBookDiscover?.eligibleNarrative?.(current)))scheduleAutoIllustration(current)});
  // A user-requested replacement must not alter other stories or delete the original
  // until a new, decoded illustration is ready to store.
  window.addEventListener('phi:story:image-retry',event=>{
    if(!current?.id||event.detail?.storyId!==current.id)return;
    scheduleAutoIllustration(current,true);
  });
  function scheduleAutoIllustration(story,force=false){
    if(!story?.id||!window.PhiVisualRender||!window.PhiBookImageBridge)return;
    artRequested={story,context:root.dataset.context,force};
    if(!artBusy)void drainAsteroidArtwork();
  }
  function storyIllustrationPrompt(story){
    // The correct headline is rendered once by HTML (.ib-title). Passing a
    // "cover" direction plus the headline made FLUX invent letters in the
    // picture, as seen in the Ridgecrest story screenshot.
    const description=String(story.summary||story.detail||'').replace(/\s+/g,' ').slice(0,680);
    const subject=description||String(story.title||'').replace(/\s+/g,' ').slice(0,160);
    return [
      'Create ONE full-bleed uncaptioned documentary landscape scene. This is a photograph-style illustration, NEVER a book cover, poster, headline card, magazine page, presentation slide or infographic.',
      'What should be visible: '+subject,
      'Show historically or scientifically credible details; do not fabricate incidents. Mood: '+String(story.mood||'Mystery').slice(0,35)+'.',
      'No title banners, logos, signs, letterforms, digits, diagrams, map labels, fake headlines, invented language, punctuation, written text, or typographic shapes anywhere in the pixels.',
      'Do not quote, spell, abbreviate, stylize, or redraw the source title. The web page prints the correct title as accessible HTML on a separate layer.',
      'Only paint the real-world scenery and subjects. No graphic text containers; retain a natural documentary composition.'
    ].join('\n');
  }
  async function drainAsteroidArtwork(){
    if(artBusy)return;
    artBusy=true;
    try{
      while(artRequested){
        const request=artRequested;artRequested=null;
        const {story,context,force=false}=request;
        const home=context==='home';
        if(artRunning.has(story.id))continue;
        artRunning.add(story.id);
        try{
          const bridge=window.PhiBookImageBridge;
          if(!force&&await bridge.hasStored(story.id))continue;
          const renderer=window.PhiVisualRender;
          const intention=storyIllustrationPrompt(story);
          if(root.querySelector('.ib-story')?.dataset.storyId===story.id)note(home?'Creating and checking this opening story’s image…':'GPT story sourced · creating and checking its illustration…');
          const generated=await renderer.render({description:intention,mode:'Image',source:null,design:null,prompt:intention,exactText:''});
          let review;
          try{review=await renderer.review({src:generated.src,description:intention,mode:'Image',exactText:''})}
          catch(error){review={status:'uncertain',score:null,issues:[],error:String(error?.message||error).slice(0,180)}}
          const approved=review?.status==='good'&&Number(review?.score)>=75&&!(review?.issues||[]).some(i=>i.severity==='high');
          await renderer.validate(generated.src);
          const blob=await renderer.asBlob(generated.src);
          await bridge.attachGenerated(story,blob,{renderer:generated.renderer,review,replaceExisting:force});
          if(root.querySelector('.ib-story')?.dataset.storyId===story.id)note(approved?(home?'Opening story image generated, reviewed and saved to this device.':'Sourced GPT story · original illustration generated, reviewed, and attached.'):'Story illustration saved · '+(review.status==='needs_work'?'visual review found details to improve.':'visual quality not yet confirmed.')+' If FLUX paints words, use Fix image text without paying for a second image.');
        }catch(error){
          if(root.querySelector('.ib-story')?.dataset.storyId===story.id)note('Story ready. Automatic illustration could not be approved or saved: '+String(error?.message||error).slice(0,130));
        }finally{artRunning.delete(story.id)}
      }
    }finally{artBusy=false}
  }
  function render(story, roll) {
    current = story; interactedWithStory = false; remember(story.id);
    const card=root.querySelector('.ib-story');card.hidden=false;card.dataset.ready='true';root.removeAttribute('aria-busy');
    root.querySelector('.ib-category').textContent = [
      story.mood||window.PhiInfiniteBookDiscover?.storyMood?.(lastSearchQuery,roll)||'Mystery',
      catalog.sectors.find(s => s.id === story.sector)?.name || 'Surprising history',
      story.status || 'sourced story',
      story.year || ''
    ].filter(Boolean).join(' · ');
    root.querySelector('.ib-story').dataset.storyId = story.id;
    root.querySelector('.ib-title').textContent = story.title;
    root.querySelector('.ib-summary').textContent = story.summary;
    root.querySelector('.ib-full').textContent = story.full;
    void researchSuggestions(story,activeStoryTicket);
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
    note(roll?.bracketKey ? 'Four-roll path '+roll.bracketKey+' · '+(roll.indexWord||'')+' · '+(roll.refinement||'')+' · '+(roll.storyDirection||'') : 'Sourced discovery');
    window.PhiAssimilation?.signal?.({kind:'story',action:'open',id:'ci_view_'+String(story.id).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,120),key:story.id,title:story.title,query:lastSearchQuery,terms:indexedSearchTerms(story)});
    window.dispatchEvent(new CustomEvent('phi:story:render',{detail:{id:story.id,title:story.title}}));
    // Both the no-search opener and each verified search Asteroid get their own image.
    if(root.dataset.context==='home'||window.PhiInfiniteBookDiscover?.eligibleNarrative?.(story))scheduleAutoIllustration(story);
  }
  function rollDice(query='') {
    const profile = window.PhiInfiniteBookDiscover?.preferences(query,catalog);
    const lastPath = (()=>{try{return sessionStorage.getItem('phi_book_last_roll_path')||''}catch{return ''}})();
    // Search is authoritative. At home, the original random rolls lead and
    // a Quant from the complete indexed history occasionally steers them.
    // This deliberately does not reuse only the last four search terms.
    const focusPool=Array.isArray(profile?.focusPool)?profile.focusPool:[];
    const steeredFocus=!query&&focusPool.length&&rand(5)<2?focusPool[rand(focusPool.length)]:'';
    const quantFocus=String(query||steeredFocus||'').trim().slice(0,90);
    const originalSector=Number(profile?.sector)||0;
    const mappedSector=Number(catalog.specialistRefinements?.[originalSector]||originalSector);
    const activeSector=query && mappedSector>=1 && mappedSector<=(catalog.baseSectorCount||30)?mappedSector:0;
    const drawn = window.PhiInfiniteBookDiscover?.indexedDraw?.({
      catalog,query:quantFocus,profileSector:originalSector,
      sectorOverride:activeSector,lastPair:lastPath,rng:rand
    });
    if(drawn){
      try { sessionStorage.setItem('phi_book_last_roll_path',drawn.bracketKey); }catch(_){}
      return {...drawn,quantFocus,trial:seenIds().size,focus:quantFocus||drawn.indexWord||'',
        personal:Boolean(quantFocus),signals:profile?.signals||0};
    }
    // Older catalogs remain readable while rolling word banks are upgraded.
    const sector = catalog.sectors[rand(catalog.baseSectorCount||30)]?.id||3;
    return {sector,angle:rand(catalog.angles.length)+1,
      sourceClass:rand(catalog.sourceClasses.length)+1,trial:seenIds().size,
      focus:String(query||profile?.focus||'').slice(0,90)};
  }
  function pickUnique(roll, seen) {
    const all = Array.from(byId.values()).filter(storyValid);
    const unique = all.filter(story => !seen.has(story.id));
    // Exhaust the entire verified catalog before repeating an older story.
    // If all locally available stories were read, gracefully cycle from the
    // archived evidence rather than leaving the reader blank when GPT is down.
    const unread = unique.length ? unique : all.filter(story=>story.id!==current?.id);
    if (!unread.length) return all[0] || null;
    let recent = [];
    try { recent = JSON.parse(sessionStorage.getItem('phi_book_recent_subjects')||'[]'); }catch(_){}
    const last = recent[recent.length-1];
    const scored = unread.map(story=>{
      const sector = Number(story.sector)||0,word = Number(story.wordNumber)||0;
      const angle = Number(story.refinementNumber||story.angle)||0;
      const direction = Number(story.directionNumber)||0;
      let value = rand(12);
      if(sector===roll.sector)value+=28;
      if(word&&word===roll.wordNumber)value+=30;
      if(angle&&angle===roll.refinementNumber)value+=12;
      if(direction&&direction===roll.directionNumber)value+=12;
      // Stories from the exact 4-roll route win only when actual articles exist.
      if(story.bracketKey && story.bracketKey===roll.bracketKey)value+=60;
      if(roll.quantFocus){const tokens=roll.quantFocus.toLowerCase().split(/\s+/).filter(x=>x.length>=3);const hay=(story.title+' '+story.summary+' '+(story.indexWord||'')).toLowerCase();value+=Math.min(4,tokens.filter(x=>hay.includes(x)).length)*12;}
      if(story.discoveryMethod==='gpt-deep')value+=8;
      if(word && word===last)value-=36; // do not serve Tesla ten times in a row
      if(word && recent.slice(-5).includes(word))value-=12;
      return {story,value};
    }).sort((a,b)=>b.value-a.value);
    // Random choice among near-best independent event stories, not ordered playback.
    const best = scored[0].value;
    const pool = scored.filter(x=>x.value>=best-8).slice(0,12);
    const story=pool[rand(pool.length)].story;
    if(story.wordNumber){
      try{sessionStorage.setItem('phi_book_recent_subjects',
        JSON.stringify([...recent.slice(-11),Number(story.wordNumber)]));}catch(_){}
    }
    return story;
  }
  function cacheLive(story) {
    const cached=safeRead(LIVE_CACHE);
    if(!cached.some(x=>x.id===story.id))cached.push(story);
    // Seen IDs are never truncated; cached story bodies are bounded for device storage.
    safeWrite(LIVE_CACHE,cached.slice(-100));
  }
  async function appendConfiguredFeed(roll=null) {
    // When a server-side discovery service is available, it may publish curated
    // verified stories at a same-origin JSON endpoint. Never scrape arbitrary sites in the browser.
    const feed = window.PhiInfiniteBookFeedUrl;
    if (!feed) return;
    let url;
    try { url = new URL(feed, location.origin); } catch (_) { return; }
    if (url.origin !== location.origin && url.origin !== 'https://infinite-book-library.marvaseater.workers.dev') return;
    if (roll?.bracketKey) url.searchParams.set('path',roll.bracketKey);
    try {
      const response = await fetch(url.href, { cache: 'no-store', signal: AbortSignal.timeout(6500) });
      if (!response.ok) return;
      const data = await response.json();
      const stories = Array.isArray(data) ? data : data.stories;
      if (!Array.isArray(stories)) return;
      for (const s of stories) if (storyValid(s) && !byId.has(s.id)) byId.set(s.id, s);
    } catch (error) { console.warn('Infinite Book feed unavailable; using verified catalog', error); }
  }
  // The screen reads from ready stories first. Research never blocks a click.
  const READY_TARGET = 8;
  const MAX_RESEARCH_IN_FLIGHT = 2;
  const RESEARCH_DEADLINE_MS = 120000;
  const researchFlights = new Map();
  let refillRunning = false;
  function readyCount() {
    const seen = seenIds();
    let n = 0;
    for (const story of byId.values()) if (!seen.has(story.id)) n++;
    return n;
  }
  function sourcedCard(story){
    return storyValid(story) && (
      window.PhiInfiniteBookDiscover?.eligibleNarrative?.(story) ||
      (story.discoveryMethod==='encyclopedia-backup' &&
       /^https:\/\/en\.wikipedia\.org\//.test(story.sourceUrl) &&
       String(story.status||'').includes('source excerpt'))
    );
  }
  function discoverInBackground(roll, onDeep, storyKind='reads-realms') {
    const key = [storyKind,roll.sector, roll.angle, roll.sourceClass, roll.focus || ''].join(':');
    if (researchFlights.has(key)) return researchFlights.get(key);
    if (researchFlights.size >= MAX_RESEARCH_IN_FLIGHT) return Promise.resolve(null);
    const discover = window.PhiInfiniteBookDiscover?.find;
    if (typeof discover !== 'function') return Promise.resolve(null);
    let deadline;
    const research = Promise.resolve().then(() => discover({
      roll, catalog, seen: seenIds(), focus: roll.focus || '', strictGPT:true, storyKind,
      onDeep: story => {
        if (!sourcedCard(story) || seenIds().has(story.id)) return;
        byId.set(story.id, story);
        cacheLive(story);
        if (typeof onDeep === 'function') onDeep(story);
      }
    }));
    // Bound the queue even when a remote service ignores its abort signal.
    const expired = new Promise(resolve => { deadline = setTimeout(() => resolve(null), RESEARCH_DEADLINE_MS); });
    const flight = Promise.race([research, expired])
      .then(story => {
        if (!sourcedCard(story) || seenIds().has(story.id)) return null;
        byId.set(story.id, story);
        cacheLive(story);
        return story;
      })
      .catch(error => {
        console.warn('Infinite Book GPT/source discovery unavailable', error);
        return null;
      })
      .finally(() => {
        clearTimeout(deadline);
        researchFlights.delete(key);
      });
    researchFlights.set(key, flight);
    return flight;
  }
  function refillReadyStories(){ /* Never pre-generate GPT stories or artwork on refresh. */ }
  async function nextStory(query = '', options = {}) {
    if (!catalog) return;
    const ticket = ++activeStoryTicket;
    window.PhiInfiniteBookResearchStatus='';
    const searchMode=root.dataset.context==='search';
    if(searchMode && !String(query||'').trim()){
      note('Search a subject to generate an Asteroid story.');
      return;
    }
    const storyKind=searchMode?'asteroid':'reads-realms';
    const roll = rollDice(query);
    const requireFresh=options.requireFresh!==false;
    const spinReference=options.rewardSpin?'research-spin:'+String(crypto?.randomUUID?.()||Date.now()+'-'+Math.random()):'';
    let spinSubmitted=false;
    const present=(story,roll)=>{
      render(story,roll);
      if(!spinReference||spinSubmitted||!storyValid(story)||!window.PhiInfiniteBookDiscover?.eligibleNarrative?.(story))return;
      const queued=window.QuantaStarCoinCloud?.record?.('spin',spinReference,{
        ...story,parentQuery:lastSearchQuery,researchBranch:options.researchBranch||'Another secret'
      });
      if(queued){spinSubmitted=true;note('Sourced research attached to your 1 StarCoin spin receipt. Cloud wallet credit submitted for confirmation.')}else note('Research is shown, but the StarCoin credit could not be queued; check the wallet connection.');
    };
    // No catalog film or encyclopedia excerpt is shown instead of a GPT narrative.
    // Readers get a real sourced story immediately whenever an unused verified
    // item exists. The Cloudflare writer can replace it with a new original.
    // Search-specific Asteroids do not substitute an unrelated catalog article.
    const ready = searchMode ? null : pickUnique(roll, seenIds());
    if(requireFresh){
      current=null;interactedWithStory=false;
      const card=root.querySelector('.ib-story');card.hidden=false;card.dataset.ready='false';delete card.dataset.storyId;
      root.querySelector('.ib-category').textContent='SOURCED '+(window.PhiInfiniteBookDiscover?.storyMood?.(query,roll)||'Mystery').toUpperCase();
      root.querySelector('.ib-title').textContent=searchMode?'Researching Asteroid story for '+String(query).slice(0,100):'Writing a fresh Reads & Realms story';
      root.querySelector('.ib-summary').textContent=searchMode?'Finding original evidence for your search. Cloudflare AI will write the Asteroid story when the evidence supports it.':'Finding fresh documented evidence. Cloudflare AI will write a new Reads & Realms story for this visit.';
      root.setAttribute('aria-busy','true');window.dispatchEvent(new CustomEvent('phi:story:reset'));
    }
    // On a new search show the prepared story immediately, then replace only
    // if source-backed discovery verifies a more relevant event for that search.
    if (ready) {
      present(ready, roll);
      if(!spinSubmitted)note('Reading a verified archived story while Oracle researches the next original. Source and attribution are available in the full story.');
    } else {
      note((root.dataset.context==='home'?'Reads & Realms · researching ':'ASTEROID · researching ')+(window.PhiInfiniteBookDiscover?.storyMood?.(query,roll)||'Mystery')+' from real sources for Cloudflare AI to write. The card appears only when evidence supports the story…');
    }
    const acceptNew = story => {
      // Do not replace a visible story on an unsuspecting reader.
      if (ticket !== activeStoryTicket || interactedWithStory ||
        !sourcedCard(story) || seenIds().has(story.id) || current?.id === story.id) return;
      if (ready && current?.id !== ready.id) return;
      present(story, roll);
      if(!spinSubmitted)note(story.discoveryMethod === 'encyclopedia-backup'
        ? 'Cited Wikipedia source excerpt · original AI story could not finish. This is not GPT-written prose.'
        : story.discoveryMethod === 'gpt-deep'
          ? 'New sourced historical story · original Cloudflare AI narrative'
          : 'New historical discovery · original GPT research with cited source');
    };
    void discoverInBackground(roll, acceptNew, storyKind)
      .then(story=>{acceptNew(story);if(ticket===activeStoryTicket&&root.querySelector('.ib-story')?.dataset.ready!=='true'){
        root.removeAttribute('aria-busy');
        const status=window.PhiInfiniteBookResearchStatus;
        const busy=status==='provider-busy'||status==='ai-unavailable';
        root.querySelector('.ib-title').textContent=busy?'Cloudflare AI temporarily unavailable':'Source research incomplete';
        root.querySelector('.ib-summary').textContent=busy
          ? 'The AI writer could not finish the new story. Try Another story to retry; a sourced excerpt may appear when available.'
          : 'No verified original narrative was completed for this topic. Try a more specific subject or another research angle.';
        note((root.dataset.context==='home'?'Reads & Realms':'Asteroid')+(busy?' · Cloudflare AI service could not complete this request.':' · Complete sourced story not yet available.'));
      }})
      .catch(error=>{console.warn(storyKind+' research unavailable',error);if(ticket===activeStoryTicket){root.removeAttribute('aria-busy');root.querySelector('.ib-summary').textContent='Research was interrupted. Try another search; no unsupported story was created.';note('Cloudflare AI could not complete sourced writing for this topic.')}});
  }
  window.addEventListener('quantaphi:search-start', event=>{
    const query=String(event.detail?.query||'').trim();
    const run=event.detail?.run;
    if(!query || (run != null && run===lastSearchRun))return;
    placeSearchStory();
    if(run != null)lastSearchRun=run;
    lastSearchQuery=query;
    // A shared / restored search on initial page load is one visit, not a second discovery.
    if(Date.now()-bootTime<6500 && query===initialQuery)return;
    void nextStory(query);
  });
  function favorite() {
    if (!current) return;
    interactedWithStory = true;
    if (favorites.has(current.id)) favorites.delete(current.id);
    else favorites.add(current.id);
    safeWrite(STAR_KEY, Array.from(favorites));
    root.querySelector('[data-book-action="star"]').textContent = favorites.has(current.id) ? '★ Starred' : '☆ Star';
    const starred=favorites.has(current.id);
    window.PhiAssimilation?.signal?.({kind:'story',action:starred?'star':'unstar',key:current.id,title:current.title,query:lastSearchQuery,terms:indexedSearchTerms(current)});
    window.dispatchEvent(new CustomEvent('phi:story:star',{detail:{id:current.id,sector:current.sector,title:current.title,starred}}));
    note(starred ? 'Starred. This subject now influences future discoveries and can be used as a build seed.' : 'Removed from favorites');
  }
  async function share() {
    if (!current) return;
    interactedWithStory = true;
    const target = deepLink(current);
    const url = typeof window.quantaShareUrl === 'function' ? window.quantaShareUrl({title:current.title,description:current.summary,q:current.title,dest:target,kind:'secret'}) : target;
    let combined = null;
    try {
      combined = await window.PhiBookImageBridge?.shareStory?.(current, url) || null;
      if (combined?.handled) {
        if (!combined.success) { note(combined.message || 'Share cancelled. No credit issued.'); return; }
      } else if (navigator.share) await navigator.share({ title: current.title, text: current.summary, url });
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(current.title + '\n' + url);
      else { note('Sharing is unavailable in this browser'); return; }
    } catch (_) { note('Share cancelled'); return; }
    try { window.QuantaStarCredit?.('share', 'infinite-book:' + current.id + ':' + Date.now(), current); }
    catch (error) { console.warn('Story share credit deferred', error); }
    window.PhiAssimilation?.signal?.({kind:'story',action:'share',key:current.id,title:current.title,query:lastSearchQuery,terms:indexedSearchTerms(current)});
    note(combined?.handled ? 'Story text and image sent to the share sheet. The image stays device-local; link visitors see the story without your picture until cloud publishing is connected.' : combined?.imageMissing ? 'Story link shared. This browser cannot bundle image files; use Save image to share the picture separately.' : 'Story shared or link copied');
  }
  function collect() {
    if (!current) return;
    interactedWithStory = true;
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
    window.PhiAssimilation?.signal?.({kind:'story',action:'collect',key:current.id,title:current.title,query:lastSearchQuery,terms:indexedSearchTerms(current)});
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
    if(action!=='next')interactedWithStory = true;
    if (action === 'next') {
      event.preventDefault();
      if(root.dataset.context==='home'){void nextStory('',{requireFresh:true,rewardSpin:true,researchBranch:'Another secret'});return}
      void nextStory(lastSearchQuery,{rewardSpin:true,researchBranch:'Another secret'});
    }
    if(action==='research'&&current){
      event.preventDefault();
      const query=String(target.dataset.researchQuery||'').trim();
      if(!query)return;
      window.PhiAssimilation?.signal?.({kind:'story',action:'click',key:current.id,title:current.title,query:lastSearchQuery,terms:query});
      void nextStory(query,{requireFresh:true,rewardSpin:true,researchBranch:target.dataset.researchBranch||'Research suggestion'});
    }
    if (action === 'star') { event.preventDefault(); favorite(); }
    if (action === 'share') { event.preventDefault(); void share(); }
    if (action === 'collect') { event.preventDefault(); collect(); }
    if(action==='illustrate'&&current){
       window.PhiAssimilation?.signal?.({kind:'story',action:'build',key:current.id,title:current.title,query:lastSearchQuery,terms:indexedSearchTerms(current)});
      event.preventDefault();
      window.PhiImageBuilder?.prefill('Illustrate this surprising historical story: '+current.title+'. Create a distinctive, evidence-respecting visual inspired by its subject.',{useStory:true});
      document.getElementById('phiImageBuilder')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
    if(action==='build'&&current){
      event.preventDefault();
      const tool=target.dataset.bookTool;
      window.PhiAssimilation?.signal?.({kind:'story',action:'build',key:current.id,title:current.title,query:lastSearchQuery,terms:indexedSearchTerms(current)});
      if(tool==='quanta'){
        // Only an explicit search uses the existing Infinity/Quant mint path.
        const input=document.getElementById('q'),go=document.getElementById('go');
        if(input&&go){input.value=indexedSearchTerms(current);go.click();input.scrollIntoView({behavior:'smooth',block:'start'});}
        else note('QuantaPhi search is temporarily unavailable.');
      }else if(tool==='infinity'||tool==='omni'){
        if(typeof window.QuantaOpenSite==='function')window.QuantaOpenSite(target);
        else window.location.assign(target.href);
      }
    }
  });
  root.addEventListener('toggle',event=>{if(event.target?.classList?.contains('ib-details')&&event.target.open&&current){interactedWithStory=true;window.PhiAssimilation?.signal?.({kind:'story',action:'expand',key:current.id,title:current.title,query:lastSearchQuery,terms:indexedSearchTerms(current)})}},true);
  function showHomeStory(){
    if(!catalog)return;
    placeHomeStory();
    // The opener uses the same live writer as search stories, without an asteroid.
    void nextStory('',{requireFresh:false});
  }
  window.addEventListener('quantaphi:new-search',()=>{
    ++activeStoryTicket;
    artRequested=null;
    lastSearchQuery='';lastSearchRun=null;
    if(catalog)showHomeStory(false);
    else {placeHomeStory();note('Loading the original story collection…')}
  });
  async function init() {
    cardLayout();
    if(initialQuery?.trim())placeSearchStory();else placeHomeStory();
    note('Loading Infinity Reads & Realms…');
    try {
      const response = await fetch(CATALOG_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Story catalog HTTP ' + response.status);
      catalog = await response.json();
      if (!Array.isArray(catalog.sectors) || catalog.sectors.length < 30 || catalog.baseSectorCount !== 30 ||
          !Array.isArray(catalog.angles) || catalog.angles.length !== 20 ||
          !Array.isArray(catalog.sourceClasses) || catalog.sourceClasses.length !== 10) {
        throw new Error('Story discovery configuration is invalid');
      }
      // The home story is a properly attributed catalog story, not a fake GPT article.
      // Retain catalog permalink IDs, but search-generated Asteroids NEVER show these as GPT results.
      for(const story of catalog.stories||[])if(storyValid(story))byId.set(story.id,story);
      // Only explicit searches enter the separate Asteroid / GPT research flow.
      // No speculative background stories or artwork.
      void (async()=>{try{const raw=window.PhiInfiniteBookBanksUrl;if(!raw)return;const u=new URL(raw,location.origin);if(u.origin!==location.origin&&u.origin!=='https://infinite-book-library.marvaseater.workers.dev')return;const r=await fetch(u.href,{signal:AbortSignal.timeout(7500)});if(!r.ok)return;const data=await r.json();if(!Array.isArray(data.subjects))return;const ids=new Set(catalog.wordIndex.map(x=>x.id));for(const w of data.subjects){if(!Number.isSafeInteger(Number(w.id))||ids.has(Number(w.id))||!Array.isArray(w.sectors)||!w.word)continue;catalog.wordIndex.push({id:Number(w.id),word:String(w.word).slice(0,120),sector:Number(w.sectors[0]),sectors:w.sectors});ids.add(Number(w.id));}}catch(e){console.warn('Book words offline; bundled words retained',e)}})();

      const permalink = new URL(location.href).searchParams.get('secret');
      if (permalink && byId.has(permalink)) {
        render(byId.get(permalink));
      } else if (permalink && /^live-[a-z0-9]+$/.test(permalink)) {
        const u=new URL(location.href),source=u.searchParams.get('bookSource')||'';
        let validSource=false;try{validSource=new URL(source).protocol==='https:'}catch(_){}
        if(validSource && u.searchParams.get('bookTitle') && u.searchParams.get('bookSummary')){
          note('Rebuilding the shared story from evidence with Cloudflare AI…');
          await nextStory(u.searchParams.get('bookTitle'));
        } else if(root.dataset.context==='search'&&lastSearchQuery) await nextStory(lastSearchQuery);
        else showHomeStory();
      } else if(lastSearchQuery.trim()&&root.dataset.context==='search'){
        placeSearchStory();
        await nextStory(lastSearchQuery);
      }else{
        showHomeStory();
      }
      refillReadyStories();
    } catch (error) {
      console.warn('Infinite Book failed to initialize', error);
      note('The verified story collection is temporarily unavailable. Search above still works.');
    }
  }
  void init();
})();
