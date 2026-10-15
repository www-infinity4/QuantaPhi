const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const presentation = require('../quant-ai-presentation.js');

describe('Quant AI Presentation Module', () => {
  test('loads exactly 44 cues', () => {
    assert.strictEqual(presentation.cues.length, 44);
  });

  test('branding appears in HTML after init', () => {
    const container = { innerHTML: '' };
    presentation.init(container);
    assert.ok(container.innerHTML.includes('scene-card'));
  });

  test('navigation order matches first and last cues', () => {
    const firstAction = presentation.cues[0].action;
    const lastAction = presentation.cues[presentation.cues.length - 1].action;
    const mock = { innerHTML: '' };
    presentation.init(mock);
    assert.strictEqual(presentation.getCurrentCue().action, firstAction);
    for (let i = 0; i < presentation.cues.length - 1; i++) {
      presentation.next();
    }
    assert.strictEqual(presentation.getCurrentCue().action, lastAction);
  });

  test('prev works after next', () => {
    const mock = { innerHTML: '' };
    presentation.init(mock);
    const first = presentation.getCurrentCue();
    presentation.next();
    const second = presentation.getCurrentCue();
    presentation.prev();
    assert.deepStrictEqual(presentation.getCurrentCue(), first);
  });

  test('keyboard ArrowRight triggers next', () => {
    const mock = { innerHTML: '' };
    presentation.init(mock);
    const startIdx = presentation.cues.indexOf(presentation.getCurrentCue());
    presentation.handleKeyboard({ key: 'ArrowRight' });
    const newIdx = presentation.cues.indexOf(presentation.getCurrentCue());
    assert.strictEqual(newIdx, startIdx + 1);
  });
});