import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStudio, createStoryboard, pipelineStatus, exportProject} from '../sandbox/mosaic/mosaic-state.mjs';

test('script produces local storyboard only; it never claims generation', () => {
  const studio = createStudio('First scene. Second scene! Third scene?');
  const next = createStoryboard(studio);
  assert.equal(next.scenes.length, 3);
  assert.equal(pipelineStatus(next).script, 'ready');
  assert.equal(pipelineStatus(next).image, 'not_connected');
  assert.equal(pipelineStatus(next).voice, 'not_connected');
  assert.equal(pipelineStatus(next).video, 'not_connected');
  assert.equal(pipelineStatus(next).review, 'blocked');
});

test('empty text has no production-ready outputs', () => {
  const empty = createStoryboard(createStudio('    '));
  assert.equal(empty.scenes.length, 0);
  assert.equal(pipelineStatus(empty).script, 'needs_script');
});

test('export contains local-only source with no fabricated media or permission', () => {
  const project = exportProject(createStoryboard(createStudio('A simple original sketch.')));
  assert.equal(project.schema, 'quanta-mosaic-local-v1');
  assert.equal(project.publishable, false);
  assert.equal(project.media, null);
  assert.equal(project.provenance, 'owner-authored-local-draft');
});

test('sandbox has no unaudited remote script, unsafe HTML or live publish', () => {
  const html = readFileSync(new URL('../sandbox/mosaic/index.html', import.meta.url), 'utf8');
  assert.match(html, /Local storyboard only/);
  assert.doesNotMatch(html, /<iframe|https:\/\/|innerHTML|new WebSocket/);
});
