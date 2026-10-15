(function (root, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory(require('path'), require('fs'));
  } else {
    root.quantAiPresentation = factory(null, null);
  }
}(typeof self !== 'undefined' ? self : this, function (path, fs) {
  const isNode = typeof module !== 'undefined' && module.exports;
  let cues = [];
  if (isNode) {
    const jsonPath = path.join(__dirname, 'production', 'quant-ai-commercial.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    cues = data.scenes || [];
  }

  let currentIndex = -1;
  let container = null;

  function renderCue() {
    if (!container || currentIndex < 0 || currentIndex >= cues.length) return;
    const cue = cues[currentIndex];
    container.innerHTML = `
      <div class="scene-card">
        <h3 class="scene-action">${cue.action || ''}</h3>
        <p class="scene-lyric">${cue.lyric_marker || ''}</p>
        <div class="visual-beat" data-beat="${cue.beat || ''}"></div>
      </div>
    `;
  }

  function init(containerElement) {
    container = containerElement;
    if (cues.length) {
      goTo(0);
    }
    if (!isNode && typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeyboard);
    }
  }

  function goTo(index) {
    if (index < 0) index = 0;
    if (index >= cues.length) index = cues.length - 1;
    currentIndex = index;
    renderCue();
  }

  function next() {
    if (currentIndex < cues.length - 1) {
      goTo(currentIndex + 1);
    }
  }

  function prev() {
    if (currentIndex > 0) {
      goTo(currentIndex - 1);
    }
  }

  function getCurrentCue() {
    return cues[currentIndex] || null;
  }

  function handleKeyboard(event) {
    if (!event) return;
    switch (event.key) {
      case 'ArrowRight':
        next();
        break;
      case 'ArrowLeft':
        prev();
        break;
      case ' ':
        // placeholder for play/pause
        break;
    }
  }

  return {
    init,
    next,
    prev,
    goTo,
    getCurrentCue,
    handleKeyboard,
    cues,
  };
}));