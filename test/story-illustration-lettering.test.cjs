'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

test('documentary artwork prompt excludes original title and disables painted words', () => {
 const src = source('infinite-book.js');
 const match = src.match(/  function storyIllustrationPrompt\(story\)\{[\s\S]*?\n  \}\n  async function drainAsteroidArtwork/);
 assert.ok(match, 'automatic image prompt is its own testable function');
 const fn = new vm.Script('(' + match[0].slice(0, match[0].lastIndexOf('\n  async function')) + ')').runInNewContext();
 const title = 'HIDDEN FAULT LINE EXPOSED';
 const prompt = fn({title,summary:'2019 Ridgecrest earthquakes shook California geology; mountain valley landscape and geologic fault traces.',mood:'Adventure'});
 assert.ok(prompt.includes('Ridgecrest earthquakes'), 'correct factual subject retained');
 assert.ok(!prompt.includes(title), 'source headline is never fed to the painting model');
 assert.match(prompt,/uncaptioned documentary landscape/i);
 assert.match(prompt,/No title banners, logos, signs, letterforms/);
 assert.match(prompt,/web page prints the correct title as accessible HTML/);
 assert.match(src,/\.ib-title'\)\.textContent = story.title/);
});

test('automatic story images are not regenerated on refresh but can be explicitly replaced', () => {
 const src = source('infinite-book.js');
 const bridge = source('phi-book-image-bridge.js');
 assert.match(src,/if\(!force&&await bridge.hasStored\(story.id\)\)continue/);
 assert.match(src,/phi:story:image-retry/);
 assert.match(src,/replaceExisting:force/);
 assert.match(bridge,/if\(!metadata.replaceExisting&&await hasStored\(story.id\)\)return/);
 assert.match(bridge,/\['regenerate','Rebuild clean image'\]/);
 assert.match(bridge,/The previous image stays until the replacement is successfully saved/);
});

test('older images can hide the garbled top heading without erasing original pixels', () => {
 const src = source('phi-book-image-bridge.js');
 assert.match(src,/async function toggleTopLettering\(story\)/);
 assert.match(src,/originalBlob:original,letteringTrimmed:true/);
 assert.match(src,/blob:record.originalBlob,originalBlob:null,letteringTrimmed:false/);
 assert.match(src,/canvas\.toBlob\(ok,'image\/png'\)/);
 assert.match(src,/No AI generation used/);
 assert.match(src,/\['trim','Hide top lettering'\]/);
});

test('browser loads the corrected scripts and JavaScript remains parseable', () => {
 const html = source('index.html');
 assert.match(html,/infinite-book\.js\?v=20261009-text-free-art1/);
 assert.match(html,/phi-book-image-bridge\.js\?v=20261009-text-repair1/);
 for (const name of ['infinite-book.js', 'phi-book-image-bridge.js']) {
  assert.doesNotThrow(() => new vm.Script(source(name)),name);
 }
});
