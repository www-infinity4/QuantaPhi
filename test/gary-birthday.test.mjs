import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { garyPage } from '../gary/films.mjs';
import { createEmbedUrl, createPosterUrl, programKey, validateMovie } from '../templates/western-birthday/player.mjs';

test('birthday page is a unique use of a reusable template', () => {
  assert.equal(garyPage.recipient, 'Gary');
  assert.equal(garyPage.template, 'western-birthday-v1');
  assert.ok(garyPage.movies.length >= 2);
  assert.equal(new Set(garyPage.movies.map(programKey)).size, garyPage.movies.length);
});

test('all movies have validated source provenance and provider-native embeds', () => {
  for (const movie of garyPage.movies) {
    assert.equal(validateMovie(movie), true, movie.title);
    if (movie.provider === 'internet-archive') {
      assert.equal(movie.sourceUrl, 'https://archive.org/details/' + movie.archiveId);
      assert.equal(createEmbedUrl(movie), 'https://archive.org/embed/' + movie.archiveId);
      assert.equal(createPosterUrl(movie), 'https://archive.org/services/img/' + movie.archiveId);
    } else {
      assert.equal(movie.sourceUrl, 'https://www.youtube.com/watch?v=' + movie.videoId);
      assert.equal(createEmbedUrl(movie), 'https://www.youtube-nocookie.com/embed/' + movie.videoId + '?rel=0&playsinline=1');
      assert.equal(createPosterUrl(movie), 'https://i.ytimg.com/vi/' + movie.videoId + '/hqdefault.jpg');
    }
  }
});

test('archive-backed public domain Westerns replace the unavailable Rio Lobo link', () => {
  assert.ok(garyPage.movies.some(movie => movie.provider === 'internet-archive' && movie.archiveId === 'BlueSteel'));
  assert.ok(garyPage.movies.some(movie => movie.provider === 'internet-archive' && movie.archiveId === 'The_Star_Packer'));
  assert.ok(!garyPage.movies.some(movie => movie.videoId === 'CDLk7SJLuGU'));
});

test('program IDs and source hosts reject injection and mismatches', () => {
  assert.equal(validateMovie({videoId:'bad',sourceUrl:'https://evil.example/watch?v=bad',title:'Fake'}),false);
  assert.equal(validateMovie({provider:'internet-archive',archiveId:'../secret',sourceUrl:'https://archive.org/details/../secret',title:'Bad',year:1934,publisher:'Archive'}),false);
  assert.throws(() => createEmbedUrl({videoId:'../owner-token'}),/Invalid Western program/);
  assert.throws(() => createPosterUrl({provider:'internet-archive',archiveId:'not/allowed'}),/Invalid Western program/);
});

test('Gary landing page uses real QuantaPhi Bubbles and does not demand an identity to chat', () => {
  const html = readFileSync(new URL('../gary/index.html', import.meta.url), 'utf8');
  assert.match(html,/src="\/bubbles-embed\.js"/);
  assert.match(html,/data-bubble-id="gary-westerns-2026"/);
  assert.match(html,/Happy Birthday, Gary!/);
  assert.match(html,/Local memory is optional/);
  assert.match(html,/verified wallet/);
  assert.match(html,/archive\.org\/services\/img\/BlueSteel/);
  assert.doesNotMatch(html,/type="password"|window\.localStorage.*wallet|fake chat/i);
});

test('player uses provider iframe on page with user-initiated playback', () => {
  const client=readFileSync(new URL('../gary/main.mjs',import.meta.url),'utf8');
  assert.match(client,/document\.createElement\('iframe'\)/);
  assert.match(client,/createEmbedUrl\(movie\)/);
  assert.match(client,/programKey\(movie\)/);
  assert.doesNotMatch(client,/autoplay=1/);
  assert.doesNotMatch(client,/window\.open\(/);
});
