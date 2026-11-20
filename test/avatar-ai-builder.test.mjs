import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const {DURATION, ALTERNATIVES, normalizeDesign, frameAt, builderWorkRequest} =
  await import('../avatar-ai-builder-core.mjs');

test('the replay begins blank and eventually shows eight workers with a separate search preview', () => {
  const first = frameAt(0);
  assert.deepEqual(first.visible, []);
  assert.deepEqual(first.workers, []);
  assert.deepEqual(first.alternatives, []);
  const middle = frameAt(11);
  assert.equal(middle.workers.length, 8);
  assert.equal(new Set(middle.workers).size, 8);
  assert.ok(middle.visible.includes('search-window'));
  assert.equal(frameAt(DURATION).workers.length, 8);
});

test('each tested layout is visible at its recorded time and remains discoverable later', () => {
  for (const [id, option] of Object.entries(ALTERNATIVES)) {
    const midpoint = (option.start + option.end) / 2;
    assert.equal(frameAt(midpoint).design[option.area], option.value, id);
    assert.ok(frameAt(DURATION).alternatives.includes(id), id);
  }
});

test('saved choices change the latest design while rewinding preserves the original recording', () => {
  const choices = {header:'center', search:'wide', carousel:'upper'};
  assert.deepEqual(frameAt(DURATION, choices).design, choices);
  assert.equal(frameAt(10, choices).design.search, 'left');
  assert.equal(frameAt(22, choices).design.carousel, 'lower');
  assert.deepEqual(frameAt(DURATION).design, {header:'left', search:'center', carousel:'lower'});
});

test('only known layout values survive corrupted or older saved records', () => {
  assert.deepEqual(normalizeDesign({header:'center', search:'<script>', carousel:'upper', token:'private'}), {
    header:'center', carousel:'upper'
  });
  for (const invalid of [null, [], 'wide', 12, false]) assert.deepEqual(normalizeDesign(invalid), {});
  assert.deepEqual(normalizeDesign(JSON.parse('{"__proto__":{"search":"left"}}')), {});
});

test('playback handles invalid inputs and clamps forward or reverse limits', () => {
  for (const value of [NaN, Infinity, '14', null, -3]) assert.equal(frameAt(value).time, 0);
  assert.equal(frameAt(100).time, DURATION);
});

test('the improvement draft targets the existing ticket and fits the existing Bubbles intake', () => {
  const request = builderWorkRequest({search:'left'}, 'Give the header more space');
  assert.match(request, /#1923/);
  assert.match(request, /www-infinity4\/QuantaPhi/);
  assert.match(request, /avatar-ai-builder/);
  assert.match(request, /Left-aligned search/);
  assert.match(request, /Give the header more space/);
  assert.ok(builderWorkRequest({}, 'x'.repeat(9000)).length <= 1800);
  assert.doesNotMatch(builderWorkRequest({token:'private'}), /private/);
});

test('the builder mounts on the real Bubbles page and is hidden in the existing orb embed', () => {
  const page = readFileSync('bubbles.html', 'utf8');
  assert.match(page, /id="avatarBuilder"/);
  assert.match(page, /href="#avatarBuilder"/);
  assert.match(page, /avatar-ai-builder\.mjs\?v=/);
  assert.match(page, /avatar-ai-builder\.css\?v=/);
  assert.match(page, /Demo replay/);
  assert.ok(page.indexOf('id="avatarBuilder"') < page.indexOf('id="bubblesSigninGate"'));
});

test('the ordinary Bubbles work-draft entry preserves unsent work and never submits on preparation', () => {
  const source = readFileSync('bubbles-ai.js', 'utf8');
  const begin = source.indexOf('function prepareWorkDraft(');
  const end = source.indexOf('// Android hands off text only.', begin);
  assert.ok(begin >= 0 && end > begin);
  let opened = 0;
  let focused = 0;
  let viewerOpened = 0;
  const context = {
    embedded:false,
    workText:{value:'',focus(){focused++;}},
    tools:{open:false},
    toggle(){opened++;},
    openNotesViewer(){viewerOpened++;},
    workStatus:{textContent:''}
  };
  runInNewContext(source.slice(begin,end) + '\nthis.prepare = prepareWorkDraft;', context);
  assert.equal(context.prepare('Improve this builder'), true);
  assert.equal(context.workText.value, 'Improve this builder');
  assert.equal(context.tools.open, true);
  assert.equal(opened, 1);
  assert.equal(focused, 1);
  assert.equal(viewerOpened, 1);
  assert.equal(context.prepare('Replace my draft'), false);
  assert.equal(context.workText.value, 'Improve this builder');
  assert.equal(context.prepare('x'.repeat(1801)), false);
  context.embedded = true;
  context.workText.value = '';
  assert.equal(context.prepare('Change the host website'), false);
  assert.equal(context.workText.value, '');
});
