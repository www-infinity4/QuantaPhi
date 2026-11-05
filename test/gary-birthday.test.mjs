import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { garyPage } from '../gary/films.mjs';
import { createEmbedUrl, createPosterUrl, validateMovie } from '../templates/western-birthday/player.mjs';

test('birthday page is a unique use of a reusable template', () => {
  assert.equal(garyPage.recipient, 'Gary');
  assert.equal(garyPage.template, 'western-birthday-v1');
  assert.ok(garyPage.movies.length >= 2);
  assert.equal(new Set(garyPage.movies.map(movie => movie.videoId)).size, garyPage.movies.length);
});

test('published Western video IDs and original publisher links must match', () => {
  for (const movie of garyPage.movies) {
    assert.equal(validateMovie(movie), true);
    assert.equal(movie.sourceUrl, 'https://www.youtube.com/watch?v=' + movie.videoId);
    assert.equal(createEmbedUrl(movie), 'https://www.youtube-nocookie.com/embed/' + movie.videoId + '?rel=0&playsinline=1');
    assert.equal(createPosterUrl(movie), 'https://i.ytimg.com/vi/' + movie.videoId + '/hqdefault.jpg');
  }
});

test('invalid video identifiers and fraudulent publisher URLs fail closed', () => {
  assert.equal(validateMovie({ videoId: 'bad', sourceUrl: 'https://evil.example/watch?v=bad', title: 'Fake' }), false);
  assert.throws(() => createEmbedUrl({ videoId: '../owner-token' }), /Invalid Western program/);
  assert.throws(() => createPosterUrl({ videoId: 'not valid ID' }), /Invalid Western program/);
});

test('Gary landing page uses real QuantaPhi Bubbles and does not demand an identity to chat', () => {
  const html = readFileSync(new URL('../gary/index.html', import.meta.url), 'utf8');
  assert.match(html, /src="\/bubbles-embed\.js"/);
  assert.match(html, /data-bubble-id="gary-westerns-2026"/);
  assert.match(html, /Happy Birthday, Gary!/);
  assert.match(html, /Local memory is optional/);
  assert.match(html, /verified wallet/);
  assert.doesNotMatch(html, /type="password"|window\.localStorage.*wallet|fake chat/i);
});

test('player uses an on-page embedded provider video and user-initiated playback', () => {
  const client = readFileSync(new URL('../gary/main.mjs', import.meta.url), 'utf8');
  assert.match(client, /document\.createElement\('iframe'\)/);
  assert.match(client, /createEmbedUrl\(movie\)/);
  assert.doesNotMatch(client, /autoplay=1/);
  assert.doesNotMatch(client, /window\.open\(/);
});
