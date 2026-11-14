import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('source cards put real source inventory ahead of search and the site label',()=>{
 const premium=file('premium-source-cards.mjs');
 const spotlight=file('quick-card-spotlights.mjs');
 assert.match(premium,/article\.append\(header,content,form,topics,state,disclaimer,actions\)/);
 assert.match(spotlight,/if\(header\)header\.before\(panel\);else article\.prepend\(panel\)/);
 assert.match(spotlight,/if\(image\.complete&&image\.naturalWidth===0\)/);
});

test('source cards offer immediate official source action and no giant title-only cover',()=>{
 const premium=file('premium-source-cards.mjs');
 const css=file('premium-source-cards.css');
 assert.match(premium,/premium-browse-source/);
 assert.match(css,/\.premium-heading\{[^}]*background:#fff/);
 assert.match(css,/\.qcs-has-items>\.premium-heading\{display:none/);
});

test('shared quick-card footer and source controls are neutral, not rainbow',()=>{
 const shared=file('quanta-card-experience.css');
 const premium=file('premium-source-cards.css');
 assert.match(shared,/\.qca-toolbar \.qca-controls>\.qca-button\{[^}]*background:#fff!important/);
 assert.match(shared,/\.qca-toolbar \.qca-controls>\.qca-button\[aria-pressed="true"\]\{[^}]*background:#eee!important/);
 assert.match(premium,/\.premium-card button,\.premium-open\{[^}]*background:#fff/);
});
