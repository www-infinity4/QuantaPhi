import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDER_CARDS, nextDeveloperCardIndex} from '../developer-carousel-core.mjs';
import {readFileSync} from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('developer catalog includes each real builder exactly once', () => {
  assert.deepEqual(BUILDER_CARDS.map(c => c.id), [
    'mediaStarCreator', 'quickCardBuilderInline', 'government501Affiliates',
    'infinityAffiliates', 'phiProjectActions'
  ]);
  assert.equal(new Set(BUILDER_CARDS.map(c=>c.id)).size, BUILDER_CARDS.length);
  assert.ok(BUILDER_CARDS.every(c => c.label && c.description));
});

test('carousel advances and reverses, wrapping without skipping builders', () => {
  assert.deepEqual([0,1,2,3,4].map(i => nextDeveloperCardIndex(i, 1, 5)), [1,2,3,4,0]);
  assert.deepEqual([0,1,2,3,4].map(i => nextDeveloperCardIndex(i, -1, 5)), [4,0,1,2,3]);
  assert.equal(nextDeveloperCardIndex(0, 1, 1), 0);
  assert.equal(nextDeveloperCardIndex(0, 1, 0), -1);
});

test('dedicated developer carousel keeps original working widgets and real publisher', () => {
  const html = source('index.html');
  const deck = source('oracle-card-deck.js');
  const render = source('developer-carousel.mjs');
  const css = source('developer-carousel.css');
  assert.match(html, /id="developerCarousel"[^>]*aria-roledescription="carousel"/);
  assert.match(html, /id="developerCardStage"/);
  assert.match(html, /src="\/developer-carousel\.mjs\?/);
  assert.match(render, /bank\.appendChild\(current\.node\)/);
  assert.match(render, /stage\.appendChild\(target\.node\)/);
  assert.match(render, /\/quick-card-builder\.html/);
  assert.match(deck, /DEVELOPER_CARD_IDS/);
  assert.match(css, /min-height:\s*44px/);
});
