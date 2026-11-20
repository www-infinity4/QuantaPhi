import {DURATION, DEFAULT_DESIGN, ALTERNATIVES, normalizeDesign, frameAt, builderWorkRequest} from './avatar-ai-builder-core.mjs?v=20261120-builder1';

const STORAGE_KEY = 'quantaphi.avatar-builder.design.v1';

function mountBuilder(root) {
  const scene = root.querySelector('.av-scene');
  const hero = root.querySelector('.av-hero');
  const nav = root.querySelector('.av-nav');
  const cards = root.querySelector('.av-cards');
  const rows = [root.querySelector('.av-search-row'), root.querySelector('.av-carousel')];
  const searchPosition = root.querySelector('.av-search-position');
  const parts = [...root.querySelectorAll('[data-part]')];
  const workers = [...root.querySelectorAll('[data-worker]')];
  const pins = [...root.querySelectorAll('[data-pin]')];
  const choice = root.querySelector('.av-choice');
  const choiceName = root.querySelector('.av-choice-name');
  const apply = root.querySelector('.av-apply');
  const play = root.querySelector('.av-play');
  const reverse = root.querySelector('.av-reverse');
  const seek = root.querySelector('input[type="range"]');
  const rate = root.querySelector('.av-rate');
  const clock = root.querySelector('.av-time');
  const workToggle = root.querySelector('.av-work');
  const count = root.querySelector('.av-count');
  const status = root.querySelector('.av-status');
  const instruction = root.querySelector('.av-improve textarea');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const searchLabels = {center:'Centered', left:'Left', wide:'Full width'};

  let design = {};
  try {
    design = normalizeDesign(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    // Replay and local layout choices remain usable when storage is unavailable.
  }

  let time = 0;
  let direction = 1;
  let playing = false;
  let showingWorkers = true;
  let previewId = null;
  let lastFrame = null;
  let animationFrame = 0;

  function setText(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function setMode(element, key, value) {
    if (element.dataset[key] !== value) element.dataset[key] = value;
  }

  function placeCarousel(value) {
    if (scene.dataset.carousel === value) return;
    const oldTops = rows.map(row => row.offsetTop);
    scene.dataset.carousel = value;
    if (reducedMotion.matches) return;
    rows.forEach((row, index) => {
      row.animate(
        [{translate:'0 ' + (oldTops[index] - row.offsetTop) + 'px'}, {translate:'0 0'}],
        {duration:430, easing:'cubic-bezier(.19, 1, .22, 1)'}
      );
    });
  }

  function draw() {
    const frame = frameAt(time, design);
    if (previewId) {
      const option = ALTERNATIVES[previewId];
      frame.design[option.area] = option.value;
    }
    setMode(scene, 'header', frame.design.header);
    setMode(scene, 'search', frame.design.search);
    placeCarousel(frame.design.carousel);
    setText(searchPosition, searchLabels[frame.design.search]);
    setMode(nav, 'layout', time >= 5.5 ? 'pills' : 'plain');
    setMode(hero, 'type', time >= 8 ? 'serif' : 'sans');
    setMode(hero, 'spacing', time >= 11 ? 'open' : 'normal');
    setMode(cards, 'layout', time < 13.5 ? 'tight' : 'open');
    setMode(cards, 'crop', time >= 21 ? 'portrait' : 'wide');

    parts.forEach(part => setMode(part, 'shown', String(frame.visible.includes(part.dataset.part))));
    workers.forEach((worker, index) => {
      worker.hidden = !showingWorkers || !frame.workers.includes(worker.dataset.worker);
      if (worker.hidden || reducedMotion.matches) return;
      worker.style.setProperty('--av-bot-x', (Math.sin(time * 1.1 + index) * 5).toFixed(1) + 'px');
      worker.style.setProperty('--av-bot-y', (Math.sin(time * 1.6 + index) * 2.5).toFixed(1) + 'px');
    });
    setText(count, String(frame.workers.length));

    pins.forEach(pin => {
      const option = ALTERNATIVES[pin.dataset.pin];
      const chosen = time === DURATION && design[option.area] === option.value;
      pin.hidden = !frame.alternatives.includes(pin.dataset.pin);
      pin.setAttribute('aria-expanded', String(previewId === pin.dataset.pin));
      setMode(pin, 'chosen', String(chosen));
      setText(pin.firstElementChild, chosen ? '✓' : '✦');
    });

    seek.value = String(time);
    seek.setAttribute('aria-valuetext', Math.floor(time) + ' of ' + DURATION + ' seconds');
    setText(clock, '0:' + String(Math.floor(time)).padStart(2, '0'));
    const playLabel = time === DURATION && direction === 1 ? 'Replay' : 'Play';
    setText(play, playing ? 'Pause' : playLabel);
    reverse.setAttribute('aria-pressed', String(direction < 0));
  }

  function tick(now) {
    animationFrame = 0;
    if (!playing) return;
    if (lastFrame === null) lastFrame = now;
    const elapsed = Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;
    time = Math.min(DURATION, Math.max(0, time + elapsed * direction * Number(rate.value)));
    const atEnd = time === DURATION && direction > 0;
    const atStart = time === 0 && direction < 0;
    if (atEnd || atStart) playing = false;
    draw();
    if (playing) animationFrame = requestAnimationFrame(tick);
  }

  function setPlaying(active) {
    playing = active;
    lastFrame = null;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = active ? requestAnimationFrame(tick) : 0;
    draw();
  }

  function latest() {
    time = DURATION;
    direction = 1;
    setPlaying(false);
  }

  function closeChoice(restoreFocus = false) {
    const old = previewId;
    previewId = null;
    choice.hidden = true;
    if (restoreFocus && old) pins.find(pin => pin.dataset.pin === old)?.focus({preventScroll:true});
  }

  pins.forEach(pin => pin.addEventListener('click', () => {
    if (previewId === pin.dataset.pin) {
      closeChoice();
      draw();
      return;
    }
    previewId = pin.dataset.pin;
    const option = ALTERNATIVES[previewId];
    setText(choiceName, option.name);
    setText(apply, design[option.area] === option.value ? 'Restore design' : 'Update design');
    choice.hidden = false;
    setPlaying(false);
    status.textContent = 'Previewing ' + option.name + '.';
  }));

  apply.addEventListener('click', () => {
    if (!previewId) return;
    const option = ALTERNATIVES[previewId];
    const restoring = design[option.area] === option.value;
    design[option.area] = restoring ? DEFAULT_DESIGN[option.area] : option.value;
    let saved = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(design));
      saved = true;
    } catch {
      // Keep the selected design in memory even if device storage is full.
    }
    closeChoice(true);
    latest();
    const change = restoring ? 'Original layout restored.' : option.name + ' applied.';
    status.textContent = change + (saved ? ' Saved on this device.' : ' Applied for this visit. Device saving is unavailable.');
  });

  root.querySelector('.av-cancel').addEventListener('click', () => {
    closeChoice(true);
    draw();
    status.textContent = '';
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !previewId) return;
    closeChoice(true);
    draw();
    status.textContent = '';
  });

  play.addEventListener('click', () => {
    closeChoice();
    if (!playing && time === DURATION && direction === 1) time = 0;
    if (!playing && time === 0 && direction === -1) direction = 1;
    setPlaying(!playing);
  });
  reverse.addEventListener('click', () => {
    closeChoice();
    direction *= -1;
    if (direction < 0 && time === 0) time = DURATION;
    if (direction > 0 && time === DURATION) time = 0;
    setPlaying(true);
  });
  seek.addEventListener('input', () => {
    const position = Number(seek.value);
    closeChoice();
    time = position;
    setPlaying(false);
  });
  root.querySelector('.av-latest').addEventListener('click', () => {
    closeChoice();
    latest();
    status.textContent = 'Latest demo frame. Choices update this preview.';
  });
  workToggle.addEventListener('click', () => {
    showingWorkers = !showingWorkers;
    workToggle.setAttribute('aria-pressed', String(showingWorkers));
    draw();
  });

  root.querySelector('.av-prepare').addEventListener('click', () => {
    const prepare = window.QuantaBubbles?.prepareWorkDraft;
    if (typeof prepare !== 'function') {
      status.textContent = 'Bubbles is still loading. Try preparing the request again when chat is ready.';
      return;
    }
    if (!prepare(builderWorkRequest(design, instruction.value))) {
      status.textContent = 'Keep or finish the existing Bubbles work draft, then try again.';
      return;
    }
    status.textContent = 'Draft opened in Bubbles. Review it and press Start work to submit.';
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPlaying(false);
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) setPlaying(false);
  });

  draw();
  // Begin the recording when the user reaches the builder. Pause when it is
  // offscreen, so the animation does not run behind the existing chat.
  let firstView = true;
  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry.isIntersecting) {
      if (playing) setPlaying(false);
      return;
    }
    if (firstView) {
      firstView = false;
      if (!reducedMotion.matches) setPlaying(true);
    }
  });
  observer.observe(root);
}

const root = document.getElementById('avatarBuilder');
if (root && new URLSearchParams(location.search).get('embed') !== '1') mountBuilder(root);
